import { beforeAll, describe, expect, it } from 'vitest';
import { ensureAtlasContent, MUSIC_HISTORY } from '@/content/contentStore';
import {
  getArtist,
  getArtistsForEvent,
  getAtlasArtists,
  getEventsForArtist,
  normalizeArtistName,
} from './artists';

const HYDRATION_TIMEOUT = 60_000;

describe('atlas artist index', () => {
  beforeAll(async () => {
    await ensureAtlasContent();
  }, HYDRATION_TIMEOUT);

  it('indexes a meaningful share of the catalogue', () => {
    expect(getAtlasArtists().length).toBeGreaterThan(500);
  });

  it('resolves Wes Montgomery from Indianapolis to his own events', () => {
    const wes = getArtist('Wes Montgomery');
    expect(wes?.slug).toBe('wes-montgomery');

    const events = getEventsForArtist('wes-montgomery');
    expect(events.length).toBeGreaterThan(0);
    // Chronological, so the panel reads as a career rather than a shuffle.
    const years = events.map((e) => e.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it('matches names whose tags are accent-folded', () => {
    // The tag is `cesaria evora`; the title is `Cesária Évora`. Matching on the
    // raw strings drops most of the non-Anglophone catalogue.
    expect(normalizeArtistName('Cesária Évora')).toBe('cesaria evora');
    expect(getArtist('Ali Farka Touré')).not.toBeNull();
    expect(getArtist('Youssou N’Dour')).not.toBeNull();
  });

  it('excludes labels, platforms, and places', () => {
    for (const notAnArtist of [
      'Spotify',
      'Chess Records',
      'SXSW',
      'New Orleans',
      'Jazz',
    ]) {
      expect(getArtist(notAnArtist)).toBeNull();
    }
  });

  it('gives an event chips drawn only from its own tags', () => {
    const bebop = MUSIC_HISTORY.find((e) => e.id === 'evt-bebop-nyc-1945');
    expect(bebop).toBeDefined();
    const names = getArtistsForEvent(bebop!).map((a) => a.name);
    expect(names).toContain('Charlie Parker');
    expect(names).toContain('Dizzy Gillespie');
    expect(names).not.toContain('Wes Montgomery');
  });

  it('never returns an artist whose events do not exist', () => {
    const ids = new Set(MUSIC_HISTORY.map((e) => e.id));
    const orphaned = getAtlasArtists().filter((a) =>
      a.eventIds.some((id) => !ids.has(id)),
    );
    expect(orphaned).toEqual([]);
  });
});
