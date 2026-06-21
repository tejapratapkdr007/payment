import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { JwtRole } from "../types";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(AppError.unauthorized("Authentication token missing"));
  }
  try {
    req.auth = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: JwtRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden("You do not have access to this resource"));
    }
    next();
  };
}

export const requireTeacher = [authenticate, requireRole("TEACHER")];
export const requireStudent = [authenticate, requireRole("STUDENT")];

/**
 * Narrows req.auth to a TeacherTokenPayload. Safe to call in any handler
 * mounted behind requireRole("TEACHER") — throws defensively otherwise,
 * since TypeScript's union type doesn't carry that guarantee across the
 * middleware boundary on its own.
 */
export function getTeacherAuth(req: Request) {
  if (!req.auth || req.auth.role !== "TEACHER") {
    throw AppError.forbidden("Teacher access required");
  }
  return req.auth;
}

export function getStudentAuth(req: Request) {
  if (!req.auth || req.auth.role !== "STUDENT") {
    throw AppError.forbidden("Student access required");
  }
  return req.auth;
}
