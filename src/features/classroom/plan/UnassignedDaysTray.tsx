/**
 * "Not in a classroom" tray.
 *
 * Plan schema v2 gives every Day a `classroomId`. Days the migration could not
 * confidently place — no Unit referenced them and the teacher has more than one
 * classroom — are left `null` rather than guessed at.
 *
 * They have to be VISIBLE. The old behaviour was to let whichever classroom
 * rendered Lessons first silently adopt them, which is how a multi-section
 * teacher found last term's lessons attached to the wrong class. Showing them
 * here with an explicit "Move here" is the honest version of that: the teacher
 * places them, not a render-order race.
 */
import { FolderInput, Inbox } from 'lucide-react';
import type { Day } from '../types';

interface UnassignedDaysTrayProps {
  days: Day[];
  /** The classroom currently open — the destination for "Move here". */
  classroomId: string;
  onAdopt: (day: Day) => void;
  /** Hidden for viewers, who cannot change the plan. */
  canEdit: boolean;
}

export const UnassignedDaysTray = ({
  days,
  classroomId,
  onAdopt,
  canEdit,
}: UnassignedDaysTrayProps) => {
  if (days.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Inbox className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
        <span className="text-sm font-medium text-amber-100">
          {days.length} lesson{days.length === 1 ? '' : 's'} not in a classroom
        </span>
      </div>
      <p className="text-xs text-white/50">
        These were authored before lessons were scoped to a classroom, and there
        wasn&rsquo;t enough information to place them automatically. Nothing has
        been deleted — move each one to the classroom it belongs to.
      </p>
      <ul className="flex flex-col gap-2">
        {days.map((day) => (
          <li
            key={day.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-white/85">
              {day.label || 'Untitled Day'}
            </span>
            {day.scheduledDate && (
              <span className="shrink-0 text-xs text-white/40">
                {day.scheduledDate}
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => onAdopt({ ...day, classroomId })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
              >
                <FolderInput className="h-3.5 w-3.5" />
                Move here
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
