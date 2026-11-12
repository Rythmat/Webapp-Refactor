import { useState, type FC } from 'react';
import type { RoadmapJump, SongSection } from '@/curriculum/types/songLibrary';
import {
  clearRoadmap,
  endingLabelOf,
  fitIntoSystem,
  flagState,
  isOwnSystem,
  parseEnding,
  setBarValue,
  setEnding,
  sharedValue,
  toggleBarFlag,
  type BarFlag,
} from '@/lib/chartEditor/roadmapOps';
import type { BarRef } from '@/lib/chartEditor/selection';
import { CONSOLE_LABEL, consoleTabClass } from '../../ui/styles';

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

const PILL = (on: boolean) =>
  `${consoleTabClass(on, 'sm')} disabled:opacity-40`;
const FIELD =
  'w-full rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs text-white/80 outline-none focus:border-white/40';

/**
 * An ending in the chart's own words, typed: '4.', '1.–3.', '1, 2.'. The
 * numbers in it say which times through play the bars; the words are what
 * the bracket prints. Set on Enter or on leaving the field; emptied, the
 * bracket comes off.
 */
const EndingField: FC<{
  label: string;
  onSet: (passes: number[], words: string) => void;
}> = ({ label, onSet }) => {
  const [text, setText] = useState(label);
  const [wrong, setWrong] = useState(false);
  const commit = () => {
    if (text.trim() === label) return;
    if (!text.trim()) {
      setWrong(false);
      onSet([], '');
      return;
    }
    const parsed = parseEnding(text);
    setWrong(!parsed);
    if (parsed) onSet(parsed.passes, parsed.label);
  };
  return (
    <input
      aria-label="Ending, in the bracket's words"
      aria-invalid={wrong}
      className={`${FIELD} w-20 ${wrong ? 'border-red-400/60' : ''}`}
      value={text}
      placeholder="1.–3."
      title={
        wrong
          ? 'Say which times through with a number: 4., 1.–3., 1, 2.'
          : 'Any ending, as the bracket prints it: 4., 1.–3., 1, 2. The numbers say which times through play these bars.'
      }
      onChange={(e) => {
        setText(e.target.value);
        setWrong(false);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
};

export const BarInspector: FC<{
  sections: SongSection[];
  refs: BarRef[];
  onChange: (next: SongSection[], label: string) => void;
}> = ({ sections, refs, onChange }) => {
  const n = refs.length;
  if (n === 0)
    return (
      <p className="text-xs text-white/45">
        Click a bar&apos;s staff to select it. Shift-click for a run, or ⌘-click
        to add one.
      </p>
    );

  const firstBar = sections[refs[0].section]?.bars[refs[0].bar];
  const currentEnding = firstBar?.ending;
  const sameEnding = (passes: number[]) =>
    !!currentEnding && currentEnding.join() === passes.join();
  // The words over the bracket, when every selected bar has the same one.
  const sharedLabel = refs.every((r) => {
    const bar = sections[r.section]?.bars[r.bar];
    return (
      !!bar?.ending &&
      endingLabelOf(bar) === (firstBar ? endingLabelOf(firstBar) : '')
    );
  })
    ? endingLabelOf(firstBar ?? {})
    : '';

  const toggle = (flag: BarFlag, hint: string) =>
    onChange(toggleBarFlag(sections, refs, flag), hint);

  const value = <K extends 'cue' | 'keyChange' | 'jump' | 'repeatTimes'>(
    field: K,
  ) => sharedValue(sections, refs, field);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      <span className={CONSOLE_LABEL}>{n === 1 ? `Bar` : `${n} bars`}</span>

      <div className="flex flex-wrap gap-1">
        {FLAGS.map(({ flag, label, hint }) => (
          <button
            key={flag}
            type="button"
            title={hint}
            aria-pressed={flagState(sections, refs, flag)}
            className={PILL(flagState(sections, refs, flag))}
            onClick={() => toggle(flag, hint)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* A volta covers the bars it is on, so this is a property of the
          selection and not of one bar. */}
      <div className="flex items-center gap-1">
        <span className="text-white/45">Ending</span>
        {ENDINGS.map(({ passes, label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={sameEnding(passes)}
            className={PILL(sameEnding(passes))}
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
        {/* Any ending, in the chart's own words: '4.', '1.–3.'. */}
        <EndingField
          key={`${refs.map((r) => `${r.section}.${r.bar}`).join()}|${sharedLabel}`}
          label={sharedLabel}
          onSet={(passes, words) =>
            onChange(
              setEnding(sections, refs, passes, words),
              passes.length ? `Ending ${words}` : 'Remove ending',
            )
          }
        />
      </div>

      <label className="flex items-center gap-1">
        <span className="whitespace-nowrap text-white/45">Staff text</span>
        <input
          className={`${FIELD} w-32`}
          value={value('cue') ?? ''}
          placeholder={n > 1 ? '—' : 'Drum Fill'}
          title="Text over the staff at this bar: 'Drum Fill', 'Piano Only', 'Break'. Never lyrics."
          onChange={(e) =>
            onChange(
              setBarValue(sections, refs, 'cue', e.target.value),
              'Set staff text',
            )
          }
        />
      </label>

      <label className="flex items-center gap-1">
        <span className="text-white/45">Key</span>
        <input
          className={`${FIELD} w-24`}
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

      <label className="flex items-center gap-1">
        <span className="text-white/45">Metre</span>
        <input
          key={refs.map((r) => `${r.section}.${r.bar}`).join()}
          className={`${FIELD} w-14`}
          defaultValue={(
            sharedValue(sections, refs, 'timeSignature') ?? []
          ).join('/')}
          placeholder="5/4"
          title="Written on the staff from this bar on, as a chart engraves it"
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

      <label className="flex items-center gap-1">
        <span className="text-white/45">Jump</span>
        <select
          className={`${FIELD} w-28`}
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
          <option value="" className="bg-[#151518]">
            —
          </option>
          {JUMPS.map((j) => (
            <option key={j} value={j} className="bg-[#151518]">
              {j}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1">
        <span className="text-white/45">×</span>
        <input
          className={`${FIELD} w-12`}
          type="number"
          min={2}
          max={20}
          title="Times the passage is played. A plain repeat is twice."
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

      {/* Layout, not roadmap — these change where the line ends, not how the
          chart is played, which is why Clear marks leaves them alone. */}
      <div className="flex items-center gap-1 border-l border-white/10 pl-3">
        <button
          type="button"
          title="This bar starts a new system"
          aria-pressed={flagState(sections, refs, 'systemBreak')}
          className={PILL(flagState(sections, refs, 'systemBreak'))}
          onClick={() => toggle('systemBreak', 'System break')}
        >
          Break
        </button>
        <button
          type="button"
          title="These bars are one system, however many they are"
          aria-pressed={isOwnSystem(sections, refs)}
          disabled={refs.some((r) => r.section !== refs[0].section)}
          className={PILL(isOwnSystem(sections, refs))}
          onClick={() =>
            onChange(fitIntoSystem(sections, refs), 'Fit into system')
          }
        >
          Fit to line
        </button>
      </div>

      <button
        type="button"
        className="ml-auto text-[11px] text-white/45 transition-colors hover:text-white/80"
        onClick={() => onChange(clearRoadmap(sections, refs), 'Clear marks')}
      >
        Clear marks
      </button>
    </div>
  );
};
