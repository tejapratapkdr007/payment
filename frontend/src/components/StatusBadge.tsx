import { PaymentStatus } from "../types";

const STATUS_CONFIG: Record<PaymentStatus, { label: string; classes: string }> = {
  PENDING_PAYMENT: {
    label: "Not Paid",
    classes: "border-ink-400 text-ink-400 dark:text-paper-100 dark:border-paper-100",
  },
  PENDING: {
    label: "In Review",
    classes: "border-warn text-warn",
  },
  APPROVED: {
    label: "Approved",
    classes: "border-success text-success",
  },
  REJECTED: {
    label: "Rejected",
    classes: "border-danger text-danger",
  },
  LATE: {
    label: "Late",
    classes: "border-danger text-danger",
  },
  REUPLOAD_REQUESTED: {
    label: "Re-upload Needed",
    classes: "border-marigold-600 text-marigold-600",
  },
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_PAYMENT;
  return <span className={`stamp ${cfg.classes}`}>{cfg.label}</span>;
}
