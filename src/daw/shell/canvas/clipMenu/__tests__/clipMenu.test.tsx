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

// ── The clip menu on the canvas (milestone 2.12) ───────────────────────────
// Three ways in, one menu: a right-click, the selected clip's Edit pill, and
// a key. The menu acts on the clip it was opened on; an empty lane, a marker
// and the ruler get their own. A Pointer click on empty canvas seeks and a
// drag draws the marquee; the middle button pans. Prism is part of Premium
// (decision 8): a free student sees it locked. Run:
// npx vitest run src/daw/shell/canvas/clipMenu/__tests__/clipMenu.test.tsx

const h = vi.hoisted(() => ({
  premium: { isPremium: true, isLoading: false },
  navigate: (() => {}) as (to: string) => void,
  seeks: [] as number[],
  /** What the app's name dialog answers: a name, or null for Cancel. */
  typed: null as string | null,
}));
vi.mock('@/hooks/useIsPremium', () => ({ useIsPremium: () => h.premium }));
vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('@/daw/hooks/useTransport', () => ({
  seekTo: (tick: number) => {
    h.seeks.push(tick);
  },
}));
vi.mock('@/daw/ui/DialogHost', async (original) => ({
  ...(await original<typeof import('@/daw/ui/DialogHost')>()),
  promptDialog: async () => h.typed,
}));

import { ProfileRoutes } from '@/constants/routes';
import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { getCommand } from '@/daw/commands/registry';
import { useStore } from '@/daw/store';
import { tickToPixel } from '@/daw/utils/timelineScale';
import { LANE_HEADER_PX, TRACK_ROW_PX } from '@/daw/shell/tracklist/rowLayout';
import { ScrolledTimeline } from '@/daw/components/Timeline/__tests__/scrolledTimeline';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { useCanvasMenuStore } from '../canvasMenuStore';

const s = () => useStore.getState();
const VIEWPORT = 1200;

/** A 2D context that draws nothing: the Timeline still lays its clips out. */
function silentContext() {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        return (text: string) => ({ width: text.length * 6 });
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
    silentContext()) as unknown as typeof getContext;
  uninstallKeys = installKeyDispatcher();
});
afterAll(() => {
  uninstallKeys();
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

let keys = '';
let open = vi.fn<(tick: number, trackId: string) => void>();
beforeEach(() => {
  h.premium = { isPremium: true, isLoading: false };
  h.navigate = vi.fn();
  h.seeks = [];
  open = vi.fn<(tick: number, trackId: string) => void>();
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    currentView: 'arrange',
    activeTool: 'cursor',
    timelineZoom: 1,
    timelineScrollLeft: 0,
    timelineSnapEnabled: true,
    timelineGridSize: '1/4',
    openPrismSuggestion: open,
  });
  useCanvasMenuStore.setState({ request: null });
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'keys-1',
    name: 'Riff',
    startTick: 1920,
    durationTicks: 1920,
    events: [
      { note: 60, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
      {
        note: 64,
        velocity: 100,
        startTick: 480,
        durationTicks: 480,
        channel: 0,
      },
    ],
  });
});
afterEach(cleanup);

const laneY = LANE_HEADER_PX + TRACK_ROW_PX / 2;
const clipMidX = tickToPixel(1920 + 960, 1, 0);
const emptyX = tickToPixel(5 * 1920, 1, 0);
const canvas = () => document.querySelector('canvas')!;
const items = () =>
  [...screen.getByRole('menu').querySelectorAll('[data-item]')].map((el) =>
    el.getAttribute('data-item'),
  );

