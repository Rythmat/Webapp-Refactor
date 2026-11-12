import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as guides from '@/components/atlas/data/guides';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { journeyLeg } from './journeyLeg';
import { legLinkFeatures } from './networkFeatures';

/** Blues to Rock's first two stops (the content loads elsewhere). */
const stop = (
  id: string,
  city: string,
  lat: number,
  lng: number,
): HistoricalEvent => ({
  id,
  year: 1903,
  location: { lat, lng, city, country: 'US' },
  genre: [],
  title: id,
  description: '',
  tags: [],
});

beforeEach(() => {
  MUSIC_HISTORY.push(
    stop('evt-blues-clarksdale-1903', 'Clarksdale', 34.2, -90.57),
    stop('evt-handy-memphis-1912', 'Memphis', 35.15, -90.05),
  );
});
afterEach(() => {
  MUSIC_HISTORY.length = 0;
});

describe('a journey’s leg', () => {
  it('runs from a pathway’s stop to its next', () => {
    const leg = journeyLeg(
      guides,
      { moduleId: 'blues-to-rock', currentStep: 0 },
      null,
    );
    expect(leg?.key).toBe('pathway:blues-to-rock:0');
    expect(leg?.from.label).toBe('Clarksdale');
    expect(leg?.to.label).toBe('Memphis');
  });

  it('runs from a tour’s stop to its next, and ends at the last stop', () => {
    const tour = guides.getTour('city-memphis')!;
    const last = guides.resolveTourStops(tour).length - 1;
    expect(
      journeyLeg(guides, null, { tourId: tour.id, currentStep: 0 })?.key,
    ).toBe('tour:city-memphis:0');
    expect(
      journeyLeg(guides, null, { tourId: tour.id, currentStep: last }),
    ).toBeNull();
  });

  it('is nothing without a journey or its data', () => {
    expect(journeyLeg(guides, null, null)).toBeNull();
    expect(
      journeyLeg(
        undefined,
        { moduleId: 'blues-to-rock', currentStep: 0 },
        null,
      ),
    ).toBeNull();
  });

  it('is drawn as one solid line going out, and nothing else', () => {
    const leg = journeyLeg(
      guides,
      { moduleId: 'blues-to-rock', currentStep: 0 },
      null,
    )!;
    const links = legLinkFeatures(leg);
    expect(links.solid.features).toHaveLength(1);
    expect(links.solid.features[0].properties).toMatchObject({
      side: 'out',
      title: 'Clarksdale → Memphis',
    });
    expect(links.dotted.features).toHaveLength(0);
    expect(links.pills.features).toHaveLength(0);
  });
});
