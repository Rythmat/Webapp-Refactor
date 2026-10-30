import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { SelectedLocation } from '@/components/atlas/types';

/**
 * The stage's passing signals: what the pointer is on, what a card row
 * points at, the map's phase. They change many times a second and mean
 * nothing a moment later, so they stay out of the store and the URL; each
 * is a small channel that a few components read with useChannel.
 */

export interface Channel<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: () => void): () => void;
}

/** A value with listeners, told only when it changes (`equal`). */
export function createChannel<T>(
  initial: T,
  equal: (a: T, b: T) => boolean = Object.is,
): Channel<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (equal(value, next)) return;
      value = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** What the pointer is on, over the map or the ring. */
export type HoverTarget =
  | { kind: 'place'; id: string }
  | { kind: 'region'; place: SelectedLocation }
  | { kind: 'event'; eventId: string }
  | { kind: 'link'; id: string; title: string; detail: string };

export interface PlaceHover {
  target: HoverTarget;
  /** Where the hover card hangs from, in viewport px. */
  anchor: { x: number; y: number };
}

/** The map's phase, for what waits on it (the intro, the cards' beats). */
export type MapPhase = 'loading' | 'ready' | 'flying' | 'settled';

export interface StageSignals {
  /** The place, region or link under the pointer (map → hover card). */
  placeHover: Channel<PlaceHover | null>;
  /** A link a card row or the ring points at (→ the map brightens it). */
  linkFocus: Channel<string | null>;
  /** A place a card row or the ring points at (→ the map lights it). */
  placeFocus: Channel<string | null>;
  /** Years a chart points at (charts ↔ the era rail). */
  yearFocus: Channel<{ from: number; to: number } | null>;
  mapPhase: Channel<MapPhase>;
  /** How far the map's places are raised now, px (the lifted region). */
  lift: Channel<number>;
}

const sameYears = (
  a: { from: number; to: number } | null,
  b: { from: number; to: number } | null,
) => a === b || (!!a && !!b && a.from === b.from && a.to === b.to);

export function createStageSignals(): StageSignals {
  return {
    placeHover: createChannel<PlaceHover | null>(null),
    linkFocus: createChannel<string | null>(null),
    placeFocus: createChannel<string | null>(null),
    yearFocus: createChannel<{ from: number; to: number } | null>(
      null,
      sameYears,
    ),
    mapPhase: createChannel<MapPhase>('loading'),
    lift: createChannel<number>(0),
  };
}

const StageSignalsContext = createContext<StageSignals | null>(null);

/** One set of signals per mounted Globe page. */
export function StageSignalsProvider({ children }: { children: ReactNode }) {
  const [signals] = useState(createStageSignals);
  return (
    <StageSignalsContext.Provider value={signals}>
      {children}
    </StageSignalsContext.Provider>
  );
}

let fallback: StageSignals | null = null;

/**
 * The page's signals. Outside a provider (a component tested on its own)
 * a shared set stands in, so a component never has to know.
 */
export function useStageSignals(): StageSignals {
  const signals = useContext(StageSignalsContext);
  if (signals) return signals;
  fallback ??= createStageSignals();
  return fallback;
}

/** A channel's value, re-rendering when it changes. */
export function useChannel<T>(channel: Channel<T>): T {
  return useSyncExternalStore(channel.subscribe, channel.get, channel.get);
}
