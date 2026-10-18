// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Profiler } from 'react';
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

// ── The sections lane (milestone 2.13) ─────────────────────────────────────
// The song's form above the ruler: one named block per section, where the
// timeline puts it, scrolled with the timeline without a render; + Section
// after the last one, with the 14 kinds, a name of one's own and Learn; a
// click goes to a section, an edge drag resizes it on bar lines as one undo
// step, a right-click or Alt+Return opens the canvas menu, and the keys act
// on the focused block. The comment lane's slot stays shut until the
// Comments panel exists (4.3). Run:
// npx vitest run src/daw/shell/canvas/sections/__tests__/SectionsLane.test.tsx

const h = vi.hoisted(() => ({
  seeks: [] as number[],
  /** What the app's name dialog answers: a name, or null for Cancel. */
  typed: null as string | null,
  /** How often the dialog was asked for a name. */
  asked: 0,
}));
vi.mock('@/daw/hooks/useTransport', () => ({
  seekTo: (tick: number) => {
    h.seeks.push(tick);
  },
}));
vi.mock('@/daw/ui/DialogHost', async (original) => ({
  ...(await original<typeof import('@/daw/ui/DialogHost')>()),
  promptDialog: async () => {
    h.asked += 1;
    return h.typed;
  },
}));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { bindKeymap } from '@/daw/commands/registry';
import {
  SECTION_TYPES,
  sectionTypeInfo,
  type SongSection,
} from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { INSPECTOR_PANELS } from '@/daw/shell/layout/layoutModel';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { tickToPixel } from '@/daw/utils/timelineScale';
import { useCanvasMenuStore } from '../../clipMenu/canvasMenuStore';
import { CommentLaneSlot, useCommentLaneShown } from '../CommentLaneSlot';
import { SONG_FORM_ROUTE } from '../sectionActions';
import { SectionsLane } from '../SectionsLane';

const s = () => useStore.getState();
const BAR = 1920; // a bar of 4/4
const ZOOM = 0.5; // 20 px a beat, 80 px a bar
const VIEWPORT = 1200; // the lane's width

const SECTIONS: SongSection[] = [
  {
    id: 'intro',
    type: 'intro',
    label: 'Intro',
    startTick: 0,
    endTick: 4 * BAR,
  },
  {
    id: 'verse',
    type: 'verse',
    label: 'Verse',
    startTick: 4 * BAR,
    endTick: 12 * BAR,
  },
  {
    id: 'chorus',
    type: 'chorus',
    label: 'Chorus',
    startTick: 12 * BAR,
    endTick: 20 * BAR,
  },
];

/** The song's sections as [id, first bar line, last bar line]. */
const bars = () =>
  s().sections.map((x) => [x.id, x.startTick / BAR, x.endTick / BAR]);
const px = (tick: number) => tickToPixel(tick, ZOOM, 0);
const blocks = () => screen.queryAllByTestId('section-block');
const block = (id: string) => blocks().find((b) => b.dataset.sectionId === id)!;
const edgeOf = (id: string, side: 'start' | 'end') =>
  block(id).querySelector<HTMLElement>(`[data-edge="${side}"]`)!;
const dataItems = (root: Element) =>
  [...root.querySelectorAll('[data-item]')].map((el) =>
    el.getAttribute('data-item'),
  );
const menuItem = (id: string) =>
  document.querySelector<HTMLElement>(`[data-item="${id}"]`)!;

/** The sections the song has before the test's first undo step. */
function given(list: SongSection[]) {
  s().setSections(list);
  resetHistory();
}

/** A key pressed on `el`: the editor's dispatcher sees it first. */
const press = (el: Element, init: KeyboardEventInit) =>
  fireEvent.keyDown(el, init);

/** One animation frame, for a focus move the lane makes on the next one. */
const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const hadCss = typeof globalThis.CSS !== 'undefined';
let uninstallKeys: () => void;
beforeAll(() => {
  installDomShims();
  // jsdom has no CSS.escape, which the lane finds a block by.
  if (!hadCss) {
    (globalThis as { CSS?: unknown }).CSS = {
      escape: (value: string) => value.replace(/[^\w-]/g, (c) => `\\${c}`),
    };
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => VIEWPORT,
  });
  uninstallKeys = installKeyDispatcher();
});
afterAll(() => {
  uninstallKeys();
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  } else {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  }
  if (!hadCss) delete (globalThis as { CSS?: unknown }).CSS;
});

let stopHistory: () => void;
beforeEach(() => {
  h.seeks = [];
  h.typed = null;
  h.asked = 0;
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ timelineZoom: ZOOM, timelineScrollLeft: 0 });
  useCanvasMenuStore.setState({ request: null });
  resetHistory();
  stopHistory = startHistory();
});
afterEach(() => {
  stopHistory();
  cleanup();
});

