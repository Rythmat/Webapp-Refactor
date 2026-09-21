import type { StaffLayout } from '@/components/notation/StaffView';
import type { LessonChordSymbol } from './lessonChordSymbols';

/**
 * Lead-sheet type: the same 16px bold serif Studio's lead sheet draws, so a
 * chord looks the same wherever the student reads it. StaffView reserves 28px
 * of headroom above each system (SYSTEM_TOP), and the baseline sits inside it.
 */
const CHORD_FONT_SIZE = 16;
const CHORD_OFFSET = 24;

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

        return (
          <span
            key={symbol.id}
            className="absolute whitespace-nowrap"
            style={{
              left,
              top: box.y - CHORD_OFFSET * layout.scale,
              fontFamily: 'serif',
              fontSize: `${CHORD_FONT_SIZE * layout.scale}px`,
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
