import { getChordColor, type SuggestionChord, type RGB } from '@prism/engine';
import { CHORD_QUALITY_LIBRARY } from '@/curriculum/data/chordQualityLibrary';
import type { Song } from '@/curriculum/types/songLibrary';
import { type ChordRegion, nextChordId } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { performedBars, writtenBarKeys } from './performance';
import { parseSectionLabel } from './sectionNames';
import { systemRowSizes } from './systems';

/* ── Types ───────────────────────────────────────────────────────────── */

export interface StudioExportOptions {
  voicingMode: 'auto' | 'block_chord' | 'arpeggiated';
  bassLine: boolean;
  loopSection?: string;
}

/* ── Constants ───────────────────────────────────────────────────────── */
const PPQ = 480; // pulses per quarter note — matches the DAW

/* ── Chord name → MIDI resolution ────────────────────────────────────── */

// Every spelling a chart can carry, including the four that only appear in
// remote keys (B♯, C♭, E♯, F♭) — an unlisted root silently became a C major
// triad, which is exactly the kind of chord a transposed chart can produce.
const NOTE_TO_MIDI: Record<string, number> = {
  'B♯': 60,
  C: 60,
  'C♯': 61,
  'D♭': 61,
  D: 62,
  'D♯': 63,
  'E♭': 63,
  E: 64,
  'F♭': 64,
  'E♯': 65,
  F: 65,
  'F♯': 66,
  'G♭': 66,
  G: 67,
  'G♯': 68,
  'A♭': 68,
  A: 69,
  'A♯': 70,
  'B♭': 70,
  B: 71,
  'C♭': 71,
};

// Canonical chord-quality id → intervals, built once from the library.
const INTERVALS_BY_ID = new Map<string, number[]>(
  CHORD_QUALITY_LIBRARY.map((q) => [q.id, q.rootPosition]),
);

// Maps the chord-name shorthand that appears verbatim in song data
// (after stripping root, parens, slash bass, and whitespace) to the
// canonical id in CHORD_QUALITY_LIBRARY. Anything that already matches
// a library id (e.g. "min7", "dim7", "sus2", "maj7") doesn't need an entry.
const QUALITY_ALIASES: Record<string, string> = {
  '': 'maj',
  m: 'min',
  M: 'maj',
  '-': 'min',
  m7: 'min7',
  M7: 'maj7',
  '-7': 'min7',
  m9: 'min9',
  m6: 'min6',
  m7b5: 'min7b5',
  ø: 'min7b5',
  ø7: 'min7b5',
  '°': 'dim',
  o: 'dim',
  '°7': 'dim7',
  o7: 'dim7',
  '+': 'aug',
  '5': 'power',
  '6': 'maj6',
  '7': 'dom7',
  '9': 'dom9',
  '11': 'dom11',
  '13': 'dom13',
  add9: 'add2',
  sus: 'sus4',
  sus7: 'dom7sus4',
  '7sus': 'dom7sus4',
  '7sus4': 'dom7sus4',
  '7sus2': 'dom7sus2',
  '7b9': 'dom7b9',
  '7#9': 'dom7s9',
  '7♯9': 'dom7s9',
  '7#5': 'dom7s5',
  '7♯5': 'dom7s5',
  '7aug': 'dom7s5',
  '7b5': 'dom7b5',
  '7♭5': 'dom7b5',
  alt: 'dom7b5',
  alt7: 'dom7b5',
  '7alt': 'dom7b5',
  '7#11': 'dom7s11',
  '7♯11': 'dom7s11',
  mMaj7: 'min_maj7',
  minMaj7: 'min_maj7',
};

const FALLBACK_TRIAD: number[] = [0, 4, 7];
const warnedForQuality = new Set<string>();

function resolveQualityIntervals(remainder: string): number[] {
  const id = QUALITY_ALIASES[remainder] ?? remainder;
  const intervals = INTERVALS_BY_ID.get(id);
  if (intervals) return intervals;
  if (!warnedForQuality.has(remainder)) {
    warnedForQuality.add(remainder);
    console.warn(
      `[chordNameToMidi] Unknown chord quality "${remainder}" — falling back to major triad. ` +
        `Add it to QUALITY_ALIASES in exportToStudio.ts.`,
    );
  }
  return FALLBACK_TRIAD;
}

