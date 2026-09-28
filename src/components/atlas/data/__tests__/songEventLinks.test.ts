import { describe, expect, it } from 'vitest';
import { SONG_LIBRARY_EVENTS } from '@/components/atlas/data/events/songLibrary';
import { GENRES } from '@/content/graph/genres';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Every song's "Open in Globe" must land somewhere.
 *
 * `useSongActions.openInGlobe` navigates to `/atlas/globe?event=song-<id>`, and
 * `useAtlasUrlSync` resolves that with
 * `MUSIC_HISTORY.find((e) => e.id === stop.eventId)` guarded by `if (event)`.
 * So a song whose event is missing does not error — the globe opens and sits
 * there. Silent, and invisible to anyone not clicking that exact song.
 *
 * That is how 11 of them broke: songs were re-slugged with an artist suffix
 * (`youve_got_a_friend` → `youve_got_a_friend_king`) and their events kept the
 * old id. The same regeneration left 73 dangling links in eventConnections.ts,
 * which is why that file now has its own guard. This is the song half.
 */

const songModules = import.meta.glob<Record<string, unknown>>(
  '../../../../curriculum/data/songs/*.ts',
  { eager: true },
);

const songs: Song[] = Object.entries(songModules)
  .filter(([path]) => !/\/(index|bundled)\.ts$/.test(path))
  .flatMap(([, mod]) =>
    Object.values(mod).filter(
      (v): v is Song =>
        typeof v === 'object' &&
        v !== null &&
        'sections' in v &&
        'keyRoot' in v,
    ),
  );

const eventIds = new Set(SONG_LIBRARY_EVENTS.map((e) => e.id));

/**
 * Songs knowingly without an event of their own, and why.
 *
 * `hard_to_handle_black_crowes` is the same Black Crowes recording as
 * `hard_to_handle`, charted a half step lower — two charts of one record, which
 * song-key-review.md flags for merging. Giving it its own globe event would put
 * that record on the map twice, which is worse than the dead link.
 */
const KNOWN_WITHOUT_EVENT = new Set(['hard_to_handle_black_crowes']);

/**
 * Song events with no song of their own.
 *
 * `song-valerie_bbc_live_version` is Amy Winehouse's BBC live version — a real
 * historical event with three influence links pointing at it, but no chart in
 * the library. It stays, which means the lead-sheet button on the globe must
 * not assume every `song-` event has somewhere to go.
 */
const KNOWN_WITHOUT_SONG = new Set(['song-valerie_bbc_live_version']);

describe('song → globe event links', () => {
  it('loads both sides', () => {
    expect(songs.length).toBeGreaterThan(600);
    expect(SONG_LIBRARY_EVENTS.length).toBeGreaterThan(600);
  });

  it('gives every song an event to open', () => {
    const broken = songs
      .filter(
        (s) => !KNOWN_WITHOUT_EVENT.has(s.id) && !eventIds.has(`song-${s.id}`),
      )
      .map((s) => `${s.id} → song-${s.id} does not exist`);
    expect(broken).toEqual([]);
  });

  it('keeps the exception list honest', () => {
    // An id listed here that HAS an event means the exception is stale.
    const stale = [...KNOWN_WITHOUT_EVENT].filter((id) =>
      eventIds.has(`song-${id}`),
    );
    expect(stale).toEqual([]);
  });

  it('gives every song event a song to open', () => {
    // The other direction: the globe's lead-sheet button turns `song-<id>`
    // back into a chart link, so an event whose song does not exist would
    // offer a button that goes nowhere.
    const ids = new Set(songs.map((s) => s.id));
    const orphans = SONG_LIBRARY_EVENTS.filter(
      (e) =>
        !KNOWN_WITHOUT_SONG.has(e.id) && !ids.has(e.id.replace(/^song-/, '')),
    ).map((e) => e.id);
    expect(orphans).toEqual([]);
  });

  it('gives every song event a unique id', () => {
    const ids = SONG_LIBRARY_EVENTS.map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('shows the genres the song actually carries', () => {
    // A song event's genre is DERIVED from the song's genreTags. It drifted
    // once already: genreTags were normalised to the canonical set and the
    // events kept the old vocabulary, so 430 of them still read 'Straight
    // Eighth Funk' and 'Classic Rock' while their songs said 'funk' and
    // 'rock'. Prince's 1999 is how it surfaced — one wrong pill on the globe.
    const name = new Map(GENRES.map((g) => [g.id, g.name]));
    const tagToId = (tag: string) => (tag === 'hip-hop' ? 'hip-hop' : tag);
    const byId = new Map(songs.map((s) => [s.id, s]));
    const drifted: string[] = [];
    for (const event of SONG_LIBRARY_EVENTS) {
      const song = byId.get(event.id.replace(/^song-/, ''));
      if (!song) continue;
      const want = (song.genreTags ?? [])
        .map((t) => name.get(tagToId(t)))
        .filter(Boolean);
      if (want.length && want.join('|') !== event.genre.join('|'))
        drifted.push(
          `${event.id}: event [${event.genre}] vs song [${want.join(', ')}]`,
        );
    }
    expect(drifted).toEqual([]);
  });

  it('titles every song event so the artist index can read it', () => {
    // artists.ts derives the artist from `Work — Artist`; a song event without
    // that dash drops its artist out of the globe's index entirely.
    const untitled = SONG_LIBRARY_EVENTS.filter(
      (e) => !e.title.includes('—'),
    ).map((e) => `${e.id}: ${e.title}`);
    expect(untitled).toEqual([]);
  });
});
