// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { LissajousMark } from '../motion/LissajousMark';
import {
  createRenderer,
  DEPTH_BINS,
  LOGO,
  REST_PATHS,
  type Curve,
} from '../motion/lissajous';

const motion = vi.hoisted(() => ({ reduce: false }));

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => motion.reduce,
}));

/** A manual rAF queue: frames run only when the test flushes them. */
const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
const requestFrame = vi.fn((cb: FrameRequestCallback) => {
  frames.set(++nextId, cb);
  return nextId;
});
const flushFrame = (now: number) => {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((cb) => cb(now)));
};

let host: HTMLDivElement;
let root: Root;

const mount = (
  props: {
    cue?: number;
    curve?: Curve;
    onHover?: () => void;
    onLand?: () => void;
    landLead?: number;
    onRest?: () => void;
  } = {},
) => {
  act(() => {
    root.render(
      <StrictMode>
        <LissajousMark className="size-20" {...props} />
      </StrictMode>,
    );
  });
};

const binPaths = () => [...host.querySelectorAll('[data-bin]')];
const haloPaths = () => [...host.querySelectorAll('[data-halo]')];
const shapes = () => binPaths().map((p) => p.getAttribute('d'));

const ONE_THREE: Curve = { ratio: [1, 3], phase: 2.5 * Math.PI };
const FOUR_ONE: Curve = { ratio: [4, 1], phase: 10.05 * Math.PI };
const EIGHT: Curve = { ratio: [1, 2], phase: 5 * Math.PI };
const restOf = (curve: Curve) => createRenderer()(0, curve, curve).paths;

const hover = () =>
  act(() => {
    host.querySelector('svg')?.dispatchEvent(new Event('pointerenter'));
  });

/** Flushes 100 ms frames from frame `from` until the loop stops; returns the next frame. */
const playOut = (from: number) => {
  let f = from;
  while (frames.size && f < from + 5000) flushFrame(f++ * 100);
  return f;
};

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  frames.clear();
  requestFrame.mockClear();
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('LissajousMark', () => {
  it('is the static logo, with no animation loop, under reduced motion', () => {
    motion.reduce = true;
    mount();
    expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 129 128',
    );
    expect(binPaths()).toHaveLength(0);
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('opens at rest as the logo, reporting the rest, with no loop running', () => {
    motion.reduce = false;
    const onRest = vi.fn();
    mount({ curve: LOGO, onRest });
    const svg = host.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(shapes()).toEqual(REST_PATHS);
    expect(binPaths()).toHaveLength(DEPTH_BINS);
    haloPaths().forEach((h) =>
      expect(h.getAttribute('stroke-width')).toBe('0'),
    );
    expect(frames.size).toBe(0);
    expect(onRest).toHaveBeenCalled();
  });

  it('moves to the next curve on a cue, lands, fades and stops', () => {
    motion.reduce = false;
    const events: string[] = [];
    const onLand = () => events.push('land');
    const onRest = () => events.push('rest');
    mount({ cue: 0, curve: LOGO, onLand, onRest });
    events.length = 0;
    const logoWeight = binPaths()[0].getAttribute('stroke-width');

    mount({ cue: 1, curve: EIGHT, onLand, onRest });
    expect(frames.size).toBe(1);
    for (let f = 0; f < 5; f++) flushFrame(f * 100);
    expect(shapes()).not.toEqual(REST_PATHS);
    // A 1 s morph: it lands around the tenth 100 ms frame.
    for (let f = 5; f < 12; f++) flushFrame(f * 100);
    expect(events).toEqual(['land']);
    playOut(12);
    expect(events).toEqual(['land', 'rest']);
    expect(frames.size).toBe(0);
    expect(shapes()).toEqual(restOf(EIGHT));
    for (const p of binPaths()) {
      expect(p.getAttribute('stroke')).toBe('rgb(255,255,255)');
    }
    // 1:2 is sparser than the logo, so its solid line rests a little heavier.
    expect(Number(binPaths()[0].getAttribute('stroke-width'))).toBeGreaterThan(
      Number(logoWeight),
    );
  });

  it('reports the landing early by `landLead`, so a caller can finish with it', () => {
    motion.reduce = false;
    const onLand = vi.fn();
    mount({ cue: 0, curve: LOGO, onLand, landLead: 0.7 });
    mount({ cue: 1, curve: EIGHT, onLand, landLead: 0.7 });
    // 1 s morph, 0.7 s lead: it fires at 0.3 s, well before the curve lands.
    for (let f = 0; f < 3; f++) flushFrame(f * 100);
    expect(onLand).not.toHaveBeenCalled();
    for (let f = 3; f < 6; f++) flushFrame(f * 100);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(shapes()).not.toEqual(restOf(EIGHT));
    playOut(6);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(shapes()).toEqual(restOf(EIGHT));
  });

  it('drops a cue that arrives mid-move', () => {
    motion.reduce = false;
    mount({ cue: 0, curve: LOGO });
    mount({ cue: 1, curve: ONE_THREE });
    for (let f = 0; f < 5; f++) flushFrame(f * 100);
    mount({ cue: 2, curve: FOUR_ONE });
    expect(frames.size).toBe(1);
    const end = playOut(5);
    expect(shapes()).toEqual(restOf(ONE_THREE));

    mount({ cue: 3, curve: FOUR_ONE });
    playOut(end);
    expect(shapes()).toEqual(restOf(FOUR_ONE));
  });

  it('reports a hover only while resting, and never moves by itself', () => {
    motion.reduce = false;
    const onHover = vi.fn();
    mount({ cue: 0, curve: LOGO, onHover });
    mount({ cue: 1, curve: ONE_THREE, onHover });
    for (let f = 0; f < 5; f++) flushFrame(f * 100);
    hover();
    expect(onHover).not.toHaveBeenCalled();

    playOut(5);
    hover();
    expect(onHover).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it('leaves no frame pending after unmount', () => {
    motion.reduce = false;
    mount({ cue: 0, curve: LOGO });
    mount({ cue: 1, curve: ONE_THREE });
    flushFrame(0);
    expect(frames.size).toBe(1);
    act(() => root.unmount());
    expect(frames.size).toBe(0);
    root = createRoot(host);
  });
});
