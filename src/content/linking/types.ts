import type { Song } from '@/curriculum/types/songLibrary';
import type {
  ArtistLocationInput,
  GlobeEventInput,
} from '../graph/deriveGraph';
import type { EventMatch } from '../graph/eventMatches';
import type { ArtistRecord, PlaceRecord } from '../records/types';
import type { Suggestion } from '../suggestions/types';

/**
 * Stage 1 of filling the Atlas (Amendment 5, §5.1): the app's own data, read
 * a second way, offered as suggestions to accept into stored ids.
 *
 * The graph already draws these as guesses — an event's artists from its
 * tags, its place from its city, an act's city from where its songs are
 * pinned. A planner turns each guess into a `provider: 'app'` suggestion
 * the owner accepts in the Table, one at a time or, for the sure ones, in
 * bulk; accepted, the guess becomes a stored fact and the dotted edge turns
 * solid.
 *
 * The planners are pure: the caller hands in the data (a `GraphSnapshot`
 * will do — the working graph's, so the plan is made from the bodies a save
 * would start from) and gets suggestions back. Nothing here reads the store,
 * the clock or the network, so the same data always plans the same
 * suggestions with the same ids, and a rejection stays rejected.
 */

/** An artist as the planners read it: a registry entry or an artist record. */
export type LinkingArtist = Pick<ArtistRecord, 'slug' | 'name'> &
  Partial<
    Pick<ArtistRecord, 'aliases' | 'group' | 'members' | 'basedInPlaceId'>
  > & {
    born?: Pick<NonNullable<ArtistRecord['born']>, 'placeId'>;
  };

/** A place: one of the globe's cities, or a place the console created. */
export type LinkingPlace = Pick<
  PlaceRecord,
  'id' | 'name' | 'country' | 'region' | 'coordinates'
> &
  Partial<Pick<PlaceRecord, 'aliases' | 'subdivision' | 'genres' | 'pin'>>;

/**
 * A progression: its song as the source sheets wrote it ('Dreams- Fleetwood
 * Mac'), sometimes in `artist` instead, and the songs it is linked to.
 */
export interface LinkingProgression {
  id: number;
  songIds?: readonly string[];
  song?: string;
  artist?: string;
}

/**
 * What the planners read. Every list may be left out, which only means no
 * suggestions come from it; a `GraphSnapshot` is one of these.
 */
export interface LinkingInput {
  /** Globe events: the `evt-` ones are planned, a song's is read for its year. */
  events?: readonly GlobeEventInput[];
  artists?: readonly LinkingArtist[];
  songs?: readonly Song[];
  places?: readonly LinkingPlace[];
  progressions?: readonly LinkingProgression[];
  /** The globe's song pins, `artist_location` items. */
  artistLocations?: readonly ArtistLocationInput[];
  /**
   * Who and what each event is about (`matchSnapshotEvents`), as the graph
   * has them. Worked out from the lists above when left out.
   */
  eventMatches?: ReadonlyMap<string, EventMatch>;
}

/**
 * What must still be true when a suggestion is written: the path as the
 * plan found it in the item's body (`apply.ts` `checkSuggestion`).
 */
export type Precondition =
  /** Nothing there: write only while that is still so (an accept). */
  | { state: 'empty' }
  /**
   * Something else is there: write over it only while it still holds
   * exactly `seen` — a Replace, one at a time, never in bulk. `seen` is what
   * `applySuggestion` takes as its `seen`.
   */
  | { state: 'conflict'; seen: unknown; reason: string }
  /** The body already says this: nothing to write. */
  | { state: 'applied' };

/** A suggestion, and what its item's body said at the path when planned. */
export interface PlannedSuggestion {
  suggestion: Suggestion;
  precondition: Precondition;
}

/** A planner's answer: its suggestions, and what it found along the way. */
export interface Plan<Report> {
  planned: PlannedSuggestion[];
  report: Report;
}

/** The batch app suggestions carry unless the caller names another. */
export const APP_BATCH = 'app-stage1';

/**
 * How far each kind of app suggestion is trusted, 0 to 1. Bulk accept starts
 * at 0.85 (`status.ts`), so only `sure` clears it; the rest sit where a
 * person has to look.
 */
export const CONFIDENCE = {
  /** A registry lookup, or a name and a second signal that agree. */
  sure: 0.9,
  /** One signal that can be wrong: a one-word name, a song-pin city. */
  likely: 0.7,
  /** As `likely`, and a record has to be made first. */
  create: 0.65,
} as const;

/** What every planner takes besides the data. */
export interface PlanOptions {
  /** The suggestions' `batch`; `APP_BATCH` when left out. */
  batch?: string;
}
