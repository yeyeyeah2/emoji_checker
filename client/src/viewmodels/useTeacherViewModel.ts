import { useMemo, useState } from 'react';
import type { ClassSession } from '../api/types';
import { isSessionLive } from '../lib/session';
import { useAuth } from './AuthProvider';
import { useHistoryQuery } from './useHistoryQuery';
import { useNow } from './useNow';
import { useReferenceData } from './useReferenceData';
import { useRoster } from './useRoster';
import { useStatisticsQuery } from './useStatisticsQuery';

export type TeacherTab = 'stats' | 'history';

export function useTeacherViewModel() {
  const { user } = useAuth();
  const reference = useReferenceData(Boolean(user));
  const stats = useStatisticsQuery();
  const history = useHistoryQuery(10);
  const roster = useRoster(history.filters.sessionId, user?.role === 'TEACHER');
  const now = useNow();
  const [tab, setTab] = useState<TeacherTab>('stats');

  const liveSessions = useMemo(
    () => reference.sessions.filter((session) => isSessionLive(session, now)),
    [reference.sessions, now],
  );

  const historySessions = useMemo<ClassSession[]>(() => {
    const scoped = history.filters.courseId
      ? reference.sessions.filter((session) => session.course_id === history.filters.courseId)
      : reference.sessions;
    return [...scoped].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );
  }, [reference.sessions, history.filters.courseId]);

  return {
    user,
    reference,
    stats,
    history,
    roster,
    tab,
    setTab,
    now,
    liveSessions,
    historySessions,
  };
}
