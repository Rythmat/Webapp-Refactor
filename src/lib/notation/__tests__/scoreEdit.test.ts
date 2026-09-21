import { describe, expect, it } from 'vitest';
import {
  applyNoteSplit,
  parseNoteId,
  stepPitch,
} from '@/daw/components/Score/scoreEdit';

describe('parseNoteId', () => {
  it('reads a drawn note back to its event', () => {
    expect(parseNoteId('t1:c2:960:64')).toEqual({
      trackId: 't1',
      clipId: 'c2',
      startTick: 960,
      midi: 64,
    });
    expect(parseNoteId('nonsense')).toBeNull();
  });
});

describe('stepPitch', () => {
  it('moves diatonically in C major', () => {
    expect(stepPitch(60, 1, 0)).toBe(62); // C4 → D4
    expect(stepPitch(60, -1, 0)).toBe(59); // C4 → B3
    expect(stepPitch(64, 1, 0)).toBe(65); // E4 → F4 (a semitone)
    expect(stepPitch(60, 7, 0)).toBe(72); // up an octave
    expect(stepPitch(60, -7, 0)).toBe(48);
  });

  it('keeps the key signature', () => {
    // D major (2 sharps): A4 up a step is B4; E4 up a step is F#4.
    expect(stepPitch(69, 1, 2)).toBe(71);
    expect(stepPitch(64, 1, 2)).toBe(66);
    // F major (1 flat): A4 up a step is B♭4.
    expect(stepPitch(69, 1, -1)).toBe(70);
  });

  it('leans a chromatic note on the letter below it', () => {
    // F#4 in C major sits on F; a step up is G4.
    expect(stepPitch(66, 1, 0)).toBe(67);
  });

  it('stays in range', () => {
    expect(stepPitch(0, -20, 0)).toBeGreaterThanOrEqual(0);
    expect(stepPitch(127, 20, 0)).toBeLessThanOrEqual(127);
  });
});

describe('splitting a held note', () => {
  const clipEvents = [
    { note: 60, startTick: 0, durationTicks: 3840, velocity: 100, channel: 0 },
    { note: 64, startTick: 0, durationTicks: 480, velocity: 100, channel: 0 },
  ];
  const tracks = [
    {
      id: 't',
      midiClips: [{ id: 'c', startTick: 0, events: clipEvents }],
    },
  ] as unknown as Parameters<typeof applyNoteSplit>[0];

  it('breaks it in two where the tie was', () => {
    const writes: Array<[string, string, typeof clipEvents]> = [];
    const ids = applyNoteSplit(tracks, 't:c:0:60', 1920, (a, b, c) =>
      writes.push([a, b, c as typeof clipEvents]),
    );
    expect(writes).toHaveLength(1);
    expect(
      writes[0][2]
        .filter((e) => e.note === 60)
        .map((e) => `${e.startTick}:${e.durationTicks}`),
    ).toEqual(['0:1920', '1920:1920']);
    expect(ids).toEqual(['t:c:0:60', 't:c:1920:60']);
  });

  it('leaves the note alone when the split is outside it', () => {
    const writes: unknown[] = [];
    expect(
      applyNoteSplit(tracks, 't:c:0:64', 1920, () => writes.push(1)),
    ).toEqual([]);
    expect(writes).toHaveLength(0);
  });
});
