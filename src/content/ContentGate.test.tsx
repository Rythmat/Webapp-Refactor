// @vitest-environment jsdom
import { Component, act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { ContentGate } from './ContentGate';

// A controllable stand-in for songStore: same contract (one memoised hydration
// promise, readiness flipped before that promise settles), but the test decides
// when — and whether — loading finishes.
const songs = vi.hoisted(() => {
  let ready = false;
  let hydration: Promise<void> | null = null;
  let settle: (error?: unknown) => void = () => {};
  return {
    ensure: () =>
      (hydration ??= new Promise<void>((resolve, reject) => {
        settle = (error) => {
          if (error) return reject(error);
          ready = true;
          resolve();
        };
      })),
    ready: () => ready,
    finish: () => settle(),
    fail: (error: unknown) => settle(error),
    reset: () => {
      ready = false;
      hydration = null;
    },
  };
});

vi.mock('./songStore', () => ({
  ensureSongContent: songs.ensure,
  isSongContentReady: songs.ready,
}));
vi.mock('./contentStore', () => ({
  ensureAtlasContent: () => Promise.resolve(),
  isAtlasContentReady: () => true,
}));
vi.mock('@/layouts/DashboardLayout', () => ({
  DashboardContentSkeleton: () => <p>loading</p>,
}));

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>failed</p> : this.props.children;
  }
}

let container: HTMLDivElement;
let root: Root;

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  songs.reset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ContentGate', () => {
  it('renders its children once content still loading at first render hydrates', async () => {
    await act(async () => {
      root.render(
        <ContentGate needs={['songs']}>
          <p>library</p>
        </ContentGate>,
      );
    });
    expect(container.textContent).toBe('loading');

    await act(async () => songs.finish());
    await flush();

    expect(container.textContent).toBe('library');
  });

  it('rethrows a failed hydration to the nearest error boundary', async () => {
    // React re-reports a caught render error through console and a window
    // `error` event; both are expected here, so keep them out of the output.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const quiet = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', quiet);
    onTestFinished(() => window.removeEventListener('error', quiet));
    await act(async () => {
      root.render(
        <Boundary>
          <ContentGate needs={['songs']}>
            <p>library</p>
          </ContentGate>
        </Boundary>,
      );
    });
    expect(container.textContent).toBe('loading');

    await act(async () => songs.fail(new Error('bundled data missing')));
    await flush();

    expect(container.textContent).toBe('failed');
  });
});
