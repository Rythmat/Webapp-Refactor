import { cn } from '@/lib/utils';

export interface Segment {
  key: string;
  count: number;
  /** A colour class (an era's, `bg-atlas-era-…`) or, else, `color`. */
  className?: string;
  color?: string;
  label: string;
}

/**
 * Shares of a whole as one thin bar (a stop's events by era), growing in
 * from the left. The shares are said in words for readers.
 */
export function StackedBar({
  segments,
  label,
}: {
  segments: Segment[];
  label: string;
}) {
  const total = segments.reduce((n, s) => n + s.count, 0);
  if (total === 0) return null;
  const words = segments
    .map((s) => `${s.label} ${Math.round((s.count / total) * 100)}%`)
    .join(', ');
  return (
    <div
      aria-label={`${label}: ${words}`}
      className="atlas-grow-x flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
      role="img"
    >
      {segments.map((s) => (
        <span
          key={s.key}
          className={cn('h-full', s.className)}
          style={{
            width: `${(s.count / total) * 100}%`,
            backgroundColor: s.className ? undefined : s.color,
          }}
        />
      ))}
    </div>
  );
}
