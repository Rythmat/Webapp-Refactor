import type { DurationChoice } from './noteEditor';
import { writtenName, type InputTarget } from './noteInput';

// ── Note input, drawn ──────────────────────────────────────────────────────
// What note input shows over the staves: the ghost of the note a press would
// write, with the ledger lines it needs, and the cursor where a typed letter
// writes next. Drawn in the music's own SMuFL font at the staff's size, and
// in the marks layer's class so the staff's repaint rules leave it alone.

/** A notehead's half width, in staff steps (VexFlow's 5.9 px at 5 px). */
const HEAD_HALF = 1.18;
/** A ledger line reaches this far past the head, either side. */
const LEDGER_HALF = 2;
/** The staff's top line to its bottom one. */
const STAFF_STEPS = 8;

/** SMuFL's whole note, then each value's stem-up glyph; stem down is +1. */
const WHOLE = '';
const AUGMENTATION_DOT = '';

/** The note glyph for a value, stem up or down. */
function noteGlyph(duration: DurationChoice, stemDown: boolean): string {
  if (duration.quarters >= 4) return WHOLE;
  const up = duration.glyph.codePointAt(0) ?? 0;
  return String.fromCodePoint(stemDown ? up + 1 : up);
}

export interface NoteInputLayerProps {
  /** Where a press would write, or null with the pointer off the staves. */
  ghost: InputTarget | null;
  duration: DurationChoice;
  dotted: boolean;
  /** The ghost's part's key, to name the note it would write. */
  keyFifths: number;
  /** Where the input cursor stands, when its tick has a bar on the page. */
  cursor: { x: number; topLineY: number } | null;
  cursorTick: number | null;
  /** One staff step (a line to the next space), in layout px. */
  stepPx: number;
}

export function NoteInputLayer({
  ghost,
  duration,
  dotted,
  keyFifths,
  cursor,
  cursorTick,
  stepPx,
}: NoteInputLayerProps) {
  const ledgers: number[] = [];
  if (ghost) {
    for (let p = -2; p >= ghost.position; p -= 2) ledgers.push(p);
    for (let p = STAFF_STEPS + 2; p <= ghost.position; p += 2) ledgers.push(p);
  }
  // At or above the middle line the stem goes down, as engraving has it.
  const stemDown = !!ghost && ghost.position <= STAFF_STEPS / 2;
  // A dot sits in a space: a note on a line puts it in the space above.
  const dotY = ghost ? ghost.y - (ghost.position % 2 === 0 ? stepPx : 0) : 0;
  const dotX = ghost
    ? ghost.x + stepPx * (duration.quarters < 1 && !stemDown ? 3.6 : 2.4)
    : 0;

  return (
    <svg
      className="ma-marks pointer-events-none absolute inset-0 size-full overflow-visible"
      aria-hidden
    >
      {cursor && (
        <rect
          data-note-cursor={cursorTick ?? ''}
          x={cursor.x - 1.6 * stepPx}
          y={cursor.topLineY - 2 * stepPx}
          width={3.2 * stepPx}
          height={(STAFF_STEPS + 4) * stepPx}
          rx={stepPx * 0.6}
          fill="var(--daw-text)"
          fillOpacity={0.12}
          stroke="var(--daw-text)"
          strokeOpacity={0.55}
          strokeWidth={1}
        />
      )}
      {ghost && (
        <g
          data-note-ghost={`${ghost.midi}@${ghost.tick}`}
          fill="var(--daw-text)"
          stroke="var(--daw-text)"
          opacity={0.6}
        >
          {ledgers.map((p) => (
            <line
              key={p}
              x1={ghost.x - LEDGER_HALF * stepPx}
              x2={ghost.x + LEDGER_HALF * stepPx}
              y1={ghost.topLineY + p * stepPx}
              y2={ghost.topLineY + p * stepPx}
              strokeWidth={Math.max(1, stepPx * 0.26)}
            />
          ))}
          <text
            x={ghost.x - HEAD_HALF * stepPx}
            y={ghost.y}
            fontFamily="Bravura"
            fontSize={stepPx * 8}
            stroke="none"
          >
            {noteGlyph(duration, stemDown)}
          </text>
          {dotted && (
            <text
              x={dotX}
              y={dotY}
              fontFamily="Bravura"
              fontSize={stepPx * 8}
              stroke="none"
            >
              {AUGMENTATION_DOT}
            </text>
          )}
          <text
            x={ghost.x + stepPx * (stemDown ? 2.4 : 4.4)}
            y={ghost.y + (stemDown ? -2.2 : 2.2) * stepPx}
            fontFamily="'Glacial Indifference', system-ui, sans-serif"
            fontSize={12}
            fontWeight={700}
            stroke="none"
          >
            {writtenName(ghost.step, keyFifths)}
          </text>
        </g>
      )}
    </svg>
  );
}
