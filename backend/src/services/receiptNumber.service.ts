import { prisma } from "../config/prisma";

/**
 * Generates the next receipt number for the given year, atomically, even
 * under concurrent requests. Rather than adding a dedicated counter table
 * (the spec's table list is intentionally just the 9 named tables), this
 * lazily creates a real Postgres SEQUENCE per year and reads nextval() —
 * sequences are inherently concurrency-safe and never hand out the same
 * value twice, which a naive "count existing rows + 1" approach cannot
 * guarantee under simultaneous approvals.
 */
export async function generateReceiptNumber(year: number): Promise<string> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year for receipt number generation");
  }
  const sequenceName = `receipt_seq_${year}`;

  // Identifier is built from a validated integer only (never user input),
  // so this is not vulnerable to SQL injection.
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS "${sequenceName}"`);
  const rows = await prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
    `SELECT nextval('"${sequenceName}"') as nextval`
  );
  const next = Number(rows[0].nextval);
  const padded = String(next).padStart(6, "0");
  return `RCT-${year}-${padded}`;
}
