import { useId } from 'react';
import { cn } from '@/components/utilities';
import type { NoteEvent } from '@/curriculum/components/GenrePianoRoll';
import { LearnNotationView } from '@/curriculum/components/LearnNotationView';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  CREATE_GRID_TICKS,
  quantizeTick,
} from '@/curriculum/engine/musicLiteracy/createPass';
import { useRollView } from '@/lib/notation';
import {
  TIMING_GLYPHS,
  TIMING_WORDS,
  type CompareNote,
  type CreateComparison,
} from './createComparison';

// ── Pass 2's result ────────────────────────────────────────────────────────
// The student's own call beside their repeat of it, on the same lanes and
// the same bars, so the two read across: the call as Atlas transcribed it,
// the repeat as they played it over where each note belonged, and every
// note marked on time, early, late or missed (the house marks). On the
// staff view, the two halves are written as staves instead. The score
// above them is graded against their own call.

const LANE_MIN = 14;
const LANE_MAX = 26;
const ROLL_MAX = 210;

export interface CreateResultPanelProps {
  percent: number;
  passed: boolean;
  passMark: number;
  feedback: string;
  comparison: CreateComparison;
  keyColor: string;
  tonic: number;
  beatsPerBar: number;
  timeSignature: [number, number];
  stacked: boolean;
}

