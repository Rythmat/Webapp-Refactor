import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  formatChord,
  formatChordLabel,
  parseChord,
  type ChordContext,
  type ChordNotation,
  type ChordSpec,
} from '@/lib/chordNotation';
import type { UnisonChordRegion } from '@/unison/types/schema';

// ── Insight chord symbols in the chosen notation ───────────────────────────
// Hybrid keeps each site's current text; jazz and Roman write one symbol per
// chord from the structured data the site has (root, quality, key).

/** A displayed note name ("B♭", "E𝄫") back to the letters formatChord reads. */
export const letterName = (display: string) =>
  display
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\u{1D12B}/gu, 'bb')
    .replace(/\u{1D12A}/gu, '##');

/** The key chords are read in: a session's rootNote and mode, or an analysis's. */
export const keyContext = (
  rootPc: number | null | undefined,
  mode: string | null | undefined,
): ChordContext => ({ keyRootPc: rootPc ?? null, mode: mode ?? null });

/**
 * A letter chord label ("D min9", "C maj7/E") as a chip shows it: as today in
 * hybrid, the one symbol in jazz or Roman.
 */
export const chordLabelSymbol = (
  label: string,
  notation: ChordNotation,
  context: ChordContext,
) => displayAccidentals(formatChordLabel(label, notation, context));

/**
 * An analyzed chord as a ChordSpec: its root pitch class and quality, spelled
 * with its letter name's root (and slash bass) when that name agrees.
 */
export function analyzedChordSpec(
  chord: Pick<UnisonChordRegion, 'rootPc' | 'quality' | 'noteName'>,
): ChordSpec {
  const named = parseChord(chord.noteName);
  const spelled =
    typeof named?.root === 'string' &&
    noteNameToPitchClass(named.root) === chord.rootPc;
  return {
    root: spelled ? named!.root : chord.rootPc,
    quality: chord.quality,
    ...(spelled && named!.bass ? { bass: named!.bass } : {}),
  };
}

const INVERSION_LABELS = [
  '',
  '1st Inversion',
  '2nd Inversion',
  '3rd Inversion',
];

/**
 * Now Playing's chord: in hybrid the letter label plus the hybrid number (as
 * today); in jazz or Roman one symbol. The inversion text is kept either way.
 */
export function liveChordLabels(
  chord: {
    rootLetter: string;
    quality: string;
    inversion: number;
    /** Today's letter label, "D min7 (1st Inversion)". */
    chordLabel: string;
    /** Today's hybrid number, "2 min7"; null without a key. */
    hybrid: string | null;
  },
  notation: ChordNotation,
  context: ChordContext,
): { title: string; detail: string | null } {
  if (notation === 'hybrid') {
    return { title: chord.chordLabel, detail: chord.hybrid };
  }
  const symbol = formatChord(
    { root: letterName(chord.rootLetter), quality: chord.quality },
    notation,
    context,
  );
  const inversion = INVERSION_LABELS[chord.inversion];
  return {
    title: inversion ? `${symbol} (${inversion})` : symbol,
    detail: null,
  };
}

/**
 * A chord card's title and letter label: hybrid number plus letter name in
 * hybrid (as today); the one symbol, no letter label, in jazz or Roman.
 */
export function chordCardLabels(
  chord: {
    rootLetter: string;
    quality: string;
    hybrid: string;
    chordLabel: string;
  },
  notation: ChordNotation,
  context: ChordContext,
): { title: string; detail: string | null } {
  if (notation === 'hybrid') {
    return { title: chord.hybrid, detail: chord.chordLabel };
  }
  return {
    title: formatChord(
      { root: letterName(chord.rootLetter), quality: chord.quality },
      notation,
      context,
    ),
    detail: null,
  };
}
