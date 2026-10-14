import { describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { LANE_IDS, isLaneId } from './laneIds';
import {
  LANES,
  SOURCE_LANE,
  aliveAt,
  ancestorsOf,
  descendantsOf,
  familyOf,
  genreLane,
  getLane,
  laneOf,
  laneOfGenre,
  lanesOf,
} from './lineage';

const event = (
  year: number,
  genre: string[],
  tags: string[] = [],
): HistoricalEvent => ({
  id: 'e',
  year,
  location: { lat: 0, lng: 0, city: 'Memphis', country: 'United States' },
  genre,
  tags,
  title: 't',
  description: 'd',
});

describe('the family tree', () => {
  it('lists every lane once, top to bottom', () => {
    expect(LANES.map((l) => l.id)).toEqual([...LANE_IDS]);
    expect(isLaneId('jazz')).toBe(true);
    expect(isLaneId('polka')).toBe(false);
  });

  it('gives each curriculum course to one lane', () => {
    const courses = LANES.flatMap((l) => l.courses);
    expect(new Set(courses).size).toBe(courses.length);
  });

  it('grows every lane from the source, never before what it comes from', () => {
    for (const lane of LANES) {
      if (lane.id === SOURCE_LANE) {
        expect(lane.from).toEqual([]);
        continue;
      }
      expect(ancestorsOf(lane.id), lane.id).toContain(SOURCE_LANE);
      for (const parent of lane.from) {
        expect(lane.born, `${lane.id} after ${parent}`).toBeGreaterThanOrEqual(
          getLane(parent).born,
        );
      }
      for (const join of lane.joins ?? []) {
        expect(join.year, lane.id).toBeGreaterThan(lane.born);
        expect(join.year, lane.id).toBeGreaterThanOrEqual(
          getLane(join.from).born,
        );
      }
    }
  });

  it('splits and merges as the owner drew it', () => {
    expect(getLane('classical').from).toEqual(['roots']);
    expect(getLane('blues').from).toEqual(['roots']);
    for (const child of ['jazz', 'rnb', 'rock'] as const) {
      expect(getLane(child).from[0]).toBe('blues');
    }
    expect(getLane('metal').from).toEqual(['rock', 'classical']);
    expect(ancestorsOf('hip-hop')).toEqual(
      expect.arrayContaining(['funk', 'rnb', 'blues', 'reggae', 'roots']),
    );
  });

  it('knows a lane’s whole family', () => {
    expect(descendantsOf('blues')).toEqual(
      expect.arrayContaining(['jazz', 'rnb', 'rock', 'metal', 'hip-hop']),
    );
    expect(descendantsOf('blues')).not.toContain('classical');
    const jazz = familyOf('jazz');
    expect(jazz.has('jam-band')).toBe(true);
    expect(jazz.has('blues')).toBe(true);
    expect(jazz.has('electronic')).toBe(false);
  });
});

describe('placing events', () => {
  it.each([
    ['Chicago Blues', 'blues'],
    ['Gospel', 'rnb'],
    ['Rocksteady', 'reggae'],
    ['Opera', 'classical'],
    ['Film Scoring', 'stage-screen'],
    ['Trap', 'hip-hop'],
    ['Hip-Hop', 'hip-hop'],
    ['Hard Bop', 'jazz'],
    ['Highlife', 'roots'],
    ['K-Pop', 'pop'],
    ['Heavy Metal', 'metal'],
  ] as const)('files %s under %s', (genre, lane) => {
    expect(laneOfGenre(genre)).toBe(lane);
  });

  it('lets a lane that claims a genre outright take the event', () => {
    expect(genreLane(event(1980, ['Rock', 'Heavy Metal']))).toBe('metal');
  });

  it('otherwise follows the first genre a lane claims, then the tags', () => {
    expect(genreLane(event(1960, ['Zzz', 'Soul', 'Rock']))).toBe('rnb');
    expect(lanesOf(event(1960, ['Soul', 'Rock', 'Funk']))).toEqual([
      'rnb',
      'rock',
      'funk',
    ]);
    expect(genreLane(event(1990, ['Zzz'], ['Techno']))).toBe('electronic');
    expect(genreLane(event(1990, [], []))).toBe('roots');
  });

  it('puts an event older than its lane on the nearest ancestor flowing then', () => {
    // A spiritual filed as Gospel (R&B) before R&B and the blues split off.
    expect(laneOf(event(1871, ['Gospel']))).toBe('roots');
    expect(laneOf(event(1932, ['Gospel']))).toBe('blues');
    expect(laneOf(event(1950, ['Gospel']))).toBe('rnb');
    expect(laneOf(event(1945, ['Rock and Roll']))).toBe('blues');
    expect(aliveAt('rock', 1950)).toBe(true);
    expect(aliveAt('rock', 1949)).toBe(false);
  });
});
