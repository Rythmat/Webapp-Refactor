import type { CheckInStyle, CortexLessonChoices } from '../cortex/types';
import { EYEBROW, FIELD, PANEL } from './wizardStyles';

/**
 * The lesson's small settings, beside the preview: how students check in,
 * whether the mood poll runs, and how long Individual Project time is.
 */

export type CortexOptionValues = Pick<
  CortexLessonChoices,
  'checkInStyle' | 'vibePoll' | 'projectMinutes'
>;

const STYLES: { value: CheckInStyle; label: string }[] = [
  { value: 'emoji', label: 'Emoji' },
  { value: 'scale', label: '1 to 5' },
  { value: 'word', label: 'One word' },
];

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
  <section className={`${PANEL} flex flex-col gap-4 p-4`}>
    <div className="flex flex-col gap-2">
      <span className={EYEBROW}>Check-in</span>
      <div
        role="group"
        aria-label="Check-in style"
        className="inline-flex w-fit items-center gap-0.5 rounded-full border border-white/10 p-0.5"
      >
        {STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={value.checkInStyle === s.value}
            onClick={() => onChange({ ...value, checkInStyle: s.value })}
            className={`h-8 rounded-full px-3 text-sm transition-colors ${
              value.checkInStyle === s.value
                ? 'bg-white text-[#101012]'
                : 'text-white/55 hover:text-[#e8e8f0]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
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

    <label className="flex flex-col gap-2">
      <span className={EYEBROW}>Individual Project time</span>
      <select
        value={value.projectMinutes}
        onChange={(e) =>
          onChange({ ...value, projectMinutes: Number(e.target.value) })
        }
        className={`${FIELD} w-fit`}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m} minutes
          </option>
        ))}
      </select>
    </label>
  </section>
);
