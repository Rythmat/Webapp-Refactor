/**
 * "Fits your song" is the library browser's opening shelf (milestone 2.14):
 * up to five picks for what the song is missing. These tests are written from
 * the 15c contract, not from the module.
 *
 * The missing roles are read in the order drums, bass, chords. The first
 * missing role takes at most three picks, the second at most two, and the
 * rest of the missing roles fill what is left. Drums are grooves plus at
 * most one kit; bass and chords are parts with that role. Each candidate is
 * scored: +2 for a tempo within 5 % of the song's, +1 within 15 %; +2 when
 * the part fits the song's key once moved (with no song key every part gets
 * +1 instead); +0.5 for level 1, +0.25 for level 2; +0.5 for a favourite.
 * Higher scores come first, then names. A song with nothing missing gets the
 * best five parts and grooves.
 */
import { describe, expect, it } from 'vitest';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { moveForSong, type SongKey } from '../partInSong';
import {
  fitsYourSong,
  type FitItem,
  type SongContext,
  type SongRoles,
} from '../songFit';

const fit = (id: string, patch: Partial<FitItem> = {}): FitItem => ({
  id,
  type: 'part',
  instrument: null,
  genre: null,
  tags: [],
  search: id,
  name: id,
  bpm: null,
  role: null,
  level: null,
  keyFits: null,
  ...patch,
});

const bass = (name: string, patch: Partial<FitItem> = {}) =>
  fit(`part:${name}`, {
    name,
    instrument: 'bass',
    role: 'bass',
    keyFits: false,
    ...patch,
  });
const chords = (name: string, patch: Partial<FitItem> = {}) =>
  fit(`part:${name}`, {
    name,
    instrument: 'keys',
    role: 'chords',
    keyFits: false,
    ...patch,
  });
const groove = (name: string, patch: Partial<FitItem> = {}) =>
  fit(`groove:${name}`, {
    name,
    type: 'groove',
    instrument: 'drums',
    role: 'drums',
    ...patch,
  });
const kit = (name: string, patch: Partial<FitItem> = {}) =>
  fit(`kit:${name}`, {
    name,
    type: 'kit',
    instrument: 'drums',
    role: 'drums',
    ...patch,
  });

const C_IONIAN: SongKey = { rootPc: 0, mode: 'ionian' };
/** The contract's three fields; anything the module adds is left unset. */
type ContractContext = Pick<SongContext, 'key' | 'bpm' | 'roles'>;
const ctx = (
  roles: Partial<SongRoles>,
  patch: Partial<ContractContext> = {},
): SongContext =>
  ({
    key: C_IONIAN,
    bpm: 100,
    roles: { drums: false, bass: false, chords: false, ...roles },
    ...patch,
  }) as SongContext;
const ALL_THERE = { drums: true, bass: true, chords: true };
const NONE = new Set<string>();
const ids = (xs: readonly { id: string }[]) => xs.map((x) => x.id);
const sortedIds = (xs: readonly { id: string }[]) => ids(xs).sort();

/** The contract's score, written out, for checking picks over real data. */
function score(
  item: FitItem,
  c: SongContext,
  favourites: ReadonlySet<string>,
): number {
  let s = 0;
  if (item.bpm != null) {
    const off = Math.abs(item.bpm - c.bpm) / c.bpm;
    if (off <= 0.05) s += 2;
    else if (off <= 0.15) s += 1;
  }
  if (item.type === 'part') {
    if (c.key == null) s += 1;
    else if (item.keyFits === true) s += 2;
  }
  if (item.level === 1) s += 0.5;
  else if (item.level === 2) s += 0.25;
  if (favourites.has(item.id)) s += 0.5;
  return s;
}

describe('fitsYourSong: what is missing', () => {
  it('lists the missing roles in the order drums, bass, chords', () => {
    expect(fitsYourSong([], ctx({}), NONE).missing).toEqual([
      'drums',
      'bass',
      'chords',
    ]);
    expect(fitsYourSong([], ctx({ drums: true }), NONE).missing).toEqual([
      'bass',
      'chords',
    ]);
    expect(fitsYourSong([], ctx({ bass: true }), NONE).missing).toEqual([
      'drums',
      'chords',
    ]);
    expect(
      fitsYourSong([], ctx({ drums: true, bass: true }), NONE).missing,
    ).toEqual(['chords']);
    expect(fitsYourSong([], ctx(ALL_THERE), NONE).missing).toEqual([]);
  });

  it('gives no picks from an empty library', () => {
    expect(fitsYourSong([], ctx({}), NONE).picks).toEqual([]);
    expect(fitsYourSong([], ctx(ALL_THERE), NONE).picks).toEqual([]);
  });
});