export function CreateResultPanel({
  percent,
  passed,
  passMark,
  feedback,
  comparison,
  keyColor,
  tonic,
  beatsPerBar,
  timeSignature,
  stacked,
}: CreateResultPanelProps) {
  const headingId = useId();
  const [view] = useRollView('learn');
  const staff = view === 'notation';
  const half = (side: 'call' | 'repeat') =>
    staff ? (
      <CompareStaff
        notes={comparison[side]}
        comparison={comparison}
        keyColor={keyColor}
        tonic={tonic}
        beatsPerBar={beatsPerBar}
        timeSignature={timeSignature}
      />
    ) : (
      <CompareRoll
        notes={comparison[side]}
        comparison={comparison}
        keyColor={keyColor}
        marks={side === 'repeat'}
      />
    );

  return (
    <section
      aria-labelledby={headingId}
      data-guitar-result
      data-literacy-create-result
      data-passed={passed}
      className="my-auto flex max-h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#151518] p-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2
          id={headingId}
          className="text-[40px] font-normal leading-[3rem] text-[#e8e8f0]"
        >
          {percent}%
        </h2>
        <p data-guitar-result-status className="text-[15px] text-white/55">
          {passed ? 'Passed' : `Not yet · ${passMark}% passes`}
        </p>
        <p className="min-w-0 basis-full text-[15px] leading-6 text-white/55 min-[1100px]:basis-auto">
          {feedback}
        </p>
      </div>

      <div
        className={cn(
          'grid gap-4',
          stacked ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-2',
        )}
      >
        <figure
          data-literacy-compare="call"
          className="flex min-w-0 flex-col gap-2"
        >
          <figcaption className="text-xs uppercase tracking-[0.14em] text-white/55">
            Your call
          </figcaption>
          {half('call')}
        </figure>
        <figure
          data-literacy-compare="repeat"
          className="flex min-w-0 flex-col gap-2"
        >
          <figcaption className="text-xs uppercase tracking-[0.14em] text-white/55">
            Your repeat
          </figcaption>
          {half('repeat')}
        </figure>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ol
          aria-label="Each note of your repeat"
          data-literacy-timing
          className="flex flex-wrap gap-2"
        >
          {comparison.marks.map((mark, i) => (
            <li
              key={i}
              data-timing={mark.status}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
                mark.status === 'onTime'
                  ? 'border-transparent text-[#101012]'
                  : 'border-white/15 text-[#e8e8f0]',
              )}
              style={
                mark.status === 'onTime'
                  ? { backgroundColor: keyColor }
                  : undefined
              }
            >
              <span aria-hidden>{TIMING_GLYPHS[mark.status]}</span>
              <span className="font-semibold">{mark.label}</span>
              <span>{TIMING_WORDS[mark.status]}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-white/45">
          ✓ on time · ◀ early · ▶ late · ✗ missed
          {comparison.leftOut &&
            ' · Gray notes aren’t this step’s notes, so they were left out.'}
        </p>
      </div>
    </section>
  );
}

/** One half on lanes of the step's pitches, the bars ruled in. */
function CompareRoll({
  notes,
  comparison,
  keyColor,
  marks,
}: {
  notes: readonly CompareNote[];
  comparison: CreateComparison;
  keyColor: string;
  marks: boolean;
}) {
  const { lanes, length, barTicks } = comparison;
  const lane = Math.max(
    LANE_MIN,
    Math.min(LANE_MAX, Math.floor(ROLL_MAX / Math.max(1, lanes.length))),
  );
  const pct = (tick: number) =>
    `${Math.max(0, Math.min(100, (tick / Math.max(1, length)) * 100))}%`;
  const beat = barTicks / 4;
  const lines: { tick: number; bar: boolean }[] = [];
  for (let t = 0; t <= length; t += beat) {
    lines.push({ tick: t, bar: t % barTicks === 0 });
  }
  const row = (midi: number) => lanes.findIndex((l) => l.midi === midi);

  return (
    <div className="flex flex-col gap-1">
      {marks && (
        <div aria-hidden className="relative ml-9 h-4">
          {comparison.marks.map((mark, i) => (
            <span
              key={i}
              data-mark={mark.status}
              className="absolute -translate-x-1/2 text-xs font-semibold leading-4"
              style={{
                left: pct(mark.tick),
                color: mark.status === 'onTime' ? keyColor : '#e8e8f0',
              }}
            >
              {TIMING_GLYPHS[mark.status]}
            </span>
          ))}
        </div>
      )}
      <div className="flex">
        <div aria-hidden className="w-9 shrink-0">
          {lanes.map((l) => (
            <div
              key={l.midi}
              className="flex items-center justify-end pr-2 text-[11px] font-semibold text-white/55"
              style={{ height: lane }}
            >
              {l.label}
            </div>
          ))}
        </div>
        <div
          role="img"
          aria-label={`${notes.filter((n) => n.tone === 'call' || n.tone === 'hit').length} notes`}
          className="relative min-w-0 flex-1 overflow-hidden rounded-md bg-white/[0.03]"
          style={{ height: lane * lanes.length }}
        >
          {lanes.map((l, i) =>
            i % 2 ? (
              <div
                key={l.midi}
                className="absolute inset-x-0 bg-white/[0.025]"
                style={{ top: i * lane, height: lane }}
              />
            ) : null,
          )}
          {lines.map((line) => (
            <div
              key={line.tick}
              className={cn(
                'absolute inset-y-0 w-px',
                line.bar ? 'bg-white/25' : 'bg-white/[0.08]',
              )}
              style={{ left: pct(line.tick) }}
            />
          ))}
          {notes.map((note, i) => {
            const r = row(note.midi);
            if (r < 0) return null;
            const width = Math.max(
              1.5,
              (Math.min(note.duration, length - note.tick) / length) * 100,
            );
            const ghost = note.tone === 'ghost';
            const gray = note.tone === 'gray';
            return (
              <div
                key={i}
                data-compare-note={note.tone}
                className="absolute rounded-[3px]"
                style={{
                  top: r * lane + 2,
                  height: lane - 4,
                  left: pct(note.tick),
                  width: `${width}%`,
                  backgroundColor: ghost
                    ? 'transparent'
                    : gray
                      ? '#71717a'
                      : keyColor,
                  opacity: gray ? 0.6 : 1,
                  border: ghost ? `1.5px dashed ${keyColor}` : undefined,
                  boxShadow:
                    note.tone === 'hit'
                      ? `0 0 6px 1px ${keyColor}66`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** One half written on a staff: the call, or the repeat on the 16th grid. */
function CompareStaff({
  notes,
  comparison,
  keyColor,
  tonic,
  beatsPerBar,
  timeSignature,
}: {
  notes: readonly CompareNote[];
  comparison: CreateComparison;
  keyColor: string;
  tonic: number;
  beatsPerBar: number;
  timeSignature: [number, number];
}) {
  const events: NoteEvent[] = notes
    .filter((n) => n.tone !== 'ghost')
    .map((note, i) => {
      const start = Math.max(0, quantizeTick(note.tick));
      return {
        id: `compare-${i}`,
        pitchName: midiToPitchName(note.midi, tonic),
        midi: note.midi,
        startTicks: start,
        durationTicks: Math.max(
          CREATE_GRID_TICKS,
          Math.min(
            comparison.length - start,
            quantizeTick(note.duration) || CREATE_GRID_TICKS,
          ),
        ),
        color: note.tone === 'gray' ? '#71717a' : keyColor,
      };
    })
    .filter((e) => e.startTicks < comparison.length);
  return (
    <div className="min-h-[120px] overflow-hidden rounded-md">
      <LearnNotationView
        events={events}
        bars={Math.max(1, comparison.length / comparison.barTicks)}
        beatsPerBar={beatsPerBar}
        keyRoot={tonic}
        keyColor={keyColor}
        inTime={false}
        playheadTick={0}
        timeSignature={timeSignature}
        staves="treble"
        height={140}
        toggle={null}
        showHeader={false}
      />
    </div>
  );
}
