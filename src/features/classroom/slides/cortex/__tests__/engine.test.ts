import { describe, expect, it } from 'vitest';
import { edgesOnMap, joinsMap } from '@/content/graph/mindMapBoard';
import { performerOptions } from '../performerLesson';
import { vibesFor } from '../planLesson';
import { producerOptions } from '../producerTutorial';
import { promoterBoard } from '../promoterBoard';
import { showcaseFor } from '../showcase';
import {
  EMPTY_FOCUS_CONTEXT,
  focusPool,
  rankFocusCandidates,
  searchFocus,
  suggestFocus,
} from '../suggestFocus';
import type { LessonFocus } from '../types';
import { fixture, fixtureCatalog } from './fixture';

const graph = fixture();
const catalog = fixtureCatalog();

const focusFor = (id: LessonFocus['id']): LessonFocus => {
  const found = searchFocus(graph, catalog, graph.nodes.get(id)?.label ?? '');
  const focus = found.find((f) => f.id === id);
  if (!focus) throw new Error(`no focus ${id}`);
  return focus;
};

describe('the focus suggestion', () => {
  it('ranks only real, confirmed, pinned artists and cities with enough connections', () => {
    const ids = rankFocusCandidates(graph, catalog).map((r) => r.focus.id);
    expect(ids).toContain('artist:ana-lux');
    expect(ids).toContain('place:motor-city');
    // A missing node, an unconfirmed record, a region and an unpinned place
    // never come up, nor anything too thinly connected.
    for (const never of [
      'artist:ghost',
      'artist:unsure',
      'place:region-north-america',
      'place:no-pin',
      'artist:filler-1',
    ])
      expect(ids).not.toContain(never);
  });

  it("counts confirmed connections only: a guessed song doesn't count", () => {
    const ana = rankFocusCandidates(graph, catalog).find(
      (r) => r.focus.id === 'artist:ana-lux',
    );
    // Night Drive, Sunrise, Motor City, the debut event — not "Big Hit".
    expect(ana?.focus.connections).toBe(4);
  });

  it("suggests from the Day's planned song first", () => {
    const focus = suggestFocus(
      graph,
      catalog,
      { ...EMPTY_FOCUS_CONTEXT, plannedSongIds: ['low_tide'] },
      0,
    );
    expect(focus).toMatchObject({
      id: 'artist:cy-dee',
      reason: { kind: 'plannedSong', songId: 'low_tide', title: 'Low Tide' },
    });
  });

  it("suggests from the Day's planned Globe event", () => {
    const focus = suggestFocus(
      graph,
      catalog,
      { ...EMPTY_FOCUS_CONTEXT, plannedEventIds: ['evt-ana-debut'] },
      0,
    );
    expect(focus).toMatchObject({
      id: 'artist:ana-lux',
      reason: { kind: 'plannedEvent', eventId: 'evt-ana-debut' },
    });
  });

  it('skips what the class had recently, unless nothing else is left', () => {
    const best = suggestFocus(graph, catalog, EMPTY_FOCUS_CONTEXT, 0);
    expect(best).not.toBeNull();
    const next = suggestFocus(
      graph,
      catalog,
      { ...EMPTY_FOCUS_CONTEXT, recentFocusIds: [best!.id] },
      0,
    );
    expect(next?.id).not.toBe(best!.id);
    const everything = rankFocusCandidates(graph, catalog).map(
      (r) => r.focus.id,
    );
    expect(
      suggestFocus(
        graph,
        catalog,
        { ...EMPTY_FOCUS_CONTEXT, recentFocusIds: everything },
        0,
      ),
    ).not.toBeNull();
  });

  it('shuffles through the whole pool in a fixed order, then comes round again', () => {
    const pool = focusPool(graph, catalog, EMPTY_FOCUS_CONTEXT);
    const walk = pool.map(
      (_, seed) => suggestFocus(graph, catalog, EMPTY_FOCUS_CONTEXT, seed)?.id,
    );
    expect(new Set(walk).size).toBe(pool.length);
    expect(
      suggestFocus(graph, catalog, EMPTY_FOCUS_CONTEXT, pool.length)?.id,
    ).toBe(walk[0]);
    // The same seed always gives the same suggestion.
    expect(suggestFocus(graph, catalog, EMPTY_FOCUS_CONTEXT, 1)?.id).toBe(
      walk[1],
    );
  });

  it('finds artists and cities by name, accents and case aside', () => {
    expect(searchFocus(graph, catalog, 'motor').map((f) => f.id)).toEqual([
      'place:motor-city',
    ]);
    expect(searchFocus(graph, catalog, 'ANA')[0]).toMatchObject({
      id: 'artist:ana-lux',
      reason: { kind: 'searched' },
    });
    expect(searchFocus(graph, catalog, 'ghost')).toEqual([]);
    expect(searchFocus(graph, catalog, 'a')).toEqual([]);
  });
});

