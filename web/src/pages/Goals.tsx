import { useEffect, useRef, useState } from "react";
import { listGoals, archiveGoal, type Goal } from "../lib/wallet";
import { GoalCardWithActions } from "../components/goals/GoalCardWithActions";
import { GoalFormModal } from "../components/goals/GoalFormModal";
import { ArchiveGoalModal } from "../components/goals/ArchiveGoalModal";
import { Button } from "../components/ui/Button";
import { useMinLoading } from "../hooks/useMinLoading";

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { loading, start, stop } = useMinLoading(500);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const [archivingGoal, setArchivingGoal] = useState<Goal | null>(null);
  const [archiveInFlight, setArchiveInFlight] = useState(false);

  async function refresh(opts: { useSkeleton: boolean }) {
    if (opts.useSkeleton) start();
    try {
      const list = await listGoals();
      setGoals(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load your goals.");
    } finally {
      if (opts.useSkeleton) stop();
    }
  }

  useEffect(() => {
    refresh({ useSkeleton: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setModalOpen(true);
  }

  function requestArchive(goal: Goal) {
    setArchivingGoal(goal);
  }

  async function confirmArchive() {
    if (!archivingGoal) return;
    setArchiveInFlight(true);
    try {
      await archiveGoal(archivingGoal.id);
      setArchivingGoal(null);
      await refresh({ useSkeleton: false });
    } catch (e: any) {
      alert(e?.message ?? "Could not archive this goal. Try again.");
    } finally {
      setArchiveInFlight(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-[#E5E9EF] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-[#E5E9EF] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E9EF] p-6 text-center animate-fade-up">
        <p className="text-sm text-muted">{error}</p>
        <Button onClick={() => refresh({ useSkeleton: true })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header
        className="flex items-start justify-between gap-4 animate-fade-up"
        style={{ animationDelay: "0ms" }}
      >
        <div>
          <h1 className="text-2xl font-semibold text-ink">Goals</h1>
          <p className="text-sm text-muted mt-1 max-w-md">
            Save towards what matters, one deposit at a time.
          </p>
        </div>
        <Button onClick={openCreate}>New goal</Button>
      </header>

      {goals.length === 0 ? (
        <div
          className="bg-white rounded-2xl border border-[#E5E9EF] p-10 text-center animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <p className="text-sm text-muted">You don't have any goals yet.</p>
          <Button onClick={openCreate} className="mt-4">
            Create your first goal
          </Button>
        </div>
      ) : (
        <div
          key={goals.length}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {goals.map((g, i) => (
            <div
              key={g.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(60 + i * 50, 300)}ms` }}
            >
              <GoalCardWithActions
                goal={g}
                onEdit={openEdit}
                onRequestArchive={requestArchive}
              />
            </div>
          ))}
        </div>
      )}

      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => refresh({ useSkeleton: false })}
        goal={editing}
      />

      <ArchiveGoalModal
        open={!!archivingGoal}
        goal={archivingGoal}
        archiving={archiveInFlight}
        onClose={() => { if (!archiveInFlight) setArchivingGoal(null); }}
        onConfirm={confirmArchive}
      />
    </div>
  );
}