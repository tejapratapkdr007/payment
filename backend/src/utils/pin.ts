// Canonical PIN format: <digits>-CS-<digits>, e.g. 25007-CS-001
// The "CS" segment is always a literal, uppercase "CS" — it is not a stand-in
// for arbitrary branch codes (this system is scoped to a single class).
const PIN_REGEX = /^\d+-CS-\d+$/;

/**
 * Normalizes user-entered PINs for lookup/storage: trims whitespace and
 * uppercases the letters so a student typing "25007-cs-001" on a phone
 * keyboard still matches, while the canonical stored value always has
 * capital "CS".
 */
export function normalizePin(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidPinFormat(raw: string): boolean {
  return PIN_REGEX.test(normalizePin(raw));
}

/**
 * Generates a default PIN given a numeric batch/year prefix and a sequence
 * number, e.g. buildPin("25007", 7) -> "25007-CS-007".
 */
export function buildPin(prefix: string, sequence: number, padWidth = 3): string {
  const seq = String(sequence).padStart(padWidth, "0");
  return `${prefix}-CS-${seq}`;
}
