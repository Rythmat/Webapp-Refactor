import {
  appSource,
  createCollector,
  firstOfEach,
  makeSuggestion,
} from './plan';
import {
  CONFIDENCE,
  type LinkingInput,
  type Plan,
  type PlanOptions,
} from './types';

/**
 * Song years: a song with no year, dated by its own globe event
 * (`song-<id>`), offered as its `year`.
 *
 * The event was built from the song, and a song with no year was given
 * 2000 (`buildGlobeData.mjs`, and the mock's `deriveEventBody` since), so
 * 2000 there says nothing and is never offered (C15). Every other year is
 * offered as `likely`, one at a time: students see the year on the song's
 * page and it moves the song on the globe's timeline, so none goes in
 * unseen. The placeholder years wait for MusicBrainz (Stage 2).
 */

/** The year a song event was given when its song had none. */
export const PLACEHOLDER_EVENT_YEAR = 2000;

export interface SongYearsReport {
  /** Songs with no year. */
  undated: number;
  /** Of those, songs with no globe event to read. */
  noEvent: number;
  /** Of those, songs whose event holds only the placeholder. */
  placeholder: number;
  /** Years offered. */
  offered: number;
  unreachable: { id: string; reason: string }[];
}

const isYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

export function planSongYears(
  input: LinkingInput,
  options: PlanOptions = {},
): Plan<SongYearsReport> {
  const out = createCollector();
  const report: SongYearsReport = {
    undated: 0,
    noEvent: 0,
    placeholder: 0,
    offered: 0,
    unreachable: out.unreachable,
  };
  const events = new Map(
    firstOfEach(input.events, (e) => e?.id).map((e) => [e.id, e]),
  );

  for (const song of firstOfEach(input.songs, (s) => s?.id)) {
    if (isYear(song.year)) continue;
    report.undated++;
    const event = events.get(`song-${song.id}`);
    if (!event || !isYear(event.year)) {
      report.noEvent++;
      continue;
    }
    if (event.year === PLACEHOLDER_EVENT_YEAR) {
      report.placeholder++;
      continue;
    }
    out.add(
      makeSuggestion(
        {
          target: { kind: 'song', slug: song.id },
          path: 'year',
          op: 'set',
          value: event.year,
          display: `Year: ${event.year}`,
          sources: [appSource(`${event.id} year`)],
          evidence: [
            `the song's globe event, ${event.id}, is dated ${event.year}`,
            'the song itself states no year: a person checks before students see it',
          ],
          confidence: CONFIDENCE.likely,
          tier: 'likely',
        },
        options,
      ),
      song,
    );
    report.offered++;
  }
  return { planned: out.planned, report };
}
