import type { ClassSession, Course } from '../api/types';
import { formatTimeRange } from '../lib/format';

interface SessionPickerProps {
  sessions: ClassSession[];
  selectedId: string;
  now: Date;
  courseById: Map<string, Course>;
  onSelect: (sessionId: string) => void;
}

export function SessionPicker({ sessions, selectedId, now, courseById, onSelect }: SessionPickerProps) {
  return (
    <div className="live-session-grid" role="listbox" aria-label="进行中的课堂">
      {sessions.map((session) => {
        const course = courseById.get(session.course_id);
        const remaining = Math.max(
          1,
          Math.ceil((new Date(session.ends_at).getTime() - now.getTime()) / 60_000),
        );
        const selected = selectedId === session.id;

        return (
          <button
            key={session.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={`session-card${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(session.id)}
          >
            <span className="session-card-top">
              <span className="live-badge">
                <span className="live-dot" aria-hidden="true" />
                进行中
              </span>
              <span className="session-remaining">还剩约 {remaining} 分钟</span>
            </span>
            <strong className="session-class">{session.class_name}</strong>
            <span className="session-course">{course ? `${course.code} · ${course.name}` : '课程信息加载中'}</span>
            <span className="session-time">{formatTimeRange(session.starts_at, session.ends_at)}</span>
          </button>
        );
      })}
    </div>
  );
}
