import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type ChangePasswordInput, type LoginInput, type RegisterInput } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { ApiError, isAbortError } from '../api/errors';
import type { User, UserRole } from '../api/types';
import { tokenStore } from '../auth/tokenStore';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function homePathFor(role: UserRole): string {
  if (role === 'STUDENT') return '/student';
  if (role === 'TEACHER') return '/teacher';
  return '/admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
      setStatus('anonymous');
    });

    const controller = new AbortController();
    let active = true;

    const token = tokenStore.get();
    if (!token) {
      setStatus('anonymous');
      return () => {
        active = false;
        controller.abort();
        setUnauthorizedHandler(null);
      };
    }

    authApi
      .me(controller.signal)
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch((error) => {
        if (!active || isAbortError(error)) return;
        // 仅令牌确实失效时清除；网络暂时不可用时保留令牌以便恢复后重试。
        if (error instanceof ApiError && error.status === 401) tokenStore.clear();
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
      controller.abort();
      setUnauthorizedHandler(null);
    };
  }, []);

  const applyAuth = useCallback((token: string, currentUser: User) => {
    tokenStore.set(token);
    setUser(currentUser);
    setStatus('authenticated');
    return currentUser;
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const data = await authApi.login(input);
      return applyAuth(data.access_token, data.user);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const data = await authApi.register(input);
      return applyAuth(data.access_token, data.user);
    },
    [applyAuth],
  );

  const changePassword = useCallback(
    async (input: ChangePasswordInput) => {
      await authApi.changePassword(input);
      // 后端会递增 auth_version，旧令牌立即失效，因此本地也退出登录。
      logout();
    },
    [logout],
  );

  const refreshUser = useCallback(async () => {
    const currentUser = await authApi.me();
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, changePassword, refreshUser }),
    [user, status, login, register, logout, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return context;
}
