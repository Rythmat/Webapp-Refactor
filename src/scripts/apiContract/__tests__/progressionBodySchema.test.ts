import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import {
  progressionErrors,
  validateProgression,
} from '@/curriculum/engine/progressionValidation';
import { chordProgressionBodySchema as appSchema } from '@/features/admin/content/mock/progressionSchema';
import { chordProgressionBodySchema } from '@/scripts/apiContract/progressionBodySchema';
import { buildProgressionRules } from '@/scripts/apiContract/progressionRules';
import { schemaShape } from './schemaShape';

/**
 * The `chord_progression` contract, kept honest: the API's import-free
 * schema has the app's shape and takes what the library holds, and the
 * rules file says what the app's validator checks.
 */

const RULES_OUT = 'src/scripts/apiContract/progressionRules.generated.json';
const rules = buildProgressionRules();

describe('the progression body schema', () => {
  it('has the shape of the schema the mock and repo mode use', () => {
    expect(schemaShape(chordProgressionBodySchema)).toEqual(
      schemaShape(appSchema),
    );
  });

  it('takes every library entry, as the app schema does', () => {
    const refused = LIB.filter(
      (entry) => !chordProgressionBodySchema.safeParse(entry).success,
    ).map((entry) => entry.id);
    expect(refused).toEqual([]);
  });

  it('refuses what the app schema refuses', () => {
    const entry = LIB[0];
    const bad = [
      { ...entry, chords: '1 major - 4 major' },
      { ...entry, id: '1' },
      { ...entry, extra: true },
      { ...entry, chordCount: -1 },
    ];
    for (const body of bad) {
      expect(appSchema.safeParse(body).success).toBe(false);
      expect(chordProgressionBodySchema.safeParse(body).success).toBe(false);
    }
  });
});

describe('the generated progression rules', () => {
  it('match what the validator says today', async () => {
    // Formatted as the repo's prettier writes JSON, so the push hook's
    // `prettier --check` and this test agree on the bytes.
    const wanted = await format(JSON.stringify(rules, null, 2), {
      ...(await resolveConfig(RULES_OUT)),
      parser: 'json',
    });
    if (process.env.WRITE_CONTRACT) writeFileSync(RULES_OUT, wanted);
    expect(readFileSync(RULES_OUT, 'utf8')).toBe(wanted);
  });

  /** The rules file's checks, as an API would write them from the data alone. */
  const checkedFromRules = (chords: string[]): boolean => {
    const types = new Set(rules.chordTypes);
    const degree = new RegExp(rules.degreePattern);
    return (
      chords.length >= rules.minChords &&
      chords.length <= rules.maxChords &&
      chords.every((chord) => {
        const space = chord.indexOf(' ');
        if (space <= 0) return false;
        const type = chord.slice(space + 1);
        return (
          degree.test(chord.slice(0, space)) &&
          !/\s/.test(type) &&
          types.has(type)
        );
      })
    );
  };

  it('say what the validator says about every library entry', () => {
    const disagree = LIB.filter((entry) => {
      const app = !progressionErrors({ ...entry }).some(
        (issue) => issue.rule === 'chord' || issue.rule === 'count',
      );
      return app !== checkedFromRules(entry.chords);
    }).map((entry) => entry.id);
    expect(disagree).toEqual([]);
  });

  it('say what the validator says about chords it refuses', () => {
    for (const chords of [
      ['1 major'],
      ['1 major', '4 notachord'],
      ['8 major', '4 major'],
      ['1major', '4 major'],
      Array.from({ length: 8 }, () => '1 major'),
    ]) {
      const app = !validateProgression({ id: 1, chords }).some(
        (issue) => issue.rule === 'chord' || issue.rule === 'count',
      );
      expect(app, chords.join(', ')).toBe(false);
      expect(checkedFromRules(chords), chords.join(', ')).toBe(false);
    }
  });

  it('derive the fields the validator derives', () => {
    const chords = ['b7 major', '1 minor7'];
    const issues = validateProgression({
      id: 1,
      chords,
      progression: chords.join(' - '),
      chordCount: chords.length,
      startingChord: chords[0],
      startingDegree: chords[0].split(/\s+/)[0],
    });
    expect(issues.filter((issue) => issue.rule === 'derived')).toEqual([]);
  });
});
