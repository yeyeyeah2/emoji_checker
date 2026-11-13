import type { ReactNode } from 'react';
import { Brand } from './Brand';

export function PageLoader({ label = '正在加载…' }: { label?: string }) {
  return (
    <div className="page-loader">
      <Brand />
      <span className="spinner spinner-lg" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({
  icon = '🫧',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner-icon" aria-hidden="true">
        !
      </span>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="text-button" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton-row">
          <span className="skeleton skeleton-avatar" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line skeleton-line-short" />
          <span className="skeleton skeleton-pill" />
        </div>
      ))}
    </div>
  );
}
