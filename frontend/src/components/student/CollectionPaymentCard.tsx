import { useState } from "react";
import { Payment, ClassProgress } from "../../types";
import { Card } from "../Card";
import { StatusBadge } from "../StatusBadge";
import { Button } from "../Button";
import { CountdownTimer } from "../CountdownTimer";
import { UpiPayButtons } from "./UpiPayButtons";
import { PaymentSubmitForm } from "./PaymentSubmitForm";
import { api, getErrorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export function CollectionPaymentCard({
  payment,
  progress,
  onRefresh,
}: {
  payment: Payment;
  progress?: ClassProgress;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const collection = payment.collection!;
  const amount = Number(collection.amount);
  const needsAction =
    payment.status === "PENDING_PAYMENT" ||
    payment.status === "LATE" ||
    payment.status === "REUPLOAD_REQUESTED" ||
    payment.status === "REJECTED";

  async function handleDownloadReceipt() {
    if (!payment.receiptNumber) return;
    setDownloading(true);
    try {
      const res = await api.get(`/receipts/${payment.receiptNumber}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payment.receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-bold text-base text-ink dark:text-paper-50">{collection.name}</p>
          <p className="figure text-sm text-ink-400 mt-0.5">₹{amount.toFixed(2)}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {collection.deadline && needsAction && (
        <div className="mt-2">
          <CountdownTimer deadline={collection.deadline} />
        </div>
      )}

      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-ink-400 mb-1">
            <span>Class progress</span>
            <span className="figure">{progress.paid}/{progress.totalStudents} · {progress.percentComplete}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-700 overflow-hidden">
            <div
              className="h-full bg-teal dark:bg-marigold transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {payment.status === "REJECTED" && payment.reviewNotes && (
        <p className="mt-3 text-xs text-danger bg-danger-bg rounded-DEFAULT px-3 py-2">
          Rejected: {payment.reviewNotes}
        </p>
      )}
      {payment.status === "REUPLOAD_REQUESTED" && payment.reviewNotes && (
        <p className="mt-3 text-xs text-marigold-600 bg-marigold-50 rounded-DEFAULT px-3 py-2">
          Re-upload requested: {payment.reviewNotes}
        </p>
      )}
      {payment.status === "PENDING" && (
        <p className="mt-3 text-xs text-ink-400">Submitted — waiting for your teacher to review it.</p>
      )}

      {payment.status === "APPROVED" && payment.receiptNumber && (
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={handleDownloadReceipt} loading={downloading}>
          Download Receipt
        </Button>
      )}

      {needsAction && (
        <>
          <Button
            variant={expanded ? "ghost" : "secondary"}
            size="sm"
            className="mt-4 w-full"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide" : payment.status === "PENDING_PAYMENT" || payment.status === "LATE" ? "Pay Now" : "Re-submit Payment"}
          </Button>
          {expanded && (
            <div className="mt-3">
              <UpiPayButtons amount={amount} note={collection.name} />
              <PaymentSubmitForm collectionId={payment.collectionId} onSubmitted={() => { setExpanded(false); onRefresh(); }} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
