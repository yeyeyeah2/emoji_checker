import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { PageLoader } from '../components/Feedback';
import { useToast } from '../components/Toast';
import { homePathFor, useAuth } from '../viewmodels/AuthProvider';

type RegisterRole = 'STUDENT' | 'TEACHER';

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  const { status, user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState<RegisterRole>('STUDENT');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return <PageLoader label="正在准备注册…" />;
  if (status === 'authenticated' && user) return <Navigate to={homePathFor(user.role)} replace />;

  const clearError = (field: keyof FormErrors) => {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!USERNAME_PATTERN.test(username.trim())) {
      next.username = '用户名需为 3–64 位字母、数字、下划线、点或短横线。';
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = '请输入有效的邮箱地址。';
    }
    if (password.length < 12 || password.length > 128) {
      next.password = '密码长度需为 12–128 位。';
    }
    if (confirmPassword !== password) {
      next.confirmPassword = '两次输入的密码不一致。';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const currentUser = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      });
      toast.success(`账号创建成功，欢迎你，${currentUser.username}`);
      navigate(homePathFor(currentUser.role), { replace: true });
    } catch (caught) {
      setFormError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      sideTitle="从一次简单的情绪打卡开始。"
      sideText="创建学生或教师账号，加入课堂情绪的实时反馈闭环。所有密码均经过后端加盐哈希存储。"
    >
      <div className="auth-head">
        <p className="eyebrow">创建账号</p>
        <h2>加入 Emoji Checker</h2>
        <p className="auth-subtitle">选择你的身份，开始记录或查看课堂情绪。</p>
      </div>

      <div className="role-picker" role="radiogroup" aria-label="账号身份">
        <button
          type="button"
          role="radio"
          aria-checked={role === 'STUDENT'}
          className={`role-option${role === 'STUDENT' ? ' is-active' : ''}`}
          onClick={() => setRole('STUDENT')}
        >
          <span className="role-option-icon" aria-hidden="true">
            🎒
          </span>
          <span>
            <strong>学生</strong>
            <small>提交情绪、查看个人历史</small>
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={role === 'TEACHER'}
          className={`role-option${role === 'TEACHER' ? ' is-active' : ''}`}
          onClick={() => setRole('TEACHER')}
        >
          <span className="role-option-icon" aria-hidden="true">
            🧑‍🏫
          </span>
          <span>
            <strong>教师</strong>
            <small>查看课堂历史与基础统计</small>
          </span>
        </button>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <Field label="用户名" htmlFor="register-username" hint="3–64 位字母、数字、下划线、点或短横线" error={errors.username} required>
          <input
            id="register-username"
            type="text"
            autoComplete="username"
            placeholder="例如 zhang.san"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              clearError('username');
            }}
            autoFocus
          />
        </Field>

        <Field label="邮箱" htmlFor="register-email" error={errors.email} required>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
          />
        </Field>

        <Field label="密码" htmlFor="register-password" hint="至少 12 位" error={errors.password} required>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="设置一个 12 位以上的密码"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError('password');
            }}
          />
        </Field>

        <Field label="确认密码" htmlFor="register-confirm" error={errors.confirmPassword} required>
          <input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearError('confirmPassword');
            }}
          />
        </Field>

        {formError && (
          <div className="form-alert" role="alert">
            <span aria-hidden="true">!</span>
            <p>{formError}</p>
          </div>
        )}

        <Button type="submit" block loading={submitting}>
          创建 {role === 'STUDENT' ? '学生' : '教师'}账号
        </Button>
      </form>

      <p className="auth-switch">
        已经有账号？<Link to="/login">直接登录</Link>
      </p>
    </AuthShell>
  );
}
