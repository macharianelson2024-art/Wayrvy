import type { Transaction } from "../../lib/wallet";
import { formatKesSigned, relativeDate } from "../../lib/format";

export function ActivityItem({ tx }: { tx: Transaction }) {
  const isDeposit = tx.kind === "deposit";

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink truncate">
          {isDeposit ? "Deposit to" : "Withdrawal from"} {tx.goal_name}
        </div>
        <div className="text-[11px] text-muted mt-0.5">{relativeDate(tx.created_at)}</div>
      </div>

      <div className="text-right shrink-0">
        <div
          className={`text-sm font-semibold tabular-nums ${
            isDeposit ? "text-brand" : "text-ink"
          }`}
        >
          {formatKesSigned(tx.amount, tx.kind)}
        </div>
        <StatusPill tx={tx} />
      </div>
    </div>
  );
}

function StatusPill({ tx }: { tx: Transaction }) {
  if (tx.status === "received") {
    return (
      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-tint text-brand">
        Received
      </span>
    );
  }
  if (tx.status === "pending") {
    return (
      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pending-tint text-pending">
        Releases {tx.release_at ? relativeDate(tx.release_at) : "soon"}
      </span>
    );
  }
  if (tx.status === "released") {
    return (
      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-tint text-brand">
        Released
      </span>
    );
  }
  return (
    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
      Failed
    </span>
  );
}