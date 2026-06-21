import { ReactNode } from "react";
import { Button } from "./Button";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  keyFor,
  emptyMessage = "Nothing here yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-ink-400 dark:text-paper-100/60 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="ledger-rule text-left">
            {columns.map((col) => (
              <th
                key={col.header}
                className="py-2.5 px-3 font-display font-semibold text-xs uppercase tracking-wide text-ink-400 dark:text-paper-100/60 whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFor(row)} className="ledger-rule hover:bg-ink-50/60 dark:hover:bg-ink-700/20 transition-colors">
              {columns.map((col) => (
                <td key={col.header} className={`py-3 px-3 align-middle ${col.className ?? ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-xs text-ink-400">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
