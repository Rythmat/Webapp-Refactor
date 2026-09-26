/**
 * The flag file and `docs/classroom-v2/CONTRACT-DELTAS.md` are one contract in
 * two places. This pins them together so neither can drift:
 *
 *   - a flag added here without a row in the deltas doc fails;
 *   - a row added there naming a flag that does not exist here fails;
 *   - a flag flipped to `true` without its endpoint shipping fails.
 *
 * The last one is the important one. Every flag gates a route the server does
 * not register yet, and flipping one early turns a degraded-but-honest local
 * path into a stream of 404s — each of which writes a telemetry row.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as flags from './serverEndpoints';

const DELTAS_PATH = resolve(
  process.cwd(),
  'docs/classroom-v2/CONTRACT-DELTAS.md',
);

const exportedFlags = Object.keys(flags)
  .filter((k) => k.startsWith('SERVER_'))
  .sort();

const documentedFlags = [
  ...new Set(
    (readFileSync(DELTAS_PATH, 'utf8').match(/SERVER_[A-Z0-9_]+/g) ?? []).map(
      String,
    ),
  ),
].sort();

describe('serverEndpoints flags ↔ CONTRACT-DELTAS.md', () => {
  it('documents every exported flag', () => {
    const undocumented = exportedFlags.filter(
      (f) => !documentedFlags.includes(f),
    );
    expect(
      undocumented,
      `add a row to docs/classroom-v2/CONTRACT-DELTAS.md for: ${undocumented.join(', ')}`,
    ).toEqual([]);
  });

  it('exports every documented flag', () => {
    const missing = documentedFlags.filter((f) => !exportedFlags.includes(f));
    expect(
      missing,
      `add a flag (default false, with a doc block) to src/constants/serverEndpoints.ts for: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('every flag is a boolean and OFF until its endpoint ships', () => {
    for (const name of exportedFlags) {
      const value = (flags as Record<string, unknown>)[name];
      expect(typeof value, `${name} must be a boolean`).toBe('boolean');
      expect(
        value,
        `${name} is true — flip a flag only in the change that ships its endpoint, and update CONTRACT-DELTAS.md in the same commit`,
      ).toBe(false);
    }
  });

  it('carries the whole set (guards against an accidental truncation)', () => {
    expect(exportedFlags.length).toBeGreaterThanOrEqual(19);
  });
});
