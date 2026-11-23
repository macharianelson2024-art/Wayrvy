import { api } from "./api";

export type WithdrawAfter = 24 | 168 | 720;

export interface User {
  id: string;
  phone: string;
  first_name: string;
  second_name: string;
  email: string;
  withdraw_after: WithdrawAfter;
}

export interface AuthResponse {
  access: string;
  user: User;
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/login/?client=web", {
    method: "POST",
    body: { phone, password },
  });
}

export interface SignupPayload {
  phone: string;
  first_name: string;
  second_name: string;
  email: string;
  password: string;
  withdraw_after: WithdrawAfter;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/signup/?client=web", {
    method: "POST",
    body: payload,
  });
}

export async function refreshSession(): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/refresh/", { method: "POST" });
}

export async function logout(): Promise<void> {
  await api("/auth/logout/?client=web", { method: "POST" });
}

export interface UpdateMePayload {
  first_name?: string;
  second_name?: string;
  withdraw_after?: 24 | 168 | 720;
}

export async function updateMe(payload: UpdateMePayload): Promise<User> {
  return api<User>("/me/", { method: "PATCH", body: payload, auth: true });
}