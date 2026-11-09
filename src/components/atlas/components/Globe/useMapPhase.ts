import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import type { StageSignals } from '@/components/atlas/state/stageSignals';

/** What the page's own flights carry on their events (useMapFlights). */
export const FLIGHT_EVENT = { atlasFlight: true } as const;

/** A flight that never reports its end is called settled after this. */
const SETTLE_AT_MOST_MS = 3000;

/**
 * The map's phase, for what waits on it (`mapPhase`): `ready` once it has
 * first drawn the land, `flying` while the page flies it somewhere, then
 * `settled`. The spin and a reader's own dragging are neither.
 */
export function useMapPhase(
  map: MapLibreMap | null,
  landReady: boolean,
  signals: StageSignals,
) {
  useEffect(() => {
    if (!map || !landReady) return;
    const phase = signals.mapPhase;
    const ready = () => {
      if (phase.get() === 'loading') phase.set('ready');
    };
    if (map.loaded()) ready();
    map.once('idle', ready);
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      if (phase.get() === 'flying') phase.set('settled');
    };
    // MapLibre puts a flight's event data on its events.
    const flown = (e: object) =>
      (e as { atlasFlight?: boolean }).atlasFlight === true;
    const onStart = (e: object) => {
      if (!flown(e)) return;
      phase.set('flying');
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, SETTLE_AT_MOST_MS);
    };
    const onEnd = (e: object) => {
      if (flown(e)) settle();
    };
    map.on('movestart', onStart);
    map.on('moveend', onEnd);
    return () => {
      map.off('idle', ready);
      map.off('movestart', onStart);
      map.off('moveend', onEnd);
      window.clearTimeout(timer);
    };
  }, [map, landReady, signals]);
}
