// @vitest-environment jsdom
/**
 * The store's whole point: a component re-renders for the fields it selects
 * and for nothing else. The single context it replaced re-rendered every
 * reader — the WebGL globe included — on every dispatch.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import {
  AtlasStoreProvider,
  createAtlasStore,
  useAtlasDispatch,
  useAtlasSelector,
} from './atlasStore';

afterEach(cleanup);

const event: HistoricalEvent = {
  id: 'evt-test-1923',
  year: 1923,
  location: { lat: 0, lng: 0, city: 'Nowhere', country: 'US' },
  genre: ['Jazz'],
  title: 'A test event',
  description: '',
  tags: [],
};

function setup() {
  const store = createAtlasStore();
  const renders = { spin: 0, width: 0, pin: 0 };

  const Spin = () => {
    renders.spin += 1;
    const rotating = useAtlasSelector((s) => s.globeRotating);
    return <span data-testid="spin">{String(rotating)}</span>;
  };
  const Width = () => {
    renders.width += 1;
    const width = useAtlasSelector((s) => s.detailsPanelWidth);
    return <span data-testid="width">{width ?? 'none'}</span>;
  };
  // Selects a derived object; the equality keeps it from re-rendering when
  // the object is rebuilt with the same contents.
  const Pin = () => {
    renders.pin += 1;
    const pin = useAtlasSelector(
      (s) => ({ id: s.pinnedEvent?.id ?? null }),
      (a, b) => a.id === b.id,
    );
    return <span data-testid="pin">{pin.id ?? 'none'}</span>;
  };

  render(
    <AtlasStoreProvider store={store}>
      <Spin />
      <Width />
      <Pin />
    </AtlasStoreProvider>,
  );
  return { store, renders };
}

describe('atlas store', () => {
  it('re-renders only the component whose field changed', () => {
    const { store, renders } = setup();
    expect(renders).toEqual({ spin: 1, width: 1, pin: 1 });

    act(() =>
      store.dispatch({ type: 'SET_DETAILS_PANEL_WIDTH', payload: 512 }),
    );
    expect(screen.getByTestId('width')).toHaveTextContent('512');
    expect(renders).toEqual({ spin: 1, width: 2, pin: 1 });

    act(() => store.dispatch({ type: 'SET_GLOBE_ROTATING', payload: true }));
    expect(screen.getByTestId('spin')).toHaveTextContent('true');
    expect(renders).toEqual({ spin: 2, width: 2, pin: 1 });
  });

  it('notifies nobody when the reducer returns the same state', () => {
    const { store, renders } = setup();
    act(() => store.dispatch({ type: 'SET_GLOBE_ROTATING', payload: false }));
    act(() => store.dispatch({ type: 'EXIT_TOUR' }));
    expect(renders).toEqual({ spin: 1, width: 1, pin: 1 });
  });

  it('keeps a selected object when the equality says it is the same', () => {
    const { store, renders } = setup();
    // A new state object whose pin is unchanged.
    act(() => store.dispatch({ type: 'OPEN_INFLUENCE_ARCS' }));
    expect(renders.pin).toBe(1);

    act(() => store.dispatch({ type: 'PIN_EVENT', payload: event }));
    expect(screen.getByTestId('pin')).toHaveTextContent(event.id);
    expect(renders.pin).toBe(2);
  });

  it('runs actions dispatched from a component through the reducer', () => {
    const store = createAtlasStore();
    let dispatch: ReturnType<typeof useAtlasDispatch> | null = null;
    const Grab = () => {
      dispatch = useAtlasDispatch();
      return null;
    };
    render(
      <AtlasStoreProvider store={store}>
        <Grab />
      </AtlasStoreProvider>,
    );
    act(() => dispatch?.({ type: 'START_MODULE', payload: { moduleId: 'm' } }));
    expect(store.api.getState().activeModule).toEqual({
      moduleId: 'm',
      currentStep: 0,
    });
  });

  it('refuses to be read outside its provider', () => {
    const Orphan = () => {
      useAtlasSelector((s) => s.globeRotating);
      return null;
    };
    // React and jsdom both report the thrown error; keep the output clean.
    const error = console.error;
    const swallow = (e: ErrorEvent) => e.preventDefault();
    console.error = () => {};
    window.addEventListener('error', swallow);
    try {
      expect(() => render(<Orphan />)).toThrow(/AtlasStoreProvider/);
    } finally {
      console.error = error;
      window.removeEventListener('error', swallow);
    }
  });
});
