/* eslint-disable react/jsx-sort-props */
import { useEffect, useMemo, useState, type FC } from 'react';
import { cn } from '@/components/utilities';
import type { LiteracyWords } from '@/content/musicLiteracy/schemas';
import { DEGREE_SEMITONES } from '@/curriculum/engine/musicLiteracy/literacy';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import {
  barBeat,
  lineText,
  moveSyllable,
  overrun,
  restBefore,
  retypeLine,
  spanWords,
  splitSyllables,
  syllableStarts,
  withRestBefore,
  wordsLine,
  wordsNotes,
  type Syllable,
  type WordsLine,
} from './literacyChips';
import {
  AddRest,
  BarsSelect,
  CHIP,
  ChipHandle,
  DegreeSelect,
  DropMark,
  LengthSelect,
  ReorderStatus,
  RestChip,
  RhythmStrip,
} from './literacyControls';
import { useChipReorder } from './useChipReorder';

/**
 * The words, the teacher's line: typed as text, then one chip per syllable
 * with its note and its length, and a rest before or after it where the
 * line breathes. A rest is the gap between two syllables, so it shows once,
 * ahead of the syllable after it, and goes with that syllable when it is
 * dragged (`moveSyllable`); the first syllable's is the line's pickup.
 * Retyping keeps the notes and rhythm of every syllable it can
 * (`retypeLine`).
 */

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
    const typed = splitSyllables(text);
    // Only a change is a step to undo.
    if (
      typed.length !== line.syllables.length ||
      typed.some((piece, i) => piece !== line.syllables[i].text)
    )
      setLine(retypeLine(line, text));
  };
  // Another rest ahead of a syllable makes the one there longer.
  const addRestBefore = (index: number, ticks: number) =>
    setLine(
      withRestBefore(line, index, Math.max(0, restBefore(line, index)) + ticks),
    );
  const reorder = useChipReorder(line.syllables.length, (from, to) =>
    setLine(moveSyllable(line, from, to)),
  );

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
        Drag a chip by its top line to move the syllable, with its note and the
        rest before it. Retyping keeps each syllable’s note where it can.
      </p>

      <div
        ref={reorder.listRef}
        className="flex flex-wrap items-stretch gap-1.5"
      >
        {line.syllables.map((s, i) => {
          const name = `“${s.text}” (syllable ${i + 1})`;
          const before = restBefore(line, i);
          return (
            <div
              key={i}
              {...reorder.item(i)}
              className={cn(
                'relative flex items-stretch gap-0.5',
                reorder.dragging === i && 'opacity-40',
              )}
            >
              <DropMark side={reorder.mark(i)} />
              {before > 0 && (
                <RestChip
                  ticks={before}
                  at={barBeat(starts[i] - before, timeSignature)}
                  label={`${stepLabel} rest before ${name}`}
                  onLength={(ticks) => setLine(withRestBefore(line, i, ticks))}
                  onRemove={() => setLine(withRestBefore(line, i, 0))}
                />
              )}
              <div
                data-lit={lit === i || undefined}
                className={cn(
                  CHIP,
                  lit === i
                    ? 'border-sky-300/70 bg-sky-300/15'
                    : 'border-white/[0.08] bg-white/[0.03]',
                )}
              >
                <ChipHandle
                  reorder={reorder}
                  index={i}
                  label={`${stepLabel} move ${name} (drag, or Alt+← / Alt+→)`}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                    {s.text}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-white/35">
                    {barBeat(starts[i], timeSignature)}
                  </span>
                </ChipHandle>
                <DegreeSelect
                  degree={s.degree}
                  octave={s.octave}
                  label={`${stepLabel} note for ${name}`}
                  onChange={(degree, octave) => patch(i, { degree, octave })}
                />
                <LengthSelect
                  ticks={s.duration}
                  label={`${stepLabel} length of ${name}`}
                  onChange={(duration) => patch(i, { duration })}
                />
                <AddRest
                  side="before"
                  label={`${stepLabel} add a rest before ${name}`}
                  onAdd={(ticks) => addRestBefore(i, ticks)}
                />
                {/* After the last, the line's bars hold the silence. */}
                {i < last && (
                  <AddRest
                    side="after"
                    label={`${stepLabel} add a rest after ${name}`}
                    onAdd={(ticks) => addRestBefore(i + 1, ticks)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ReorderStatus reorder={reorder} />

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
