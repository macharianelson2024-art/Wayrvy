import { Button } from "../ui/Button";
import { ModalShell } from "../ui/ModalShell";
import type { Goal } from "../../lib/wallet";
import { formatKes } from "../../lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  goal: Goal | null;
  archiving?: boolean;
}

export function ArchiveGoalModal({ open, onClose, onConfirm, goal, archiving = false }: Props) {
  return (
    <ModalShell open={open} onClose={archiving ? () => {} : onClose}>
      <h2 className="text-lg font-semibold text-ink">Archive this goal?</h2>
      <p className="text-sm text-muted mt-1">
        <span className="font-semibold text-ink">{goal?.name ?? "This goal"}</span>{" "}
        will be hidden from your goals list.
      </p>

      <div className="mt-5 rounded-xl bg-surface border border-[#E5E9EF] p-4 space-y-3">
        <Row
          icon={<CheckIcon />}
          title="Your money stays safe"
          body={
            goal
              ? `${formatKes(goal.balance)} remains in this goal. Archiving doesn't move or withdraw anything.`
              : "Nothing is moved or withdrawn. Your balance stays where it is."
          }
        />
        <Row
          icon={<CheckIcon />}
          title="All history is kept"
          body="Every deposit and withdrawal stays in your activity feed forever."
        />
        <Row
          icon={<CheckIcon />}
          title="The name is freed up"
          body="You can create a new goal with the same name right away."
        />
        <Row
          icon={<WarnIcon />}
          title="You can't undo this yet"
          body="There's no way to bring an archived goal back from the app. Contact support if you need it restored."
          tone="warning"
        />
      </div>

      <div className="mt-5 flex gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={archiving} fullWidth>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          loading={archiving}
          fullWidth
          className="!bg-[#B42318] hover:!bg-[#8F1D14]"
        >
          Archive goal
        </Button>
      </div>
    </ModalShell>
  );
}

function Row({
  icon,
  title,
  body,
  tone = "brand",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: "brand" | "warning";
}) {
  const iconBg = tone === "warning" ? "bg-[#FEF3F2]" : "bg-brand-tint";
  return (
    <div className="flex gap-3">
      <div className={`h-7 w-7 rounded-full ${iconBg} grid place-items-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink leading-tight">{title}</div>
        <div className="text-[12px] text-muted leading-snug mt-0.5">{body}</div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke="#0E4F55" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v5M12 16.5v.01" stroke="#B42318" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.8-3l-7.9-13.6a2 2 0 0 0-3.4 0Z" stroke="#B42318" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}