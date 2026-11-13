import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../auth";

const links = [
  ["/dashboard", "实时看板", "◉"],
  ["/users", "用户管理", "人"],
  ["/courses", "课程课堂", "课"],
  ["/records", "情绪记录", "记"],
  ["/statistics", "多维统计", "析"],
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">☺</span>
          <div><strong>课堂情绪</strong><small>管理控制台</small></div>
        </div>
        <nav>
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>
              <span className="nav-icon">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user?.username.slice(0, 1).toUpperCase()}</div>
          <div className="user-copy"><strong>{user?.username}</strong><small>管理员</small></div>
          <button className="icon-button" onClick={logout} title="退出登录">↪</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