describe('the Showcase', () => {
  it("reads an artist's facts in English and Spanish", () => {
    const showcase = showcaseFor(graph, catalog, focusFor('artist:ana-lux'));
    expect(showcase.facts.map((f) => f.text)).toEqual([
      { en: 'Born in Motor City in 1950.', es: 'Nació en Motor City en 1950.' },
      {
        en: 'Known for “Night Drive” and “Sunrise”.',
        es: 'Conocido por “Night Drive” y “Sunrise”.',
      },
      { en: 'Sound: Soul.', es: 'Sonido: Soul.' },
      {
        en: '1971: Ana Lux releases “Night Drive”',
        es: '1971: Ana Lux releases “Night Drive”',
      },
      {
        en: 'Active from the 1960s to the 1970s.',
        es: 'Activo de los 1960s a los 1970s.',
      },
    ]);
    expect(showcase.accent).toBe('#0a9396');
  });

  it("shows an artist's portrait and plays their own song", () => {
    const showcase = showcaseFor(graph, catalog, focusFor('artist:ana-lux'));
    expect(showcase.visual).toEqual({
      type: 'artistImage',
      songId: 'night_drive',
    });
    expect(showcase.listen).toEqual({
      videoId: 'nightDrive1',
      startSec: 12,
      title: 'Night Drive',
      caption: '“Night Drive” · Ana Lux · 1971',
      songId: 'night_drive',
    });
  });

  it("reads a city's description, scene, people and events", () => {
    const showcase = showcaseFor(graph, catalog, focusFor('place:motor-city'));
    const lines = showcase.facts.map((f) => f.text.en);
    expect(lines[0]).toBe('Home of a famous sound.');
    expect(lines).toContain('Known for Soul.');
    expect(lines).toContain('Birthplace of Ana Lux.');
    expect(lines).toContain('Home to Ben Ray.');
    // The missing and unconfirmed artists tied to the city are never named.
    expect(lines.join(' ')).not.toMatch(/Ghost|Unsure/);
    expect(showcase.accent).toBe('#bb3e03');
  });

  it('marks a city and its events on the mini-globe, and plays a song cut there', () => {
    const showcase = showcaseFor(graph, catalog, focusFor('place:motor-city'));
    expect(showcase.visual).toEqual({
      type: 'globePreview',
      markers: [
        { location: [42.3, -83.0], size: 0.09 },
        { location: [42.33, -83.05], size: 0.05 },
      ],
    });
    expect(showcase.listen?.songId).toBe('night_drive');
  });
});

