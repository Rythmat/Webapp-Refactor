import type { FC } from 'react';
import type { RoadmapJump, SongSection } from '@/curriculum/types/songLibrary';
import {
  clearRoadmap,
  fitIntoSystem,
  flagState,
  isOwnSystem,
  setBarValue,
  setEnding,
  sharedValue,
  toggleBarFlag,
  type BarFlag,
} from '@/lib/chartEditor/roadmapOps';
import type { BarRef } from '@/lib/chartEditor/selection';

/**
 * Everything a bar can say about how the chart is read, and nowhere to say it
 * until now.
 *
 * `ChordBar` has had repeat barlines, volta brackets, a segno, a coda, D.S.
 * and D.C. jumps, Fine, fermatas, cues and mid-song key changes since the
 * schema was written, and the back office could edit none of them — which is
 * the whole reason 613 of 640 charts are flat. The operations themselves are
 * in `lib/chartEditor/roadmapOps`, pure and shared; this is the panel.
 *
 * Everything works on the selection rather than on one bar, because that is
 * how the marks are used: four bars are the first ending, not one. A toggle
 * that is on for every selected bar turns them all off, and a field over a
 * mixed selection shows empty rather than lying about a shared value.
 */

const FLAGS: Array<{ flag: BarFlag; label: string; hint: string }> = [
  { flag: 'repeatStart', label: '‖:', hint: 'Start repeat' },
  { flag: 'repeatEnd', label: ':‖', hint: 'End repeat' },
  { flag: 'segno', label: '𝄋', hint: 'Segno — where a D.S. jumps back to' },
  { flag: 'coda', label: '𝄌', hint: 'Coda sign' },
  { flag: 'toCoda', label: 'To ⌖', hint: 'To Coda at the end of this bar' },
  { flag: 'fine', label: 'Fine', hint: 'The song ends here after a jump' },
  { flag: 'fermata', label: '𝄐', hint: 'Fermata — hold' },
];

const JUMPS: RoadmapJump[] = [
  'D.C.',
  'D.S.',
  'D.C. al Coda',
  'D.S. al Coda',
  'D.C. al Fine',
  'D.S. al Fine',
];

const ENDINGS: Array<{ passes: number[]; label: string }> = [
  { passes: [1], label: '1.' },
  { passes: [2], label: '2.' },
  { passes: [3], label: '3.' },
  { passes: [1, 2], label: '1, 2.' },
];

const PILL =
  'rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40';
const ON = 'border-[#7ecfcf]/60 bg-[#7ecfcf]/15 text-[#7ecfcf]';
const OFF = 'border-white/15 text-white/60 hover:border-white/35';
const FIELD =
  'w-full rounded border border-white/15 bg-transparent px-2 py-1 text-xs text-white/80 outline-none focus:border-white/35';

