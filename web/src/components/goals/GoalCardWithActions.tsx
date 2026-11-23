import { useState } from "react";
import type { Goal } from "../../lib/wallet";
import { formatKes } from "../../lib/format";

interface Props {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onRequestArchive: (goal: Goal) => void;
}

export function GoalCardWithActions({ goal, onEdit, onRequestArchive }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const pct = goal.target_amount && goal.target_amount > 0
    ? Math.min(100, Math.round((goal.balance / goal.target_amount) * 100))
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E9EF] p-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-ink text-sm truncate">{goal.name}</div>
            {goal.is_default && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-tint text-brand">
                Default
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {goal.target_amount
              ? `${formatKes(goal.balance)} of ${formatKes(goal.target_amount)}`
              : formatKes(goal.balance)}
            {goal.target_date && ` · by ${goal.target_date}`}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="text-sm font-semibold text-brand tabular-nums">{pct}%</div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-8 w-8 rounded-lg hover:bg-surface grid place-items-center"
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.6" fill="#51657A" />
              <circle cx="12" cy="12" r="1.6" fill="#51657A" />
              <circle cx="12" cy="19" r="1.6" fill="#51657A" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-[#E5E9EF] overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute right-3 top-12 bg-white border border-[#E5E9EF] rounded-xl shadow-lg py-1 z-20 min-w-[160px]">
            <button
              onClick={() => { setMenuOpen(false); onEdit(goal); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface"
            >
              Edit
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onRequestArchive(goal);
              }}
              disabled={goal.is_default}
              title={goal.is_default ? "The default goal can't be archived" : "Hide from your goals list. All history is kept."}
              className="w-full text-left px-3 py-2 text-sm text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Archive
            </button>
          </div>
        </>
      )}
    </div>
  );
}