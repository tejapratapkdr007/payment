import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getTeacherAuth } from "../middleware/auth";
import { parseStatementFile, matchEntriesToPendingPayments } from "../services/reconciliation.service";
import { generateReceiptNumber } from "../services/receiptNumber.service";
import { writeAuditLog } from "../services/audit.service";
import { notifyApproved } from "../services/notification.service";

/**
 * Teacher uploads a bank/UPI statement export (CSV, XLSX, or PDF). Every
 * PENDING payment under this teacher is checked against the statement by
 * UTR; matches are auto-approved with a generated receipt, exactly as if a
 * teacher had clicked "Approve" — including status history, audit log, and
 * student notification — but tagged with verificationMethod
 * STATEMENT_RECONCILIATION instead of MANUAL_OCR so the trail shows how it
 * was actually verified.
 */
export const reconcileStatement = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, email } = getTeacherAuth(req);
  if (!req.file) throw AppError.badRequest("A statement file is required");

  const entries = await parseStatementFile(req.file.buffer, req.file.mimetype, req.file.originalname);
  if (entries.length === 0) {
    throw AppError.badRequest("Could not find any UTR/transaction entries in this statement");
  }

  const pendingPayments = await prisma.payment.findMany({
    where: { status: "PENDING", collection: { teacherId }, utrEntered: { not: null } },
    include: { collection: true, student: true },
  });

  const candidates = pendingPayments.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    utrEntered: p.utrEntered,
    collectionAmount: Number(p.collection.amount),
  }));

  const matches = matchEntriesToPendingPayments(entries, candidates);
  const paymentById = new Map(pendingPayments.map((p) => [p.id, p]));

  const matched: { paymentId: string; receiptNumber: string; amountMatches: boolean }[] = [];
  const amountMismatches: { paymentId: string; expected: number; found: number | null }[] = [];

  for (const match of matches) {
    const payment = paymentById.get(match.paymentId);
    if (!payment) continue;

    if (!match.amountMatches) {
      amountMismatches.push({
        paymentId: match.paymentId,
        expected: match.collectionAmount,
        found: match.matchedAmount,
      });
      continue; // do not auto-approve amount mismatches — needs manual review
    }

    const receiptNumber = await generateReceiptNumber(new Date().getFullYear());

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        reviewedById: teacherId,
        reviewedAt: new Date(),
        receiptNumber,
        receiptGeneratedAt: new Date(),
        verificationMethod: "STATEMENT_RECONCILIATION",
      },
    });

    await prisma.paymentStatusHistory.create({
      data: {
        paymentId: payment.id,
        status: "APPROVED",
        changedByActorType: "TEACHER",
        changedByTeacherId: teacherId,
        reason: "Auto-approved via bank/UPI statement reconciliation",
      },
    });

    await notifyApproved(payment.studentId, payment.collection.name, receiptNumber);

    matched.push({ paymentId: payment.id, receiptNumber, amountMatches: true });
  }

  await writeAuditLog({
    action: "RECONCILE_STATEMENT",
    actorType: "TEACHER",
    teacherId,
    actorLabel: email,
    description: `Reconciled statement "${req.file.originalname}": ${matched.length} auto-approved, ${amountMismatches.length} amount mismatches`,
    metadata: { fileName: req.file.originalname, matchedCount: matched.length, mismatchCount: amountMismatches.length },
  });

  const matchedUtrs = new Set(matches.map((m) => m.utr));
  const unmatchedEntries = entries.filter((e) => !matchedUtrs.has(e.utr));

  return ok(res, {
    totalEntriesInStatement: entries.length,
    totalPendingChecked: pendingPayments.length,
    autoApproved: matched,
    amountMismatches,
    unmatchedStatementEntries: unmatchedEntries,
  });
});
