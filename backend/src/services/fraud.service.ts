import { prisma } from "../config/prisma";
import { hammingDistanceHex, PERCEPTUAL_DUPLICATE_THRESHOLD } from "./hash.service";
import { OcrExtractionResult } from "./ocr.service";

export type FraudRiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export interface FraudAssessment {
  riskLevel: FraudRiskLevel;
  reasons: string[];
}

interface AssessFraudInput {
  studentId: string;
  collectionAmount: number;
  enteredUtr: string;
  fileSha256: string;
  imageHash: string;
  ocr: OcrExtractionResult;
  excludePaymentId?: string; // when re-evaluating an existing payment
}

/**
 * Realistic, explainable fraud scoring. This deliberately does NOT claim to
 * be a trained ML manipulation-detection model — there is no dataset to
 * train one on here. Instead it combines several concrete, checkable
 * signals into a LOW/MEDIUM/HIGH risk level that a teacher can see and
 * override. Each signal that fires is recorded in `reasons` so the review
 * screen can show *why* something was flagged, not just a black-box score.
 */
export async function assessFraudRisk(input: AssessFraudInput): Promise<FraudAssessment> {
  const reasons: string[] = [];
  let score = 0;

  // 1. Exact duplicate screenshot (same file, byte-for-byte) used before.
  const exactDuplicate = await prisma.payment.findFirst({
    where: {
      fileSha256: input.fileSha256,
      id: input.excludePaymentId ? { not: input.excludePaymentId } : undefined,
    },
    select: { id: true, studentId: true },
  });
  if (exactDuplicate) {
    score += exactDuplicate.studentId === input.studentId ? 2 : 4;
    reasons.push(
      exactDuplicate.studentId === input.studentId
        ? "This exact screenshot was already submitted by this student before"
        : "This exact screenshot was already submitted by a different student"
    );
  }

  // 2. Near-duplicate screenshot (resaved/lightly edited copy of one already used).
  if (!exactDuplicate) {
    const recentHashes = await prisma.payment.findMany({
      where: {
        imageHash: { not: null },
        id: input.excludePaymentId ? { not: input.excludePaymentId } : undefined,
      },
      select: { imageHash: true, studentId: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    });
    const nearMatch = recentHashes.find(
      (p) =>
        p.imageHash && hammingDistanceHex(p.imageHash, input.imageHash) <= PERCEPTUAL_DUPLICATE_THRESHOLD
    );
    if (nearMatch) {
      score += nearMatch.studentId === input.studentId ? 2 : 3;
      reasons.push("A visually near-identical screenshot has already been submitted");
    }
  }

  // 3. Duplicate UTR already used on another approved/pending payment.
  const duplicateUtr = await prisma.payment.findFirst({
    where: {
      utrEntered: input.enteredUtr,
      id: input.excludePaymentId ? { not: input.excludePaymentId } : undefined,
    },
    select: { id: true },
  });
  if (duplicateUtr) {
    score += 4;
    reasons.push("This UTR number has already been used on another submission");
  }

  // 4. OCR could not find a UTR matching what the student typed.
  if (input.ocr.utr && input.ocr.utr.replace(/\s/g, "") !== input.enteredUtr.replace(/\s/g, "")) {
    score += 2;
    reasons.push("The UTR detected in the screenshot does not match the UTR entered");
  } else if (!input.ocr.utr) {
    score += 1;
    reasons.push("No UTR/reference number could be read from the screenshot");
  }

  // 5. OCR amount doesn't match the collection's required amount.
  if (input.ocr.amount !== null && Math.abs(input.ocr.amount - input.collectionAmount) > 0.5) {
    score += 2;
    reasons.push(
      `Amount in screenshot (₹${input.ocr.amount}) does not match the required amount (₹${input.collectionAmount})`
    );
  }

  // 6. No "payment successful" style text detected at all.
  if (!input.ocr.successTextFound) {
    score += 1;
    reasons.push("Could not detect payment-success text in the screenshot");
  }

  // 7. Screenshot doesn't look like a UPI payment screen at all (missing both amount and reference).
  if (!input.ocr.looksLikeUpiScreenshot) {
    score += 2;
    reasons.push("Screenshot does not appear to be a UPI payment confirmation screen");
  }

  let riskLevel: FraudRiskLevel = "NONE";
  if (score >= 6) riskLevel = "HIGH";
  else if (score >= 3) riskLevel = "MEDIUM";
  else if (score >= 1) riskLevel = "LOW";

  return { riskLevel, reasons };
}