describe("the Promoter's board", () => {
  const board = promoterBoard(graph, catalog, 'artist:ana-lux');

  it('holds the focus and what is two confirmed steps away on the Globe', () => {
    expect(board).not.toBeNull();
    const ids = board!.nodes.map((n) => n.id);
    expect(ids[0]).toBe('artist:ana-lux');
    expect(ids).toEqual(
      expect.arrayContaining([
        'song:night_drive',
        'song:sunrise',
        'place:motor-city',
        'event:evt-ana-debut',
        // two steps: Sunrise's performer, and who else is in Motor City
        'artist:ben-ray',
      ]),
    );
    // Not a guess, a missing or unconfirmed node, a region, or a genre.
    for (const never of [
      'song:big_hit',
      'artist:ghost',
      'artist:unsure',
      'place:region-north-america',
      'subgenre:soul',
    ])
      expect(ids).not.toContain(never);
  });

  it('does not walk on through a hub', () => {
    // Ben Ray is reached; Big City is three steps out, its 45 artists never.
    const ids = board!.nodes.map((n) => n.id);
    expect(ids.some((id) => id.startsWith('artist:filler-'))).toBe(false);
    const fromBen = promoterBoard(graph, catalog, 'artist:ben-ray');
    const benIds = fromBen!.nodes.map((n) => n.id);
    expect(benIds).toContain('place:big-city');
    expect(benIds.some((id) => id.startsWith('artist:filler-'))).toBe(false);
  });

  it('carries every confirmed edge among its nodes, and where each node is on the Globe', () => {
    expect(board!.edges).toContainEqual({
      from: 'song:sunrise',
      kind: 'performed_by',
      to: 'artist:ben-ray',
    });
    expect(board!.edges).toContainEqual({
      from: 'event:evt-ana-debut',
      kind: 'took_place_in',
      to: 'place:motor-city',
    });
    const stops = Object.fromEntries(board!.nodes.map((n) => [n.id, n.stop]));
    expect(stops['artist:ana-lux']).toEqual({ artist: 'Ana Lux' });
    expect(stops['place:motor-city']).toEqual({ place: 'city:motor-city' });
    expect(stops['event:evt-ana-debut']).toEqual({ event: 'evt-ana-debut' });
    expect(stops['song:sunrise']).toEqual({ event: 'song-sunrise' });
  });

  it('builds outward from the focus', () => {
    const added = new Set<LessonFocus['id']>();
    expect(joinsMap(board!, added, 'song:sunrise')).toBe(true);
    // Ben Ray joins through Sunrise or Motor City, not before.
    expect(joinsMap(board!, added, 'artist:ben-ray')).toBe(false);
    added.add('song:sunrise');
    expect(joinsMap(board!, added, 'artist:ben-ray')).toBe(true);
    added.add('artist:ben-ray');
    expect(edgesOnMap(board!, added)).toHaveLength(2);
    expect(board!.goal).toBe(5);
  });

  it('is null when too little is confirmed around the focus', () => {
    expect(promoterBoard(graph, catalog, 'artist:filler-1')).toBeNull();
  });
});

describe('the Producer and Performer', () => {
  it("picks the tutorial for the focus's genre, a subgenre's own first", () => {
    const cy = producerOptions(graph, catalog, 'artist:cy-dee');
    expect(cy[0]).toMatchObject({
      tutorial: { id: 'house-make-it-pump' },
      genre: 'House',
    });
    // Soul has no tutorial of its own; it falls to Funk's.
    const ana = producerOptions(graph, catalog, 'artist:ana-lux');
    expect(ana[0]).toMatchObject({ tutorial: { id: 'rnb-mix-and-polish' } });
    expect(ana[0].tutorial.needsPremium).toBe(true);
    // Every tutorial is still offered.
    expect(ana).toHaveLength(8);
  });

  it('falls back to the first tutorial when no genre is known', () => {
    expect(producerOptions(graph, catalog, 'place:bay-town')[0]).toMatchObject({
      tutorial: { id: 'make-first-track' },
    });
  });

  it("offers the focus's songs as lessons, the genre's curriculum last", () => {
    const options = performerOptions(graph, catalog, 'artist:ana-lux');
    expect(options.map((o) => o.activityRef)).toEqual([
      'song:night_drive:lesson',
      'song:sunrise:lesson',
      'song:big_hit:lesson',
      'curriculum:funk:L1',
    ]);
    expect(options[0]).toMatchObject({
      label: { en: '“Night Drive” — C major', es: '“Night Drive” — C mayor' },
      // Learn's free lesson is C major.
      needsPremium: false,
    });
    expect(options[1].label.en).toBe('“Sunrise” — D Dorian');
    expect(options[1].needsPremium).toBe(true);
  });

  it("finds a city's songs through what was recorded there and its artists", () => {
    expect(
      performerOptions(graph, catalog, 'place:bay-town').map(
        (o) => o.activityRef,
      ),
    ).toEqual(['song:low_tide:lesson']);
  });

  it("reads the vibes of the focus's songs and their progressions", () => {
    expect(vibesFor(graph, 'artist:ana-lux')).toEqual(['groovy', 'uplifting']);
    expect(vibesFor(graph, 'artist:cy-dee')).toEqual([]);
  });
});
