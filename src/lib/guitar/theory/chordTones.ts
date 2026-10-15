// ── Chord tones ────────────────────────────────────────────────────────────
// What each note of a chord shape is, measured from the root: the labels a
// ChordBox draws in "Chord tones" mode, the formula line under its name, and
// the key-aware note names hints and theory notes print.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import {
  formatNoteName,
  noteNameToPitchClass,
  spellChord,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { shapeNotes } from '@/lib/guitar/fretboard';
import type { ChordToneLabel, ChordToneRole, ShapeTone } from './types';

export interface FormulaTone {
  label: ChordToneLabel;
  role: ChordToneRole;
}

const R: FormulaTone = { label: 'R', role: 'root' };
const MAJ3: FormulaTone = { label: '3', role: 'third' };
const MIN3: FormulaTone = { label: 'b3', role: 'third' };
const P5: FormulaTone = { label: '5', role: 'fifth' };
const DIM5: FormulaTone = { label: 'b5', role: 'fifth' };
const AUG5: FormulaTone = { label: '#5', role: 'fifth' };
const MAJ7: FormulaTone = { label: '7', role: 'seventh' };
const MIN7: FormulaTone = { label: 'b7', role: 'seventh' };
const DIM7: FormulaTone = { label: 'bb7', role: 'seventh' };
// A sus2 chord's 2 stands where the 3rd would, and a 6 where the 7th would,
// so every four-note chord keeps the R, third, fifth, seventh slots.
const SUS2: FormulaTone = { label: '2', role: 'third' };
const SIX: FormulaTone = { label: '6', role: 'seventh' };

/** Semitones above the root → chord tone. A missing entry is not in the chord. */
export const CHORD_FORMULA: Readonly<
  Record<BookChordQuality, Readonly<Record<number, FormulaTone>>>
> = {
  maj: { 0: R, 4: MAJ3, 7: P5 },
  min: { 0: R, 3: MIN3, 7: P5 },
  dim: { 0: R, 3: MIN3, 6: DIM5 },
  aug: { 0: R, 4: MAJ3, 8: AUG5 },
  majb5: { 0: R, 4: MAJ3, 6: DIM5 },
  sus2b5: { 0: R, 2: SUS2, 6: DIM5 },
  maj7: { 0: R, 4: MAJ3, 7: P5, 11: MAJ7 },
  dom7: { 0: R, 4: MAJ3, 7: P5, 10: MIN7 },
  min7: { 0: R, 3: MIN3, 7: P5, 10: MIN7 },
  min7b5: { 0: R, 3: MIN3, 6: DIM5, 10: MIN7 },
  dim7: { 0: R, 3: MIN3, 6: DIM5, 9: DIM7 },
  minMaj7: { 0: R, 3: MIN3, 7: P5, 11: MAJ7 },
  'maj7#5': { 0: R, 4: MAJ3, 8: AUG5, 11: MAJ7 },
  dom7b5: { 0: R, 4: MAJ3, 6: DIM5, 10: MIN7 },
  min6: { 0: R, 3: MIN3, 7: P5, 9: SIX },
  sus2b5add6: { 0: R, 2: SUS2, 6: DIM5, 9: SIX },
};

/** The tones that make the quality what it is; diagnostics listen for these. */
export const QUALITY_TONES: Readonly<
  Record<BookChordQuality, readonly ChordToneRole[]>
> = {
  maj: ['third'],
  min: ['third'],
  dim: ['third', 'fifth'],
  aug: ['third', 'fifth'],
  majb5: ['third', 'fifth'],
  sus2b5: ['third', 'fifth'],
  maj7: ['third', 'seventh'],
  dom7: ['third', 'seventh'],
  min7: ['third', 'seventh'],
  min7b5: ['third', 'fifth', 'seventh'],
  dim7: ['third', 'fifth', 'seventh'],
  minMaj7: ['third', 'seventh'],
  'maj7#5': ['third', 'fifth', 'seventh'],
  dom7b5: ['third', 'fifth', 'seventh'],
  min6: ['third', 'seventh'],
  sus2b5add6: ['third', 'fifth', 'seventh'],
};

