import type { ChordRegion } from '@/daw/store/prismSlice';

// ── Constants ────────────────────────────────────────────────────────────

export const PPQ = 480;

/** @deprecated Use ticksPerBar(numerator, denominator) from timelineScale.ts */
export const BEATS_PER_MEASURE = 4;
/** @deprecated Use ticksPerBar(numerator, denominator) from timelineScale.ts */
export const TICKS_PER_MEASURE = PPQ * BEATS_PER_MEASURE; // 1920

// ── Types ────────────────────────────────────────────────────────────────

export interface MeasureChord {
  /** Beat offset within the measure (0 = beat 1, 480 = beat 2, etc.) */
  beatOffsetTicks: number;
  /** Stable ID of the ChordRegion */
  regionId: string;
  /** Degree-based name (e.g., "1 maj") */
  name: string;
  /** Note-letter name (e.g., "C maj7") */
  noteName: string;
}

export interface Measure {
  /** 0-based measure index */
  index: number;
  /** Tick position of the measure start */
  startTick: number;
  /** Chords that begin or are active within this measure */
  chords: MeasureChord[];
  /** True if this measure has identical chord content to the previous measure */
  isRepeatOfPrevious: boolean;
}

export interface ParsedChord {
  root: string; // e.g. "Eb", "F#", "C"
  quality: string; // e.g. "min7", "dom7", "maj"
}

export type ChordFormat = 'jazz' | 'hybrid' | 'numbers';

// ── Measure Quantization ─────────────────────────────────────────────────

/**
 * Convert ChordRegion[] into a measure-based structure.
 * Each measure contains the chords whose startTick falls within it,
 * plus any chord that started in a prior measure and is still active
 * at beat 1 (carried over as a chord at offset 0).
 */
/** Minimum confidence for a chord region to appear on the lead sheet. */
const MIN_CONFIDENCE = 0.5;

export function regionToMeasures(
  regions: ChordRegion[],
  ticksPerMeasure = TICKS_PER_MEASURE,
): Measure[] {
  // Phase 9: Filter out low-confidence regions before building measures.
  // Regions without a confidence score (e.g., manually inserted) always pass.
  const filtered = regions.filter(
    (r) => r.confidence === undefined || r.confidence >= MIN_CONFIDENCE,
  );

  if (filtered.length === 0) {
    // Return 4 empty measures as a blank lead sheet
    return Array.from({ length: 4 }, (_, i) => ({
      index: i,
      startTick: i * ticksPerMeasure,
      chords: [],
      isRepeatOfPrevious: false,
    }));
  }

  const maxTick = Math.max(...filtered.map((r) => r.endTick));
  const totalMeasures = Math.max(4, Math.ceil(maxTick / ticksPerMeasure));
  const measures: Measure[] = [];

  for (let m = 0; m < totalMeasures; m++) {
    const mStart = m * ticksPerMeasure;
    const mEnd = mStart + ticksPerMeasure;
    const chords: MeasureChord[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];

      // Chord starts within this measure
      if (r.startTick >= mStart && r.startTick < mEnd) {
        chords.push({
          beatOffsetTicks: r.startTick - mStart,
          regionId: r.id,
          name: r.name,
          noteName: r.noteName,
        });
      }
      // Chord started before this measure but is still active at beat 1
      else if (r.startTick < mStart && r.endTick > mStart) {
        // Only carry over if no chord already starts at beat 1 of this measure
        const hasChordAtBeat1 = chords.some((c) => c.beatOffsetTicks === 0);
        if (!hasChordAtBeat1) {
          chords.push({
            beatOffsetTicks: 0,
            regionId: r.id,
            name: r.name,
            noteName: r.noteName,
          });
        }
      }
    }

    // Sort by beat position
    chords.sort((a, b) => a.beatOffsetTicks - b.beatOffsetTicks);

    measures.push({
      index: m,
      startTick: mStart,
      chords,
      isRepeatOfPrevious: false,
    });
  }

  // Detect consecutive measures with identical chord content
  for (let m = 1; m < measures.length; m++) {
    const prev = measures[m - 1];
    const curr = measures[m];
    if (
      curr.chords.length > 0 &&
      curr.chords.length === prev.chords.length &&
      curr.chords.every(
        (c, i) =>
          c.beatOffsetTicks === prev.chords[i].beatOffsetTicks &&
          c.noteName === prev.chords[i].noteName,
      )
    ) {
      curr.isRepeatOfPrevious = true;
    }
  }

  return measures;
}

