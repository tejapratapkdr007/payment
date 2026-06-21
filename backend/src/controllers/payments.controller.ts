import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getTeacherAuth, getStudentAuth } from "../middleware/auth";
import { assertValidScreenshot } from "../middleware/upload";
import { sha256Buffer, perceptualHash } from "../services/hash.service";
import { extractPaymentDetails } from "../services/ocr.service";
import { assessFraudRisk } from "../services/fraud.service";
import { uploadScreenshot, deleteStoredFile } from "../services/storage.service";
import { notifySubmissionReceived, notifyApproved, notifyRejected, notifyReuploadRequested } from "../services/notification.service";
import { writeAuditLog } from "../services/audit.service";
import { generateReceiptNumber } from "../services/receiptNumber.service";

export const submitPaymentSchema = z.object({
  utr: z.string().min(4, "UTR / transaction reference is required").max(40),
});

/**
 * Determines whether a payment should be flagged late: the collection has
 * a deadline, and that deadline has already passed at submission time.
 */
function computeIsLate(deadline: Date | null, now: Date): boolean {
  return Boolean(deadline && deadline.getTime() < now.getTime());
}

export const submitPayment = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = getStudentAuth(req);
  const { collectionId } = req.params;
  const { utr } = req.body as z.infer<typeof submitPaymentSchema>;

  const detectedType = assertValidScreenshot(req.file);

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) throw AppError.notFound("Collection not found");
  if (!collection.isActive) {
    throw AppError.badRequest("This collection is no longer accepting payments");
  }

  let payment = await prisma.payment.findUnique({
    where: { studentId_collectionId: { studentId, collectionId } },
  });
  if (!payment) {
    // Defensive fallback — normally seeded automatically when the
    // collection or student was created.
    payment = await prisma.payment.create({
      data: { studentId, collectionId, status: "PENDING_PAYMENT" },
    });
  }

  if (payment.status === "APPROVED") {
    throw AppError.conflict("This payment has already been approved and cannot be resubmitted");
  }

  const buffer = req.file!.buffer;
  const fileSha256 = sha256Buffer(buffer);
  const imageHash = await perceptualHash(buffer);
  const ocr = await extractPaymentDetails(buffer);

  const fraud = await assessFraudRisk({
    studentId,
    collectionAmount: Number(collection.amount),
    enteredUtr: utr,
    fileSha256,
    imageHash,
    ocr,
    excludePaymentId: payment.id,
  });

  // Clean up the previously stored screenshot (if any) now that we have a
  // successful new upload, to avoid leaking storage on every resubmission.
  if (payment.screenshotPublicId) {
    const previousProvider = payment.screenshotUrl?.includes("cloudinary") ? "cloudinary" : "local";
    await deleteStoredFile({ publicId: payment.screenshotPublicId, provider: previousProvider });
  }

  const stored = await uploadScreenshot(buffer, detectedType);
  const now = new Date();
  const isLate = payment.isLate || computeIsLate(collection.deadline, now);

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      utrEntered: utr.trim(),
      utrOcr: ocr.utr,
      amountOcr: ocr.amount ?? undefined,
      dateOcr: ocr.date ? safeParseDate(ocr.date) : undefined,
      screenshotUrl: stored.url,
      screenshotPublicId: stored.publicId,
      imageHash,
      fileSha256,
      fileMetadata: {
        originalName: req.file!.originalname,
        size: req.file!.size,
        mimetype: req.file!.mimetype,
        detectedType,
      },
      ocrRawText: ocr.rawText,
      ocrSuccessTextFound: ocr.successTextFound,
      ocrConfidence: ocr.confidence,
      status: "PENDING",
      fraudRisk: fraud.riskLevel,
      fraudReasons: fraud.reasons,
      verificationMethod: "MANUAL_OCR",
      reviewNotes: null,
      reviewedById: null,
      reviewedAt: null,
      submittedAt: now,
      isLate,
    },
  });

  await prisma.paymentStatusHistory.create({
    data: {
      paymentId: payment.id,
      status: "PENDING",
      changedByActorType: "STUDENT",
      changedByStudentId: studentId,
      reason: "Student submitted payment screenshot",
    },
  });

  await notifySubmissionReceived(studentId, collection.name);

  return ok(res, updated, "Payment submitted and is pending review");
});

