import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CountOff, countOffBeatIndex } from '@/components/notation/CountOff';
import {
  keyBox,
  normalizeKeyRange,
  type KeyRange,
} from '@/learn/keyboard/lessonKeyboardRange';
import { useLessonKeyboardStage } from '@/learn/keyboard/lessonKeyboardStage';
import type { NoteEvent, NoteHoldMeta } from './GenrePianoRoll';

// The cascade face of GenrePianoRoll: the roll turned 90° with the grid taken
// away. Notes fall straight down onto their own keys and land on the hit line
// (the bottom edge, just above the keyboard) when they're due. The roll keeps
// running the lesson clock; this only draws it.
//
// - In time, the playhead drives the fall.
// - Free time (NoteHold) has no playhead: the current chord parks on the hit
//   line, filling as it's held, with the next ones stacked above it.
// - With neither (a static preview) the first note sits on the line.

/** How much music is in view above the hit line. */
const LOOKAHEAD_BARS = 2;
/** Note-name size bounds (px). Within them it follows the key width. */
const LABEL_MIN_PX = 9;
const LABEL_MAX_PX = 12;
/** In time, a note this far past its onset without being played is missed. */
const MISS_AFTER_TICKS = 240;
const MISSED_COLOR = '#52525b';

export interface LearnCascadeViewProps {
  events: NoteEvent[];
  /** MIDI for an event (events may carry only a pitch name). */
  midiOf: (event: NoteEvent) => number | undefined;
  /** Name drawn on a note, when it's big enough to carry one. */
  labelOf: (event: NoteEvent) => string;
  beatsPerBar: number;
  beatTicks: number;
  inTime: boolean;
  playheadTick: number;
  countInTicks: number;
  musicStartTick: number;
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  activeMidis?: number[];
  keyColor?: string;
  height: number;
  toggle?: ReactNode;
}

