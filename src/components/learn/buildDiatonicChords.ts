import type { ChordScaleEntry } from './chordScaleData';

export type ChordInfo = {
  degreeNumber: number;
  degreeLabel: string;
  quality: string;
  midis: number[];
  noteNames: string[];
};

const QUALITY_DISPLAY: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  'maj(♭5)': 'major (♭5)',
  maj7: 'major 7',
  min7: 'minor 7',
  dom7: 'dominant 7',
  dim7: 'diminished 7',
  'min7(♭5)': 'minor 7 (♭5)',
  'maj7(♯5)': 'major 7 (♯5)',
  'dom7(♯5)': 'dominant 7 (♯5)',
  'dom7(♭5)': 'dominant 7 (♭5)',
  'dom7(♭9)': 'dominant 7 (♭9)',
  'dom7(♯9)': 'dominant 7 (♯9)',
  'dom7(♯5♭9)': 'dominant 7 (♯5♭9)',
  'dom7(♯5♯9)': 'dominant 7 (♯5♯9)',
  'dom7(♭5♭9)': 'dominant 7 (♭5♭9)',
  'min(maj7)': 'minor (major 7)',
  minmaj7: 'minor (major 7)',
  'dim(maj7)': 'diminished (major 7)',
  'dim7(♭9)': 'diminished 7 (♭9)',
  'maj7(♯9)': 'major 7 (♯9)',
  'maj7(♯5♯9)': 'major 7 (♯5♯9)',
  'maj7 ♭9': 'major 7 (♭9)',
  maj7sharp9: 'major 7 (♯9)',
  dom9: 'dominant 9',
  maj9: 'major 9',
  min9: 'minor 9',
  'min9(♭5)': 'minor 9 (♭5)',
  'min7(♭5♭9)': 'minor 7 (♭5♭9)',
  'min7(♭9)': 'minor 7 (♭9)',
  'dom9(♯5)': 'dominant 9 (♯5)',
  'maj9(♯5)': 'major 9 (♯5)',
  maj9sharp5: 'major 9 (♯5)',
  'min(maj9)': 'minor (major 9)',
  'dim(maj9)': 'diminished (major 9)',
  'dim7(add9)': 'diminished 7 (add 9)',
  'sus2(♭5)': 'sus2 (♭5)',
  'sus2(♭5)add6': 'sus2 (♭5) add 6',
  'sus2(♭5)Add6♭9': 'sus2 (♭5) add 6♭9',
  min6: 'minor 6',
  maj6: 'major 6',
  min69: 'minor 6/9',
  'min6/9': 'minor 6/9',
  'min6 Add ♭9': 'minor 6 (add ♭9)',
};

export function qualityDisplayName(quality: string): string {
  return QUALITY_DISPLAY[quality] ?? quality;
}

function buildChords(
  scaleSteps: number[],
  rootMidi: number,
  noteSpelling: string[],
  qualities: ChordScaleEntry[],
  stackSize: 3 | 4,
): ChordInfo[] {
  const steps = scaleSteps.slice(0, 7);
  if (steps.length < 7 || noteSpelling.length < 7) return [];

  const chords: ChordInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const indices = Array.from(
      { length: stackSize },
      (_, k) => (i + k * 2) % 7,
    );
    const midis = indices.map((idx) => {
      return rootMidi + steps[idx];
    });
    // Ensure ascending order: if a note is lower than the previous, add 12
    for (let j = 1; j < midis.length; j++) {
      while (midis[j] <= midis[j - 1]) {
        midis[j] += 12;
      }
    }
    const names = indices.map((idx) => noteSpelling[idx]);
    const q = qualities[i];
    chords.push({
      degreeNumber: i + 1,
      degreeLabel: `${i + 1}. ${noteSpelling[i]} ${qualityDisplayName(q?.quality ?? '')}`,
      quality: q?.quality ?? '',
      midis,
      noteNames: names,
    });
  }
  return chords;
}

export function buildTriads(
  scaleSteps: number[],
  rootMidi: number,
  noteSpelling: string[],
  qualities: ChordScaleEntry[],
): ChordInfo[] {
  return buildChords(scaleSteps, rootMidi, noteSpelling, qualities, 3);
}

export function buildSevenths(
  scaleSteps: number[],
  rootMidi: number,
  noteSpelling: string[],
  qualities: ChordScaleEntry[],
): ChordInfo[] {
  return buildChords(scaleSteps, rootMidi, noteSpelling, qualities, 4);
}

export type ChordVoicing = {
  inversionIndex: number;
  inversionLabel: string;
  midis: number[];
};

const INVERSION_LABELS = [
  'Root',
  '1st Inversion',
  '2nd Inversion',
  '3rd Inversion',
];

const INTERVAL_NAMES: Record<number, string> = {
  0: 'R',
  1: '♭2',
  2: '2',
  3: '♭3',
  4: '3',
  5: '4',
  6: '♭5',
  7: '5',
  8: '♯5',
  9: '6',
  10: '♭7',
  11: '7',
};

export function chordIntervalLabels(midis: number[]): string[] {
  if (midis.length === 0) return [];
  const root = midis[0];
  return midis.map((m) => {
    const semitones = (((m - root) % 12) + 12) % 12;
    return INTERVAL_NAMES[semitones] ?? String(semitones);
  });
}

export function buildInversions(chord: ChordInfo): ChordVoicing[] {
  const n = chord.midis.length;
  const voicings: ChordVoicing[] = [];
  for (let inv = 0; inv < n; inv++) {
    const rotated = [
      ...chord.midis.slice(inv),
      ...chord.midis.slice(0, inv),
    ];
    for (let j = 1; j < rotated.length; j++) {
      while (rotated[j] <= rotated[j - 1]) {
        rotated[j] += 12;
      }
    }
    voicings.push({
      inversionIndex: inv,
      inversionLabel: INVERSION_LABELS[inv],
      midis: rotated,
    });
  }
  return voicings;
}
