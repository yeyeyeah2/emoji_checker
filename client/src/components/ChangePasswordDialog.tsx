import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../viewmodels/AuthProvider';
import { Button } from './Button';
import { Field } from './Field';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('请输入当前密码。');
      return;
    }
    if (newPassword.length < 12) {
      setError('新密码至少需要 12 位。');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致。');
      return;
    }
    if (newPassword === currentPassword) {
      setError('新密码不能与当前密码相同。');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('密码已修改，请使用新密码重新登录。');
      onClose();
      navigate('/login', { replace: true });
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="修改密码"
      description="修改成功后，当前登录令牌会立即失效，需要重新登录。"
      onClose={onClose}
    >
      <form className="stack-form" onSubmit={handleSubmit}>
        <Field label="当前密码" htmlFor="current-password" required>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoFocus
          />
        </Field>
        <Field label="新密码" htmlFor="new-password" hint="12–128 位" required>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="确认新密码" htmlFor="confirm-password" required>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-banner-icon" aria-hidden="true">
              !
            </span>
            <p>{error}</p>
          </div>
        )}

        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button type="submit" loading={submitting}>
            更新密码
          </Button>
        </div>
      </form>
    </Modal>
  );
}
