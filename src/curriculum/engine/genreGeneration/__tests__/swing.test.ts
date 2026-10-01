import { describe, expect, it, vi } from 'vitest';
import type { ActivityStepV2 } from '../../../types/activity.v2';
import { buildBackingNotes } from '../backingPatterns';
import { applySwing, stepSwing, swingOnset, swingPercent } from '../swing';

describe('swingPercent', () => {
  it('reads the legacy 0/1 flags as straight', () => {
    expect(swingPercent(undefined)).toBe(50);
    expect(swingPercent(0)).toBe(50);
    expect(swingPercent(1)).toBe(50);
  });

  it('keeps a real percentage and caps it', () => {
    expect(swingPercent(66)).toBe(66);
    expect(swingPercent(90)).toBe(75);
  });

  it('lets a step override the flow', () => {
    expect(stepSwing({ swing: 66 }, 0)).toBe(66);
    expect(stepSwing({}, 58)).toBe(58);
    expect(stepSwing(null, undefined)).toBe(50);
  });
});

describe('swingOnset', () => {
  it('moves only the off-beat 16th', () => {
    // 66%: the second 16th of each 8th pair lands at 158 instead of 120.
    expect(swingOnset(120, 66)).toBe(158);
    expect(swingOnset(360, 66)).toBe(398);
    expect(swingOnset(0, 66)).toBe(0);
    expect(swingOnset(240, 66)).toBe(240); // an 8th note stays put
    expect(swingOnset(480, 66)).toBe(480);
  });

  it('carries humanised off-beats along', () => {
    expect(swingOnset(124, 66)).toBe(162);
  });

  it('does nothing when straight', () => {
    expect(swingOnset(120, 50)).toBe(120);
    const notes = [{ onset: 120 }];
    expect(applySwing(notes, 50)).toBe(notes);
  });
});

describe('buildBackingNotes with swing', () => {
  const step = {
    backing_parts: {
      engine_generates: ['drums', 'bass', 'chords'],
      student_plays: [],
    },
    chordSymbols: ['Cm7'],
  } as unknown as ActivityStepV2;

  it('moves exactly the off-beat 16ths, by the swing amount', () => {
    // Same random choices for both builds, so the notes pair up one to one.
    const build = (swing: number) => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.4);
      try {
        return buildBackingNotes(step, 60, 2, 'l2a', [], 'hip-hop', 0, swing);
      } finally {
        random.mockRestore();
      }
    };
    const straight = build(50);
    const swung = build(66);
    expect(swung).toHaveLength(straight.length);

    let moved = 0;
    straight.forEach((note, i) => {
      const expected = swingOnset(note.onset, 66);
      expect(swung[i].onset).toBe(expected);
      if (expected !== note.onset) moved++;
    });
    expect(moved).toBeGreaterThan(0);
  });
});