// ── Chord Name Parsing ───────────────────────────────────────────────────

/**
 * Parse an abbreviated noteName like "Eb min7" into root and quality parts.
 */
export function parseChordDisplay(noteName: string): ParsedChord {
  const trimmed = noteName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx < 0) {
    return { root: trimmed, quality: 'maj' };
  }
  return {
    root: trimmed.substring(0, spaceIdx),
    quality: trimmed.substring(spaceIdx + 1),
  };
}

// ── Jazz Shorthand Formatting ────────────────────────────────────────────

/**
 * Map from abbreviated quality → jazz shorthand display.
 * Keys are the abbreviated forms produced by abbreviateSequence().
 */
const JAZZ_MAP: Record<string, string> = {
  // Triads
  maj: '', // C (no suffix for major triad in jazz)
  min: 'm',
  aug: '+',
  dim: '\u00B0', // °
  sus2: 'sus2',
  sus4: 'sus4',
  '5': '5',
  quartal: 'quartal',

  // 6ths
  maj6: '6',
  min6: 'm6',

  // 7ths
  dom7: '7',
  maj7: '\u0394' + '7', // Δ7
  min7: 'm7',
  dim7: '\u00B0' + '7', // °7
  min7b5: '\u00F8' + '7', // ø7
  maj7dim: '\u00F8' + '7',
  minmaj7: 'm(\u0394' + '7)',
  dom7sus2: '7sus2',
  dom7sus4: '7sus4',
  maj7sus2: '\u0394' + '7sus2',
  maj7sus4: '\u0394' + '7sus4',
  dom7b5: '7\u266D5',
  'dom7#5': '7\u266F5',
  'maj7#5': '\u0394' + '7\u266F5',
  maj7b5: '\u0394' + '7\u266D5',
  'min7#5': 'm7\u266F5',

  // 9ths
  dom9: '9',
  maj9: '\u0394' + '9',
  min9: 'm9',
  dom7b9: '7\u266D9',
  'dom7#9': '7\u266F9',
  min7b9: 'm7\u266D9',
  minmaj9: 'm(\u0394' + '9)',
  'maj9#5': '\u0394' + '9\u266F5',
  dim7b9: '\u00B0' + '7\u266D9',
  min7b5b9: '\u00F8' + '7\u266D9',
  'maj7#9': '\u0394' + '7\u266F9',
  'dom7#5b9': '7\u266F5\u266D9',
  'dom9#5': '9\u266F5',
  min9b5: 'm9\u266D5',
  'dom7#5#9': '7\u266F5\u266F9',
  'maj7#5#9': '\u0394' + '7\u266F5\u266F9',

  // Add chords
  Add2: 'add2',
  Add4: 'add4',
  min6add9: 'm6/9',
  maj6add9: '6/9',

  // Extensions
  'dom7#11': '7\u266F11',
  'maj7#11': '\u0394' + '7\u266F11',
  'b7dom7#11': '7\u266F11',

  // Other
  dimmaj7: '\u00B0' + '(\u0394' + '7)',
  maj4: 'maj4',
  min4: 'min4',
  'sus#4': 'sus\u266F4',
  susb2: 'sus\u266D2',
  susb2b5: 'sus\u266D2\u266D5',
  sus2b5: 'sus2\u266D5',
  majb5: '\u266D5',
  sus2b5add6: 'sus2\u266D5add6',
};

