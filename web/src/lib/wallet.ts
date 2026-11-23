import { api } from "./api";

export type TransactionKind = "deposit" | "withdrawal";
export type TransactionStatus = "received" | "pending" | "released" | "failed";

export interface Goal {
  id: string;
  name: string;
  target_amount: number | null;
  target_date: string | null;
  is_default: boolean;
  balance: number;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  status: TransactionStatus;
  amount: number;
  fee: number;
  goal_name: string;
  release_at: string | null;
  created_at: string;
}

export interface DashboardSummary {
  totals: {
    total_saved: number;
    available: number;
    pending: number;
  };
  withdraw_after: 24 | 168 | 720;
  next_release_at: string | null;
  goals: Goal[];
  recent: Transaction[];
}

export interface PaginatedTransactions {
  count: number;
  next: string | null;
  previous: string | null;
  results: Transaction[];
}

export interface CreateGoalPayload {
  name: string;
  target_amount?: number | null;
  target_date?: string | null;
}

export async function getDashboard(): Promise<DashboardSummary> {
  return api<DashboardSummary>("/dashboard/", { method: "GET", auth: true });
}

export async function listGoals(): Promise<Goal[]> {
  return api<Goal[]>("/goals/", { method: "GET", auth: true });
}

export async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
  return api<Goal>("/goals/", { method: "POST", body: payload, auth: true });
}

export async function updateGoal(
  id: string,
  payload: Partial<CreateGoalPayload>
): Promise<Goal> {
  return api<Goal>(`/goals/${id}/`, { method: "PATCH", body: payload, auth: true });
}

export async function archiveGoal(id: string): Promise<void> {
  await api(`/goals/${id}/archive/`, { method: "POST", auth: true });
}

export async function listTransactions(
  kind?: "deposit" | "withdrawal"
): Promise<PaginatedTransactions> {
  const q = kind ? `?kind=${kind}` : "";
  return api<PaginatedTransactions>(`/transactions/${q}`, {
    method: "GET",
    auth: true,
  });
}

export async function getTransaction(id: string): Promise<Transaction> {
  return api<Transaction>(`/transactions/${id}/`, { method: "GET", auth: true });
}

// -------- Deposits & Withdrawals --------

export interface DepositResponse {
  transaction_id: string;
  status: TransactionStatus;
  message?: string;
}

export interface WithdrawResponse {
  transaction_id: string;
  status: TransactionStatus;
  release_at?: string | null;
  message?: string;
}

export async function createDeposit(
  goalId: string,
  amount: number,
  idempotencyKey: string
): Promise<DepositResponse> {
  return api<DepositResponse>("/deposits/", {
    method: "POST",
    auth: true,
    body: { goal_id: goalId, amount, idempotency_key: idempotencyKey },
  });
}

export async function createWithdrawal(
  goalId: string,
  amount: number,
  password: string,
  idempotencyKey: string
): Promise<WithdrawResponse> {
  return api<WithdrawResponse>("/withdrawals/", {
    method: "POST",
    auth: true,
    body: {
      goal_id: goalId,
      amount,
      password,
      idempotency_key: idempotencyKey,
    },
  });
}