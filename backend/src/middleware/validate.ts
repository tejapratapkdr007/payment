import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(
        AppError.badRequest("Validation failed", result.error.flatten().fieldErrors)
      );
    }
    // Replace with the parsed (and coerced/defaulted) value.
    (req as any)[target] = result.data;
    next();
  };
}