function chordNameToMidi(chordName: string): number[] {
  if (!chordName) return [60, 64, 67];
  if (chordName === 'N.C.' || chordName === 'NC') return [];

  const rootMatch = chordName.match(/^([A-G][♭♯]?)/);
  if (!rootMatch) return [60, 64, 67];
  const rootNote = rootMatch[1];
  const rootMidi = NOTE_TO_MIDI[rootNote];
  if (rootMidi == null) return [60, 64, 67];

  const remainder = chordName
    .slice(rootNote.length)
    .replace(/\(.*\)/, '')
    .replace(/\/[A-G][♭♯]?$/, '')
    .replace(/\s+/g, '')
    .trim();

  return resolveQualityIntervals(remainder).map((i) => rootMidi + i);
}

/* ── Export as ChordRegions (correct beat/measure timing) ────────────── */

/**
 * Convert a song's chord chart into ChordRegion[] with correct tick positions.
 * Each chord lands on its exact beat within its measure.
 *
 * PPQ = 480, so:
 * - 1 quarter note = 480 ticks
 * - 1 bar (4/4) = 1920 ticks
 * - Beat 1 = 0, Beat 2 = 480, Beat 3 = 960, Beat 4 = 1440
 */
export function exportSongToChordRegions(
  song: Song,
  opts: StudioExportOptions,
): {
  regions: ChordRegion[];
  chordSeq: number[][];
  stringSeq: string[];
  restMap: Record<number, number>;
  fermatas: number[];
  /** Visual bar count per section row (1 rest bar = 1 visual slot regardless of restBars count) */
  rowSizes: number[];
  /** Boxed section labels at the bar each performed section starts. */
  sectionMarks: Array<{ measureIdx: number; label: string }>;
} {
  const beatsPerBar = song.timeSignature[0];
  const ticksPerBar = beatsPerBar * PPQ;

  const played: Song = opts.loopSection
    ? {
        ...song,
        sections: song.sections.filter((s) => s.id === opts.loopSection),
      }
    : song;
  const keys = writtenBarKeys(played);

  const regions: ChordRegion[] = [];
  const chordSeq: number[][] = [];
  const stringSeq: string[] = [];
  const restMap: Record<number, number> = {};
  const fermatas: number[] = [];
  const rowSizes: number[] = [];
  const runs: Array<{ sectionIdx: number; measureIdx: number; bars: number }> =
    [];
  let barIndex = 0;
  let prevWritten = -1;

  for (const { sectionIdx, bar, writtenIdx } of performedBars(played)) {
    // A new run starts at a new section or wherever the roadmap jumps back.
    const run = runs[runs.length - 1];
    if (!run || run.sectionIdx !== sectionIdx || writtenIdx <= prevWritten)
      runs.push({ sectionIdx, measureIdx: barIndex, bars: 1 });
    else run.bars++;
    prevWritten = writtenIdx;

    if (bar.fermata) fermatas.push(barIndex);

    if (bar.restBars != null) {
      // Record the rest at the current barIndex, then advance by restBars;
      // it takes one visual slot.
      restMap[barIndex] = bar.restBars;
      barIndex += bar.restBars;
      continue;
    }

    const barStartTick = barIndex * ticksPerBar;
    const key = keys[writtenIdx];

    for (const hit of bar.chords) {
      if (!hit.chordName) continue;

      const beatOffset = (hit.beat - 1) * PPQ; // beat 1→0, beat 3→960
      const startTick = barStartTick + beatOffset;
      const durationTicks = hit.duration * PPQ;
      const endTick = startTick + durationTicks;

      const midi = chordNameToMidi(hit.chordName);

      let color: [number, number, number];
      try {
        // Degrees count from the local key after a key change.
        const c = getChordColor(hit.degree, 60 + key.tonicPc, key.mode) as RGB;
        color = [c[0], c[1], c[2]];
      } catch {
        color = [200, 200, 200];
      }

      regions.push({
        id: nextChordId(),
        startTick,
        endTick,
        name: hit.degree || hit.chordName,
        noteName: hit.chordName,
        color,
        midis: midi,
      });

      chordSeq.push(midi);
      stringSeq.push(hit.degree || hit.chordName);
    }

    barIndex++;
  }

  // Systems of four (or the section's own row length) within each run, a
  // leftover bar or two folded into the system before.
  for (const run of runs)
    rowSizes.push(
      ...systemRowSizes(
        run.bars,
        played.sections[run.sectionIdx].measuresPerRow,
      ),
    );

  return {
    regions,
    chordSeq,
    stringSeq,
    restMap,
    fermatas,
    rowSizes,
    sectionMarks: numberedRunLabels(played, runs),
  };
}

