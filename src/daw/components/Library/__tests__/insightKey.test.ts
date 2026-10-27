import { describe, expect, it } from 'vitest';
import { sessionToUnison } from '@/unison/converters/sessionToUnison';

// ── Insight's key (2026-10-21) ─────────────────────────────────────────────
// The key the student set is certain (no percentage, no other keys); the
// key card itself went from Insight (owner, 2026-10-24), and its
// Progression card too (owner, 2026-10-25).

const n = (note: number, startTick: number) => ({
  note,
  velocity: 90,
  startTick,
  durationTicks: 1920,
  channel: 0,
});
/** Bars of chords, low note first. */
const bars = (chords: number[][]) =>
  chords.flatMap((c, i) => c.map((p) => n(p, i * 1920)));

function analyse(
  rootNote: number | null,
  mode: string,
  events: ReturnType<typeof n>[],
) {
  return sessionToUnison({
    tracks: [
      {
        id: 'keys',
        name: 'Keys',
        type: 'midi',
        instrument: 'piano-sampler',
        midiClips: [{ events }],
      },
    ],
    chordRegions: [],
    bpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    rootNote,
    mode,
  } as never);
}

const C_POP = bars([
  [48, 60, 64, 67],
  [43, 59, 62, 67],
  [45, 57, 60, 64],
  [41, 57, 60, 65],
  [48, 60, 64, 67],
]);

describe('the key the student set', () => {
  it('is certain: confidence 1 and no other keys', () => {
    const doc = analyse(0, 'ionian', C_POP);
    expect(doc.analysis.key.confidence).toBe(1);
    expect(doc.analysis.key.alternateKeys).toEqual([]);
    expect(doc.analysis.key.fromNotes?.rootPc).toBe(0);
  });
});
