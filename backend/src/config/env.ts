import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),

  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  LOCAL_UPLOAD_DIR: z.string().default("uploads"),
  LOCAL_UPLOAD_PUBLIC_BASE_URL: z.string().default("http://localhost:4000/uploads"),

  TESSDATA_PATH: z.string().default("./tessdata"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),

  PUBLIC_APP_URL: z.string().default("http://localhost:5173"),

  SEED_TEACHER_EMAIL: z.string().optional(),
  SEED_TEACHER_PASSWORD: z.string().optional(),
  SEED_TEACHER_NAME: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loudly if required configuration is missing — this is far
  // safer than limping along with undefined secrets in a payments system.
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,

  databaseUrl: env.DATABASE_URL,

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  corsOrigins: env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    isConfigured: Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
    ),
  },

  localUpload: {
    dir: env.LOCAL_UPLOAD_DIR,
    publicBaseUrl: env.LOCAL_UPLOAD_PUBLIC_BASE_URL,
  },

  tessdataPath: env.TESSDATA_PATH,

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },

  publicAppUrl: env.PUBLIC_APP_URL,

  seedTeacher: {
    email: env.SEED_TEACHER_EMAIL ?? "teacher@example.com",
    password: env.SEED_TEACHER_PASSWORD ?? "ChangeMe123!",
    name: env.SEED_TEACHER_NAME ?? "Class Teacher",
  },
};
