import { describe, expect, it } from 'vitest';
import {
  blankGroove,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import {
  listDesignedGrooves,
  loadStudioGrooves,
} from '@/curriculum/engine/drumGrooves/registry';
import { extractFeel, FEEL_PROFILES } from '@/curriculum/engine/parts/feel';
import { blankPart, type InstrumentPart } from '@/curriculum/engine/parts/part';
import { listParts } from '@/curriculum/engine/parts/registry';
import {
  drumGrooveBodySchema,
  feelProfileBodySchema,
  INSTRUMENT_CONTENT_KINDS,
  instrumentPartBodySchema,
} from '../schemas';

/**
 * The instrument kinds' body schemas against what the console writes: every
 * file in the repo, and what the editors make from scratch.
 */

const issues = (
  schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } },
  value: unknown,
) => {
  const result = schema.safeParse(value);
  return result.success ? [] : [String(result.error)];
};

describe('the instrument schemas', () => {
  it('cover the three kinds', () => {
    expect(INSTRUMENT_CONTENT_KINDS).toEqual([
      'drum_groove',
      'instrument_part',
      'feel_profile',
    ]);
  });

  it('accept every groove in the repo, the Studio’s included', async () => {
    const grooves = [...listDesignedGrooves(), ...(await loadStudioGrooves())];
    expect(grooves.length).toBeGreaterThan(40);
    for (const g of grooves) {
      expect(issues(drumGrooveBodySchema, g), g.id).toEqual([]);
    }
  });

  it('accept every part and feel in the repo', () => {
    for (const p of listParts()) {
      expect(issues(instrumentPartBodySchema, p), p.id).toEqual([]);
    }
    for (const f of FEEL_PROFILES) {
      expect(issues(feelProfileBodySchema, f), f.id).toEqual([]);
    }
  });

  it('accept what the editors make', () => {
    const groove: DrumGroove = {
      ...blankGroove('groove-new', 'New'),
      hits: [{ tick: 0, note: 36, velocity: 96, offset: -4 }],
      padGains: { 42: 0.6 },
    };
    expect(issues(drumGrooveBodySchema, groove)).toEqual([]);
    const part: InstrumentPart = {
      ...blankPart('a-part', 'A part'),
      feel: 'samba-bahia',
      notes: [
        {
          tick: 0,
          duration: 480,
          midi: 60,
          velocity: 90,
          offset: 6,
          finger: 1,
        },
      ],
    };
    expect(issues(instrumentPartBodySchema, part)).toEqual([]);
    const feel = extractFeel(part.notes, { id: 'samba-bahia', name: 'Samba' });
    expect(issues(feelProfileBodySchema, feel)).toEqual([]);
  });

  it('refuse a key the type does not have, and a snake-case part id', () => {
    const part = blankPart('a_part', 'A part');
    expect(issues(instrumentPartBodySchema, part)).not.toEqual([]);
    const groove = { ...blankGroove('g', 'G'), extra: true };
    expect(issues(drumGrooveBodySchema, groove)).not.toEqual([]);
  });
});
