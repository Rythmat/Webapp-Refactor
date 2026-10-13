import { afterEach, describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { CITIES } from './cities';
import { getModuleById } from './guides';
import { HISTORICAL_MODULES } from './historicalModules';
import { getCityById, getCityByName, getEventById } from './lookups';

const event = (id: string): HistoricalEvent => ({
  id,
  year: 1900,
  location: { lat: 0, lng: 0, city: 'Nowhere', country: 'US' },
  genre: [],
  title: id,
  description: '',
  tags: [],
});

afterEach(() => {
  MUSIC_HISTORY.length = 0;
});

describe('lookups', () => {
  it('finds events, and sees events added after the first lookup', () => {
    MUSIC_HISTORY.push(event('one'));
    expect(getEventById('one')?.id).toBe('one');
    expect(getEventById('two')).toBeUndefined();
    MUSIC_HISTORY.push(event('two'));
    expect(getEventById('two')?.id).toBe('two');
    expect(getEventById(undefined)).toBeUndefined();
  });

  it('finds cities by id and by name, ignoring case', () => {
    const city = CITIES[0];
    expect(getCityById(city.id)).toBe(city);
    expect(getCityByName(city.name.toUpperCase())).toBe(
      CITIES.find((c) => c.name.toLowerCase() === city.name.toLowerCase()),
    );
    expect(getCityById('no-such-city')).toBeUndefined();
  });

  it('finds pathways by id', () => {
    const mod = HISTORICAL_MODULES[0];
    expect(getModuleById(mod.id)).toBe(mod);
  });
});
