import type { StaffLayout } from '@/components/notation/StaffView';
import type { TargetOutcome } from '@/curriculum/hooks/useGenreAssessment';
import {
  EARLY_LATE_TOLERANCE_TICKS,
  outcomeMistake,
  type MistakeKind,
} from './nextStepSuggestion';
import { measureAt, tickX } from './staffLayoutBars';

// ── Mistake markers ────────────────────────────────────────────────────────
// After a take, a marker under each target that didn't land: its glyph says
// what went wrong, so the marker reads without its colour. Each one loops
// its bar.

const MARKER_SIZE = 18;
const TICKS_PER_BEAT = 480;

/** First wins when several targets share a tick (a chord's notes). */
const KIND_ORDER: readonly MistakeKind[] = [
  'missed',
  'wrong',
  'late',
  'early',
  'unclear',
];

export const MISTAKE_MARKERS: Readonly<
  Record<MistakeKind, { glyph: string; word: string; color: string }>
> = {
  missed: { glyph: '✗', word: 'missed', color: '#f87171' },
  wrong: { glyph: '≠', word: 'wrong', color: '#fb923c' },
  early: { glyph: '◀', word: 'early', color: '#60a5fa' },
  late: { glyph: '▶', word: 'late', color: '#60a5fa' },
  unclear: { glyph: '?', word: 'unclear', color: '#9a9aab' },
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
        const { glyph, color } = MISTAKE_MARKERS[kind];
        const label = `${describe(kinds)} at bar ${bar + 1}, beat ${beat}. Loop bar ${bar + 1}`;
        return (
          <button
            key={tick}
            type="button"
            data-mistake={kind}
            data-bar={bar}
            aria-label={label}
            title={label}
            onClick={() => onLoopBar(bar)}
            className="pointer-events-auto absolute flex -translate-x-1/2 items-center justify-center rounded-full p-0 text-[11px] font-bold leading-none hover:brightness-125 focus-visible:outline focus-visible:outline-2"
            style={{
              left: tickX(layout, box, tick),
              // In the room under the stems, clear of the fret digits.
              top: box.y + box.height - MARKER_SIZE + 4,
              width: MARKER_SIZE,
              height: MARKER_SIZE,
              background: 'rgba(25,25,25,0.95)',
              border: `1.5px solid ${color}`,
              color,
              outlineColor: color,
            }}
          >
            <span aria-hidden="true">{glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
