/**
 * SeedApplyDialog — the "Apply seed to a day" flow for the This-Month panel.
 * Pick a target (a new Day, or an existing Day in the unit); if the target is
 * already populated, choose Merge (fill empty cells) / Replace / Cancel. On an
 * existing Day, a toast offers one Undo (restores the pre-apply snapshot).
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { applySeedToDay, isDayPopulated } from '../content/applySeed';
import { useActivityBank } from '../content/hooks';
import type { LessonSeed } from '../content/types';
import { newBlankDay } from '../plan/newBlankDay';
import { useLocalPlan } from '../plan/useLocalPlan';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import type { Day } from '../types';

interface SeedApplyDialogProps {
  seed: LessonSeed;
  unitDays: Day[];
  onNewDay: (dayId: string) => void;
  suggestSchedule: () => string | null;
  onClose: () => void;
}

export const SeedApplyDialog = ({
  seed,
  unitDays,
  onNewDay,
  suggestSchedule,
  onClose,
}: SeedApplyDialogProps) => {
  const { getDay, saveDay } = useLocalPlan();
  const { byId } = useActivityBank();
  const { config } = useTeacherConfig();
  const [targetId, setTargetId] = useState<string>('new');

  const targetDay = targetId === 'new' ? null : (getDay(targetId) ?? null);
  const populated = targetDay ? isDayPopulated(targetDay) : false;

  const apply = (mode: 'merge' | 'replace') => {
    const before = targetDay
      ? (structuredClone(targetDay) as Day)
      : null;
    const base: Day = targetDay ?? {
      ...newBlankDay(),
      scheduledDate: suggestSchedule(),
    };
    const result = applySeedToDay(seed, base, {
      mode,
      resolveActivityId: byId,
      config: {
        localContextMode: config.localContextMode,
        tenantLocalContext: config.tenantLocalContext,
      },
    });
    saveDay(result);
    if (!targetDay) onNewDay(result.id);
    toast.success(`Applied "${seed.title.en}"`, {
      action: before
        ? { label: 'Undo', onClick: () => saveDay(before) }
        : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Apply seed
          </span>
          <h3 className="text-lg font-medium text-white">{seed.title.en}</h3>
        </div>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Target day
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="new">✦ New Day</option>
            {unitDays.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        {populated ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-amber-300/80">
              This day already has content. Merge fills only empty cells;
              Replace overwrites (keeps any live-session interactions).
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => apply('replace')}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-white/30 hover:text-white"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => apply('merge')}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/85"
              >
                Merge
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => apply('merge')}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/85"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
