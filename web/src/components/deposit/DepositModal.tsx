import { useEffect, useMemo, useState } from "react";
import { Field } from "../auth/Field";
import { Button } from "../ui/Button";
import { ModalShell } from "../ui/ModalShell";
import {
  createDeposit,
  getTransaction,
  type Goal,
  type DepositResponse,
} from "../../lib/wallet";
import { fieldErrors } from "../../lib/api";
import { formatKes } from "../../lib/format";

const QUICK_AMOUNTS = [500, 1000, 5000];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goals: Goal[];
  defaultGoalId?: string;
}

type Phase = "form" | "polling" | "success" | "failed";

export function DepositModal({ open, onClose, onSuccess, goals, defaultGoalId }: Props) {
  const [goalId, setGoalId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pollingMessage, setPollingMessage] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setAmount("");
    setErrors({});
    setPendingTxId(null);
    setPollingMessage("");
    const initialGoal =
      defaultGoalId ??
      goals.find((g) => g.is_default)?.id ??
      goals[0]?.id ??
      "";
    setGoalId(initialGoal);
  }, [open, defaultGoalId, goals]);

  useEffect(() => {
    if (phase !== "polling" || !pendingTxId) return;
    let cancelled = false;
    const start = Date.now();
    const tick = async () => {
      if (cancelled) return;
      try {
        const tx = await getTransaction(pendingTxId);
        if (cancelled) return;
        if (tx.status === "received") {
          setPhase("success");
          window.setTimeout(() => {
            onSuccess();
            onClose();
          }, 1200);
          return;
        }
        if (tx.status === "failed") {
          setPhase("failed");
          return;
        }
        if (Date.now() - start > 90_000) {
          setPollingMessage("This is taking longer than usual. Check Activity later.");
        }
      } catch {
        // network hiccup — keep polling
      }
      if (!cancelled) window.setTimeout(tick, 3000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [phase, pendingTxId, onSuccess, onClose]);

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === goalId),
    [goals, goalId]
  );

  // Remaining room in the goal (null = uncapped)
  const remaining = useMemo(() => {
    if (!selectedGoal || selectedGoal.target_amount == null) return null;
    return Math.max(0, selectedGoal.target_amount - selectedGoal.balance);
  }, [selectedGoal]);

  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount >= 1;
  const withinGoalLimit = remaining === null || numericAmount <= remaining;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!goalId) return setErrors({ __form: "Choose a goal." });
    if (!validAmount) return setErrors({ amount: "Enter an amount of at least KES 1." });
    if (!withinGoalLimit) {
      return setErrors({
        amount: `This goal has ${formatKes(remaining ?? 0)} left before reaching its target.`,
      });
    }

    setErrors({});
    const idempotencyKey = crypto.randomUUID();

    try {
      const res: DepositResponse = await createDeposit(
        goalId,
        numericAmount,
        idempotencyKey
      );
      if (res.status === "received") {
        setPhase("success");
        window.setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } else if (res.status === "pending") {
        setPendingTxId(res.transaction_id);
        setPollingMessage("Check your phone and enter your M-PESA PIN.");
        setPhase("polling");
      } else {
        setPhase("failed");
      }
    } catch (err) {
      setErrors(fieldErrors(err));
    }
  }

  const canDismiss = phase === "form" || phase === "failed" || phase === "success";

  return (
    <ModalShell open={open} onClose={onClose} closeOnBackdrop={canDismiss}>
      {phase === "form" && (
        <>
          <h2 className="text-lg font-semibold text-ink">Save money</h2>
          <p className="text-sm text-muted mt-1">Add money to one of your goals.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {errors.__form && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
                {errors.__form}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Deposit to</label>
              <div className="grid grid-cols-1 gap-2">
                {goals.map((g) => {
                  const selected = goalId === g.id;
                  const goalRemaining =
                    g.target_amount != null
                      ? Math.max(0, g.target_amount - g.balance)
                      : null;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoalId(g.id)}
                      className={[
                        "text-left rounded-xl border px-3.5 py-2.5 transition-colors",
                        selected
                          ? "bg-brand-tint border-brand"
                          : "bg-white border-[#E5E9EF] hover:border-brand/40",
                      ].join(" ")}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className={`text-sm font-semibold ${selected ? "text-brand" : "text-ink"}`}>
                          {g.name}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {formatKes(g.balance)}
                        </span>
                      </div>
                      {goalRemaining !== null && (
                        <div className="text-[11px] text-muted mt-0.5">
                          {goalRemaining > 0
                            ? `${formatKes(goalRemaining)} left to reach target`
                            : "Target reached"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Amount (KES)
              </label>
              <div className="flex gap-2 mb-2">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className={[
                      "flex-1 h-9 rounded-lg text-xs font-semibold transition-colors",
                      amount === String(v)
                        ? "bg-brand-tint text-brand"
                        : "bg-white border border-[#E5E9EF] text-muted hover:text-ink",
                    ].join(" ")}
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
              <Field
                label=""
                name="amount"
                type="number"
                inputMode="numeric"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
              {remaining !== null && (
                <p className="text-[11px] text-muted mt-1">
                  Up to {formatKes(remaining)} available for this goal.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={onClose} fullWidth>
                Cancel
              </Button>
              <Button type="submit" fullWidth disabled={!withinGoalLimit}>
                Confirm deposit
              </Button>
            </div>
          </form>
        </>
      )}

      {phase === "polling" && (
        <div className="text-center py-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-brand-tint grid place-items-center mb-4">
            <span className="h-5 w-5 rounded-full border-2 border-brand/40 border-t-brand animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-ink">Waiting for confirmation</h2>
          <p className="text-sm text-muted mt-2 max-w-xs mx-auto">{pollingMessage}</p>
          <p className="text-xs text-muted mt-4">
            You can close this — the deposit will still complete.
          </p>
          <Button variant="ghost" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      )}

      {phase === "success" && (
        <div className="text-center py-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-brand-tint grid place-items-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#0E4F55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink">Deposit received</h2>
          <p className="text-sm text-muted mt-1">
            {formatKes(numericAmount)} added to {selectedGoal?.name ?? "your goal"}.
          </p>
        </div>
      )}

      {phase === "failed" && (
        <div className="text-center py-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-red-50 grid place-items-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6l-6 6-6 6" stroke="#B42318" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink">Deposit didn't go through</h2>
          <p className="text-sm text-muted mt-1">
            Nothing was charged. Try again or use a different method.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="ghost" onClick={onClose} fullWidth>
              Close
            </Button>
            <Button onClick={() => setPhase("form")} fullWidth>
              Try again
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}