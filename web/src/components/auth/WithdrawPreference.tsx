import { useId } from "react";
import type { WithdrawAfter } from "../../lib/auth";

const OPTIONS: { value: WithdrawAfter; label: string; hint: string }[] = [
  { value: 24,  label: "1 day",   hint: "Fastest access to your money" },
  { value: 168, label: "7 days",  hint: "Balanced — our default" },
  { value: 720, label: "30 days", hint: "Best for steady savers" },
];

interface Props {
  value: WithdrawAfter;
  onChange: (v: WithdrawAfter) => void;
  disabled?: boolean;
}

export function WithdrawPreference({ value, onChange, disabled }: Props) {
  const name = useId();

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-medium text-ink">
        How soon can you withdraw?
      </legend>
      <p className="text-xs text-muted -mt-1">
        You can change this later in Settings. Changes apply after your current period ends.
      </p>

      <div
        role="radiogroup"
        aria-label="Withdrawal delay"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1"
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "relative cursor-pointer rounded-2xl border p-3.5 transition-colors",
                "focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/40",
                selected
                  ? "bg-brand-tint border-brand"
                  : "bg-white border-[#E5E9EF] hover:border-brand/40 hover:bg-brand-tint/40",
                disabled ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only focus:outline-none"
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-sm font-semibold ${selected ? "text-brand" : "text-ink"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[11px] leading-snug text-muted mt-0.5">
                    {opt.hint}
                  </div>
                </div>
                <span
                  aria-hidden
                  className={[
                    "mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0 transition-colors",
                    selected ? "bg-brand" : "border border-[#C9D2DC] bg-white",
                  ].join(" ")}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}