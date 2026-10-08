import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import {
  getArtist,
  getArtistsForEvent,
  getAtlasArtists,
} from '@/components/atlas/data/artists';
import { ensureAtlasContent, MUSIC_HISTORY } from '@/content/contentStore';

/**
 * Characterization of the globe's artist index, pinned BEFORE its matching
 * logic moves into the pure graph module `content/graph/eventMatches.ts`
 * (design Amendment 5, C1), so the console's graph and the globe run the same
 * matcher.
 *
 * That move promises students nothing changes: the same artists, the same
 * events under each, in the same order, and the same chips on every event
 * card. This file is how the promise is checked. The whole index is pinned by
 * hash, over the real registry and the bundled events (tests have no CDN, so
 * hydration takes the bundled fallback); a few readable checks sit beside it
 * so a failure says roughly what moved before anyone diffs a hash.
 *
 * A change to the registry or the event data changes these hashes too. That is
 * expected: re-pin them in the same change, and say why in its description.
 *
 * Re-pinned 30 Sep 2026 for the owner-requested duplicate merge: 23 registry
 * entries (the ten acts held with and without "The", eleven misspellings,
 * "CCR" and Rufus's "Rufus and Chaka Khan" billing) were removed and their
 * tags, titles and song billings moved to the kept name. So was "Remind In
 * Light", the album title Remain in Light read as an artist; its song is by
 * Talking Heads. The misspelt alias "Andy Grammar" went too, which changes
 * only the name table, and "Christina, Aguilera, Lil’ Kim, Mya, Pink" lost
 * its stray comma. The index went from 877 artists to 858 (24 gone; Jimi
 * Hendrix, Eurythmics, Gladys Knight and the Pips, Lee Ann Womack and Redbone,
 * registered but named by no event until now, joined it), and 34 event cards
 * changed chips: 33 from a removed name to the act kept, and Lady Marmalade's
 * to the name without the comma. Every other artist, event list and chip is
 * unchanged.
 */

const HYDRATION_TIMEOUT = 60_000;

const sha = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

beforeAll(async () => {
  await ensureAtlasContent();
}, HYDRATION_TIMEOUT);

describe('the globe artist index', () => {
  it('lists the same artists, with the same events in the same order', () => {
    const index = getAtlasArtists().map((a) => [a.name, a.slug, a.eventIds]);
    expect(index).toHaveLength(858);
    expect(sha(index)).toBe(
      '1c19d9bfbf4ab54e09a4d1df9b03f263d7040ddaec255afc4790f9251e2bfa4a',
    );
  });

  it('puts the same chips on every event card', () => {
    const chips = MUSIC_HISTORY.map((event) => [
      event.id,
      getArtistsForEvent(event).map((a) => [a.name, a.slug]),
    ]);
    expect(MUSIC_HISTORY).toHaveLength(1725);
    expect(sha(chips)).toBe(
      'da85741b57346334e77b7d830070c2c67a55f22a9fb0ccbc98d0343481748f48',
    );
  });

  it('resolves the same names, aliases and tags to the same artists', () => {
    // `getArtist` reads the index's own name table, which the refactor also
    // moves; the artist panel, the timeline and the tour stops go through it.
    const names = [
      ...ARTIST_REGISTRY.flatMap((a) => [a.name, a.slug, ...(a.aliases ?? [])]),
      ...MUSIC_HISTORY.flatMap((e) => e.tags),
    ];
    const resolved = [...new Set(names)]
      .sort()
      .map((name) => [name, getArtist(name)?.slug ?? null]);
    expect(sha(resolved)).toBe(
      '858e516b8a45ee04199a03c77662aef03c1c3ff924f5a7c33d34408b68411ee7',
    );
  });
});

describe('spot checks', () => {
  const byId = (id: string) => {
    const event = MUSIC_HISTORY.find((e) => e.id === id);
    if (!event) throw new Error(`no event ${id}`);
    return event;
  };
  const chipsOf = (id: string) =>
    getArtistsForEvent(byId(id)).map((a) => a.slug);

  it('reads a song event’s artist from its title', () => {
    expect(chipsOf('song-africa')).toEqual(['toto']);
  });

  it('reads a hand-authored event’s artists from its tags', () => {
    expect(chipsOf('evt-bebop-nyc-1945')).toEqual([
      'charlie-parker',
      'dizzy-gillespie',
    ]);
  });

  it('lists an artist’s events earliest first', () => {
    expect(getArtist('Wes Montgomery')?.eventIds).toEqual([
      'evt-wesmontgomery-indianapolis-1955',
      'evt-jazz-wes-montgomery-indianapolis-1960',
    ]);
  });

  it('puts an event about the artist ahead of one that only tags them in the same year', () => {
    // The psychedelic event comes first in the data and only tags her; the
    // index has always listed the one whose title opens on her first.
    expect(getArtist('Janis Joplin')?.eventIds).toEqual([
      'evt-janis-joplin-sf-1967',
      'evt-psychedelic-sf-1967',
    ]);
  });

  it('keeps places and genres out', () => {
    expect(getArtist('Chicago')).toBeNull();
    expect(getArtist('Jazz')).toBeNull();
  });
});
