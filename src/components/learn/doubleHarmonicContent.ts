import type { ScaleFamilyMode } from './modeHelpers';

// ── Algorithmic note-spelling engine ────────────────────────────────────
// Double Harmonic per-key data is not in the Knowledge Base (only empty
// headings). We compute note spellings from semitone step patterns using
// standard enharmonic rules: sequential letter names, accidentals to
// reach the target pitch class.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PITCH = [0, 2, 4, 5, 7, 9, 11]; // pitch class for each letter

const ROOTS: { letter: string; accidental: string; pitchClass: number }[] = [
  { letter: 'C', accidental: '',  pitchClass: 0 },
  { letter: 'G', accidental: '',  pitchClass: 7 },
  { letter: 'D', accidental: '',  pitchClass: 2 },
  { letter: 'A', accidental: '',  pitchClass: 9 },
  { letter: 'E', accidental: '',  pitchClass: 4 },
  { letter: 'B', accidental: '',  pitchClass: 11 },
  { letter: 'F', accidental: '#', pitchClass: 6 },
  { letter: 'D', accidental: '♭', pitchClass: 1 },
  { letter: 'A', accidental: '♭', pitchClass: 8 },
  { letter: 'E', accidental: '♭', pitchClass: 3 },
  { letter: 'B', accidental: '♭', pitchClass: 10 },
  { letter: 'F', accidental: '',  pitchClass: 5 },
];

const ACCIDENTAL_MAP: Record<number, string> = {
  0:  '',   // natural
  1:  '#',  // sharp
  2:  'X',  // double sharp
  11: '♭',  // flat
  10: '𝄫',  // double flat
};

function spellScale(rootPitchClass: number, rootLetterIdx: number, steps: number[]): string[] {
  return steps.map((step, degree) => {
    const letterIdx = (rootLetterIdx + degree) % 7;
    const letter = LETTERS[letterIdx];
    const naturalPitch = NATURAL_PITCH[letterIdx];
    const targetPitch = (rootPitchClass + step) % 12;
    const diff = (targetPitch - naturalPitch + 12) % 12;
    const accidental = ACCIDENTAL_MAP[diff] ?? `?${diff}`;
    return letter + accidental;
  });
}

function buildKeys(steps: number[]) {
  return ROOTS.map((r) => {
    const letterIdx = LETTERS.indexOf(r.letter);
    return {
      root: r.letter + r.accidental,
      notes: spellScale(r.pitchClass, letterIdx, steps),
    };
  });
}

// ── Semitone step patterns ──────────────────────────────────────────────
// Derived from the Double Harmonic Major parent scale gap pattern:
// 1, 3, 1, 2, 1, 3, 1  (total = 12)
// Each mode is a rotation of this gap sequence.

const DH_STEPS = {
  doubleHarmonicMajor: [0, 1, 4, 5, 7, 8, 11],
  lydianS2S6:          [0, 3, 4, 6, 7, 10, 11],
  ultraphrygian:       [0, 1, 3, 4, 7, 8, 9],
  doubleHarmonicMinor: [0, 2, 3, 6, 7, 8, 11],
  oriental:            [0, 1, 4, 5, 6, 9, 10],
  ionianS2S5:          [0, 3, 4, 5, 8, 9, 11],
  locrianBB3BB7:       [0, 1, 2, 5, 6, 8, 9],
} as const;

// ── Exported data ───────────────────────────────────────────────────────

export const DOUBLE_HARMONIC_MODES: ScaleFamilyMode[] = [
  {
    modeName: 'Double Harmonic Major',
    modeSlug: 'doubleharmonicmajor',
    intervals: '1, ♭2, 3, 4, 5, ♭6, 7',
    keys: buildKeys([...DH_STEPS.doubleHarmonicMajor]),
  },
  {
    modeName: 'Lydian #2 #6',
    modeSlug: 'lydian#2#6',
    intervals: '1, ♯2, 3, ♯4, 5, ♯6, 7',
    keys: buildKeys([...DH_STEPS.lydianS2S6]),
  },
  {
    modeName: 'Ultraphrygian',
    modeSlug: 'ultraphrygian',
    intervals: '1, ♭2, ♭3, ♭4, 5, ♭6, 𝄫7',
    keys: buildKeys([...DH_STEPS.ultraphrygian]),
  },
  {
    modeName: 'Double Harmonic Minor',
    modeSlug: 'doubleharmonicminor',
    intervals: '1, 2, ♭3, #4, 5, ♭6, 7',
    keys: buildKeys([...DH_STEPS.doubleHarmonicMinor]),
  },
  {
    modeName: 'Oriental',
    modeSlug: 'oriental',
    intervals: '1, ♭2, 3, 4, ♭5, 6, ♭7',
    keys: buildKeys([...DH_STEPS.oriental]),
  },
  {
    modeName: 'Ionian #2 #5',
    modeSlug: 'ionian#2#5',
    intervals: '1, ♯2, 3, 4, ♯5, 6, 7',
    keys: buildKeys([...DH_STEPS.ionianS2S5]),
  },
  {
    modeName: 'Locrian 𝄫3 𝄫7',
    modeSlug: 'locrian𝄫3𝄫7',
    intervals: '1, ♭2, 𝄫3, 4, ♭5, ♭6, 𝄫7',
    keys: buildKeys([...DH_STEPS.locrianBB3BB7]),
  },
];