describe('fitsYourSong: scoring', () => {
  it('ranks by tempo, key fit, level and favourite', () => {
    // Only bass is missing; three bass parts, so all three are picked.
    const items = [
      bass('Mid bass', { bpm: 100, keyFits: false, level: 1 }), // 2 + 0.5 + 0.5 ♡ = 3
      bass('Alpha bass', { bpm: 110, keyFits: true, level: 1 }), // 1 + 2 + 0.5 = 3.5
      bass('Zed bass', { bpm: 100, keyFits: true }), // 2 + 2 = 4
      chords('Chords', { bpm: 100, keyFits: true }),
      groove('Groove', { bpm: 100 }),
    ];
    const { missing, picks } = fitsYourSong(
      items,
      ctx({ drums: true, chords: true }),
      new Set(['part:Mid bass']),
    );
    expect(missing).toEqual(['bass']);
    expect(ids(picks)).toEqual([
      'part:Zed bass',
      'part:Alpha bass',
      'part:Mid bass',
    ]);
  });

  it('gives +2 within 5 % of the song’s tempo and +1 within 15 %, either side', () => {
    const roles = { drums: true, chords: true };
    expect(
      ids(
        fitsYourSong(
          [
            bass('A', { bpm: 130 }), // 30 % off: 0
            bass('B', { bpm: 113 }), // 13 %: +1
            bass('C', { bpm: 96 }), // 4 %: +2
          ],
          ctx(roles),
          NONE,
        ).picks,
      ),
    ).toEqual(['part:C', 'part:B', 'part:A']);
    expect(
      ids(
        fitsYourSong(
          [
            bass('A', { bpm: null }), // no tempo: 0
            bass('B', { bpm: 87 }), // 13 % slow: +1
            bass('C', { bpm: 104 }), // 4 % fast: +2
          ],
          ctx(roles),
          NONE,
        ).picks,
      ),
    ).toEqual(['part:C', 'part:B', 'part:A']);
  });

  it('gives level 1 more than level 2, and level 3 nothing', () => {
    const picks = fitsYourSong(
      [
        bass('A', { level: 3 }),
        bass('B', { level: 2 }),
        bass('C', { level: 1 }),
      ],
      ctx({ drums: true, chords: true }),
      NONE,
    ).picks;
    expect(ids(picks)).toEqual(['part:C', 'part:B', 'part:A']);
  });

  it('breaks ties by name', () => {
    const picks = fitsYourSong(
      [
        bass('Charlie', { bpm: 100 }),
        bass('Alpha', { bpm: 100 }),
        bass('Bravo', { bpm: 100 }),
      ],
      ctx({ drums: true, chords: true }),
      NONE,
    ).picks;
    expect(ids(picks)).toEqual(['part:Alpha', 'part:Bravo', 'part:Charlie']);
  });

  it('with no song key gives every part +1 and ignores keyFits', () => {
    // Alpha groove: +1 tempo, +0.5 ♡ = 1.5. Both parts: +1 (no key) only.
    // Were keyFits still worth +2, Zed part would lead.
    const items = [
      fit('part:zed', {
        name: 'Zed part',
        bpm: 200,
        keyFits: true,
        role: 'melody',
      }),
      fit('part:yak', {
        name: 'Yak part',
        bpm: 200,
        keyFits: false,
        role: 'melody',
      }),
      groove('Alpha groove', { bpm: 110 }),
    ];
    const { missing, picks } = fitsYourSong(
      items,
      ctx(ALL_THERE, { key: null }),
      new Set(['groove:Alpha groove']),
    );
    expect(missing).toEqual([]);
    expect(ids(picks)).toEqual(['groove:Alpha groove', 'part:yak', 'part:zed']);
  });
});

