import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ink text-paper-50 hover:bg-ink-700 dark:bg-marigold dark:text-ink-900 dark:hover:bg-marigold-600",
  secondary: "bg-marigold text-ink-900 hover:bg-marigold-600",
  outline: "border-2 border-ink text-ink dark:border-paper-50 dark:text-paper-50 hover:bg-ink-50 dark:hover:bg-ink-700",
  ghost: "text-ink dark:text-paper-50 hover:bg-ink-50 dark:hover:bg-ink-700",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3 gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center font-display font-semibold rounded-DEFAULT transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...rest}
      >
        {loading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
