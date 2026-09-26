/**
 * TEST-ONLY firewall assertions. Not imported by application code.
 *
 * Rule 1 makes two separate promises, and conflating them is what produced the
 * old `FORBIDDEN_SUBSTRINGS` scan over a serialized snapshot:
 *
 *   1. NO teacher-only KEY survives a projection. That is a structural claim
 *      about field names — assert it with `expectNoForbiddenKeys`.
 *   2. NO teacher-only VALUE survives a projection. That is a claim about the
 *      fixture's planted rationale content — assert it with
 *      `expectNoRationaleLeak`.
 *
 * Scanning a serialized blob for the *names* of teacher-only fields tests
 * neither one honestly: it fails on innocent content (a song called "Tears of a
 * Clown", an atlas interaction whose `expects` is the literal `'score'`) while
 * missing a leaked value that happens not to contain a field name.
 */
import { expect } from 'vitest';
import { FORBIDDEN_KEYS, isForbiddenKey } from './publish/publishDay';

/**
 * The distinctive markers the classroom test fixtures plant in every
 * `CellRationale` field. None may appear in any student-facing projection.
 * Keep in lockstep with `makeCell` in the firewall suites.
 */
export const RATIONALE_LEAK_MARKERS = [
  'ASSESSMENT:',
  'STANDARDS:',
  'ANCHOR:',
  'SEL:',
  'IMPACT:',
  'CLO:',
  'NOTES:',
  'SCAFFOLD:',
  'CREATEDBY:',
  'LOCALCONTEXT:',
  'SECRET',
] as const;

/** Every object key in `value`, at any depth, in traversal order. */
export const collectKeys = (value: unknown): string[] => {
  const keys: string[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        keys.push(k);
        walk(val);
      }
    }
  };
  walk(value);
  return keys;
};

/** Rule 1, structural half: no teacher-only field NAME at any depth. */
export const expectNoForbiddenKeys = (
  value: unknown,
  label = 'value',
): void => {
  for (const key of collectKeys(value)) {
    expect(
      isForbiddenKey(key),
      `${label} contains forbidden key "${key}"`,
    ).toBe(false);
  }
};

/** Exhaustiveness companion: prove the walk would catch each forbidden key. */
export const expectForbiddenKeyListCovered = (value: unknown): void => {
  const keys = new Set(collectKeys(value).map((k) => k.toLowerCase()));
  for (const forbidden of FORBIDDEN_KEYS) {
    expect(
      keys.has(forbidden.toLowerCase()),
      `contains forbidden key "${forbidden}"`,
    ).toBe(false);
  }
};

/** Rule 1, content half: none of the fixture's planted rationale VALUES. */
export const expectNoRationaleLeak = (
  value: unknown,
  label = 'value',
): void => {
  const serialized = JSON.stringify(value).toUpperCase();
  for (const marker of RATIONALE_LEAK_MARKERS) {
    expect(
      serialized.includes(marker),
      `${label} leaked rationale content "${marker}"`,
    ).toBe(false);
  }
};
