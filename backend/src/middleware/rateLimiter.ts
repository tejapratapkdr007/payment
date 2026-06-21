import rateLimit from "express-rate-limit";
import { config } from "../config/env";

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many requests. Please slow down and try again shortly." },
  },
});

// Tighter limiter for login/PIN-entry endpoints to slow down brute-force
// attempts against student PINs or teacher passwords.
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many login attempts. Please try again later." },
  },
});

// Public, unauthenticated receipt verification - generous but still bounded.
export const publicLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.max(config.rateLimit.max, 100),
  standardHeaders: true,
  legacyHeaders: false,
});
