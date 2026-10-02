import type { StaffLayout } from '@/components/notation/StaffView';
import type { LessonChordSymbol } from './lessonChordSymbols';

/**
 * Lead-sheet type: the same 16px bold Glacial Studio's lead sheet draws, so a
 * chord looks the same wherever the student reads it.
 */
const CHORD_FONT_SIZE = 16;
/** Clear air between the bottom of a symbol and the ink it stands over. */
const CHORD_GAP = 6;
/** Ledger lines and the notehead's own outline reach past its centre. */
const NOTE_CLEARANCE = 3;

/** The top edge to draw a symbol at, in the same scaled px the layout reports. */
export function chordSymbolTop(
  /** The measure box's `y`: the top of the stave's SPACE, not its first line. */
  boxY: number,
  /** Scaled distance from that `y` down to the top staff line. */
  topLineDrop: number,
  /** Notehead centres in this bar, and each one's half-space, scaled. */
  notes: ReadonlyArray<{ y: number; space: number }>,
  scale: number,
): number {
  const staffTop = boxY + topLineDrop;
  // A note above the top line pushes the symbol up; one below it never pulls
  // the symbol down onto the staff, because `staffTop` is the other bound.
  const highestNote = notes.length
    ? Math.min(...notes.map((n) => n.y - n.space - NOTE_CLEARANCE * scale))
    : Infinity;
  // `top` sets the element's top edge and the line box is one font size tall,
  // so lift it by its own height to leave the gap below its baseline.
  return (
    Math.min(staffTop, highestNote) -
    CHORD_GAP * scale -
    CHORD_FONT_SIZE * scale
  );
}

interface ChordSymbolOverlayProps {
  symbols: readonly LessonChordSymbol[];
  layout: StaffLayout | null;
}

/**
 * Chord symbols drawn over the staff, positioned from the layout StaffView
 * reports, so they travel with the staff when it scrolls or rescales.
 *
 * ANCHORED TO THE NOTEHEAD, NOT THE BAR
 * A symbol sits directly above the note it names — beat 3's chord over beat 3's
 * notehead, an arpeggio's chord over its first note. Notation spacing is not
 * linear in time (VexFlow widens around accidentals, beams and rests), so
 * placing a symbol at a fraction of the measure's width lands it beside its
 * chord rather than above it. The drawn note's own x is the only reliable
 * anchor. Measure-proportional placement is kept only as a fallback for a tick
 * with no note drawn at it.
 *
 * A symbol whose tick falls outside every drawn measure is skipped rather than
 * clamped: better absent than sitting over the wrong bar.
 *
 * SITS ON THE STAFF IT NAMES
 * Vertically a symbol rides just above its own staff, or above the highest
 * notehead in its bar when the music climbs over the top line. It used to hang
 * from the top of the system's reserved headroom instead, which put it most of
 * a stave clear of the music it names — and, once systems began to wrap, left
 * it floating among the ledger lines of the system above.
 */
export function ChordSymbolOverlay({
  symbols,
  layout,
}: ChordSymbolOverlayProps) {
  if (!layout || symbols.length === 0) return null;

  // The top staff of each system carries the chords, as on a lead sheet.
  const topPart = Math.min(...layout.measures.map((m) => m.partIndex));

  return (
    <div className="pointer-events-none absolute inset-0">
      {symbols.map((symbol) => {
        const box = layout.measures.find(
          (m) =>
            m.partIndex === topPart &&
            symbol.startTick >= m.startTick &&
            symbol.startTick < m.endTick,
        );
        if (!box) return null;

        // The leftmost note drawn at this tick — on a grand staff both staves
        // align, so either hand's notehead gives the same x.
        const anchors = layout.notes.filter(
          (n) => n.partIndex === box.partIndex && n.tick === symbol.startTick,
        );
        const span = box.endTick - box.startTick || 1;
        const left = anchors.length
          ? Math.min(...anchors.map((n) => n.x))
          : box.x + ((symbol.startTick - box.startTick) / span) * box.width;

        const inBar = layout.notes.filter(
          (n) =>
            n.partIndex === box.partIndex &&
            n.measureIndex === box.measureIndex,
        );
        const fontSize = CHORD_FONT_SIZE * layout.scale;

        return (
          <span
            key={symbol.id}
            className="absolute whitespace-nowrap"
            style={{
              left,
              top: chordSymbolTop(
                box.y,
                layout.topLineDrop,
                inBar,
                layout.scale,
              ),
              fontFamily: "'Glacial Indifference', system-ui, sans-serif",
              fontSize: `${fontSize}px`,
              fontWeight: 700,
              lineHeight: 1,
              // The staff's own ink, as on a lead sheet — the chords are read,
              // not decoration, so they don't take the lesson's key tint.
              color: 'var(--color-text)',
            }}
          >
            {symbol.text}
          </span>
        );
      })}
    </div>
  );
}
