import { describe, expect, it } from 'vitest';
import { listBassLines } from '../../bassLines/registry';
import { listCompings } from '../../chordComping/registry';
import {
  listDesignedGrooves,
  loadStudioGrooves,
} from '../../drumGrooves/registry';
import { listParts } from '../../parts/registry';
import {
  familyOf,
  PLAYER_ID_PATTERN,
  type Player,
  withItem,
  withoutItem,
  withVersion,
} from '../player';
import { listPlayers, playerOf } from '../registry';

/**
 * The players as filed: every groove, bass line, comping pattern and part the
 * repo has belongs to one player at most, and nothing filed is missing.
 */

const key = (kind: string, id: string) => `${kind}:${id}`;

/** The player instrument a part's instrument is played by. */
const PART_INSTRUMENT: Record<string, string> = {
  piano: 'keys',
  bass: 'bass',
  guitar: 'guitar',
  drums: 'drums',
};

describe('the players', () => {
  it('are well formed, one per id', () => {
    const players = listPlayers();
    expect(players.length).toBeGreaterThan(0);
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    for (const p of players) {
      expect(p.id).toMatch(PLAYER_ID_PATTERN);
      expect(p.kind).toBe('placeholder');
    }
  });

  it('file every item at most once, and only items that exist', async () => {
    const studio = await loadStudioGrooves();
    const exists = new Set([
      ...[...listDesignedGrooves(), ...studio].map((g) => key('groove', g.id)),
      ...listBassLines().map((l) => key('bassLine', l.id)),
      ...listCompings().map((c) => key('comping', c.id)),
      ...listParts().map((p) => key('part', p.id)),
    ]);
    const filed = listPlayers().flatMap((p) =>
      p.items.map((i) => key(i.kind, i.id)),
    );
    expect(filed.length).toBe(new Set(filed).size);
    expect(filed.filter((k) => !exists.has(k))).toEqual([]);
  });

  it('start with every item filed under a player of its instrument', async () => {
    const studio = await loadStudioGrooves();
    const unfiled = [
      ...[...listDesignedGrooves(), ...studio].map((g) => ({
        kind: 'groove' as const,
        id: g.id,
        instrument: 'drums',
      })),
      ...listBassLines().map((l) => ({
        kind: 'bassLine' as const,
        id: l.id,
        instrument: 'bass',
      })),
      ...listCompings().map((c) => ({
        kind: 'comping' as const,
        id: c.id,
        instrument: 'keys',
      })),
      ...listParts().map((p) => ({
        kind: 'part' as const,
        id: p.id,
        instrument: PART_INSTRUMENT[p.instrument],
      })),
    ].filter((item) => playerOf(item)?.instrument !== item.instrument);
    expect(unfiled).toEqual([]);
  });

  it('take an item once, and let it go', () => {
    const p = listPlayers()[0];
    const item = { kind: 'part' as const, id: 'x' };
    expect(withItem(withItem(p, item), item).items).toHaveLength(
      p.items.length + 1,
    );
    expect(withoutItem(withItem(p, item), item).items).toEqual(p.items);
  });
});

/**
 * A player's parts by idea: a take is filed as a version in one family at
 * most — the band take, a teaching version, or both — for the levels it fits.
 */
describe('a part family', () => {
  const bare: Player = {
    id: 'latin-pianist-9',
    name: 'Latin-Pianist-9',
    instrument: 'keys',
    kind: 'placeholder',
    items: [],
  };
  const band = { part: 'take-1', use: 'band' as const, levels: [1] };
  const easy = { part: 'take-2', use: 'teaching' as const, levels: [1, 2] };
  const comp = withVersion(
    bare,
    { name: 'Cumbia offbeat comp', style: 'latin-cumbia' },
    band,
  );

  it('starts from a take, named and styled, and owns the part', () => {
    expect(comp.families).toEqual([
      {
        id: 'cumbia-offbeat-comp',
        name: 'Cumbia offbeat comp',
        style: 'latin-cumbia',
        versions: [band],
      },
    ]);
    expect(comp.items).toEqual([{ kind: 'part', id: 'take-1' }]);
  });

  it('takes more versions, each across the levels it fits', () => {
    const two = withVersion(comp, { id: 'cumbia-offbeat-comp' }, easy);
    expect(two.families?.[0].versions).toEqual([band, easy]);
    expect(familyOf(two, 'take-2')?.id).toBe('cumbia-offbeat-comp');
  });

  it('changes a version where it is, and keeps the family’s name', () => {
    const again = withVersion(
      comp,
      { id: 'cumbia-offbeat-comp' },
      { ...band, use: 'both' },
    );
    expect(again.families).toEqual([
      { ...comp.families![0], versions: [{ ...band, use: 'both' }] },
    ]);
  });

  it('holds a part in one family at most', () => {
    const moved = withVersion(comp, { name: 'Cumbia montuno' }, band);
    expect(moved.families?.map((f) => f.id)).toEqual(['cumbia-montuno']);
  });

  it('lets a part go with the item, and an empty family with it', () => {
    const gone = withoutItem(comp, { kind: 'part', id: 'take-1' });
    expect(gone.items).toEqual([]);
    expect(gone.families).toBeUndefined();
  });

  it('gives a second family of the same name an id of its own', () => {
    const twin = withVersion(comp, { name: 'Cumbia offbeat comp' }, easy);
    expect(twin.families?.map((f) => f.id)).toEqual([
      'cumbia-offbeat-comp',
      'cumbia-offbeat-comp-2',
    ]);
  });
});