describe('the lane’s blocks', () => {
  it('draws one named button per section, where the timeline puts it', () => {
    given(SECTIONS);
    render(<SectionsLane />);
    expect(screen.getByRole('group', { name: 'Song sections' })).toBe(
      screen.getByTestId('sections-lane'),
    );
    expect(blocks().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Intro, bars 1 to 4',
      'Verse, bars 5 to 12',
      'Chorus, bars 13 to 20',
    ]);
    for (const section of SECTIONS) {
      const b = block(section.id);
      expect(b.tagName).toBe('BUTTON');
      expect(b.style.left).toBe(`${px(section.startTick)}px`);
      expect(b.style.width).toBe(
        `${px(section.endTick) - px(section.startTick)}px`,
      );
      // A grab zone at each end, inside the block.
      for (const side of ['start', 'end'] as const) {
        expect(b).toContainElement(edgeOf(section.id, side));
        expect(edgeOf(section.id, side).style.width).toBe('8px');
      }
    }
  });

  it('counts the bars in the project’s metre', () => {
    useStore.setState({
      timeSignatureNumerator: 3,
      timeSignatureDenominator: 4,
    });
    const bar = 1440;
    given([
      {
        id: 'a',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 8 * bar,
      },
      {
        id: 'b',
        type: 'chorus',
        label: 'Chorus 2',
        startTick: 8 * bar,
        endTick: 12 * bar,
      },
    ]);
    render(<SectionsLane />);
    expect(blocks().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Verse, bars 1 to 8',
      'Chorus 2, bars 9 to 12',
    ]);
  });

  it('scrolls with the timeline without drawing again', () => {
    given(SECTIONS);
    const commits = vi.fn();
    render(
      <Profiler id="sections" onRender={commits}>
        <SectionsLane />
      </Profiler>,
    );
    const layer = screen.getByTestId('sections-lane')
      .firstElementChild as HTMLElement;
    expect(layer).toContainElement(block('verse'));
    commits.mockClear();

    act(() => s().setTimelineScrollLeft(300));
    expect(layer.style.transform).toBe('translateX(-300px)');
    expect(commits).not.toHaveBeenCalled();
    // The blocks keep their places in the song: the layer moves them.
    expect(block('verse').style.left).toBe(`${px(4 * BAR)}px`);
  });

  it('scrolls the timeline sideways from a wheel over it', () => {
    given(SECTIONS);
    render(<SectionsLane />);
    const lane = screen.getByTestId('sections-lane');
    fireEvent.wheel(lane, { deltaX: 120 });
    expect(s().timelineScrollLeft).toBe(120);
    fireEvent.wheel(lane, { deltaY: 80, shiftKey: true });
    expect(s().timelineScrollLeft).toBe(200);
    // A plain vertical wheel isn't the lane's.
    fireEvent.wheel(lane, { deltaY: 80 });
    expect(s().timelineScrollLeft).toBe(200);
  });
});

