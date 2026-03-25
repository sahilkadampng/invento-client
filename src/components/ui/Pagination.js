'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, hasNext, hasPrev } = pagination;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing page {page} of {totalPages} ({total} items)
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => hasPrev && onPageChange(page - 1)}
          disabled={!hasPrev}
          className="btn btn-ghost btn-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`btn btn-sm min-w-[36px] justify-center ${p === page ? 'btn-primary' : 'btn-ghost'}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => hasNext && onPageChange(page + 1)}
          disabled={!hasNext}
          className="btn btn-ghost btn-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
