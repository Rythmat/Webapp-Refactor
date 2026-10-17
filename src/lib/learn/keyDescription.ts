import { getChordScales } from '@/components/learn/chordScaleData';
import { getNoteSpelling } from '@/components/learn/noteSpellingLookup';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { modeCharacter } from '@/lib/learn/modeCharacter';
import { isScaleLesson } from '@/lib/learn/scaleLessons';

/**
 * A key in words, as the Theory overview's Scale tab tells it: what the mode
 * sounds like, its key signature, its scale degrees and its notes. Shared so
 * a lesson's "About this step" says the same thing about its key.
 */
export interface KeyDescription {
  /** "C Ionian", the tonic as the scale spells it. */
  title: string;
  /** "The major scale: bright, settled, home", when the mode has one. */
  character: string | null;
  /** "has no sharps or flats"; null for a pentatonic or blues scale. */
  signature: string | null;
  /** "1, 2, 3, 4, 5, 6, 7". */
  degrees: string | null;
  /** The scale's notes, spelled for the key: C, D, E… */
  notes: string[];
}

/** "has 2 sharps", "has no sharps or flats", from the spelled notes. */
export function keySignatureDescription(notes: readonly string[]): string {
  const count = (weights: Record<string, number>) =>
    notes.reduce(
      (total, name) =>
        total + [...name].reduce((sum, char) => sum + (weights[char] ?? 0), 0),
      0,
    );
  const sharps = count({ '♯': 1, '#': 1, '𝄪': 2 });
  const flats = count({ '♭': 1, '𝄫': 2 });
  if (sharps === 0 && flats === 0) return 'has no sharps or flats';
  const parts: string[] = [];
  if (sharps > 0) parts.push(`${sharps} sharp${sharps > 1 ? 's' : ''}`);
  if (flats > 0) parts.push(`${flats} flat${flats > 1 ? 's' : ''}`);
  return `has ${parts.join(' and ')}`;
}

/**
 * The mode a key's name says, when the lesson has no scale id that maps to
 * one: "C Major (Ionian)" → ionian, "G major" → ionian, "E minor" → aeolian.
 * Null when the name doesn't say.
 */
export function modeFromKeyName(name: string): string | null {
  const named = /\(([a-z]+)\)/i.exec(name)?.[1];
  if (named) return named.toLowerCase();
  if (/\bmajor\b/i.test(name)) return 'ionian';
  if (/\bminor\b/i.test(name)) return 'aeolian';
  return null;
}

/** Null when the mode isn't one the app can spell. */
export function describeKey(
  tonic: string,
  modeSlug: string,
): KeyDescription | null {
  const spelled = getNoteSpelling(modeSlug, tonic);
  if (!spelled || spelled.length === 0) return null;
  const notes = spelled.slice(0, 7).map((n) => formatAccidentalsForDisplay(n));
  const scales = getChordScales(modeSlug);
  const modeName =
    scales?.modeName ?? modeSlug.charAt(0).toUpperCase() + modeSlug.slice(1);
  return {
    title: `${notes[0]} ${modeName}`,
    character: modeCharacter(modeSlug) ?? null,
    // A pentatonic or blues scale is not a key: it has no signature.
    signature: isScaleLesson(modeSlug) ? null : keySignatureDescription(notes),
    degrees: scales?.intervals ?? null,
    notes,
  };
}
