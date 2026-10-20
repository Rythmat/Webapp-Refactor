// ── A take, shown ──────────────────────────────────────────────────────────
// What the student just recorded, as the track will keep it (engine/echo/
// takes.ts `processTake`): a chords take as its chords across the phrase's
// bars, each in its color with its hybrid name and symbol; a melody take on
// a small roll, a lane a pitch, named by scale degree. What was left out
// is said gently underneath. Then: hear it with the band, use it, or try
// another.

import { Info, Play, Square } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/components/utilities';
import type { EchoTake, TakeFlagReason } from '@/curriculum/engine/echo';
import { chordSymbol } from '@/curriculum/engine/musicLiteracy/chart';
import {
  DEGREE_OF_SEMITONE,
  SCALE_SEMITONES,
  degreeLabel,
  pitchClassOf,
} from '@/curriculum/engine/musicLiteracy/pitch';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { chordColors } from './songTracks';

export interface TakeReviewProps {
  take: EchoTake;
  keyColor: string;
  playing: boolean;
  /** The band is still getting ready for these chords. */
  bandReady: boolean;
  onPlay: () => void;
  onStop: () => void;
  onUse: () => void;
  onTryAgain: () => void;
}

/** What the student is told about what was left out, once a reason. */
const LEFT_OUT: Record<TakeFlagReason, (n: number) => string> = {
  outsidePhrase: (n) =>
    n === 1
      ? 'One note came before the start or after the end, so we left it out.'
      : `${n} notes came before the start or after the end, so we left them out.`,
  unrecognized: (n) =>
    n === 1
      ? 'One chord wasn’t one of the key’s chords, so we left it out. Play all three notes.'
      : `${n} chords weren’t the key’s chords, so we left them out. Play all three notes.`,
  noChord: (n) =>
    n === 1
      ? 'One note makes no chord in this key, so we left it out. Try another note.'
      : `${n} notes make no chord in this key, so we left them out. Try other notes.`,
};

const LANE_MIN = 12;
const LANE_MAX = 22;
const ROLL_MAX = 176;