describe('+ Section', () => {
  async function openAddMenu() {
    const add = screen.getByTestId('add-section');
    act(() => add.focus());
    press(add, { key: 'Enter', code: 'Enter' });
    return screen.findByRole('menu', { name: 'Add a section' });
  }

  it('sits at the lane’s left end with no sections, then just after the last, kept in view', () => {
    render(<SectionsLane />);
    const add = screen.getByTestId('add-section');
    expect(add).toHaveAccessibleName('Add a section');
    expect(add.style.left).toBe('0px');

    act(() =>
      s().setSections([
        {
          id: 'v',
          type: 'verse',
          label: 'Verse',
          startTick: 0,
          endTick: 8 * BAR,
        },
      ]),
    );
    const left = () => parseFloat(add.style.left);
    expect(left()).toBeGreaterThanOrEqual(px(8 * BAR));
    expect(left()).toBeLessThan(px(8 * BAR) + 16);

    // It follows the timeline's scroll, and never leaves the lane's left.
    act(() => s().setTimelineScrollLeft(200));
    expect(left()).toBeGreaterThanOrEqual(px(8 * BAR) - 200);
    expect(left()).toBeLessThan(px(8 * BAR) - 200 + 16);
    act(() => s().setTimelineScrollLeft(5000));
    expect(left()).toBe(0);
  });

  it('stays in view at the lane’s right end while the last section runs past it', () => {
    given(SECTIONS); // to bar line 20: 1600 px, past the 1200 px lane
    render(<SectionsLane />);
    const add = screen.getByTestId('add-section');
    Object.defineProperty(add, 'offsetWidth', {
      configurable: true,
      get: () => 90,
    });
    act(() => s().setTimelineScrollLeft(100));
    expect(add.style.left).toBe(`${VIEWPORT - 90}px`);
  });

  it('lists the 14 kinds in order, then a name of one’s own and Learn', async () => {
    render(<SectionsLane />);
    const menu = await openAddMenu();
    expect(menu).toHaveAttribute('data-testid', 'add-section-menu');
    expect(dataItems(menu)).toEqual([
      'add:intro',
      'add:verse',
      'add:pre-chorus',
      'add:chorus',
      'add:bridge',
      'add:outro',
      'add:solo',
      'add:interlude',
      'add:breakdown',
      'add:build-up',
      'add:drop',
      'add:hook',
      'add:tag',
      'add:coda',
      'add:custom',
      'learnSections',
    ]);
    expect(dataItems(menu).slice(0, 14)).toEqual(
      SECTION_TYPES.map((t) => `add:${t.type}`),
    );
  });

  it('adds an 8-bar section of the kind picked at the song’s start, as one undo step', async () => {
    render(<SectionsLane />);
    await openAddMenu();
    fireEvent.click(menuItem('add:verse'));
    expect(s().sections).toEqual([
      {
        id: expect.stringMatching(/^section-[0-9a-f]{8}$/),
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 8 * BAR,
      },
    ]);
    expect(historyLabels()).toEqual(['Add section']);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(
      screen.getByRole('button', { name: 'Verse, bars 1 to 8' }),
    ).toBeInTheDocument();

    act(() => {
      undo();
    });
    expect(s().sections).toEqual([]);
  });

  it('puts the next one after the last', async () => {
    given([
      {
        id: 'v',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 8 * BAR,
      },
    ]);
    render(<SectionsLane />);
    await openAddMenu();
    fireEvent.click(menuItem('add:pre-chorus'));
    expect(bars()).toEqual([
      ['v', 0, 8],
      [expect.any(String), 8, 16],
    ]);
    expect(s().sections[1]).toMatchObject({
      type: 'pre-chorus',
      label: 'Pre-chorus',
    });
    expect(historyLabels()).toEqual(['Add section']);
  });

  it('asks for a name of one’s own, and the name says its kind', async () => {
    h.typed = 'Pre Chorus 2';
    render(<SectionsLane />);
    await openAddMenu();
    fireEvent.click(menuItem('add:custom'));
    await waitFor(() => expect(s().sections).toHaveLength(1));
    expect(h.asked).toBe(1);
    expect(s().sections[0]).toMatchObject({
      type: 'pre-chorus',
      label: 'Pre Chorus 2',
      startTick: 0,
      endTick: 8 * BAR,
    });
    expect(historyLabels()).toEqual(['Add section']);
  });

  it('makes a name no kind has a custom section', async () => {
    h.typed = 'Ocean';
    render(<SectionsLane />);
    await openAddMenu();
    fireEvent.click(menuItem('add:custom'));
    await waitFor(() => expect(s().sections).toHaveLength(1));
    expect(s().sections[0]).toMatchObject({ type: 'custom', label: 'Ocean' });
  });

  it('adds nothing when the name is cancelled', async () => {
    h.typed = null;
    render(<SectionsLane />);
    await openAddMenu();
    fireEvent.click(menuItem('add:custom'));
    await waitFor(() => expect(h.asked).toBe(1));
    await nextFrame();
    expect(s().sections).toEqual([]);
    expect(historyLabels()).toEqual([]);
  });

  it('says what the kind under the pointer or the focus does', async () => {
    render(<SectionsLane />);
    await openAddMenu();
    const hint = screen.getByTestId('add-section-hint');
    const chorus = sectionTypeInfo('chorus');
    expect(hint).not.toHaveTextContent(chorus.purpose);

    fireEvent.pointerMove(menuItem('add:chorus'), { pointerType: 'mouse' });
    expect(hint).toHaveTextContent(`Chorus: ${chorus.purpose}`);
    act(() => menuItem('add:build-up').focus());
    expect(hint).toHaveTextContent(
      `Build-up: ${sectionTypeInfo('build-up').purpose}`,
    );
    const custom = sectionTypeInfo('custom');
    act(() => menuItem('add:custom').focus());
    expect(hint).toHaveTextContent(`Custom: ${custom.purpose}`);
    act(() => menuItem('learnSections').focus());
    expect(hint).not.toHaveTextContent(custom.purpose);
  });

  it('opens Learn → Songs in a new tab from About song sections', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    try {
      render(<SectionsLane />);
      await openAddMenu();
      fireEvent.click(menuItem('learnSections'));
      expect(SONG_FORM_ROUTE).toBe('/learn?tab=Songs');
      expect(open).toHaveBeenCalledWith(
        '/learn?tab=Songs',
        '_blank',
        expect.stringContaining('noopener'),
      );
      expect(s().sections).toEqual([]);
    } finally {
      open.mockRestore();
    }
  });
});