describe('a right-click', () => {
  it('opens the clip’s menu on a clip, selecting the clip but not its track', async () => {
    render(<ScrolledTimeline />);
    const trackBefore = s().selectedTrackId;
    fireEvent.contextMenu(canvas(), { clientX: clipMidX, clientY: laneY });

    expect(await screen.findByRole('menu', { name: 'Clip menu' })).toBeTruthy();
    expect(items()).toEqual([
      'cut',
      'copy',
      'paste',
      'delete',
      'duplicate',
      'rename',
      'split',
      'mute',
      'comment',
      'transpose',
      'quantize',
      'prism',
    ]);
    expect(s().selectedClipId).toBe('keys-1');
    expect(s().selectedTrackId).toBe(trackBefore);
  });

  it('runs what is chosen on that clip, and closes', async () => {
    render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: clipMidX, clientY: laneY });
    const mute = await screen.findByRole('menuitemcheckbox', {
      name: /Mute clip/,
    });
    // Its key, as this keyboard names it.
    expect(mute.textContent).toMatch(/⇧M|Shift\+M/);
    fireEvent.click(mute);
    expect(s().tracks[0].midiClips[0].muted).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens a lane’s menu on empty lane, where Prism suggests chords from the bar', async () => {
    render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: emptyX + 100, clientY: laneY });
    expect(
      await screen.findByRole('menu', { name: 'Track lane menu' }),
    ).toBeTruthy();
    expect(items()).toEqual(['paste', 'createClip', 'comment', 'prism']);
  });

  it('shows a free student Prism locked, leading to the plans', async () => {
    h.premium = { isPremium: false, isLoading: false };
    render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: emptyX, clientY: laneY });
    const prism = await screen.findByRole('menuitem', {
      name: 'Prism (Premium, locked)',
    });
    expect(prism).toHaveTextContent('Premium');
    fireEvent.click(prism);
    expect(open).not.toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith(ProfileRoutes.plan.definition);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('never sends a student away while their plan is still loading', async () => {
    h.premium = { isPremium: false, isLoading: true };
    render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: emptyX, clientY: laneY });
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Prism (Premium, locked)' }),
    );
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('opens the ruler’s menu above the lanes, and names the marker it adds', async () => {
    h.typed = 'Bridge';
    render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: emptyX, clientY: 20 });
    expect(
      await screen.findByRole('menu', { name: 'Ruler menu' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add marker here' }));
    await waitFor(() =>
      expect(s().markers.map((m) => [m.tick, m.name])).toEqual([
        [5 * 1920, 'Bridge'],
      ]),
    );
    h.typed = null;
  });

  it('adds no marker when its name is cancelled', async () => {
    h.typed = null;
    render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: emptyX, clientY: 20 });
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Add marker here' }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(s().markers).toEqual([]);
  });
});

describe('the timeline going', () => {
  it('closes its menu, which doesn’t open again with it', async () => {
    const view = render(<ScrolledTimeline />);
    fireEvent.contextMenu(canvas(), { clientX: clipMidX, clientY: laneY });
    expect(await screen.findByRole('menu', { name: 'Clip menu' })).toBeTruthy();
    view.unmount();
    expect(useCanvasMenuStore.getState().request).toBeNull();
    render(<ScrolledTimeline />);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('the Edit pill', () => {
  it('shows on the selected clip, 24 px high, and opens its menu', async () => {
    render(<ScrolledTimeline />);
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
    act(() => s().setSelectedClip('keys-1', keys));
    const pill = screen.getByRole('button', { name: 'Edit Riff' });
    expect(pill.style.height).toBe('24px');
    expect(pill).toHaveAttribute('aria-haspopup', 'menu');
    expect(pill).toHaveAttribute('data-tutorial-id', 'clip-edit-pill');

    fireEvent.click(pill);
    expect(await screen.findByRole('menu', { name: 'Clip menu' })).toBeTruthy();
    expect(pill).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides while the clip is gone from view', () => {
    render(<ScrolledTimeline />);
    act(() => {
      s().setSelectedClip('keys-1', keys);
      s().setTimelineScrollLeft(10_000);
    });
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
  });
});

describe('keys', () => {
  const press = (init: KeyboardEventInit) =>
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, ...init }),
      );
    });

  it('open the selected clip’s menu with Alt+Return, Chromebook-safe', async () => {
    render(<ScrolledTimeline />);
    act(() => s().setSelectedClip('keys-1', keys));
    press({ code: 'Enter', key: 'Enter', altKey: true });
    expect(await screen.findByRole('menu', { name: 'Clip menu' })).toBeTruthy();
  });

  it('mute with ⇧M and split at the playhead with ⌘E', () => {
    render(<ScrolledTimeline />);
    act(() => s().setSelectedClip('keys-1', keys));
    press({ code: 'KeyM', key: 'M', shiftKey: true });
    expect(s().tracks[0].midiClips[0].muted).toBe(true);
    // M alone is still the click.
    const click = s().metronomeEnabled;
    press({ code: 'KeyM', key: 'm' });
    expect(s().tracks[0].midiClips[0].muted).toBe(true);
    expect(s().metronomeEnabled).toBe(click);

    act(() => s().setPosition(2400));
    press({ code: 'KeyE', key: 'e', metaKey: true });
    expect(s().tracks[0].midiClips).toHaveLength(2);
  });

  it('settle the clashes: ⌘E splits, ⇧⌘E exports MIDI', () => {
    expect(getCommand('clip.split')?.keys).toEqual(['Mod+KeyE']);
    expect(getCommand('project.exportMidi')?.keys).toEqual(['Mod+Shift+KeyE']);
    expect(getCommand('transport.metronome')?.keys).toEqual(['KeyM']);
    expect(getCommand('clip.mute')?.keys).toEqual(['Shift+KeyM']);
    // N first, the one a Chromebook has: the menu shows the first key.
    expect(getCommand('clip.rename')?.keys).toEqual(['KeyN', 'F2']);
    // ⌘E anywhere else is kept from the browser (its address bar).
    expect(getCommand('browser.search')).toMatchObject({
      scope: 'global',
      keys: ['Mod+KeyE'],
      hidden: true,
    });
  });

  it('with the menu key, keep the browser’s own menu from following ours', async () => {
    render(<ScrolledTimeline />);
    act(() => s().setSelectedClip('keys-1', keys));
    press({ code: 'ContextMenu', key: 'ContextMenu' });
    expect(await screen.findByRole('menu', { name: 'Clip menu' })).toBeTruthy();
    // The key's release brings the browser's menu: that one is swallowed.
    const native = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(true);
    // Only that one.
    const next = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(next);
    expect(next.defaultPrevented).toBe(false);
  });

  it('ignore a held Return’s repeats in the menu a key opened', async () => {
    render(<ScrolledTimeline />);
    act(() => s().setSelectedClip('keys-1', keys));
    press({ code: 'Enter', key: 'Enter', altKey: true });
    const cut = await screen.findByRole('menuitem', { name: /^Cut/ });
    const repeat = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Enter',
      key: 'Enter',
      repeat: true,
    });
    act(() => {
      cut.dispatchEvent(repeat);
    });
    expect(repeat.defaultPrevented).toBe(true);
    expect(s().tracks[0].midiClips).toHaveLength(1);
    expect(screen.getByRole('menu', { name: 'Clip menu' })).toBeTruthy();
  });

  it('leave the selected clip alone when pressed in the track list', () => {
    render(<ScrolledTimeline />);
    act(() => s().setSelectedClip('keys-1', keys));
    // A row's button: ⇧M there is about that track, not the clip.
    const list = document.createElement('div');
    list.setAttribute('data-testid', 'track-list');
    const button = document.createElement('button');
    list.append(button);
    document.body.append(list);
    try {
      act(() => {
        button.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            code: 'KeyM',
            key: 'M',
            shiftKey: true,
          }),
        );
      });
      expect(s().tracks[0].midiClips[0].muted).toBeUndefined();
    } finally {
      list.remove();
    }
  });
});

