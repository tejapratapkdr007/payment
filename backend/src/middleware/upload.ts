import multer from "multer";
import { Request } from "express";
import { AppError } from "../utils/AppError";
import { detectImageType, MAX_UPLOAD_BYTES } from "../utils/fileValidation";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg"]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  // First-pass check on the declared mimetype/extension. This is *not*
  // trusted on its own — detectImageType() below re-checks the real bytes
  // once multer has buffered the file — but rejecting obviously-wrong
  // uploads here saves us from buffering files we'll reject anyway.
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error("Only PNG, JPG, and JPEG screenshots are allowed"));
  }
  cb(null, true);
}

export const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter,
});

const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowedCsvMime = new Set(["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"]);
    if (!allowedCsvMime.has(file.mimetype) && !file.originalname.toLowerCase().endsWith(".csv")) {
      return cb(new Error("Only .csv files are allowed"));
    }
    cb(null, true);
  },
});

/** Generic upload for bank/UPI statement reconciliation files: CSV, Excel, or PDF. */
const MAX_STATEMENT_BYTES = 10 * 1024 * 1024;

export const statementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_STATEMENT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/csv",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
    ];
    const name = file.originalname.toLowerCase();
    const okExt = name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".pdf");
    if (!allowed.includes(file.mimetype) && !okExt) {
      return cb(new Error("Only .csv, .xlsx, .xls, or .pdf statement files are allowed"));
    }
    cb(null, true);
  },
});

/**
 * Call after screenshotUpload has run, inside the route handler, to verify
 * the uploaded buffer's real file signature matches PNG/JPEG. Throws an
 * AppError (caught by asyncHandler) if it doesn't.
 */
export function assertValidScreenshot(file: Express.Multer.File | undefined) {
  if (!file) {
    throw AppError.badRequest("A payment screenshot is required");
  }
  const detected = detectImageType(file.buffer);
  if (!detected) {
    throw AppError.badRequest(
      "The uploaded file does not look like a valid PNG or JPEG image"
    );
  }
  return detected;
}