describe('a section block', () => {
  beforeEach(() => given(SECTIONS));

  it('goes to the section’s start on a click', () => {
    render(<SectionsLane />);
    const verse = block('verse');
    fireEvent.pointerDown(verse, { pointerId: 1, button: 0, clientX: 500 });
    fireEvent.pointerUp(verse, { pointerId: 1, button: 0, clientX: 503 });
    expect(h.seeks).toEqual([4 * BAR]);
  });

  it('doesn’t seek after a press that moved more than 3 px, or with another button', () => {
    render(<SectionsLane />);
    const verse = block('verse');
    fireEvent.pointerDown(verse, { pointerId: 1, button: 0, clientX: 500 });
    fireEvent.pointerUp(verse, { pointerId: 1, button: 0, clientX: 504 });
    fireEvent.pointerDown(verse, { pointerId: 2, button: 2, clientX: 500 });
    fireEvent.pointerUp(verse, { pointerId: 2, button: 2, clientX: 500 });
    expect(h.seeks).toEqual([]);
    expect(s().sections).toBe(SECTIONS);
  });

  it('resizes from an edge on bar lines, both sections at a shared one, stored on release as one undo step', () => {
    render(<SectionsLane />);
    let writes = 0;
    const stop = useStore.subscribe(
      (st) => st.sections,
      () => {
        writes += 1;
      },
    );
    const end = edgeOf('verse', 'end');
    fireEvent.pointerDown(end, {
      pointerId: 5,
      button: 0,
      clientX: px(12 * BAR) - 2,
    });
    // Past bar line 13: it snaps to the nearest, 13.
    fireEvent.pointerMove(end, { pointerId: 5, clientX: px(13 * BAR) + 30 });

    // Shown as it moves: the verse ends, and the chorus starts, a bar on...
    expect(block('verse').style.width).toBe(`${px(13 * BAR) - px(4 * BAR)}px`);
    expect(block('verse')).toHaveAccessibleName('Verse, bars 5 to 13');
    expect(block('chorus').style.left).toBe(`${px(13 * BAR)}px`);
    expect(block('chorus').style.width).toBe(
      `${px(20 * BAR) - px(13 * BAR)}px`,
    );
    // ...but not stored until it is let go.
    expect(writes).toBe(0);
    expect(s().sections).toBe(SECTIONS);
    // Another pointer's moves aren't this drag's.
    fireEvent.pointerMove(end, { pointerId: 9, clientX: px(16 * BAR) });
    expect(block('verse').style.width).toBe(`${px(13 * BAR) - px(4 * BAR)}px`);

    fireEvent.pointerUp(end, { pointerId: 5, clientX: px(13 * BAR) + 30 });
    expect(writes).toBe(1);
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 13],
      ['chorus', 13, 20],
    ]);
    expect(historyLabels()).toEqual(['Resize section']);
    expect(h.seeks).toEqual([]);

    act(() => {
      undo();
    });
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 12],
      ['chorus', 12, 20],
    ]);
    stop();
  });

  it('moves a free edge alone, and a shared start edge with the section before', () => {
    render(<SectionsLane />);
    // Nothing follows the chorus: two bars longer, by itself.
    const end = edgeOf('chorus', 'end');
    fireEvent.pointerDown(end, {
      pointerId: 1,
      button: 0,
      clientX: px(20 * BAR) - 2,
    });
    fireEvent.pointerMove(end, { pointerId: 1, clientX: px(22 * BAR) + 10 });
    fireEvent.pointerUp(end, { pointerId: 1, clientX: px(22 * BAR) + 10 });
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 12],
      ['chorus', 12, 22],
    ]);

    // The verse starts where the intro ends: both move a bar earlier.
    const start = edgeOf('verse', 'start');
    fireEvent.pointerDown(start, {
      pointerId: 2,
      button: 0,
      clientX: px(4 * BAR) + 2,
    });
    fireEvent.pointerMove(start, { pointerId: 2, clientX: px(3 * BAR) - 10 });
    fireEvent.pointerUp(start, { pointerId: 2, clientX: px(3 * BAR) - 10 });
    expect(bars()).toEqual([
      ['intro', 0, 3],
      ['verse', 3, 12],
      ['chorus', 12, 22],
    ]);
    expect(historyLabels()).toEqual(['Resize section', 'Resize section']);
  });

  it('puts an edge back on Escape, storing nothing', () => {
    render(<SectionsLane />);
    const end = edgeOf('verse', 'end');
    fireEvent.pointerDown(end, {
      pointerId: 3,
      button: 0,
      clientX: px(12 * BAR) - 2,
    });
    fireEvent.pointerMove(end, { pointerId: 3, clientX: px(15 * BAR) });
    expect(block('verse').style.width).toBe(`${px(15 * BAR) - px(4 * BAR)}px`);

    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(block('verse').style.width).toBe(`${px(12 * BAR) - px(4 * BAR)}px`);
    expect(block('chorus').style.left).toBe(`${px(12 * BAR)}px`);
    // Letting go afterwards stores nothing either.
    fireEvent.pointerUp(end, { pointerId: 3, clientX: px(15 * BAR) });
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
  });

  it('stores nothing for a drag let go on the bar line it started from', () => {
    render(<SectionsLane />);
    const end = edgeOf('verse', 'end');
    fireEvent.pointerDown(end, {
      pointerId: 4,
      button: 0,
      clientX: px(12 * BAR) - 2,
    });
    fireEvent.pointerMove(end, { pointerId: 4, clientX: px(14 * BAR) });
    fireEvent.pointerMove(end, { pointerId: 4, clientX: px(12 * BAR) + 20 });
    fireEvent.pointerUp(end, { pointerId: 4, clientX: px(12 * BAR) + 20 });
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
    expect(h.seeks).toEqual([]);
  });

  it('opens the canvas menu on a right-click, at the pointer', () => {
    render(<SectionsLane />);
    const verse = block('verse');
    // The browser's own menu is kept away.
    expect(fireEvent.contextMenu(verse, { clientX: 500, clientY: 12 })).toBe(
      false,
    );
    const request = useCanvasMenuStore.getState().request;
    expect(request).toMatchObject({
      target: { kind: 'section', sectionId: 'verse', tick: 4 * BAR },
      anchor: { x: 500, y: 12, width: 0, height: 0 },
      source: 'pointer',
    });
    expect(request?.returnFocus).toBe(verse);
    expect(h.seeks).toEqual([]);
  });
});

