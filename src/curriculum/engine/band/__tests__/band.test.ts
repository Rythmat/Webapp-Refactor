import { afterEach, describe, expect, it, vi } from 'vitest';
import { realizeComping } from '../../chordComping/chordComping';
import type { ChordSymbolTones } from '../../genreGeneration/chordSymbolTones';
import {
  pairedBassNotes,
  pairedDrumNotes,
} from '../../lessonPairings/pairedBacking';
import {
  bandIdAt,
  getPairing,
  legacyBand,
  listPairings,
  pairingFor,
  pairingsReady,
  rememberPairing,
} from '../../lessonPairings/registry';
import { barTicks } from '../../meter';
import { type Band, bandVariation } from '../band';
import { realizeBand } from '../realize';
import { ALL_ITEMS, LIVE_ITEMS, rememberBand } from '../registry';

/**
 * A band is the pairing it replaces, played through one contract: the same
 * items make the same notes, and a style is assigned once, with overrides
 * only where a chunk of it differs.
 */

const E_MINOR: ChordSymbolTones = {
  rootPc: 4,
  bassPc: 4,
  intervals: [0, 3, 7],
} as ChordSymbolTones;
const chordAt = () => E_MINOR;

afterEach(() => vi.restoreAllMocks());

describe('a pairing as a band', () => {
  it('plays exactly the notes its three items played', async () => {
    await pairingsReady;
    // Drums humanize with Math.random: hold it still for the comparison.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    for (const pairing of listPairings()) {
      // Only the pairings still written as three items.
      const band = legacyBand(pairing);
      if (!band) continue;
      const ts = band.timeSignature;
      const ctx = { chordAt, bars: 4, timeSignature: ts };
      const byLayer = new Map(
        realizeBand(band, LIVE_ITEMS, ctx).map((r) => [r.layer.id, r.notes]),
      );
      const drums = LIVE_ITEMS.groove(pairing.drums ?? '');
      const bass = LIVE_ITEMS.bassLine(pairing.bass ?? '');
      const comping = LIVE_ITEMS.comping(pairing.comping ?? '');
      if (drums)
        expect(byLayer.get('groove')).toEqual(
          pairedDrumNotes(drums, 4, barTicks(ts)),
        );
      if (bass)
        expect(byLayer.get('bassLine')).toEqual(
          pairedBassNotes(bass, chordAt, 4, ts),
        );
      if (comping)
        expect(byLayer.get('comping')).toEqual(
          realizeComping(comping, chordAt, 4, ts),
        );
    }
  });

  it('keeps every Latin L1 style’s drums, bass and comping', async () => {
    await pairingsReady;
    const cumbia = pairingFor('latin', 1, 'l1b');
    expect(cumbia?.drums?.id).toBe('groove-latin-1');
    expect(cumbia?.bass?.id).toBe('cumbia-1');
    // A comping pattern plays once published; until then, the step's own.
    expect(cumbia?.comping?.id).toBe(
      LIVE_ITEMS.comping('cumbia-offbeats') ? 'cumbia-offbeats' : undefined,
    );
    expect(cumbia?.band.layers.map((l) => l.instrument)).toEqual([
      'drums',
      'bass',
      'keys',
      'guitar',
    ]);
    // Each style plays its own variation of the one Latin band.
    expect(pairingFor('latin', 1, 'l1c')?.drums?.id).toBe('groove-latin-2');
    expect(pairingFor('latin', 1, 'l1c')?.band.timeSignature).toEqual([3, 4]);
    expect(pairingFor('latin', 1, 'l1a')?.drums?.id).toBe('reggaeton_01');
  });
});

