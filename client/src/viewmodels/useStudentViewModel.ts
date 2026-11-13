import { useCallback, useEffect, useMemo, useState } from 'react';
import { emojiApi } from '../api/emoji';
import type { EmojiRecord, EmojiType } from '../api/types';
import { isSessionLive, sessionPhase } from '../lib/session';
import { useAuth } from './AuthProvider';
import { useHistoryQuery } from './useHistoryQuery';
import { useNow } from './useNow';
import { useReferenceData } from './useReferenceData';

export interface LastSubmission {
  emojiType: EmojiType;
  at: Date;
  sessionId: string;
}

export function useStudentViewModel() {
  const { user } = useAuth();
  const reference = useReferenceData(Boolean(user));
  const now = useNow();
  const history = useHistoryQuery(10);

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);

  const courseIsActive = useCallback(
    (courseId: string) => reference.courseById.get(courseId)?.is_active !== false,
    [reference.courseById],
  );

  const liveSessions = useMemo(
    () =>
      reference.sessions
        .filter((session) => isSessionLive(session, now) && courseIsActive(session.course_id))
        .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()),
    [reference.sessions, now, courseIsActive],
  );

  const upcomingSessions = useMemo(
    () =>
      reference.sessions
        .filter((session) => sessionPhase(session, now) === 'upcoming' && courseIsActive(session.course_id))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 3),
    [reference.sessions, now, courseIsActive],
  );

  useEffect(() => {
    if (liveSessions.length === 0) {
      setSelectedSessionId('');
      return;
    }
    if (!liveSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(liveSessions[0].id);
    }
  }, [liveSessions, selectedSessionId]);

  const selectedSession = reference.sessionById.get(selectedSessionId) ?? null;
  const selectedCourse = selectedSession ? reference.courseById.get(selectedSession.course_id) ?? null : null;
  const refreshHistory = history.refresh;

  const submit = useCallback(async (): Promise<EmojiRecord | null> => {
    if (!selectedSessionId || !selectedEmoji || submitting) return null;
    setSubmitting(true);
    try {
      const record = await emojiApi.create({
        session_id: selectedSessionId,
        emoji_type: selectedEmoji,
      });
      setLastSubmission({ emojiType: selectedEmoji, at: new Date(), sessionId: selectedSessionId });
      setSelectedEmoji(null);
      refreshHistory();
      return record;
    } finally {
      setSubmitting(false);
    }
  }, [selectedSessionId, selectedEmoji, submitting, refreshHistory]);

  return {
    user,
    reference,
    now,
    history,
    liveSessions,
    upcomingSessions,
    selectedSessionId,
    setSelectedSessionId,
    selectedSession,
    selectedCourse,
    selectedEmoji,
    setSelectedEmoji,
    submit,
    submitting,
    lastSubmission,
    latestRecord: history.records[0] ?? null,
  };
}
