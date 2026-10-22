// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── Timeline playhead (timeline-23) ─────────────────────────────────────────
// The Timeline subscribed to the transport position at its top level, so the
// whole 3,000-line component re-rendered with every playback tick (~30 a
// second) to move one line, and its inline handle ref re-measured the scroll
// each time. The playhead is now a child that subscribes itself, and since
// 1.7 it is painted through a ref from the playhead clock: playback moves it
// without rendering even that child, and without writing the store.
//
// The canvas menu's Prism lock (decision 8) is clipMenu.test.tsx's now.

const h = vi.hoisted(() => ({
  commits: {} as Record<string, number>,
  premium: { isPremium: true, isLoading: false },
  navigate: null as unknown as (to: string) => void,
}));

vi.mock('@/daw/dev/DevProfiler', () => ({
  useDevCommitCount: (id: string) => {
    // As the real hook: once per commit of the calling component.
    useEffect(() => {
      h.commits[id] = (h.commits[id] ?? 0) + 1;
    });
  },
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => h.premium,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => h.navigate,
}));

import {
  endPlayheadRun,
  setPlayheadSourceForTests,
  startPlayheadRun,
} from '@/daw/engine/playheadClock';
import { useStore } from '@/daw/store';
import { tickToPixel } from '@/daw/utils/timelineScale';
import { RULER_PX } from '@/daw/shell/tracklist/rowLayout';
import { ScrolledTimeline } from './scrolledTimeline';

const s = () => useStore.getState();
const VIEWPORT = 1200;

// jsdom lays nothing out, and has no 2D canvas (the canvas draw just
// returns): the playhead needs a viewport to be drawn in.
const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const getContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => VIEWPORT,
  });
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
});
afterAll(() => {
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

/** The Timeline inside its scroller, as TrackArea mounts it, with the
 *  scroller's scrollTop reads counted. */
function renderTimeline() {
  let scrollTopReads = 0;
  const view = render(
    <ScrolledTimeline
      onScroller={(node) => {
        Object.defineProperty(node, 'scrollTop', {
          configurable: true,
          get: () => {
            scrollTopReads += 1;
            return 0;
          },
        });
      }}
    />,
  );
  return { ...view, scrollTopReads: () => scrollTopReads };
}

/** The playhead line, while it is shown. */
const playhead = () =>
  [...document.querySelectorAll<HTMLDivElement>('div')].find(
    (el) =>
      el.style.backgroundColor !== '' &&
      el.style.transform.startsWith('translateX(') &&
      el.style.width === '1px' &&
      el.style.display !== 'none',
  );

beforeEach(() => {
  h.commits = {};
  h.premium = { isPremium: true, isLoading: false };
  h.navigate = vi.fn();
  useStore.setState({
    tracks: [],
    position: 0,
    timelineZoom: 1,
    timelineScrollLeft: 0,
    remoteUsers: new Map(),
    isCollabActive: false,
  });
  s().addTrack('midi', 'soundfont', 'Keys');
});

afterEach(cleanup);

describe('playback', () => {
  it('moves the playhead without re-rendering the Timeline', () => {
    const view = renderTimeline();
    const committed = h.commits.Timeline;
    expect(committed).toBeGreaterThan(0);
    const reads = view.scrollTopReads();

    for (let i = 1; i <= 20; i++) act(() => s().setPosition(i * 60));

    expect(h.commits.Timeline).toBe(committed);
    const line = playhead()!;
    expect(line).toBeTruthy();
    expect(line.style.transform).toBe(
      `translateX(${tickToPixel(1200, 1, 0)}px)`,
    );
    // The grab handle was pinned once, not re-attached at every tick.
    expect(view.scrollTopReads()).toBe(reads);
  });

  it('keeps the grab handle on the bar ruler', () => {
    renderTimeline();
    act(() => s().setPosition(480));
    const handle = playhead()!.firstElementChild as HTMLDivElement;
    expect(handle.style.top).not.toBe('');
    expect(parseFloat(handle.style.top)).toBeLessThan(RULER_PX);
  });

  it('is Suno’s: a 1 px line under a round head, grey stopped, white playing', () => {
    renderTimeline();
    act(() => s().setPosition(480));
    const line = playhead()!;
    const head = line.firstElementChild as HTMLDivElement;
    expect(head.style.borderRadius).toBe('50%');
    expect(line.style.backgroundColor).toBe('var(--daw-text-3)');
    act(() => useStore.setState({ isPlaying: true }));
    expect(playhead()!.style.backgroundColor).toBe('var(--daw-playhead)');
    expect(head.style.backgroundColor).toBe('var(--daw-playhead)');
    act(() => useStore.setState({ isPlaying: false }));
  });

  it('hides the playhead once it leaves the view', () => {
    renderTimeline();
    act(() => s().setPosition(1_000_000));
    expect(playhead()).toBeUndefined();
    act(() => s().setPosition(0));
    expect(playhead()).toBeTruthy();
  });
});

describe('playback through the playhead clock', () => {
  // 120 bpm: 960 ticks a second, the transport started at 0 from tick 0.
  const now = { t: 0 };
  let frames: FrameRequestCallback[] = [];
  const runFrame = () => {
    const due = frames;
    frames = [];
    for (const cb of due) act(() => cb(performance.now()));
  };

  beforeEach(() => {
    now.t = 0;
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
    setPlayheadSourceForTests({
      currentTime: () => now.t,
      outputLatency: () => 0,
      ticksAtTime: (time) => time * 960,
      scheduleTime: () => now.t + 0.1,
    });
  });
  afterEach(() => {
    endPlayheadRun();
    setPlayheadSourceForTests();
    vi.unstubAllGlobals();
  });

  it('moves the line every frame, rendering nothing and writing no store', () => {
    renderTimeline();
    const committed = h.commits.Timeline;
    let writes = 0;
    const off = useStore.subscribe(() => (writes += 1));
    startPlayheadRun(0, 0);

    for (let i = 1; i <= 30; i++) {
      now.t = i / 30;
      runFrame();
    }
    off();

    expect(playhead()!.style.transform).toBe(
      `translateX(${tickToPixel(960, 1, 0)}px)`,
    );
    expect(h.commits.Timeline).toBe(committed);
    expect(writes).toBe(0);
    expect(s().position).toBe(0);
  });

  it('hit-tests the ruler against the line where it is heard', () => {
    // Pressing where the line is now (two seconds in) grabs it rather than
    // seeking, though the store still holds the tick play began from.
    renderTimeline();
    startPlayheadRun(0, 0);
    now.t = 2;
    runFrame();
    const canvas = document.querySelector('canvas')!;
    const x = tickToPixel(1920, 1, 0);
    fireEvent.mouseMove(canvas, { clientX: x, clientY: RULER_PX - 2 });
    expect(canvas.style.cursor).toBe('grab');
  });
});
