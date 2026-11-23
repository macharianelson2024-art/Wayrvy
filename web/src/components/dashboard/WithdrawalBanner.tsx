import { withdrawDaysLabel } from "../../lib/format";

export function WithdrawalBanner({ withdrawAfter }: { withdrawAfter: 24 | 168 | 720 }) {
  return (
    <div className="rounded-2xl bg-pending-tint border border-pending/15 px-4 py-3 flex items-start gap-3">
      <div className="h-5 w-5 rounded-full bg-pending/10 grid place-items-center shrink-0 mt-0.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#3F49B8" strokeWidth="2" />
          <path d="M12 7v5l3 2" stroke="#3F49B8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-sm">
        <span className="font-semibold text-pending">Withdrawals arrive after {withdrawDaysLabel(withdrawAfter)}.</span>
        <span className="text-muted"> You can change this in Settings.</span>
      </div>
    </div>
  );
}