describe('fitsYourSong: candidates per role', () => {
  it('drums are grooves plus at most one kit', () => {
    const items = [
      groove('Boom bap', { bpm: 100 }), // 2
      kit('Zulu kit'), // the first kit; ♡ 0.5
      kit('Alpha kit'),
      kit('Mike kit'),
      groove('Trap', { bpm: 140 }), // 0
      bass('Bass', { bpm: 100, keyFits: true }),
    ];
    const { missing, picks } = fitsYourSong(
      items,
      ctx({ bass: true, chords: true }),
      new Set(['kit:Zulu kit']),
    );
    expect(missing).toEqual(['drums']);
    expect(picks.filter((p) => p.type === 'kit')).toHaveLength(1);
    expect(ids(picks)).toEqual([
      'groove:Boom bap',
      'kit:Zulu kit',
      'groove:Trap',
    ]);
  });

  it('bass and chords are parts with that role only', () => {
    const items = [
      bass('Bass line', { bpm: 100 }),
      chords('Comping', { bpm: 100 }),
      fit('part:melody', {
        name: 'Melody',
        role: 'melody',
        bpm: 100,
        keyFits: true,
        level: 1,
      }),
      fit('part:no-role', {
        name: 'No role',
        role: null,
        bpm: 100,
        keyFits: true,
        level: 1,
      }),
      fit('preset:oracle:Bass', {
        name: 'Bass preset',
        type: 'preset',
        role: 'bass',
      }),
      fit('template:x', { name: 'Template', type: 'template', role: 'chords' }),
      groove('Groove', { bpm: 100 }),
      kit('Kit'),
    ];
    const { picks } = fitsYourSong(items, ctx({ drums: true }), NONE);
    expect(sortedIds(picks)).toEqual(['part:Bass line', 'part:Comping']);
  });

  it('the first missing role takes three, the second two (chords get none when all three are missing)', () => {
    const items = [
      groove('G1', { bpm: 100 }), // 2
      groove('G2', { bpm: 110 }), // 1
      groove('G3', { bpm: 100 }), // 2
      groove('G4', { bpm: 200 }), // 0
      bass('B1', { bpm: 100, keyFits: true }), // 4
      bass('B2', { bpm: 200 }), // 0
      bass('B3', { bpm: 100 }), // 2
      chords('C1', { bpm: 100, keyFits: true, level: 1 }), // 4.5
      chords('C2', { bpm: 100, keyFits: true }),
      chords('C3', { bpm: 100, keyFits: true }),
    ];
    const { missing, picks } = fitsYourSong(items, ctx({}), NONE);
    expect(missing).toEqual(['drums', 'bass', 'chords']);
    expect(picks).toHaveLength(5);
    expect(sortedIds(picks)).toEqual(
      ['groove:G1', 'groove:G3', 'groove:G2', 'part:B1', 'part:B3'].sort(),
    );
  });

  it('bass then chords when drums are there: three bass, two chords', () => {
    const items = [
      bass('B1', { bpm: 100 }),
      bass('B2', { bpm: 100 }),
      bass('B3', { bpm: 100 }),
      bass('B4', { bpm: 200 }),
      chords('C1', { bpm: 100, keyFits: true }),
      chords('C2', { bpm: 100 }),
      chords('C3', { bpm: 200 }),
    ];
    const { missing, picks } = fitsYourSong(items, ctx({ drums: true }), NONE);
    expect(missing).toEqual(['bass', 'chords']);
    expect(sortedIds(picks)).toEqual(
      ['part:B1', 'part:B2', 'part:B3', 'part:C1', 'part:C2'].sort(),
    );
  });

  it('the rest of the missing roles fill the shelf when the first ones run short', () => {
    const items = [
      groove('Only groove', { bpm: 100 }),
      bass('Only bass', { bpm: 100 }),
      chords('C1', { bpm: 100, keyFits: true, level: 1 }), // 4.5
      chords('C2', { bpm: 100, keyFits: true }), // 4
      chords('C3', { bpm: 110, keyFits: true }), // 3
      chords('C4', { bpm: 200, keyFits: true }), // 2
      chords('C5', { bpm: 200 }), // 0
    ];
    const { picks } = fitsYourSong(items, ctx({}), NONE);
    expect(picks).toHaveLength(5);
    expect(sortedIds(picks)).toEqual(
      [
        'groove:Only groove',
        'part:Only bass',
        'part:C1',
        'part:C2',
        'part:C3',
      ].sort(),
    );
  });

  it('never picks more than five', () => {
    const items = [
      ...['a', 'b', 'c', 'd', 'e', 'f'].map((n) => groove(n, { bpm: 100 })),
      ...['a', 'b', 'c', 'd', 'e', 'f'].map((n) => bass(n, { bpm: 100 })),
      ...['a', 'b', 'c', 'd', 'e', 'f'].map((n) => chords(n, { bpm: 100 })),
      kit('k'),
    ];
    for (const roles of [
      {},
      { drums: true },
      { bass: true },
      { chords: true },
      { drums: true, bass: true },
      ALL_THERE,
    ]) {
      expect(
        fitsYourSong(items, ctx(roles), NONE).picks.length,
      ).toBeLessThanOrEqual(5);
    }
  });
});

