export type DetectedImageType = "png" | "jpeg" | null;

/**
 * Inspects the first few bytes of a buffer to determine the *actual* image
 * format, independent of whatever extension or Content-Type header the
 * client sent. This is the file-signature validation referenced in the
 * security requirements — it stops a renamed .exe or malformed file from
 * slipping through just because it was named "screenshot.png".
 */
export function detectImageType(buffer: Buffer): DetectedImageType {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return "png";

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return "jpeg";

  return null;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