/** A three-note chord (a triad, or a triad-like sus2(♭5)). */
export function isTriadQuality(quality: BookChordQuality): boolean {
  return Object.keys(CHORD_FORMULA[quality]).length === 3;
}

/** A four-note chord: a 7th chord, or a 6 chord in a 7th chord's place. */
export function isSeventhQuality(quality: BookChordQuality): boolean {
  return Object.keys(CHORD_FORMULA[quality]).length === 4;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The quality's semitones above the root, ascending (R, 3rd, 5th, 7th). */
export function chordSemitones(quality: BookChordQuality): number[] {
  return Object.keys(CHORD_FORMULA[quality])
    .map(Number)
    .sort((a, b) => a - b);
}

/** Tones in formula order: R, 3rd, 5th, 7th. */
export function chordFormulaTones(quality: BookChordQuality): FormulaTone[] {
  return chordSemitones(quality).map((s) => CHORD_FORMULA[quality][s]);
}

export function chordToneLabel(
  midi: number,
  rootPc: number,
  quality: BookChordQuality,
): ChordToneLabel | null {
  return CHORD_FORMULA[quality][mod12(midi - rootPc)]?.label ?? null;
}

/** One label per sounding string, low to high; null where a note is not a chord tone. */
export function shapeToneLabels(
  frets: string,
  rootPc: number,
  quality: BookChordQuality,
): (ChordToneLabel | null)[] {
  return shapeNotes(frets).map((n) => chordToneLabel(n.midi, rootPc, quality));
}

/**
 * The chord's notes spelled by stacking letters on the root (root, +2, +4,
 * +6 letters), each with whatever accidental makes its pitch: Gb → Gb Bb Db,
 * E#m7b5 → E# G# B D#. ASCII accidentals, in formula order.
 */
export function spellChordTones(
  rootName: string,
  quality: BookChordQuality,
): string[] {
  return spellChord(rootName, chordSemitones(quality), { strict: true }).map(
    (name) => formatNoteName(name, 'ascii'),
  );
}

/**
 * Every sounding note of a shape with its label, role and spelled name, low
 * to high. Null when a note is not in the chord (the shape is not the chord
 * it is labelled as).
 */
export function shapeTones(
  frets: string,
  rootName: string,
  quality: BookChordQuality,
): ShapeTone[] | null {
  const rootPc = noteNameToPitchClass(rootName);
  if (rootPc === null) return null;
  const names = spellChordTones(rootName, quality);
  const semitones = chordSemitones(quality);
  const tones: ShapeTone[] = [];
  for (const { midi, position } of shapeNotes(frets)) {
    const interval = mod12(midi - rootPc);
    const tone = CHORD_FORMULA[quality][interval];
    if (!tone) return null;
    tones.push({
      string: position.string,
      fret: position.fret,
      midi,
      label: tone.label,
      role: tone.role,
      noteName: names[semitones.indexOf(interval)],
      isQualityTone: QUALITY_TONES[quality].includes(tone.role),
    });
  }
  return tones;
}

/** 'b3' → '♭3', 'bb7' → '𝄫7', '#5' → '♯5'. */
export function toneLabelText(label: ChordToneLabel): string {
  return label.replace('bb', '𝄫').replace('b', '♭').replace('#', '♯');
}

/** For aria: 'R' → 'root', 'b3' → 'flat 3', 'bb7' → 'double flat 7'. */
export function spokenToneLabel(label: ChordToneLabel): string {
  if (label === 'R') return 'root';
  return label.replace(/^(bb|b|#)/, (accidental) =>
    accidental === 'bb'
      ? 'double flat '
      : accidental === 'b'
        ? 'flat '
        : 'sharp ',
  );
}

/** The formula line under a chord name: 'R ♭3 ♭5 ♭7'. */
export function formulaText(quality: BookChordQuality): string {
  return chordFormulaTones(quality)
    .map((t) => toneLabelText(t.label))
    .join(' ');
}
