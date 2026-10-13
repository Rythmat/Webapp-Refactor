import { beforeAll, describe, expect, it } from 'vitest';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { ensureAtlasContent, MUSIC_HISTORY } from '@/content/contentStore';
import { eventPlaceName } from './eventPlace';

beforeAll(() => ensureAtlasContent());

const byId = (id: string) => MUSIC_HISTORY.find((e) => e.id === id)!;

describe('the place an event is shown at', () => {
  it('names Washington D.C. in full, never the state, for its events', () => {
    const marvin = byId('song-whats_going_on');
    expect(marvin.location.city).toBe('Washington');
    expect(eventPlaceName(marvin)).toBe('Washington D.C.');
    for (const e of getEventsForLocation({
      type: 'city',
      id: 'washington-dc',
    })) {
      expect(eventPlaceName(e)).not.toBe('Washington');
    }
  });

  it('keeps the own name of a different place filed under a nearby city', () => {
    const collegePark = MUSIC_HISTORY.find(
      (e) => e.location.city === 'College Park',
    )!;
    expect(eventPlaceName(collegePark)).toBe('College Park');
  });

  it('keeps a name that is already the city’s', () => {
    const seattle = byId('evt-grunge-seattle-1991');
    expect(eventPlaceName(seattle)).toBe('Seattle');
  });
});
