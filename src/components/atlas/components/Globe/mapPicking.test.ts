import { describe, expect, it } from 'vitest';
import { targetOf, topFeature, type PickedFeature } from './mapPicking';
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
const nola = at(LAYER.cityLabels, {
  cityId: 'new-orleans',
  name: 'New Orleans',
});
const point = at(LAYER.artistPoints, { eventId: 'evt-1', name: 'Hot Five' });
const arc = at(LAYER.linksHit, {
  id: 'arc:evt-2:0',
  eventId: 'evt-2',
  title: 'Bebop & "cool"',
});
const link = at(LAYER.linksDottedHit, {
  id: 'city:new-orleans>city:chicago',
  eventId: '',
  title: 'New Orleans → Chicago',
  detail: '2 influences · 1917–1923',
  place: 'city:chicago',
});
const regions = at(LAYER.linksDottedHit, {
  id: 'region:west-africa>region:north-america',
  eventId: '',
  title: 'West Africa → North America',
  detail: '9 influences · 1890–1990',
  place: '',
});

describe('what a click lands on', () => {
  it('takes the most specific layer, whatever the order found', () => {
    expect(topFeature([brazil, nola, point])).toBe(point);
    expect(topFeature([brazil, nola, arc])).toBe(arc);
    expect(topFeature([brazil, texas])).toBe(texas);
  });

  it('ignores layers that are not the Globe’s', () => {
    expect(topFeature([at('water', {})])).toBeNull();
  });
});

describe('what it opens', () => {
  it('opens an event from its influence line or an artist’s point', () => {
    expect(targetOf(arc)).toEqual({ kind: 'event', eventId: 'evt-2' });
    expect(targetOf(point)).toEqual({ kind: 'event', eventId: 'evt-1' });
  });

  it('opens a link’s far place, and says what the link carries', () => {
    expect(targetOf(link)).toEqual({
      kind: 'link',
      id: 'city:new-orleans>city:chicago',
      title: 'New Orleans → Chicago',
      detail: '2 influences · 1917–1923',
      place: { type: 'city', id: 'chicago' },
    });
    // Between regions: a card to hover, nothing to open.
    expect(targetOf(regions)).toMatchObject({ kind: 'link', place: null });
    expect(topFeature([brazil, nola, link])).toBe(link);
  });

  it('opens a city from its name', () => {
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
