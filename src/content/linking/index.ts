import type { RequiredRecord, Suggestion } from '../suggestions/types';
import { type EventArtistsReport, planEventArtists } from './eventArtists';
import { type EventPlacesReport, planEventPlaces } from './eventPlaces';
import { type EventSongsReport, planEventSongs } from './eventSongs';
import { type HometownsReport, planHometowns } from './hometowns';
import { createPlaceBook } from './placeBook';
import { eventMatchesOf } from './plan';
import {
  type ProgressionSongsReport,
  planProgressionSongs,
} from './progressionSongs';
import { planSongYears, type SongYearsReport } from './songYears';
import type {
  LinkingInput,
  Plan,
  PlannedSuggestion,
  PlanOptions,
} from './types';

/**
 * Stage 1, planned in one go: every app suggestion the data offers, for the
 * Table to show as ghost cells and to accept (Amendment 5, §5.1).
 *
 * The planners that make places share one place book, so a city two of them
 * need (Cincinnati, named by an event and by a song pin) is one record with
 * one body, and they run twice so its slug comes from the whole set of
 * places (`placeBook.ts`). The book knows the places the importer's
 * artifacts make, so one the importer makes too is its record, under its
 * slug. The event matches are worked out once for both event planners.
 *
 * Where it runs: wherever the store serves suggestions
 * (`feature('suggestions')`), the console reads them from
 * `GET /suggestions` and never plans on its own — a suggestion planned from
 * another snapshot, or without the importer's rows, can have an id the
 * server does not serve, and accepting it fails. Planning in the browser is
 * for the read-only repo view, where nothing is accepted.
 */

export interface StageOneOptions extends PlanOptions {
  /**
   * The importer's suggestions (the committed artifacts): a song-pin city
   * the importer also gives as the act's City is that suggestion, and one it
   * gives only as their birthplace is offered there (`hometowns.ts`).
   */
  imported?: readonly Suggestion[];
}

export interface StageOnePlan {
  /** Every planner's suggestions, in planner order. */
  planned: PlannedSuggestion[];
  eventArtists: Plan<EventArtistsReport>;
  eventSongs: Plan<EventSongsReport>;
  eventPlaces: Plan<EventPlacesReport>;
  hometowns: Plan<HometownsReport>;
  progressionSongs: Plan<ProgressionSongsReport>;
  songYears: Plan<SongYearsReport>;
  /**
   * The records the suggestions need made first, each once, in the order a
   * bulk write makes them (places before artists).
   */
  requires: RequiredRecord[];
}

/** The records the importer's suggestions make, for the place book. */
export const importedRecords = (
  imported: readonly Suggestion[] | undefined,
): RequiredRecord[] => (imported ?? []).flatMap((s) => s.requires ?? []);

/** The order records are made in, before anything that points at them. */
const MAKE_ORDER = ['globe_city', 'label', 'studio', 'artist', 'release'];

export function planStageOne(
  input: LinkingInput,
  options: StageOneOptions = {},
): StageOnePlan {
  const data: LinkingInput = { ...input, eventMatches: eventMatchesOf(input) };
  const book = createPlaceBook(input.places, {
    imported: importedRecords(options.imported),
  });
  const placed = () => ({
    eventPlaces: planEventPlaces(data, { ...options, book }),
    hometowns: planHometowns(data, { ...options, book }),
  });
  // Once to ask for every place, then the answers that the whole set gives.
  placed();
  const { eventPlaces, hometowns } = placed();

  const plans = {
    eventArtists: planEventArtists(data, options),
    eventSongs: planEventSongs(data, options),
    eventPlaces,
    hometowns,
    progressionSongs: planProgressionSongs(data, options),
    songYears: planSongYears(data, options),
  };
  const planned = Object.values(plans).flatMap((plan) => plan.planned);

  const requires = new Map<string, RequiredRecord>();
  for (const { suggestion } of planned)
    for (const record of suggestion.requires ?? [])
      if (!requires.has(`${record.kind}:${record.slug}`))
        requires.set(`${record.kind}:${record.slug}`, record);
  const rank = (kind: string) => {
    const at = MAKE_ORDER.indexOf(kind);
    return at === -1 ? MAKE_ORDER.length : at;
  };

  return {
    planned,
    ...plans,
    requires: [...requires.values()].sort(
      (a, b) =>
        rank(a.kind) - rank(b.kind) ||
        (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
    ),
  };
}

/**
 * The app's suggestions and the importer's as one list, each id once: two
 * offers of the same value for the same field are one suggestion with both
 * sources, and the importer's batch and identity dependency
 * (`suggestions/merge.ts`).
 */
export { mergeSuggestions } from '../suggestions/merge';
export { isOneWordName } from './eventArtists';
export { PLACEHOLDER_EVENT_YEAR } from './songYears';
export { SAME_PLACE_KM, SAME_SPOT_KM } from './placeBook';
export { APP_BATCH, CONFIDENCE } from './types';
export type {
  EventArtistsReport,
  EventPlacesReport,
  EventSongsReport,
  HometownsReport,
  ProgressionSongsReport,
  SongYearsReport,
};
export type {
  LinkingInput,
  Plan,
  PlannedSuggestion,
  Precondition,
} from './types';
export {
  planEventArtists,
  planEventPlaces,
  planEventSongs,
  planHometowns,
  planProgressionSongs,
  planSongYears,
};
