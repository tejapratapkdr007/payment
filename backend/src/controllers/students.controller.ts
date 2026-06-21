import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getTeacherAuth } from "../middleware/auth";
import { normalizePin, isValidPinFormat } from "../utils/pin";
import { writeAuditLog } from "../services/audit.service";
import {
  parseStudentCsv,
  importStudents,
  generateStudentCsvTemplate,
} from "../services/csvImport.service";

export const createStudentSchema = z.object({
  name: z.string().min(1).max(100),
  pin: z.string().min(1),
  phone: z.string().max(20).optional(),
  classId: z.string().uuid(),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  classId: z.string().uuid().optional(),
});

export const listQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

/** Creates PENDING_PAYMENT rows for every active collection for one or more new students. */
async function seedPaymentsForNewStudents(teacherId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;
  const activeCollections = await prisma.collection.findMany({
    where: { teacherId, isActive: true },
    select: { id: true },
  });
  if (activeCollections.length === 0) return;

  const data = studentIds.flatMap((studentId) =>
    activeCollections.map((c) => ({
      studentId,
      collectionId: c.id,
      status: "PENDING_PAYMENT" as const,
    }))
  );
  await prisma.payment.createMany({ data, skipDuplicates: true });
}

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { classId, search, page, pageSize } = req.query as unknown as z.infer<typeof listQuerySchema>;

  const where = {
    class: { teacherId },
    ...(classId ? { classId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { pin: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { class: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ]);

  return ok(res, {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;
  const student = await prisma.student.findFirst({
    where: { id, class: { teacherId } },
    include: { class: true, payments: { include: { collection: true } } },
  });
  if (!student) throw AppError.notFound("Student not found");
  return ok(res, student);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const body = req.body as z.infer<typeof createStudentSchema>;
  const pin = normalizePin(body.pin);

  if (!isValidPinFormat(pin)) {
    throw AppError.badRequest(`Invalid PIN format: "${body.pin}". Expected format like 25007-CS-001`);
  }

  const cls = await prisma.class.findFirst({ where: { id: body.classId, teacherId } });
  if (!cls) throw AppError.notFound("Class not found");

  const existing = await prisma.student.findUnique({ where: { pin } });
  if (existing) throw AppError.conflict(`A student with PIN ${pin} already exists`);

  const student = await prisma.student.create({
    data: { name: body.name, pin, phone: body.phone || null, classId: body.classId },
  });

  await seedPaymentsForNewStudents(teacherId, [student.id]);

  return created(res, student);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;
  const body = req.body as z.infer<typeof updateStudentSchema>;

  const existing = await prisma.student.findFirst({ where: { id, class: { teacherId } } });
  if (!existing) throw AppError.notFound("Student not found");

  if (body.classId) {
    const cls = await prisma.class.findFirst({ where: { id: body.classId, teacherId } });
    if (!cls) throw AppError.notFound("Class not found");
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      name: body.name,
      phone: body.phone,
      classId: body.classId,
    },
  });
  return ok(res, updated);
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;
  const existing = await prisma.student.findFirst({ where: { id, class: { teacherId } } });
  if (!existing) throw AppError.notFound("Student not found");
  await prisma.student.delete({ where: { id } });
  return ok(res, { deleted: true });
});

export const downloadStudentCsvTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const csv = generateStudentCsvTemplate();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="student_import_template.csv"');
  res.send(csv);
});

export const importStudentsFromCsv = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  if (!req.file) throw AppError.badRequest("A CSV file is required");

  const rows = parseStudentCsv(req.file.buffer);
  if (rows.length === 0) throw AppError.badRequest("The CSV file contains no rows");
  if (rows.length > 2000) throw AppError.badRequest("Cannot import more than 2000 students at once");

  const summary = await importStudents(teacherId, rows);

  const createdIds = await prisma.student.findMany({
    where: { pin: { in: summary.rows.filter((r) => r.status === "CREATED").map((r) => r.pin) } },
    select: { id: true },
  });
  await seedPaymentsForNewStudents(teacherId, createdIds.map((s) => s.id));

  await writeAuditLog({
    action: "IMPORT_STUDENTS",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    description: `Imported students: ${summary.created} created, ${summary.skipped} skipped, ${summary.errors} errors`,
    metadata: { totalRows: summary.totalRows, created: summary.created, skipped: summary.skipped, errors: summary.errors },
  });

  return ok(res, summary);
});
