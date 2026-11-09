import { describe, expect, it } from 'vitest';
import { GROOVES, GROOVE_GENRES } from '@/daw/data/groovesLibrary';

// ── The grooves' genres ────────────────────────────────────────────────────
// The drums' Instrument menu lists the grooves by these genres
// (DrumPadsView); four genres once had no grooves at all
// (dock-instruments-11).

describe('GROOVE_GENRES', () => {
  it('lists every genre in the catalog, once, after All', () => {
    const inCatalog = new Set(GROOVES.map((g) => g.genre));
    expect(GROOVE_GENRES[0]).toBe('All');
    expect(new Set(GROOVE_GENRES.slice(1))).toEqual(inCatalog);
    expect(GROOVE_GENRES).toHaveLength(inCatalog.size + 1);
  });
});
