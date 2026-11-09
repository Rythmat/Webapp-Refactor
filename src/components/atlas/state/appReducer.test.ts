import { describe, expect, it } from 'vitest';
import type { AppAction, HistoricalEvent } from '@/components/atlas/types';
import { appReducer, initialAppState } from './appReducer';

const event: HistoricalEvent = {
  id: 'evt-test-1923',
  year: 1923,
  location: { lat: 0, lng: 0, city: 'Nowhere', country: 'US' },
  genre: ['Jazz'],
  title: 'A test event',
  description: '',
  tags: [],
};

describe('atlas reducer — globe rotation', () => {
  it('starts still', () => {
    expect(initialAppState.globeRotating).toBe(false);
  });

  it('spins only when explicitly asked to', () => {
    const spinning = appReducer(initialAppState, {
      type: 'SET_GLOBE_ROTATING',
      payload: true,
    });
    expect(spinning.globeRotating).toBe(true);
    expect(
      appReducer(spinning, { type: 'SET_GLOBE_ROTATING', payload: false })
        .globeRotating,
    ).toBe(false);
  });

  /**
   * The globe used to start turning on its own: opening an influence section —
   * which playing a video also did — pulled the camera out and span it. That is
   * the regression this guards. Rotation is the user's to start.
   */
  it('is never started as a side effect of anything else', () => {
    const actions: AppAction[] = [
      { type: 'OPEN_INFLUENCE_ARCS' },
      { type: 'TOGGLE_ARC_DIRECTION', payload: 'upstream' },
      { type: 'TOGGLE_ARC_DIRECTION', payload: 'downstream' },
      { type: 'PIN_EVENT', payload: event },
      { type: 'SELECT_LOCATION', payload: { type: 'city', id: 'new-orleans' } },
      { type: 'EXECUTE_SEARCH', payload: { lat: 0, lng: 0, zoom: 6 } },
      { type: 'START_MODULE', payload: { moduleId: 'jazz-chain' } },
      { type: 'START_TOUR', payload: { tourId: 'region-north-america' } },
      { type: 'SET_WINDOW', payload: { from: 1900, to: 1945 } },
    ];
    const state = actions.reduce(appReducer, initialAppState);
    expect(state.globeRotating).toBe(false);
  });

  it('keeps spinning across the actions a click fires', () => {
    // Navigating to an event should not silently stop a spin the user started.
    const spinning = appReducer(initialAppState, {
      type: 'SET_GLOBE_ROTATING',
      payload: true,
    });
    const clickActions: AppAction[] = [
      { type: 'SELECT_LOCATION', payload: null },
      { type: 'PIN_EVENT', payload: event },
      { type: 'OPEN_INFLUENCE_ARCS' },
    ];
    const after = clickActions.reduce(appReducer, spinning);
    expect(after.globeRotating).toBe(true);
  });

  it('does not churn state identity when the value is unchanged', () => {
    const next = appReducer(initialAppState, {
      type: 'SET_GLOBE_ROTATING',
      payload: false,
    });
    expect(next).toBe(initialAppState);
  });
});

describe('atlas reducer — the time window', () => {
  it('starts on all of time', () => {
    expect(initialAppState.timeWindow).toBeNull();
  });

  it('keeps the pinned event when the window moves', () => {
    const pinned = appReducer(initialAppState, {
      type: 'PIN_EVENT',
      payload: event,
    });
    const moved = appReducer(pinned, {
      type: 'SET_WINDOW',
      payload: { from: 1946, to: 1979 },
    });
    expect(moved.timeWindow).toEqual({ from: 1946, to: 1979 });
    expect(moved.pinnedEvent).toBe(event);
  });

  it('keeps the state when the window has not changed', () => {
    const once = appReducer(initialAppState, {
      type: 'SET_WINDOW',
      payload: { from: 1946, to: 1979 },
    });
    expect(
      appReducer(once, {
        type: 'SET_WINDOW',
        payload: { from: 1946, to: 1979 },
      }),
    ).toBe(once);
    expect(
      appReducer(initialAppState, { type: 'SET_WINDOW', payload: null }),
    ).toBe(initialAppState);
  });
});

describe('atlas reducer — what covers the map', () => {
  const inspector = { top: 0, right: 408, bottom: 0, left: 0 };
  const cards = { top: 0, right: 0, bottom: 0, left: 307 };

  it('combines each zone’s insets, and forgets a zone that goes', () => {
    let state = appReducer(initialAppState, {
      type: 'SET_ZONE_INSETS',
      payload: { zone: 'inspector', insets: inspector },
    });
    state = appReducer(state, {
      type: 'SET_ZONE_INSETS',
      payload: { zone: 'cards', insets: cards },
    });
    expect(state.mapInsets).toEqual({
      top: 0,
      right: 408,
      bottom: 0,
      left: 307,
    });
    state = appReducer(state, {
      type: 'SET_ZONE_INSETS',
      payload: { zone: 'inspector', insets: null },
    });
    expect(state.mapInsets).toEqual(cards);
    expect(state.zoneInsets).toEqual({ cards });
  });

  it('hands back the same state when nothing changed', () => {
    const once = appReducer(initialAppState, {
      type: 'SET_ZONE_INSETS',
      payload: { zone: 'cards', insets: cards },
    });
    expect(
      appReducer(once, {
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'cards', insets: { ...cards } },
      }),
    ).toBe(once);
    expect(
      appReducer(initialAppState, {
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'phone', insets: null },
      }),
    ).toBe(initialAppState);
  });
});