export const BarInspector: FC<{
  sections: SongSection[];
  refs: BarRef[];
  onChange: (next: SongSection[], label: string) => void;
}> = ({ sections, refs, onChange }) => {
  const n = refs.length;
  if (n === 0)
    return (
      <p className="text-xs text-white/35">
        Click a bar&apos;s staff to select it. Shift-click for a run, or ⌘-click
        to add one.
      </p>
    );

  const currentEnding = sections[refs[0].section]?.bars[refs[0].bar]?.ending;
  const sameEnding = (passes: number[]) =>
    !!currentEnding && currentEnding.join() === passes.join();

  const toggle = (flag: BarFlag, hint: string) =>
    onChange(toggleBarFlag(sections, refs, flag), hint);

  const value = <K extends 'cue' | 'keyChange' | 'jump' | 'repeatTimes'>(
    field: K,
  ) => sharedValue(sections, refs, field);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/45">
          {n === 1 ? 'Bar' : `${n} bars`}
        </span>
        <button
          type="button"
          className="text-[11px] text-white/35 hover:text-white/70"
          onClick={() => onChange(clearRoadmap(sections, refs), 'Clear marks')}
        >
          Clear marks
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FLAGS.map(({ flag, label, hint }) => (
          <button
            key={flag}
            type="button"
            title={hint}
            aria-pressed={flagState(sections, refs, flag)}
            className={`${PILL} ${flagState(sections, refs, flag) ? ON : OFF}`}
            onClick={() => toggle(flag, hint)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* A volta covers the bars it is on, so this is a property of the
          selection and not of one bar. */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-white/35">Ending</span>
        {ENDINGS.map(({ passes, label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={sameEnding(passes)}
            className={`${PILL} ${sameEnding(passes) ? ON : OFF}`}
            onClick={() =>
              onChange(
                setEnding(sections, refs, sameEnding(passes) ? [] : passes),
                `Ending ${label}`,
              )
            }
          >
            {label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-white/35">
          Cue — &ldquo;Break&rdquo;, &ldquo;Solo&rdquo;, &ldquo;Repeat and
          Fade&rdquo;. Never lyrics.
        </span>
        <input
          className={FIELD}
          value={value('cue') ?? ''}
          placeholder={n > 1 ? '—' : ''}
          onChange={(e) =>
            onChange(
              setBarValue(sections, refs, 'cue', e.target.value),
              'Set cue',
            )
          }
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/35">Key change</span>
          <input
            className={FIELD}
            value={value('keyChange') ?? ''}
            placeholder="A♭ major"
            onChange={(e) =>
              onChange(
                setBarValue(sections, refs, 'keyChange', e.target.value),
                'Set key change',
              )
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/35">Metre</span>
          <input
            className={FIELD}
            defaultValue={(
              sharedValue(sections, refs, 'timeSignature') ?? []
            ).join('/')}
            placeholder="5/4"
            onBlur={(e) => {
              const [beats, unit] = e.target.value.split('/').map(Number);
              onChange(
                setBarValue(
                  sections,
                  refs,
                  'timeSignature',
                  beats > 0 && unit > 0 ? [beats, unit] : undefined,
                ),
                'Set metre',
              );
            }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/35">Jump</span>
          <select
            className={FIELD}
            value={value('jump') ?? ''}
            onChange={(e) =>
              onChange(
                setBarValue(
                  sections,
                  refs,
                  'jump',
                  (e.target.value || undefined) as RoadmapJump | undefined,
                ),
                'Set jump',
              )
            }
          >
            <option value="" className="bg-[#161618]">
              —
            </option>
            {JUMPS.map((j) => (
              <option key={j} value={j} className="bg-[#161618]">
                {j}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/35">
            Times played (a plain repeat is twice)
          </span>
          <input
            className={FIELD}
            type="number"
            min={2}
            max={20}
            value={value('repeatTimes') ?? ''}
            onChange={(e) =>
              onChange(
                setBarValue(
                  sections,
                  refs,
                  'repeatTimes',
                  e.target.value ? Number(e.target.value) : undefined,
                ),
                'Set repeat count',
              )
            }
          />
        </label>
      </div>

      {/* Layout, not roadmap — these change where the line ends, not how the
          chart is played, which is why Clear marks leaves them alone. */}
      <div className="flex flex-wrap items-center gap-1 border-t border-white/10 pt-2">
        <span className="mr-1 text-[11px] text-white/35">Layout</span>
        <button
          type="button"
          title="This bar starts a new system"
          aria-pressed={flagState(sections, refs, 'systemBreak')}
          className={`${PILL} ${flagState(sections, refs, 'systemBreak') ? ON : OFF}`}
          onClick={() => toggle('systemBreak', 'System break')}
        >
          Break here
        </button>
        <button
          type="button"
          title="These bars are one system, however many they are"
          aria-pressed={isOwnSystem(sections, refs)}
          disabled={refs.some((r) => r.section !== refs[0].section)}
          className={`${PILL} ${isOwnSystem(sections, refs) ? ON : OFF}`}
          onClick={() =>
            onChange(fitIntoSystem(sections, refs), 'Fit into system')
          }
        >
          Fit into one system
        </button>
      </div>
    </div>
  );
};
