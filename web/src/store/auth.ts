import { create } from "zustand";
import type { AuthResponse, User } from "../lib/auth";
import { refreshSession, logout as logoutApi } from "../lib/auth";
import { registerRefreshHandler } from "../lib/api";
import { resetShimmer } from "../hooks/useMinLoading";

interface AuthState {
  user: User | null;
  access: string | null;
  hydrated: boolean;
  setSession: (payload: AuthResponse) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  access: null,
  hydrated: false,

  setSession: ({ access, user }) => {
    localStorage.setItem("wayrvy.access", access);
    localStorage.setItem("wayrvy.user", JSON.stringify(user));
    set({ access, user });
  },

  setUser: (user) => {
    localStorage.setItem("wayrvy.user", JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    try {
      resetShimmer()
      await logoutApi();
    } catch {
      // swallow — best effort
    }
    localStorage.removeItem("wayrvy.access");
    localStorage.removeItem("wayrvy.user");
    set({ access: null, user: null });
  },

  hydrate: async () => {
    try {
      const res = await refreshSession();
      localStorage.setItem("wayrvy.access", res.access);
      localStorage.setItem("wayrvy.user", JSON.stringify(res.user));
      set({ access: res.access, user: res.user, hydrated: true });
    } catch {
      localStorage.removeItem("wayrvy.access");
      localStorage.removeItem("wayrvy.user");
      set({ access: null, user: null, hydrated: true });
    }
  },
}));

registerRefreshHandler((token) => {
  if (token) {
    localStorage.setItem("wayrvy.access", token);
    useAuth.setState({ access: token });
  } else {
    localStorage.removeItem("wayrvy.access");
    useAuth.setState({ access: null, user: null });
  }
});