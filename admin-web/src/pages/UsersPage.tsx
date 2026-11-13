import { type FormEvent, useCallback, useEffect, useState } from "react";

import { buildQuery, request } from "../api";
import { useAuth } from "../auth";
import { Empty, ErrorBanner, Loading, PageHeader, formatTime } from "../components/Ui";
import type { Page, User, UserRole, UserStatus } from "../types";

export default function UsersPage() {
  const { token, user: currentUser } = useAuth();
  const [page, setPage] = useState<Page<User> | null>(null);
  const [filters, setFilters] = useState({ q: "", role: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const load = useCallback(async (next = filters) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setPage(await request<Page<User>>(`/admin/users${buildQuery({ ...next, limit: 100 })}`, {}, token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "用户加载失败");
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => { void load(); }, [load]);

  async function patchUser(target: User, body: Partial<Pick<User, "role" | "status">>) {
    if (!token) return;
    setSaving(target.id);
    setError("");
    try {
      const response = await request<{ data: User }>(`/admin/users/${target.id}`, { method: "PATCH", body: JSON.stringify(body) }, token);
      setPage((current) => current ? { ...current, data: current.data.map((item) => item.id === target.id ? response.data : item) } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "修改失败");
    } finally {
      setSaving("");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void load(filters);
  }

  return <>
    <PageHeader title="用户管理" description="查询账号并管理角色与启用状态" />
    <ErrorBanner message={error} />
    <form className="toolbar panel filters" onSubmit={submit}>
      <label>搜索<input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="用户名或邮箱" /></label>
      <label>角色<select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}><option value="">全部角色</option><option value="STUDENT">学生</option><option value="TEACHER">教师</option><option value="ADMIN">管理员</option></select></label>
      <label>状态<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">全部状态</option><option value="ACTIVE">正常</option><option value="DISABLED">已停用</option></select></label>
      <button className="primary">查询</button>
    </form>
    <section className="panel table-panel">
      <div className="panel-title"><h2>账号列表</h2><span>共 {page?.meta.total || 0} 人</span></div>
      {loading ? <Loading /> : !page?.data.length ? <Empty /> : <div className="table-scroll"><table><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{page.data.map((item) => {
        const locked = item.id === currentUser?.id || saving === item.id;
        return <tr key={item.id}><td><div className="user-cell"><span className="avatar small">{item.username[0].toUpperCase()}</span><div><strong>{item.username}</strong><small>{item.email}</small></div></div></td><td><select aria-label={`${item.username} 的角色`} value={item.role} disabled={locked} onChange={(event) => void patchUser(item, { role: event.target.value as UserRole })}><option value="STUDENT">学生</option><option value="TEACHER">教师</option><option value="ADMIN">管理员</option></select></td><td><span className={`badge ${item.status === "ACTIVE" ? "success" : "muted"}`}>{item.status === "ACTIVE" ? "正常" : "已停用"}</span></td><td>{formatTime(item.created_at)}</td><td><button className="secondary compact" disabled={locked} onClick={() => void patchUser(item, { status: (item.status === "ACTIVE" ? "DISABLED" : "ACTIVE") as UserStatus })}>{item.status === "ACTIVE" ? "停用" : "启用"}</button>{item.id === currentUser?.id && <small className="self-note">当前账号</small>}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </>;
}
