import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>;
}

export function StatCard({ label, value, hint, tone = "teal" }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

export function Empty({ children = "暂无数据" }: { children?: ReactNode }) {
  return <div className="empty"><span>◌</span><p>{children}</p></div>;
}

export function Loading() {
  return <div className="loading" aria-label="加载中"><span /><span /><span /></div>;
}

export function ErrorBanner({ message }: { message?: string }) {
  return message ? <div className="error-banner" role="alert">{message}</div> : null;
}

export const emojiMeta = {
  HAPPY: { glyph: "😄", label: "开心", color: "#10b981" },
  SAD: { glyph: "😢", label: "难过", color: "#3b82f6" },
  ANGRY: { glyph: "😠", label: "生气", color: "#ef4444" },
  FEARFUL: { glyph: "😨", label: "害怕", color: "#8b5cf6" },
  SURPRISED: { glyph: "😮", label: "惊讶", color: "#f59e0b" },
  NEUTRAL: { glyph: "😐", label: "平静", color: "#64748b" },
} as const;

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function toLocalInput(value?: string) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
