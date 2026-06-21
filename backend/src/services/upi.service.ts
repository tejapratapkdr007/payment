export interface UpiLinkParams {
  payeeVpa: string; // UPI ID, e.g. teacher@upi
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRefId?: string; // optional merchant reference, helps reconciliation
}

function buildQueryString(params: UpiLinkParams): string {
  const qs = new URLSearchParams({
    pa: params.payeeVpa,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.transactionNote,
  });
  if (params.transactionRefId) qs.set("tr", params.transactionRefId);
  return qs.toString();
}

/** Generic upi:// deep link — works with any UPI app installed on the device. */
export function buildGenericUpiLink(params: UpiLinkParams): string {
  return `upi://pay?${buildQueryString(params)}`;
}

/**
 * App-specific deep links. On mobile browsers these are more likely to open
 * the *specific* app directly rather than showing an app picker. If the app
 * isn't installed, falling back to the generic upi:// link is recommended
 * on the frontend (the buttons can attempt the specific scheme then fall
 * back after a short timeout).
 */
export function buildAppSpecificUpiLinks(params: UpiLinkParams) {
  const qs = buildQueryString(params);
  return {
    generic: `upi://pay?${qs}`,
    googlePay: `tez://upi/pay?${qs}`,
    phonePe: `phonepe://pay?${qs}`,
    paytm: `paytmmp://pay?${qs}`,
  };
}
