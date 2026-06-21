import { useEffect, useState } from "react";
import { api, unwrap, getErrorMessage } from "../../lib/api";
import { Payment } from "../../types";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Textarea } from "../Form";
import { StatusBadge } from "../StatusBadge";
import { FraudRiskBadge } from "../FraudRiskBadge";
import { SkeletonRows } from "../Skeleton";
import { useToast } from "../../context/ToastContext";

export function PaymentReviewModal({
  paymentId,
  onClose,
  onActionComplete,
}: {
  paymentId: string;
  onClose: () => void;
  onActionComplete: () => void;
}) {
  const toast = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    unwrap<Payment>(api.get(`/payments/${paymentId}`))
      .then((p) => {
        setPayment(p);
        setNotes(p.reviewNotes ?? "");
      })
      .catch((err) => toast.show(getErrorMessage(err), "error"))
      .finally(() => setLoading(false));
  }, [paymentId]);

  async function handleAction(action: "approve" | "reject" | "request-reupload") {
    setActionLoading(action);
    try {
      await api.post(`/payments/${paymentId}/${action}`, { notes: notes || undefined });
      toast.show(
        action === "approve" ? "Payment approved" : action === "reject" ? "Payment rejected" : "Re-upload requested",
        "success"
      );
      onActionComplete();
    } catch (err) {
      toast.show(getErrorMessage(err), "error");
    } finally {
      setActionLoading(null);
    }
  }

  const canReview = payment?.status === "PENDING";

  return (
    <Modal open onClose={onClose} title="Review Payment" size="lg">
      {loading || !payment ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display font-bold text-base text-ink dark:text-paper-50">
                {payment.student?.name}
              </p>
              <p className="figure text-xs text-ink-400">{payment.student?.pin} · {payment.collection?.name}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={payment.status} />
              <FraudRiskBadge risk={payment.fraudRisk} />
            </div>
          </div>

          {payment.screenshotUrl && (
            <img
              src={payment.screenshotUrl}
              alt="Payment screenshot"
              className="max-h-80 mx-auto rounded-DEFAULT border border-line dark:border-line-dark"
            />
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-ink-400 mb-1">UTR Entered</p>
              <p className="figure font-medium text-ink dark:text-paper-50">{payment.utrEntered || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">UTR Detected (OCR)</p>
              <p className="figure font-medium text-ink dark:text-paper-50">{payment.utrOcr || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Amount Required</p>
              <p className="figure font-medium text-ink dark:text-paper-50">
                ₹{Number(payment.collection?.amount ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Amount Detected (OCR)</p>
              <p className="figure font-medium text-ink dark:text-paper-50">
                {payment.amountOcr ? `₹${Number(payment.amountOcr).toFixed(2)}` : "—"}
              </p>
            </div>
          </div>

          {payment.fraudReasons.length > 0 && (
            <div className="bg-warn-bg rounded-DEFAULT px-3.5 py-3">
              <p className="text-xs font-display font-semibold text-warn mb-1.5">Flags raised</p>
              <ul className="text-xs text-ink-700 dark:text-paper-100 space-y-1 list-disc pl-4">
                {payment.fraudReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {payment.statusHistory && payment.statusHistory.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-ink-400 mb-2">History</p>
              <div className="space-y-1.5">
                {payment.statusHistory.map((h) => (
                  <div key={h.id} className="flex justify-between text-xs ledger-rule pb-1.5">
                    <span className="text-ink-400">
                      <StatusBadge status={h.status} /> {h.reason && `— ${h.reason}`}
                    </span>
                    <span className="text-ink-400/70">{new Date(h.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-display font-semibold text-ink dark:text-paper-50 mb-1.5">Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes visible to the student on reject/re-upload requests"
            />
          </div>

          {canReview ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="primary" loading={actionLoading === "approve"} onClick={() => handleAction("approve")}>
                Approve
              </Button>
              <Button variant="outline" loading={actionLoading === "request-reupload"} onClick={() => handleAction("request-reupload")}>
                Request Re-upload
              </Button>
              <Button variant="danger" loading={actionLoading === "reject"} onClick={() => handleAction("reject")}>
                Reject
              </Button>
            </div>
          ) : (
            <p className="text-xs text-ink-400 italic">
              This payment is {payment.status.toLowerCase().replace("_", " ")} and is no longer awaiting review.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
