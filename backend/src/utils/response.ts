import { Response } from "express";
import { ApiSuccess } from "../types";

export function ok<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const body: ApiSuccess<T> = { success: true, data, ...(message ? { message } : {}) };
  return res.status(statusCode).json(body);
}

export function created<T>(res: Response, data: T, message?: string) {
  return ok(res, data, message, 201);
}
