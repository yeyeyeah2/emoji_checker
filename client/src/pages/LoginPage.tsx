import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { isMockEnabled } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../components/Toast';
import { homePathFor, useAuth } from '../viewmodels/AuthProvider';

export function LoginPage() {
  const { status, user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return <PageLoader label="正在恢复登录状态…" />;
  if (status === 'authenticated' && user) return <Navigate to={homePathFor(user.role)} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('请输入用户名或邮箱。');
      return;
    }
    if (!password) {
      setError('请输入密码。');
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = await login({ identifier: identifier.trim(), password });
      toast.success(`欢迎回来，${currentUser.username}`);
      navigate(homePathFor(currentUser.role), { replace: true });
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      sideTitle="让每一节课的情绪，都有迹可循。"
      sideText="学生用表情记录当下感受，教师用真实数据看见课堂。简单一点，也更真诚一点。"
    >
      <div className="auth-head">
        <p className="eyebrow">欢迎回来</p>
        <h2>登录 Emoji Checker</h2>
        <p className="auth-subtitle">使用用户名或邮箱继续。</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <Field label="用户名或邮箱" htmlFor="identifier" required>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="student 或 student@example.com"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoFocus
          />
        </Field>

        <Field label="密码" htmlFor="password" required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="输入登录密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {error && (
          <div className="form-alert" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        <Button type="submit" block loading={submitting}>
          登录
        </Button>
      </form>

      <p className="auth-switch">
        还没有账号？<Link to="/register">创建一个</Link>
      </p>

      {isMockEnabled() && (
        <div className="demo-hint">
          <strong>演示模式</strong>
          <p>
            学生：<code>student</code> / <code>student12345</code>
          </p>
          <p>
            教师：<code>teacher</code> / <code>teacher12345</code>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
