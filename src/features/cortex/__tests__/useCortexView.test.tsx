// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CortexWeb, WebLink, WebNode } from '../buildWeb';
import { growthSince, useCortexView } from '../useCortexView';

const USER = 'student-1';
const KEY = `music-atlas-cortex-view:${USER}`;

vi.mock('@/lib/local-store/userScope', () => ({
  getLocalStoreUserKey: () => USER,
}));

const node = (id: string, role: WebNode['role'] = 'activity'): WebNode => ({
  id,
  role,
  kind: role === 'activity' ? 'song' : 'genre',
  label: id,
  done: false,
  hollow: false,
  lastAt: 0,
  doneAt: 0,
});

const link = (source: string, target: string, hollow = false): WebLink => ({
  id: `${source}>${target}`,
  source,
  target,
  hollow,
});

const web = (nodes: WebNode[], links: WebLink[] = []): CortexWeb => ({
  nodes,
  links,
  activityCount: nodes.filter((n) => n.role === 'activity').length,
  connectionCount: links.filter((l) => !l.hollow).length,
});

const saved = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');

const partial = web([node('song:a')]);
const full = web(
  [node('song:a'), node('song:b'), node('genre:funk', 'concept')],
  [link('song:a', 'genre:funk'), link('song:b', 'genre:funk')],
);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'requestAnimationFrame',
    (run: FrameRequestCallback) => setTimeout(() => run(0), 0) as never,
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('growthSince', () => {
  it('calls nothing new on the first map there has ever been', () => {
    expect(growthSince(full, null).growth).toBeNull();
    expect(growthSince(full, null).bornNodes.size).toBe(0);
  });

  it('treats an empty record as the first map too', () => {
    // An earlier build could save one while the account was still loading.
    const { bornNodes, growth } = growthSince(full, { nodes: [], links: [] });
    expect(bornNodes.size).toBe(0);
    expect(growth).toBeNull();
  });

  it('prefers new connections to new activities', () => {
    expect(
      growthSince(full, { nodes: ['song:a', 'genre:funk'], links: [] }).growth,
    ).toBe('2 new connections');
    expect(
      growthSince(web([node('song:a'), node('song:b')]), {
        nodes: ['song:a'],
        links: [],
      }).growth,
    ).toBe('1 new activity');
  });
});

describe('useCortexView', () => {
  it('saves nothing while the account is loading', () => {
    renderHook(() => useCortexView(partial, { loading: true, layout: true }));
    expect(saved()).toBeNull();
  });

  it('finds nothing new when the account answers after a partial web', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 2,
        positions: {},
        nodes: full.nodes.map((n) => n.id),
        links: full.links.map((l) => l.id),
      }),
    );
    const { result, rerender } = renderHook(
      ({ w, loading }) => useCortexView(w, { loading, layout: false }),
      { initialProps: { w: partial, loading: true } },
    );
    rerender({ w: full, loading: false });
    expect(result.current.bornNodes.size).toBe(0);
    expect(result.current.caption).toBeNull();
  });

  it('never shrinks what has been seen', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 2,
        positions: {},
        nodes: ['song:a', 'song:gone'],
        links: ['song:gone>genre:funk'],
      }),
    );
    renderHook(() => useCortexView(partial, { loading: false, layout: false }));
    expect(saved().nodes).toEqual(['song:a', 'song:gone']);
    expect(saved().links).toEqual(['song:gone>genre:funk']);
  });

  it('keeps what was seen from an older record, but not where it sat', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        positions: { 'song:a': { x: 1, y: 2 } },
        nodes: ['song:a'],
        links: [],
      }),
    );
    const { result } = renderHook(() =>
      useCortexView(partial, { loading: false, layout: false }),
    );
    expect(result.current.bornNodes.size).toBe(0);
    expect(saved().positions).toEqual({});
    expect(saved().v).toBe(3);
  });

  it('never lays out when nothing needs positions', () => {
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const { result } = renderHook(() =>
      useCortexView(full, { loading: false, layout: false }),
    );
    expect(raf).not.toHaveBeenCalled();
    expect(result.current.positions).toBeNull();
  });

  it('lays out once something needs it', async () => {
    const { result, rerender } = renderHook(
      ({ layout }) => useCortexView(full, { loading: false, layout }),
      { initialProps: { layout: false } },
    );
    rerender({ layout: true });
    await vi.waitFor(() => expect(result.current.positions).not.toBeNull());
    expect(Object.keys(result.current.positions ?? {}).sort()).toEqual(
      full.nodes.map((n) => n.id).sort(),
    );
    expect(saved().positions['song:a']).toBeDefined();
  });

  it('keeps what is new under StrictMode, then lets it settle', () => {
    vi.useFakeTimers();
    localStorage.setItem(
      KEY,
      JSON.stringify({ v: 2, positions: {}, nodes: ['song:a'], links: [] }),
    );
    const { result } = renderHook(
      () => useCortexView(full, { loading: false, layout: false }),
      { wrapper: StrictMode },
    );
    expect([...result.current.bornNodes].sort()).toEqual([
      'genre:funk',
      'song:b',
    ]);
    expect(result.current.caption).toBe('2 new connections');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.bornNodes.size).toBe(0);
    // The caption stays up for the visit.
    expect(result.current.caption).toBe('2 new connections');
  });
});
