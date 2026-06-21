import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getTeacherAuth } from "../middleware/auth";
import { buildReminderMessage } from "../services/reminder.service";

const listQuerySchema = z.object({
  collectionId: z.string().uuid(),
  status: z.enum(["PENDING_PAYMENT", "LATE", "ALL"]).default("ALL"),
});

export { listQuerySchema as remindersQuerySchema };

export const listReminderCandidates = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { collectionId, status } = req.query as unknown as z.infer<typeof listQuerySchema>;

  const collection = await prisma.collection.findFirst({ where: { id: collectionId, teacherId } });
  if (!collection) throw AppError.notFound("Collection not found");

  const settings = await prisma.settings.findUnique({ where: { teacherId } });

  const payments = await prisma.payment.findMany({
    where: {
      collectionId,
      status: status === "ALL" ? { in: ["PENDING_PAYMENT", "LATE"] } : status,
    },
    include: { student: true },
    orderBy: { student: { name: "asc" } },
  });

  const candidates = payments.map((p) => ({
    paymentId: p.id,
    studentId: p.studentId,
    studentName: p.student.name,
    studentPin: p.student.pin,
    phone: p.student.phone,
    isLate: p.status === "LATE",
    message: buildReminderMessage({
      studentName: p.student.name,
      collectionName: collection.name,
      amount: Number(collection.amount),
      upiId: settings?.upiId,
      deadline: collection.deadline,
      institutionName: settings?.institutionName ?? "your institution",
      isLate: p.status === "LATE",
    }),
  }));

  return ok(res, { collection: { id: collection.id, name: collection.name }, candidates });
});

/** Combined "copy all" text block - ready to paste into a group chat. */
export const getBulkReminderText = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { collectionId, status } = req.query as unknown as z.infer<typeof listQuerySchema>;

  const collection = await prisma.collection.findFirst({ where: { id: collectionId, teacherId } });
  if (!collection) throw AppError.notFound("Collection not found");

  const settings = await prisma.settings.findUnique({ where: { teacherId } });

  const payments = await prisma.payment.findMany({
    where: {
      collectionId,
      status: status === "ALL" ? { in: ["PENDING_PAYMENT", "LATE"] } : status,
    },
    include: { student: true },
    orderBy: { student: { name: "asc" } },
  });

  const names = payments.map((p) => p.student.name).join(", ");
  const message = buildReminderMessage({
    studentName: "Everyone",
    collectionName: collection.name,
    amount: Number(collection.amount),
    upiId: settings?.upiId,
    deadline: collection.deadline,
    institutionName: settings?.institutionName ?? "your institution",
    isLate: status === "LATE",
  });

  return ok(res, {
    collection: { id: collection.id, name: collection.name },
    pendingCount: payments.length,
    pendingNames: names,
    groupMessage: message,
  });
});
