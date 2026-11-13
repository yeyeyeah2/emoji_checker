import { ApiError, getErrorMessage } from '../api/errors';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/Button';
import { EmojiPicker } from '../components/EmojiPicker';
import { EmptyState, ErrorBanner, SkeletonRows } from '../components/Feedback';
import { HistoryPanel } from '../components/HistoryPanel';
import { SessionPicker } from '../components/SessionPicker';
import { useToast } from '../components/Toast';
import { emojiOption } from '../lib/emoji';
import { formatCount, formatDay, formatFullDate, formatRelative, formatTime, formatTimeRange } from '../lib/format';
import { useStudentViewModel } from '../viewmodels/useStudentViewModel';

export function StudentPage() {
  const vm = useStudentViewModel();
  const toast = useToast();
  const { user, reference, liveSessions, upcomingSessions, history } = vm;

  if (!user) return null;

  const handleSubmit = async () => {
    try {
      const record = await vm.submit();
      if (record) {
        toast.success(`已记录「${emojiOption(record.emoji_type).label}」情绪`);
      }
    } catch (caught) {
      toast.error(getErrorMessage(caught));
      if (caught instanceof ApiError && caught.code === 'session_not_active') {
        reference.reload();
      }
    }
  };

  const latestRecord = vm.latestRecord;
  const latestOption = latestRecord ? emojiOption(latestRecord.emoji_type) : null;
  const selectedOption = vm.selectedEmoji ? emojiOption(vm.selectedEmoji) : null;

  return (
    <AppShell>
      <div className="page student-page">
        <section className="page-hero">
          <div className="hero-copy">
            <p className="eyebrow">{formatFullDate(vm.now)}</p>
            <h1>
              你好，<span>{user.username}</span>
            </h1>
            <p>此刻的课堂，让你感觉怎么样？选一个表情，把它留在这里。</p>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <strong>{liveSessions.length}</strong>
              <span>节课堂进行中</span>
            </div>
            <div className="hero-metric">
              <strong>{history.meta ? formatCount(history.meta.total) : '—'}</strong>
              <span>条记录（当前筛选）</span>
            </div>
          </div>
        </section>

        <div className="student-grid">
          <section className="panel-card composer-card">
            <header className="panel-head">
              <div>
                <h2>情绪打卡</h2>
                <p>选择一节课，把此刻的感受告诉老师。</p>
              </div>
              <span className="soft-badge">仅进行中的课堂可提交</span>
            </header>

            {vm.lastSubmission && (
              <div className="submission-banner" role="status">
                <span className="submission-emoji" aria-hidden="true">
                  {emojiOption(vm.lastSubmission.emojiType).emoji}
                </span>
                <div>
                  <strong>情绪已记录</strong>
                  <small>
                    {formatTime(vm.lastSubmission.at.toISOString())} · 感谢你的分享
                  </small>
                </div>
              </div>
            )}

            {reference.loading && reference.sessions.length === 0 ? (
              <SkeletonRows rows={2} />
            ) : reference.error ? (
              <ErrorBanner message={reference.error} onRetry={reference.reload} />
            ) : liveSessions.length === 0 ? (
              <EmptyState
                icon="⏳"
                title="暂时没有进行中的课堂"
                description="课堂开始后就能打卡了。右侧可以看到即将开始的课堂。"
              />
            ) : (
              <>
                <SessionPicker
                  sessions={liveSessions}
                  selectedId={vm.selectedSessionId}
                  now={vm.now}
                  courseById={reference.courseById}
                  onSelect={vm.setSelectedSessionId}
                />

                <div className="composer-divider" />

                <div className="composer-question">
                  <h3>此刻，你感觉怎么样？</h3>
                  <p>没有标准答案，真实就好。</p>
                </div>

                <EmojiPicker
                  value={vm.selectedEmoji}
                  onChange={vm.setSelectedEmoji}
                  disabled={vm.submitting}
                />

                <div className="composer-submit">
                  <div className="selection-summary">
                    {selectedOption ? (
                      <>
                        <span className="selection-emoji" aria-hidden="true">
                          {selectedOption.emoji}
                        </span>
                        <span>
                          已选择 <strong>{selectedOption.label}</strong>
                        </span>
                      </>
                    ) : (
                      <span className="muted-text">选择一个表情后即可记录</span>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    loading={vm.submitting}
                    disabled={!vm.selectedEmoji || !vm.selectedSessionId}
                  >
                    记录我的心情
                  </Button>
                </div>
              </>
            )}
          </section>

          <aside className="side-stack">
            <section className="panel-card side-card summary-card">
              <p className="eyebrow">我的记录</p>
              <div className="summary-figure">
                <strong>{history.meta ? formatCount(history.meta.total) : '—'}</strong>
                <span>条情绪记录</span>
              </div>
              {latestRecord && latestOption ? (
                <div className="latest-record">
                  <span className="latest-emoji" aria-hidden="true">
                    {latestOption.emoji}
                  </span>
                  <div>
                    <strong>{latestOption.label}</strong>
                    <small>{formatRelative(latestRecord.event_at, vm.now)}</small>
                  </div>
                </div>
              ) : (
                <p className="muted-text">还没有记录，从今天开始吧。</p>
              )}
              <ul className="tip-list">
                <li>只有进行中的课堂可以打卡。</li>
                <li>AI 识别的记录不会关联你的身份。</li>
                <li>教师只能查看所授课程的数据。</li>
              </ul>
            </section>

            <section className="panel-card side-card">
              <header className="side-card-head">
                <h2>即将开始</h2>
                <span className="count-chip">{upcomingSessions.length}</span>
              </header>
              {upcomingSessions.length === 0 ? (
                <p className="muted-text">暂无即将开始的课堂。</p>
              ) : (
                <ul className="upcoming-list">
                  {upcomingSessions.map((session) => {
                    const course = reference.courseById.get(session.course_id);
                    return (
                      <li key={session.id}>
                        <span className="upcoming-date">
                          <strong>{formatDay(session.starts_at)}</strong>
                          <small>{formatTimeRange(session.starts_at, session.ends_at)}</small>
                        </span>
                        <span className="upcoming-info">
                          <strong>{session.class_name}</strong>
                          <small>{course ? `${course.code} · ${course.name}` : '课程信息加载中'}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>

        <HistoryPanel
          history={history}
          courses={reference.courses}
          sessions={reference.sessions}
          sessionById={reference.sessionById}
          courseById={reference.courseById}
          currentUserId={user.id}
          title="我的情绪记录"
          description="按时间倒序展示你的课堂情绪，可按课程、情绪与来源筛选。"
          showCourseFilter
        />
      </div>
    </AppShell>
  );
}
