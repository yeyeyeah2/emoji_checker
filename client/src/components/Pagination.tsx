interface PaginationProps {
  total: number;
  pageIndex: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({
  total,
  pageIndex,
  pageCount,
  hasPrevious,
  hasNext,
  disabled = false,
  onPrevious,
  onNext,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="pagination">
      <p>
        第 <strong>{pageIndex}</strong> / {pageCount} 页 · 共 <strong>{total}</strong> 条
      </p>
      <div className="pagination-actions">
        <button
          type="button"
          className="pager-button"
          onClick={onPrevious}
          disabled={!hasPrevious || disabled}
        >
          上一页
        </button>
        <button type="button" className="pager-button" onClick={onNext} disabled={!hasNext || disabled}>
          下一页
        </button>
      </div>
    </div>
  );
}
