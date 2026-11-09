import { StudioRoutes } from '@/constants/routes';

/**
 * The editor link that opens a song's chart as a new Studio project:
 * `/studio?song=<id>[&transpose=<n>]`. The editor opens it
 * (openSession's 'song' intent): it keeps the work it replaces, looks the
 * song up and seeds `transposeSong(song, n)`, the same chart the Song page
 * shows for that transposition.
 *
 * `transpose` is the Song page's semitone offset, passed through as an
 * integer from −11 to 11 (anything else is folded into that range; a whole
 * octave is no transposition). 0 leaves the key out.
 *
 * No imports beyond the route table: every Song surface loads this.
 */
/**
 * The editor link that opens a library chord progression as a new project
 * (openSession's 'progression' intent, `progressionChart`): in C, or in the
 * key it was heard in, `relative` when the match read a minor song from its
 * relative major. With `songId`, the project takes that song's tempo and
 * credits it ("as heard in").
 */
export function studioProgressionUrl(
  progressionId: number,
  heard: {
    key?: string;
    relative?: boolean;
    songId?: string;
    section?: string;
  } = {},
): string {
  const params = new URLSearchParams({ progression: String(progressionId) });
  if (heard.key) params.set('progressionKey', heard.key);
  if (heard.relative) params.set('progressionRelative', '1');
  if (heard.songId) params.set('progressionSong', heard.songId);
  if (heard.section) params.set('progressionSection', heard.section);
  return `${StudioRoutes.editor.definition}?${params}`;
}

export function studioSongUrl(songId: string, transpose = 0): string {
  const base = `${StudioRoutes.editor.definition}?song=${encodeURIComponent(songId)}`;
  const steps = Number.isFinite(transpose) ? Math.trunc(transpose) % 12 : 0;
  return steps === 0 ? base : `${base}&transpose=${steps}`;
}
