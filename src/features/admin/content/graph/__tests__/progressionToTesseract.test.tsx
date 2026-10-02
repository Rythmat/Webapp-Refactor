// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGraph, type GraphSnapshot } from '@/content/graph/deriveGraph';
import type { Song } from '@/curriculum/types/songLibrary';
import { MindMapPage } from '../MindMapPage';
import type { WebglGraphRenderer } from '../map/render/webglRenderer';
import { storeView } from '../tesseract/tesseractLinks';

/**
 * Cortex to Tesseract (owner, 1 Oct 2026): a plain click on a
 * progression's dot opens it in Tesseract, in the last key the map showed,
 * with its row beside the map; Cmd- or Ctrl-click opens its row beside
 * Cortex's graph, as every other dot's click does; a song's dot still opens
 * its row here.
 *
 * Cortex's page over a one-song, one-progression snapshot, drawn through a
 * renderer that keeps nothing (jsdom has no WebGL); the dots are clicked
 * where the canvas's dev hook says they are.
 */

const song = (id: string, title: string, artist: string) =>
  ({
    id,
    title,
    artist,
    year: 1982,
    key: 'B',
    mode: 'major',
    genreTags: ['rock'],
  }) as unknown as Song;

const snapshot: GraphSnapshot = {
  songs: [song('africa', 'Africa', 'Toto')],
  progressions: [
    {
      id: 12,
      progression: '1 major7 - 4 major7',
      songIds: ['africa'],
      vibes: [],
      styles: [],
    },
  ],
};

vi.mock('../map/render/webglRenderer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../map/render/webglRenderer')>();
  return {
    ...actual,
    createWebglRenderer: (): WebglGraphRenderer => {
      let dirty = true;
      const mark = () => {
        dirty = true;
      };
      return {
        get isDirty() {
          return dirty;
        },
        isLost: false,
        stats: { frames: 0, lastFrameMs: 0 },
        gpu: 'none',
        setGraph: mark,
        setPositions: mark,
        setColors: mark,
        setNodeFlags: mark,
        setHighlight: mark,
        setCamera: mark,
        setStyle: mark,
        resize: mark,
        render() {
          dirty = false;
        },
        destroy() {},
      };
    },
  };
});
vi.mock('../map/render/labelLayer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../map/render/labelLayer')>();
  return { ...actual, createLabelLayer: () => null };
});
vi.mock('../repoSnapshot', () => ({
  loadRepoGraph: async () => ({ snapshot, graph: buildGraph(snapshot) }),
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'token', role: 'admin' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    capabilities: {},
    feature: () => false,
    isServed: () => false,
    isAuthoritative: () => false,
    identityOf: () => 'slug',
    songSchemaLevel: 0,
    schemaVersionOf: () => 0,
    servedKinds: [],
    store: 'api',
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  return {
    ...actual,
    contentRequest: async () => ({ items: [], nextCursor: null }),
  };
});

const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
  HTMLElement.prototype.getBoundingClientRect = function rect() {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      toJSON: () => ({}),
    } as DOMRect;
  };
});
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect;
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

let lastLocation = '';
const Where = () => {
  const { pathname, search } = useLocation();
  lastLocation = `${pathname}${search}`;
  return null;
};

const renderAt = (path: string) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/console/cortex" element={<MindMapPage />}>
            <Route path=":table/:row" element={null} />
          </Route>
          <Route
            path="/console/cortex/tesseract/*"
            element={<p data-testid="tesseract">Tesseract</p>}
          />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** Wait for the layout to settle and the dots to be drawn. */
const settled = () =>
  waitFor(() => {
    const hook = window.__atlasGraphDebug;
    expect(hook?.settled).toBe(true);
    expect(hook?.screenPositionOf('progression:12')).toBeTruthy();
  });

/** A click on the graph at a dot, with the keys held as it is let go. */
const click = (
  id: string,
  keys: { metaKey?: boolean; ctrlKey?: boolean } = {},
) => {
  const at = window.__atlasGraphDebug!.screenPositionOf(id)!;
  const region = screen.getByRole('application');
  for (const type of ['pointerdown', 'pointerup'] as const) {
    const event = new MouseEvent(type, {
      bubbles: true,
      clientX: at.x,
      clientY: at.y,
      button: 0,
      buttons: type === 'pointerdown' ? 1 : 0,
      metaKey: keys.metaKey ?? false,
      ctrlKey: keys.ctrlKey ?? false,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    act(() => {
      region.dispatchEvent(event);
    });
  }
};

describe('a progression’s dot in Cortex', () => {
  it('opens it in Tesseract, in the last key, with its row beside the map', async () => {
    storeView({
      key: 'Eb',
      notation: 'jazz',
      list: false,
      open: { depth: 2, open: [], fold: [] },
    });
    renderAt('/console/cortex?focus=progression:12');
    await settled();
    click('progression:12');
    await screen.findByTestId('tesseract');
    expect(lastLocation).toBe(
      '/console/cortex/tesseract/progressions/12?key=Eb&depth=2',
    );
  });

  it('opens in C, two deep, when the map was never opened here', async () => {
    renderAt('/console/cortex?focus=progression:12');
    await settled();
    click('progression:12');
    await screen.findByTestId('tesseract');
    expect(lastLocation).toBe(
      '/console/cortex/tesseract/progressions/12?depth=2',
    );
  });

  it('opens its row beside the graph with Cmd or Ctrl held', async () => {
    renderAt('/console/cortex?focus=progression:12');
    await settled();
    click('progression:12', { metaKey: true });
    await waitFor(() =>
      expect(lastLocation).toBe(
        '/console/cortex/progressions/12?focus=progression%3A12',
      ),
    );
    click('song:africa');
    await waitFor(() =>
      expect(lastLocation).toBe(
        '/console/cortex/songs/africa?focus=progression%3A12',
      ),
    );
    click('progression:12', { ctrlKey: true });
    await waitFor(() =>
      expect(lastLocation).toBe(
        '/console/cortex/progressions/12?focus=progression%3A12',
      ),
    );
    expect(screen.queryByTestId('tesseract')).toBeNull();
  });
});
