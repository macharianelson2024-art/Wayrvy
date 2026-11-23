import { useState, useEffect } from "react";
import { Field } from "../auth/Field";
import { Button } from "../ui/Button";
import { ModalShell } from "../ui/ModalShell";
import {
  createGoal,
  updateGoal,
  type Goal,
  type CreateGoalPayload,
} from "../../lib/wallet";
import { fieldErrors } from "../../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (goal: Goal) => void;
  goal?: Goal | null;
}

export function GoalFormModal({ open, onClose, onSaved, goal }: Props) {
  const isEdit = !!goal;

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(goal?.name ?? "");
      setTarget(goal?.target_amount ? String(goal.target_amount) : "");
      setDate(goal?.target_date ?? "");
      setErrors({});
    }
  }, [open, goal]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const payload: CreateGoalPayload = {
      name: name.trim(),
      target_amount: target ? Number(target) : null,
      target_date: date || null,
    };

    try {
      const saved = isEdit
        ? await updateGoal(goal!.id, payload)
        : await createGoal(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-ink">
        {isEdit ? "Edit goal" : "New goal"}
      </h2>
      <p className="text-sm text-muted mt-1">
        {isEdit ? "Update the details for this goal." : "What are you saving towards?"}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {errors.__form && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
            {errors.__form}
          </div>
        )}

        <Field
          label="Goal name"
          name="name"
          placeholder="e.g. Laptop, Trip to Zanzibar"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
        />

        <Field
          label="Target amount (KES, optional)"
          name="target_amount"
          type="number"
          inputMode="numeric"
          placeholder="50000"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target_amount}
          hint="Leave empty for no specific target."
        />

        <Field
          label="Target date (optional)"
          name="target_date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.target_date}
          hint="Leave empty for no deadline."
        />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {isEdit ? "Save changes" : "Create goal"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}