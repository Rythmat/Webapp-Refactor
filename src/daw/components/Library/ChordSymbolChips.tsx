import { NOTES } from '@prism/engine';
import { cn } from '@/components/utilities';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useChordNotation } from '@/lib/chordNotation';
import { INSIGHT_DIM, TintChip } from './InsightCard';
import { MODE_DISPLAY } from './insightConstants';
import { chordLabelSymbol, keyContext } from './insightNotation';

// ── Chord symbols found by an analysis (the analysis dialog) ───────────────
// Insight's Chord symbols card went (owner, 2026-10-24); the dialog that
// offers an analysis when a project opens still shows what it found.

const MAX_CHIPS = 16;

/** A key as "D Dorian". */
export function KeyLabel({
  rootNote,
  mode,
}: {
  rootNote: number;
  mode: string;
}) {
  return (
    <>
      {displayAccidentals(NOTES[rootNote])} {MODE_DISPLAY[mode] ?? mode}
    </>
  );
}

/** Chord symbols as chips in their chord colours, in the chosen notation. */
export function ChordSymbolChips({
  regions,
  rootNote,
  mode,
}: {
  regions: readonly ChordRegion[];
  /** The key the chords were read in (Roman numerals need it). */
  rootNote: number | null;
  mode: string;
}) {
  const notation = useChordNotation();
  const context = keyContext(rootNote, mode);
  return (
    <div className="flex flex-wrap gap-1">
      {regions.slice(0, MAX_CHIPS).map((r) => (
        <TintChip
          key={`${r.id}-${r.startTick}`}
          color={`rgb(${r.color.join(', ')})`}
        >
          {chordLabelSymbol(r.noteName, notation, context)}
        </TintChip>
      ))}
      {regions.length > MAX_CHIPS && (
        <span className={cn(INSIGHT_DIM, 'self-center px-1')}>
          +{regions.length - MAX_CHIPS} more
        </span>
      )}
    </div>
  );
}
