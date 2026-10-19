/**
 * A pitched clip's key, for its header (milestone 2.12): the song's key when
 * the notes sit in it, else the major or minor key they suggest, else none.
 *
 * Run: npx vitest run src/daw/harmony/__tests__/clipKey.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { clipKeyOf, detectClipKey, shortKeyLabel } from '../clipKey';

/** One note per pitch, a beat each, in order. */
const notes = (...midis: number[]): MidiNoteEvent[] =>
  midis.map((note, i) => ({
    note,
    velocity: 100,
    startTick: i * 480,
    durationTicks: 480,
    channel: 0,
  }));

const C_MAJOR_RIFF = notes(60, 62, 64, 65, 67, 64, 60, 67, 72);
const F_SHARP_MINOR_RIFF = notes(66, 68, 69, 71, 73, 69, 66, 73, 66);

describe('a clip’s key', () => {
  it('reads a riff’s own key when the song has none', () => {
    expect(detectClipKey(C_MAJOR_RIFF, null)).toMatchObject({
      label: 'C',
      songKey: false,
    });
    expect(detectClipKey(F_SHARP_MINOR_RIFF, null)).toMatchObject({
      rootPc: 6,
      mode: 'aeolian',
      label: 'F♯m',
    });
  });

  it('is the song’s key when the notes sit in it, not its relative', () => {
    // A, C and E in a C major song: in C major, not "Am".
    const aMinorShape = notes(69, 72, 76, 69, 72, 76, 74, 71);
    expect(
      detectClipKey(aMinorShape, { rootPc: 0, mode: 'ionian' }),
    ).toMatchObject({ label: 'C', songKey: true });
    // A Dorian song keeps its mode's name.
    expect(
      detectClipKey(notes(62, 64, 65, 67, 69, 71, 72), {
        rootPc: 2,
        mode: 'dorian',
      }),
    ).toMatchObject({ label: 'D Dorian', songKey: true });
  });

  it('shows a clip in another key as that key, so the mismatch shows', () => {
    expect(
      detectClipKey(F_SHARP_MINOR_RIFF, { rootPc: 0, mode: 'ionian' }),
    ).toMatchObject({ label: 'F♯m', songKey: false });
  });

  it('names no key for a clip too short or too bare to tell', () => {
    expect(detectClipKey(notes(60, 64), null)).toBeNull();
    expect(detectClipKey(notes(36, 36, 36, 36, 48, 48), null)).toBeNull();
    // Every pitch class equally: no key at all.
    expect(
      detectClipKey(
        notes(60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71),
        null,
      ),
    ).toBeNull();
  });

  it('remembers its answer per notes and song key', () => {
    const song = { rootPc: 0, mode: 'ionian' };
    const first = clipKeyOf(C_MAJOR_RIFF, song);
    expect(clipKeyOf(C_MAJOR_RIFF, song)).toBe(first);
    expect(clipKeyOf(C_MAJOR_RIFF, null)).not.toBe(first);
  });

  it('labels keys short, with real accidentals', () => {
    expect(shortKeyLabel(10, 'ionian')).toBe('B♭');
    expect(shortKeyLabel(1, 'aeolian')).toBe('D♭m');
    expect(shortKeyLabel(7, 'mixolydian')).toBe('G Mixolydian');
  });
});
