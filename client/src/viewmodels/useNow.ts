import { useEffect, useState } from 'react';

/** 定时刷新的“当前时间”，用于课堂进行中 / 即将开始状态。 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
