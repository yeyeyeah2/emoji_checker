export type RangePreset = 'all' | 'today' | '7d' | '30d';

export const RANGE_OPTIONS: Array<{ value: RangePreset; label: string }> = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
];

export interface ResolvedRange {
  from?: string;
  to?: string;
}

/**
 * 返回后端需要的 UTC ISO 时间。后端筛选区间为左闭右开 [from, to)。
 */
export function resolveRange(preset: RangePreset, now: Date = new Date()): ResolvedRange {
  if (preset === 'all') return {};
  const to = now.toISOString();
  if (preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to };
  }
  const days = preset === '7d' ? 7 : 30;
  return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString(), to };
}
