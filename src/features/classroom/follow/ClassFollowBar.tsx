/**
 * The strip an activity done with the class wears at the top of its page,
 * the Studio, a Learn lesson or the Globe (owner, 2026-11-10): whose pace it keeps and where the class is. A student
 * sees "Following your teacher · Step 4 of 12", then "Done. Wait for your
 * teacher." once the class's step is finished; the teacher, leading, sees
 * how many have finished it.
 */
import { Users } from 'lucide-react';

/** Where on the page: clear of each player's own controls. */
const PLACEMENT = {
  top: 'top-3',
  bottom: 'bottom-4',
  // Over the Globe's bottom rail (Explore · Connections · Tours) and timeline.
  aboveRail: 'bottom-24',
} as const;

export function ClassFollowBar({
  placement = 'top',
  leading,
  step,
  total,
  waiting,
  doneCount,
}: {
  /** Top of the page (the Studio), or its foot where a lesson keeps its
   *  progress along the top. */
  placement?: 'top' | 'bottom' | 'aboveRail';
  leading: boolean;
  step: number;
  total: number;
  waiting: boolean;
  doneCount: number;
}) {
  const where = total > 0 ? `Step ${step + 1} of ${total}` : `Step ${step + 1}`;
  return (
    <div
      role="status"
      aria-live="polite"
      data-class-follow=""
      style={{ pointerEvents: 'auto' }}
      className={`fixed left-1/2 ${PLACEMENT[placement]} z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-daw-edge bg-daw-pill px-4 py-1.5 text-[0.8125rem] text-daw-text shadow-lg`}
    >
      <Users aria-hidden className="size-4 text-daw-text-3" />
      <span className="font-bold">
        {leading ? 'Leading the class' : 'Following your teacher'}
      </span>
      <span className="text-daw-text-3">· {where}</span>
      {leading && doneCount > 0 && (
        <span className="text-daw-text-3">· {doneCount} done</span>
      )}
      {!leading && waiting && (
        <span className="text-daw-text-2">· Done. Wait for your teacher.</span>
      )}
    </div>
  );
}
