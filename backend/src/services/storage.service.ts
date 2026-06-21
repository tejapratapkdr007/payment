import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../config/env";
import { cloudinary } from "../config/cloudinary";
import { logger } from "../config/logger";

export interface StoredFile {
  url: string;
  publicId: string; // cloudinary public_id, or local relative path for cleanup
  provider: "cloudinary" | "local";
}

const LOCAL_DIR = path.resolve(process.cwd(), config.localUpload.dir);

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

/**
 * Uploads a payment screenshot. Cloudinary is used whenever its credentials
 * are configured (the production path on Render); otherwise the file is
 * written to local disk and served via the /uploads static route — this
 * keeps local development and this build's sandbox testing fully
 * functional without needing live Cloudinary credentials.
 */
export async function uploadScreenshot(
  buffer: Buffer,
  extension: "png" | "jpeg"
): Promise<StoredFile> {
  const filename = `${crypto.randomUUID()}.${extension === "jpeg" ? "jpg" : "png"}`;

  if (config.cloudinary.isConfigured) {
    const result = await cloudinary.uploader.upload(
      `data:image/${extension};base64,${buffer.toString("base64")}`,
      {
        folder: "class-payment-tracker/screenshots",
        public_id: filename.replace(/\.[^.]+$/, ""),
        resource_type: "image",
      }
    );
    return { url: result.secure_url, publicId: result.public_id, provider: "cloudinary" };
  }

  ensureLocalDir();
  const filepath = path.join(LOCAL_DIR, filename);
  await fs.promises.writeFile(filepath, buffer);
  logger.debug(`Cloudinary not configured - stored screenshot locally at ${filepath}`);
  return {
    url: `${config.localUpload.publicBaseUrl}/${filename}`,
    publicId: filename,
    provider: "local",
  };
}

export async function deleteStoredFile(file: Pick<StoredFile, "publicId" | "provider">) {
  try {
    if (file.provider === "cloudinary") {
      await cloudinary.uploader.destroy(file.publicId);
    } else {
      const filepath = path.join(LOCAL_DIR, file.publicId);
      if (fs.existsSync(filepath)) await fs.promises.unlink(filepath);
    }
  } catch (err) {
    logger.warn("Failed to delete stored file", { err, file });
  }
}
