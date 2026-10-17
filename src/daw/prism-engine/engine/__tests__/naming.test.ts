import { describe, expect, it } from 'vitest';
import { CHORDS } from '../../data/chords';
import { generateChord } from '../chordUtils';
import {
  chordReadings,
  degreeMidi,
  detectChordWithInversion,
  ionianToModeLabel,
  modeToIonianLabel,
} from '../naming';

// ── detectChordWithInversion ───────────────────────────────────────────────
// It now looks each candidate root's pitch-class set up in a table built once
// from CHORDS (prism-engine-14) instead of re-normalizing every definition on
// every call; these pin the answers it gives.

const C3 = 48;
const at = (root: number, intervals: readonly number[]) =>
  intervals.map((v) => root + v);

describe('detectChordWithInversion', () => {
  it('names root-position chords', () => {
    expect(detectChordWithInversion(at(C3, [0, 4, 7]))).toEqual({
      quality: 'major',
      rootPc: 0,
      bassNote: C3,
      inversion: 0,
    });
    expect(detectChordWithInversion(at(C3 + 2, [0, 3, 7, 10]))).toEqual({
      quality: 'minor7',
      rootPc: 2,
      bassNote: C3 + 2,
      inversion: 0,
    });
  });

  it('finds the root and inversion of an inverted chord', () => {
    // E G C: C major over its third.
    expect(detectChordWithInversion([52, 55, 60])).toEqual({
      quality: 'major',
      rootPc: 0,
      bassNote: 52,
      inversion: 1,
    });
    // E G B♭ C: C7 over its third; G B C E: Cmaj7 over its fifth.
    expect(detectChordWithInversion([52, 55, 58, 60])).toMatchObject({
      quality: 'dominant7',
      rootPc: 0,
      inversion: 1,
    });
    expect(detectChordWithInversion([55, 59, 60, 64])).toMatchObject({
      quality: 'major7',
      rootPc: 0,
      inversion: 2,
    });
  });

  it('ignores doublings, octaves and note order', () => {
    expect(detectChordWithInversion([67, 48, 64, 60, 72])).toMatchObject({
      quality: 'major',
      rootPc: 0,
      inversion: 0,
    });
  });

  it('reads a 6th chord in root position, a 7th chord when inverted', () => {
    // C E G A over C is C6; the same notes over A are A minor 7.
    expect(detectChordWithInversion([48, 52, 55, 57])).toMatchObject({
      quality: 'major6',
      rootPc: 0,
    });
    expect(detectChordWithInversion([45, 48, 52, 55])).toMatchObject({
      quality: 'minor7',
      rootPc: 9,
    });
    // Over E (neither root), the 7th chord reading wins over the 6th.
    expect(detectChordWithInversion([52, 57, 60, 67])).toMatchObject({
      quality: 'minor7',
      rootPc: 9,
      inversion: 2,
    });
  });

  it('takes the first quality in CHORDS when two share their notes', () => {
    const halfDim = [0, 3, 6, 10];
    const sharing = Object.entries(CHORDS)
      .filter(([name]) => !name.includes('/'))
      .filter(
        ([, def]) =>
          [...new Set(def.map((v) => v % 12))].sort((a, b) => a - b).join() ===
          halfDim.join(),
      )
      .map(([name]) => name);
    expect(sharing.length).toBeGreaterThan(1);
    expect(detectChordWithInversion(at(C3, halfDim))?.quality).toBe(sharing[0]);
  });

  it('never answers with a slash-chord voicing', () => {
    for (const root of [48, 50, 53, 55]) {
      for (const def of Object.values(CHORDS)) {
        const quality = detectChordWithInversion(
          at(
            root,
            def.map((v) => ((v % 12) + 12) % 12),
          ),
        )?.quality;
        expect(quality ?? '').not.toContain('/');
      }
    }
  });

  it('returns null for one pitch class or an unknown set', () => {
    expect(detectChordWithInversion([60])).toBeNull();
    expect(detectChordWithInversion([48, 60, 72])).toBeNull();
    expect(detectChordWithInversion([60, 61, 62, 63])).toBeNull();
  });

  it('gives the same answer on every call', () => {
    const notes = [52, 55, 60];
    const first = detectChordWithInversion(notes);
    for (let i = 0; i < 5; i++) {
      expect(detectChordWithInversion(notes)).toEqual(first);
    }
  });
});

