/**
 * The strip a lesson done with the class wears at the top of the Studio
 * (owner, 2026-11-10): whose pace it keeps and where the class is. A student
 * sees "Following your teacher · Step 4 of 12", then "Done. Wait for your
 * teacher." once the class's step is finished; the teacher, leading, sees
 * how many have finished it.
 */
import { Users } from 'lucide-react';

export function ClassFollowBar({
  leading,
  step,
  total,
  waiting,
  doneCount,
}: {
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
      className="fixed left-1/2 top-3 z-[1] flex -translate-x-1/2 items-center gap-2 rounded-full border border-daw-edge bg-daw-pill px-4 py-1.5 text-[0.8125rem] text-daw-text shadow-lg"
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
