import type { Song } from '@/curriculum/types/songLibrary';
import { popularSongs } from '@/features/explore/exploreShelves';

/** Why a song is in Home's Songs column. */
export type HomeSongWhy = 'saved' | 'back' | 'picked' | 'popular';

/**
 * The Songs column's songs, in the order the Arcade's are (owner,
 * 2026-11-11): the ones the student came back to (saved or opened, newest
 * first), then the ones picked for them (songsFor), then the best known.
 * Each song once; songs the library doesn't hold (any more) are left out.
 */
export function homeSongs({
  songs,
  savedAt,
  viewedAt,
  picked,
  limit,
}: {
  songs: readonly Song[];
  /** When each saved song was saved, by id. */
  savedAt: Readonly<Record<string, number>>;
  /** When each song was last opened, by id. */
  viewedAt: Readonly<Record<string, number>>;
  /** Picked for the student, best first. */
  picked: readonly Song[];
  limit: number;
}): { song: Song; why: HomeSongWhy }[] {
  const byId = new Map(songs.map((s) => [s.id, s]));
  const out: { song: Song; why: HomeSongWhy }[] = [];
  const add = (song: Song | undefined, why: HomeSongWhy) => {
    if (!song || out.length >= limit) return;
    if (out.some((row) => row.song.id === song.id)) return;
    out.push({ song, why });
  };

  const touched = new Map<string, number>();
  for (const [id, at] of [
    ...Object.entries(savedAt),
    ...Object.entries(viewedAt),
  ]) {
    touched.set(id, Math.max(at, touched.get(id) ?? 0));
  }
  [...touched.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([id]) => add(byId.get(id), id in savedAt ? 'saved' : 'back'));
  for (const song of picked) add(byId.get(song.id), 'picked');
  for (const song of popularSongs(songs, limit * 2)) add(song, 'popular');
  return out;
}
