/**
 * dropTheSizzle.ts — Naming the chord a "Drop the Sizzle" move lands on.
 *
 * The Sizzle is the ♭7 of a minor 7th chord. Drop it a half step and it becomes
 * the 6th; the other voices hold. The notes barely move — one semitone — but
 * what the chord is CALLED depends entirely on the bass:
 *
 *   Cm7 (C E♭ G B♭) with B♭ → A gives C E♭ G A, and that is either
 *     • F7   — when the bass moves to F, a 4th above. The held E♭ and G become
 *              the ♭7 and 9 of F, and A is F's 3rd. This is the usual case.
 *     • Cm6  — when the bass STAYS on C. Nothing has changed root, so the
 *              chord is simply the minor with a 6th instead of a ♭7.
 *
 * The bass is the whole test. Funk and African both use the second form, where
 * the groove sits on one root and the inner voice does the moving, so a rule
 * that always wrote the dominant would mislabel those.
 *
 * With no bass sounding at all — a rootless right-hand voicing drilled on its
 * own — the dominant reading is the default, because that is what the
 * surrounding progression means by it (Funk L3's "Cm9→F13" exercise is
 * rootless throughout and is named from the progression, not the voicing).
 */

/** The 4th above a root, where the dominant reading puts its root. */
const PERFECT_FOURTH = 5;

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export type SizzleQuality = 'minor6' | 'dominant';

export interface SizzleTarget {
  /** Pitch class of the chord the drop lands on. */
  rootPc: number;
  /**
   * Which chord it is. 'dominant' names the family, not a specific extension —
   * the voicing decides whether it is written 7, 9 or 13.
   */
  quality: SizzleQuality;
}

/**
 * Name the chord a Sizzle drop resolves to.
 *
 * @param minorRootPc Pitch class of the minor 7th chord the drop starts from.
 * @param bassPc      Pitch class sounding in the bass at the resolution, or
 *                    null when nothing is sounding below the voicing.
 */
export function sizzleTarget(
  minorRootPc: number,
  bassPc: number | null,
): SizzleTarget {
  const root = mod12(minorRootPc);

  // The bass holding the minor root means the chord never left home.
  if (bassPc !== null && mod12(bassPc) === root) {
    return { rootPc: root, quality: 'minor6' };
  }

  return { rootPc: mod12(root + PERFECT_FOURTH), quality: 'dominant' };
}

/**
 * Whether a written pair of chord symbols is a legal Sizzle resolution —
 * used to audit the curriculum's own labels rather than at runtime.
 *
 * Both roots are pitch classes; `landsOnMinor6` says whether the second symbol
 * was written as a minor 6 (or 13) on the same root.
 */
export function isSizzleResolution(
  minorRootPc: number,
  landingRootPc: number,
  landsOnMinor6: boolean,
): boolean {
  const expected = sizzleTarget(
    minorRootPc,
    landsOnMinor6 ? minorRootPc : null,
  );
  return (
    mod12(landingRootPc) === expected.rootPc &&
    (landsOnMinor6
      ? expected.quality === 'minor6'
      : expected.quality === 'dominant')
  );
}
