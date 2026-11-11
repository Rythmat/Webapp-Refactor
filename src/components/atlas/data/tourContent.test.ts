import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HistoricalEvent, TourSong } from '@/components/atlas/types';
import { matchMusicCity } from '@/components/atlas/utils/musicCityMatch';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { BUNDLED_MUSIC_HISTORY } from './events';
import { GUIDED_TOURS } from './guidedTours';
import {
  HISTORICAL_MODULES,
  PATHWAY_ALIASES,
  findModule,
} from './historicalModules';

/**
 * The tours' content holds together (owner, 2026-11-09: every stop its own
 * event, in year order, its words beside it, its songs real, its genres
 * Learn's).
 */
const EVENTS = new Map<string, HistoricalEvent>(
  BUNDLED_MUSIC_HISTORY.map((e) => [e.id, e]),
);
const SLUGS = new Set(GENRE_COURSES.map((c) => c.slug));
const SONGS_DIR = resolve(__dirname, '../../../curriculum/data/songs');

/**
 * Tours the data can't fill to four stops yet: North Asia has one music city
 * (Kyzyl) and one event beyond it (Ulaanbaatar's throat singing).
 */
const THIN_TOURS: Readonly<Record<string, number>> = {
  'region-north-asia': 2,
};

const songsExist = (songs: readonly TourSong[] | undefined) =>
  (songs ?? []).filter((s) => !existsSync(resolve(SONGS_DIR, `${s.id}.ts`)));

const inYearOrder = (events: readonly HistoricalEvent[]) =>
  events.every((e, i) => i === 0 || events[i - 1].year <= e.year);

describe('genre tours', () => {
  it.each(HISTORICAL_MODULES.map((m) => [m.id, m] as const))(
    '%s: real events in year order, words for each, Learn genres',
    (_, mod) => {
      const events = mod.eventIds.map((id) => EVENTS.get(id));
      expect(events.filter((e) => !e)).toHaveLength(0);
      expect(inYearOrder(events as HistoricalEvent[])).toBe(true);
      expect(mod.steps).toHaveLength(mod.eventIds.length);
      for (const step of mod.steps ?? []) {
        expect(step.lead.length).toBeGreaterThan(60);
        expect(songsExist(step.songs)).toEqual([]);
      }
      for (const slug of mod.learnGenres ?? []) expect(SLUGS).toContain(slug);
    },
  );

  it('opens a merged tour as the one it joined', () => {
    for (const [old, kept] of Object.entries(PATHWAY_ALIASES)) {
      expect(HISTORICAL_MODULES.some((m) => m.id === old)).toBe(false);
      expect(findModule(old)?.id).toBe(kept);
    }
  });
});

describe('region and city tours', () => {
  it.each(GUIDED_TOURS.map((t) => [t.id, t] as const))(
    '%s: each city stop on its own event there, songs real, Learn genres',
    (_, tour) => {
      const cityStops = tour.stops.filter((s) => s.cityId);
      expect(cityStops.length).toBeGreaterThanOrEqual(THIN_TOURS[tour.id] ?? 4);
      for (const stop of cityStops) {
        const event = stop.eventId ? EVENTS.get(stop.eventId) : undefined;
        expect(event, `${stop.title}: ${stop.eventId}`).toBeDefined();
        expect(matchMusicCity(event!)?.id, stop.title).toBe(stop.cityId);
        expect(songsExist(stop.songs)).toEqual([]);
      }
      if (tour.kind === 'city') {
        const events = cityStops.map((s) => EVENTS.get(s.eventId!)!);
        expect(inYearOrder(events)).toBe(true);
        expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
      }
      for (const slug of tour.learnGenres ?? []) expect(SLUGS).toContain(slug);
    },
  );
});
