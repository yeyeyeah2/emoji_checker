import type { ClassSession, Course, EmojiRecord } from '../api/types';
import { emojiOption } from '../lib/emoji';
import { formatConfidence, formatDateTime, formatRelative, shortId } from '../lib/format';
import { EmptyState, ErrorBanner, SkeletonRows } from './Feedback';

interface HistoryTableProps {
  records: EmojiRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  sessionById: Map<string, ClassSession>;
  courseById: Map<string, Course>;
  currentUserId?: string;
  roster?: Map<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
}

function personLabel(record: EmojiRecord, currentUserId?: string, roster?: Map<string, string>): string {
  if (record.source === 'AI') return '匿名 AI';
  if (currentUserId && record.user_id === currentUserId) return '我';
  if (record.user_id && roster?.has(record.user_id)) return roster.get(record.user_id) ?? '学生';
  if (record.user_id) return `学生 ${shortId(record.user_id, 6)}`;
  return '匿名';
}

export function HistoryTable({
  records,
  loading,
  refreshing,
  error,
  sessionById,
  courseById,
  currentUserId,
  roster,
  emptyTitle = '还没有情绪记录',
  emptyDescription = '提交一次情绪打卡后，记录会出现在这里。',
  onRetry,
}: HistoryTableProps) {
  if (loading && records.length === 0) return <SkeletonRows rows={5} />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (records.length === 0) return <EmptyState icon="🗂️" title={emptyTitle} description={emptyDescription} />;

  return (
    <div className={`history-table-wrap${refreshing ? ' is-refreshing' : ''}`} aria-busy={refreshing || undefined}>
      <table className="data-table">
        <caption className="sr-only">情绪记录列表</caption>
        <thead>
          <tr>
            <th scope="col">情绪</th>
            <th scope="col">课堂</th>
            <th scope="col">学生</th>
            <th scope="col">来源</th>
            <th scope="col">时间</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const option = emojiOption(record.emoji_type);
            const session = sessionById.get(record.session_id);
            const course = session ? courseById.get(session.course_id) : undefined;

            return (
              <tr key={record.id}>
                <td data-label="情绪">
                  <span className="emotion-cell">
                    <span className="emotion-glyph" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <span>{option.label}</span>
                  </span>
                </td>
                <td data-label="课堂">
                  <span className="class-cell">
                    <strong>{session?.class_name ?? '未知课堂'}</strong>
                    <small>{course ? `${course.code} · ${course.name}` : shortId(record.session_id)}</small>
                  </span>
                </td>
                <td data-label="学生">
                  <span className="person-cell">{personLabel(record, currentUserId, roster)}</span>
                </td>
                <td data-label="来源">
                  <span className="source-cell">
                    <span className={`badge ${record.source === 'MANUAL' ? 'badge-manual' : 'badge-ai'}`}>
                      {record.source === 'MANUAL' ? '人工' : 'AI'}
                    </span>
                    {record.source === 'AI' && record.confidence !== null && (
                      <span className="record-confidence">{formatConfidence(record.confidence)}</span>
                    )}
                  </span>
                </td>
                <td data-label="时间">
                  <span className="time-cell" title={record.event_at}>
                    <strong>{formatDateTime(record.event_at)}</strong>
                    <small>{formatRelative(record.event_at)}</small>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
