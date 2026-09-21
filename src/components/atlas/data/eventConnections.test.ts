import { beforeAll, describe, expect, it } from 'vitest';
import { ensureAtlasContent } from '@/content/contentStore';
import {
  findDanglingConnections,
  getDownstreamChain,
  getUpstreamChain,
} from './eventConnections';

/**
 * Integrity of the influence graph behind the "Influenced by" / "Influenced"
 * pills.
 *
 * A dangling edge is invisible in the UI — the pill is simply never rendered —
 * so the only thing standing between a broken reference and a chain that
 * quietly stops short is this file.
 */
const HYDRATION_TIMEOUT = 60_000;

describe('event connections', () => {
  beforeAll(async () => {
    await ensureAtlasContent();
  }, HYDRATION_TIMEOUT);

  it('references no event that does not exist', () => {
    const dangling = findDanglingConnections();
    // Named in the failure so a broken reference is fixable without a debugger.
    expect(dangling.map((c) => `${c.from} -> ${c.to}`)).toEqual([]);
  });

  it('walks a known chain in both directions', () => {
    // Robert Johnson's Mississippi sessions feed the Memphis blues that fed
    // Elvis at Sun — one of the spines of the American chain.
    const down = getDownstreamChain('evt-blues-mississippi-1936');
    expect(down.map((n) => n.event.id)).toContain('evt-blues-memphis-1951');

    const up = getUpstreamChain('evt-elvis-memphis-1954');
    expect(up.map((n) => n.event.id)).toContain('evt-blues-memphis-1951');
  });
});
