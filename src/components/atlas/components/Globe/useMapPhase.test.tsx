// @vitest-environment jsdom
/**
 * The map's phase: ready once it has drawn, flying while the page flies it,
 * settled after; the spin and a reader's own dragging are neither.
 */
import { renderHook } from '@testing-library/react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { createStageSignals } from '@/components/atlas/state/stageSignals';
import { FLIGHT_EVENT, useMapPhase } from './useMapPhase';

function fakeMap() {
  const handlers = new Map<string, Set<(e: object) => void>>();
  const on = (type: string, fn: (e: object) => void) => {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(fn);
  };
  return {
    loaded: () => false,
    on,
    once: (type: string, fn: (e: object) => void) => on(type, fn),
    off: (type: string, fn: (e: object) => void) =>
      handlers.get(type)?.delete(fn),
    emit: (type: string, e: object = {}) =>
      [...(handlers.get(type) ?? [])].forEach((fn) => fn(e)),
  };
}

describe('the map’s phase', () => {
  it('is ready once drawn, flying on the page’s flights, then settled', () => {
    const map = fakeMap();
    const signals = createStageSignals();
    renderHook(() => useMapPhase(map as unknown as MapLibreMap, true, signals));
    expect(signals.mapPhase.get()).toBe('loading');
    map.emit('idle');
    expect(signals.mapPhase.get()).toBe('ready');
    // The spin, or a drag: not a flight.
    map.emit('movestart');
    expect(signals.mapPhase.get()).toBe('ready');
    map.emit('movestart', { ...FLIGHT_EVENT });
    expect(signals.mapPhase.get()).toBe('flying');
    map.emit('moveend');
    expect(signals.mapPhase.get()).toBe('flying');
    map.emit('moveend', { ...FLIGHT_EVENT });
    expect(signals.mapPhase.get()).toBe('settled');
  });

  it('waits for the land before it is ready', () => {
    const map = fakeMap();
    const signals = createStageSignals();
    renderHook(() =>
      useMapPhase(map as unknown as MapLibreMap, false, signals),
    );
    map.emit('idle');
    expect(signals.mapPhase.get()).toBe('loading');
  });
});
