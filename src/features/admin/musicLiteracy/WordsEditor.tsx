/* eslint-disable react/jsx-sort-props */
import { Plus } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type FC } from 'react';
import { cn } from '@/components/utilities';
import type { LiteracyWords } from '@/content/musicLiteracy/schemas';
import { DEGREE_SEMITONES } from '@/curriculum/engine/musicLiteracy/literacy';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import {
  barBeat,
  lineText,
  overrun,
  retypeLine,
  spanWords,
  splitSyllables,
  syllableStarts,
  wordsLine,
  wordsNotes,
  type Syllable,
  type WordsLine,
} from './literacyChips';
import {
  BarsSelect,
  CHIP,
  DegreeSelect,
  LengthSelect,
  RestChip,
  RhythmStrip,
} from './literacyControls';

/**
 * The words, the teacher's line: typed as text, then one chip per syllable
 * with its note and its length, and a rest after it where the line breathes.
 * Retyping keeps the notes and rhythm of every syllable it can
 * (`retypeLine`).
 */

const QUARTER = 480;

export const WordsEditor: FC<{
  words: LiteracyWords;
  timeSignature: readonly [number, number];
  onChange: (words: LiteracyWords) => void;
  /** The syllable sounding in the preview, by its index. */
  lit?: number | null;
  stepLabel: string;
}> = ({ words, timeSignature, onChange, lit, stepLabel }) => {
  const line = useMemo(() => wordsLine(words.notes), [words.notes]);
  const joined = lineText(line);
  const [text, setText] = useState(joined);

  // Keep what was typed ("gon-na") while it still says the same syllables;
  // take the stored line when it changes some other way (undo, the roll).
  useEffect(() => {
    setText((typed) =>
      splitSyllables(typed).join(' ') === joined ? typed : joined,
    );
  }, [joined]);

  const setLine = (next: WordsLine) =>
    onChange({ ...words, notes: wordsNotes(next) });
  const patch = (index: number, change: Partial<Syllable>) =>
    setLine({
      ...line,
      syllables: line.syllables.map((s, i) =>
        i === index ? { ...s, ...change } : s,
      ),
    });
  const commitText = () => {
    if (splitSyllables(text).join(' ') !== joined)
      setLine(retypeLine(line, text));
  };

  const starts = syllableStarts(line);
  const over = overrun(words.notes, words.bars, timeSignature);
  const last = line.syllables.length - 1;
  const overlapping = line.syllables.some((s, i) => i < last && s.rest < 0);

  return (
    <div className="flex flex-col gap-2.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitText();
          }
          if (e.key === 'Escape') setText(joined);
        }}
        placeholder="Hey hey hey I'm gon-na play on a note called C"
        aria-label={`${stepLabel} words, as sung`}
        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[15px] text-white outline-none placeholder:italic placeholder:text-white/25 focus:ring-1 focus:ring-[#60a5fa]"
      />
      <p className="text-xs text-white/40">
        A space between words, a hyphen between syllables (gon-na). Each
        syllable gets a chip: pick the note it’s sung on and how long it lasts.
        Retyping keeps each syllable’s note where it can.
      </p>

      <div className="flex flex-wrap items-stretch gap-1.5">
        {line.lead > 0 && (
          <RestChip
            ticks={line.lead}
            at={barBeat(0, timeSignature)}
            label={`${stepLabel} rest before the first syllable`}
            onLength={(ticks) => setLine({ ...line, lead: ticks })}
            onRemove={() => setLine({ ...line, lead: 0 })}
          />
        )}
        {line.syllables.map((s, i) => (
          <Fragment key={i}>
            <div
              data-lit={lit === i || undefined}
              className={cn(
                CHIP,
                lit === i
                  ? 'border-sky-300/70 bg-sky-300/15'
                  : 'border-white/[0.08] bg-white/[0.03]',
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-sm font-medium text-white">
                  {s.text}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-white/35">
                  {barBeat(starts[i], timeSignature)}
                </span>
              </div>
              <DegreeSelect
                degree={s.degree}
                octave={s.octave}
                label={`${stepLabel} note for “${s.text}” (syllable ${i + 1})`}
                onChange={(degree, octave) => patch(i, { degree, octave })}
              />
              <LengthSelect
                ticks={s.duration}
                label={`${stepLabel} length of “${s.text}” (syllable ${i + 1})`}
                onChange={(duration) => patch(i, { duration })}
              />
              {i < last && s.rest === 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 self-start rounded px-1 text-[11px] text-white/35 transition-colors hover:bg-white/10 hover:text-white"
                  onClick={() => patch(i, { rest: QUARTER })}
                  title="A rest between this syllable and the next"
                >
                  <Plus className="size-3" /> rest after
                </button>
              )}
            </div>
            {i < last && s.rest > 0 && (
              <RestChip
                ticks={s.rest}
                at={barBeat(starts[i] + s.duration, timeSignature)}
                label={`${stepLabel} rest after “${s.text}” (syllable ${i + 1})`}
                onLength={(rest) => patch(i, { rest })}
                onRemove={() => patch(i, { rest: 0 })}
              />
            )}
          </Fragment>
        ))}
      </div>

      <RhythmStrip
        bars={words.bars}
        timeSignature={timeSignature}
        items={line.syllables.map((s, i) => ({
          start: starts[i],
          duration: s.duration,
          label: s.text,
          pitch: DEGREE_SEMITONES[s.degree] + 12 * s.octave,
          lit: lit === i,
        }))}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <BarsSelect
          bars={words.bars}
          label={`${stepLabel} words length in bars`}
          onChange={(bars) => onChange({ ...words, bars })}
        />
        {line.lead === 0 && line.syllables.length > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded px-1 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => setLine({ ...line, lead: QUARTER })}
            title="Start the line after a rest (a pickup)"
          >
            <Plus className="size-3" /> Rest before the first syllable
          </button>
        )}
        <span className="text-xs text-white/40">
          {line.syllables.length} syllable
          {line.syllables.length === 1 ? '' : 's'} · counting bar·beat, “&” is
          the and
        </span>
      </div>

      {over > 0 && (
        <ConsoleCallout tone="warning">
          The line runs {spanWords(over, timeSignature)} past its {words.bars}{' '}
          bar{words.bars === 1 ? '' : 's'}. Give it another bar, or shorten a
          note or a rest.
        </ConsoleCallout>
      )}
      {overlapping && (
        <ConsoleCallout tone="warning">
          Two syllables overlap (from the piano roll). Changing a chip here
          lines them up one after the other.
        </ConsoleCallout>
      )}
    </div>
  );
};
