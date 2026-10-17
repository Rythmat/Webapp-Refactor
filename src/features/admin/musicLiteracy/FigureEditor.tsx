/* eslint-disable react/jsx-sort-props */
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import type { LiteracyFigure } from '@/content/musicLiteracy/schemas';
import {
  barTicks,
  DEGREE_SEMITONES,
} from '@/curriculum/engine/musicLiteracy/literacy';
import { IconButton } from '../content/visual/Editable';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import {
  barBeat,
  chipStarts,
  figureChips,
  figureNotes,
  insertRest,
  moveItem,
  overlaps,
  overrun,
  spanWords,
  type FigureChip,
} from './literacyChips';
import {
  AddRest,
  BarsSelect,
  CHIP,
  ChipHandle,
  DegreeSelect,
  DropMark,
  LengthSelect,
  pitchLabel,
  ReorderStatus,
  RestGlyph,
  RhythmStrip,
} from './literacyControls';
import { useChipReorder } from './useChipReorder';

/**
 * A call or a response: a row of chips, each a note (which degree, which
 * octave, how long) or a rest, added, dragged or moved, and taken out one
 * at a time; a note's "+ rest before / after" puts a rest chip on that
 * side of it. The figure keeps its rests as the gaps between notes
 * (`figureNotes`), so a rest added at the end stays here, waiting, until a
 * note follows it; the figure's bars already hold the silence after its
 * last note. Two rests side by side are one gap, so they join up.
 */

const QUARTER = 480;

