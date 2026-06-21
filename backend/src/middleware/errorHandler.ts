import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { ApiError } from "../types";
import { Prisma } from "@prisma/client";

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiError = {
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { message: err.message, code: err.code, details: err.details },
    };
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.originalUrl });
    }
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation
    if (err.code === "P2002") {
      const body: ApiError = {
        success: false,
        error: {
          message: "A record with this value already exists",
          code: "UNIQUE_VIOLATION",
          details: err.meta,
        },
      };
      return res.status(409).json(body);
    }
    if (err.code === "P2025") {
      const body: ApiError = {
        success: false,
        error: { message: "Record not found", code: "NOT_FOUND" },
      };
      return res.status(404).json(body);
    }
  }

  logger.error("Unhandled error", { err, path: req.originalUrl });
  const body: ApiError = {
    success: false,
    error: { message: "Something went wrong. Please try again." },
  };
  res.status(500).json(body);
}
