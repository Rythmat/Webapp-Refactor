// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
} from 'vitest';

// ── Markers on the timeline's ruler (milestone 2.13, plan finding F8) ──────
// A marker is found over what is drawn, its flag and its name, in the
// bar-number lane. A click there goes to the marker and a drag moves it
// from where it was taken hold of, on the grid, as one undo step; the
// cursor shows a grab hand over exactly the flag and the name; a right-click
// on the name opens the marker's menu, elsewhere the ruler's; a double-click
// renames it, elsewhere adds one there, named in the app's dialog first, as
// Alt+M does at the playhead. A press on the name used to seek instead. Run:
// npx vitest run src/daw/components/Timeline/__tests__/Timeline.markers.test.tsx

const h = vi.hoisted(() => ({
  premium: { isPremium: true, isLoading: false },
  navigate: (() => {}) as (to: string) => void,
  seeks: [] as number[],
  /** What the name dialog answers: a name, or null for Cancel. */
  typed: null as string | null,
  /** Ask the app's own dialog instead (the test mounts a DialogHost). */
  realDialog: false,
  /** What each name dialog was asked with. */
  prompts: [] as PromptOptions[],
}));
vi.mock('@/hooks/useIsPremium', () => ({ useIsPremium: () => h.premium }));
vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('@/daw/hooks/useTransport', () => ({
  seekTo: (tick: number) => {
    h.seeks.push(tick);
  },
}));
vi.mock('@/daw/ui/DialogHost', async (original) => {
  const real = await original<typeof import('@/daw/ui/DialogHost')>();
  return {
    ...real,
    promptDialog: (options: PromptOptions) => {
      h.prompts.push(options);
      return h.realDialog
        ? real.promptDialog(options)
        : Promise.resolve(h.typed);
    },
  };
});

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { getCommand } from '@/daw/commands/registry';
import {
  endPlayheadRun,
  setPlayheadSourceForTests,
  startPlayheadRun,
} from '@/daw/engine/playheadClock';
import { useCanvasMenuStore } from '@/daw/shell/canvas/clipMenu/canvasMenuStore';
import { RULER_PX } from '@/daw/shell/tracklist/rowLayout';
import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import { DialogHost, type PromptOptions } from '@/daw/ui/DialogHost';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { LOOP_STRIP_H } from '@/daw/utils/rulerLoop';
import { pixelToTick, tickToPixel } from '@/daw/utils/timelineScale';
import { ScrolledTimeline } from './scrolledTimeline';

const s = () => useStore.getState();
const VIEWPORT = 1200;
/** What measureText answers here, as markerUnder's fallback does: 6 px a
 *  character. */
const CHAR_PX = 6;

/** Text the canvas drew, where. */
const drawn: Array<{ text: string; x: number; y: number }> = [];

