/**
 * Song events whose song goes by another id.
 *
 * A song's globe event is `song-<songId>`, so the chart it was made from is
 * its id without the prefix and nothing needs looking up — which matters,
 * because the globe only hydrates its events, and reading the song library to
 * find a chart would mean pulling a 3.3MB bundle. The exception is a second
 * recording or performance of a song the library already charts: it keeps its
 * own pin and its own video on the globe, but it is that song, so its
 * lead-sheet button opens that chart and the console's graph folds it onto
 * that song's node, influence arcs and all.
 *
 * `song-valerie_bbc_live_version` is Amy Winehouse's BBC live performance of
 * `valerie`, the chart of her recording with Mark Ronson (the owner's call,
 * 30 Sep 2026).
 *
 * Keyed by the event's id, to the song's id. It imports nothing, so the globe,
 * the console and the pure graph modules can all read it.
 * `songEventLinks.test.ts` holds every alias to a real song, and fails one
 * whose event's own id already names a song.
 */
export const SONG_EVENT_ALIASES: ReadonlyMap<string, string> = new Map([
  ['song-valerie_bbc_live_version', 'valerie'],
]);

/**
 * The song a globe event is: its alias when it has one, otherwise its id
 * without `song-`. Null for an event that is not a song's (`evt-…`).
 */
export function songIdForEvent(eventId: string): string | null {
  if (!eventId.startsWith('song-')) return null;
  return SONG_EVENT_ALIASES.get(eventId) ?? eventId.slice('song-'.length);
}
