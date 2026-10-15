/**
 * The key everything that follows "the song's key" uses: the student's, and
 * a detected one only while none is set.
 *
 * Run: npx vitest run src/daw/harmony/__tests__/effectiveKey.test.ts
 */
import { describe, expect, it } from 'vitest';
import { selectEffectiveKey } from '../effectiveKey';

const state = (
  rootNote: number | null,
  mode: string,
  detectedKeyRootPc: number | null = null,
  detectedMode: string | null = null,
) => ({ rootNote, mode, detectedKeyRootPc, detectedMode });

describe('selectEffectiveKey', () => {
  it("is the student's key, whatever detection says", () => {
    expect(selectEffectiveKey(state(9, 'aeolian', 0, 'ionian'))).toEqual({
      rootPc: 9,
      mode: 'aeolian',
      source: 'project',
    });
  });

  it('is the detected key while no key is set, and says so', () => {
    expect(selectEffectiveKey(state(null, 'ionian', 2, 'dorian'))).toEqual({
      rootPc: 2,
      mode: 'dorian',
      source: 'detected',
    });
  });

  it('is none with neither: no key is assumed, not even C major', () => {
    expect(selectEffectiveKey(state(null, 'ionian'))).toBeNull();
    expect(selectEffectiveKey(state(null, 'ionian', 4, null))).toBeNull();
  });

  it('is the same object while nothing it reads changes', () => {
    const first = selectEffectiveKey(state(7, 'mixolydian', 0, 'ionian'));
    expect(selectEffectiveKey(state(7, 'mixolydian', 0, 'ionian'))).toBe(first);
    // Detection moving under a set key changes nothing it says.
    expect(selectEffectiveKey(state(7, 'mixolydian', 5, 'lydian'))).toEqual(
      first,
    );
  });
});
