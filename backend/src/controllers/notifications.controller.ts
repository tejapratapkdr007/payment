import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getStudentAuth } from "../middleware/auth";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

export { listQuerySchema as notificationListQuerySchema };

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = getStudentAuth(req);
  const { page, pageSize, unreadOnly } = req.query as unknown as z.infer<typeof listQuerySchema>;

  const where = { studentId, ...(unreadOnly ? { isRead: false } : {}) };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { studentId, isRead: false } }),
  ]);

  return ok(res, {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = getStudentAuth(req);
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({ where: { id, studentId } });
  if (!notification) throw AppError.notFound("Notification not found");

  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return ok(res, updated);
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = getStudentAuth(req);
  await prisma.notification.updateMany({ where: { studentId, isRead: false }, data: { isRead: true } });
  return ok(res, { updated: true });
});
