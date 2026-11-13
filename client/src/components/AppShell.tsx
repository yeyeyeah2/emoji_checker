import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isMockEnabled } from '../api/client';
import { homePathFor, useAuth } from '../viewmodels/AuthProvider';
import { Brand } from './Brand';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { useToast } from './Toast';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: '学生',
  TEACHER: '教师',
  ADMIN: '管理员',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.info('已退出登录。');
    navigate('/login', { replace: true });
  };

  const home = user ? homePathFor(user.role) : '/login';
  const initial = user?.username.slice(0, 1).toUpperCase() ?? '?';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to={home} className="brand-link" aria-label="返回首页">
            <Brand />
          </Link>

          <div className="header-actions">
            {isMockEnabled() && <span className="mock-badge">演示数据</span>}
            {user && <span className={`role-badge role-${user.role.toLowerCase()}`}>{ROLE_LABELS[user.role] ?? user.role}</span>}
            {user && (
              <span className="user-chip" title={user.email}>
                <span className="avatar" aria-hidden="true">
                  {initial}
                </span>
                <span className="user-name">{user.username}</span>
              </span>
            )}
            <button type="button" className="header-button" onClick={() => setPasswordOpen(true)}>
              修改密码
            </button>
            <button type="button" className="header-button header-button-quiet" onClick={handleLogout}>
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>Emoji Checker · 表情符号课堂情绪检查器</span>
        <span>软件工程实践 · 客户端</span>
      </footer>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