/**
 * Format a chord noteName for display according to the given format.
 *
 * @param noteName - The abbreviated noteName from ChordRegion (e.g., "Eb min7")
 * @param format - 'jazz' for shorthand or 'spelled' for original format
 * @returns Formatted chord symbol string (e.g., "Ebm7" or "Eb min7")
 */
export function formatChordSymbol(
  noteName: string,
  format: ChordFormat = 'jazz',
  degreeName?: string,
): string {
  if (format === 'numbers') return degreeName ?? noteName;
  if (format === 'hybrid') return noteName;

  const { root, quality } = parseChordDisplay(noteName);
  const jazzSuffix = JAZZ_MAP[quality];

  if (jazzSuffix !== undefined) {
    return root + jazzSuffix;
  }

  // Handle slash chords — quality may contain "/"
  if (quality.includes('/')) {
    const [baseQuality, bassNote] = quality.split('/');
    const baseSuffix = JAZZ_MAP[baseQuality];
    if (baseSuffix !== undefined) {
      return `${root}${baseSuffix}/${bassNote}`;
    }
  }

  // Fallback: just concatenate root + quality
  return root + quality;
}

// ── Duration Helpers ─────────────────────────────────────────────────────

export interface DurationInfo {
  type: string; // MusicXML note type: 'whole', 'half', 'quarter', 'eighth', '16th'
  dots: number;
}

const DURATION_MAP: [number, string, number][] = [
  [1920, 'whole', 0],
  [1440, 'half', 1], // dotted half
  [960, 'half', 0],
  [720, 'quarter', 1], // dotted quarter
  [480, 'quarter', 0],
  [360, 'eighth', 1], // dotted eighth
  [240, 'eighth', 0],
  [120, '16th', 0],
];

/**
 * Convert a tick duration to a MusicXML note type + dot count.
 */
export function ticksToDuration(ticks: number): DurationInfo {
  for (const [dur, type, dots] of DURATION_MAP) {
    if (ticks === dur) return { type, dots };
  }
  // For compound durations, find the best single fit
  for (const [dur, type, dots] of DURATION_MAP) {
    if (ticks >= dur) return { type, dots };
  }
  return { type: 'quarter', dots: 0 };
}

/**
 * Split a tick duration within a measure into a list of tied rest durations.
 * Each entry is the tick length of a single rest note.
 * Handles durations that don't map to a single note value.
 */
export function splitDuration(ticks: number): number[] {
  const parts: number[] = [];
  let remaining = ticks;
  for (const [dur] of DURATION_MAP) {
    while (remaining >= dur) {
      parts.push(dur);
      remaining -= dur;
    }
  }
  if (remaining > 0) parts.push(remaining);
  return parts;
}

/**
 * Compute chord boundaries within a measure for rendering or MusicXML.
 * Returns an array of { offsetTicks, durationTicks, chord? } segments
 * that fill the entire measure.
 */
export function measureSegments(
  measure: Measure,
  ticksPerMeasure = TICKS_PER_MEASURE,
): { offsetTicks: number; durationTicks: number; chord?: MeasureChord }[] {
  const segments: {
    offsetTicks: number;
    durationTicks: number;
    chord?: MeasureChord;
  }[] = [];

  if (measure.chords.length === 0) {
    segments.push({ offsetTicks: 0, durationTicks: ticksPerMeasure });
    return segments;
  }

  const sorted = [...measure.chords].sort(
    (a, b) => a.beatOffsetTicks - b.beatOffsetTicks,
  );

  // Gap before first chord
  if (sorted[0].beatOffsetTicks > 0) {
    segments.push({
      offsetTicks: 0,
      durationTicks: sorted[0].beatOffsetTicks,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const chord = sorted[i];
    const nextOffset =
      i + 1 < sorted.length ? sorted[i + 1].beatOffsetTicks : ticksPerMeasure;
    segments.push({
      offsetTicks: chord.beatOffsetTicks,
      durationTicks: nextOffset - chord.beatOffsetTicks,
      chord,
    });
  }

  return segments;
}
