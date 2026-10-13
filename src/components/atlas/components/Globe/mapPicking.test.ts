import { describe, expect, it } from 'vitest';
import {
  labelOf,
  regionsClickable,
  targetOf,
  topFeature,
  type PickedFeature,
} from './mapPicking';
import { LAYER } from './mapStyle';

const at = (
  layer: string,
  properties: Record<string, unknown>,
): PickedFeature => ({ layer: { id: layer }, properties });

const brazil = at(LAYER.countriesFill, {
  _layer: 'country',
  NAME: 'Brazil',
  ISO_A3: 'BRA',
  clat: -10,
  clng: -52,
});
const texas = at(LAYER.statesFill, {
  _layer: 'state',
  name: 'Texas',
  iso_a2: 'US',
  clat: 31,
  clng: -99,
});
const nola = at(LAYER.cityHexes, {
  cityId: 'new-orleans',
  names: 'New Orleans, Baton Rouge',
});
const point = at(LAYER.artistPoints, { eventId: 'evt-1', name: 'Hot Five' });
const arc = at(LAYER.arcsHit, {
  eventId: 'evt-2',
  label: 'Bebop & "cool"',
  direction: 'upstream',
});

describe('what a click lands on', () => {
  it('takes the most specific layer, whatever the order found', () => {
    expect(topFeature([brazil, nola, point], true)).toBe(point);
    expect(topFeature([brazil, nola, arc], true)).toBe(arc);
    expect(topFeature([brazil, texas], true)).toBe(texas);
  });

  it('ignores layers that are not the Globe’s', () => {
    expect(topFeature([at('water', {})], true)).toBeNull();
  });

  it('leaves countries alone among the streets', () => {
    expect(regionsClickable(5.9, true)).toBe(true);
    expect(regionsClickable(6, true)).toBe(false);
    expect(regionsClickable(12, false)).toBe(true);
    expect(topFeature([brazil, texas], false)).toBeNull();
    expect(topFeature([brazil, nola], false)).toBe(nola);
  });
});

describe('what it opens', () => {
  it('opens an event from an arc or an artist’s point', () => {
    expect(targetOf(arc)).toEqual({ kind: 'event', eventId: 'evt-2' });
    expect(targetOf(point)).toEqual({ kind: 'event', eventId: 'evt-1' });
  });

  it('opens a column’s first city', () => {
    expect(targetOf(nola)).toEqual({ kind: 'city', cityId: 'new-orleans' });
  });

  it('opens a country or a state at the centre of its whole outline', () => {
    expect(targetOf(brazil)).toEqual({
      kind: 'region',
      place: { type: 'country', name: 'Brazil', iso: 'BRA' },
      centroid: { lat: -10, lng: -52 },
    });
    expect(targetOf(texas)).toEqual({
      kind: 'region',
      place: { type: 'state', name: 'Texas', country: 'United States' },
      centroid: { lat: 31, lng: -99 },
    });
  });

  it('opens nothing it cannot name', () => {
    expect(targetOf(null)).toBeNull();
    expect(targetOf(at(LAYER.artistPoints, {}))).toBeNull();
  });
});

describe('hover labels', () => {
  it('say what the three.js globe said, escaped', () => {
    expect(labelOf(arc)).toContain('Bebop &amp; &quot;cool&quot; →');
    expect(labelOf(nola)).toContain('New Orleans, Baton Rouge');
    expect(labelOf(brazil)).toContain('Brazil');
    expect(labelOf(texas)).toContain('Texas');
    expect(labelOf(null)).toBeNull();
  });
});
