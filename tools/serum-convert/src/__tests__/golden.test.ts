// Golden-file conversion test. Runs only when the Xfer library is present
// (local machines); skipped in CI. The golden JSON pins the full mapping —
// regenerate deliberately with UPDATE_GOLDEN=1 when mappings change.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertPreset } from '../convert.ts';

const LIBRARY =
  process.env.SERUM_LIBRARY ?? '/Users/marfizo/Desktop/References/Xfer Records';
const PRESET = join(
  LIBRARY,
  'Serum 2 Presets/Presets/Factory/Bass/Retro Analog/BA - Analog Classics 1.SerumPreset',
);
const GOLDEN = join(
  dirname(fileURLToPath(import.meta.url)),
  'golden-analog-classics-1.json',
);

describe.skipIf(!existsSync(PRESET))('golden conversion', () => {
  it('BA - Analog Classics 1 converts byte-stably', () => {
    const { preset } = convertPreset(PRESET, 'Bass');
    const actual = JSON.stringify(preset, null, 1);
    if (process.env.UPDATE_GOLDEN === '1' || !existsSync(GOLDEN)) {
      writeFileSync(GOLDEN, actual);
    }
    expect(actual).toBe(readFileSync(GOLDEN, 'utf8'));
  });
});
