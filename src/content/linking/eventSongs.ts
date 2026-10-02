import {
  appSource,
  createCollector,
  eventMatchesOf,
  firstOfEach,
  isHandAuthored,
  listed,
  makeSuggestion,
} from './plan';
import {
  CONFIDENCE,
  type LinkingInput,
  type Plan,
  type PlanOptions,
} from './types';

/**
 * Event songs: the library songs a hand-authored event is about, offered as
 * its stored `songIds`.
 *
 * The matcher already asks for two things before it names a song: a tag,
 * or a phrase the title quotes, that is the song's title (four characters
 * or more), and the song's artist among the event's own. That is a name and
 * a second signal agreeing, so these are `sure`. As with the artists, the
 * suggestion is the event's whole list (see `eventArtists.ts`).
 */

export interface EventSongsReport {
  /** Hand-authored events read. */
  events: number;
  /** Events the matcher found at least one song for. */
  matched: number;
  /** Event–song pairs across them. */
  pairs: number;
  unreachable: { id: string; reason: string }[];
}

export function planEventSongs(
  input: LinkingInput,
  options: PlanOptions = {},
): Plan<EventSongsReport> {
  const matches = eventMatchesOf(input);
  const songs = new Map((input.songs ?? []).map((song) => [song.id, song]));
  const out = createCollector();
  const report: EventSongsReport = {
    events: 0,
    matched: 0,
    pairs: 0,
    unreachable: out.unreachable,
  };

  for (const event of firstOfEach(input.events, (e) => e?.id)) {
    if (!isHandAuthored(event.id)) continue;
    report.events++;
    const found = matches.get(event.id)?.songs ?? [];
    const paths = new Map<string, string[]>();
    for (const m of found)
      paths.set(m.songId, [...(paths.get(m.songId) ?? []), m.path]);
    if (paths.size === 0) continue;
    const ids = [...paths.keys()];
    const titleOf = (id: string) => songs.get(id)?.title ?? id;
    const byWhom = (id: string) => {
      const artist = songs.get(id)?.artist;
      return artist ? `its artist, ${artist}` : 'its artist';
    };
    const evidence = ids.map(
      (id) =>
        `${
          paths.get(id)!.includes('title')
            ? `the title quotes "${titleOf(id)}"`
            : `a tag is the title "${titleOf(id)}"`
        }, and the event is about ${byWhom(id)}`,
    );
    const read = [...new Set([...paths.values()].flat())]
      .map((path) => (path === 'tags[]' ? 'tags' : 'title'))
      .sort()
      .join(', ');

    out.add(
      makeSuggestion(
        {
          target: { kind: 'globe_event', slug: event.id },
          path: 'songIds',
          op: 'set',
          value: ids,
          display: `About ${listed(ids.map((id) => `"${titleOf(id)}"`))}`,
          sources: [appSource(`${event.id} ${read}`)],
          evidence,
          confidence: CONFIDENCE.sure,
          tier: 'sure',
        },
        options,
      ),
      event,
    );
    report.matched++;
    report.pairs += ids.length;
  }
  return { planned: out.planned, report };
}