export function LearnCascadeView({
  events,
  midiOf,
  labelOf,
  beatsPerBar,
  beatTicks,
  inTime,
  playheadTick,
  countInTicks,
  musicStartTick,
  noteHoldMeta,
  performanceMeta,
  activeMidis,
  keyColor = '#7ecfcf',
  height,
  toggle,
}: LearnCascadeViewProps) {
  const stage = useLessonKeyboardStage();
  const [boxEl, setBoxEl] = useState<HTMLDivElement | null>(null);
  const geometry = useStageGeometry(boxEl, stage.el);

  // No keyboard on screen (a test, a preview): span the notes themselves.
  const range = useMemo<KeyRange>(() => {
    if (stage.range) return stage.range;
    const midis = events
      .map(midiOf)
      .filter((m): m is number => m !== undefined);
    if (!midis.length) return { low: 48, high: 72 };
    return normalizeKeyRange({
      low: Math.min(...midis) - 2,
      high: Math.max(...midis) + 2,
    });
  }, [stage.range, events, midiOf]);

  const ticksPerBar = beatsPerBar * beatTicks;
  const lookahead = ticksPerBar * LOOKAHEAD_BARS;
  const H = geometry.height;
  const pxPerTick = H > 0 ? H / lookahead : 0;

  // The tick that sits on the hit line.
  const anchor = useMemo(() => {
    if (inTime) return playheadTick;
    if (noteHoldMeta) {
      const current = events.find((e) => noteHoldMeta[e.id]?.isCurrentChord);
      if (current) return current.startTicks;
      const pending = events.filter((e) => !noteHoldMeta[e.id]?.isCompleted);
      if (pending.length) return Math.min(...pending.map((e) => e.startTicks));
    }
    return events.length ? Math.min(...events.map((e) => e.startTicks)) : 0;
  }, [inTime, playheadTick, noteHoldMeta, events]);

  const xOf = (box: { left: number; width: number }) => ({
    left: geometry.offset + box.left * geometry.width,
    width: box.width * geometry.width,
  });

  const notes: ReactNode[] = [];
  if (pxPerTick > 0 && geometry.width > 0) {
    for (const e of events) {
      const midi = midiOf(e);
      if (midi === undefined) continue;
      const box = keyBox(range, midi);
      // Off the player's keyboard: LessonKeyboard's notice covers it.
      if (!box) continue;
      const hold = noteHoldMeta?.[e.id];
      if (hold?.isCompleted) continue;

      const { left, width } = xOf(box);
      const inset = box.black ? 0 : Math.min(3, width * 0.12);
      const noteWidth = Math.max(2, width - inset * 2);
      // Every note carries its name, so a short one grows upward (its onset,
      // the bottom edge, stays put) until the name fits.
      const fontSize = Math.min(
        LABEL_MAX_PX,
        Math.max(LABEL_MIN_PX, noteWidth * 0.45),
      );
      const minLength = fontSize + 10;

      const bottom = H - (e.startTicks - anchor) * pxPerTick;
      const length = Math.max(minLength, e.durationTicks * pxPerTick);
      const top = bottom - length;
      if (top >= H || bottom <= 0) continue;

      const played = inTime && !!performanceMeta?.[e.id];
      const missed =
        inTime && !played && playheadTick > e.startTicks + MISS_AFTER_TICKS;
      const upcoming = !inTime && noteHoldMeta && !hold?.isCurrentChord;
      const color = missed ? MISSED_COLOR : (e.color ?? keyColor);

      notes.push(
        <div
          key={e.id}
          data-testid="cascade-note"
          className="absolute"
          style={{
            left: left + inset,
            width: noteWidth,
            top,
            height: length,
            opacity: upcoming ? 0.55 : 1,
            filter: played ? 'brightness(1.25)' : undefined,
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-md"
            style={{
              background: color,
              boxShadow: played
                ? `0 0 14px 2px ${color}`
                : 'inset 0 2px 0 rgba(255,255,255,0.2)',
              border: box.black ? '1px solid rgba(0,0,0,0.35)' : undefined,
            }}
          >
            {hold?.isCurrentChord && hold.holdProgress > 0 && (
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: `${Math.min(1, hold.holdProgress) * 100}%`,
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            )}
          </div>
          {/* Not clipped by the note: on a narrow black key the name may
              run a little past its edges, on a pill of the note's colour. */}
          <div
            className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded px-0.5 font-semibold leading-none text-black/75"
            style={{ fontSize, background: color }}
          >
            {labelOf(e)}
          </div>
        </div>,
      );
    }
  }

  // A glow rising off each key that's down right now.
  const glows = (activeMidis ?? []).flatMap((midi) => {
    const box = keyBox(range, midi);
    if (!box || geometry.width <= 0) return [];
    const { left, width } = xOf(box);
    return [
      <div
        key={`glow-${midi}`}
        className="pointer-events-none absolute bottom-0"
        style={{
          left,
          width,
          height: 56,
          background: `linear-gradient(to top, ${keyColor}99, transparent)`,
        }}
      />,
    ];
  });

  const countInBeat = inTime
    ? countOffBeatIndex(playheadTick, countInTicks, beatTicks, musicStartTick)
    : null;

  return (
    <div
      ref={setBoxEl}
      data-testid="learn-cascade"
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        height,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--color-border)',
      }}
    >
      {notes}
      {glows}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: 2, background: 'rgba(255,255,255,0.18)' }}
      />
      {toggle && <div className="absolute left-2 top-2 z-30">{toggle}</div>}
      <CountOff
        beatIndex={countInBeat}
        beatsPerBar={beatsPerBar}
        placement="countInBar"
        bar={null}
      />
    </div>
  );
}

/**
 * The keyboard's left edge and width in the cascade box's own px, plus the
 * box's height. The keyboard shares its row with the volume dial, so it is
 * narrower than the cascade and has to be measured, not assumed.
 */
function useStageGeometry(
  boxEl: HTMLElement | null,
  keysEl: HTMLElement | null,
) {
  const [geometry, setGeometry] = useState({ offset: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!boxEl) return;
    const measure = () => {
      const box = boxEl.getBoundingClientRect();
      const keys = keysEl?.getBoundingClientRect();
      // clientHeight: inside the border, where the notes are drawn.
      const next = keys
        ? {
            offset: keys.left - box.left - boxEl.clientLeft,
            width: keys.width,
            height: boxEl.clientHeight,
          }
        : { offset: 0, width: boxEl.clientWidth, height: boxEl.clientHeight };
      setGeometry((prev) =>
        prev.offset === next.offset &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(boxEl);
    if (keysEl) observer?.observe(keysEl);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [boxEl, keysEl]);

  return geometry;
}
