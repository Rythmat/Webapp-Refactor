// @vitest-environment jsdom
/**
 * Camera flights follow the system's motion setting: a 1.5 s flight
 * normally, a cut (duration 0) when reduced motion is asked for.
 */
import { cleanup, render } from '@testing-library/react';
import type { GlobeMethods } from 'react-globe.gl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialAppState } from '@/components/atlas/state/appReducer';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { flightDuration, GlobeController } from './GlobeController';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

/** A matchMedia that answers `reduce` to the reduced-motion query. */
const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

/** Fly to Lagos and report the durations the camera was asked for. */
function flyOnce() {
  const pointOfView = vi.fn();
  const globeRef = {
    current: {
      pointOfView,
      controls: () => ({ autoRotate: false, autoRotateSpeed: 0 }),
    } as unknown as GlobeMethods,
  };
  const store = createAtlasStore({
    ...initialAppState,
    searchFlyTarget: { lat: 6.5, lng: 3.4, zoom: 8 },
  });
  render(
    <AtlasStoreProvider store={store}>
      <GlobeController globeRef={globeRef} ready />
    </AtlasStoreProvider>,
  );
  return pointOfView.mock.calls.map(([, ms]) => ms as number);
}

describe('camera flights', () => {
  it('cut instead of flying when reduced motion is on', () => {
    mockReducedMotion(true);
    // The deep-link jump and the flight itself: both instant.
    expect(flyOnce()).toEqual([0, 0]);
  });

  it('fly for 1.5 s otherwise', () => {
    mockReducedMotion(false);
    expect(flyOnce()).toEqual([0, 1500]);
  });

  it('name their duration in one place', () => {
    expect(flightDuration(true)).toBe(0);
    expect(flightDuration(false)).toBe(1500);
  });
});
