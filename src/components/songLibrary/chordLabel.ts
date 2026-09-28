import {
  writtenBarKeys,
  type LocalKey,
} from '@/curriculum/songLibrary/performance';
import type { ChordHit, Song } from '@/curriculum/types/songLibrary';
import {
  formatChord as formatChordSymbol,
  parseChord,
  type ChordContext,
  type ChordNotation,
} from '@/lib/chordNotation';
import { normalizeMode } from './ChordDiagramCard';

/**
 * What a chord is called on a chart.
 *
 * The staff chart and the phone's chord grid draw the same song in very
 * different ways, but they must never disagree about what a chord is called.
 * The rule lives here so they cannot drift: both ask this module.
 */

/** Letters as written, or the chart's own hybrid numbers. */
export type DisplayMode = 'chordName' | 'hybrid';

export function formatChord(hit: ChordHit, mode: DisplayMode): string {
  return mode === 'hybrid' ? hit.degree : hit.chordName;
}

/** `symbol`: the jazz or Roman symbol when one is shown; else the degree is read. */
export function chordAriaLabel(hit: ChordHit, symbol?: string | null): string {
  return `${symbol ?? hit.degree} chord, beat ${hit.beat}, ${hit.duration} beat${hit.duration !== 1 ? 's' : ''}`;
}

/**
 * The chord written in jazz or Roman notation, or null in hybrid, where the
 * chart keeps its own labels. Written from the letter name and the song's key:
 * jazz keeps the letters ("B/D♯"), Roman numbers them ("V/7"). A name the
 * formatter can't write in that notation shows the hit's own label of the same
 * kind instead — the letter name for jazz, the degree for Roman.
 */
export function chordSymbol(
  hit: ChordHit,
  notation: ChordNotation,
  context: ChordContext,
): string | null {
  if (notation === 'hybrid') return null;
  const fallback = notation === 'jazz' ? hit.chordName : hit.degree;
  const spec = parseChord(hit.chordName);
  if (!spec) return fallback;
  const symbol = formatChordSymbol(spec, notation, context);
  // formatChord answers in hybrid ("G♯ 7(♯9)") when it can't write the chord.
  return symbol === formatChordSymbol(spec, 'hybrid', context)
    ? fallback
    : symbol;
}

/** The text to draw for one chord, however the reader has set things up. */
export function chordText(
  hit: ChordHit,
  displayMode: DisplayMode,
  notation: ChordNotation,
  context: ChordContext,
): string {
  return chordSymbol(hit, notation, context) ?? formatChord(hit, displayMode);
}

export interface SongKeyMap {
  /** The key of every bar, grouped by section and indexed like `bars`. */
  sectionKeys: LocalKey[][];
  /** The key in force where each chord sits. */
  keyOfHit: Map<ChordHit, LocalKey>;
}

/**
 * The key each bar is written in, so a key change moves the chord symbols,
 * degrees and colours to the new tonic from that bar on.
 */
export function songKeyMap(song: Song): SongKeyMap {
  const flat = writtenBarKeys(song);
  const sectionKeys: LocalKey[][] = [];
  const keyOfHit = new Map<ChordHit, LocalKey>();
  let at = 0;
  for (const section of song.sections) {
    const keys = flat.slice(at, at + section.bars.length);
    sectionKeys.push(keys);
    section.bars.forEach((bar, bi) => {
      for (const hit of bar.chords) keyOfHit.set(hit, keys[bi]);
    });
    at += section.bars.length;
  }
  return { sectionKeys, keyOfHit };
}

/** A local key as the chord formatter wants it. */
export const contextOf = (key: LocalKey | undefined): ChordContext =>
  key ? { keyRootPc: key.tonicPc, mode: normalizeMode(key.mode) } : {};
