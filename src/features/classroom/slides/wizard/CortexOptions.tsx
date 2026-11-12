import { MICRO_LABEL } from '@/components/kit';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { OFFICE_CARD } from '@/features/office/ui/styles';
import {
  FEELINGS_LEVELS,
  FEELINGS_LEVEL_HINT,
  FEELINGS_LEVEL_LABEL,
} from '../../feelings/feelings';
import type { CortexLessonChoices } from '../cortex/types';

/**
 * The lesson's small settings, beside the preview: how students check in,
 * whether the mood poll runs, and how long Individual Project time is.
 */

export type CortexOptionValues = Pick<
  CortexLessonChoices,
  'checkInLevel' | 'vibePoll' | 'projectMinutes'
>;

const LEVELS = FEELINGS_LEVELS.map((value) => ({
  value,
  label: FEELINGS_LEVEL_LABEL[value],
}));

const MINUTES = [10, 15, 20, 25, 30];

export const CortexOptions = ({
  value,
  onChange,
  vibes,
}: {
  value: CortexOptionValues;
  onChange: (next: CortexOptionValues) => void;
  /** The focus's vibes; the poll needs two to choose between. */
  vibes: readonly string[];
}) => (
  <section className={`${OFFICE_CARD} flex flex-col gap-4 p-4`}>
    <div className="flex flex-col gap-2">
      <span className={MICRO_LABEL}>Feelings check-in</span>
      <Segmented
        label="Feelings check-in level"
        value={value.checkInLevel}
        onValueChange={(checkInLevel) => onChange({ ...value, checkInLevel })}
        options={LEVELS}
        className="w-fit"
      />
      <p className="text-[0.8125rem] text-white/55">
        {FEELINGS_LEVEL_HINT[value.checkInLevel]}
      </p>
    </div>

    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={value.vibePoll && vibes.length >= 2}
        disabled={vibes.length < 2}
        onChange={(e) => onChange({ ...value, vibePoll: e.target.checked })}
        className="size-4 accent-white"
      />
      <span className="flex flex-col">
        <span>Mood poll</span>
        <span className="text-xs text-white/55">
          {vibes.length >= 2
            ? `“Which sound matches your mood?” ${vibes.join(', ')}`
            : 'Not enough song vibes for this focus.'}
        </span>
      </span>
    </label>

    <div className="flex flex-col gap-2">
      <span className={MICRO_LABEL}>Individual Project time</span>
      <Select
        label="Individual Project time"
        value={String(value.projectMinutes)}
        onValueChange={(m) => onChange({ ...value, projectMinutes: Number(m) })}
        options={MINUTES.map((m) => ({
          value: String(m),
          label: `${m} minutes`,
        }))}
        className="w-fit"
      />
    </div>
  </section>
);
