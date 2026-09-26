/**
 * SnapshotRepairBadge — the visible half of Rule 1's fail-soft read path.
 *
 * When a stored snapshot carries a teacher-only key, the read path strips it
 * and renders anyway rather than blanking the lesson mid-class. That repair
 * must never be silent: the teacher needs to know the stored lesson is
 * malformed so it can be re-published, even though today's class is fine.
 *
 * Deliberately NOT rendered on the projector or a student device — the repair
 * is a teacher-facing maintenance signal, and the projected board must stay
 * clean for the class. Those surfaces report to telemetry only.
 */
import { ShieldAlert } from 'lucide-react';

interface SnapshotRepairBadgeProps {
  /** Dot-paths removed from the snapshot; the badge hides when empty. */
  stripped: string[];
  className?: string;
}

export const SnapshotRepairBadge = ({
  stripped,
  className,
}: SnapshotRepairBadgeProps) => {
  if (stripped.length === 0) return null;
  const count = stripped.length;
  return (
    <span
      role="status"
      title={`Removed before display: ${stripped.join(', ')}. Re-publish this lesson from the Day editor to clear this.`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200 ${className ?? ''}`}
    >
      <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Lesson repaired — {count} teacher-only {count === 1 ? 'field' : 'fields'}{' '}
      removed
    </span>
  );
};
