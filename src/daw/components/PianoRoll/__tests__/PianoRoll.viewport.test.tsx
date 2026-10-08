// @vitest-environment jsdom
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
import type { MidiNoteEvent } from '@prism/engine';

// ── Piano-roll canvases sized to the view (pianoroll-05) ────────────────────
// The grid, ruler and velocity canvases were as big as the whole clip: a
// 128-bar clip at DPR 2 was a 41 000 px canvas, past Chrome's 32 767 px limit,
// and every change repainted all of it. They now paint the visible window
// plus a margin, behind content-sized hit surfaces the handlers still use.

vi.mock('../StudioNotationView', () => ({ StudioNotationView: () => null }));

import { useStore } from '@/daw/store';
import { PianoRoll } from '../PianoRoll';
import { PAINT_MARGIN } from '../viewportCanvas';

const VIEW_W = 800;
const VIEW_H = 400;
const DPR = 2;

type Call = { name: string; args: unknown[] };
/** What each canvas was asked to draw, by canvas. */
const drawn = new WeakMap<HTMLCanvasElement, Call[]>();

function recordingContext(canvas: HTMLCanvasElement) {
  const calls: Call[] = [];
  drawn.set(canvas, calls);
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return () => ({ width: 10 });
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args });
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const descriptors = {
  clientWidth: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth',
  ),
  clientHeight: Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientHeight',
  ),
};
const getContext = HTMLCanvasElement.prototype.getContext;
const contexts = new WeakMap<HTMLCanvasElement, unknown>();

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => VIEW_W,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => VIEW_H,
  });
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    if (!contexts.has(this)) contexts.set(this, recordingContext(this));
    return contexts.get(this);
  } as unknown as typeof getContext;
});
afterAll(() => {
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor)
      Object.defineProperty(HTMLElement.prototype, key, descriptor);
  }
  HTMLCanvasElement.prototype.getContext = getContext;
});

beforeEach(() => {
  vi.stubGlobal('devicePixelRatio', DPR);
  useStore.setState({ chordRegions: [], rootNote: 0, mode: 'ionian' });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A note on every beat of `bars` bars, walking up and down an octave. */
function longClip(bars: number): MidiNoteEvent[] {
  return Array.from({ length: bars * 4 }, (_, beat) => ({
    note: 60 + (beat % 12),
    velocity: 90,
    startTick: beat * 480,
    durationTicks: 240,
    channel: 0,
  }));
}

function renderRoll(events: MidiNoteEvent[]) {
  const view = render(
    <PianoRoll
      events={events}
      clipStartTick={0}
      timelineStartTick={0}
      clipColor="#ff8800"
      onChange={() => {}}
    />,
  );
  // Paint canvases are the aria-hidden ones; each sits just before the hit
  // surface its lane's handlers measure.
  const paints = [
    ...view.container.querySelectorAll<HTMLCanvasElement>(
      'canvas[aria-hidden]',
    ),
  ];
  const [ruler, grid, vel] = paints.map((paint) => ({
    paint,
    surface: paint.nextElementSibling as HTMLCanvasElement,
    scroller: paint.parentElement as HTMLDivElement,
  }));
  return { ...view, ruler, grid, vel };
}

const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

/**
 * Lets the roll's first-frame auto-scroll to its notes land. jsdom fires no
 * scroll event for it, so this sends the one a browser would.
 */
async function settle(grid: { scroller: HTMLDivElement }) {
  await nextFrame();
  fireEvent.scroll(grid.scroller);
  await nextFrame();
}

describe('piano-roll canvases', () => {
  it('paints bitmaps the size of the view, not of a 128-bar clip', () => {
    const events = longClip(128);
    const { ruler, grid, vel } = renderRoll(events);
    // To the last note's end plus four beats of room, at 40 px a beat.
    const last = events.at(-1)!;
    const clipW = ((last.startTick + last.durationTicks) / 480 + 4) * 40;

    for (const lane of [ruler, grid, vel]) {
      expect(lane.surface.style.width).toBe(`${clipW}px`);
      expect([lane.surface.width, lane.surface.height]).toEqual([0, 0]);
      expect(lane.paint.width).toBeLessThanOrEqual(
        (VIEW_W + 2 * PAINT_MARGIN) * DPR,
      );
    }
    expect(grid.paint.height).toBeLessThanOrEqual(
      (VIEW_H + 2 * PAINT_MARGIN) * DPR,
    );
    // The old canvas would have been 41 280 device px wide.
    expect(clipW * DPR).toBeGreaterThan(32_767);
  });

  it('draws only the notes and stems in the window', () => {
    const { grid, vel } = renderRoll(longClip(128));
    const notes = drawn
      .get(grid.paint)!
      .filter((c) => c.name === 'roundRect').length;
    const stems = drawn.get(vel.paint)!.filter((c) => c.name === 'arc').length;
    // (800 + 256) px of a lane holds about 26 beats, a note on each.
    expect(notes).toBeGreaterThan(20);
    expect(notes).toBeLessThan(40);
    expect(stems).toBeGreaterThan(20);
    expect(stems).toBeLessThan(40);
  });

  it('repaints the window a scroll moves to, in every lane', async () => {
    const { ruler, grid, vel } = renderRoll(longClip(128));
    await settle(grid);
    const gridCalls = drawn.get(grid.paint)!;
    const before = gridCalls.length;

    grid.scroller.scrollLeft = 30_000;
    grid.scroller.scrollTop = 200;
    fireEvent.scroll(grid.scroller);
    await nextFrame();

    expect(gridCalls.length).toBeGreaterThan(before);
    expect(grid.paint.style.left).toBe(`${30_000 - PAINT_MARGIN}px`);
    expect(grid.paint.style.top).toBe('0px');
    // The ruler and velocity lane follow the grid's horizontal scroll.
    expect(ruler.scroller.scrollLeft).toBe(30_000);
    expect(ruler.paint.style.left).toBe(`${30_000 - PAINT_MARGIN}px`);
    expect(vel.paint.style.left).toBe(`${30_000 - PAINT_MARGIN}px`);
    // Notes there are drawn; the bar numbers too.
    const translate = gridCalls.filter((c) => c.name === 'setTransform').at(-1);
    expect(translate!.args).toEqual([
      DPR,
      0,
      0,
      DPR,
      -(30_000 - PAINT_MARGIN) * DPR,
      -0,
    ]);
  });

  it('leaves a small scroll to the margin already painted', async () => {
    const { grid } = renderRoll(longClip(128));
    await settle(grid);
    const calls = drawn.get(grid.paint)!;
    const before = calls.length;
    grid.scroller.scrollLeft = 60;
    grid.scroller.scrollTop += 40;
    fireEvent.scroll(grid.scroller);
    await nextFrame();
    expect(calls.length).toBe(before);
  });

  it('repaints at a new zoom, still the size of the view', async () => {
    const { grid } = renderRoll(longClip(16));
    const widthAt = () => parseFloat(grid.surface.style.width);
    const before = widthAt();
    for (let i = 0; i < 20; i++) {
      fireEvent.wheel(grid.scroller, { deltaY: -1, ctrlKey: true });
    }
    await nextFrame();
    expect(widthAt()).toBeGreaterThan(before * 2);
    expect(grid.paint.width).toBeLessThanOrEqual(
      (VIEW_W + 2 * PAINT_MARGIN) * DPR,
    );
  });
});
