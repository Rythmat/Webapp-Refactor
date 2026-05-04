import { getChordColor, type SuggestionChord, type RGB } from '@prism/engine';
import type { Song } from '@/curriculum/types/songLibrary';
import { type ChordRegion, nextChordId } from '@/daw/store/prismSlice';

/* ── Types ───────────────────────────────────────────────────────────── */

export interface StudioExportOptions {
  voicingMode: 'auto' | 'block_chord' | 'arpeggiated';
  bassLine: boolean;
  loopSection?: string;
}

/* ── Constants ───────────────────────────────────────────────────────── */
const PPQ = 480; // pulses per quarter note — matches the DAW

/* ── Chord name → MIDI resolution ────────────────────────────────────── */

const NOTE_TO_MIDI: Record<string, number> = {
  'C': 60, 'C♯': 61, 'D♭': 61, 'D': 62, 'D♯': 63, 'E♭': 63, 'E': 64,
  'F': 65, 'F♯': 66, 'G♭': 66, 'G': 67, 'G♯': 68, 'A♭': 68, 'A': 69,
  'A♯': 70, 'B♭': 70, 'B': 71,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  'maj': [0, 4, 7], 'min': [0, 3, 7], 'm': [0, 3, 7],
  'dim': [0, 3, 6], 'aug': [0, 4, 8],
  '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], 'm7': [0, 3, 7, 10],
  'dim7': [0, 3, 6, 9], 'sus': [0, 5, 7], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7],
  '7sus': [0, 5, 7, 10], 'alt7': [0, 4, 6, 10], 'alt': [0, 4, 6, 10],
  '9': [0, 4, 7, 10, 14], 'min9': [0, 3, 7, 10, 14], 'add9': [0, 4, 7, 14],
  '6': [0, 4, 7, 9], 'min6': [0, 3, 7, 9], 'power': [0, 7],
};

function chordNameToMidi(chordName: string): number[] {
  if (!chordName) return [60, 64, 67];
  const rootMatch = chordName.match(/^([A-G][♭♯]?)/);
  if (!rootMatch) return [60, 64, 67];
  const rootNote = rootMatch[1];
  const rootMidi = NOTE_TO_MIDI[rootNote];
  if (rootMidi == null) return [60, 64, 67];

  const remainder = chordName.slice(rootNote.length)
    .replace(/\(.*\)/, '')
    .replace(/\/[A-G][♭♯]?$/, '')
    .replace(/\s+/g, '')
    .trim();
  const quality = remainder || 'maj';
  const intervals = QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS['maj'];
  return intervals.map(i => rootMidi + i);
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
} {
  const rootMidi = song.keyRoot;
  const beatsPerBar = song.timeSignature[0];
  const ticksPerBar = beatsPerBar * PPQ;
  const defaultMeasuresPerRow = 4;

  const sections = opts.loopSection
    ? song.sections.filter((s) => s.id === opts.loopSection)
    : song.sections;

  const regions: ChordRegion[] = [];
  const chordSeq: number[][] = [];
  const stringSeq: string[] = [];
  const restMap: Record<number, number> = {};
  const fermatas: number[] = [];
  const rowSizes: number[] = [];
  let barIndex = 0;

  for (const section of sections) {
    const perRow = section.measuresPerRow ?? defaultMeasuresPerRow;
    let visualBarsInSection = 0;
    const repeats = section.repeatCount ?? 1;
    for (let rep = 0; rep < repeats; rep++) {
      for (const bar of section.bars) {
        if (bar.fermata) {
          fermatas.push(barIndex);
        }

        if (bar.restBars != null) {
          // Record the rest at the current barIndex, then advance by restBars
          restMap[barIndex] = bar.restBars;
          barIndex += bar.restBars;
          visualBarsInSection++; // 1 visual slot for the rest notation
          continue;
        }

        const barStartTick = barIndex * ticksPerBar;

        for (const hit of bar.chords) {
          if (!hit.chordName) continue;

          const beatOffset = (hit.beat - 1) * PPQ; // beat 1→0, beat 3→960
          const startTick = barStartTick + beatOffset;
          const durationTicks = hit.duration * PPQ;
          const endTick = startTick + durationTicks;

          const midi = chordNameToMidi(hit.chordName);

          let color: [number, number, number];
          try {
            const c = getChordColor(hit.degree, rootMidi, song.mode) as RGB;
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
        visualBarsInSection++;
      }
    }

    // Compute row sizes for this section (visual bars, not functional)
    for (let i = 0; i < visualBarsInSection; i += perRow) {
      rowSizes.push(Math.min(perRow, visualBarsInSection - i));
    }
  }

  return { regions, chordSeq, stringSeq, restMap, fermatas, rowSizes };
}

/* ── Legacy: flat SuggestionChord[] export (for loadProgression) ─────── */

export function exportSongToStudio(
  song: Song,
  opts: StudioExportOptions,
): SuggestionChord[] {
  const rootMidi = song.keyRoot;
  const sections = opts.loopSection
    ? song.sections.filter((s) => s.id === opts.loopSection)
    : song.sections;

  const chords: SuggestionChord[] = [];

  for (const section of sections) {
    const repeats = section.repeatCount ?? 1;
    for (let rep = 0; rep < repeats; rep++) {
      for (const bar of section.bars) {
        if (bar.restBars != null) continue;
        for (const hit of bar.chords) {
          if (!hit.chordName) continue;
          const midi = chordNameToMidi(hit.chordName);
          let color: RGB;
          try { color = getChordColor(hit.degree, rootMidi, song.mode) as RGB; }
          catch { color = [200, 200, 200] as unknown as RGB; }
          chords.push({ degree: hit.degree || '1 maj', quality: hit.chordName, noteName: hit.chordName, midi, color });
        }
      }
    }
  }

  return chords;
}