/** A 2D context that paints nothing, records its text and measures it. */
function recordingContext() {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        return (text: string) => ({ width: text.length * CHAR_PX });
      }
      if (prop === 'fillText') {
        return (text: string, x: number, y: number) => {
          drawn.push({ text, x, y });
        };
      }
      return () => ({ addColorStop() {} });
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const getContext = HTMLCanvasElement.prototype.getContext;
let uninstallKeys: () => void;
beforeAll(() => {
  installDomShims();
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => VIEWPORT,
  });
  HTMLCanvasElement.prototype.getContext = (() =>
    recordingContext()) as unknown as typeof getContext;
  uninstallKeys = installKeyDispatcher();
});
afterAll(() => {
  uninstallKeys();
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

// 'Chorus' at bar 2: its flag at x 160 (to 167), its name drawn from 170 to
// 206; with the slack, it is found from 157 to 209.
const CHORUS_TICK = 1920;
const FLAG_X = tickToPixel(CHORUS_TICK, 1, 0);
const NAME_X = FLAG_X + 10;
const NAME_END = NAME_X + 'Chorus'.length * CHAR_PX;
/** On the name, 40 px after the flag: 480 ticks into the marker. */
const ON_NAME = FLAG_X + 40;
/** The middle of the bar-number lane, under the loop strip. */
const LANE_Y = LOOP_STRIP_H + (RULER_PX - LOOP_STRIP_H) / 2;
/** Bare ruler in bar 4: x 525, tick 6300, on the quarter grid 6240. */
const BARE_X = 525;
const BARE_TICK = 3 * 1920 + 480;

let chorusId = '';
const chorus = () => s().markers.find((m) => m.id === chorusId)!;
let stopHistory: () => void;

beforeEach(() => {
  h.premium = { isPremium: true, isLoading: false };
  h.navigate = vi.fn();
  h.seeks = [];
  h.typed = null;
  h.realDialog = false;
  h.prompts = [];
  drawn.length = 0;
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    currentView: 'arrange',
    activeTool: 'cursor',
    timelineZoom: 1,
    timelineScrollLeft: 0,
    timelineSnapEnabled: true,
    timelineGridSize: '1/4',
    position: 0,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 7680,
  });
  useCanvasMenuStore.setState({ request: null });
  s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMarker(CHORUS_TICK, 'Chorus');
  chorusId = s().markers[0].id;
  resetHistory();
  stopHistory = startHistory();
});
afterEach(() => {
  cleanup();
  stopHistory();
});

const canvas = () => document.querySelector('canvas')!;
const press = (x: number, y = LANE_Y) =>
  fireEvent.mouseDown(canvas(), { clientX: x, clientY: y, button: 0 });
const move = (x: number, y = LANE_Y) =>
  fireEvent.mouseMove(canvas(), { clientX: x, clientY: y });
const release = (x: number, y = LANE_Y) =>
  fireEvent.mouseUp(canvas(), { clientX: x, clientY: y, button: 0 });
const click = (x: number, y = LANE_Y) => {
  press(x, y);
  release(x, y);
};
/** A press, a move past the slop, on to `to`, and the release there. */
const drag = (from: number, to: number) => {
  press(from);
  move(from + Math.sign(to - from) * 10);
  move(to);
  release(to);
};
/** As a browser sends a double-click: two clicks, then the dblclick. */
const doubleClick = (x: number, y = LANE_Y) => {
  click(x, y);
  click(x, y);
  fireEvent.doubleClick(canvas(), { clientX: x, clientY: y });
};
const cursorAt = (x: number, y = LANE_Y) => {
  move(x, y);
  return canvas().style.cursor;
};
const rightClick = (x: number, y = LANE_Y) =>
  fireEvent.contextMenu(canvas(), { clientX: x, clientY: y });
const menuTarget = () => useCanvasMenuStore.getState().request?.target;
const items = () =>
  [...screen.getByRole('menu').querySelectorAll('[data-item]')].map((el) =>
    el.getAttribute('data-item'),
  );
/** Where the canvas last drew a text. */
const lastDrawn = (text: string) => drawn.filter((d) => d.text === text).at(-1);
/** Lets the dialog's answer, and what follows it, settle. */
const settle = () => act(() => new Promise((r) => setTimeout(r, 0)));
const pressKey = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });
const ALT_M = { code: 'KeyM', key: 'µ', altKey: true };

