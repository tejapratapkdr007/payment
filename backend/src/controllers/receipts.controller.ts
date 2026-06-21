import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getTeacherAuth, getStudentAuth } from "../middleware/auth";
import { generateReceiptPdf } from "../services/pdf.service";
import { writeAuditLog } from "../services/audit.service";

async function loadApprovedPaymentByReceipt(receiptNumber: string) {
  return prisma.payment.findUnique({
    where: { receiptNumber },
    include: { student: { include: { class: true } }, collection: { include: { teacher: { include: { settings: true } } } } },
  });
}

/** Authenticated download — the owning student or their teacher only. */
export const downloadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { receiptNumber } = req.params;
  const payment = await loadApprovedPaymentByReceipt(receiptNumber);
  if (!payment || payment.status !== "APPROVED") {
    throw AppError.notFound("Receipt not found");
  }

  if (req.auth!.role === "STUDENT") {
    const { studentId } = getStudentAuth(req);
    if (payment.studentId !== studentId) throw AppError.forbidden();
  } else {
    const { teacherId } = getTeacherAuth(req);
    if (payment.collection.teacherId !== teacherId) throw AppError.forbidden();
  }

  const settings = payment.collection.teacher.settings;
  const pdf = await generateReceiptPdf({
    institutionName: settings?.institutionName ?? "Class Payment Tracker",
    institutionLogoUrl: settings?.institutionLogoUrl,
    collectionName: payment.collection.name,
    studentName: payment.student.name,
    studentPin: payment.student.pin,
    studentClass: payment.student.class.name,
    utr: payment.utrEntered ?? "N/A",
    amount: Number(payment.collection.amount),
    paymentDate: payment.submittedAt ?? payment.createdAt,
    status: "APPROVED",
    receiptNumber: payment.receiptNumber!,
  });

  if (req.auth!.role === "TEACHER") {
    await writeAuditLog({
      action: "GENERATE_RECEIPT",
      actorType: "TEACHER",
      teacherId: getTeacherAuth(req).teacherId,
      actorLabel: getTeacherAuth(req).email,
      targetType: "Payment",
      targetId: payment.id,
      description: `Downloaded receipt ${receiptNumber}`,
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${receiptNumber}.pdf"`);
  res.send(pdf);
});

/**
 * Public, unauthenticated verification — deliberately returns only enough
 * information to confirm legitimacy (no UTR, no screenshot, no contact
 * details) so the endpoint can't be scraped for sensitive payment data.
 */
export const verifyReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { receiptNumber } = req.params;
  const payment = await loadApprovedPaymentByReceipt(receiptNumber);

  if (!payment || payment.status !== "APPROVED") {
    return ok(res, { valid: false });
  }

  return ok(res, {
    valid: true,
    receiptNumber: payment.receiptNumber,
    institutionName: payment.collection.teacher.settings?.institutionName ?? "Class Payment Tracker",
    collectionName: payment.collection.name,
    studentName: maskName(payment.student.name),
    amount: Number(payment.collection.amount),
    approvedAt: payment.reviewedAt,
  });
});

/** Shows first name fully and masks the rest, e.g. "Rahul K***" — enough to
 *  recognize your own receipt without exposing a full name to the public. */
function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [first, ...rest] = parts;
  return `${first} ${rest.map((p) => `${p[0]}${"*".repeat(Math.max(p.length - 1, 1))}`).join(" ")}`;
}
