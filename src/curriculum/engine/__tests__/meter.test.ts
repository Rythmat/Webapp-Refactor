import { describe, expect, it, vi } from 'vitest';
import type { ActivityStepV2 } from '../../types/activity.v2';
import { buildBackingNotes } from '../genreGeneration/backingPatterns';
import { pairingsReady } from '../lessonPairings/registry';
import {
  barClicks,
  barTicks,
  beatsPerBar,
  beatTicks,
  isCompound,
  meterSwing,
  stepTimeSignature,
  type TimeSignature,
} from '../meter';

describe('meter', () => {
  it.each<[TimeSignature, number, number, number]>([
    [[4, 4], 1920, 4, 480],
    [[3, 4], 1440, 3, 480],
    [[6, 8], 1440, 2, 720],
    [[12, 8], 2880, 4, 720],
    [[2, 4], 960, 2, 480],
  ])('%j: bar %i, %i felt beats of %i', (ts, bar, beats, beat) => {
    expect(barTicks(ts)).toBe(bar);
    expect(beatsPerBar(ts)).toBe(beats);
    expect(beatTicks(ts)).toBe(beat);
  });

  it('clicks felt beats loud and eighths soft outside 4/4 (D-086)', () => {
    expect(barClicks([4, 4]).map((c) => c.accent)).toEqual([
      'downbeat',
      'beat',
      'beat',
      'beat',
    ]);
    expect(barClicks([6, 8]).map((c) => c.accent)).toEqual([
      'downbeat',
      'sub',
      'sub',
      'beat',
      'sub',
      'sub',
    ]);
    expect(barClicks([3, 4]).map((c) => c.accent)).toEqual([
      'downbeat',
      'sub',
      'beat',
      'sub',
      'beat',
      'sub',
    ]);
    expect(barClicks([12, 8]).filter((c) => c.accent !== 'sub')).toHaveLength(
      4,
    );
  });

  it('plays compound meters straight', () => {
    expect(isCompound([12, 8])).toBe(true);
    expect(isCompound([3, 8])).toBe(false);
    expect(meterSwing(66, [12, 8])).toBe(50);
    expect(meterSwing(66, [3, 4])).toBe(66);
  });

  it("takes the step's meter, else the flow's, else 4/4", () => {
    expect(
      stepTimeSignature(
        { timeSignature: [3, 4] },
        { params: { timeSignature: [6, 8] } },
      ),
    ).toEqual([3, 4]);
    expect(
      stepTimeSignature({}, { params: { timeSignature: [6, 8] } }),
    ).toEqual([6, 8]);
    expect(stepTimeSignature(null, null)).toEqual([4, 4]);
  });
});

const step = (
  styleRef: string,
  chordSymbols: string[],
  parts: string[],
): ActivityStepV2 =>
  ({
    stepNumber: 1,
    module: 'test',
    section: 'D',
    subsection: 'D3',
    activity: 'test',
    direction: '',
    assessment: 'pitch_order_timing_duration',
    tag: `test:${styleRef}`,
    styleRef,
    successFeedback: '',
    targetNotes: [],
    chordSymbols,
    backing_parts: { engine_generates: parts, student_plays: [] },
  }) as unknown as ActivityStepV2;

describe('backing in other meters', () => {
  it('plays a 3/4 Mariachi step on 1440-tick bars with the paired groove and line', async () => {
    await pairingsReady;
    const s = step('l1c', ['G', 'C', 'D7', 'G'], ['drums', 'bass']);
    const notes = buildBackingNotes(
      s,
      67,
      1,
      'l1c',
      [],
      'latin',
      0,
      50,
      [3, 4],
    );
    const bass = notes.filter((n) => n.part === 'bass');
    // The Mariachi line: one note a bar on beat 1 — root, then the 5 below.
    const downbeats = bass.filter((n) => n.onset % 1440 === 0);
    expect(downbeats.length).toBeGreaterThanOrEqual(16);
    expect(downbeats[0].note % 12).toBe(7); // G
    // The C bar is a chord change, and the line roots every change: C.
    expect(downbeats.find((n) => n.onset === 1440)!.note % 12).toBe(0);
    // 16 bars of 3/4, plus the ending.
    const lastOnset = Math.max(...notes.map((n) => n.onset));
    expect(lastOnset).toBeLessThanOrEqual(16 * 1440 + 10);
    expect(notes.filter((n) => n.part === 'drums').length).toBeGreaterThan(0);
  });

  it('falls back to meter-true parts without a pairing', () => {
    const s = step('l1a', ['Dm', 'A7'], ['drums', 'bass', 'chords']);
    const notes = buildBackingNotes(s, 62, 1, 'l1a', [], 'jazz', 0, 50, [6, 8]);
    const kicks = notes.filter((n) => n.part === 'drums' && n.note === 36);
    expect(kicks.map((k) => k.onset).slice(0, 3)).toEqual([0, 1440, 2880]);
    const chords = notes.filter((n) => n.part === 'chords' && n.onset < 1440);
    // A chord on each felt beat: two dotted quarters.
    expect([...new Set(chords.map((c) => c.onset))]).toEqual([0, 720]);
    const vals = buildBackingNotes(s, 62, 1, 'l1a', [], 'jazz', 0, 50, [3, 4]);
    const valsChords = vals.filter(
      (n) => n.part === 'chords' && n.onset < 1440,
    );
    // The vals' "chord, chord" on 2 and 3.
    expect([...new Set(valsChords.map((c) => c.onset))]).toEqual([480, 960]);
  });

  it('leaves 4/4 backing exactly as it was', () => {
    const s = step('l1a', ['Am9', 'D13'], ['drums', 'bass', 'chords']);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.42);
    const a = buildBackingNotes(s, 57, 1, 'l1a', [], 'funk');
    const b = buildBackingNotes(s, 57, 1, 'l1a', [], 'funk', 0, 50, [4, 4]);
    random.mockRestore();
    expect(b).toEqual(a);
  });
});
