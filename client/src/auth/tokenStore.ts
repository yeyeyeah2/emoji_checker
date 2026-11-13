const TOKEN_KEY = 'emoji-checker.token';

export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // 隐私模式下 localStorage 不可用时，本次会话仍可正常使用内存中的 token。
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
