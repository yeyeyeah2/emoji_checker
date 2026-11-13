import { useCallback, useEffect, useMemo, useState } from 'react';
import { coursesApi } from '../api/courses';
import { isAbortError, getErrorMessage } from '../api/errors';
import { sessionsApi } from '../api/sessions';
import type { ClassSession, Course } from '../api/types';

interface ReferenceState {
  courses: Course[];
  sessions: ClassSession[];
  loading: boolean;
  error: string | null;
}

export function useReferenceData(enabled: boolean) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([coursesApi.listAll(controller.signal), sessionsApi.listAll(controller.signal)])
      .then(([nextCourses, nextSessions]) => {
        if (!active) return;
        setCourses(nextCourses);
        setSessions(nextSessions);
        setLoading(false);
      })
      .catch((caught) => {
        if (!active || isAbortError(caught)) return;
        setError(getErrorMessage(caught));
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, reloadKey]);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const sessionById = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const state: ReferenceState = { courses, sessions, loading, error };
  return { ...state, courseById, sessionById, reload };
}
