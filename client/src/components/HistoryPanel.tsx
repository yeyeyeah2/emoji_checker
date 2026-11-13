import type { ClassSession, Course } from '../api/types';
import { formatCount, formatDateTime } from '../lib/format';
import { EMOJI_OPTIONS } from '../lib/emoji';
import { RANGE_OPTIONS } from '../lib/range';
import { useHistoryQuery } from '../viewmodels/useHistoryQuery';
import { EmptyState } from './Feedback';
import { HistoryTable } from './HistoryTable';
import { Pagination } from './Pagination';
import { Select } from './Select';

type HistoryViewModel = ReturnType<typeof useHistoryQuery>;

interface HistoryPanelProps {
  history: HistoryViewModel;
  courses: Course[];
  sessions: ClassSession[];
  sessionById: Map<string, ClassSession>;
  courseById: Map<string, Course>;
  currentUserId?: string;
  roster?: Map<string, string>;
  title: string;
  description?: string;
  showCourseFilter?: boolean;
  showSessionFilter?: boolean;
}

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'MANUAL', label: '人工提交' },
  { value: 'AI', label: 'AI 识别' },
];

export function HistoryPanel({
  history,
  courses,
  sessions,
  sessionById,
  courseById,
  currentUserId,
  roster,
  title,
  description,
  showCourseFilter = false,
  showSessionFilter = false,
}: HistoryPanelProps) {
  const { filters } = history;
  const hasFilters =
    Boolean(filters.courseId || filters.sessionId || filters.emojiType || filters.source) ||
    filters.range !== 'all';

  const courseOptions = [
    { value: '', label: '全部课程' },
    ...courses.map((course) => ({ value: course.id, label: `${course.code} · ${course.name}` })),
  ];

  const sessionOptions = [
    { value: '', label: '全部课堂' },
    ...sessions.map((session) => ({
      value: session.id,
      label: `${session.class_name} · ${formatDateTime(session.starts_at)}`,
    })),
  ];

  const emojiOptions = [
    { value: '', label: '全部情绪' },
    ...EMOJI_OPTIONS.map((option) => ({
      value: option.type,
      label: `${option.emoji} ${option.label}`,
    })),
  ];

  const onSessionChange = (sessionId: string) => {
    const session = sessionById.get(sessionId);
    history.setFilters({
      sessionId,
      ...(session && !filters.courseId ? { courseId: session.course_id } : {}),
    });
  };

  return (
    <div className="history-panel-block">
      <div className="filter-row" role="group" aria-label="历史记录筛选">
        {showCourseFilter && (
          <Select
            label="课程"
            value={filters.courseId}
            options={courseOptions}
            onChange={(courseId) => history.setFilters({ courseId, sessionId: '' })}
          />
        )}
        {showSessionFilter && (
          <Select
            label="课堂"
            value={filters.sessionId}
            options={sessionOptions}
            onChange={onSessionChange}
            disabled={sessions.length === 0}
          />
        )}
        <Select
          label="情绪"
          value={filters.emojiType}
          options={emojiOptions}
          onChange={(emojiType) =>
            history.setFilters({ emojiType: emojiType as typeof filters.emojiType })
          }
        />
        <Select
          label="来源"
          value={filters.source}
          options={SOURCE_OPTIONS}
          onChange={(source) => history.setFilters({ source: source as typeof filters.source })}
        />
        <Select
          label="时间范围"
          value={filters.range}
          options={RANGE_OPTIONS}
          onChange={(range) => history.setFilters({ range: range as typeof filters.range })}
        />
        {hasFilters && (
          <button type="button" className="filter-reset" onClick={history.resetFilters}>
            重置筛选
          </button>
        )}
      </div>

      <section className="panel-card">
        <header className="panel-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <div className="panel-actions">
            {history.total > 0 && <span className="count-chip">{formatCount(history.total)} 条</span>}
            <button
              type="button"
              className={`icon-button refresh-button${history.refreshing ? ' is-spinning' : ''}`}
              onClick={history.refresh}
              disabled={history.loading || history.refreshing}
              aria-label="刷新记录"
              title="刷新记录"
            >
              ↻
            </button>
          </div>
        </header>

        {history.records.length === 0 && !history.loading && !history.error ? (
          <div className="panel-empty">
            <EmptyState
              icon="🗂️"
              title={hasFilters ? '当前筛选条件下没有记录' : '还没有情绪记录'}
              description={hasFilters ? '试试放宽时间范围或清除筛选条件。' : '提交一次情绪打卡后，记录会出现在这里。'}
              action={
                hasFilters ? (
                  <button type="button" className="text-button" onClick={history.resetFilters}>
                    清除筛选
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <HistoryTable
            records={history.records}
            loading={history.loading}
            refreshing={history.refreshing}
            error={history.error}
            sessionById={sessionById}
            courseById={courseById}
            currentUserId={currentUserId}
            roster={roster}
            emptyTitle={hasFilters ? '当前筛选条件下没有记录' : '还没有情绪记录'}
            emptyDescription={hasFilters ? '试试放宽时间范围或清除筛选条件。' : undefined}
            onRetry={history.refresh}
          />
        )}

        <Pagination
          total={history.total}
          pageIndex={history.pageIndex}
          pageCount={history.pageCount}
          hasPrevious={history.hasPrevious}
          hasNext={history.hasNext}
          disabled={history.loading || history.refreshing}
          onPrevious={history.previousPage}
          onNext={history.nextPage}
        />
      </section>
    </div>
  );
}
