import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { getTeacherAuth } from "../middleware/auth";

const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "IMPORT_STUDENTS",
  "APPROVE_PAYMENT",
  "REJECT_PAYMENT",
  "REQUEST_REUPLOAD",
  "SETTINGS_CHANGE",
  "CREATE_CLASS",
  "CREATE_COLLECTION",
  "UPDATE_COLLECTION",
  "DELETE_COLLECTION",
  "CREATE_TEACHER",
  "RECONCILE_STATEMENT",
  "GENERATE_RECEIPT",
] as const;

export const listAuditLogsQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

/**
 * Read-only by design: there is intentionally no PUT/PATCH/DELETE endpoint
 * here, matching the append-only nature of the audit_logs table (which is
 * also protected at the database level by an immutability trigger).
 */
export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const q = req.query as unknown as z.infer<typeof listAuditLogsQuerySchema>;

  const where: any = {
    // A teacher only ever sees logs related to their own account/actions.
    // Student-login logs don't carry a teacherId, so this intentionally
    // scopes to actions performed under this teacher's own login.
    teacherId,
    ...(q.action ? { action: q.action } : {}),
    ...(q.search ? { OR: [
      { actorLabel: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
    ] } : {}),
    ...(q.startDate || q.endDate
      ? {
          createdAt: {
            ...(q.startDate ? { gte: new Date(q.startDate) } : {}),
            ...(q.endDate ? { lte: new Date(q.endDate) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok(res, {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize) || 1,
  });
});
