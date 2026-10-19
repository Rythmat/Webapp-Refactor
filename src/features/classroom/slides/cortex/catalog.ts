import type { GraphSnapshot } from '@/content/graph/deriveGraph';
import type { PlaceRecord } from '@/content/records/types';
import type { Song } from '@/curriculum/types/songLibrary';
import type { TutorialInfo } from './types';

/**
 * What the lesson generator needs beyond the graph's nodes and edges: the
 * records behind them (a song's video and portrait, a city's description and
 * coordinates, an event's video and position) and the Studio's tutorials.
 * Built from the same snapshot the graph is built from.
 */
export interface EventInfo {
  id: string;
  title: string;
  year?: number;
  videoId?: string;
  lat?: number;
  lng?: number;
}

export type PlaceInfo = Pick<PlaceRecord, 'id' | 'name' | 'coordinates'> & {
  /** The place record's one-line description, when it has one. */
  description?: string;
  /** Whether the Globe draws a pin for it; absent means it does. */
  pin?: boolean;
};

export interface LessonCatalog {
  songs: ReadonlyMap<string, Song>;
  places: ReadonlyMap<string, PlaceInfo>;
  events: ReadonlyMap<string, EventInfo>;
  tutorials: readonly TutorialInfo[];
}

export const buildLessonCatalog = (
  snapshot: Pick<GraphSnapshot, 'songs' | 'places' | 'events'>,
  tutorials: readonly TutorialInfo[],
): LessonCatalog => ({
  songs: new Map((snapshot.songs ?? []).map((s) => [s.id, s])),
  places: new Map(
    (snapshot.places ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        description: p.description,
        coordinates: p.coordinates,
        ...(p.pin !== undefined ? { pin: p.pin } : {}),
      },
    ]),
  ),
  events: new Map(
    (snapshot.events ?? []).map((e) => {
      // The bundled events are full `HistoricalEvent`s; the graph's input
      // type only names what the graph reads, so the video is read here.
      const videoId = (e as { videoId?: unknown }).videoId;
      return [
        e.id,
        {
          id: e.id,
          title: e.title ?? e.id,
          ...(typeof e.year === 'number' ? { year: e.year } : {}),
          ...(typeof videoId === 'string' && videoId ? { videoId } : {}),
          ...(typeof e.location?.lat === 'number' &&
          typeof e.location?.lng === 'number'
            ? { lat: e.location.lat, lng: e.location.lng }
            : {}),
        },
      ];
    }),
  ),
  tutorials,
});

/** A Studio tutorial's catalog entry: Prism steps mean Premium. */
export const tutorialInfo = (tutorial: {
  id: string;
  title: string;
  estMinutes: number;
  difficulty: string;
  steps: readonly {
    target?: string | readonly string[];
    requires?: { channelStripTab?: string | null };
  }[];
}): TutorialInfo => ({
  id: tutorial.id,
  title: tutorial.title,
  estMinutes: tutorial.estMinutes,
  difficulty: tutorial.difficulty,
  needsPremium: tutorial.steps.some(
    (step) =>
      step.requires?.channelStripTab === 'prism' ||
      [step.target ?? []].flat().some((target) => target.includes('prism')),
  ),
});
