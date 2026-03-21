/**
 * Melody analysis: pitch range, scale degrees, contour, interval histogram.
 *
 * Input: MidiNoteEvent[] from a melody track + KeyDetection
 * Output: MelodyAnalysis
 */

import { ALL_MODES } from '@/daw/prism-engine/data/modes';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type {
  KeyDetection,
  MelodyAnalysis,
  MelodyContour,
} from '../types/schema';

// ── Core ──────────────────────────────────────────────────────────────────────

export function analyzeMelody(
  events: MidiNoteEvent[],
  trackId: string,
  key: KeyDetection,
): MelodyAnalysis {
  if (events.length === 0) {
    return {
      trackId,
      pitchRange: { low: 0, high: 0 },
      scaleDegrees: [],
      contour: 'static',
      intervalHistogram: {},
    };
  }

  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);
  const pitches = sorted.map((e) => e.note);

  return {
    trackId,
    pitchRange: {
      low: Math.min(...pitches),
      high: Math.max(...pitches),
    },
    scaleDegrees: computeScaleDegrees(sorted, key),
    contour: classifyContour(pitches),
    intervalHistogram: buildIntervalHistogram(pitches),
  };
}

// ── Scale Degrees ─────────────────────────────────────────────────────────────

const DEGREE_LABELS = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  'b5',
  '5',
  'b6',
  '6',
  'b7',
  '7',
];

function computeScaleDegrees(
  events: MidiNoteEvent[],
  key: KeyDetection,
): Array<{ tick: number; degree: string }> {
  const modeIntervals = ALL_MODES[key.mode] ?? ALL_MODES['ionian'];

  // Build a map from pitch class to scale degree label
  const pcToDegree = new Map<number, string>();
  for (let i = 0; i < modeIntervals.length; i++) {
    const pc = (key.rootPc + modeIntervals[i]) % 12;
    // Use Ionian-reference degree labels for consistency with Hybrid Numbers
    pcToDegree.set(pc, DEGREE_LABELS[modeIntervals[i]]);
  }

  return events.map((ev) => {
    const pc = ev.note % 12;
    const degree =
      pcToDegree.get(pc) ?? DEGREE_LABELS[(pc - key.rootPc + 12) % 12];
    return { tick: ev.startTick, degree };
  });
}

// ── Contour Classification ────────────────────────────────────────────────────

/**
 * Divide the melody into 4 segments and classify the overall contour shape.
 */
function classifyContour(pitches: number[]): MelodyContour {
  if (pitches.length < 3) return 'static';

  // Calculate average pitch per segment
  const segmentCount = Math.min(4, pitches.length);
  const segmentSize = Math.floor(pitches.length / segmentCount);
  const segmentAvgs: number[] = [];

  for (let s = 0; s < segmentCount; s++) {
    const start = s * segmentSize;
    const end = s === segmentCount - 1 ? pitches.length : (s + 1) * segmentSize;
    let sum = 0;
    for (let i = start; i < end; i++) sum += pitches[i];
    segmentAvgs.push(sum / (end - start));
  }

  // Check if all segments are within 2 semitones of each other
  const range = Math.max(...segmentAvgs) - Math.min(...segmentAvgs);
  if (range < 2) return 'static';

  if (segmentAvgs.length < 3) {
    return segmentAvgs[1] > segmentAvgs[0] ? 'ascending' : 'descending';
  }

  // Determine direction between each segment
  const directions = [];
  for (let i = 1; i < segmentAvgs.length; i++) {
    const diff = segmentAvgs[i] - segmentAvgs[i - 1];
    directions.push(diff > 0.5 ? 1 : diff < -0.5 ? -1 : 0);
  }

  const allUp =
    directions.every((d) => d >= 0) && directions.some((d) => d > 0);
  const allDown =
    directions.every((d) => d <= 0) && directions.some((d) => d < 0);

  if (allUp) return 'ascending';
  if (allDown) return 'descending';

  // Arch: rises then falls
  const peak = segmentAvgs.indexOf(Math.max(...segmentAvgs));
  const trough = segmentAvgs.indexOf(Math.min(...segmentAvgs));

  if (peak > 0 && peak < segmentAvgs.length - 1) return 'arch';
  if (trough > 0 && trough < segmentAvgs.length - 1) return 'inverted-arch';

  return 'mixed';
}

// ── Interval Histogram ────────────────────────────────────────────────────────

function buildIntervalHistogram(pitches: number[]): Record<number, number> {
  const histogram: Record<number, number> = {};

  for (let i = 1; i < pitches.length; i++) {
    const interval = Math.abs(pitches[i] - pitches[i - 1]);
    histogram[interval] = (histogram[interval] ?? 0) + 1;
  }

  return histogram;
}