function safeParseDate(raw: string): Date | undefined {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Flips any still-unpaid (PENDING_PAYMENT) rows to LATE once their
 * collection's deadline has passed. Called opportunistically at the start
 * of list/dashboard endpoints rather than via a separate cron process —
 * cheap, scoped, and keeps stored status consistent without needing a
 * background scheduler.
 */
async function syncLateStatuses(teacherFilter: { teacherId?: string; classId?: string }) {
  const now = new Date();
  await prisma.payment.updateMany({
    where: {
      status: "PENDING_PAYMENT",
      isLate: false,
      collection: {
        deadline: { lt: now },
        ...(teacherFilter.teacherId ? { teacherId: teacherFilter.teacherId } : {}),
      },
    },
    data: { status: "LATE", isLate: true },
  });
}

/** Student's own payments across all collections, plus per-collection class progress. */
export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = getStudentAuth(req);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) throw AppError.notFound("Student not found");

  await syncLateStatuses({ teacherId: student.class.teacherId });

  const payments = await prisma.payment.findMany({
    where: { studentId },
    include: { collection: true },
    orderBy: { createdAt: "desc" },
  });

  const classmateIds = (
    await prisma.student.findMany({ where: { classId: student.classId }, select: { id: true } })
  ).map((s) => s.id);
  const totalStudents = classmateIds.length;

  // Per-collection breakdown: "60 Students, 48 Paid, 12 Pending, 80%
  // Completed" is scoped to a single collection, not summed across every
  // fee the class has ever had — so we group by collection, not globally.
  const grouped = await prisma.payment.groupBy({
    by: ["collectionId", "status"],
    where: { studentId: { in: classmateIds } },
    _count: { _all: true },
  });

  const byCollection = new Map<string, { paid: number }>();
  for (const row of grouped) {
    const entry = byCollection.get(row.collectionId) ?? { paid: 0 };
    if (row.status === "APPROVED") entry.paid += row._count._all;
    byCollection.set(row.collectionId, entry);
  }

  const classProgress = Array.from(byCollection.entries()).map(([collectionId, { paid }]) => ({
    collectionId,
    totalStudents,
    paid,
    pending: totalStudents - paid,
    percentComplete: totalStudents > 0 ? Math.round((paid / totalStudents) * 100) : 0,
  }));

  return ok(res, {
    student: { id: student.id, name: student.name, pin: student.pin, className: student.class.name },
    payments,
    classProgress,
  });
});

export const listPaymentsQuerySchema = z.object({
  status: z.enum(["PENDING", "PENDING_PAYMENT", "APPROVED", "REJECTED", "LATE", "REUPLOAD_REQUESTED", "FRAUD_FLAGGED"]).optional(),
  collectionId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "date", "amount"]).default("date"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});

/** Teacher's payment review queue: search, filter, sort, paginate across the whole class. */
export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const q = req.query as unknown as z.infer<typeof listPaymentsQuerySchema>;

  await syncLateStatuses({ teacherId });

  const where: any = {
    collection: { teacherId, ...(q.collectionId ? { id: q.collectionId } : {}) },
    ...(q.classId ? { student: { classId: q.classId } } : {}),
  };

  if (q.status === "FRAUD_FLAGGED") {
    where.fraudRisk = { not: "NONE" };
  } else if (q.status) {
    where.status = q.status;
  }

  if (q.search) {
    where.OR = [
      { student: { name: { contains: q.search, mode: "insensitive" } } },
      { student: { pin: { contains: q.search, mode: "insensitive" } } },
      { utrEntered: { contains: q.search, mode: "insensitive" } },
      { receiptNumber: { contains: q.search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    q.sortBy === "name"
      ? { student: { name: q.sortDir } }
      : q.sortBy === "amount"
      ? { collection: { amount: q.sortDir } }
      : { createdAt: q.sortDir };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { student: { include: { class: true } }, collection: true },
      orderBy: orderBy as any,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return ok(res, {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.ceil(total / q.pageSize) || 1,
  });
});

/** Full detail view for the teacher's review screen: OCR, fraud, screenshot, student, history. */
export const getPaymentDetail = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;

  const payment = await prisma.payment.findFirst({
    where: { id, collection: { teacherId } },
    include: {
      student: { include: { class: true } },
      collection: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!payment) throw AppError.notFound("Payment not found");
  return ok(res, payment);
});

export const reviewActionSchema = z.object({
  notes: z.string().max(1000).optional(),
});

async function loadReviewablePayment(teacherId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, collection: { teacherId } },
    include: { student: true, collection: true },
  });
  if (!payment) throw AppError.notFound("Payment not found");
  return payment;
}