describe('fitsYourSong: nothing missing', () => {
  it('shows the best five parts and grooves, never kits, presets or templates', () => {
    const fav = new Set([
      'groove:Groove b',
      'kit:Kit',
      'preset:p',
      'template:t',
    ]);
    const items = [
      fit('part:melody', {
        name: 'Melody',
        role: 'melody',
        bpm: 140,
        keyFits: false,
      }), // 0
      bass('Bass one', { bpm: 100, keyFits: true, level: 1 }), // 4.5
      groove('Groove a', { bpm: 102 }), // 2
      chords('Chords four', { bpm: 112, keyFits: true, level: 2 }), // 3.25
      groove('Groove b', { bpm: 110 }), // 1.5 with ♡
      chords('Chords two', { bpm: 100, keyFits: true }), // 4
      kit('Kit'),
      fit('preset:p', { name: 'Preset', type: 'preset', bpm: 100 }),
      fit('template:t', { name: 'Template', type: 'template', bpm: 100 }),
    ];
    const { missing, picks } = fitsYourSong(items, ctx(ALL_THERE), fav);
    expect(missing).toEqual([]);
    expect(ids(picks)).toEqual([
      'part:Bass one',
      'part:Chords two',
      'part:Chords four',
      'groove:Groove a',
      'groove:Groove b',
    ]);
  });
});

describe('fitsYourSong over the live parts', () => {
  const ROLE: Partial<Record<InstrumentPart['role'], FitItem['role']>> = {
    bassline: 'bass',
    comping: 'chords',
    'two-hand': 'chords',
    melody: 'melody',
  };
  const INSTRUMENT = {
    piano: 'keys',
    bass: 'bass',
    guitar: 'guitar',
    drums: 'drums',
  } as const;
  const SONG = {
    key: C_IONIAN,
    bpm: 90,
    roles: { drums: true, bass: false, chords: false },
  } as SongContext;
  const items: FitItem[] = listLiveParts().map((p) => ({
    id: `part:${p.id}`,
    type: 'part' as const,
    instrument: INSTRUMENT[p.instrument],
    genre: p.genre ?? null,
    tags: p.tags,
    search: p.name.toLowerCase(),
    name: p.name,
    bpm: p.tempo,
    role: ROLE[p.role] ?? null,
    level: p.level,
    keyFits: moveForSong(p, SONG.key).fits,
  }));

  it('picks three bass parts then two chord parts, each the best of its role', () => {
    const { missing, picks } = fitsYourSong(items, SONG, NONE);
    expect(missing).toEqual(['bass', 'chords']);
    const bassPicks = picks.filter((p) => p.role === 'bass');
    const chordPicks = picks.filter((p) => p.role === 'chords');
    expect(bassPicks).toHaveLength(3);
    expect(chordPicks).toHaveLength(2);
    expect(picks).toHaveLength(5);
    for (const [role, chosen] of [
      ['bass', bassPicks],
      ['chords', chordPicks],
    ] as const) {
      const worstChosen = Math.min(...chosen.map((p) => score(p, SONG, NONE)));
      const picked = new Set(chosen.map((p) => p.id));
      for (const other of items) {
        if (other.role !== role || picked.has(other.id)) continue;
        expect(score(other, SONG, NONE), other.id).toBeLessThanOrEqual(
          worstChosen,
        );
      }
    }
  });

  it('with nothing missing picks only parts and grooves, best first', () => {
    const c = { ...SONG, roles: ALL_THERE };
    const { picks } = fitsYourSong(items, c, NONE);
    expect(picks).toHaveLength(5);
    const scores = picks.map((p) => score(p, c, NONE));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    const worst = Math.min(...scores);
    const picked = new Set(ids(picks));
    for (const other of items) {
      if (picked.has(other.id)) continue;
      expect(score(other, c, NONE), other.id).toBeLessThanOrEqual(worst);
    }
  });
});
