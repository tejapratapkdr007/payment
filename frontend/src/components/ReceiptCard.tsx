import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { PaymentStatus } from "../types";

export function ReceiptCard({
  receiptNumber,
  institutionName,
  collectionName,
  studentName,
  amount,
  date,
  status,
  utr,
}: {
  receiptNumber: string;
  institutionName: string;
  collectionName: string;
  studentName: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  utr?: string;
}) {
  return (
    <Card receiptEdge className="pt-6 px-6 pb-6 max-w-md mx-auto">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400 font-display font-semibold">
            {institutionName}
          </p>
          <p className="figure text-xs text-ink-400 mt-0.5">{receiptNumber}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="my-5 text-center">
        <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">{collectionName}</p>
        <p className="figure text-4xl font-bold text-ink dark:text-paper-50">
          ₹{amount.toFixed(2)}
        </p>
      </div>

      <div className="space-y-2.5">
        <Row label="Student" value={studentName} />
        {utr && <Row label="UTR" value={utr} mono />}
        <Row label="Date" value={date} />
      </div>
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between ledger-rule pb-2.5">
      <span className="text-xs text-ink-400">{label}</span>
      <span className={`text-sm font-medium text-ink dark:text-paper-50 ${mono ? "figure" : ""}`}>
        {value}
      </span>
    </div>
  );
}
