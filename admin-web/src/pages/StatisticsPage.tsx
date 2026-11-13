import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";

import { buildQuery, request } from "../api";
import { useAuth } from "../auth";
import Chart from "../components/Chart";
import { Empty, ErrorBanner, Loading, PageHeader, StatCard, emojiMeta } from "../components/Ui";
import type { EmojiType, Statistics } from "../types";

export default function StatisticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Statistics | null>(null);
  const [filters, setFilters] = useState({ group_by: "course,class,emoji_type", bucket: "", from: "", to: "", source: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const query = buildQuery({ ...filters, from: filters.from ? new Date(filters.from).toISOString() : "", to: filters.to ? new Date(filters.to).toISOString() : "" });
      setData((await request<{ data: Statistics }>(`/admin/statistics${query}`, {}, token)).data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "统计加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [token]); // Initial load only; filters submit explicitly.

  function submit(event: FormEvent) { event.preventDefault(); void load(); }

  const chart = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0 },
    grid: { left: 48, right: 20, top: 30, bottom: 70 },
    xAxis: { type: "category", axisLabel: { rotate: data && data.groups.length > 8 ? 25 : 0 }, data: (data?.groups || []).map((group) => [group.course, group.class, group.emoji_type && emojiMeta[group.emoji_type].label, group.source, group.period && new Date(group.period).toLocaleString("zh-CN")].filter(Boolean).join(" · ") || "全部") },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      { name: "学生主动", type: "bar", stack: "records", color: "#0f766e", data: (data?.groups || []).map((group) => group.manual_count) },
      { name: "AI 匿名", type: "bar", stack: "records", color: "#8b5cf6", data: (data?.groups || []).map((group) => group.ai_count) },
    ],
  }), [data]);

  const pie = useMemo<EChartsOption>(() => {
    const grouped = new Map<string, number>();
    (data?.groups || []).forEach((item) => { const key = item.emoji_type || "OTHER"; grouped.set(key, (grouped.get(key) || 0) + item.record_count); });
    return {
      tooltip: { trigger: "item" }, legend: { bottom: 0 },
      series: [{ type: "pie", radius: ["42%", "70%"], data: [...grouped.entries()].map(([key, value]) => ({ name: key === "OTHER" ? "其他分组" : `${emojiMeta[key as EmojiType].glyph} ${emojiMeta[key as EmojiType].label}`, value })) }],
    };
  }, [data]);

  return <>
    <PageHeader title="多维统计" description="按课程、班级、时间、情绪和来源分析课堂反馈" />
    <ErrorBanner message={error} />
    <form className="toolbar panel filters" onSubmit={submit}>
      <label>分组维度<select multiple value={filters.group_by.split(",").filter(Boolean)} onChange={(event) => setFilters({ ...filters, group_by: [...event.target.selectedOptions].map((option) => option.value).join(",") })}><option value="course">课程</option><option value="class">班级</option><option value="session">课堂</option><option value="emoji_type">情绪</option><option value="source">来源</option></select></label>
      <label>时间粒度<select value={filters.bucket} onChange={(event) => setFilters({ ...filters, bucket: event.target.value })}><option value="">不分桶</option><option value="hour">每小时</option><option value="day">每天</option></select></label>
      <label>来源<select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })}><option value="">全部来源</option><option value="MANUAL">学生主动</option><option value="AI">AI 匿名</option></select></label>
      <label>开始<input type="datetime-local" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
      <label>结束<input type="datetime-local" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
      <button className="primary">生成统计</button>
    </form>
    {loading ? <Loading /> : <>
      <section className="stat-grid"><StatCard label="记录总数" value={data?.total_records || 0} /><StatCard label="学生主动" value={data?.manual_records || 0} tone="blue" /><StatCard label="AI 匿名" value={data?.ai_records || 0} tone="purple" /><StatCard label="参与学生" value={data?.student_count || 0} tone="amber" /></section>
      {!data?.groups.length ? <Empty /> : <section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-title"><h2>分组记录量</h2><span>{data.groups.length} 个分组</span></div><Chart option={chart} height={380} /></article><article className="panel chart-panel"><div className="panel-title"><h2>情绪占比</h2><span>当前筛选</span></div><Chart option={pie} height={380} /></article></section>}
      {data?.groups.length ? <section className="panel table-panel"><div className="panel-title"><h2>统计明细</h2><span>占比相对于当前筛选结果</span></div><div className="table-scroll"><table><thead><tr><th>分组</th><th>记录数</th><th>占比</th><th>人工</th><th>AI</th><th>学生数</th></tr></thead><tbody>{data.groups.map((group, index) => <tr key={index}><td>{[group.course, group.class, group.session, group.emoji_type, group.source, group.period].filter(Boolean).join(" · ") || "全部"}</td><td>{group.record_count}</td><td>{group.percentage.toFixed(1)}%</td><td>{group.manual_count}</td><td>{group.ai_count}</td><td>{group.student_count}</td></tr>)}</tbody></table></div></section> : null}
    </>}
  </>;
}
