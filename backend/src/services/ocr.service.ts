import path from "path";
import { createWorker } from "tesseract.js";
import { config } from "../config/env";
import { logger } from "../config/logger";

export interface OcrExtractionResult {
  rawText: string;
  confidence: number;
  utr: string | null;
  amount: number | null;
  date: string | null;
  successTextFound: boolean;
  looksLikeUpiScreenshot: boolean;
}

// UPI UTR / transaction reference numbers are typically 12 numeric digits
// (sometimes alphanumeric on a few banks/apps). We look for both, but
// prefer a 12-digit numeric match since that's overwhelmingly the norm.
const UTR_PATTERNS = [
  /\b(?:UTR|UPI\s*Ref(?:erence)?\s*(?:No\.?|Number)?|Txn\s*ID|Ref\s*No\.?)\s*[:\-]?\s*([A-Za-z0-9]{8,22})\b/i,
  /\b(\d{12})\b/,
];

const AMOUNT_PATTERNS = [
  /(?:₹|Rs\.?|INR)\s*([0-9]+(?:,[0-9]{2,3})*(?:\.\d{1,2})?)/i,
];

const DATE_PATTERNS = [
  // 12 Jun 2026, 12-06-2026, 12/06/2026, 2026-06-12
  /\b(\d{1,2}[\/\-\s](?:[A-Za-z]{3,9}|\d{1,2})[\/\-\s]\d{2,4})\b/,
  /\b(\d{4}-\d{2}-\d{2})\b/,
];

const SUCCESS_KEYWORDS = [
  "payment successful",
  "transaction successful",
  "successfully paid",
  "payment success",
  "completed",
  "transaction completed",
  "money sent",
  "sent successfully",
];

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    const tessdataDir = path.resolve(process.cwd(), config.tessdataPath);
    workerPromise = createWorker("eng", 1, {
      langPath: tessdataDir,
      cachePath: tessdataDir,
      gzip: true,
    });
  }
  return workerPromise;
}

function firstMatch(patterns: RegExp[], text: string): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return (match[1] ?? match[0]).trim();
  }
  return null;
}

function parseAmount(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export async function extractPaymentDetails(imageBuffer: Buffer): Promise<OcrExtractionResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBuffer);

  const rawText = data.text || "";
  const normalized = rawText.replace(/\s+/g, " ").trim();
  const lowerText = normalized.toLowerCase();

  const utr = firstMatch(UTR_PATTERNS, normalized);
  const amount = parseAmount(firstMatch(AMOUNT_PATTERNS, normalized));
  const date = firstMatch(DATE_PATTERNS, normalized);
  const successTextFound = SUCCESS_KEYWORDS.some((kw) => lowerText.includes(kw));

  // Heuristic: a real UPI screenshot will almost always contain a rupee
  // symbol/"Rs"/"INR" amount AND something that looks like a UTR/ref number.
  const looksLikeUpiScreenshot = Boolean(amount) && Boolean(utr);

  return {
    rawText: normalized,
    confidence: data.confidence ?? 0,
    utr,
    amount,
    date,
    successTextFound,
    looksLikeUpiScreenshot,
  };
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
