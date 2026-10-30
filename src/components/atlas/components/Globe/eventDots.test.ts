/** The event dots' seats, pure. */
import type { Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import { dotCollection, pxToDeg, seatEvents, type DotEvent } from './eventDots';

const square = (x: number, y: number, w: number, h: number): Position[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];
const at = (id: string, year: number, lat = 5, lng = 5): DotEvent => ({
  id,
  year,
  lat,
  lng,
});
const many = (n: number, lat = 5, lng = 5) =>
  Array.from({ length: n }, (_, i) => at(`e${i}`, 1900 + i, lat, lng));

describe('the seats', () => {
  const land = [square(0, 0, 10, 10)];

  it('seats one event per dot, oldest first, the first on its place', () => {
    const seats = seatEvents([at('b', 1950), at('a', 1900)], land, 1);
    expect(seats.map((s) => s.eventId)).toEqual(['a', 'b']);
    expect(seats[0].coordinates).toEqual([5, 5]);
    expect(seats[1].coordinates).not.toEqual([5, 5]);
  });

  it('never seats two events together, and stays on the land', () => {
    const seats = seatEvents(many(60), land, 0.5);
    const unique = new Set(seats.map((s) => s.coordinates.join()));
    expect(unique.size).toBe(60);
    for (const {
      coordinates: [x, y],
    } of seats) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(10);
    }
  });

  it('gives the same seats whatever order the events come in', () => {
    const events = many(30);
    const forward = seatEvents(events, land, 0.5);
    const back = seatEvents([...events].reverse(), land, 0.5);
    expect(back).toEqual(forward);
  });

  it('keeps out of a hole', () => {
    const rings = [square(0, 0, 10, 10), square(3, 3, 4, 4)];
    const seats = seatEvents(many(40), rings, 0.5);
    const inHole = seats.filter(
      ({ coordinates: [x, y] }) => x > 3 && x < 7 && y > 3 && y < 7,
    );
    expect(inHole).toHaveLength(0);
  });

  it('brings a coastal place’s events onto the land', () => {
    const [seat] = seatEvents([at('coast', 1950, 5, 10.4)], land, 0.5);
    expect(seat.coordinates[0]).toBeLessThanOrEqual(10);
  });

  it('sits an event on its place when the land has no room', () => {
    const seats = seatEvents(many(6), [square(5, 5, 0.1, 0.1)], 1);
    expect(seats).toHaveLength(6);
    expect(seats[5].coordinates).toEqual([5, 5]);
  });

  it('carries an event over the antimeridian with its region', () => {
    const rings = [square(170, 60, 20, 10)];
    const [seat] = seatEvents([at('far', 1950, 65, -175)], rings, 1);
    expect(seat.coordinates[0]).toBeCloseTo(185);
  });

  it('turns px into degrees at a zoom', () => {
    expect(pxToDeg(512 / 360, 0)).toBeCloseTo(1);
    expect(pxToDeg(7, 3)).toBeCloseTo(7 / ((512 * 8) / 360));
  });
});

describe('the dots’ source', () => {
  it('carries each event’s look', () => {
    const seats = seatEvents([at('a', 1900)], [square(0, 0, 10, 10)], 1);
    const { features } = dotCollection(seats, () => ({
      rim: 'red',
      dim: false,
      hot: true,
    }));
    expect(features[0].properties).toEqual({
      eventId: 'a',
      rim: 'red',
      dim: false,
      hot: true,
    });
  });
});
