import { describe, expect, it } from 'vitest';
import {
  activationWindow,
  dueMidisAt,
  nextTargets,
  noteLabel,
} from '../liveFeedback';

// C D E, one quarter each; plus a C–E dyad on beat 4.
const notes = [
  { id: 'c', midi: 60, startTicks: 0, durationTicks: 480 },
  { id: 'd', midi: 62, startTicks: 480, durationTicks: 480 },
  { id: 'e', midi: 64, startTicks: 960, durationTicks: 480 },
  { id: 'c2', midi: 60, startTicks: 1440, durationTicks: 480 },
  { id: 'e2', midi: 64, startTicks: 1440, durationTicks: 480 },
];
const midiOf = (n: { midi: number }) => n.midi;

describe('activationWindow', () => {
  it('opens an eighth of the note early and closes at its end', () => {
    expect(activationWindow(notes[1])).toEqual({ start: 420, end: 960 });
  });
});

describe('dueMidisAt', () => {
  it('names only the pitch due now', () => {
    expect([...dueMidisAt(notes, 600, midiOf)]).toEqual([62]);
  });

  it('treats a later note of the sequence as not yet due', () => {
    expect(dueMidisAt(notes, 100, midiOf).has(64)).toBe(false);
  });

  it('accepts the next note slightly early', () => {
    expect(dueMidisAt(notes, 430, midiOf)).toEqual(new Set([60, 62]));
  });

  it('is empty during the count-in', () => {
    expect(dueMidisAt(notes, -500, midiOf).size).toBe(0);
  });
});

describe('nextTargets', () => {
  const none = () => false;

  it('is the first note before anything is played', () => {
    expect(nextTargets(notes, none, -1920).map((n) => n.id)).toEqual(['c']);
  });

  it('skips notes already played', () => {
    const played = (n: { id: string }) => n.id === 'c';
    expect(nextTargets(notes, played, 100).map((n) => n.id)).toEqual(['d']);
  });

  it('moves past a note whose time is over, even if missed', () => {
    expect(nextTargets(notes, none, 1000).map((n) => n.id)).toEqual(['e']);
  });

  it('returns a chord whole', () => {
    expect(nextTargets(notes, none, 1500).map((n) => n.id)).toEqual([
      'c2',
      'e2',
    ]);
  });
});

describe('noteLabel', () => {
  it('uses the lesson spelling when it has one', () => {
    expect(noteLabel(70, new Map([[10, 'Bb']]))).toBe('B♭4');
  });

  it('falls back to sharps', () => {
    expect(noteLabel(66)).toBe('F♯4');
  });
});
