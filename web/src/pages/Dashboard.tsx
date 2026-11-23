import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { getDashboard, type DashboardSummary } from "../lib/wallet";
import { useMinLoading } from "../hooks/useMinLoading";
import { HeroCard } from "../components/dashboard/HeroCard";
import { WithdrawalBanner } from "../components/dashboard/WithdrawalBanner";
import { GoalCard } from "../components/dashboard/GoalCard";
import { ActivityItem } from "../components/dashboard/ActivityItem";
import { DepositModal } from "../components/deposit/DepositModal";
import { WithdrawModal } from "../components/withdraw/WithdrawModal";

export function Dashboard() {
  const user = useAuth((s) => s.user);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstFetchDone, setFirstFetchDone] = useState(false);
  const { loading, start, stop } = useMinLoading(500);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  async function refresh() {
    try {
      const d = await getDashboard();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load your dashboard.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    start();
    getDashboard()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Could not load your dashboard.");
      })
      .finally(() => {
        if (!cancelled) {
          stop();
          setFirstFetchDone(true);
        }
      });
    return () => { cancelled = true; };
  }, [start, stop]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.first_name || "there";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  if (!firstFetchDone) {
    return <div className="min-h-[200px]" />;
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E9EF] p-6 text-center animate-fade-up">
        <p className="text-sm text-muted">{error ?? "Something went wrong."}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 h-10 px-4 rounded-xl bg-brand text-white text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const canWithdraw = data.goals.some((g) => g.balance > 0) && data.totals.available > 0;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <h1 className="text-2xl font-semibold text-ink">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted mt-1">
          Your savings are safe and growing steadily.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <HeroCard
            totalSaved={data.totals.total_saved}
            available={data.totals.available}
            pending={data.totals.pending}
            pendingReleaseAt={data.next_release_at}
            onSave={() => setDepositOpen(true)}
            onWithdraw={() => canWithdraw && setWithdrawOpen(true)}
          />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <WithdrawalBanner withdrawAfter={data.withdraw_after} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <section
          className="bg-white rounded-2xl border border-[#E5E9EF] p-5 animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          <header className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">Your goals</h2>
          </header>
          {data.goals.length === 0 ? (
            <p className="text-sm text-muted">You haven't created any goals yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.goals.map((g, i) => (
                <div
                  key={g.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${240 + i * 60}ms` }}
                >
                  <GoalCard goal={g} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="bg-white rounded-2xl border border-[#E5E9EF] p-5 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <header className="mb-2">
            <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
          </header>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <div className="divide-y divide-[#E5E9EF]">
              {data.recent.map((t, i) => (
                <div
                  key={t.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${300 + i * 40}ms` }}
                >
                  <ActivityItem tx={t} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => { refresh(); }}
        goals={data.goals}
      />

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={() => { refresh(); }}
        goals={data.goals}
        available={data.totals.available}
        withdrawAfter={data.withdraw_after}
      />
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E5E9EF] rounded-lg ${className}`} />;
}