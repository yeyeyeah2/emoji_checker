import { tokenStore } from '../auth/tokenStore';
import { ApiError } from './errors';
import { buildQuery, type QueryValue } from './query';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/+$/, '');

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** 是否携带用户 JWT，默认 true。登录 / 注册应设为 false。 */
  auth?: boolean;
  signal?: AbortSignal;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function isMockEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true';
}

function resolvePath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, auth = true, signal } = options;
  const token = auth ? tokenStore.get() : null;

  if (isMockEnabled()) {
    const { mockRequest } = await import('./mock');
    return mockRequest<T>(path, { method, query, body, token, signal });
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${resolvePath(path)}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', '无法连接后端服务，请确认后端已启动，或使用演示模式。');
  }

  if (!response.ok) {
    let code = 'request_failed';
    let message = `请求失败（HTTP ${response.status}）`;
    let details: unknown;

    try {
      const payload = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown } };
      if (payload?.error) {
        code = payload.error.code ?? code;
        message = payload.error.message ?? message;
        details = payload.error.details;
      }
    } catch {
      // 非 JSON 错误响应，保留默认提示。
    }

    if (response.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(response.status, code, message, details);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