describe('a band assigned to a style', () => {
  const band = (id: string, groove: string, status: Band['status']): Band => ({
    id,
    name: id,
    status,
    timeSignature: [4, 4],
    tempo: 96,
    layers: [
      {
        id: 'drums',
        name: 'Drums',
        instrument: 'drums',
        source: { kind: 'groove', id: groove },
      },
    ],
  });
  const original = getPairing('funk-l2-syncopation')!;

  afterEach(() => {
    rememberPairing(original);
    rememberBand('test-band', null);
    rememberBand('test-break', null);
  });

  it('covers every step of the style, and an override only its own chunk', () => {
    rememberBand('test-band', band('test-band', 'groove_funk_03', 'live'));
    rememberBand('test-break', band('test-break', 'groove_funk_01', 'live'));
    rememberPairing({
      id: 'funk-l2-syncopation',
      band: 'test-band',
      overrides: [{ section: 'D', steps: [3, 4], band: 'test-break' }],
    });
    const at = (section: string, stepNumber: number) =>
      pairingFor('funk', 2, undefined, { section, stepNumber })?.band.id;
    expect(at('A', 1)).toBe('test-band');
    expect(at('D', 2)).toBe('test-band');
    expect(at('D', 3)).toBe('test-break');
    // A place the lesson cannot say plays the style's own band.
    expect(pairingFor('funk', 2, undefined)?.band.id).toBe('test-band');
  });

  it('waits while the band is a draft', () => {
    rememberBand('test-band', band('test-band', 'groove_funk_03', 'draft'));
    rememberPairing({ id: 'funk-l2-syncopation', band: 'test-band' });
    expect(pairingFor('funk', 2, undefined)).toBeUndefined();
    // The console still previews it.
    const preview = realizeBand(
      bandVariation(band('test-band', 'groove_funk_03', 'draft')),
      ALL_ITEMS,
      { chordAt, bars: 1, timeSignature: [4, 4] },
    );
    expect(preview[0].notes.length).toBeGreaterThan(0);
  });

  it('plays the variation made for the style, and leaves an empty member to the lesson', () => {
    rememberBand('test-band', {
      ...band('test-band', 'groove_funk_03', 'live'),
      layers: [
        { id: 'drums', name: 'Drums', instrument: 'drums' },
        { id: 'bass', name: 'Bass', instrument: 'bass' },
      ],
      variations: [
        {
          id: 'pocket',
          name: 'The Pocket',
          style: 'funk-l1-pocket',
          plays: { drums: { kind: 'groove', id: 'groove_funk_01' } },
        },
        {
          id: 'syncopation',
          name: 'Syncopation',
          style: 'funk-l2-syncopation',
          timeSignature: [3, 4],
          plays: {
            drums: { kind: 'groove', id: 'groove_funk_03' },
            bass: { kind: 'bassLine', id: 'funk' },
          },
        },
      ],
    });
    rememberPairing({ id: 'funk-l2-syncopation', band: 'test-band' });
    const played = pairingFor('funk', 2, undefined)!.band;
    expect(played.variation?.id).toBe('syncopation');
    expect(played.timeSignature).toEqual([3, 4]);
    expect(played.layers.map((l) => l.source.id)).toEqual([
      'groove_funk_03',
      'funk',
    ]);
    // Named outright, another variation; its empty bass drops out.
    rememberPairing({
      id: 'funk-l2-syncopation',
      band: 'test-band',
      variation: 'pocket',
    });
    expect(
      pairingFor('funk', 2, undefined)!.band.layers.map((l) => l.id),
    ).toEqual(['drums']);
  });

  it('reads an override without steps as its whole section', () => {
    expect(
      bandIdAt(
        { id: 'x', band: 'a', overrides: [{ section: 'C', band: 'b' }] },
        { section: 'C', stepNumber: 9 },
      ),
    ).toBe('b');
  });
});

describe('a layer', () => {
  it('leaves a muted layer out, and keeps it for the editor on asking', () => {
    const band: Band = {
      id: 'b',
      name: 'b',
      status: 'live',
      timeSignature: [4, 4],
      tempo: 96,
      layers: [
        {
          id: 'drums',
          name: 'Drums',
          instrument: 'drums',
          source: { kind: 'groove', id: 'groove_funk_03' },
          muted: true,
        },
      ],
    };
    const ctx = { chordAt, bars: 1, timeSignature: [4, 4] as [number, number] };
    expect(realizeBand(bandVariation(band), ALL_ITEMS, ctx)).toEqual([]);
    expect(
      realizeBand(bandVariation(band), ALL_ITEMS, ctx, { includeMuted: true }),
    ).toHaveLength(1);
  });

  it('is skipped when its item is gone', () => {
    const band: Band = {
      id: 'b',
      name: 'b',
      status: 'live',
      timeSignature: [4, 4],
      tempo: 96,
      layers: [
        {
          id: 'x',
          name: 'X',
          instrument: 'keys',
          source: { kind: 'comping', id: 'no-such-pattern' },
        },
      ],
    };
    expect(
      realizeBand(bandVariation(band), ALL_ITEMS, {
        chordAt,
        bars: 1,
        timeSignature: [4, 4],
      }),
    ).toEqual([]);
  });
});
