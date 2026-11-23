import { formatKes } from "../../lib/format";

interface Props {
  totalSaved: number;
  available: number;
  pending: number;
  pendingReleaseAt: string | null;
  onSave: () => void;
  onWithdraw: () => void;
}

export function HeroCard({ totalSaved, available, pending, pendingReleaseAt, onSave, onWithdraw }: Props) {
  return (
    <div className="rounded-2xl bg-brand text-white p-6 sm:p-8">
      <div className="text-xs uppercase tracking-wide text-white/60">Total saved</div>
      <div className="mt-1 text-3xl sm:text-4xl font-semibold tabular-nums">
        {formatKes(totalSaved)}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 max-w-sm">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/50">Available</div>
          <div className="text-sm font-semibold tabular-nums">{formatKes(available)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/50">
            {pendingReleaseAt ? "Withdrawing" : "Pending"}
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {formatKes(pending)}
          </div>
          {pendingReleaseAt && (
            <div className="text-[10px] text-white/60 mt-0.5">
              releases {new Date(pendingReleaseAt).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSave}
          className="h-10 px-5 rounded-xl bg-white text-brand font-semibold text-sm hover:bg-white/90 transition"
        >
          Save money
        </button>
        <button
          onClick={onWithdraw}
          className="h-10 px-5 rounded-xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}