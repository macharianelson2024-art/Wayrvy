import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  loading,
  leftIcon,
  fullWidth,
  children,
  className = "",
  disabled,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed h-11 px-5";

  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-600 active:scale-[0.99]",
    secondary: "bg-brand-tint text-brand hover:bg-brand-tint/80",
    ghost: "bg-transparent text-ink hover:bg-surface",
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[base, variants[variant], fullWidth ? "w-full" : "", className].join(" ")}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
}