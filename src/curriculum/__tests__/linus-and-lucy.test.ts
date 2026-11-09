import { describe, expect, it } from 'vitest';
import { buildLinusAndLucyFlow } from '@/curriculum/data/activityFlows/linusAndLucy';

const flow = buildLinusAndLucyFlow();
const steps = flow.sections.flatMap((section) => section.steps);
const stepNamed = (prefix: string) => {
  const found = steps.find((step) => step.activity.startsWith(prefix));
  if (!found) throw new Error(`no step ${prefix}`);
  return found;
};

const EIGHTH = 240;
const PICKUP = 7 * EIGHTH;

describe('Linus and Lucy', () => {
  it('teaches right hand, left hand, both, then the play-along', () => {
    expect(flow.sections.map((section) => section.name)).toEqual([
      'Right Hand',
      'Left Hand',
      'Hands Together',
      'Play-Along',
    ]);
    expect(steps.map((step) => step.stepNumber)).toEqual(
      steps.map((_, i) => i + 1),
    );
  });

  it('gives every note a hand and a finger, in the right register', () => {
    for (const step of steps) {
      expect(step.targetNotes?.length).toBeGreaterThan(0);
      for (const note of step.targetNotes ?? []) {
        expect(note.finger).toBeGreaterThanOrEqual(1);
        if (note.hand === 'lh') expect(note.midi).toBeLessThan(48);
        else expect(note.midi).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it('anticipates the bar: the theme starts on the "and" of 4', () => {
    const notes = stepNamed('D1.3').targetNotes ?? [];
    expect(Math.min(...notes.map((note) => note.onset))).toBe(PICKUP);
  });

  // As measured from the tutorial: start cell (from the pickup) → the notes.
  it('lines the hands up as the first bar is played', () => {
    const notes = stepNamed('D1.3').targetNotes ?? [];
    const at = (cell: number, hand: 'lh' | 'rh') =>
      notes
        .filter(
          (note) => note.hand === hand && note.onset === PICKUP + cell * EIGHTH,
        )
        .map((note) => note.midi)
        .sort((a, b) => a - b);

    expect(at(0, 'lh')).toEqual([32]);
    expect(at(0, 'rh')).toEqual([60, 68]);
    expect(at(2, 'lh')).toEqual([39]);
    expect(at(2, 'rh')).toEqual([63, 70]);
    expect(at(3, 'lh')).toEqual([44]);
    expect(at(3, 'rh')).toEqual([68, 72]);
    expect(at(4, 'lh')).toEqual([32]);
    expect(at(4, 'rh')).toEqual([]);
    expect(at(7, 'lh')).toEqual([]);
    expect(at(7, 'rh')).toEqual([60, 68]);
    // Bar 7: the left hand has moved to C♭, under E♭ and A♭.
    expect(at(48, 'lh')).toEqual([35]);
    expect(at(48, 'rh')).toEqual([63, 68]);
  });

  it('runs the full theme for ten bars', () => {
    const notes = stepNamed('D1.3').targetNotes ?? [];
    const lastEnd = Math.max(
      ...notes.map((note) => note.onset + note.duration),
    );
    expect(lastEnd).toBeLessThanOrEqual(PICKUP + 80 * EIGHTH);
    expect(lastEnd).toBeGreaterThan(PICKUP + 79 * EIGHTH);
  });
});
