import type { ProgressCounts } from '../class/assignmentState';

/**
 * Done, started and not yet, as one thin stacked bar: green for done, amber
 * for started, the track for the rest. Its words are its label.
 */
export const ProgressBar = ({
  counts,
  className,
}: {
  counts: ProgressCounts;
  className?: string;
}) => {
  const pct = (n: number) => (counts.total ? (n / counts.total) * 100 : 0);
  return (
    <div
      role="img"
      aria-label={`${counts.done} of ${counts.total} done, ${counts.started} started`}
      className={`flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08] ${className ?? ''}`}
    >
      <span
        className="h-full bg-emerald-400/80"
        style={{ width: `${pct(counts.done)}%` }}
      />
      <span
        className="h-full bg-amber-300/70"
        style={{ width: `${pct(counts.started)}%` }}
      />
    </div>
  );
};
