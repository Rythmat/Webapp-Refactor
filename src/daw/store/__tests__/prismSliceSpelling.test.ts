import { describe, expect, it } from 'vitest';
import { deriveChordRegionsFromAudioSnapshots } from '../prismSlice';

const G = 67;
// One sustained chord per bar so each becomes its own region.
const snapshots = (chords: number[][]) =>
  chords.map((notes, i) => ({ tick: i * 1920, notes }));

describe('chord region note names follow the session key', () => {
  // Regression: noteNameInKey chose sharps from the tonic alone, so G minor
  // labelled its B♭ and E♭ chords "A# maj" / "D# maj".
  it('spells G minor chords with flats', () => {
    const regions = deriveChordRegionsFromAudioSnapshots(
      snapshots([
        [67, 70, 74], // G minor
        [70, 74, 77], // B♭ major
        [63, 67, 70], // E♭ major
        [62, 66, 69], // D major
      ]),
      G,
      'aeolian',
    );
    const names = regions.map((r) => r.noteName);
    expect(names.join(' | ')).not.toMatch(/[A-G]#/);
    expect(names.some((n) => n.startsWith('Bb '))).toBe(true);
    expect(names.some((n) => n.startsWith('Eb '))).toBe(true);
  });
});

describe('leading diminished chords follow their resolution', () => {
  const names = (chords: number[][], root: number, mode: string) =>
    deriveChordRegionsFromAudioSnapshots(snapshots(chords), root, mode).map(
      (r) => r.noteName,
    );

  it('F# dim → G min in G minor', () => {
    expect(
      names(
        [
          [66, 69, 72],
          [67, 70, 74],
        ],
        67,
        'aeolian',
      )[0],
    ).toMatch(/^F# dim/);
  });

  it('Gb dim → F min in F minor', () => {
    expect(
      names(
        [
          [66, 69, 72],
          [65, 68, 72],
        ],
        65,
        'aeolian',
      )[0],
    ).toMatch(/^Gb dim/);
  });
});
