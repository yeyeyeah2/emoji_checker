import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { request } from "../api";
import { useAuth } from "../auth";
import { Empty, ErrorBanner, Loading, PageHeader, formatTime, toLocalInput } from "../components/Ui";
import type { ClassSession, Course, Page, User } from "../types";

interface RosterStudent { id: string; username: string }

export default function CoursesPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [coursePage, sessionPage, teacherPage, studentPage] = await Promise.all([
        request<Page<Course>>("/courses?limit=100", {}, token),
        request<Page<ClassSession>>("/sessions?limit=100", {}, token),
        request<Page<User>>("/admin/users?role=TEACHER&status=ACTIVE&limit=100", {}, token),
        request<Page<User>>("/admin/users?role=STUDENT&status=ACTIVE&limit=100", {}, token),
      ]);
      setCourses(coursePage.data);
      setSessions(sessionPage.data);
      setTeachers(teacherPage.data);
      setStudents(studentPage.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "课程数据加载失败");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await request("/admin/courses", { method: "POST", body: JSON.stringify({ code: data.get("code"), name: data.get("name"), teacher_id: data.get("teacherId") }) }, token);
      form.reset();
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "课程创建失败"); }
    finally { setSaving(false); }
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await request("/admin/sessions", { method: "POST", body: JSON.stringify({
        course_id: data.get("courseId"), class_name: data.get("className"),
        starts_at: new Date(String(data.get("startsAt"))).toISOString(),
        ends_at: new Date(String(data.get("endsAt"))).toISOString(),
      }) }, token);
      form.reset();
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "课堂创建失败"); }
    finally { setSaving(false); }
  }

  async function editCourse(course: Course) {
    if (!token) return;
    try {
      const result = await request<{ data: Course }>(`/admin/courses/${course.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !course.is_active }) }, token);
      setCourses((items) => items.map((item) => item.id === course.id ? result.data : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "课程修改失败"); }
  }

  async function cancelSession(session: ClassSession) {
    if (!token) return;
    try {
      const result = await request<{ data: ClassSession }>(`/admin/sessions/${session.id}`, { method: "PATCH", body: JSON.stringify({ status: session.status === "SCHEDULED" ? "CANCELLED" : "SCHEDULED" }) }, token);
      setSessions((items) => items.map((item) => item.id === session.id ? result.data : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "课堂状态修改失败"); }
  }

  async function openRoster(session: ClassSession) {
    if (!token) return;
    setSelectedSession(session);
    try {
      const response = await request<{ data: RosterStudent[] }>(`/sessions/${session.id}/schedule`, {}, token);
      setRoster(response.data.map((item) => item.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "名单加载失败"); }
  }

  async function saveRoster() {
    if (!token || !selectedSession) return;
    setSaving(true);
    try {
      await request(`/admin/sessions/${selectedSession.id}/schedule`, { method: "PUT", body: JSON.stringify({ user_ids: roster }) }, token);
      setSelectedSession(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "名单保存失败"); }
    finally { setSaving(false); }
  }

  const visibleStudents = useMemo(() => students.filter((item) => `${item.username} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [students, query]);

  return <>
    <PageHeader title="课程与课堂" description="创建课程、安排课堂时间并维护学生名单" />
    <ErrorBanner message={error} />
    <section className="form-grid">
      <form className="panel form-panel" onSubmit={createCourse}><div className="panel-title"><h2>新建课程</h2><span>管理员操作</span></div><div className="field-grid"><label>课程代码<input name="code" required placeholder="SE-2026" /></label><label>课程名称<input name="name" required placeholder="软件工程实践" /></label><label className="span-2">授课教师<select name="teacherId" required><option value="">请选择教师</option>{teachers.map((item) => <option value={item.id} key={item.id}>{item.username} · {item.email}</option>)}</select></label></div><button className="primary" disabled={saving || !teachers.length}>创建课程</button>{!teachers.length && <small>请先在用户管理中将一名用户设为教师。</small>}</form>
      <form className="panel form-panel" onSubmit={createSession}><div className="panel-title"><h2>新建课堂</h2><span>时间使用本地时区</span></div><div className="field-grid"><label>所属课程<select name="courseId" required><option value="">请选择课程</option>{courses.filter((item) => item.is_active).map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label><label>班级<input name="className" required placeholder="软工一班" /></label><label>开始时间<input name="startsAt" type="datetime-local" defaultValue={toLocalInput(new Date(Date.now() + 3600_000).toISOString())} required /></label><label>结束时间<input name="endsAt" type="datetime-local" defaultValue={toLocalInput(new Date(Date.now() + 7200_000).toISOString())} required /></label></div><button className="primary" disabled={saving || !courses.length}>创建课堂</button></form>
    </section>
    {loading ? <Loading /> : <>
      <section className="panel table-panel"><div className="panel-title"><h2>课程</h2><span>{courses.length} 门</span></div>{!courses.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>课程</th><th>授课教师</th><th>状态</th><th>操作</th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong>{course.code}</strong><small className="block">{course.name}</small></td><td>{teachers.find((item) => item.id === course.teacher_id)?.username || course.teacher_id.slice(0, 8)}</td><td><span className={`badge ${course.is_active ? "success" : "muted"}`}>{course.is_active ? "启用" : "停用"}</span></td><td><button className="secondary compact" onClick={() => void editCourse(course)}>{course.is_active ? "停用" : "启用"}</button></td></tr>)}</tbody></table></div>}</section>
      <section className="panel table-panel"><div className="panel-title"><h2>课堂安排</h2><span>{sessions.length} 场</span></div>{!sessions.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>课程与班级</th><th>时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{sessions.map((session) => { const course = courses.find((item) => item.id === session.course_id); return <tr key={session.id}><td><strong>{course?.code || "未知课程"}</strong><small className="block">{session.class_name}</small></td><td>{formatTime(session.starts_at)}<small className="block">至 {formatTime(session.ends_at)}</small></td><td><span className={`badge ${session.status === "SCHEDULED" ? "success" : "muted"}`}>{session.status === "SCHEDULED" ? "已安排" : "已取消"}</span></td><td className="actions"><button className="secondary compact" onClick={() => void openRoster(session)}>学生名单</button><button className="ghost compact" onClick={() => void cancelSession(session)}>{session.status === "SCHEDULED" ? "取消课堂" : "恢复课堂"}</button></td></tr>; })}</tbody></table></div>}</section>
    </>}
    {selectedSession && <div className="modal-backdrop" onMouseDown={() => setSelectedSession(null)}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="panel-title"><div><h2>安排学生名单</h2><span>{selectedSession.class_name} · 已选 {roster.length} 人</span></div><button className="icon-button" onClick={() => setSelectedSession(null)}>×</button></div><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生" /><div className="roster-list">{visibleStudents.map((student) => <label key={student.id}><input type="checkbox" checked={roster.includes(student.id)} onChange={(event) => setRoster((items) => event.target.checked ? [...items, student.id] : items.filter((id) => id !== student.id))} /><span className="avatar small">{student.username[0].toUpperCase()}</span><div><strong>{student.username}</strong><small>{student.email}</small></div></label>)}</div><div className="modal-actions"><button className="ghost" onClick={() => setSelectedSession(null)}>取消</button><button className="primary" disabled={saving} onClick={() => void saveRoster()}>保存名单</button></div></section></div>}
  </>;
}
