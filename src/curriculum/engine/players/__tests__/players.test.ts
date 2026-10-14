import { describe, expect, it } from 'vitest';
import { listBassLines } from '../../bassLines/registry';
import { listCompings } from '../../chordComping/registry';
import {
  listDesignedGrooves,
  loadStudioGrooves,
} from '../../drumGrooves/registry';
import { listParts } from '../../parts/registry';
import { PLAYER_ID_PATTERN, withItem, withoutItem } from '../player';
import { listPlayers, playerOf } from '../registry';

/**
 * The players as filed: every groove, bass line, comping pattern and part the
 * repo has belongs to one player at most, and nothing filed is missing.
 */

const key = (kind: string, id: string) => `${kind}:${id}`;

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
