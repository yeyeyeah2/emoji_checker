import { AppShell } from '../components/AppShell';
import { HistoryPanel } from '../components/HistoryPanel';
import { StatsPanel } from '../components/StatsPanel';
import { formatCount, formatFullDate } from '../lib/format';
import { useTeacherViewModel } from '../viewmodels/useTeacherViewModel';

export function TeacherPage() {
  const vm = useTeacherViewModel();
  const { user, reference, stats, history, roster, tab, setTab, liveSessions } = vm;

  if (!user) return null;

  return (
    <AppShell>
      <div className="page teacher-page">
        <section className="page-hero">
          <div className="hero-copy">
            <p className="eyebrow">{formatFullDate(vm.now)}</p>
            <h1>
              教师工作台，<span>{user.username}</span>
            </h1>
            <p>查看所授课堂的情绪脉络，及时发现课堂里的变化。</p>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <strong>{reference.courses.length}</strong>
              <span>门授课课程</span>
            </div>
            <div className="hero-metric">
              <strong>{liveSessions.length}</strong>
              <span>节课堂进行中</span>
            </div>
            <div className="hero-metric">
              <strong>{stats.data ? formatCount(stats.data.total_records) : '—'}</strong>
              <span>条记录（当前范围）</span>
            </div>
          </div>
        </section>

        <div className="info-bar">
          <span aria-hidden="true">🔒</span>
          <p>数据范围仅限你本人所授课程；选择具体课堂后，历史记录会显示学生用户名。</p>
        </div>

        <div className="tab-bar" role="tablist" aria-label="教师视图切换">
          <button
            type="button"
            role="tab"
            id="teacher-tab-stats"
            aria-selected={tab === 'stats'}
            aria-controls="teacher-panel-stats"
            className={`tab-button${tab === 'stats' ? ' is-active' : ''}`}
            onClick={() => setTab('stats')}
          >
            统计概览
          </button>
          <button
            type="button"
            role="tab"
            id="teacher-tab-history"
            aria-selected={tab === 'history'}
            aria-controls="teacher-panel-history"
            className={`tab-button${tab === 'history' ? ' is-active' : ''}`}
            onClick={() => setTab('history')}
          >
            历史记录
          </button>
        </div>

        {tab === 'stats' ? (
          <div role="tabpanel" id="teacher-panel-stats" aria-labelledby="teacher-tab-stats">
            <StatsPanel stats={stats} courses={reference.courses} sessionById={reference.sessionById} />
          </div>
        ) : (
          <div role="tabpanel" id="teacher-panel-history" aria-labelledby="teacher-tab-history">
            <HistoryPanel
              history={history}
              courses={reference.courses}
              sessions={vm.historySessions}
              sessionById={reference.sessionById}
              courseById={reference.courseById}
              currentUserId={user.id}
              roster={roster}
              title="课堂情绪历史"
              description="按课程、课堂、情绪与时间筛选；选中课堂后可显示学生用户名。"
              showCourseFilter
              showSessionFilter
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