describe('a click on a marker', () => {
  it('goes to the marker, from its flag or its name', () => {
    render(<ScrolledTimeline />);
    click(FLAG_X + 2);
    // 40 px after the flag: the bare ruler here would seek to tick 2400.
    click(ON_NAME);
    expect(pixelToTick(ON_NAME, 1, 0)).toBe(2400);
    expect(h.seeks).toEqual([CHORUS_TICK, CHORUS_TICK]);
    expect(chorus().tick).toBe(CHORUS_TICK);
    expect(historyLabels()).toEqual([]);
  });

  it('stays a click within 3 px of the press', () => {
    render(<ScrolledTimeline />);
    press(ON_NAME);
    move(ON_NAME + 3);
    move(ON_NAME - 3);
    release(ON_NAME - 3);
    expect(h.seeks).toEqual([CHORUS_TICK]);
    expect(chorus().tick).toBe(CHORUS_TICK);
  });

  it('is in the bar-number lane only, 14 to 32 px under the ruler’s top', () => {
    render(<ScrolledTimeline />);
    click(FLAG_X + 2, LOOP_STRIP_H);
    click(FLAG_X + 2, RULER_PX - 1);
    expect(h.seeks).toEqual([CHORUS_TICK, CHORUS_TICK]);
    // Above it the loop strip's click toggles the loop; below it the chord
    // lane's selects chords. Neither seeks.
    click(ON_NAME, LOOP_STRIP_H - 1);
    expect(s().loopEnabled).toBe(true);
    click(ON_NAME, RULER_PX);
    expect(h.seeks).toEqual([CHORUS_TICK, CHORUS_TICK]);
  });

  it('finds it where the ruler is drawn, at the scroll top', async () => {
    const scroller = { current: null as HTMLDivElement | null };
    render(
      <ScrolledTimeline
        onScroller={(node) => {
          scroller.current = node;
        }}
      />,
    );
    // The lanes scroll down 100 px: the rulers are redrawn at the top.
    Object.defineProperty(scroller.current!, 'scrollTop', {
      configurable: true,
      get: () => 100,
    });
    fireEvent.scroll(scroller.current!);
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    expect(lastDrawn('Chorus')).toEqual({
      text: 'Chorus',
      x: NAME_X,
      y: 100 + LANE_Y,
    });
    click(ON_NAME, 100 + LANE_Y);
    expect(h.seeks).toEqual([CHORUS_TICK]);
    // The canvas's top is lane now: a click there seeks under the pointer.
    click(ON_NAME, LANE_Y);
    expect(h.seeks).toEqual([CHORUS_TICK, 2400]);
  });

  it('finds a long name still in view, drawn, though its flag has scrolled off', () => {
    // Its flag 80 px off the left: the name runs from -70 to 26. It used to
    // be left undrawn past -60 px, and still found.
    s().updateMarker(chorusId, { name: 'Pre-chorus build' });
    useStore.setState({ timelineScrollLeft: 240 });
    render(<ScrolledTimeline />);
    expect(tickToPixel(CHORUS_TICK, 1, 240)).toBe(-80);
    expect(lastDrawn('Pre-chorus build')?.x).toBe(-70);
    expect(cursorAt(10)).toBe('grab');
    click(10);
    expect(h.seeks).toEqual([CHORUS_TICK]);
  });

  it('neither draws nor finds one whose flag and name have both scrolled off', () => {
    // Flag at -140: the name ends at -34.
    s().updateMarker(chorusId, { name: 'Pre-chorus build' });
    useStore.setState({ timelineScrollLeft: 300 });
    render(<ScrolledTimeline />);
    expect(lastDrawn('Pre-chorus build')).toBeUndefined();
    expect(cursorAt(10)).toBe('pointer');
    // A click there seeks under the pointer: 3720, on the grid 3840.
    click(10);
    expect(h.seeks).toEqual([3840]);
  });
});

