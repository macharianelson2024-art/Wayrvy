import { useState } from "react";
import { useAuth } from "../store/auth";
import { updateMe } from "../lib/auth";
import { WithdrawPreference } from "../components/auth/WithdrawPreference";
import { Button } from "../components/ui/Button";
import type { WithdrawAfter } from "../lib/auth";

export function Settings() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);

  const [withdrawAfter, setWithdrawAfter] = useState<WithdrawAfter>(
    user?.withdraw_after ?? 24
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const dirty = user?.withdraw_after !== withdrawAfter;

  async function savePreference() {
    setSaving(true);
    try {
      const updated = await updateMe({ withdraw_after: withdrawAfter });
      setUser(updated);
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2500);
    } catch {
      alert("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  if (!user) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      <header className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Manage your account and withdrawal preferences.
        </p>
      </header>

      <section
        className="bg-white rounded-2xl border border-[#E5E9EF] p-5 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <h2 className="text-sm font-semibold text-ink mb-1">Withdrawal delay</h2>
        <p className="text-xs text-muted mb-4">
          How long after you tap Withdraw before money reaches your M-PESA.
        </p>

        <WithdrawPreference value={withdrawAfter} onChange={setWithdrawAfter} />

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={savePreference} disabled={!dirty} loading={saving}>
            Save preference
          </Button>
          {savedAt && (
            <span className="text-xs text-brand font-semibold">Saved</span>
          )}
        </div>

        {dirty && (
          <p className="mt-3 text-[11px] text-muted">
            Changes apply after your current period ends.
          </p>
        )}
      </section>

      <section
        className="bg-white rounded-2xl border border-[#E5E9EF] p-5 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="text-sm font-semibold text-ink mb-1">M-PESA number</h2>
        <p className="text-xs text-muted mb-4">
          Withdrawals are only paid to this number.
        </p>
        <div className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
          <span className="font-semibold text-sm text-ink tabular-nums">
            {user.phone}
          </span>
          <span className="text-[11px] text-muted">Locked</span>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          To change your number, contact support.
        </p>
      </section>

      <section
        className="bg-white rounded-2xl border border-[#E5E9EF] p-5 animate-fade-up"
        style={{ animationDelay: "180ms" }}
      >
        <h2 className="text-sm font-semibold text-ink mb-1">Account</h2>
        <p className="text-xs text-muted mb-4">
          Signed in as {user.first_name} {user.second_name} · {user.email}
        </p>
        <Button
          variant="secondary"
          onClick={handleLogout}
          loading={loggingOut}
        >
          Log out
        </Button>
      </section>
    </div>
  );
}