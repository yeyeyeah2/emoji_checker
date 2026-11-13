import type { ClassSession } from '../api/types';

export type SessionPhase = 'live' | 'upcoming' | 'ended' | 'cancelled';

export function sessionPhase(session: ClassSession, now: Date = new Date()): SessionPhase {
  if (session.status === 'CANCELLED') return 'cancelled';
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();
  const current = now.getTime();
  if (current < start) return 'upcoming';
  if (current >= end) return 'ended';
  return 'live';
}

export function isSessionLive(session: ClassSession, now: Date = new Date()): boolean {
  return sessionPhase(session, now) === 'live';
}

export function sessionPhaseLabel(phase: SessionPhase): string {
  switch (phase) {
    case 'live':
      return '进行中';
    case 'upcoming':
      return '即将开始';
    case 'ended':
      return '已结束';
    case 'cancelled':
      return '已取消';
  }
}
