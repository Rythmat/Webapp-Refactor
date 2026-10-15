import { describe, expect, it } from 'vitest';
import { REPO_VOCABULARY } from '@/content/vocabulary/repo';
import { RECORD_SCHEMAS } from '@/content/vocabulary/schemas';
import { vocabularyRecordSchemas } from '@/scripts/apiContract/vocabularyRecordSchemas';
import { schemaShape } from './schemaShape';

/**
 * The vocabulary kinds' contract, kept honest: each of the API's
 * import-free schemas has the shape of the app's, and both take every
 * record the repo holds and refuse the same bad ones.
 */

const KINDS = ['genre', 'subgenre', 'instrument'] as const;

const records = {
  genre: REPO_VOCABULARY.genres,
  subgenre: REPO_VOCABULARY.subgenres,
  instrument: REPO_VOCABULARY.instruments,
};

describe.each(KINDS)('the %s schema', (kind) => {
  const api = vocabularyRecordSchemas[kind];
  const app = RECORD_SCHEMAS[kind];

  it('has the shape of the app schema', () => {
    expect(schemaShape(api)).toEqual(schemaShape(app));
  });

  it('takes every record in the repo', () => {
    expect(records[kind].length).toBeGreaterThan(0);
    const refused = records[kind]
      .filter((record) => !api.safeParse(record).success)
      .map((record) => record.id);
    expect(refused).toEqual([]);
  });

  it('refuses what the app schema refuses', () => {
    const record = records[kind][0] as Record<string, unknown>;
    const bad = [
      { ...record, id: 'Not Kebab' },
      { ...record, name: '' },
      { ...record, name: ' padded' },
      { ...record, extra: true },
    ];
    for (const body of bad) {
      expect(app.safeParse(body).success).toBe(false);
      expect(api.safeParse(body).success).toBe(false);
    }
  });
});
