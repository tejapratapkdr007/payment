import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from "react";
import clsx from "clsx";

const fieldBase =
  "w-full rounded-DEFAULT border-2 border-line dark:border-line-dark bg-paper-raised dark:bg-paper-dark-raised px-3.5 py-2.5 text-sm text-ink dark:text-paper-50 placeholder:text-ink-400/60 focus:border-teal dark:focus:border-marigold transition-colors";

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-display font-semibold text-ink dark:text-paper-50 mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-ink-400 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1 font-medium">{error}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={clsx(fieldBase, className)} {...rest} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} className={clsx(fieldBase, "min-h-[88px] resize-y", className)} {...rest} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={clsx(fieldBase, "cursor-pointer", className)} {...rest}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
