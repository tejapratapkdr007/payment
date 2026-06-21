import crypto from "crypto";
import sharp from "sharp";

export function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Computes a 64-bit perceptual average-hash (aHash) of an image, returned
 * as a 16-character hex string. Unlike sha256Buffer, this is resilient to
 * minor recompression/resaving of the *same* screenshot — useful for
 * catching a student who re-saves or lightly edits an already-used
 * screenshot to dodge the exact-hash duplicate check.
 */
export async function perceptualHash(buffer: Buffer): Promise<string> {
  const SIZE = 8; // 8x8 = 64 bits
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(SIZE, SIZE, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data);
  const mean = pixels.reduce((sum, p) => sum + p, 0) / pixels.length;

  let bits = "";
  for (const p of pixels) {
    bits += p >= mean ? "1" : "0";
  }

  // Pack the 64-bit binary string into a 16-char hex string.
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Hamming distance between two equal-length hex hash strings (in bits). */
export function hammingDistanceHex(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < hexA.length; i++) {
    const a = parseInt(hexA[i], 16);
    const b = parseInt(hexB[i], 16);
    let xor = a ^ b;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/** Two hashes are considered a near-duplicate below this Hamming distance (out of 64 bits). */
export const PERCEPTUAL_DUPLICATE_THRESHOLD = 6;
