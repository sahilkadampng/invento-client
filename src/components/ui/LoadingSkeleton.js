'use client';

export default function LoadingSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-4 flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="skeleton h-8 flex-1" style={{ animationDelay: `${(i * columns + j) * 0.05}s` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-8 rounded-lg" />
      </div>
      <div className="skeleton h-8 w-32 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-32 mb-4" />
      <div className="skeleton h-64 w-full rounded-lg" />
    </div>
  );
}
