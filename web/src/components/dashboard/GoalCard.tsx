import type { Goal } from "../../lib/wallet";
import { formatKes } from "../../lib/format";

export function GoalCard({ goal }: { goal: Goal }) {
  const pct = goal.target_amount && goal.target_amount > 0
    ? Math.min(100, Math.round((goal.balance / goal.target_amount) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E9EF] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-ink text-sm">{goal.name}</div>
          <div className="text-[11px] text-muted mt-0.5">
            {goal.target_amount ? `${formatKes(goal.balance)} of ${formatKes(goal.target_amount)}` : formatKes(goal.balance)}
          </div>
        </div>
        <div className="text-sm font-semibold text-brand tabular-nums">{pct}%</div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-[#E5E9EF] overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}