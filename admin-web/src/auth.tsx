import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { request } from "./api";
import type { User } from "./types";

interface AuthState {
  token: string | null;
  user: User | null;
  login(identifier: string, password: string): Promise<void>;
  register(username: string, email: string, password: string, inviteCode: string): Promise<void>;
  logout(): void;
}

interface AuthResponse {
  data: { access_token: string; user: User };
}

const TOKEN_KEY = "emoji-checker-admin-token";
const USER_KEY = "emoji-checker-admin-user";
const AuthContext = createContext<AuthState | null>(null);

function storedUser(): User | null {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "null") as User | null;
  } catch {
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(storedUser);

  const save = (response: AuthResponse) => {
    if (response.data.user.role !== "ADMIN") throw new Error("此管理端仅允许管理员账号登录");
    sessionStorage.setItem(TOKEN_KEY, response.data.access_token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    setToken(response.data.access_token);
    setUser(response.data.user);
  };

  const value = useMemo<AuthState>(() => ({
    token,
    user,
    async login(identifier, password) {
      save(await request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }));
    },
    async register(username, email, password, inviteCode) {
      save(await request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password, role: "ADMIN", invite_code: inviteCode }),
      }));
    },
    logout() {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth 必须在 AuthProvider 中使用");
  return value;
}
