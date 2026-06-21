import { useEffect, useState } from "react";
import { api, unwrap, getErrorMessage } from "../../lib/api";
import { Skeleton } from "../Skeleton";

interface UpiQrResponse {
  dataUrl: string;
  upiLink: string;
}

export function UpiPayButtons({ amount, note }: { amount: number; note: string }) {
  const [data, setData] = useState<UpiQrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    unwrap<UpiQrResponse>(
      api.get("/settings/upi-qr", { params: { amount, note } })
    )
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [amount, note]);

  if (error) {
    return (
      <p className="text-xs text-ink-400 italic">
        UPI QR isn't set up yet — ask your teacher to add their UPI ID in Settings.
      </p>
    );
  }

  if (!data) {
    return <Skeleton className="h-40 w-40 mx-auto" />;
  }

  return (
    <div className="text-center">
      <img
        src={data.dataUrl}
        alt="Scan to pay via UPI"
        className="w-40 h-40 mx-auto rounded-DEFAULT border-2 border-line dark:border-line-dark"
      />
      <p className="text-xs text-ink-400 mt-2 mb-3">Scan with any UPI app, or tap below</p>
      <a
        href={data.upiLink}
        className="inline-flex items-center justify-center w-full rounded-DEFAULT bg-ink dark:bg-marigold text-paper-50 dark:text-ink-900 font-display font-semibold text-sm px-4 py-2.5"
      >
        Open UPI App to Pay ₹{amount.toFixed(2)}
      </a>
    </div>
  );
}
