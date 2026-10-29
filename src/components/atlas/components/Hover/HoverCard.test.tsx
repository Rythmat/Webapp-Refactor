// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtlasStoreProvider } from '@/components/atlas/state/atlasStore';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import HoverCard from './HoverCard';

beforeEach(() => {
  MUSIC_HISTORY.length = 0;
  MUSIC_HISTORY.push({
    id: 'a',
    year: 1955,
    title: 'A moment',
    description: '',
    genre: [],
    tags: [],
    location: { lat: 29.95, lng: -90.07, city: 'New Orleans', country: 'US' },
  } as HistoricalEvent);
});
afterEach(() => {
  cleanup();
  MUSIC_HISTORY.length = 0;
});

const card = () =>
  document.querySelector<HTMLElement>('[data-atlas-hover-card]');

describe('the hover card', () => {
  it('names the place, its events and their eras, out of the way of readers', () => {
    render(
      <AtlasStoreProvider>
        <HoverCard
          hover={{
            target: { kind: 'place', id: 'new-orleans' },
            anchor: { x: 200, y: 200 },
          }}
        />
      </AtlasStoreProvider>,
    );
    expect(card()?.textContent).toContain('New Orleans');
    expect(card()?.textContent).toContain('1 event');
    expect(card()?.getAttribute('aria-hidden')).toBe('true');
    expect(card()?.querySelector('.bg-atlas-era-postwar')).not.toBeNull();
  });

  it('shows nothing for what it doesn’t know', () => {
    render(
      <AtlasStoreProvider>
        <HoverCard
          hover={{
            target: { kind: 'place', id: 'atlantis' },
            anchor: { x: 0, y: 0 },
          }}
        />
      </AtlasStoreProvider>,
    );
    expect(card()).toBeNull();
  });
});
