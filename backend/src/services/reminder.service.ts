export interface ReminderContext {
  studentName: string;
  collectionName: string;
  amount: number;
  upiId?: string | null;
  deadline?: Date | null;
  institutionName: string;
  isLate: boolean;
}

/**
 * Builds a friendly, copy-pasteable WhatsApp reminder message. Teachers
 * paste this straight into a WhatsApp group or individual chat — there's
 * no SMS/WhatsApp API integration here (none was requested), just a
 * ready-to-send string with a "Copy" button on the frontend.
 */
export function buildReminderMessage(ctx: ReminderContext): string {
  const deadlineLine = ctx.deadline
    ? `Deadline: ${ctx.deadline.toLocaleDateString("en-IN")}`
    : "";
  const upiLine = ctx.upiId ? `Pay via UPI ID: ${ctx.upiId}` : "";

  if (ctx.isLate) {
    return [
      `Hi ${ctx.studentName}, this is a reminder from ${ctx.institutionName}.`,
      `Your payment of Rs.${ctx.amount} for "${ctx.collectionName}" is now LATE.`,
      deadlineLine,
      upiLine,
      `Please complete the payment as soon as possible to avoid further delay.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Hi ${ctx.studentName}, this is a reminder from ${ctx.institutionName}.`,
    `Your payment of Rs.${ctx.amount} for "${ctx.collectionName}" is still pending.`,
    deadlineLine,
    upiLine,
    `Please complete the payment at the earliest. Thank you!`,
  ]
    .filter(Boolean)
    .join("\n");
}
