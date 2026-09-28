import { beforeAll, describe, expect, it } from 'vitest';
import {
  GUIDED_TOURS,
  resolveTourStops,
} from '@/components/atlas/data/guidedTours';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import type { HistoricalEvent } from '@/components/atlas/types';
import { ensureAtlasContent, MUSIC_HISTORY } from '@/content/contentStore';
import { CITIES } from './cities';
import { allConnections } from './eventConnections';

/**
 * Structural guards for the globe's data.
 *
 * These exist because every defect they check for was real and invisible in the
 * UI. A backwards influence edge still renders a pill, just one that claims a
 * 1978 record shaped a 1977 movement. A pathway step whose event id no longer
 * exists is silently dropped from the progress bar. A city whose subdivision
 * belongs to the previous entry in the array reads as a plausible place name.
 * None of it throws, so only assertions catch it.
 */
const HYDRATION_TIMEOUT = 60_000;

describe('globe data integrity', () => {
  let byId: Map<string, HistoricalEvent>;

  beforeAll(async () => {
    await ensureAtlasContent();
    byId = new Map(MUSIC_HISTORY.map((e) => [e.id, e]));
  }, HYDRATION_TIMEOUT);

  describe('influence graph', () => {
    it('never claims a later moment influenced an earlier one', () => {
      const backwards = allConnections()
        .filter((c) => byId.has(c.from) && byId.has(c.to))
        .filter((c) => byId.get(c.from)!.year > byId.get(c.to)!.year)
        .map(
          (c) =>
            `${c.from} (${byId.get(c.from)!.year}) -> ${c.to} (${byId.get(c.to)!.year})`,
        );
      expect(backwards).toEqual([]);
    });

    it('has no duplicate or mutually-pointing edges', () => {
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const c of allConnections()) {
        const key = `${c.from}->${c.to}`;
        if (seen.has(key)) duplicates.push(key);
        seen.add(key);
      }
      const reciprocal = allConnections()
        .filter((c) => c.from < c.to && seen.has(`${c.to}->${c.from}`))
        .map((c) => `${c.from} <-> ${c.to}`);
      expect({ duplicates, reciprocal }).toEqual({
        duplicates: [],
        reciprocal: [],
      });
    });

    it('is acyclic, so the recursive arc walk always terminates', () => {
      const downstream = new Map<string, string[]>();
      for (const c of allConnections()) {
        const list = downstream.get(c.from);
        if (list) list.push(c.to);
        else downstream.set(c.from, [c.to]);
      }
      const state = new Map<string, 1 | 2>();
      const cycles: string[] = [];
      const walk = (node: string, path: string[]) => {
        state.set(node, 1);
        path.push(node);
        for (const next of downstream.get(node) ?? []) {
          if (state.get(next) === 1) {
            cycles.push(
              path.slice(path.indexOf(next)).concat(next).join(' -> '),
            );
          } else if (!state.has(next)) {
            walk(next, path);
          }
        }
        path.pop();
        state.set(node, 2);
      };
      for (const node of downstream.keys())
        if (!state.has(node)) walk(node, []);
      expect(cycles).toEqual([]);
    });
  });

  describe('guided content', () => {
    it('resolves every pathway step, in ascending year order', () => {
      const problems: string[] = [];
      for (const mod of HISTORICAL_MODULES) {
        const events = mod.eventIds.map((id) => {
          const event = byId.get(id);
          if (!event) problems.push(`${mod.id}: no such event ${id}`);
          return event;
        });
        for (let i = 1; i < events.length; i++) {
          const prev = events[i - 1];
          const here = events[i];
          if (prev && here && here.year < prev.year) {
            problems.push(
              `${mod.id}: ${prev.id} (${prev.year}) is followed by ${here.id} (${here.year})`,
            );
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('resolves every guided-tour stop to a real city', () => {
      const problems: string[] = [];
      for (const tour of GUIDED_TOURS) {
        const stops = resolveTourStops(tour);
        if (stops.length === 0) problems.push(`${tour.id}: no stops resolved`);
        for (const stop of tour.stops) {
          if (stop.cityId && !CITIES.some((c) => c.id === stop.cityId)) {
            problems.push(`${tour.id}: no such city ${stop.cityId}`);
          }
          if (stop.eventId && !byId.has(stop.eventId)) {
            problems.push(`${tour.id}: no such event ${stop.eventId}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('covers every year with exactly one era', () => {
      const sorted = [...MUSICAL_ERAS].sort(
        (a, b) => a.yearStart - b.yearStart,
      );
      const gaps: string[] = [];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].yearStart !== sorted[i - 1].yearEnd + 1) {
          gaps.push(
            `${sorted[i - 1].id} ends ${sorted[i - 1].yearEnd}, ${sorted[i].id} starts ${sorted[i].yearStart}`,
          );
        }
      }
      expect(gaps).toEqual([]);
      // The open era must stay ahead of the calendar, or new events belong to none.
      const last = sorted[sorted.length - 1];
      expect(last.yearEnd).toBeGreaterThanOrEqual(new Date().getFullYear());
    });
  });

  describe('cities', () => {
    it('has no duplicate ids', () => {
      const counts = new Map<string, number>();
      for (const city of CITIES) {
        counts.set(city.id, (counts.get(city.id) ?? 0) + 1);
      }
      const duplicates = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
      expect(duplicates).toEqual([]);
    });

    it('never carries the previous entry’s name as its subdivision', () => {
      // The signature of the off-by-one that shifted 151 subdivisions: Bissau
      // read "Conakry", Athens read "Chișinău", Kyiv read "Ljubljana".
      const shifted = CITIES.filter(
        (city, i) => i > 0 && city.subdivision === CITIES[i - 1].name,
      ).map((c) => `${c.id}: '${c.subdivision}'`);
      expect(shifted).toEqual([]);
    });
  });
});
