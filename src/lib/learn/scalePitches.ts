import {
  ALL_MODES,
  FAMILY_DEGREE_ORDER,
  MODE_FAMILY_INFO,
} from '@/daw/prism-engine/data/modes';
import { modeDegreeFormula } from '@/lib/learn/modeCharacter';
import { getScaleLesson } from '@/lib/learn/scaleLessons';
import { canonicalModeKey, getLocalModeSteps } from '@/lib/modeStepsFallback';

// ── A scale's shape, for drawing it (owner, 2026-10-26) ───────────────────
// Learn's Theory tiles draw each scale as a figure on the twelve-note
// circle: its notes, the ones that set it apart from major, and the steps
// between them.

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** A five- or six-note scale's notes outside major, named as players do. */
const OUTSIDE_MAJOR: Readonly<Record<number, string>> = {
  1: '♭2',
  3: '♭3',
  6: '♭5',
  8: '♭6',
  10: '♭7',
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A Theory slug's pitch classes above its tonic (0), sorted; null for a
 *  slug the engine doesn't know. */
export function pitchClassesOf(slug: string): number[] | null {
  const steps = getLocalModeSteps(slug);
  if (!steps?.length) return null;
  return [...new Set(steps.map(mod12))].sort((a, b) => a - b);
}

/**
 * The notes that set a scale apart from the major scale, with their names:
 * Lydian's ♯4, Dorian's ♭3 and ♭7. A seven-note scale is read degree by
 * degree (so Locrian's 5 is ♭5, Lydian's is ♯4); a shorter one names the
 * notes major doesn't have.
 */
export function alteredDegrees(
  pcs: readonly number[],
): { pc: number; label: string }[] {
  const formula = pcs.length === 7 ? modeDegreeFormula(pcs) : null;
  if (formula) {
    return formula
      .split(' ')
      .map((label, i) => ({ pc: pcs[i], label }))
      .filter(({ label }) => /[♭♯𝄫]/u.test(label));
  }
  return pcs
    .filter((pc) => !MAJOR.includes(pc))
    .map((pc) => ({ pc, label: OUTSIDE_MAJOR[pc] ?? String(pc) }));
}

/** The steps between a scale's notes, round to the octave: W, H, or 1½
 *  (an augmented 2nd, or a pentatonic's minor 3rd), 2 for a major 3rd. */
export function stepPattern(pcs: readonly number[]): string[] {
  return pcs.map((pc, i) => {
    const next = i + 1 < pcs.length ? pcs[i + 1] : pcs[0] + 12;
    const gap = next - pc;
    return gap === 1
      ? 'H'
      : gap === 2
        ? 'W'
        : gap === 3
          ? '1½'
          : String(gap / 2);
  });
}

/** The scale's notes taken in thirds (every other note): the order its
 *  chords stack in, drawn as a star. An odd count makes one star (seven
 *  notes a heptagram, five a pentagram); an even count closes after half
 *  and makes two polygons (six notes, two triangles). */
export function thirdsStars(pcs: readonly number[]): number[][] {
  const n = pcs.length;
  if (n < 3) return [[...pcs]];
  if (n % 2) return [Array.from({ length: n }, (_, k) => pcs[(2 * k) % n])];
  return [0, 1].map((start) =>
    Array.from({ length: n / 2 }, (_, k) => pcs[start + 2 * k]),
  );
}

/** What each family's root scale is called, after a key: "G major". */
const PARENT_NAME: Readonly<Record<string, string>> = {
  Diatonic: 'major',
  'Harmonic Minor': 'harmonic minor',
  'Melodic Minor': 'melodic minor',
  'Harmonic Major': 'harmonic major',
  'Double Harmonic': 'double harmonic major',
};

/**
 * The scale a mode is a mode of (its parent): how far the mode's tonic sits
 * above the parent's root, in semitones, and what the parent is called.
 * C Lydian is the fourth mode of G major, 5 above G; C Phrygian Dominant
 * the fifth of F harmonic minor (`mode` 4, 5). A pentatonic or blues scale
 * takes its parent mode's (minor pentatonic is Aeolian's, so its relative
 * major), with no `mode`.
 * Null for a scale with no family.
 */
export function parentOf(
  slug: string,
): { above: number; name: string; mode: number | null } | null {
  const lesson = getScaleLesson(slug.toLowerCase());
  const key = lesson ? lesson.parentMode : canonicalModeKey(slug);
  const info = key ? MODE_FAMILY_INFO[key] : undefined;
  if (!info) return null;
  const family = FAMILY_DEGREE_ORDER.find((f) => f.label === info.familyLabel);
  const steps = family ? ALL_MODES[family.modes[0]] : undefined;
  if (!steps) return null;
  return {
    above: steps[info.position],
    name: PARENT_NAME[info.familyLabel] ?? info.familyLabel.toLowerCase(),
    // Which mode of the parent it is (Lydian 4); a pentatonic or blues
    // scale is drawn from its parent, not one of its modes.
    mode: lesson ? null : info.position + 1,
  };
}
