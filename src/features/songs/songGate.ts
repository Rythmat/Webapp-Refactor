import { createContext, useContext } from 'react';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * A song's light (owner, 2026-11-12), the gate a chart passes before
 * students use it.
 *
 * Green: the chart is ready, and students open it. Red (`Song.comingSoon`):
 * not ready yet. The app still lists a red song, greyed out and marked
 * Coming soon, so everyone sees how big the library is, but it does not
 * open it: not its card, its row, nor its page by a link from elsewhere.
 *
 * The back office sets it on the chart (the song editor's light) and shows
 * it on every song in the Songs library, filterable (`?light=`).
 */
export type SongLight = 'green' | 'red';

type Gated = Pick<Song, 'comingSoon'>;

export const songLight = (song: Gated): SongLight =>
  song.comingSoon ? 'red' : 'green';

/** Whether students open this song: its light is green. */
export const isSongOpen = (song: Gated): boolean => !song.comingSoon;

/** The open songs first, then the Coming soon ones, each in its order. */
export const openFirst = <T extends Gated>(songs: readonly T[]): T[] => [
  ...songs.filter(isSongOpen),
  ...songs.filter((song) => !isSongOpen(song)),
];

/**
 * The console's view of the gate. The console's mirror of the app sets it:
 * there every song shows its light and opens, red ones included, so a chart
 * that is not ready can still be read and fixed. The app never sets it, so
 * there a red song is Coming soon.
 */
export const SongLightsContext = createContext(false);

export const useSongLights = (): boolean => useContext(SongLightsContext);

export type LightFilter = 'all' | SongLight;

/** The Songs library's light filter (console only), as `?light=` holds it. */
export const LIGHT_OPTIONS: readonly { value: LightFilter; label: string }[] = [
  { value: 'all', label: 'All lights' },
  { value: 'green', label: 'Green: ready' },
  { value: 'red', label: 'Red: coming soon' },
];

export const lightFilterOf = (word: string | null): LightFilter =>
  word === 'green' || word === 'red' ? word : 'all';

/** Whether a song passes the light filter. */
export const matchesLight = (song: Gated, filter: LightFilter): boolean =>
  filter === 'all' || songLight(song) === filter;
