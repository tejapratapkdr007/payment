import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { normalizePin, isValidPinFormat } from "../utils/pin";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/response";
import { writeAuditLog } from "../services/audit.service";

export const registerTeacherSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const studentLoginSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
});

/**
 * Teacher registration is intentionally available so the app is fully
 * self-serve, but in a real single-class deployment most teachers will
 * just use the account created by the seed script.
 */
export const registerTeacher = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as z.infer<typeof registerTeacherSchema>;

  const existing = await prisma.teacher.findUnique({ where: { email } });
  if (existing) {
    throw AppError.conflict("An account with this email already exists");
  }

  const passwordHash = await hashPassword(password);
  const teacher = await prisma.teacher.create({
    data: { name, email, passwordHash },
  });

  await prisma.settings.create({
    data: { teacherId: teacher.id, teacherDisplayName: name },
  });

  await writeAuditLog({
    action: "CREATE_TEACHER",
    actorType: "TEACHER",
    teacherId: teacher.id,
    actorLabel: teacher.email,
    description: `Teacher account created for ${teacher.email}`,
  });

  const token = signToken({ role: "TEACHER", teacherId: teacher.id, email: teacher.email });
  return created(res, { token, teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
});

export const loginTeacher = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginTeacherSchema>;

  const teacher = await prisma.teacher.findUnique({ where: { email } });
  if (!teacher) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const validPassword = await comparePassword(password, teacher.passwordHash);
  if (!validPassword) {
    throw AppError.unauthorized("Invalid email or password");
  }

  await writeAuditLog({
    action: "LOGIN",
    actorType: "TEACHER",
    teacherId: teacher.id,
    actorLabel: teacher.email,
    description: `Teacher ${teacher.email} logged in`,
    ipAddress: req.ip,
  });

  const token = signToken({ role: "TEACHER", teacherId: teacher.id, email: teacher.email });
  return ok(res, { token, teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
});

/**
 * Student login: PIN only, no OTP/SMS/email step. The PIN is normalized
 * (trimmed + uppercased) before lookup so "25007-cs-001" still matches the
 * canonical "25007-CS-001" record.
 */
export const loginStudent = asyncHandler(async (req: Request, res: Response) => {
  const { pin: rawPin } = req.body as z.infer<typeof studentLoginSchema>;
  const pin = normalizePin(rawPin);

  if (!isValidPinFormat(pin)) {
    throw AppError.unauthorized("Invalid PIN Number");
  }

  const student = await prisma.student.findUnique({
    where: { pin },
    include: { class: { include: { teacher: true } } },
  });

  if (!student) {
    throw AppError.unauthorized("Invalid PIN Number");
  }

  await writeAuditLog({
    action: "LOGIN",
    actorType: "STUDENT",
    actorLabel: `${student.name} (${student.pin})`,
    targetType: "Student",
    targetId: student.id,
    description: `Student ${student.name} logged in with PIN ${student.pin}`,
    ipAddress: req.ip,
  });

  const token = signToken({ role: "STUDENT", studentId: student.id, pin: student.pin });
  return ok(res, {
    token,
    student: {
      id: student.id,
      name: student.name,
      pin: student.pin,
      className: student.class.name,
      teacherId: student.class.teacherId,
    },
  });
});