export const FigureEditor: FC<{
  figure: LiteracyFigure;
  timeSignature: readonly [number, number];
  onChange: (figure: LiteracyFigure) => void;
  /** The note sounding in the preview, by its index among the notes. */
  lit?: number | null;
  /** "Step 3 call", for the controls' names. */
  label: string;
}> = ({ figure, timeSignature, onChange, lit, label }) => {
  const stored = useMemo(() => figureChips(figure.notes), [figure.notes]);
  // Rests after the last note, kept until a note follows them.
  const [waiting, setWaiting] = useState<FigureChip[]>([]);
  const emitted = useRef(JSON.stringify(figure.notes));
  useEffect(() => {
    const now = JSON.stringify(figure.notes);
    if (now !== emitted.current) {
      emitted.current = now;
      setWaiting([]);
    }
  }, [figure.notes]);

  const chips = [...stored, ...waiting];
  const starts = chipStarts(chips);

  const commit = (next: FigureChip[]) => {
    let lastNote = next.length - 1;
    while (lastNote >= 0 && next[lastNote].kind !== 'note') lastNote--;
    const notes = figureNotes(next.slice(0, lastNote + 1));
    const json = JSON.stringify(notes);
    setWaiting(next.slice(lastNote + 1));
    if (json !== emitted.current) {
      emitted.current = json;
      onChange({ ...figure, notes });
    }
  };
  const patch = (index: number, change: Partial<FigureChip>) =>
    commit(
      chips.map((c, i) =>
        i === index ? ({ ...c, ...change } as FigureChip) : c,
      ),
    );
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= chips.length) return;
    commit(moveItem(chips, index, target));
  };
  const reorder = useChipReorder(chips.length, (from, to) =>
    commit(moveItem(chips, from, to)),
  );
  const lastNote = [...chips].reverse().find((c) => c.kind === 'note');

  // The preview lights a note by its index among the notes.
  let noteIndex = -1;
  const litChip = chips.map((c) =>
    c.kind === 'note' ? ++noteIndex === lit : false,
  );

  const over = overrun(figure.notes, figure.bars, timeSignature);
  const end = starts.length ? starts.at(-1)! + chips.at(-1)!.duration : 0;
  const silence = figure.bars * barTicks(timeSignature) - end;

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={reorder.listRef}
        className="flex flex-wrap items-stretch gap-1.5"
      >
        {chips.map((c, i) => {
          const where = barBeat(starts[i], timeSignature);
          const name = `${label} ${c.kind} ${i + 1}`;
          return (
            <div
              key={i}
              {...reorder.item(i)}
              data-lit={litChip[i] || undefined}
              className={cn(
                CHIP,
                'relative',
                c.kind === 'rest'
                  ? 'border-dashed border-white/15 bg-transparent'
                  : litChip[i]
                    ? 'border-sky-300/70 bg-sky-300/15'
                    : 'border-white/[0.08] bg-white/[0.03]',
                i >= stored.length && 'opacity-60',
                reorder.dragging === i && 'opacity-40',
              )}
              title={
                i >= stored.length
                  ? 'A rest at the end is silence until the bar line. It’s kept once a note follows it.'
                  : undefined
              }
            >
              <DropMark side={reorder.mark(i)} />
              <ChipHandle
                reorder={reorder}
                index={i}
                label={`${name}: move (drag, or Alt+← / Alt+→)`}
              >
                <span
                  className={cn(
                    'min-w-0 flex-1 text-xs',
                    c.kind === 'rest'
                      ? 'italic text-white/50'
                      : 'text-white/70',
                  )}
                >
                  {c.kind === 'rest' ? 'rest' : `note ${noteIndexOf(chips, i)}`}
                </span>
                <span className="text-[10px] tabular-nums text-white/35">
                  {where}
                </span>
              </ChipHandle>
              {c.kind === 'note' ? (
                <DegreeSelect
                  degree={c.degree}
                  octave={c.octave}
                  label={`${name}: which note`}
                  onChange={(degree, octave) => patch(i, { degree, octave })}
                />
              ) : (
                <div className="flex h-[22px] items-center justify-center">
                  <RestGlyph ticks={c.duration} className="text-white/50" />
                </div>
              )}
              <LengthSelect
                ticks={c.duration}
                rest={c.kind === 'rest'}
                label={`${name}: how long`}
                onChange={(duration) => patch(i, { duration })}
              />
              {c.kind === 'note' && (
                <>
                  <AddRest
                    side="before"
                    label={`${name}: add a rest before`}
                    onAdd={(ticks) => commit(insertRest(chips, i, ticks))}
                  />
                  <AddRest
                    side="after"
                    label={`${name}: add a rest after`}
                    onAdd={(ticks) => commit(insertRest(chips, i + 1, ticks))}
                  />
                </>
              )}
              <div className="mt-auto flex items-center justify-between">
                <IconButton
                  label={`Move ${name} earlier`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronLeft className="size-3" />
                </IconButton>
                <IconButton
                  label={`Remove ${name}`}
                  danger
                  onClick={() => commit(chips.filter((_, j) => j !== i))}
                >
                  <X className="size-3" />
                </IconButton>
                <IconButton
                  label={`Move ${name} later`}
                  disabled={i === chips.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronRight className="size-3" />
                </IconButton>
              </div>
            </div>
          );
        })}
        <div className="flex flex-col justify-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              commit([
                ...chips,
                {
                  kind: 'note',
                  degree: lastNote?.kind === 'note' ? lastNote.degree : '1',
                  octave: lastNote?.kind === 'note' ? lastNote.octave : 0,
                  duration: lastNote?.duration ?? QUARTER,
                },
              ])
            }
          >
            <Plus /> Add note
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              commit([...chips, { kind: 'rest', duration: QUARTER }])
            }
          >
            <Plus /> Add rest
          </Button>
        </div>
      </div>
      <ReorderStatus reorder={reorder} />

      <RhythmStrip
        bars={figure.bars}
        timeSignature={timeSignature}
        items={chips.map((c, i) => ({
          start: starts[i],
          duration: c.duration,
          rest: c.kind === 'rest',
          label: c.kind === 'note' ? pitchLabel(c.degree, c.octave) : 'rest',
          pitch:
            c.kind === 'note'
              ? DEGREE_SEMITONES[c.degree] + 12 * c.octave
              : undefined,
          lit: litChip[i],
        }))}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <BarsSelect
          bars={figure.bars}
          label={`${label} length in bars`}
          onChange={(bars) => onChange({ ...figure, bars })}
        />
        <span className="text-xs text-white/40">
          {figure.notes.length} note{figure.notes.length === 1 ? '' : 's'}
          {silence > 0 &&
            ` · then ${spanWords(silence, timeSignature)} of silence to the bar line`}
        </span>
      </div>

      {over > 0 && (
        <ConsoleCallout tone="warning">
          This runs {spanWords(over, timeSignature)} past its {figure.bars} bar
          {figure.bars === 1 ? '' : 's'}. Give it another bar, or shorten a note
          or a rest.
        </ConsoleCallout>
      )}
      {figure.notes.length === 0 && (
        <ConsoleCallout tone="warning">
          No notes yet: add one, or the step can’t be saved.
        </ConsoleCallout>
      )}
      {overlaps(figure.notes) && (
        <ConsoleCallout tone="warning">
          Some notes overlap (a chord, from the piano roll). Changing a chip
          here lines them up one after the other; keep the chord in the piano
          roll.
        </ConsoleCallout>
      )}
    </div>
  );
};

/** A note chip's number among the notes, from 1. */
function noteIndexOf(chips: readonly FigureChip[], index: number): number {
  return chips.slice(0, index + 1).filter((c) => c.kind === 'note').length;
}