describe('the Pointer on empty canvas', () => {
  it('seeks on a click, on the grid', () => {
    render(<ScrolledTimeline />);
    const x = tickToPixel(4 * 1920 + 500, 1, 0);
    fireEvent.mouseDown(canvas(), { clientX: x, clientY: laneY, button: 0 });
    fireEvent.mouseUp(canvas(), { clientX: x, clientY: laneY, button: 0 });
    expect(h.seeks).toEqual([4 * 1920 + 480]);
  });

  it('draws the marquee on a drag, neither seeking nor panning', () => {
    render(<ScrolledTimeline />);
    // From empty lane past the clip's end, back across its notes.
    const fromY = LANE_HEADER_PX + TRACK_ROW_PX - 4;
    fireEvent.mouseDown(canvas(), {
      clientX: emptyX,
      clientY: fromY,
      button: 0,
    });
    fireEvent.mouseMove(canvas(), {
      clientX: clipMidX - 200,
      clientY: LANE_HEADER_PX + 4,
    });
    fireEvent.mouseUp(canvas(), {
      clientX: clipMidX - 200,
      clientY: LANE_HEADER_PX + 4,
    });
    expect(h.seeks).toEqual([]);
    expect(s().timelineScrollLeft).toBe(0);
    // It crossed the clip: its notes are selected for Insight.
    expect(s().selectedNotes.map((n) => n.clipId)).toEqual(['keys-1']);
  });

  it('pans with the middle button', () => {
    s().addMidiClip(keys, {
      id: 'far',
      startTick: 64 * 1920,
      durationTicks: 1920,
      events: [],
    });
    useStore.setState({ timelineScrollLeft: 400 });
    render(<ScrolledTimeline />);
    fireEvent.mouseDown(canvas(), { clientX: 600, clientY: laneY, button: 1 });
    // The first move past the threshold takes hold, the next one pans.
    fireEvent.mouseMove(canvas(), { clientX: 590, clientY: laneY });
    fireEvent.mouseMove(canvas(), { clientX: 490, clientY: laneY });
    fireEvent.mouseUp(canvas(), { clientX: 500, clientY: laneY, button: 1 });
    expect(s().timelineScrollLeft).toBe(500);
    expect(h.seeks).toEqual([]);
  });
});
