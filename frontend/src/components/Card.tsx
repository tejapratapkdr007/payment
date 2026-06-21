import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  receiptEdge = false,
}: {
  children: ReactNode;
  className?: string;
  receiptEdge?: boolean;
}) {
  return (
    <div
      className={clsx(
        "bg-paper-raised dark:bg-paper-dark-raised rounded-lg shadow-card border border-line dark:border-line-dark",
        receiptEdge && "receipt-edge",
        className
      )}
    >
      {children}
    </div>
  );
}