describe('the lane’s keys, with focus on a section', () => {
  beforeEach(() => given(SECTIONS));
  const tabStops = () =>
    blocks()
      .filter((b) => b.tabIndex === 0)
      .map((b) => b.dataset.sectionId);

  it('keep one Tab stop, which the arrows, Home and End move', async () => {
    render(<SectionsLane />);
    expect(tabStops()).toEqual(['intro']);
    act(() => block('intro').focus());

    press(block('intro'), { key: 'ArrowRight', code: 'ArrowRight' });
    await waitFor(() => expect(block('verse')).toHaveFocus());
    expect(tabStops()).toEqual(['verse']);
    press(block('verse'), { key: 'End', code: 'End' });
    await waitFor(() => expect(block('chorus')).toHaveFocus());
    // The last stays the last.
    press(block('chorus'), { key: 'ArrowRight', code: 'ArrowRight' });
    await nextFrame();
    expect(block('chorus')).toHaveFocus();
    press(block('chorus'), { key: 'ArrowLeft', code: 'ArrowLeft' });
    await waitFor(() => expect(block('verse')).toHaveFocus());
    press(block('verse'), { key: 'Home', code: 'Home' });
    await waitFor(() => expect(block('intro')).toHaveFocus());
    expect(tabStops()).toEqual(['intro']);
    // Moving along goes nowhere in the song.
    expect(h.seeks).toEqual([]);
  });

  it('go to the focused section with Return', () => {
    render(<SectionsLane />);
    act(() => block('chorus').focus());
    press(block('chorus'), { key: 'Enter', code: 'Enter' });
    expect(h.seeks).toEqual([12 * BAR]);
  });

  it('make it a bar longer or shorter with Shift+arrows, each one undo step', () => {
    render(<SectionsLane />);
    act(() => block('verse').focus());
    press(block('verse'), {
      key: 'ArrowRight',
      code: 'ArrowRight',
      shiftKey: true,
    });
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 13],
      ['chorus', 13, 20],
    ]);
    press(block('verse'), {
      key: 'ArrowLeft',
      code: 'ArrowLeft',
      shiftKey: true,
    });
    press(block('verse'), {
      key: 'ArrowLeft',
      code: 'ArrowLeft',
      shiftKey: true,
    });
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 11],
      ['chorus', 11, 20],
    ]);
    expect(historyLabels()).toEqual([
      'Resize section',
      'Resize section',
      'Resize section',
    ]);
    expect(block('verse')).toHaveFocus();
  });

  it('rename it with N or F2, in the app’s name dialog', async () => {
    render(<SectionsLane />);
    act(() => block('verse').focus());
    h.typed = 'Verse 1';
    press(block('verse'), { key: 'n', code: 'KeyN' });
    await waitFor(() =>
      expect(block('verse')).toHaveAccessibleName('Verse 1, bars 5 to 12'),
    );
    // A new name, the same kind.
    expect(s().sections[1]).toMatchObject({ type: 'verse', label: 'Verse 1' });
    expect(historyLabels()).toEqual(['Rename section']);

    // A name that names a kind makes it that kind, as in the Lead Sheet...
    h.typed = 'Hook';
    press(block('verse'), { key: 'F2', code: 'F2' });
    await waitFor(() => expect(s().sections[1].label).toBe('Hook'));
    expect(s().sections[1].type).toBe('hook');
    // ...and a name no kind has keeps the one it has.
    h.typed = 'Big finish';
    press(block('verse'), { key: 'n', code: 'KeyN' });
    await waitFor(() => expect(s().sections[1].label).toBe('Big finish'));
    expect(s().sections[1].type).toBe('hook');
    expect(h.asked).toBe(3);
  });

  it('delete it with Delete or Backspace, keeping the clips, and move the focus on', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'riff',
      startTick: 5 * BAR,
      durationTicks: BAR,
      events: [
        {
          note: 60,
          velocity: 100,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    } as MidiClip);
    given(SECTIONS);
    render(<SectionsLane />);
    const tracks = s().tracks;

    act(() => block('verse').focus());
    press(block('verse'), { key: 'Delete', code: 'Delete' });
    expect(s().sections.map((x) => x.id)).toEqual(['intro', 'chorus']);
    expect(s().tracks).toBe(tracks);
    expect(historyLabels()).toEqual(['Delete section']);
    await waitFor(() => expect(block('chorus')).toHaveFocus());

    press(block('chorus'), { key: 'Backspace', code: 'Backspace' });
    expect(s().sections.map((x) => x.id)).toEqual(['intro']);
    await waitFor(() => expect(block('intro')).toHaveFocus());
    expect(s().tracks).toBe(tracks);
  });

  it('open its menu with Alt+Return or Shift+F10, under the block', () => {
    render(<SectionsLane />);
    act(() => block('verse').focus());
    press(block('verse'), { key: 'Enter', code: 'Enter', altKey: true });
    const request = useCanvasMenuStore.getState().request;
    expect(request).toMatchObject({
      target: { kind: 'section', sectionId: 'verse', tick: 4 * BAR },
      source: 'key',
    });
    expect(request?.returnFocus).toBe(block('verse'));
    // Alt+Return isn't Return: it goes nowhere.
    expect(h.seeks).toEqual([]);

    act(() => useCanvasMenuStore.getState().close());
    act(() => block('chorus').focus());
    press(block('chorus'), { key: 'F10', code: 'F10', shiftKey: true });
    expect(useCanvasMenuStore.getState().request).toMatchObject({
      target: { kind: 'section', sectionId: 'chorus', tick: 12 * BAR },
      source: 'key',
    });
  });

  it('answer only on a section: on + Section they change nothing', () => {
    render(<SectionsLane />);
    const add = screen.getByTestId('add-section');
    act(() => add.focus());
    press(add, { key: 'Delete', code: 'Delete' });
    press(add, { key: 'ArrowRight', code: 'ArrowRight', shiftKey: true });
    expect(s().sections).toBe(SECTIONS);
    expect(historyLabels()).toEqual([]);
    expect(useCanvasMenuStore.getState().request).toBeNull();
  });
});

