import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminUser } from "../lib/api";
import { adminMe } from "../lib/api";

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

type AuthState = {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  checked: boolean;
};

type AuthContextValue = AuthState & {
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  setUser: (user: AdminUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    loading: true,
    checked: false,
  });

  const login = useCallback((token: string, user: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({
      user,
      token,
      loading: false,
      checked: true,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({
      user: null,
      token: null,
      loading: false,
      checked: true,
    });
  }, []);

  const setUser = useCallback((user: AdminUser | null) => {
    setState((prev) => ({ ...prev, user }));
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  useEffect(() => {
    if (!state.token) {
      setState((prev) => ({ ...prev, loading: false, checked: true }));
      return;
    }
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as AdminUser;
        setState((prev) => ({ ...prev, user }));
      } catch {
        // ignore
      }
    }
    adminMe()
      .then(({ user }) => {
        setState((prev) => ({
          ...prev,
          user,
          loading: false,
          checked: true,
        }));
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
      .catch(() => {
        logout();
      });
  }, [state.token, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setUser,
    }),
    [state, login, logout, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
