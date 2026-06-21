import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/response";
import { AppError } from "../utils/AppError";
import { writeAuditLog } from "../services/audit.service";
import { getTeacherAuth } from "../middleware/auth";

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  deadline: z.string().datetime().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const collections = await prisma.collection.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { payments: true } } },
  });
  return ok(res, collections);
});

export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;
  const collection = await prisma.collection.findFirst({ where: { id, teacherId } });
  if (!collection) throw AppError.notFound("Collection not found");
  return ok(res, collection);
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const body = req.body as z.infer<typeof createCollectionSchema>;

  const collection = await prisma.collection.create({
    data: {
      teacherId,
      name: body.name,
      amount: body.amount,
      description: body.description,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      isActive: body.isActive ?? true,
    },
  });

  // Seed a PENDING_PAYMENT row for every existing student under this
  // teacher. This keeps dashboard stats (paid/pending/late counts) simple,
  // accurate row counts instead of "total students minus rows that exist" —
  // and gives the student an immediate dashboard entry for the new
  // collection without any extra backfill step.
  const students = await prisma.student.findMany({
    where: { class: { teacherId } },
    select: { id: true },
  });
  if (students.length > 0) {
    await prisma.payment.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        collectionId: collection.id,
        status: "PENDING_PAYMENT" as const,
      })),
      skipDuplicates: true,
    });
  }

  await writeAuditLog({
    action: "CREATE_COLLECTION",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Collection",
    targetId: collection.id,
    description: `Created collection "${collection.name}" for ₹${collection.amount}`,
  });

  return created(res, collection);
});

export const updateCollection = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const { id } = req.params;
  const body = req.body as z.infer<typeof updateCollectionSchema>;

  const existing = await prisma.collection.findFirst({ where: { id, teacherId } });
  if (!existing) throw AppError.notFound("Collection not found");

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...body,
      deadline: body.deadline === "" ? null : body.deadline ? new Date(body.deadline) : undefined,
    },
  });

  await writeAuditLog({
    action: "UPDATE_COLLECTION",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Collection",
    targetId: id,
    description: `Updated collection "${updated.name}"`,
    metadata: body,
  });

  return ok(res, updated);
});

export const deleteCollection = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const { id } = req.params;

  const existing = await prisma.collection.findFirst({ where: { id, teacherId } });
  if (!existing) throw AppError.notFound("Collection not found");

  await prisma.collection.delete({ where: { id } });

  await writeAuditLog({
    action: "DELETE_COLLECTION",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Collection",
    targetId: id,
    description: `Deleted collection "${existing.name}"`,
  });

  return ok(res, { deleted: true });
});