// ── Review fixes (2.13): the lane stays in line with the ruler, the keys
// stay in the lane, and a drag or a click on an edge does only what it says.

/** A box on screen, for the elements jsdom lays out at 0. */
const box = (left: number, width: number, top = 50, height = 24) =>
  ({
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

/**
 * Every focus() while `run` runs: on what, with what options, and where the
 * timeline was scrolled to at that moment.
 */
async function focusCalls(run: () => Promise<void> | void) {
  const calls: Array<{
    el: HTMLElement;
    options: FocusOptions | undefined;
    scrollLeft: number;
  }> = [];
  const original = HTMLElement.prototype.focus;
  const spy = vi
    .spyOn(HTMLElement.prototype, 'focus')
    .mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      calls.push({ el: this, options, scrollLeft: s().timelineScrollLeft });
      original.call(this, options);
    });
  try {
    await run();
  } finally {
    spy.mockRestore();
  }
  return calls;
}

describe('the lane stays in line with the ruler', () => {
  const OUTRO: SongSection = {
    id: 'outro',
    type: 'outro',
    label: 'Outro',
    startTick: 40 * BAR,
    endTick: 48 * BAR,
  };
  beforeEach(() => given([...SECTIONS, OUTRO]));

  it('clips rather than scrolls, and draws a block’s focus ring inside it', () => {
    render(<SectionsLane />);
    const lane = screen.getByTestId('sections-lane');
    // overflow: hidden is a scroll container a focus could scroll; clip isn't.
    expect(lane).toHaveClass('overflow-clip');
    expect(lane).not.toHaveClass('overflow-hidden');
    expect(lane.firstElementChild).not.toHaveClass('overflow-hidden');
    expect(block('verse')).toHaveClass('focus-visible:outline-offset-[-2px]');
  });

  it('scrolls the timeline to a section the keys go to first, then focuses it without scrolling', async () => {
    render(<SectionsLane />);
    act(() => block('chorus').focus());
    // The outro starts at 3200 px, past the 1200 px lane.
    const calls = await focusCalls(async () => {
      press(block('chorus'), { key: 'End', code: 'End' });
      await waitFor(() => expect(block('outro')).toHaveFocus());
    });
    expect(s().timelineScrollLeft).toBe(px(40 * BAR) - 32);
    const onOutro = calls.filter((c) => c.el === block('outro'));
    expect(onOutro).not.toHaveLength(0);
    for (const call of onOutro) {
      expect(call.options).toEqual({ preventScroll: true });
      expect(call.scrollLeft).toBe(px(40 * BAR) - 32);
    }
    expect(screen.getByTestId('sections-lane').scrollLeft).toBe(0);
  });

  it('brings a block Tab lands on off screen into view through the timeline, and leaves one partly in view', () => {
    render(<SectionsLane />);
    act(() => s().setTimelineScrollLeft(2000));
    // The intro (0 to 320 px) is wholly out of view: the timeline goes to it.
    act(() => block('intro').focus());
    expect(s().timelineScrollLeft).toBe(0);

    // The verse (320 to 960 px) shows in part: a focus there never jumps.
    act(() => s().setTimelineScrollLeft(400));
    act(() => block('verse').focus());
    expect(s().timelineScrollLeft).toBe(400);
    expect(screen.getByTestId('sections-lane').scrollLeft).toBe(0);
  });

  it('zooms the timeline at the pointer with Ctrl or ⌘ and the wheel, not the page', () => {
    render(<SectionsLane />);
    const lane = screen.getByTestId('sections-lane');
    // Not passive: the page's own zoom is kept away.
    expect(
      fireEvent.wheel(lane, { deltaY: -100, ctrlKey: true, clientX: 400 }),
    ).toBe(false);
    const zoomedIn = s().timelineZoom;
    expect(zoomedIn).toBeGreaterThan(ZOOM);
    expect(
      fireEvent.wheel(lane, { deltaY: 100, metaKey: true, clientX: 400 }),
    ).toBe(false);
    expect(s().timelineZoom).toBeLessThan(zoomedIn);
  });
});

