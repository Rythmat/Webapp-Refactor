// @vitest-environment jsdom
/**
 * The MapLibre engine against a stand-in map: each kind of click goes where
 * the three.js globe sent it, a flight follows the motion setting, and the
 * details card turns into map padding. The map itself (WebGL, tiles) is
 * mocked; what it draws is covered by the pure tests beside this one.
 */
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { initialAppState } from '@/components/atlas/state/appReducer';
import {
  AtlasStoreProvider,
  createAtlasStore,
  type AtlasStore,
} from '@/components/atlas/state/atlasStore';
import type { PickedFeature } from './mapPicking';
import { LAYER } from './mapStyle';

const fake = vi.hoisted(() => {
  class FakeMap {
    static all: FakeMap[] = [];
    handlers = new Map<string, Set<(event?: unknown) => void>>();
    /** What queryRenderedFeatures answers. */
    features: unknown[] = [];
    zoom = 2;
    flyTo = vi.fn();
    jumpTo = vi.fn();
    easeTo = vi.fn();
    setFeatureState = vi.fn();
    removeFeatureState = vi.fn();
    setPaintProperty = vi.fn();
    remove = vi.fn();
    touchZoomRotate = { disableRotation: vi.fn() };
    keyboard = { disableRotation: vi.fn() };
    canvas = { style: {} as Record<string, string> };
    constructor(public options: unknown) {
      FakeMap.all.push(this);
    }
    on(type: string, fn: (event?: unknown) => void) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set());
      this.handlers.get(type)!.add(fn);
      return this;
    }
    once(type: string, fn: (event?: unknown) => void) {
      const wrapped = (event?: unknown) => {
        this.off(type, wrapped);
        fn(event);
      };
      return this.on(type, wrapped);
    }
    off(type: string, fn: (event?: unknown) => void) {
      this.handlers.get(type)?.delete(fn);
      return this;
    }
    emit(type: string, event?: unknown) {
      for (const fn of [...(this.handlers.get(type) ?? [])]) fn(event);
    }
    getSource() {
      return { setData: vi.fn() };
    }
    getLayer() {
      return {};
    }
    queryRenderedFeatures() {
      return this.features;
    }
    getZoom() {
      return this.zoom;
    }
    getCanvas() {
      return this.canvas;
    }
    getContainer() {
      return { clientHeight: 800 };
    }
    getCenter() {
      return { lng: 0, lat: 0 };
    }
    getPadding() {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    isMoving() {
      return false;
    }
    project() {
      return { x: 0, y: 0 };
    }
  }
  class FakePopup {
    setLngLat() {
      return this;
    }
    setHTML() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      return this;
    }
    isOpen() {
      return false;
    }
  }
  return { FakeMap, FakePopup };
});

vi.mock('maplibre-gl', () => ({
  Map: fake.FakeMap,
  Popup: fake.FakePopup,
  addProtocol: vi.fn(),
  setWorkerUrl: vi.fn(),
}));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({
  default: '/maplibre-gl-worker.mjs',
}));
vi.mock('pmtiles', () => ({
  Protocol: class {
    tile = vi.fn();
  },
}));
vi.mock('@/components/atlas/data/geoLoader', () => ({
  loadCountries: () => Promise.resolve([]),
  loadAdmin1UsCa: () => Promise.resolve([]),
}));

const { default: MapLibreGlobe } = await import('./MapLibreGlobe');

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  fake.FakeMap.all = [];
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

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

function setup(store: AtlasStore = createAtlasStore(), reduceMotion = false) {
  mockReducedMotion(reduceMotion);
  let search = '';
  const Where = () => {
    search = decodeURIComponent(useLocation().search);
    return null;
  };
  render(
    <MemoryRouter initialEntries={['/atlas/globe']}>
      <AtlasStoreProvider store={store}>
        <AtlasNavigationProvider>
          <MapLibreGlobe />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
      <Where />
    </MemoryRouter>,
  );
  const map = fake.FakeMap.all[0];
  act(() => map.emit('style.load'));
  const click = (feature: PickedFeature) => {
    map.features = [feature];
    act(() => map.emit('click', { point: { x: 10, y: 10 } }));
  };
  return { map, store, click, search: () => search };
}

const feature = (
  layer: string,
  properties: Record<string, unknown>,
): PickedFeature => ({ layer: { id: layer }, properties });

describe('clicks on the MapLibre globe', () => {
  it('open a city from its dot', () => {
    const { click, search } = setup();
    click(
      feature(LAYER.cityCircles, {
        cityId: 'new-orleans',
        name: 'New Orleans',
      }),
    );
    expect(search()).toContain('place=city:new-orleans');
  });

  it('open an event from an artist’s point or an arc', () => {
    const { click, search } = setup();
    click(feature(LAYER.artistPoints, { eventId: 'evt-jazz-nola-1923' }));
    expect(search()).toContain('event=evt-jazz-nola-1923');
    click(
      feature(LAYER.arcsHit, {
        eventId: 'evt-blues-clarksdale-1903',
        direction: 'downstream',
      }),
    );
    expect(search()).toContain('event=evt-blues-clarksdale-1903');
  });

  it('fly to a country’s centre and open it', () => {
    const { map, click, search } = setup();
    click(
      feature(LAYER.countriesFill, {
        _layer: 'country',
        NAME: 'Brazil',
        ISO_A3: 'BRA',
        clat: -10,
        clng: -52,
      }),
    );
    expect(search()).toContain('place=country:Brazil:BRA');
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-52, -10], essential: false }),
    );
  });

  it('open a state with its country', () => {
    const { click, search } = setup();
    click(
      feature(LAYER.statesFill, {
        _layer: 'state',
        name: 'Ontario',
        iso_a2: 'CA',
        clat: 50,
        clng: -85,
      }),
    );
    expect(search()).toContain('place=state:Ontario:Canada');
  });

  it('do nothing on the sea', () => {
    const { map, search } = setup();
    map.features = [];
    act(() => map.emit('click', { point: { x: 1, y: 1 } }));
    expect(search()).toBe('');
  });
});

describe('the MapLibre camera', () => {
  /** A page opened on a deep link to Lagos. */
  const deepLink = (reduce: boolean) =>
    setup(
      createAtlasStore({
        ...initialAppState,
        searchFlyTarget: { lat: 6.5, lng: 3.4, zoom: 8 },
      }),
      reduce,
    );

  it('starts a deep link over its target, then flies in', () => {
    const { map, store } = deepLink(false);
    expect(map.jumpTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [3.4, 6.5] }),
    );
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [3.4, 6.5], duration: 1500 }),
    );
    expect(store.api.getState().searchFlyTarget).toBeNull();
  });

  it('cuts instead of flying under reduced motion', () => {
    const { map } = deepLink(true);
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 0, essential: false }),
    );
  });

  it('pads the map clear of an open event card', () => {
    const { map, store } = setup();
    act(() =>
      store.dispatch({ type: 'SET_DETAILS_PANEL_WIDTH', payload: 480 }),
    );
    expect(map.easeTo).toHaveBeenLastCalledWith(
      expect.objectContaining({
        padding: expect.objectContaining({ left: 496 }),
      }),
    );
  });

  it('reports the state outlines in view from zoom 3', () => {
    const { map, store } = setup();
    expect(store.api.getState().statesInView).toBe(false);
    map.zoom = 3.2;
    act(() => map.emit('zoom'));
    expect(store.api.getState().statesInView).toBe(true);
  });
});