describe('a drag on a marker', () => {
  it('moves it from its name, where a press sought before (F8)', () => {
    render(<ScrolledTimeline />);
    drag(ON_NAME, ON_NAME + 160);
    expect(h.seeks).toEqual([]);
    // Taken 480 ticks in, it moves a bar: it doesn't jump to put its tick
    // under the pointer (4320).
    expect(pixelToTick(ON_NAME + 160, 1, 0)).toBe(4320);
    expect(chorus().tick).toBe(CHORUS_TICK + 1920);
  });

  it('lands on the grid', () => {
    render(<ScrolledTimeline />);
    // Let go at 4740 - 480 = 4260: the nearest quarter is 4320.
    drag(ON_NAME, ON_NAME + 195);
    expect(chorus().tick).toBe(4320);
  });

  it('with snap off, lands on the tick it is let go at', () => {
    useStore.setState({ timelineSnapEnabled: false });
    render(<ScrolledTimeline />);
    drag(ON_NAME, ON_NAME + 195);
    expect(chorus().tick).toBe(4260);
  });

  it('is written once, on release, as one undo step', () => {
    render(<ScrolledTimeline />);
    let writes = 0;
    const off = useStore.subscribe((next, prev) => {
      if (next.markers !== prev.markers) writes += 1;
    });
    press(ON_NAME);
    for (let x = ON_NAME + 10; x <= ON_NAME + 320; x += 10) move(x);
    expect(writes).toBe(0);
    expect(chorus().tick).toBe(CHORUS_TICK);
    release(ON_NAME + 320);
    off();
    expect(writes).toBe(1);
    expect(chorus().tick).toBe(CHORUS_TICK + 2 * 1920);
    expect(historyLabels()).toEqual(['Move marker']);
    undo();
    expect(chorus().tick).toBe(CHORUS_TICK);
  });

  it('is drawn where it is taken meanwhile, without a jump', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const runFrames = () =>
      act(() => {
        for (const cb of frames.splice(0)) cb(performance.now());
      });
    try {
      render(<ScrolledTimeline />);
      press(ON_NAME);
      // Just past the slop: still where it was (taken by the name, it
      // didn't put its flag under the pointer).
      move(ON_NAME + 4);
      runFrames();
      expect(lastDrawn('Chorus')?.x).toBe(NAME_X);
      move(ON_NAME + 160);
      runFrames();
      expect(lastDrawn('Chorus')?.x).toBe(
        tickToPixel(CHORUS_TICK + 1920, 1, 0) + 10,
      );
      expect(canvas().style.cursor).toBe('grabbing');
      expect(chorus().tick).toBe(CHORUS_TICK);
      release(ON_NAME + 160);
      expect(chorus().tick).toBe(CHORUS_TICK + 1920);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('carries on off the canvas', () => {
    render(<ScrolledTimeline />);
    press(ON_NAME);
    fireEvent.mouseMove(document.body, {
      clientX: ON_NAME + 160,
      clientY: LANE_Y + 300,
    });
    fireEvent.mouseUp(document.body, {
      clientX: ON_NAME + 160,
      clientY: LANE_Y + 300,
    });
    expect(chorus().tick).toBe(CHORUS_TICK + 1920);
    expect(h.seeks).toEqual([]);
  });
});

describe('the cursor', () => {
  it('shows a grab hand over exactly the flag and the name, as drawn', () => {
    render(<ScrolledTimeline />);
    const name = lastDrawn('Chorus')!;
    expect(name.x).toBe(NAME_X);
    const end = name.x + name.text.length * CHAR_PX;
    expect(end).toBe(NAME_END);
    for (const x of [FLAG_X - 3, FLAG_X, FLAG_X + 8, NAME_X, end, end + 3]) {
      expect(cursorAt(x)).toBe('grab');
    }
    // No further: it showed from 5 px before the flag to 70 px after it.
    expect(cursorAt(FLAG_X - 4)).toBe('pointer');
    expect(cursorAt(end + 4)).toBe('pointer');
    expect(cursorAt(FLAG_X + 70)).toBe('pointer');
  });

  it('shows it in the bar-number lane only', () => {
    render(<ScrolledTimeline />);
    expect(cursorAt(FLAG_X + 2, LOOP_STRIP_H)).toBe('grab');
    expect(cursorAt(FLAG_X + 2, RULER_PX - 1)).toBe('grab');
    expect(cursorAt(FLAG_X + 2, LOOP_STRIP_H - 1)).not.toBe('grab');
    expect(cursorAt(FLAG_X + 2, RULER_PX)).not.toBe('grab');
  });
});

describe('a right-click', () => {
  it('on the name opens the marker’s menu', async () => {
    render(<ScrolledTimeline />);
    rightClick(ON_NAME);
    expect(
      await screen.findByRole('menu', { name: 'Marker menu' }),
    ).toBeTruthy();
    expect(items()).toEqual(['renameMarker', 'deleteMarker']);
    expect(menuTarget()).toEqual({
      kind: 'marker',
      markerId: chorusId,
      tick: CHORUS_TICK,
    });
  });

  it('just past the name opens the ruler’s (it reached 75 px)', async () => {
    render(<ScrolledTimeline />);
    // 215: tick 2580, on the grid 2400.
    rightClick(NAME_END + 9);
    expect(
      await screen.findByRole('menu', { name: 'Ruler menu' }),
    ).toBeTruthy();
    expect(items()).toEqual(['addMarker']);
    expect(menuTarget()).toEqual({ kind: 'ruler', tick: 2400 });
  });

  it('over the flag in the loop strip opens the ruler’s', async () => {
    render(<ScrolledTimeline />);
    rightClick(FLAG_X + 2, LOOP_STRIP_H - 4);
    expect(
      await screen.findByRole('menu', { name: 'Ruler menu' }),
    ).toBeTruthy();
    expect(menuTarget()).toEqual({ kind: 'ruler', tick: CHORUS_TICK });
  });

  it('where two markers overlap opens the topmost’s', async () => {
    // 'Verse' 20 px on: its flag on Chorus's name, drawn after it.
    s().addMarker(CHORUS_TICK + 240, 'Verse');
    const verseId = s().markers.at(-1)!.id;
    render(<ScrolledTimeline />);
    rightClick(FLAG_X + 22);
    expect(
      await screen.findByRole('menu', { name: 'Marker menu' }),
    ).toBeTruthy();
    expect(menuTarget()).toMatchObject({ kind: 'marker', markerId: verseId });
  });
});

describe('a double-click', () => {
  it('on a marker renames it in the app’s dialog', async () => {
    h.typed = 'Hook';
    render(<ScrolledTimeline />);
    doubleClick(ON_NAME);
    await waitFor(() => expect(chorus().name).toBe('Hook'));
    expect(h.prompts).toMatchObject([
      {
        title: 'Rename marker',
        label: 'Marker name',
        defaultValue: 'Chorus',
        confirmLabel: 'Rename',
      },
    ]);
    expect(s().markers).toHaveLength(1);
    expect(chorus().tick).toBe(CHORUS_TICK);
    // Each of its clicks went to the marker.
    expect(h.seeks).toEqual([CHORUS_TICK, CHORUS_TICK]);
    expect(historyLabels()).toEqual(['Rename marker']);
    undo();
    expect(chorus().name).toBe('Chorus');
  });

  it('elsewhere on the ruler adds a marker there, on the grid, named first', async () => {
    h.typed = 'Bridge';
    render(<ScrolledTimeline />);
    expect(pixelToTick(BARE_X, 1, 0)).toBe(6300);
    doubleClick(BARE_X);
    await waitFor(() => expect(s().markers).toHaveLength(2));
    expect(h.prompts).toMatchObject([
      {
        title: 'Add a marker',
        label: 'Marker name',
        defaultValue: 'Marker 2',
        confirmLabel: 'Add',
      },
    ]);
    expect(s().markers.at(-1)).toMatchObject({
      tick: BARE_TICK,
      name: 'Bridge',
    });
    expect(historyLabels()).toEqual(['Add marker']);
    undo();
    expect(s().markers.map((m) => m.name)).toEqual(['Chorus']);
  });

  it('adds nothing when the name is cancelled', async () => {
    h.typed = null;
    render(<ScrolledTimeline />);
    doubleClick(BARE_X);
    await settle();
    expect(h.prompts).toHaveLength(1);
    expect(s().markers.map((m) => m.name)).toEqual(['Chorus']);
    expect(historyLabels()).toEqual([]);
  });

  it('keeps “Marker N” on Enter in the app’s dialog', async () => {
    h.realDialog = true;
    render(
      <>
        <ScrolledTimeline />
        <DialogHost />
      </>,
    );
    doubleClick(BARE_X);
    const field = (await screen.findByRole('textbox', {
      name: 'Marker name',
    })) as HTMLInputElement;
    expect(screen.getByRole('dialog', { name: 'Add a marker' })).toBeTruthy();
    expect(field.value).toBe('Marker 2');
    // Enter in the one field submits its form.
    fireEvent.submit(field.closest('form')!);
    await waitFor(() => expect(s().markers).toHaveLength(2));
    expect(s().markers.at(-1)).toMatchObject({
      tick: BARE_TICK,
      name: 'Marker 2',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('adds nothing on the dialog’s Cancel', async () => {
    h.realDialog = true;
    render(
      <>
        <ScrolledTimeline />
        <DialogHost />
      </>,
    );
    doubleClick(BARE_X);
    await screen.findByRole('dialog', { name: 'Add a marker' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await settle();
    expect(s().markers.map((m) => m.name)).toEqual(['Chorus']);
    expect(historyLabels()).toEqual([]);
  });
});

describe('Alt+M', () => {
  it('is the timeline’s key for a marker at the playhead', () => {
    expect(getCommand('timeline.addMarker')).toMatchObject({
      scope: 'arrange',
      keys: ['Alt+KeyM'],
    });
  });

  it('adds a marker at the playhead, on the grid, named first', async () => {
    h.typed = 'Drop';
    render(<ScrolledTimeline />);
    act(() => s().setPosition(2500));
    pressKey(ALT_M);
    await waitFor(() => expect(s().markers).toHaveLength(2));
    expect(h.prompts).toMatchObject([
      { title: 'Add a marker', defaultValue: 'Marker 2', confirmLabel: 'Add' },
    ]);
    expect(s().markers.at(-1)).toMatchObject({ tick: 2400, name: 'Drop' });
    expect(historyLabels()).toEqual(['Add marker']);
  });

  it('keeps “Marker N” on Enter in the app’s dialog', async () => {
    h.realDialog = true;
    render(
      <>
        <ScrolledTimeline />
        <DialogHost />
      </>,
    );
    act(() => s().setPosition(4 * 1920));
    pressKey(ALT_M);
    const field = (await screen.findByRole('textbox', {
      name: 'Marker name',
    })) as HTMLInputElement;
    expect(field.value).toBe('Marker 2');
    fireEvent.submit(field.closest('form')!);
    await waitFor(() => expect(s().markers).toHaveLength(2));
    expect(s().markers.at(-1)).toMatchObject({
      tick: 4 * 1920,
      name: 'Marker 2',
    });
  });

  it('adds nothing when the name is cancelled', async () => {
    h.typed = null;
    render(<ScrolledTimeline />);
    pressKey(ALT_M);
    await settle();
    expect(h.prompts).toHaveLength(1);
    expect(s().markers).toHaveLength(1);
    expect(historyLabels()).toEqual([]);
  });

  it('while playing, adds it where the playhead is heard', async () => {
    const now = { t: 0 };
    setPlayheadSourceForTests({
      currentTime: () => now.t,
      outputLatency: () => 0,
      ticksAtTime: (time) => time * 960,
      scheduleTime: () => now.t + 0.1,
    });
    try {
      h.typed = 'Here';
      render(<ScrolledTimeline />);
      startPlayheadRun(0, 0);
      now.t = 2.5;
      pressKey(ALT_M);
      await waitFor(() => expect(s().markers).toHaveLength(2));
      // The store still holds where play began (0).
      expect(s().position).toBe(0);
      expect(s().markers.at(-1)).toMatchObject({ tick: 2400, name: 'Here' });
    } finally {
      endPlayheadRun();
      setPlayheadSourceForTests();
    }
  });

  it('leaves M alone, and does nothing outside Create', async () => {
    render(<ScrolledTimeline />);
    pressKey({ code: 'KeyM', key: 'm' });
    act(() => useStore.setState({ currentView: 'score' }));
    pressKey(ALT_M);
    await settle();
    expect(h.prompts).toEqual([]);
    expect(s().markers).toHaveLength(1);
  });
});
