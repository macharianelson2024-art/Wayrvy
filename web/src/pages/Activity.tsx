import { useEffect, useRef, useState } from "react";
import { listTransactions, type Transaction } from "../lib/wallet";
import { ActivityItem } from "../components/dashboard/ActivityItem";
import { useMinLoading } from "../hooks/useMinLoading";

type Filter = "all" | "deposit" | "withdrawal";

export function Activity() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [firstFetchDone, setFirstFetchDone] = useState(false);

  const { loading, start, stop } = useMinLoading(500);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isFirstRender = useRef(true);

  async function fetchFirstPage(f: Filter, opts: { useSkeleton: boolean }) {
    if (opts.useSkeleton) start();
    else setRefreshing(true);

    try {
      const data = await listTransactions(f === "all" ? undefined : f);
      setItems(data.results);
      setNextPage(data.next);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load activity.");
    } finally {
      if (opts.useSkeleton) stop();
      else setRefreshing(false);
      setFirstFetchDone(true);
    }
  }

  useEffect(() => {
    fetchFirstPage("all", { useSkeleton: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchFirstPage(filter, { useSkeleton: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadMore() {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(nextPage, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load more.");
      const data = await res.json();
      setItems((prev) => [...prev, ...data.results]);
      setNextPage(data.next);
    } catch (e: any) {
      setError(e?.message ?? "Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "deposit", label: "Deposits" },
    { key: "withdrawal", label: "Withdrawals" },
  ];

  // 1. First-load skeleton (only ever once per session)
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-[#E5E9EF] rounded-lg animate-pulse" />
        <div className="h-10 w-72 bg-[#E5E9EF] rounded-full animate-pulse" />
        <div className="bg-white rounded-2xl border border-[#E5E9EF] p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-[#E5E9EF] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 2. First fetch not done yet — render nothing (no empty-state flash)
  if (!firstFetchDone) {
    return <div className="min-h-[200px]" />;
  }

  // 3. Fetch failed with no data
  if (error && items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E9EF] p-6 text-center animate-fade-up">
        <p className="text-sm text-muted">{error}</p>
        <button
          onClick={() => fetchFirstPage(filter, { useSkeleton: true })}
          className="mt-4 h-10 px-4 rounded-xl bg-brand text-white text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <h1 className="text-2xl font-semibold text-ink">Activity</h1>
        <p className="text-sm text-muted mt-1">
          Every transaction, recorded and confirmed by M-PESA.
        </p>
      </header>

      <div
        className="inline-flex items-center gap-1 bg-white rounded-full p-1 border border-[#E5E9EF] animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            disabled={refreshing}
            className={[
              "px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-60",
              filter === t.key
                ? "bg-brand-tint text-brand"
                : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-[#E5E9EF] p-10 text-center animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-sm text-muted">
            {filter === "all"
              ? "No transactions yet."
              : filter === "deposit"
              ? "No deposits yet."
              : "No withdrawals yet."}
          </p>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border border-[#E5E9EF] p-5"
          style={{
            opacity: refreshing ? 0.5 : 1,
            transition: "opacity 200ms ease-out",
          }}
        >
          <div key={filter} className="divide-y divide-[#E5E9EF]">
            {items.map((t, i) => (
              <div
                key={t.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <ActivityItem tx={t} />
              </div>
            ))}
          </div>

          {nextPage && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="h-10 px-5 rounded-xl border border-[#E5E9EF] text-sm font-semibold text-ink hover:bg-surface disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}