import type { ApiErrorBody } from "./types";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "request_failed",
    public details?: unknown,
  ) {
    super(message);
  }
}

export function buildQuery(values: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = await response.json();
    } catch {
      // The status and generic message are still useful when a proxy returns HTML.
    }
    throw new ApiError(
      body.error?.message || `请求失败（${response.status}）`,
      response.status,
      body.error?.code,
      body.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function downloadCsv(path: string, token: string) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new ApiError(`导出失败（${response.status}）`, response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "emoji-records.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function websocketUrl(path: string) {
  const explicitBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicitBase?.startsWith("http")) {
    const url = new URL(`${explicitBase.replace(/\/$/, "")}${path}`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}${API_BASE}${path}`;
}
