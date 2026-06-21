import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/response";
import { AppError } from "../utils/AppError";
import { writeAuditLog } from "../services/audit.service";
import { getTeacherAuth } from "../middleware/auth";

export const createClassSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updateClassSchema = createClassSchema;

export const listClasses = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const classes = await prisma.class.findMany({
    where: { teacherId },
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });
  return ok(res, classes);
});

export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const { name } = req.body as z.infer<typeof createClassSchema>;

  const existing = await prisma.class.findFirst({
    where: { teacherId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) throw AppError.conflict(`A class named "${name}" already exists`);

  const cls = await prisma.class.create({ data: { teacherId, name } });

  await writeAuditLog({
    action: "CREATE_CLASS",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Class",
    targetId: cls.id,
    description: `Created class "${cls.name}"`,
  });

  return created(res, cls);
});

export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;
  const { name } = req.body as z.infer<typeof updateClassSchema>;

  const cls = await prisma.class.findFirst({ where: { id, teacherId } });
  if (!cls) throw AppError.notFound("Class not found");

  const updated = await prisma.class.update({ where: { id }, data: { name } });
  return ok(res, updated);
});

export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;

  const cls = await prisma.class.findFirst({ where: { id, teacherId } });
  if (!cls) throw AppError.notFound("Class not found");

  await prisma.class.delete({ where: { id } });
  return ok(res, { deleted: true });
});
