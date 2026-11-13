import { useEffect, useMemo, useState } from 'react';
import { isAbortError } from '../api/errors';
import { sessionsApi } from '../api/sessions';
import type { RosterStudent } from '../api/types';

/** 教师选择某节课后，用名单把 user_id 映射成学生用户名。 */
export function useRoster(sessionId: string, enabled: boolean): Map<string, string> {
  const [roster, setRoster] = useState<RosterStudent[]>([]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setRoster([]);
      return;
    }

    const controller = new AbortController();
    let active = true;

    sessionsApi
      .roster(sessionId, controller.signal)
      .then((students) => {
        if (active) setRoster(students);
      })
      .catch((caught) => {
        if (!active || isAbortError(caught)) return;
        setRoster([]);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [sessionId, enabled]);

  return useMemo(() => new Map(roster.map((student) => [student.id, student.username])), [roster]);
}