describe('a section block, pressed and dragged', () => {
  beforeEach(() => given(SECTIONS));

  it('takes a Ctrl+click (a Mac’s right-click) as no click', () => {
    render(<SectionsLane />);
    const verse = block('verse');
    fireEvent.pointerDown(verse, {
      pointerId: 1,
      button: 0,
      ctrlKey: true,
      clientX: 500,
    });
    fireEvent.pointerUp(verse, { pointerId: 1, button: 0, clientX: 500 });
    expect(h.seeks).toEqual([]);
  });

  it('moves an edge as far as the pointer moves from where it was grabbed', () => {
    render(<SectionsLane />);
    const end = edgeOf('verse', 'end');
    // Grabbed 7 px inside the end, moved 45 px: the end goes 45 px on (to
    // 12.56 bars, so bar line 13), not to the pointer (12.48, so 12).
    fireEvent.pointerDown(end, {
      pointerId: 6,
      button: 0,
      clientX: px(12 * BAR) - 7,
    });
    fireEvent.pointerMove(end, { pointerId: 6, clientX: px(12 * BAR) + 38 });
    expect(block('verse')).toHaveAccessibleName('Verse, bars 5 to 13');
    fireEvent.pointerUp(end, { pointerId: 6, clientX: px(12 * BAR) + 38 });
    expect(bars()).toEqual([
      ['intro', 0, 4],
      ['verse', 4, 13],
      ['chorus', 13, 20],
    ]);
    expect(historyLabels()).toEqual(['Resize section']);
  });

  it('goes to the section on a click on an edge, resizing nothing, at the narrowest bars too', () => {
    // 3/4 at the widest zoom: 12 px a bar, so a block is nearly all edge.
    const bar = 1440;
    useStore.setState({
      timeSignatureNumerator: 3,
      timeSignatureDenominator: 4,
      timelineZoom: 0.1,
    });
    const list: SongSection[] = [
      {
        id: 'a',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: 8 * bar,
      },
    ];
    given(list);
    render(<SectionsLane />);
    const end = edgeOf('a', 'end');
    const x = tickToPixel(8 * bar, 0.1, 0) - 7;
    fireEvent.pointerDown(end, { pointerId: 1, button: 0, clientX: x });
    // A wobble within a click's 3 px moves nothing either.
    fireEvent.pointerMove(end, { pointerId: 1, clientX: x + 2 });
    expect(block('a')).toHaveAccessibleName('Verse, bars 1 to 8');
    fireEvent.pointerUp(end, { pointerId: 1, clientX: x + 2 });
    expect(s().sections).toBe(list);
    expect(historyLabels()).toEqual([]);
    expect(h.seeks).toEqual([0]);
  });

  it('puts an edge back on Escape and does nothing else: the music doesn’t stop', () => {
    const stop = vi.fn();
    const unbind = bindKeymap('global', {
      current: { 'transport.stop': stop },
    });
    try {
      render(<SectionsLane />);
      const end = edgeOf('verse', 'end');
      fireEvent.pointerDown(end, {
        pointerId: 3,
        button: 0,
        clientX: px(12 * BAR) - 2,
      });
      fireEvent.pointerMove(end, { pointerId: 3, clientX: px(15 * BAR) });
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
      expect(block('verse').style.width).toBe(
        `${px(12 * BAR) - px(4 * BAR)}px`,
      );
      expect(stop).not.toHaveBeenCalled();
      fireEvent.pointerUp(end, { pointerId: 3, clientX: px(15 * BAR) });
      expect(s().sections).toBe(SECTIONS);

      // With no drag, Escape is Stop again.
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      unbind();
    }
  });

  it('hangs its tip from the name, so a focus or a long block never opens one over the toolbar', () => {
    render(<SectionsLane />);
    const verse = block('verse');
    expect(verse).not.toHaveAttribute('data-state');
    expect(within(verse).getByTestId('section-name')).toHaveAttribute(
      'data-state',
      'closed',
    );
    act(() => verse.focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('the lane’s keys, kept in the lane', () => {
  beforeEach(() => given(SECTIONS));

  it('hang a key’s menu from the part of the block in view', () => {
    render(<SectionsLane />);
    const lane = screen.getByTestId('sections-lane');
    vi.spyOn(lane, 'getBoundingClientRect').mockReturnValue(box(100, 600));
    // A long verse scrolled half out of view on the left...
    vi.spyOn(block('verse'), 'getBoundingClientRect').mockReturnValue(
      box(-500, 2000),
    );
    act(() => block('verse').focus());
    press(block('verse'), { key: 'Enter', code: 'Enter', altKey: true });
    expect(useCanvasMenuStore.getState().request?.anchor).toEqual({
      x: 100,
      y: 50,
      width: 0,
      height: 24,
    });
    act(() => useCanvasMenuStore.getState().close());

    // ...and a chorus starting past the right end.
    vi.spyOn(block('chorus'), 'getBoundingClientRect').mockReturnValue(
      box(900, 300),
    );
    act(() => block('chorus').focus());
    press(block('chorus'), { key: 'F10', code: 'F10', shiftKey: true });
    expect(useCanvasMenuStore.getState().request?.anchor).toEqual({
      x: 692,
      y: 50,
      width: 0,
      height: 24,
    });
  });

  it('keep the browser’s own menu away from the menu key', () => {
    render(<SectionsLane />);
    act(() => block('verse').focus());
    press(block('verse'), { key: 'ContextMenu', code: 'ContextMenu' });
    expect(useCanvasMenuStore.getState().request?.source).toBe('key');
    // The browser opens its menu on the key's release.
    const native = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(true);
  });

  it('give + Section the focus when the last section is deleted', async () => {
    given([SECTIONS[0]]);
    render(<SectionsLane />);
    act(() => block('intro').focus());
    press(block('intro'), { key: 'Delete', code: 'Delete' });
    expect(s().sections).toEqual([]);
    await waitFor(() =>
      expect(screen.getByTestId('add-section')).toHaveFocus(),
    );
  });

  it('keep the clip keys away from + Section; ←, Home and End go back to the sections', async () => {
    useStore.setState({ currentView: 'arrange' });
    const clipKey = vi.fn();
    const unbind = bindKeymap('arrange', {
      current: {
        'clip.delete': clipKey,
        'clip.nudgeLeft': clipKey,
        'clip.nudgeRight': clipKey,
      },
    });
    try {
      render(<SectionsLane />);
      const add = screen.getByTestId('add-section');
      act(() => add.focus());
      for (const key of ['Backspace', 'Delete', 'ArrowRight']) {
        press(add, { key, code: key });
      }
      expect(add).toHaveFocus();
      press(add, { key: 'ArrowLeft', code: 'ArrowLeft' });
      await waitFor(() => expect(block('chorus')).toHaveFocus());
      act(() => add.focus());
      press(add, { key: 'Home', code: 'Home' });
      await waitFor(() => expect(block('intro')).toHaveFocus());
      expect(clipKey).not.toHaveBeenCalled();
      expect(s().sections).toBe(SECTIONS);
    } finally {
      unbind();
    }
  });

  it('leave the focus on the section + Section ▸ a kind added, not on + Section', async () => {
    render(<SectionsLane />);
    const add = screen.getByTestId('add-section');
    act(() => add.focus());
    press(add, { key: 'Enter', code: 'Enter' });
    await screen.findByRole('menu', { name: 'Add a section' });
    const focused: EventTarget[] = [];
    const onFocusIn = (e: FocusEvent) => focused.push(e.target!);
    document.addEventListener('focusin', onFocusIn);
    try {
      fireEvent.click(menuItem('add:bridge'));
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      const id = s().sections[3].id;
      await waitFor(() => expect(block(id)).toHaveFocus());
      // Long after the list has gone (its exit), focus is still there.
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
      expect(block(id)).toHaveFocus();
      expect(focused).not.toContain(add);
    } finally {
      document.removeEventListener('focusin', onFocusIn);
    }
  });
});

describe('the comment lane’s slot (for 4.3)', () => {
  it('draws nothing while it is shut, a 24 px row while it shows', () => {
    const { container, rerender } = render(<CommentLaneSlot shown={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CommentLaneSlot shown />);
    expect(screen.getByTestId('comment-lane').style.height).toBe('24px');
  });

  it('stays shut for every panel the side rail has now', () => {
    const { result } = renderHook(() => useCommentLaneShown());
    for (const panel of INSPECTOR_PANELS) {
      act(() =>
        useStore.setState({ libraryOpen: true, inspectorPanel: panel }),
      );
      expect(result.current).toBe(false);
    }
    // It opens with the Comments panel milestone 4.3 adds, and only then.
    act(() =>
      useStore.setState({
        libraryOpen: true,
        inspectorPanel: 'comments' as never,
      }),
    );
    expect(result.current).toBe(true);
    act(() => useStore.setState({ libraryOpen: false }));
    expect(result.current).toBe(false);
  });
});
