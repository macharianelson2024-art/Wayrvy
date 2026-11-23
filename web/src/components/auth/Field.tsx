import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, error, hint, rightSlot, id, className = "", ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={[
            "w-full h-11 rounded-xl bg-white border px-3.5 text-sm text-ink placeholder:text-muted/60",
            "focus:outline-none focus:ring-2 transition",
            error
              ? "border-red-400 focus:ring-red-300/40"
              : "border-[#E1E7EE] focus:border-brand focus:ring-brand/25",
            rightSlot ? "pr-11" : "",
            className,
          ].join(" ")}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightSlot}</div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});