import { config } from "./config";

const BASE = config.apiUrl;

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any, message?: string) {
    super(message ?? "Request failed");
    this.status = status;
    this.data = data;
  }
}

let refreshing: Promise<string | null> | null = null;
let onRefreshed: ((token: string | null) => void) | null = null;

export function registerRefreshHandler(fn: (token: string | null) => void) {
  onRefreshed = fn;
}

async function attemptRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const access: string | null = data?.access ?? null;
    if (onRefreshed) onRefreshed(access);
    return access;
  } catch {
    return null;
  }
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  _retried?: boolean;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, auth, headers, _retried, ...rest } = opts;
  const token = auth ? localStorage.getItem("wayrvy.access") : null;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried) {
    if (!refreshing) refreshing = attemptRefresh().finally(() => { refreshing = null; });
    const newAccess = await refreshing;
    if (newAccess) return api<T>(path, { ...opts, _retried: true });
    throw new ApiError(401, null, "Session expired");
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data, data?.detail ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    for (const [k, v] of Object.entries(err.data)) {
      if (k === "detail" || k === "non_field_errors") {
        out.__form = Array.isArray(v) ? v.join(" ") : String(v);
      } else {
        out[k] = Array.isArray(v) ? String(v[0]) : String(v);
      }
    }
  } else if (err instanceof Error) {
    out.__form = err.message;
  } else {
    out.__form = "Something went wrong. Please try again.";
  }
  return out;
}