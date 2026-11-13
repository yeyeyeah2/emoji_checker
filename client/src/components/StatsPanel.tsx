import { useState } from 'react';
import type { ClassSession, Course, StatisticsGroup } from '../api/types';
import { emojiOption } from '../lib/emoji';
import { formatCount, formatPercentage } from '../lib/format';
import { RANGE_OPTIONS } from '../lib/range';
import { groupDimensions, groupLabel, sortStatisticsGroups } from '../lib/stats';
import { useStatisticsQuery } from '../viewmodels/useStatisticsQuery';
import { EmptyState, ErrorBanner, SkeletonRows } from './Feedback';
import { Select } from './Select';

type StatisticsViewModel = ReturnType<typeof useStatisticsQuery>;

interface StatsPanelProps {
  stats: StatisticsViewModel;
  courses: Course[];
  sessionById: Map<string, ClassSession>;
}

const GROUP_OPTIONS = [
  { value: 'emoji_type', label: '按情绪类型' },
  { value: 'source', label: '按记录来源' },
  { value: 'class', label: '按班级' },
  { value: 'course', label: '按课程' },
  { value: 'course,class', label: '按课程 + 班级' },
  { value: 'session', label: '按课堂' },
];

const BUCKET_OPTIONS = [
  { value: '', label: '不按时段' },
  { value: 'hour', label: '按小时' },
  { value: 'day', label: '按天' },
];

const CHART_TITLES: Record<string, string> = {
  emoji_type: '情绪类型分布',
  source: '记录来源分布',
  class: '班级分布',
  course: '课程分布',
  'course,class': '课程 × 班级分布',
  session: '课堂分布',
};

function barKey(group: StatisticsGroup, index: number): string {
  return [
    group.course ?? '',
    group.class ?? '',
    group.session ?? '',
    group.emoji_type ?? '',
    group.source ?? '',
    group.period ?? '',
    index,
  ].join('|');
}

