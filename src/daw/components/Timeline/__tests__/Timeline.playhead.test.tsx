// @vitest-environment jsdom
import { useEffect } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

// ── Timeline playhead (timeline-23) and the Prism item's lock (decision 8) ──
// The Timeline subscribed to the transport position at its top level, so the
// whole 3,000-line component re-rendered with every playback tick (~30 a
// second) to move one line, and its inline handle ref re-measured the scroll
// each time. The playhead is now a child that subscribes itself.
//
// Prism is part of Premium: the context menu's Suggest Chords item shows a
// free student the lock instead of opening the suggestion modal.

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

import { ProfileRoutes } from '@/constants/routes';
import { useStore } from '@/daw/store';
import { tickToPixel } from '@/daw/utils/timelineScale';
import {
  CHORD_RULER_HEIGHT,
  RULER_HEIGHT,
  TRACK_HEIGHT,
  Timeline,
} from '../Timeline';

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

/** The Timeline inside a scroller, as TimelineWithHeaders mounts it, with
 *  the scroller's scrollTop reads counted. */
function renderTimeline() {
  let scrollTopReads = 0;
  const view = render(
    <div
      ref={(node) => {
        if (!node) return;
        Object.defineProperty(node, 'scrollTop', {
          configurable: true,
          get: () => {
            scrollTopReads += 1;
            return 0;
          },
        });
      }}
    >
      <Timeline />
    </div>,
  );
  return { ...view, scrollTopReads: () => scrollTopReads };
}

const playhead = () =>
  [...document.querySelectorAll<HTMLDivElement>('div')].find(
    (el) =>
      el.style.backgroundColor !== '' &&
      el.style.transform.startsWith('translateX(') &&
      el.style.width === '2px',
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
  s().addTrack('midi', 'piano-sampler', 'Keys');
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
    expect(parseFloat(handle.style.top)).toBeLessThan(RULER_HEIGHT);
  });

  it('hides the playhead once it leaves the view', () => {
    renderTimeline();
    act(() => s().setPosition(1_000_000));
    expect(playhead()).toBeUndefined();
    act(() => s().setPosition(0));
    expect(playhead()).toBeTruthy();
  });
});

describe('Suggest Chords in the context menu', () => {
  /** Right-click the empty first track lane. */
  function openBlankTrackMenu() {
    const canvas = document.querySelector('canvas')!;
    fireEvent.contextMenu(canvas, {
      clientX: 200,
      clientY: RULER_HEIGHT + CHORD_RULER_HEIGHT + TRACK_HEIGHT / 2,
    });
  }

  let open: Mock<(tick: number, trackId: string) => void>;
  beforeEach(() => {
    open = vi.fn<(tick: number, trackId: string) => void>();
    useStore.setState({ openPrismSuggestion: open });
  });

  it('opens Prism’s suggestions for a premium student', () => {
    renderTimeline();
    openBlankTrackMenu();
    fireEvent.click(screen.getByRole('button', { name: /Suggest Chords/ }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][1]).toBe(s().tracks[0].id);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('is locked for a free student, and leads to the plans', () => {
    h.premium = { isPremium: false, isLoading: false };
    renderTimeline();
    openBlankTrackMenu();
    const item = screen.getByRole('button', {
      name: 'Prism — Suggest Chords (Premium, locked)',
    });
    expect(item.textContent).toContain('Premium');
    fireEvent.click(item);

    expect(open).not.toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith(ProfileRoutes.plan.definition);
    // The menu closed.
    expect(screen.queryByRole('button', { name: /Suggest Chords/ })).toBeNull();
  });

  it('never sends a student away while their plan is still loading', () => {
    h.premium = { isPremium: false, isLoading: true };
    renderTimeline();
    openBlankTrackMenu();
    fireEvent.click(screen.getByRole('button', { name: /Suggest Chords/ }));

    expect(open).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
