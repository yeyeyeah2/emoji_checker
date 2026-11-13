import { describe, expect, it } from 'vitest';
import type { ClassSession } from '../api/types';
import { isSessionLive, sessionPhase, sessionPhaseLabel } from './session';

const session: ClassSession = {
  id: 'session-1',
  course_id: 'course-1',
  class_name: '软工 2301',
  starts_at: '2026-11-13T10:00:00Z',
  ends_at: '2026-11-13T11:00:00Z',
  status: 'SCHEDULED',
  created_at: '2026-11-01T00:00:00Z',
};

describe('sessionPhase', () => {
  it('marks a session as upcoming before it starts', () => {
    expect(sessionPhase(session, new Date('2026-11-13T09:59:59Z'))).toBe('upcoming');
  });

  it('treats the start time as inclusive', () => {
    expect(sessionPhase(session, new Date('2026-11-13T10:00:00Z'))).toBe('live');
  });

  it('keeps the session live until the end time', () => {
    expect(sessionPhase(session, new Date('2026-11-13T10:59:59Z'))).toBe('live');
  });

  it('treats the end time as exclusive', () => {
    expect(sessionPhase(session, new Date('2026-11-13T11:00:00Z'))).toBe('ended');
  });

  it('returns cancelled regardless of time', () => {
    const cancelled = { ...session, status: 'CANCELLED' as const };
    expect(sessionPhase(cancelled, new Date('2026-11-13T10:30:00Z'))).toBe('cancelled');
  });

  it('exposes a boolean helper', () => {
    expect(isSessionLive(session, new Date('2026-11-13T10:30:00Z'))).toBe(true);
    expect(isSessionLive(session, new Date('2026-11-13T11:30:00Z'))).toBe(false);
  });

  it('provides Chinese labels', () => {
    expect(sessionPhaseLabel('live')).toBe('进行中');
    expect(sessionPhaseLabel('upcoming')).toBe('即将开始');
    expect(sessionPhaseLabel('ended')).toBe('已结束');
    expect(sessionPhaseLabel('cancelled')).toBe('已取消');
  });
});
