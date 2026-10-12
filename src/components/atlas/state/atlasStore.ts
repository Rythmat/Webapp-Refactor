import {
  createContext,
  createElement,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { AppAction, AppState } from '@/components/atlas/types';
import { appReducer, initialAppState } from './appReducer';

/**
 * The Globe page's state, as a store components subscribe to field by field.
 *
 * It used to be one React context holding the whole state, so every dispatch
 * re-rendered every reader — the WebGL globe included, 16 times in 2 s of
 * dragging the details card (docs/globe-ui/BASELINE.md). Now a component
 * re-renders only when the slice its selector returns changes.
 *
 * Actions still go through {@link appReducer}, the single source of truth, so
 * its tests cover the store. A reducer that returns the same state notifies
 * nobody.
 */
export interface AtlasStore {
  api: StoreApi<AppState>;
  dispatch: (action: AppAction) => void;
}

export function createAtlasStore(initial: AppState = initialAppState) {
  const api = createStore<AppState>()(() => initial);
  const dispatch = (action: AppAction) =>
    api.setState(appReducer(api.getState(), action), true);
  return { api, dispatch } satisfies AtlasStore;
}

const AtlasStoreContext = createContext<AtlasStore | null>(null);

/** One store per mounted Globe page, so leaving and coming back starts fresh. */
export function AtlasStoreProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** For tests: a store to share with the test body. */
  store?: AtlasStore;
}) {
  const [value] = useState(() => store ?? createAtlasStore());
  return createElement(AtlasStoreContext.Provider, { value }, children);
}

function useAtlasStore(): AtlasStore {
  const store = useContext(AtlasStoreContext);
  if (!store) {
    throw new Error('Atlas state is read outside <AtlasStoreProvider>.');
  }
  return store;
}

/**
 * Read one slice of the Globe's state. The component re-renders only when the
 * selected value changes by `equality` (`Object.is` unless given), so select
 * the narrowest thing you render: `s => s.pinnedEvent?.id`, not `s => s`.
 */
export function useAtlasSelector<T>(
  selector: (state: AppState) => T,
  equality: (a: T, b: T) => boolean = Object.is,
): T {
  const { api } = useAtlasStore();
  // Memoised on the state and the selector, and an equal result keeps the
  // previous value, so a selector that builds an object stays referentially
  // stable for useSyncExternalStore.
  const memo = useRef<{
    state: AppState;
    selector: (state: AppState) => T;
    value: T;
  } | null>(null);
  const getSnapshot = (): T => {
    const state = api.getState();
    const last = memo.current;
    if (last && last.state === state && last.selector === selector) {
      return last.value;
    }
    const next = selector(state);
    const value = last && equality(last.value, next) ? last.value : next;
    memo.current = { state, selector, value };
    return value;
  };
  return useSyncExternalStore(api.subscribe, getSnapshot, getSnapshot);
}

/** The Globe's dispatch. Stable for the life of the page. */
export function useAtlasDispatch(): (action: AppAction) => void {
  return useAtlasStore().dispatch;
}
