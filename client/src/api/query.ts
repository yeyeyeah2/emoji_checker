export type QueryValue = string | number | boolean | null | undefined;

/**
 * 生成查询串。空字符串、null、undefined 会被跳过；0 与 false 会保留。
 */
export function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}
