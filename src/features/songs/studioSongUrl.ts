import { StudioRoutes } from '@/constants/routes';

/**
 * The editor link that opens a song's chart as a new Studio project:
 * `/studio/editor?song=<id>[&transpose=<n>]`. The editor opens it
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
export function studioSongUrl(songId: string, transpose = 0): string {
  const base = `${StudioRoutes.editor.definition}?song=${encodeURIComponent(songId)}`;
  const steps = Number.isFinite(transpose) ? Math.trunc(transpose) % 12 : 0;
  return steps === 0 ? base : `${base}&transpose=${steps}`;
}