/**
 * The label for each performed run. A name played more than once is numbered
 * in order — the chart's one "Verse" with a repeat plays as Verse 1 and 2 —
 * unless the chart already numbers it.
 */
function numberedRunLabels(
  song: Song,
  runs: Array<{ sectionIdx: number; measureIdx: number }>,
): Array<{ measureIdx: number; label: string }> {
  const nameOf = (label: string) => parseSectionLabel(label)?.name ?? label;
  const total = new Map<string, number>();
  for (const run of runs) {
    const name = nameOf(song.sections[run.sectionIdx].label);
    total.set(name, (total.get(name) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const marks: Array<{ measureIdx: number; label: string }> = [];
  let prev: number | null = null;
  for (const run of runs) {
    const label = song.sections[run.sectionIdx].label;
    const name = nameOf(label);
    const nth = (seen.get(name) ?? 0) + 1;
    seen.set(name, nth);
    // One label per run; the same written section run twice back to back
    // still gets its own number.
    const numbered = (total.get(name) ?? 0) > 1 ? `${name} ${nth}` : label;
    if (label && prev !== run.measureIdx)
      marks.push({ measureIdx: run.measureIdx, label: numbered });
    prev = run.measureIdx;
  }
  return marks;
}

/* ── ChordRegions → MidiClip (block chords, full song) ───────────────── */

/**
 * Convert chord regions into a single MidiClip whose events span the full
 * progression. Each region contributes one held note per pitch in `midis`.
 * Returns null when there are no playable notes.
 */
export function chordRegionsToMidiClip(
  regions: ChordRegion[],
): MidiClip | null {
  if (regions.length === 0) return null;
  const events = regions.flatMap((r) =>
    (r.midis ?? []).map((note) => ({
      note,
      velocity: 80,
      startTick: r.startTick,
      durationTicks: Math.max(1, r.endTick - r.startTick),
      channel: 0,
    })),
  );
  if (events.length === 0) return null;
  const maxEndTick = regions.reduce((m, r) => Math.max(m, r.endTick), 0);
  return {
    id: crypto.randomUUID(),
    name: 'Chords',
    startTick: 0,
    durationTicks: maxEndTick,
    events,
  };
}

/* ── Legacy: flat SuggestionChord[] export (for loadProgression) ─────── */

export function exportSongToStudio(
  song: Song,
  opts: StudioExportOptions,
): SuggestionChord[] {
  const sections = opts.loopSection
    ? song.sections.filter((s) => s.id === opts.loopSection)
    : song.sections;

  const chords: SuggestionChord[] = [];
  const played: Song = { ...song, sections };
  const keys = writtenBarKeys(played);

  for (const { bar, writtenIdx } of performedBars(played)) {
    if (bar.restBars != null) continue;
    const key = keys[writtenIdx];
    for (const hit of bar.chords) {
      if (!hit.chordName) continue;
      const midi = chordNameToMidi(hit.chordName);
      let color: RGB;
      try {
        color = getChordColor(hit.degree, 60 + key.tonicPc, key.mode) as RGB;
      } catch {
        color = [200, 200, 200] as unknown as RGB;
      }
      chords.push({
        degree: hit.degree || '1 maj',
        quality: hit.chordName,
        noteName: hit.chordName,
        midi,
        color,
      });
    }
  }

  return chords;
}
