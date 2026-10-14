// @vitest-environment jsdom
/**
 * The river in a browser-less DOM: jsdom lays nothing out, so the river's
 * size is stubbed. What it checks is what a keyboard and a click reach — one
 * tab stop, arrows that rove a lane, an event that opens.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { AtlasStoreProvider } from '@/components/atlas/state/atlasStore';
import { TimeCameraProvider } from '@/components/atlas/timeline/TimeCamera';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import TimeRiver from './TimeRiver';

const event = (id: string, year: number, genre: string[]): HistoricalEvent => ({
  id,
  year,
  location: {
    lat: 29.95,
    lng: -90.07,
    city: 'New Orleans',
    country: 'United States',
  },
  genre,
  title: `Event ${id}`,
  description: '',
  tags: [],
});

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 1368,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 800,
  });
  globalThis.CSS ??= { escape: (s: string) => s } as typeof CSS;
});
afterAll(() => {
  // jsdom keeps its own (zero) sizes on Element; these shadowed them.
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
});
afterEach(() => {
  cleanup();
  MUSIC_HISTORY.length = 0;
});

function setup() {
  // Jazz lane: three events decades apart, so each is a marker of its own.
  MUSIC_HISTORY.push(
    event('j1', 1925, ['Jazz']),
    event('j2', 1955, ['Jazz']),
    event('j3', 1985, ['Jazz']),
    event('r1', 1970, ['Rock']),
  );
  const where = { search: '' };
  const Where = () => {
    where.search = useLocation().search;
    return null;
  };
  const view = render(
    <MemoryRouter initialEntries={['/atlas/globe?view=timeline']}>
      <AtlasStoreProvider>
        <AtlasNavigationProvider>
          <TimeCameraProvider>
            <TimeRiver active />
            <Where />
          </TimeCameraProvider>
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { ...view, where };
}

const markers = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-river-item]'),
];

describe('TimeRiver', () => {
  it('draws a marker for each event in view, with one tab stop', () => {
    const { container } = setup();
    const all = markers(container);
    expect(all.map((m) => m.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([
        'Event j1, New Orleans · 1925',
        'Event j2, New Orleans · 1955',
        'Event r1, New Orleans · 1970',
      ]),
    );
    expect(all.filter((m) => m.tabIndex === 0)).toHaveLength(1);
  });

  it('roves a lane with the arrow keys', () => {
    const { container } = setup();
    const byLabel = (label: string) =>
      markers(container).find((m) =>
        m.getAttribute('aria-label')?.startsWith(label),
      )!;
    act(() => byLabel('Event j1').focus());
    fireEvent.keyDown(byLabel('Event j1'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(byLabel('Event j2'));
    expect(byLabel('Event j2').tabIndex).toBe(0);
  });

  it('opens an event on the map', () => {
    const { container, where } = setup();
    const j2 = markers(container).find((m) =>
      m.getAttribute('aria-label')?.startsWith('Event j2'),
    )!;
    fireEvent.click(j2);
    expect(where.search).toBe('?event=j2');
  });

  it('names its years for a screen reader', () => {
    const { getByRole } = setup();
    expect(getByRole('region').getAttribute('aria-label')).toMatch(
      /^Music around the world, 1900–present$/,
    );
  });
});
