import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { TokenPayload } from "../types";
import { AppError } from "./AppError";

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as unknown as TokenPayload;
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }
}
