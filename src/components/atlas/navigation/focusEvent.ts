import type { Dispatch } from 'react';
import type {
  AppAction,
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { resolveEventRegion } from '@/components/atlas/utils/resolveEventRegion';

/**
 * Select an event's region, pin the event, and fly the camera to it.
 *
 * This sequence used to be copy-pasted into five places — the details card,
 * the timeline, the arc click, the pathway bar, and the deep-link handler —
 * each matching the event's city by exact name, and each silently doing nothing
 * for the ~24% of events whose city is spelled differently in CITIES or is not
 * there at all. It lives here once now, on the matcher whose contract is tested
 * in resolveEventRegion.test.ts.
 *
 * When the panel already open lists the event (expanding a card in Nashville's
 * list, or a pill pointing at a neighbour in the same state), this only pins
 * it: re-selecting would swap "Nashville" for "Tennessee" and fling the camera
 * for what was just a click on a card that was already on screen.
 *
 * Order matters: SELECT_LOCATION resets `pinnedEvent`, so it must run before
 * PIN_EVENT or the pin (and with it the expanded card) is wiped.
 */
export function focusEvent(
  dispatch: Dispatch<AppAction>,
  event: HistoricalEvent,
  current: SelectedLocation | null = null,
): void {
  const alreadyListed =
    current !== null &&
    getEventsForLocation(current).some((e) => e.id === event.id);
  if (alreadyListed) {
    dispatch({ type: 'PIN_EVENT', payload: event });
    return;
  }

  const { region, fly } = resolveEventRegion(event);
  dispatch({ type: 'SELECT_LOCATION', payload: region });
  dispatch({ type: 'PIN_EVENT', payload: event });
  dispatch({ type: 'EXECUTE_SEARCH', payload: fly });
}

/**
 * A camera target that frames a set of points: their centre, pulled back far
 * enough to show the widest spread. Used for an artist, whose events can sit
 * in one city or on three continents.
 */
export function flyToFit(
  points: { lat: number; lng: number }[],
): { lat: number; lng: number; zoom: number } | null {
  if (points.length === 0) return null;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const spread = Math.max(
    ...points.map((p) =>
      Math.max(Math.abs(p.lat - lat), Math.abs(p.lng - lng)),
    ),
  );
  // One city → street level; a coast → regional; continents → whole globe.
  const zoom = spread < 1 ? 8 : spread < 8 ? 6 : spread < 30 ? 4 : 2;
  return { lat, lng, zoom };
}

/* ── Camera hand-off between a globe click and the URL sync ──────────────────
 *
 * A polygon click knows the exact centroid of the shape it hit and flies there
 * at once. It then writes the stop to the URL, and the sync would fly AGAIN, to
 * a centroid rebuilt from CITIES — a visible double-move. The click marks its
 * stop as already flown; the sync consumes the mark and skips its own fly.
 */
let flownKey: string | null = null;

export function markFlown(stopKey: string): void {
  flownKey = stopKey;
}

export function consumeFlown(stopKey: string): boolean {
  if (flownKey !== stopKey) return false;
  flownKey = null;
  return true;
}
