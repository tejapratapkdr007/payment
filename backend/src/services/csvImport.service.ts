import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { prisma } from "../config/prisma";
import { normalizePin, isValidPinFormat } from "../utils/pin";

export interface StudentImportRow {
  name: string;
  pin: string;
  phone?: string;
  className: string;
}

export interface StudentImportRowResult extends StudentImportRow {
  rowNumber: number;
  status: "CREATED" | "SKIPPED_DUPLICATE_IN_FILE" | "SKIPPED_EXISTING_PIN" | "ERROR";
  error?: string;
}

export interface StudentImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  errors: number;
  rows: StudentImportRowResult[];
}

export function generateStudentCsvTemplate(): string {
  return stringify(
    [
      ["name", "pin", "phone", "class"],
      ["Rahul", "25007-CS-001", "9876543210", "CSE-A"],
      ["Ajay", "25007-CS-002", "9876543211", "CSE-A"],
    ]
  );
}

export function parseStudentCsv(buffer: Buffer): StudentImportRow[] {
  const records: Record<string, string>[] = parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((r) => ({
    name: r.name ?? "",
    pin: r.pin ?? "",
    phone: r.phone || undefined,
    className: r.class ?? "",
  }));
}

export async function importStudents(
  teacherId: string,
  rows: StudentImportRow[]
): Promise<StudentImportSummary> {
  const results: StudentImportRowResult[] = [];
  const seenPinsInFile = new Set<string>();

  // Cache class lookups/creations per teacher so we don't hit the DB
  // repeatedly for the same class name within one import.
  const classCache = new Map<string, string>(); // className(upper) -> classId

  async function resolveClassId(className: string): Promise<string> {
    const key = className.trim().toUpperCase();
    if (classCache.has(key)) return classCache.get(key)!;

    let cls = await prisma.class.findFirst({
      where: { teacherId, name: { equals: className.trim(), mode: "insensitive" } },
    });
    if (!cls) {
      cls = await prisma.class.create({ data: { teacherId, name: className.trim() } });
    }
    classCache.set(key, cls.id);
    return cls.id;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 accounts for 1-indexing and the header row
    const name = row.name?.trim();
    const className = row.className?.trim();
    const phone = row.phone?.trim();

    if (!name || !row.pin || !className) {
      results.push({
        ...row,
        rowNumber,
        status: "ERROR",
        error: "Missing required field (name, pin, or class)",
      });
      continue;
    }

    const pin = normalizePin(row.pin);

    if (!isValidPinFormat(pin)) {
      results.push({
        ...row,
        pin,
        rowNumber,
        status: "ERROR",
        error: `Invalid PIN format: "${row.pin}". Expected format like 25007-CS-001`,
      });
      continue;
    }

    if (seenPinsInFile.has(pin)) {
      results.push({ ...row, pin, rowNumber, status: "SKIPPED_DUPLICATE_IN_FILE" });
      continue;
    }
    seenPinsInFile.add(pin);

    const existing = await prisma.student.findUnique({ where: { pin } });
    if (existing) {
      results.push({ ...row, pin, rowNumber, status: "SKIPPED_EXISTING_PIN" });
      continue;
    }

    try {
      const classId = await resolveClassId(className);
      await prisma.student.create({
        data: { name, pin, phone: phone || null, classId },
      });
      results.push({ ...row, pin, rowNumber, status: "CREATED" });
    } catch (err) {
      results.push({
        ...row,
        pin,
        rowNumber,
        status: "ERROR",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    totalRows: rows.length,
    created: results.filter((r) => r.status === "CREATED").length,
    skipped: results.filter((r) => r.status.startsWith("SKIPPED")).length,
    errors: results.filter((r) => r.status === "ERROR").length,
    rows: results,
  };
}
