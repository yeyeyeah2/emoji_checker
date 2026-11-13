import { type FormEvent, useState } from "react";

import { ApiError } from "../api";
import { useAuth } from "../auth";
import { ErrorBanner } from "../components/Ui";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(String(data.get("identifier")), String(data.get("password")));
      else await register(String(data.get("username")), String(data.get("email")), String(data.get("password")), String(data.get("inviteCode")));
    } catch (reason) {
      setError(reason instanceof ApiError || reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="visual-content">
          <span className="eyebrow">Emoji Classroom Pulse</span>
          <h1>看见课堂里的<br />每一种感受</h1>
          <p>实时汇总学生主动反馈与匿名 AI 情绪数据，让课堂节奏有迹可循。</p>
          <div className="emoji-orbit"><span>😄</span><span>😮</span><span>😐</span><span>😢</span></div>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-heading"><span className="brand-mark">☺</span><div><h2>{mode === "login" ? "欢迎回来" : "创建管理员"}</h2><p>{mode === "login" ? "登录课堂情绪管理控制台" : "需要后端配置的管理员邀请码"}</p></div></div>
          <div className="tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>管理员注册</button></div>
          <ErrorBanner message={error} />
          {mode === "login" ? (
            <label>用户名或邮箱<input name="identifier" autoComplete="username" required placeholder="admin@example.edu" /></label>
          ) : <>
            <label>用户名<input name="username" minLength={3} required placeholder="admin" /></label>
            <label>邮箱<input name="email" type="email" required placeholder="admin@example.edu" /></label>
          </>}
          <label>密码<input name="password" type="password" minLength={12} autoComplete={mode === "login" ? "current-password" : "new-password"} required placeholder="至少 12 个字符" /></label>
          {mode === "register" && <label>管理员邀请码<input name="inviteCode" type="password" required /></label>}
          <button className="primary wide" disabled={busy}>{busy ? "请稍候…" : mode === "login" ? "进入管理台" : "注册并进入"}</button>
          <small className="privacy-note">账号权限由后端 RBAC 强制校验；管理端不会保存原始人脸图像。</small>
        </form>
      </section>
    </div>
  );
}
