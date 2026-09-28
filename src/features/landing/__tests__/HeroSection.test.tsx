// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { HeroSection } from '../sections/HeroSection';
import { HERO_WORDS } from '../sections/heroWords';

/** A manual rAF queue, installed before framer-motion loads. */
const raf = vi.hoisted(() => {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    frames.set(++id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (i: number) => {
    frames.delete(i);
  };
  return { frames };
});

let host: HTMLDivElement;
let root: Root;
let now = 0;

/** Advances timers and frames together in 100 ms steps, recording each title. */
const run = (seconds: number, titles: string[]) => {
  for (let i = 0; i < seconds * 10; i++) {
    act(() => {
      now += 100;
      vi.advanceTimersByTime(100);
      const pending = [...raf.frames.values()];
      raf.frames.clear();
      pending.forEach((cb) => cb(now));
    });
    const title = host.querySelector('#hero-title .sr-only')?.textContent ?? '';
    if (titles.at(-1) !== title) titles.push(title);
  }
};

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  now = 0;
  raf.frames.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      <StrictMode>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </StrictMode>,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('HeroSection title', () => {
  it('shows one word, changing as each move of the mark lands', () => {
    const titles: string[] = [];
    run(45, titles);
    expect(titles.slice(0, HERO_WORDS.length + 2)).toEqual([
      ...HERO_WORDS.map((w) => w.text),
      'Music Atlas',
      HERO_WORDS[1].text,
    ]);
  });

  it('gives the heading its one word, once, for screen readers', () => {
    const h1 = host.querySelector('h1#hero-title');
    expect(h1?.querySelectorAll('.sr-only')).toHaveLength(1);
    expect(h1?.querySelector('.sr-only')?.textContent).toBe('Music Atlas');
    // The visible word is decorative, and scrambles in.
    run(1.5, []);
    const visible = h1?.querySelector(':scope > [aria-hidden]');
    expect(visible?.textContent).toBe('Music Atlas');
  });
});