describe('the simplest reading (musical Occam’s razor)', () => {
  const best = (pcs: number[], bassPc: number) => {
    const [first] = chordReadings(pcs, bassPc);
    return first && { quality: first.quality, rootPc: first.rootPc };
  };

  it('names a 13th played 1-3-♭7-13 from its bass', () => {
    // A♭ G♭ C F: no root has these four exactly — but over the A♭ they are
    // the 13th every keyboard player voices this way. Never "F sus♭2/A♭".
    expect(best([6, 0, 5], 8)).toEqual({ quality: 'dominant13', rootPc: 8 });
    expect(detectChordWithInversion([44, 54, 60, 65])).toEqual({
      quality: 'dominant13',
      rootPc: 8,
      bassNote: 44,
      inversion: 0,
    });
  });

  it('prefers the fullest chord, exact first', () => {
    // C E G B♭ D: exactly a 9th, not a 13th with tones missing.
    expect(best([4, 7, 10, 2], 0)).toEqual({ quality: 'dominant9', rootPc: 0 });
    // C E B♭ D: a 9th without its 5th.
    expect(best([4, 10, 2], 0)).toEqual({ quality: 'dominant9', rootPc: 0 });
  });

  it('never leaves out the 3rd or the 7th', () => {
    // C G B♭ A: no 3rd, so no C13.
    expect(
      chordReadings([7, 10, 9], 0).some((r) => r.quality === 'dominant13'),
    ).toBe(false);
  });

  it('re-reads a rare chord as the common one it nearly always is', () => {
    // C D F♯ A: "C sus2(♭5)add6" exactly, but it's D7 over C.
    expect(detectChordWithInversion([48, 50, 54, 57])).toMatchObject({
      quality: 'dominant7',
      rootPc: 2,
    });
    // D G C: "D quartal" exactly, but it's D7sus4 without its 5th.
    expect(detectChordWithInversion([50, 55, 60])).toMatchObject({
      quality: 'dominant7sus4',
      rootPc: 2,
    });
  });

  it('keeps a rare chord when nothing simpler fits', () => {
    // C D♭ G: C sus♭2 is the only name these notes have.
    expect(detectChordWithInversion([48, 49, 55])).toMatchObject({
      quality: 'susb2',
      rootPc: 0,
    });
  });

  it('leaves common chords and their inversions as they were', () => {
    expect(detectChordWithInversion([52, 55, 60])).toMatchObject({
      quality: 'major',
      rootPc: 0,
      inversion: 1,
    });
    expect(detectChordWithInversion([50, 53, 57, 60])).toMatchObject({
      quality: 'minor7',
      rootPc: 2,
    });
  });
});

// ── Slash chords across modes ──────────────────────────────────────────────
// A slash quality ('major/3') is a CHORDS key whose number places the bass
// from the chord's own root. Converting the degree between the parent major
// and the mode leaves it as it is; converting it as a key degree stored E/G♯
// in A minor as '5 major/5', which reads as E/B.

describe('ionianToModeLabel and modeToIonianLabel', () => {
  it('move the degree and keep a slash quality', () => {
    expect(ionianToModeLabel('3 major/3', 'aeolian')).toBe('5 major/3');
    expect(modeToIonianLabel('5 major/3', 'aeolian')).toBe('3 major/3');
    expect(ionianToModeLabel('1 major/5', 'dorian')).toBe('b7 major/5');
    expect(ionianToModeLabel('4 minor6/b3', 'aeolian')).toBe('b6 minor6/b3');
  });

  it('leave Ionian and the non-diatonic modes alone', () => {
    expect(ionianToModeLabel('3 major/3', 'ionian')).toBe('3 major/3');
    expect(ionianToModeLabel('3 major/3', 'harmonicMinor')).toBe('3 major/3');
  });
});

describe("the graph's '4 major/1'", () => {
  it('voices IV over the tonic: F/C in C', () => {
    const notes = generateChord(degreeMidi(48, '4 major/1'), 'major/1');
    expect(Math.min(...notes) % 12).toBe(0);
    expect(new Set(notes.map((n) => n % 12))).toEqual(new Set([5, 9, 0]));
    // The root still leads, as in every slash entry.
    expect(notes[0] % 12).toBe(5);
  });
});
