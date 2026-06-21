import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { writeAuditLog } from "../services/audit.service";
import { generateQrDataUrl } from "../services/qr.service";
import { buildGenericUpiLink } from "../services/upi.service";
import { getTeacherAuth, getStudentAuth } from "../middleware/auth";

export const updateSettingsSchema = z.object({
  institutionName: z.string().min(1).max(150).optional(),
  teacherDisplayName: z.string().min(1).max(100).optional(),
  upiId: z.string().max(100).optional(),
  upiPhoneNumber: z.string().max(20).optional(),
  defaultAmount: z.number().positive().optional(),
  institutionLogoUrl: z.string().url().optional().or(z.literal("")),
  theme: z.enum(["light", "dark", "system"]).optional(),
  collectionDeadline: z.string().datetime().optional().or(z.literal("")),
});

async function getOrCreateSettings(teacherId: string) {
  let settings = await prisma.settings.findUnique({ where: { teacherId } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { teacherId } });
  }
  return settings;
}

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const settings = await getOrCreateSettings(teacherId);
  return ok(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const body = req.body as z.infer<typeof updateSettingsSchema>;

  await getOrCreateSettings(teacherId);

  const settings = await prisma.settings.update({
    where: { teacherId },
    data: {
      ...body,
      institutionLogoUrl: body.institutionLogoUrl === "" ? null : body.institutionLogoUrl,
      collectionDeadline:
        body.collectionDeadline === "" ? null : body.collectionDeadline ? new Date(body.collectionDeadline) : undefined,
    },
  });

  await writeAuditLog({
    action: "SETTINGS_CHANGE",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    description: "Updated institution/payment settings",
    metadata: body,
  });

  return ok(res, settings);
});

/** Returns a data: URL PNG of the relevant UPI QR code, ready for <img src=...>. */
export const getUpiQrCode = asyncHandler(async (req: Request, res: Response) => {
  let teacherId: string;

  if (req.auth!.role === "TEACHER") {
    teacherId = getTeacherAuth(req).teacherId;
  } else {
    const { studentId } = getStudentAuth(req);
    // Students never get to choose whose QR they see — we look up their
    // own class's teacher rather than trusting a client-supplied id.
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });
    if (!student) throw AppError.notFound("Student not found");
    teacherId = student.class.teacherId;
  }

  const settings = await getOrCreateSettings(teacherId);
  if (!settings.upiId) {
    throw AppError.badRequest("UPI ID has not been configured yet");
  }

  const amount = req.query.amount ? Number(req.query.amount) : Number(settings.defaultAmount);
  const link = buildGenericUpiLink({
    payeeVpa: settings.upiId,
    payeeName: settings.teacherDisplayName,
    amount,
    transactionNote: (req.query.note as string) || settings.institutionName,
  });

  const dataUrl = await generateQrDataUrl(link);
  return ok(res, { dataUrl, upiLink: link });
});
