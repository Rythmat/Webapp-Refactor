import type { StaffLayout } from '@/components/notation/StaffView';
import type { TargetOutcome } from '@/curriculum/hooks/useGenreAssessment';
import {
  EARLY_LATE_TOLERANCE_TICKS,
  outcomeMistake,
  type MistakeKind,
} from './nextStepSuggestion';
import { measureAt, tickX } from './staffLayoutBars';

// ── Mistake markers ────────────────────────────────────────────────────────
// After a take, a marker under each target that didn't land. They are
// monochrome — a red, orange or blue would read as a key colour (C, G, D♭) —
// and told apart by shape and glyph: missed is a filled disc with ✗, wrong a
// white/60 ring with ≠, early / late a faint ring with ◀ / ▶, unclear a
// dashed ring with ?. Each one loops its bar; the hit area is larger than the
// mark so it can be tapped.

/** The mark as drawn. */
const MARKER_SIZE = 24;
/** The button round it: what a finger or pointer has to hit. */
const HIT_SIZE = 36;
/**
 * Gap between the mark and the foot of its bar's box. Mark and hit area both
 * stay inside the box: on a TAB that shows one line at a time, anything
 * hanging below a line shows at the top of the next page.
 */
const MARKER_INSET = 1;
const TICKS_PER_BEAT = 480;

/** First wins when several targets share a tick (a chord's notes). */
const KIND_ORDER: readonly MistakeKind[] = [
  'missed',
  'wrong',
  'late',
  'early',
  'unclear',
];

/** How a marker is drawn: its shape carries the kind, not a colour. */
export type MistakeMarkerShape = 'disc' | 'ring' | 'faintRing' | 'dashedRing';

export const MISTAKE_MARKERS: Readonly<
  Record<
    MistakeKind,
    { glyph: string; word: string; shape: MistakeMarkerShape }
  >
> = {
  missed: { glyph: '✗', word: 'missed', shape: 'disc' },
  wrong: { glyph: '≠', word: 'wrong', shape: 'ring' },
  early: { glyph: '◀', word: 'early', shape: 'faintRing' },
  late: { glyph: '▶', word: 'late', shape: 'faintRing' },
  unclear: { glyph: '?', word: 'unclear', shape: 'dashedRing' },
};

const INK = '#e8e8f0';
/** The mark's paint, by shape: fill (the panel's own grey unless a disc), edge, glyph. */
const SHAPE_PAINT: Readonly<
  Record<
    MistakeMarkerShape,
    { background: string; border: string; color: string }
  >
> = {
  disc: { background: INK, border: `1.5px solid ${INK}`, color: '#101012' },
  ring: {
    background: 'var(--ma-tab-gap, #151518)',
    border: '1.5px solid rgba(255, 255, 255, 0.6)',
    color: INK,
  },
  faintRing: {
    background: 'var(--ma-tab-gap, #151518)',
    border: '1.5px solid rgba(255, 255, 255, 0.3)',
    color: INK,
  },
  dashedRing: {
    background: 'var(--ma-tab-gap, #151518)',
    border: '1.5px dashed rgba(255, 255, 255, 0.6)',
    color: INK,
  },
};

export interface MistakeMarkersOverlayProps {
  layout: StaffLayout | null;
  outcomes: readonly TargetOutcome[];
  /** Ticks before the step's bar 1 on the drawing: the count-in bar in time. */
  countInOffset: number;
  /** The step's bar (0-based) whose marker was pressed. */
  onLoopBar: (bar: number) => void;
  ticksPerBar?: number;
  timingToleranceTicks?: number;
}

interface Marker {
  tick: number;
  bar: number;
  beat: number;
  kinds: MistakeKind[];
}

/** "Missed", "2 missed, wrong" */
function describe(kinds: readonly MistakeKind[]): string {
  const text = KIND_ORDER.filter((kind) => kinds.includes(kind))
    .map((kind) => {
      const count = kinds.filter((k) => k === kind).length;
      const { word } = MISTAKE_MARKERS[kind];
      return count > 1 ? `${count} ${word}` : word;
    })
    .join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function MistakeMarkersOverlay({
  layout,
  outcomes,
  countInOffset,
  onLoopBar,
  ticksPerBar = 1920,
  timingToleranceTicks = EARLY_LATE_TOLERANCE_TICKS,
}: MistakeMarkersOverlayProps) {
  if (!layout) return null;

  const markers = new Map<number, Marker>();
  for (const outcome of outcomes) {
    const kind = outcomeMistake(outcome, timingToleranceTicks);
    if (!kind) continue;
    const tick = outcome.onsetTick + countInOffset;
    const marker = markers.get(tick) ?? {
      tick,
      bar: Math.floor(outcome.onsetTick / ticksPerBar),
      beat: Math.floor((outcome.onsetTick % ticksPerBar) / TICKS_PER_BEAT) + 1,
      kinds: [],
    };
    marker.kinds.push(kind);
    markers.set(tick, marker);
  }
  if (markers.size === 0) return null;

  return (
    <div
      role="group"
      aria-label="Mistakes"
      className="pointer-events-none absolute inset-0"
    >
      {[...markers.values()].map(({ tick, bar, beat, kinds }) => {
        const box = measureAt(layout, tick);
        if (!box) return null;
        const kind = KIND_ORDER.find((k) => kinds.includes(k))!;
        const { glyph, shape } = MISTAKE_MARKERS[kind];
        const label = `${describe(kinds)} at bar ${bar + 1}, beat ${beat}. Loop bar ${bar + 1}`;
        return (
          <button
            key={tick}
            type="button"
            data-mistake={kind}
            data-shape={shape}
            data-bar={bar}
            aria-label={label}
            title={label}
            onClick={() => onLoopBar(bar)}
            className="group pointer-events-auto absolute flex -translate-x-1/2 items-end justify-center rounded-full bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
            style={{
              left: tickX(layout, box, tick),
              // At the foot of the stems, clear of the fret digits, and
              // never below its own line.
              top: box.y + box.height - HIT_SIZE,
              width: HIT_SIZE,
              height: HIT_SIZE,
              paddingBottom: MARKER_INSET,
            }}
          >
            <span
              aria-hidden="true"
              data-mark
              className="flex items-center justify-center rounded-full text-xs font-bold leading-none transition-opacity group-hover:opacity-80"
              style={{
                width: MARKER_SIZE,
                height: MARKER_SIZE,
                ...SHAPE_PAINT[shape],
              }}
            >
              {glyph}
            </span>
          </button>
        );
      })}
    </div>
  );
}
