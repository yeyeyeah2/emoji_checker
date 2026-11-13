import { useCallback, useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";

import { request, websocketUrl } from "../api";
import { useAuth } from "../auth";
import Chart from "../components/Chart";
import { Empty, ErrorBanner, Loading, PageHeader, StatCard, emojiMeta, formatTime } from "../components/Ui";
import type { ClassSession, Course, Dashboard, EmojiType, Page } from "../types";

const emojiTypes = Object.keys(emojiMeta) as EmojiType[];

export default function DashboardPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBase = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [coursePage, sessionPage] = await Promise.all([
        request<Page<Course>>("/courses?limit=100", {}, token),
        request<Page<ClassSession>>("/sessions?limit=100", {}, token),
      ]);
      setCourses(coursePage.data);
      setSessions(sessionPage.data);
      const firstActive = sessionPage.data.find((item) => item.status === "SCHEDULED");
      setSessionId((current) => current || firstActive?.id || sessionPage.data[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载课堂失败");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!sessionId || !token) return;
    let socket: WebSocket | undefined;
    let stopped = false;
    let retryTimer = 0;

    const connect = async () => {
      try {
        const snapshot = await request<{ data: Dashboard }>(`/dashboard/realtime?session_id=${sessionId}`, {}, token);
        if (!stopped) setData(snapshot.data);
      } catch (reason) {
        if (!stopped) setError(reason instanceof Error ? reason.message : "看板读取失败");
      }
      if (stopped) return;
      socket = new WebSocket(websocketUrl(`/ws/dashboard?session_id=${sessionId}`), ["bearer", token]);
      socket.onopen = () => { setConnected(true); setError(""); };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as { type: string; data: Dashboard };
        if (message.type === "dashboard.snapshot") setData(message.data);
      };
      socket.onerror = () => setConnected(false);
      socket.onclose = (event) => {
        setConnected(false);
        if (!stopped && ![4401, 4403].includes(event.code)) retryTimer = window.setTimeout(connect, 3000);
      };
    };
    void connect();
    return () => { stopped = true; clearTimeout(retryTimer); socket?.close(); };
  }, [sessionId, token]);

  const totals = useMemo(() => {
    const manual = emojiTypes.reduce((sum, key) => sum + (data?.counts.manual[key] || 0), 0);
    const ai = emojiTypes.reduce((sum, key) => sum + (data?.counts.ai[key] || 0), 0);
    return { manual, ai, all: manual + ai };
  }, [data]);

  const distribution = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    color: emojiTypes.map((key) => emojiMeta[key].color),
    series: [{
      name: "情绪分布", type: "pie", radius: ["46%", "72%"], center: ["50%", "44%"],
      label: { formatter: "{b} {d}%" },
      data: emojiTypes.map((key) => ({ name: `${emojiMeta[key].glyph} ${emojiMeta[key].label}`, value: (data?.counts.manual[key] || 0) + (data?.counts.ai[key] || 0) })),
    }],
  }), [data]);

  const trend = useMemo<EChartsOption>(() => {
    const points = [...new Set((data?.trend || []).map((item) => item.minute))].sort();
    return {
      tooltip: { trigger: "axis" },
      legend: { bottom: 0 },
      grid: { left: 40, right: 20, top: 30, bottom: 55 },
      xAxis: { type: "category", data: points.map((value) => new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })) },
      yAxis: { type: "value", minInterval: 1 },
      color: emojiTypes.map((key) => emojiMeta[key].color),
      series: emojiTypes.map((key) => ({
        name: `${emojiMeta[key].glyph} ${emojiMeta[key].label}`, type: "line", smooth: true, symbol: "none", stack: "total", areaStyle: { opacity: 0.08 },
        data: points.map((minute) => (data?.trend || []).filter((item) => item.minute === minute && item.emoji_type === key).reduce((sum, item) => sum + item.count, 0)),
      })),
    };
  }, [data]);

  const selected = sessions.find((item) => item.id === sessionId);
  const course = courses.find((item) => item.id === selected?.course_id);

  return <>
    <PageHeader title="实时课堂情绪" description="汇总最近 30 分钟的人工反馈与匿名 AI 识别结果" actions={<div className="live-status"><span className={connected ? "online" : "offline"} />{connected ? "实时连接" : "正在重连"}</div>} />
    <ErrorBanner message={error} />
    <section className="toolbar panel">
      <label>当前课堂<select value={sessionId} onChange={(event) => setSessionId(event.target.value)}><option value="">请选择课堂</option>{sessions.map((item) => <option key={item.id} value={item.id}>{courses.find((entry) => entry.id === item.course_id)?.code || "课程"} · {item.class_name} · {formatTime(item.starts_at)}</option>)}</select></label>
      {selected && <div className="session-summary"><strong>{course?.name}</strong><span>{selected.class_name}</span><span>{formatTime(selected.starts_at)} — {formatTime(selected.ends_at)}</span></div>}
    </section>
    {loading ? <Loading /> : !sessionId ? <Empty>请先在“课程课堂”中创建课堂</Empty> : <>
      <section className="stat-grid">
        <StatCard label="近 30 分钟记录" value={totals.all} hint="人工与 AI 合计" />
        <StatCard label="学生主动反馈" value={totals.manual} hint={totals.all ? `${Math.round(totals.manual / totals.all * 100)}%` : "暂无记录"} tone="blue" />
        <StatCard label="AI 匿名识别" value={totals.ai} hint={totals.all ? `${Math.round(totals.ai / totals.all * 100)}%` : "暂无记录"} tone="purple" />
        <StatCard label="最近更新" value={data ? new Date(data.generated_at).toLocaleTimeString("zh-CN") : "--"} hint="每 5 秒刷新" tone="amber" />
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel"><div className="panel-title"><h2>情绪趋势</h2><span>分钟级</span></div>{data?.trend.length ? <Chart option={trend} /> : <Empty />}</article>
        <article className="panel chart-panel"><div className="panel-title"><h2>情绪分布</h2><span>全部来源</span></div>{totals.all ? <Chart option={distribution} /> : <Empty />}</article>
      </section>
      <section className="emoji-strip panel">{emojiTypes.map((key) => <div key={key}><span>{emojiMeta[key].glyph}</span><strong>{(data?.counts.manual[key] || 0) + (data?.counts.ai[key] || 0)}</strong><small>{emojiMeta[key].label}</small></div>)}</section>
    </>}
  </>;
}
