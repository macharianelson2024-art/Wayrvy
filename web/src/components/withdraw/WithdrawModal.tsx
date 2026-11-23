import { useEffect, useMemo, useState } from "react";
import { Field } from "../auth/Field";
import { PasswordField } from "../auth/PasswordField";
import { Button } from "../ui/Button";
import { ModalShell } from "../ui/ModalShell";
import {
  createWithdrawal,
  type Goal,
  type WithdrawResponse,
} from "../../lib/wallet";
import { fieldErrors } from "../../lib/api";
import { formatKes } from "../../lib/format";

const QUICK_AMOUNTS = [500, 1000, 5000];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goals: Goal[];
  available: number;
  withdrawAfter: 24 | 168 | 720;
}

type Phase = "form" | "success" | "failed";

function withdrawalLabel(hours: 24 | 168 | 720): string {
  if (hours === 24) return "within 24 hours";
  if (hours === 168) return "in about 7 days";
  return "in about 30 days";
}

export function WithdrawModal({
  open,
  onClose,
  onSuccess,
  goals,
  available,
  withdrawAfter,
}: Props) {
  const [goalId, setGoalId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("form");

  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setAmount("");
    setPassword("");
    setErrors({});
    const initialGoal = goals.find((g) => g.is_default)?.id ?? goals[0]?.id ?? "";
    setGoalId(initialGoal);
  }, [open, goals]);

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === goalId),
    [goals, goalId]
  );

  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount >= 1;
  const withinBalance = numericAmount <= available;
  const instantFee = Math.round(numericAmount * 0.1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!goalId) return setErrors({ __form: "Choose a goal." });
    if (!validAmount) return setErrors({ amount: "Enter an amount of at least KES 1." });
    if (!withinBalance) return setErrors({ amount: "Amount exceeds available balance." });
    if (!password) return setErrors({ password: "Enter your password to confirm." });

    setErrors({});
    const idempotencyKey = crypto.randomUUID();

    try {
      const res: WithdrawResponse = await createWithdrawal(
        goalId,
        numericAmount,
        password,
        idempotencyKey
      );
      if (res.status === "pending" || res.status === "released") {
        setPhase("success");
        window.setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setPhase("failed");
      }
    } catch (err) {
      setErrors(fieldErrors(err));
    }
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      {phase === "form" && (
        <>
          <h2 className="text-lg font-semibold text-ink">Withdraw</h2>
          <p className="text-sm text-muted mt-1">
            Withdrawals reach your M-PESA {withdrawalLabel(withdrawAfter)}.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {errors.__form && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
                {errors.__form}
              </div>
            )}

            <div className="rounded-xl bg-surface px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-muted">
                Available to withdraw
              </div>
              <div className="text-lg font-semibold text-ink tabular-nums mt-0.5">
                {formatKes(available)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">From goal</label>
              <div className="grid grid-cols-1 gap-2">
                {goals.map((g) => {
                  const selected = goalId === g.id;
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
            </div>

            <PasswordField
              label="Confirm with your password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <div className="text-[11px] text-muted">
              Fee: {formatKes(0)} if you wait, {formatKes(instantFee)} for instant withdrawal.
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={onClose} fullWidth>
                Cancel
              </Button>
              <Button type="submit" fullWidth>
                Confirm withdrawal
              </Button>
            </div>
          </form>
        </>
      )}

      {phase === "success" && (
        <div className="text-center py-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-pending-tint grid place-items-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#3F49B8" strokeWidth="2" />
              <path d="M12 7v5l3 2" stroke="#3F49B8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink">Withdrawal queued</h2>
          <p className="text-sm text-muted mt-1">
            {formatKes(numericAmount)} from {selectedGoal?.name ?? "your goal"} will arrive{" "}
            {withdrawalLabel(withdrawAfter)}.
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
          <h2 className="text-lg font-semibold text-ink">Withdrawal didn't go through</h2>
          <p className="text-sm text-muted mt-1">Nothing was deducted. Try again.</p>
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