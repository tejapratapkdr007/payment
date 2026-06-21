import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
// pdf-parse has no official types; require keeps this simple and avoids a
// broken @types/pdf-parse mismatch across versions.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

export interface StatementEntry {
  utr: string;
  amount: number | null;
  date: string | null;
  rawLine: string;
}

// UPI/bank statement exports almost always contain a 12-digit numeric UTR
// alongside an amount on the same line/row. We scan broadly rather than
// assuming a fixed column layout, since GPay/PhonePe/Paytm/bank exports all
// differ.
const UTR_REGEX = /\b(\d{12})\b/g;
// Currency marker is mandatory here (unlike the OCR amount regex) because
// statement lines also contain the 12-digit UTR itself, which would
// otherwise be misdetected as the amount by a same-line numeric scan.
const AMOUNT_REGEX = /(?:₹|Rs\.?|INR)\s*([0-9]+(?:,[0-9]{2,3})*(?:\.\d{1,2})?)/i;

function extractEntriesFromText(text: string): StatementEntry[] {
  const entries: StatementEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const utrMatches = [...line.matchAll(UTR_REGEX)];
    if (utrMatches.length === 0) continue;
    const amountMatch = line.match(AMOUNT_REGEX);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : null;
    for (const match of utrMatches) {
      const utr = match[1];
      entries.push({ utr, amount: Number.isFinite(amount as number) ? amount : null, date: null, rawLine: line.trim() });
    }
  }
  return entries;
}

export async function parseStatementFile(
  buffer: Buffer,
  mimetype: string,
  originalName: string
): Promise<StatementEntry[]> {
  const lowerName = originalName.toLowerCase();

  if (mimetype.includes("pdf") || lowerName.endsWith(".pdf")) {
    const { text } = await pdfParse(buffer);
    return extractEntriesFromText(text);
  }

  if (
    mimetype.includes("spreadsheet") ||
    mimetype.includes("excel") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  ) {
    const workbook = new ExcelJS.Workbook();
    // Cast needed: newer @types/node's generic Buffer<T> isn't structurally
    // identical to the non-generic Buffer ExcelJS's bundled types expect,
    // even though they're the same value at runtime.
    await workbook.xlsx.load(buffer as any);
    const lines: string[] = [];
    workbook.eachSheet((sheet) => {
      sheet.eachRow((row) => {
        const cellValues = row.values as (string | number | undefined)[];
        lines.push(cellValues.filter((v) => v !== undefined).join(" "));
      });
    });
    return extractEntriesFromText(lines.join("\n"));
  }

  // Default: treat as CSV/plain text.
  try {
    const records: string[][] = parse(buffer, { skip_empty_lines: true, relax_column_count: true });
    const lines = records.map((r) => r.join(" "));
    return extractEntriesFromText(lines.join("\n"));
  } catch {
    return extractEntriesFromText(buffer.toString("utf-8"));
  }
}

export interface ReconciliationMatch {
  paymentId: string;
  studentId: string;
  utr: string;
  matchedAmount: number | null;
  collectionAmount: number;
  amountMatches: boolean;
}

/**
 * Given parsed statement entries and a list of pending payments
 * (id, studentId, utrEntered, collection amount), returns which payments
 * matched a statement entry by UTR. The caller is responsible for actually
 * updating payment status — this function is pure matching logic so it can
 * be unit-tested without a database.
 */
export function matchEntriesToPendingPayments(
  entries: StatementEntry[],
  pendingPayments: { id: string; studentId: string; utrEntered: string | null; collectionAmount: number }[]
): ReconciliationMatch[] {
  const entriesByUtr = new Map<string, StatementEntry>();
  for (const entry of entries) {
    entriesByUtr.set(entry.utr, entry);
  }

  const matches: ReconciliationMatch[] = [];
  for (const payment of pendingPayments) {
    if (!payment.utrEntered) continue;
    const entry = entriesByUtr.get(payment.utrEntered);
    if (!entry) continue;
    const amountMatches =
      entry.amount === null || Math.abs(entry.amount - payment.collectionAmount) < 0.5;
    matches.push({
      paymentId: payment.id,
      studentId: payment.studentId,
      utr: payment.utrEntered,
      matchedAmount: entry.amount,
      collectionAmount: payment.collectionAmount,
      amountMatches,
    });
  }
  return matches;
}
