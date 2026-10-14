import { describe, expect, it } from 'vitest';
import { lessonStyleFor } from '../../../data/lessonStyles';
import type { ActivityStepV2 } from '../../../types/activity.v2';
import {
  buildBackingNotes,
  stepBassVoice,
  stepDrumKit,
} from '../../genreGeneration/backingPatterns';
import { qualityFromIntervals } from '../pairedBacking';
import { pairingFor, pairingsReady } from '../registry';

const step = (styleRef: string, chordSymbols: string[]): ActivityStepV2 =>
  ({
    stepNumber: 1,
    module: 'latin_l1',
    section: 'B',
    subsection: 'B2',
    activity: 'test',
    direction: '',
    assessment: 'pitch_order_timing_duration',
    tag: `latin:test_${styleRef}`,
    styleRef,
    successFeedback: '',
    targetNotes: [],
    chordSymbols,
    backing_parts: {
      engine_generates: ['drums', 'bass'],
      student_plays: ['chords'],
    },
  }) as unknown as ActivityStepV2;

describe('lesson styles', () => {
  it('reads Latin styles from the styleRef and the others from the level', () => {
    expect(lessonStyleFor('latin', 1, 'l1b')?.name).toBe('Cumbia');
    expect(lessonStyleFor('latin', 1, 'l1c')?.name).toBe('Mariachi');
    expect(lessonStyleFor('funk', 2, 'l2b')?.name).toBe('Syncopation & Sauce');
    expect(lessonStyleFor('jazz', 1, 'l1a')).toBeUndefined();
  });
});

describe('lesson pairings', () => {
  it('pairs Latin L1 Cumbia with its Studio groove and bass line', async () => {
    await pairingsReady;
    const p = pairingFor('latin', 1, 'l1b');
    expect(p?.drums?.id).toBe('groove-latin-1');
    expect(p?.bass?.id).toBe('cumbia-1');
  });

  it("plays the paired line over the step's chords, with the paired sounds", async () => {
    await pairingsReady;
    const s = step('l1b', ['Em', 'Am', 'B7', 'Em']);
    const notes = buildBackingNotes(s, 64, 1, 'l1b', [], 'latin');
    const bass = notes.filter((n) => n.part === 'bass');
    const inBar = (bar: number) =>
      bass.filter((n) => n.onset >= bar * 1920 && n.onset < (bar + 1) * 1920);
    const pcs = (bar: number) => new Set(inBar(bar).map((n) => n.note % 12));
    // Cumbia 1 plays R, 3 and 5: E G B over Em; B D♯ F♯ over B7.
    expect([...pcs(0)].sort()).toEqual([4, 7, 11].sort());
    expect([...pcs(2)].sort()).toEqual([3, 6, 11].sort());
    expect(inBar(0)[0].note % 12).toBe(4);
    expect(bass.every((n) => n.note <= 60)).toBe(true);
    expect(notes.some((n) => n.part === 'drums')).toBe(true);
    expect(stepDrumKit(s, 'l1b', 'latin', 1)).toBe('custom_custom_natural_01');
    expect(stepBassVoice(s, 'l1b', 'latin', 1)).toBe('finger');
  });

  it('leaves genres without lesson styles alone', () => {
    // Pairings are content the back office edits, so test a genre with none.
    expect(pairingFor('jazz', 1, 'l1a')).toBeUndefined();
  });
});

describe('qualityFromIntervals', () => {
  it.each([
    [[0, 4, 7], 'maj'],
    [[0, 3, 7], 'min'],
    [[0, 4, 7, 10], '7'],
    [[0, 3, 7, 10, 14], 'm7'],
    [[0, 4, 7, 11], 'maj7'],
    [[0, 3, 6, 10], 'm7b5'],
    [[0, 3, 6, 9], 'dim7'],
    [[0, 5, 7], 'sus'],
    [[0, 2, 7], 'sus'],
    [[0, 4, 7, 10, 13], '7b9'],
    [[0, 4, 7, 10, 15], '7'],
  ])('%j → %s', (intervals, quality) => {
    expect(qualityFromIntervals(intervals)).toBe(quality);
  });
});