export function StatsPanel({ stats, courses, sessionById }: StatsPanelProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { filters } = stats;
  const data = stats.data;
  const dimensions = groupDimensions(filters.groupBy);
  const sortedGroups = data ? sortStatisticsGroups(data.groups) : [];
  const chartGroups = sortedGroups.slice(0, 12);
  const hiddenGroups = sortedGroups.length - chartGroups.length;
  const hasFilters =
    filters.range !== '7d' ||
    filters.courseId !== '' ||
    filters.groupBy !== 'emoji_type' ||
    filters.bucket !== '';

  const baseTitle = CHART_TITLES[filters.groupBy] ?? '分组统计';
  const title = filters.bucket
    ? `${baseTitle} · 按${filters.bucket === 'hour' ? '小时' : '天'}`
    : baseTitle;

  const courseOptions = [
    { value: '', label: '全部课程' },
    ...courses.map((course) => ({ value: course.id, label: `${course.code} · ${course.name}` })),
  ];

  const kpis = [
    {
      label: '总记录数',
      value: data ? formatCount(data.total_records) : '—',
      hint: '当前筛选范围',
      icon: '📊',
      tone: 'blue',
    },
    {
      label: '人工记录',
      value: data ? formatCount(data.manual_records) : '—',
      hint: '学生主动提交',
      icon: '✍️',
      tone: 'green',
    },
    {
      label: 'AI 记录',
      value: data ? formatCount(data.ai_records) : '—',
      hint: 'AI 服务识别',
      icon: '🤖',
      tone: 'violet',
    },
    {
      label: '参与学生',
      value: data ? formatCount(data.student_count) : '—',
      hint: '去重学生数',
      icon: '🧑‍🎓',
      tone: 'orange',
    },
  ];

  return (
    <div className="stats-panel">
      <div className="filter-row" role="group" aria-label="统计筛选">
        <Select
          label="时间范围"
          value={filters.range}
          options={RANGE_OPTIONS}
          onChange={(range) => stats.setFilters({ range: range as typeof filters.range })}
        />
        <Select
          label="课程"
          value={filters.courseId}
          options={courseOptions}
          onChange={(courseId) => stats.setFilters({ courseId })}
        />
        <Select
          label="分组维度"
          value={filters.groupBy}
          options={GROUP_OPTIONS}
          onChange={(groupBy) => stats.setFilters({ groupBy })}
        />
        <Select
          label="分桶粒度"
          value={filters.bucket}
          options={BUCKET_OPTIONS}
          onChange={(bucket) => stats.setFilters({ bucket: bucket as typeof filters.bucket })}
        />
        {hasFilters && (
          <button type="button" className="filter-reset" onClick={stats.resetFilters}>
            重置筛选
          </button>
        )}
      </div>

      {stats.error && <ErrorBanner message={stats.error} onRetry={stats.refresh} />}

      <div className={`kpi-grid${stats.refreshing ? ' is-refreshing' : ''}`}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className="kpi-card">
            <span className={`kpi-icon kpi-tone-${kpi.tone}`} aria-hidden="true">
              {kpi.icon}
            </span>
            <span className="kpi-label">{kpi.label}</span>
            <strong className="kpi-value">{kpi.value}</strong>
            <span className="kpi-hint">{kpi.hint}</span>
          </article>
        ))}
      </div>

      <section className={`panel-card stats-card${stats.refreshing ? ' is-refreshing' : ''}`}>
        <header className="panel-head">
          <div>
            <h2>{title}</h2>
            <p>
              {data
                ? `按记录数从高到低排序 · 当前范围 ${formatCount(data.total_records)} 条记录`
                : '正在汇总课堂情绪数据'}
            </p>
          </div>
          <div className="segmented-toggle" role="group" aria-label="展示方式">
            <button
              type="button"
              className={view === 'chart' ? 'is-active' : ''}
              aria-pressed={view === 'chart'}
              onClick={() => setView('chart')}
            >
              图表
            </button>
            <button
              type="button"
              className={view === 'table' ? 'is-active' : ''}
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              表格
            </button>
          </div>
        </header>

        {!data ? (
          stats.loading ? (
            <SkeletonRows rows={6} />
          ) : (
            <div className="panel-empty">
              <EmptyState
                icon="⚠️"
                title="统计加载失败"
                description="请确认后端服务可用，然后点击上方「重试」。"
              />
            </div>
          )
        ) : data.total_records === 0 ? (
          <div className="panel-empty">
            <EmptyState
              icon="📭"
              title="当前范围内没有记录"
              description="试着扩大时间范围，或等待学生提交新的课堂情绪。"
            />
          </div>
        ) : view === 'chart' ? (
          <>
            <div className="bar-chart" role="list" aria-label={`${title}，共 ${formatCount(data.total_records)} 条记录`}>
              {chartGroups.map((group, index) => {
                const label = groupLabel(group, dimensions, sessionById);
                const option = group.emoji_type ? emojiOption(group.emoji_type) : null;
                const tooltip = `人工 ${group.manual_count} 条 · AI ${group.ai_count} 条 · 学生 ${group.student_count} 人`;
                return (
                  <div
                    key={barKey(group, index)}
                    className="bar-row"
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${label}：${group.record_count} 条，占 ${formatPercentage(group.percentage)}，${tooltip}`}
                  >
                    <span className="bar-label" title={label}>
                      {option && (
                        <span className="bar-emoji" aria-hidden="true">
                          {option.emoji}
                        </span>
                      )}
                      <span className="bar-label-text">{label}</span>
                    </span>
                    <span className="bar-track">
                      <span
                        className="bar-fill"
                        style={{
                          width: `${group.percentage}%`,
                          minWidth: group.record_count > 0 ? '2px' : undefined,
                        }}
                      />
                    </span>
                    <span className="bar-value">
                      <strong>{formatCount(group.record_count)}</strong>
                      <small>{formatPercentage(group.percentage)}</small>
                    </span>
                    <span className="bar-tooltip" role="tooltip">
                      {tooltip}
                    </span>
                  </div>
                );
              })}
            </div>
            {hiddenGroups > 0 && (
              <p className="chart-note">
                图表展示记录数最多的 12 组，其余 {hiddenGroups} 组请切换到表格视图查看。
              </p>
            )}
          </>
        ) : (
          <div className="table-scroll">
            <table className="data-table stats-table">
              <caption className="sr-only">{title}完整数据</caption>
              <thead>
                <tr>
                  <th scope="col">分组</th>
                  <th scope="col" className="num">
                    记录数
                  </th>
                  <th scope="col" className="num">
                    占比
                  </th>
                  <th scope="col" className="num">
                    人工
                  </th>
                  <th scope="col" className="num">
                    AI
                  </th>
                  <th scope="col" className="num">
                    学生数
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map((group, index) => {
                  const label = groupLabel(group, dimensions, sessionById);
                  const option = group.emoji_type ? emojiOption(group.emoji_type) : null;
                  return (
                    <tr key={barKey(group, index)}>
                      <td>
                        <span className="emotion-cell">
                          {option && (
                            <span className="emotion-glyph" aria-hidden="true">
                              {option.emoji}
                            </span>
                          )}
                          <span>{label}</span>
                        </span>
                      </td>
                      <td className="num">{formatCount(group.record_count)}</td>
                      <td className="num">{formatPercentage(group.percentage)}</td>
                      <td className="num">{formatCount(group.manual_count)}</td>
                      <td className="num">{formatCount(group.ai_count)}</td>
                      <td className="num">{formatCount(group.student_count)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