export const approvePayment = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const { id } = req.params;
  const { notes } = req.body as z.infer<typeof reviewActionSchema>;

  const payment = await loadReviewablePayment(teacherId, id);
  if (payment.status !== "PENDING") {
    throw AppError.conflict(
      `Only payments awaiting review can be approved (current status: ${payment.status})`
    );
  }

  const receiptNumber = await generateReceiptNumber(new Date().getFullYear());

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedById: teacherId,
      reviewedAt: new Date(),
      reviewNotes: notes ?? payment.reviewNotes,
      receiptNumber,
      receiptGeneratedAt: new Date(),
    },
  });

  await prisma.paymentStatusHistory.create({
    data: {
      paymentId: id,
      status: "APPROVED",
      changedByActorType: "TEACHER",
      changedByTeacherId: teacherId,
      reason: notes,
    },
  });

  await writeAuditLog({
    action: "APPROVE_PAYMENT",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Payment",
    targetId: id,
    description: `Approved payment for ${payment.student.name} (${payment.student.pin}) — ${payment.collection.name}`,
  });

  await notifyApproved(payment.studentId, payment.collection.name, receiptNumber);

  return ok(res, updated);
});

export const rejectPayment = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const { id } = req.params;
  const { notes } = req.body as z.infer<typeof reviewActionSchema>;

  const payment = await loadReviewablePayment(teacherId, id);
  if (payment.status !== "PENDING") {
    throw AppError.conflict(
      `Only payments awaiting review can be rejected (current status: ${payment.status})`
    );
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: teacherId,
      reviewedAt: new Date(),
      reviewNotes: notes ?? payment.reviewNotes,
    },
  });

  await prisma.paymentStatusHistory.create({
    data: {
      paymentId: id,
      status: "REJECTED",
      changedByActorType: "TEACHER",
      changedByTeacherId: teacherId,
      reason: notes,
    },
  });

  await writeAuditLog({
    action: "REJECT_PAYMENT",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Payment",
    targetId: id,
    description: `Rejected payment for ${payment.student.name} (${payment.student.pin}) — ${payment.collection.name}`,
    metadata: { reason: notes },
  });

  await notifyRejected(payment.studentId, payment.collection.name, notes);

  return ok(res, updated);
});

export const requestReupload = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  const { id } = req.params;
  const { notes } = req.body as z.infer<typeof reviewActionSchema>;

  const payment = await loadReviewablePayment(teacherId, id);
  if (payment.status !== "PENDING") {
    throw AppError.conflict(
      `Re-upload can only be requested for payments awaiting review (current status: ${payment.status})`
    );
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: "REUPLOAD_REQUESTED",
      reviewedById: teacherId,
      reviewedAt: new Date(),
      reviewNotes: notes ?? payment.reviewNotes,
    },
  });

  await prisma.paymentStatusHistory.create({
    data: {
      paymentId: id,
      status: "REUPLOAD_REQUESTED",
      changedByActorType: "TEACHER",
      changedByTeacherId: teacherId,
      reason: notes,
    },
  });

  await writeAuditLog({
    action: "REQUEST_REUPLOAD",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    targetType: "Payment",
    targetId: id,
    description: `Requested re-upload for ${payment.student.name} (${payment.student.pin}) — ${payment.collection.name}`,
    metadata: { reason: notes },
  });

  await notifyReuploadRequested(payment.studentId, payment.collection.name, notes);

  return ok(res, updated);
});

/** Standalone "Add Notes" action that doesn't change the payment's status. */
export const addPaymentNotes = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { id } = req.params;
  const { notes } = req.body as z.infer<typeof reviewActionSchema>;
  if (!notes) throw AppError.badRequest("notes is required");

  await loadReviewablePayment(teacherId, id);
  const updated = await prisma.payment.update({ where: { id }, data: { reviewNotes: notes } });
  return ok(res, updated);
});
