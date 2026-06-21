import { NotificationType } from "@prisma/client";
import { prisma } from "../config/prisma";

interface CreateNotificationInput {
  studentId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function notifyStudent(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      studentId: input.studentId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata as any,
    },
  });
}

export async function notifySubmissionReceived(studentId: string, collectionName: string) {
  return notifyStudent({
    studentId,
    type: "SUBMISSION_RECEIVED",
    title: "Payment submitted",
    message: `Your payment for "${collectionName}" has been submitted and is pending review.`,
  });
}

export async function notifyApproved(studentId: string, collectionName: string, receiptNumber: string) {
  return notifyStudent({
    studentId,
    type: "APPROVED",
    title: "Payment approved",
    message: `Your payment for "${collectionName}" has been approved. Receipt: ${receiptNumber}.`,
    metadata: { receiptNumber },
  });
}

export async function notifyRejected(studentId: string, collectionName: string, reason?: string) {
  return notifyStudent({
    studentId,
    type: "REJECTED",
    title: "Payment rejected",
    message: `Your payment for "${collectionName}" was rejected.${reason ? ` Reason: ${reason}` : ""}`,
  });
}

export async function notifyReuploadRequested(studentId: string, collectionName: string, reason?: string) {
  return notifyStudent({
    studentId,
    type: "REUPLOAD_REQUESTED",
    title: "Re-upload requested",
    message: `Please re-upload your payment screenshot for "${collectionName}".${
      reason ? ` Reason: ${reason}` : ""
    }`,
  });
}

export async function notifyDeadlineApproaching(studentId: string, collectionName: string, deadline: Date) {
  return notifyStudent({
    studentId,
    type: "DEADLINE_APPROACHING",
    title: "Payment deadline approaching",
    message: `The deadline for "${collectionName}" is ${deadline.toLocaleDateString("en-IN")}. Please pay soon to avoid being marked late.`,
  });
}