export function TakeReview({
  take,
  keyColor,
  playing,
  bandReady,
  onPlay,
  onStop,
  onUse,
  onTryAgain,
}: TakeReviewProps) {
  const headingId = useId();
  const counts = new Map<TakeFlagReason, number>();
  for (const flag of take.flags)
    counts.set(flag.reason, (counts.get(flag.reason) ?? 0) + 1);
  const title =
    take.kind === 'chords' ? 'Your Chords Take' : 'Your Melody Take';

  return (
    <section
      aria-labelledby={headingId}
      data-echo-review={take.kind}
      data-empty={take.empty || undefined}
      className="flex w-full max-w-[960px] flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#151518] p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={headingId}
          className="text-[17px] font-medium leading-6 text-[#e8e8f0]"
        >
          {title}
        </h2>
        <p className="text-xs text-white/55">
          {take.bars} {take.bars === 1 ? 'bar' : 'bars'}, played as you recorded{' '}
          {take.kind === 'chords' ? 'them' : 'it'}
        </p>
      </div>

      {take.empty ? (
        <p
          role="status"
          className="rounded-lg bg-white/[0.04] px-3 py-4 text-[15px] leading-6 text-white/70"
        >
          {take.kind === 'chords'
            ? 'We didn’t hear any of the key’s chords that time. Try another take!'
            : 'We didn’t hear any notes that time. Try another take!'}
        </p>
      ) : take.kind === 'chords' ? (
        <ChordStrip take={take} />
      ) : (
        <MelodyRoll take={take} keyColor={keyColor} />
      )}

      {counts.size > 0 && (
        <ul role="status" className="flex flex-col gap-1.5" data-echo-flags>
          {[...counts].map(([reason, n]) => (
            <li
              key={reason}
              data-echo-flag={reason}
              className="flex items-start gap-2 text-[13px] leading-5 text-white/70"
            >
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {LEFT_OUT[reason](n)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!take.empty &&
          (playing ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[13px] font-medium text-[#e8e8f0] hover:bg-white/[0.14]"
            >
              <Square aria-hidden className="size-3.5" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              disabled={!bandReady}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[13px] font-medium text-[#e8e8f0] hover:bg-white/[0.14] disabled:opacity-40"
            >
              <Play aria-hidden className="size-3.5" />
              {bandReady ? 'Play It Back' : 'The band is learning it…'}
            </button>
          ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            data-echo-try-again
            onClick={onTryAgain}
            className="inline-flex h-9 items-center rounded-full bg-white/10 px-4 text-[13px] font-medium text-[#e8e8f0] hover:bg-white/[0.14]"
          >
            Try Another Take
          </button>
          {!take.empty && (
            <button
              type="button"
              data-echo-use-take
              onClick={onUse}
              className="inline-flex h-9 items-center rounded-full bg-white px-5 text-[13px] font-semibold text-[#101012] hover:bg-[#e6e6e8]"
            >
              Use That Take
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** A chords take across its bars: a block a chord. */
function ChordStrip({ take }: { take: Extract<EchoTake, { kind: 'chords' }> }) {
  const colors = chordColors(take.key);
  const pct = (tick: number) => `${(tick / take.length) * 100}%`;
  return (
    <div
      role="img"
      aria-label={take.chords.map((c) => c.label).join(', ')}
      className="relative h-16 overflow-hidden rounded-lg bg-white/[0.03]"
    >
      {Array.from({ length: take.bars - 1 }, (_, bar) => (
        <div
          key={bar}
          aria-hidden
          className="absolute inset-y-0 w-px bg-white/20"
          style={{ left: pct((bar + 1) * take.barTicks) }}
        />
      ))}
      {take.chords.map((chord, i) => {
        const color = colors.get(chord.degree) ?? '#888888';
        return (
          <div
            key={i}
            data-echo-take-chord={chord.label}
            className="absolute inset-y-1.5 flex flex-col justify-center overflow-hidden rounded-md px-2"
            style={{
              left: pct(chord.tick),
              width: `calc(${pct(chord.duration)} - 3px)`,
              backgroundColor: color,
              color: inkOn(color),
            }}
          >
            <span className="truncate text-[15px] font-semibold leading-5">
              {chord.label}
            </span>
            <span className="truncate text-xs leading-4 opacity-75">
              {formatAccidentalsForDisplay(chordSymbol(take.key, chord.degree))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A melody take on lanes of its pitches, named by scale degree. */
function MelodyRoll({
  take,
  keyColor,
}: {
  take: Extract<EchoTake, { kind: 'melody' }>;
  keyColor: string;
}) {
  const one = pitchClassOf(take.key.tonic);
  const scale = SCALE_SEMITONES[take.key.mode];
  const played = new Set(take.notes.map((n) => n.midi));
  const high = Math.max(...played);
  const low = Math.min(...played);
  // The key's notes from the lowest played to the highest, and any played
  // outside it; the highest on top.
  const lanes: { midi: number; label: string }[] = [];
  for (let midi = high; midi >= low; midi--) {
    const above = (((midi - one) % 12) + 12) % 12;
    if (!scale.includes(above) && !played.has(midi)) continue;
    lanes.push({ midi, label: degreeLabel(DEGREE_OF_SEMITONE[above]) });
  }
  const lane = Math.max(
    LANE_MIN,
    Math.min(LANE_MAX, Math.floor(ROLL_MAX / Math.max(1, lanes.length))),
  );
  const pct = (tick: number) => `${(tick / take.length) * 100}%`;
  const beat = take.barTicks / 4;
  return (
    <div className="flex" data-echo-take-roll>
      <div aria-hidden className="w-9 shrink-0">
        {lanes.map((l) => (
          <div
            key={l.midi}
            className="flex items-center justify-end pr-2 text-xs font-semibold text-white/55"
            style={{ height: lane }}
          >
            {l.label}
          </div>
        ))}
      </div>
      <div
        role="img"
        aria-label={`${take.notes.length} notes: ${take.notes.map((n) => n.label).join(', ')}`}
        className="relative min-w-0 flex-1 overflow-hidden rounded-md bg-white/[0.03]"
        style={{ height: lane * lanes.length }}
      >
        {Array.from({ length: take.length / beat + 1 }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className={cn(
              'absolute inset-y-0 w-px',
              (i * beat) % take.barTicks === 0
                ? 'bg-white/25'
                : 'bg-white/[0.07]',
            )}
            style={{ left: pct(i * beat) }}
          />
        ))}
        {take.notes.map((note, i) => {
          const row = lanes.findIndex((l) => l.midi === note.midi);
          return (
            <div
              key={i}
              data-echo-take-note={note.label}
              className="absolute rounded-[3px]"
              style={{
                top: row * lane + 2,
                height: lane - 4,
                left: pct(note.tick),
                width: `max(6px, ${pct(note.duration)})`,
                backgroundColor: note.inKey ? keyColor : '#a1a1aa',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
