export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        😊
      </span>
      <span className="brand-text">
        <strong>Emoji Checker</strong>
        {!compact && <small>课堂情绪检查器</small>}
      </span>
    </div>
  );
}
