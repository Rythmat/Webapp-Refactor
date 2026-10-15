import type { MockKind } from '@/features/admin/content/mock/mockKinds';
import { artistLocationsSource } from './artistLocations';
import { artistsSource } from './artists';
import { type RepoSource } from './common';
import { eventsSource } from './events';
import {
  drumGroovesSource,
  feelProfilesSource,
  instrumentPartsSource,
} from './instrumentContent';
import { placesSource } from './places';
import { progressionsSource } from './progressions';
import { recordsSource } from './records';
import { songsSource } from './songs';
import { vocabularySource } from './vocabulary';

/**
 * Which adapter holds each kind in repo mode (design A.2, C.1).
 *
 * | Kind | Files |
 * |---|---|
 * | `song` | `src/curriculum/data/songs/<id>.ts`, registered in `bundled.ts` |
 * | `globe_event` | the 16 arrays in `src/components/atlas/data/events/` |
 * | `globe_city` | `cities.ts` (pinned) and `src/content/data/places.json` (`pin: false`) |
 * | `artist` | `artistRegistry.ts` (roster fields) and `src/content/data/artists.json` |
 * | `chord_progression` | `src/curriculum/data/chordProgressionLibrary.ts` |
 * | `release`, `studio`, `label` | `src/content/data/{releases,studios,labels}.json` |
 * | `artist_location` | `src/scripts/artistLocations.json`, read-only |
 * | `drum_groove`, `instrument_part`, `feel_profile` | one JSON file per item in `src/curriculum/data/{drumGrooves,drumGrooves/studio,parts,feels}/` (sources/instrumentContent.ts) |
 * | `genre`, `subgenre`, `instrument` | `src/content/vocabulary/{genres,subgenres,instruments}.json`, plus the API's copy (`vocabulary.generated.json`) and its hash in `manifest.json` when a save changes it |
 *
 * Lessons (`activity_flow`, `fundamentals_flow`) are not served in repo
 * mode: to edit them, switch repo mode off and use the API (design G).
 */

/** Every adapter, in the order the store loads them. */
export const REPO_SOURCES: readonly RepoSource[] = [
  songsSource,
  eventsSource,
  placesSource,
  artistsSource,
  progressionsSource,
  recordsSource,
  artistLocationsSource,
  vocabularySource,
  feelProfilesSource,
  drumGroovesSource,
  instrumentPartsSource,
];

/** Each content kind's adapter; null for the kinds repo mode does not serve. */
export const SOURCE_OF_KIND: Readonly<Record<MockKind, RepoSource | null>> = {
  song: songsSource,
  globe_event: eventsSource,
  globe_city: placesSource,
  artist: artistsSource,
  chord_progression: progressionsSource,
  release: recordsSource,
  studio: recordsSource,
  label: recordsSource,
  artist_location: artistLocationsSource,
  genre: vocabularySource,
  subgenre: vocabularySource,
  instrument: vocabularySource,
  activity_flow: null,
  fundamentals_flow: null,
  drum_groove: drumGroovesSource,
  instrument_part: instrumentPartsSource,
  feel_profile: feelProfilesSource,
};

/** The kinds repo mode serves. */
export const REPO_KINDS: readonly MockKind[] = (
  Object.keys(SOURCE_OF_KIND) as MockKind[]
).filter((kind) => SOURCE_OF_KIND[kind] !== null);
