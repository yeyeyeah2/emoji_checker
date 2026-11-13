import { type FormEvent, useCallback, useEffect, useState } from "react";

import { buildQuery, downloadCsv, request } from "../api";
import { useAuth } from "../auth";
import { Empty, ErrorBanner, Loading, PageHeader, emojiMeta, formatTime } from "../components/Ui";
import type { ClassSession, Course, EmojiRecord, EmojiType, Page } from "../types";

export default function RecordsPage() {
  const { token } = useAuth();
  const [page, setPage] = useState<Page<EmojiRecord> | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [filters, setFilters] = useState({ course_id: "", session_id: "", emoji_type: "", source: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useCallback((extra: Record<string, unknown> = {}) => buildQuery({
    ...filters,
    from: filters.from ? new Date(filters.from).toISOString() : "",
    to: filters.to ? new Date(filters.to).toISOString() : "",
    ...extra,
  } as Record<string, string | number>), [filters]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [records, coursePage, sessionPage] = await Promise.all([
        request<Page<EmojiRecord>>(`/admin/emoji${query({ limit: 100 })}`, {}, token),
        request<Page<Course>>("/courses?limit=100", {}, token),
        request<Page<ClassSession>>("/sessions?limit=100", {}, token),
      ]);
      setPage(records); setCourses(coursePage.data); setSessions(sessionPage.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "情绪记录加载失败"); }
    finally { setLoading(false); }
  }, [query, token]);

  useEffect(() => { void load(); }, [load]);

  function submit(event: FormEvent) { event.preventDefault(); void load(); }

  return <>
    <PageHeader title="情绪记录" description="按课程、课堂、时段、情绪与来源查询和导出" actions={<button className="primary" disabled={!token} onClick={() => token && void downloadCsv(`/admin/emoji/export${query({ format: "csv" })}`, token).catch((reason) => setError(reason.message))}>导出 CSV</button>} />
    <ErrorBanner message={error} />
    <form className="toolbar panel filters records-filters" onSubmit={submit}>
      <label>课程<select value={filters.course_id} onChange={(event) => setFilters({ ...filters, course_id: event.target.value, session_id: "" })}><option value="">全部课程</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <label>课堂<select value={filters.session_id} onChange={(event) => setFilters({ ...filters, session_id: event.target.value })}><option value="">全部课堂</option>{sessions.filter((item) => !filters.course_id || item.course_id === filters.course_id).map((item) => <option key={item.id} value={item.id}>{item.class_name} · {formatTime(item.starts_at)}</option>)}</select></label>
      <label>情绪<select value={filters.emoji_type} onChange={(event) => setFilters({ ...filters, emoji_type: event.target.value })}><option value="">全部情绪</option>{Object.entries(emojiMeta).map(([key, value]) => <option key={key} value={key}>{value.glyph} {value.label}</option>)}</select></label>
      <label>来源<select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })}><option value="">全部来源</option><option value="MANUAL">学生主动</option><option value="AI">AI 匿名</option></select></label>
      <label>开始<input type="datetime-local" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
      <label>结束<input type="datetime-local" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
      <button className="secondary">查询</button>
    </form>
    <section className="panel table-panel"><div className="panel-title"><h2>记录明细</h2><span>匹配 {page?.meta.total || 0} 条</span></div>{loading ? <Loading /> : !page?.data.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>情绪</th><th>来源</th><th>课堂</th><th>时间</th><th>置信度 / 用户</th><th>设备</th></tr></thead><tbody>{page.data.map((record) => { const meta = emojiMeta[record.emoji_type as EmojiType]; const session = sessions.find((item) => item.id === record.session_id); const course = courses.find((item) => item.id === session?.course_id); return <tr key={record.id}><td><span className="emoji-cell"><span>{meta.glyph}</span><strong>{meta.label}</strong></span></td><td><span className={`badge ${record.source === "AI" ? "purple" : "blue"}`}>{record.source === "AI" ? "AI 匿名" : "学生主动"}</span></td><td><strong>{course?.code || "—"}</strong><small className="block">{session?.class_name || record.session_id.slice(0, 8)}</small></td><td>{formatTime(record.event_at)}</td><td>{record.confidence === null ? record.user_id?.slice(0, 8) || "—" : `${Math.round(record.confidence * 100)}%`}</td><td>{record.source_id || "—"}</td></tr>; })}</tbody></table></div>}</section>
  </>;
}
