// @vitest-environment jsdom
import { StrictMode, act, type ComponentType } from 'react';
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
import { ModuleDemo } from '../ModuleDemo';
import { ConnectionsScene } from '../scenes/ConnectionsScene';
import { SongsScene } from '../scenes/SongsScene';
import { StudioScene } from '../scenes/StudioScene';
import { TheoryScene } from '../scenes/TheoryScene';
import { LOOP } from '../scenes/connections/connectionsData';
import type { SceneProps } from '../scenes/sceneTypes';
import {
  CONNECTED_TOUR,
  SONGS_TOUR,
  THEORY_TOUR,
  TOUR_BY_ID,
  type TourScript,
} from '../tourSteps';

/**
 * The demos' sound rules, end to end through `ModuleDemo`: the Sound toggle
 * and its sticky mute, visitor playback pausing whenever Sound goes off, and
 * the Connected demo's Studio step keeping its loop through a visitor's
 * clicks. StrictMode, a manual rAF clock, a controllable IntersectionObserver
 * and a recording Tone mock.
 */

const env = vi.hoisted(() => {
  // A manual rAF queue, installed before framer-motion loads.
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    frames.set(++id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (i: number) => {
    frames.delete(i);
  };

  // IntersectionObserver: every element is on screen or none is.
  const state = {
    onScreen: true,
    starts: 0,
    drums: 0,
    defer: false,
    voices: 0,
  };
  const observers = new Set<StubObserver>();
  class StubObserver {
    els = new Set<Element>();
    constructor(public cb: IntersectionObserverCallback) {
      observers.add(this);
    }
    report(els: Element[]) {
      this.cb(
        els.map(
          (target) =>
            ({
              isIntersecting: state.onScreen,
              target,
            }) as IntersectionObserverEntry,
        ),
        this as unknown as IntersectionObserver,
      );
    }
    observe(el: Element) {
      this.els.add(el);
      queueMicrotask(() => this.report([el]));
    }
    unobserve(el: Element) {
      this.els.delete(el);
    }
    disconnect() {
      this.els.clear();
      observers.delete(this);
    }
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    StubObserver as unknown as typeof IntersectionObserver;

  /** Every chord the synth played, as MIDI numbers. */
  const chords: number[][] = [];
  /** The same chords: when (fake clock), scheduled or `now()`, velocity. */
  const hits: {
    midis: number[];
    at: number;
    scheduled: boolean;
    velocity: number;
  }[] = [];
  /** `startTone` calls held while `state.defer` is set (context latency). */
  const pending: { resolve: () => void; reject: (e: Error) => void }[] = [];
  return { frames, state, observers, chords, hits, pending };
});

vi.mock('tone', () => {
  class Voice {
    volume = { value: 0 };
    constructor() {
      env.state.voices += 1;
    }
    toDestination() {
      return this;
    }
    connect() {
      return this;
    }
    dispose() {}
    releaseAll() {}
    triggerAttackRelease(
      notes: unknown,
      _seconds: unknown,
      time?: number,
      velocity = 1,
    ) {
      // Chords arrive as MIDI numbers (see `Frequency`); drums don't.
      if (!Array.isArray(notes)) {
        env.state.drums += 1;
        return;
      }
      env.chords.push(notes as number[]);
      env.hits.push({
        midis: notes as number[],
        at: performance.now(),
        scheduled: time !== undefined,
        velocity,
      });
    }
  }
  return {
    PolySynth: Voice,
    Synth: Voice,
    MembraneSynth: Voice,
    NoiseSynth: Voice,
    Filter: Voice,
    Frequency: (m: number) => ({ toFrequency: () => m }),
    immediate: () => 0,
    now: () => 0,
    getContext: () => ({ state: 'running' }),
    start: async () => {},
  };
});

vi.mock('@/audio/core/toneBridge', () => ({
  startTone: () => {
    env.state.starts += 1;
    if (!env.state.defer) return Promise.resolve();
    return new Promise<void>((resolve, reject) =>
      env.pending.push({ resolve, reject }),
    );
  },
}));

let host: HTMLDivElement;
let root: Root;
let now = 0;
let hidden = false;

const flushMicro = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

/** Advances timers and frames together, 50 ms at a time. */
const step = async (ms: number) => {
  for (let i = 0; i < ms / 50; i++) {
    await act(async () => {
      now += 50;
      vi.advanceTimersByTime(50);
      const pending = [...env.frames.values()];
      env.frames.clear();
      pending.forEach((cb) => cb(now));
      await flushMicro();
    });
  }
};

const mount = async (
  tab: TourScript,
  Scene: ComponentType<SceneProps>,
  bleed = true,
) => {
  root = createRoot(host);
  await act(async () => {
    root.render(
      <StrictMode>
        <ModuleDemo tab={tab} Scene={Scene} bleed={bleed} />
      </StrictMode>,
    );
    await flushMicro();
  });
};

const click = async (el: Element | null | undefined) => {
  expect(el, 'element to click').toBeTruthy();
  await act(async () => {
    (el as HTMLElement).click();
    await flushMicro();
  });
};

/** A pointer event as a mouse or a finger sends it (a tap's click: detail 1). */
const pointer = async (
  el: Element | null | undefined,
  type: 'pointerdown' | 'pointercancel' | 'click',
  pointerType: 'mouse' | 'touch',
) => {
  expect(el, 'element to press').toBeTruthy();
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    detail: 1,
  });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  await act(async () => {
    el!.dispatchEvent(e);
    await flushMicro();
  });
};

/** The whole demo scrolls off screen (or back). */
const setOnScreen = async (on: boolean) => {
  env.state.onScreen = on;
  await act(async () => {
    for (const o of env.observers) o.report([...o.els]);
    await flushMicro();
  });
};

/** The audio context resumes (or refuses to) for every held `startTone`. */
const settleStarts = async (ok = true) => {
  env.state.defer = false;
  await act(async () => {
    for (const p of env.pending.splice(0))
      if (ok) p.resolve();
      else p.reject(new Error('blocked'));
    await flushMicro();
  });
};

const setHidden = async (value: boolean) => {
  hidden = value;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    await flushMicro();
  });
};

const demo = () => host.firstElementChild as HTMLElement;
const sound = () => demo().getAttribute('data-sound');
const status = () => demo().getAttribute('data-status');
const currentStep = () =>
  host.querySelector('[aria-current="step"]')?.textContent;
const stepBoxes = (tab: TourScript) => [
  ...host.querySelectorAll(`ol[aria-label="${tab.label} demo steps"] button`),
];
const soundToggle = () =>
  host.querySelector<HTMLButtonElement>(
    'button[aria-label="Mute demo sound"], button[aria-label="Turn on demo sound"]',
  );
const button = (label: string) =>
  host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
/** The transport's bar:beat:sixteenth readout (it trails a frame). */
const position = () =>
  host.querySelector('[role="timer"][aria-label="Position"]')?.textContent;
/** A click on no control at all: the step's caption under the window. */
const passiveClick = () => click(host.querySelector('p[aria-live]'));
const struck = (midis: number[]) =>
  env.chords.filter((c) => c.join() === midis.join()).length;
const hitsOf = (midis: number[]) =>
  env.hits.filter((h) => h.midis.join() === midis.join());
/** Struck by a pass, as the loop's own hits: scheduled, at its level. */
const ON_THE_CLOCK = { scheduled: true, velocity: 0.6 };
const byText = (text: string) =>
  [...host.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text),
  );

const STUDIO_TOUR = TOUR_BY_ID.studio;
/** The Connected demo's Studio step, 3 s in: the guided loop is on bar 2. */
const CONNECTED_STUDIO_MS = 3800 + 4600 + 3000;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  HTMLElement.prototype.scrollIntoView = () => {};
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
});

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'performance',
    ],
  });
  now = 0;
  hidden = false;
  // Frames are kept across tests: framer-motion's frame loop is module state,
  // and a dropped batch would stall it (readouts, glides) for good.
  env.chords.length = 0;
  env.hits.length = 0;
  env.pending.length = 0;
  env.state.defer = false;
  env.state.onScreen = true;
  env.state.starts = 0;
  env.state.drums = 0;
  env.state.voices = 0;
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('Sound toggle', () => {
  it.each([
    ['bleed', true, 1000],
    ['framed', false, 1000],
    ['bleed, compact', true, 375],
    ['framed, compact', false, 375],
  ])(
    'is always shown and says whether Sound is on (%s)',
    async (_, bleed, width) => {
      const spy = vi
        .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
        .mockReturnValue(width);
      try {
        await mount(CONNECTED_TOUR, ConnectionsScene, bleed);
        await step(500);
        let toggle = soundToggle();
        expect(toggle).toBeTruthy();
        expect(toggle).toHaveAccessibleName('Turn on demo sound');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        expect(toggle).toHaveTextContent('Sound');

        await passiveClick();
        toggle = soundToggle();
        expect(sound()).toBe('on');
        expect(toggle).toHaveAccessibleName('Mute demo sound');
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
      } finally {
        spy.mockRestore();
      }
    },
  );

  it('page load stays silent', async () => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(30_000);
    expect(env.state.starts).toBe(0);
    expect(env.chords).toEqual([]);
    expect(sound()).toBe('off');
  });

  it('issue 1: after a click that only navigates, the visitor can mute, and it sticks through clicks and autoplay', async () => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(500);
    // A step box only navigates, but it turns Sound on.
    await click(stepBoxes(CONNECTED_TOUR)[1]);
    expect(sound()).toBe('on');

    await click(soundToggle());
    expect(sound()).toBe('off');
    expect(soundToggle()).toHaveAccessibleName('Turn on demo sound');

    // Muted: passive clicks leave it off...
    await click(stepBoxes(CONNECTED_TOUR)[0]);
    await passiveClick();
    expect(sound()).toBe('off');
    // ...and the tour's return to autoplay (12 s idle) and its cues stay
    // silent.
    env.chords.length = 0;
    await step(40_000);
    expect(status()).toBe('playing');
    expect(env.chords).toEqual([]);
    expect(env.state.drums).toBe(0);
    expect(sound()).toBe('off');
  });

  it('turns Sound on and off without touching the tour, once per click', async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(1000);
    const stepBefore = currentStep();

    await click(soundToggle());
    // One enable: the demo's click-anywhere rule ignores its own toggle.
    expect(env.state.starts).toBe(1);
    expect(sound()).toBe('on');
    expect(status()).toBe('playing');
    expect(currentStep()).toBe(stepBefore);

    const heard = env.chords.length;
    await click(soundToggle());
    expect(sound()).toBe('off');
    expect(env.state.starts).toBe(1);
    expect(env.chords.length).toBe(heard);
    expect(status()).toBe('playing');
    expect(currentStep()).toBe(stepBefore);

    // Turning it back on is explicit: it clears the mute.
    await click(soundToggle());
    expect(sound()).toBe('on');
    await click(soundToggle());
    await click(soundToggle());
    await passiveClick();
    expect(sound()).toBe('on');
  });

  it('a Play clears the mute', async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    await click(soundToggle());
    await click(soundToggle());
    expect(sound()).toBe('off');

    await click(button('Play'));
    expect(sound()).toBe('on');
    expect(button('Pause')).toBeTruthy();
    await step(2000);
    expect(env.state.drums).toBeGreaterThan(0);

    // Not muted any more: a Pause turns Sound off, the next click turns it
    // on.
    await click(button('Pause'));
    expect(sound()).toBe('off');
    await passiveClick();
    expect(sound()).toBe('on');
  });

  it('a direct note gesture clears the mute and sounds', async () => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(500);
    await click(soundToggle());
    await click(soundToggle());
    expect(sound()).toBe('off');

    // The song's chart: each chord plays on a click.
    const chart = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.startsWith('F♯7'),
    );
    env.chords.length = 0;
    await click(chart);
    expect(sound()).toBe('on');
    expect(struck(LOOP[1].midis)).toBe(1);

    await click(soundToggle());
    expect(sound()).toBe('off');
    await passiveClick();
    expect(sound()).toBe('off');
  });

  it('Pause, Stop, leaving the screen and a hidden tab turn Sound off without muting it', async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);

    await click(button('Play'));
    await click(button('Pause'));
    expect(sound()).toBe('off');
    await passiveClick();
    expect(sound()).toBe('on');

    await click(button('Stop'));
    expect(sound()).toBe('off');
    await passiveClick();
    expect(sound()).toBe('on');

    await setOnScreen(false);
    expect(sound()).toBe('off');
    await setOnScreen(true);
    await passiveClick();
    expect(sound()).toBe('on');

    await setHidden(true);
    expect(sound()).toBe('off');
    await setHidden(false);
    await passiveClick();
    expect(sound()).toBe('on');
  });

  it('shows Sound on from the click, and a second click before the audio is up mutes it', async () => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(500);
    env.state.defer = true;
    await click(soundToggle());
    expect(soundToggle()).toHaveAccessibleName('Mute demo sound');
    expect(sound()).toBe('on');

    await click(soundToggle());
    expect(soundToggle()).toHaveAccessibleName('Turn on demo sound');
    await settleStarts();
    expect(sound()).toBe('off');
    await passiveClick();
    await step(3000);
    expect(sound()).toBe('off');
    expect(env.chords).toEqual([]);
  });

  it('unmounted while Sound is coming on, it builds nothing', async () => {
    const errors = vi.spyOn(console, 'error');
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    env.state.defer = true;
    await click(soundToggle());
    act(() => root.unmount());
    root = createRoot(host);
    await settleStarts();
    expect(env.state.voices).toBe(0);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('an audio context that won’t start leaves Sound off', async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    env.state.defer = true;
    await click(soundToggle());
    await settleStarts(false);
    expect(sound()).toBe('off');
    expect(soundToggle()).toHaveAccessibleName('Turn on demo sound');
  });

  // jsdom has no layout: this checks the markup that keeps the row's height
  // (the rows themselves are measured in Chromium, step by step).
  it.each([
    ['bleed', true, 1000],
    ['bleed, compact', true, 375],
    ['framed, compact', false, 375],
  ])(
    'the caption shares its cell with a hidden copy of every step’s callout (%s)',
    async (_, bleed, width) => {
      const spy = vi
        .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
        .mockReturnValue(width);
      try {
        await mount(STUDIO_TOUR, StudioScene, bleed);
        await step(500);
        const caption = host.querySelector('p[aria-live]');
        const cell = caption?.parentElement;
        expect(cell).toHaveClass('grid');
        expect(cell).not.toHaveClass('sr-only');
        expect(caption).toHaveClass('col-start-1', 'row-start-1');
        const copies = [
          ...(cell?.querySelectorAll('.invisible.col-start-1.row-start-1') ??
            []),
        ];
        expect(copies.map((el) => el.textContent)).toEqual(
          STUDIO_TOUR.steps.map((s) => s.callout),
        );
      } finally {
        spy.mockRestore();
      }
    },
  );

  it('framed, desktop: the caption is hidden while the cursor narrates', async () => {
    await mount(STUDIO_TOUR, StudioScene, false);
    await step(500);
    expect(status()).toBe('playing');
    expect(host.querySelector('p[aria-live]')?.parentElement).toHaveClass(
      'sr-only',
    );
    // The visitor's: shown, with its copies.
    await click(stepBoxes(STUDIO_TOUR)[1]);
    expect(status()).toBe('user');
    const cell = host.querySelector('p[aria-live]')?.parentElement;
    expect(cell).not.toHaveClass('sr-only');
    expect(cell?.querySelectorAll('.invisible')).toHaveLength(
      STUDIO_TOUR.steps.length,
    );
  });

  it('a finger that lands on a demo key to scroll leaves Sound off; a tap plays the key', async () => {
    await mount(THEORY_TOUR, TheoryScene);
    await step(500);
    const key = () => host.querySelector('button[aria-label="Note 60"]');

    // Scrolling from the keys: a pointerdown, then the browser takes over.
    // It could not start audio, so nothing claims Sound is on.
    await pointer(key(), 'pointerdown', 'touch');
    await pointer(key(), 'pointercancel', 'touch');
    await step(10_000);
    expect(env.state.starts).toBe(0);
    expect(sound()).toBe('off');
    expect(soundToggle()).toHaveAccessibleName('Turn on demo sound');
    expect(status()).toBe('playing');
    // So the first tap on the toggle turns it on.
    await click(soundToggle());
    expect(sound()).toBe('on');
    await click(soundToggle());

    // A tap plays on its click (a user activation).
    env.chords.length = 0;
    await pointer(key(), 'pointerdown', 'touch');
    expect(env.chords).toEqual([]);
    await pointer(key(), 'click', 'touch');
    expect(sound()).toBe('on');
    expect(struck([60])).toBe(1);
    // A mouse plays on press, once.
    await pointer(key(), 'pointerdown', 'mouse');
    expect(struck([60])).toBe(2);
    await pointer(key(), 'click', 'mouse');
    expect(struck([60])).toBe(2);
  });
});

describe('Sound off pauses the visitor’s playback', () => {
  /** Plays the Studio demo's created clip; returns once it has run 3 s. */
  const playStudio = async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    // "Create the clip": the clip is there, stopped.
    await click(stepBoxes(STUDIO_TOUR)[2]);
    await click(button('Play'));
    await step(3000);
    expect(button('Pause')).toBeTruthy();
    expect(env.chords.length).toBeGreaterThan(0);
  };

  /** Held on Play, silent, the playhead still; Play resumes from there. */
  const expectPausedThenResumes = async () => {
    expect(sound()).toBe('off');
    expect(button('Pause')).toBeNull();
    expect(button('Play')).toBeTruthy();
    await step(100);
    const held = position();
    const heard = env.chords.length;
    const drums = env.state.drums;
    await step(2000);
    expect(position()).toBe(held);
    expect(env.chords.length).toBe(heard);
    expect(env.state.drums).toBe(drums);

    await click(button('Play'));
    expect(sound()).toBe('on');
    expect(button('Pause')).toBeTruthy();
    await step(1500);
    expect(position()).not.toBe(held);
    expect(env.chords.length + env.state.drums).toBeGreaterThan(heard + drums);
    return held;
  };

  it('issue 2: Studio demo, scrolled off screen and back', async () => {
    await playStudio();
    await setOnScreen(false);
    await step(1000);
    await setOnScreen(true);
    await step(500);
    await expectPausedThenResumes();
  });

  it('Studio demo, muted', async () => {
    await playStudio();
    await click(soundToggle());
    await expectPausedThenResumes();
  });

  it('Studio demo, a hidden tab', async () => {
    await playStudio();
    await setHidden(true);
    await step(1000);
    await setHidden(false);
    await step(500);
    await expectPausedThenResumes();
  });

  it('Studio demo, "Play it back" started from its step box, muted', async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    await click(stepBoxes(STUDIO_TOUR)[3]);
    await step(2000);
    expect(button('Pause')).toBeTruthy();
    await click(soundToggle());
    await expectPausedThenResumes();
  });

  /** The Connected demo's Studio step, the visitor's own pass playing. */
  const playConnected = async () => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(500);
    await click(stepBoxes(CONNECTED_TOUR)[2]);
    await click(button('Play'));
    await step(3000);
    expect(button('Pause')).toBeTruthy();
    expect(env.chords.length).toBeGreaterThan(0);
  };

  it('issue 2: Connected demo’s Studio step, scrolled off screen and back', async () => {
    await playConnected();
    await setOnScreen(false);
    await step(1000);
    await setOnScreen(true);
    await step(500);
    await expectPausedThenResumes();
  });

  it('Connected demo’s Studio step, muted', async () => {
    await playConnected();
    await click(soundToggle());
    await expectPausedThenResumes();
  });

  /** The Studio demo, muted, on its auto "Play it back" (playing). */
  const toAutoPlayback = async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    await click(soundToggle());
    await click(soundToggle());
    expect(sound()).toBe('off');
    for (let i = 0; i < 200; i++) {
      if (currentStep()?.includes('Play it back') && button('Pause')) break;
      await step(250);
    }
    expect(status()).toBe('playing');
    expect(button('Pause')).toBeTruthy();
  };

  it.each([
    [
      'a dock tab',
      () =>
        [...host.querySelectorAll('button[aria-pressed="false"]')].find((b) =>
          /^(PRISM|PIANO ROLL)$/i.test(b.getAttribute('aria-label') ?? ''),
        ),
    ],
    ['a track’s Solo', () => host.querySelector('button[aria-label^="Solo "]')],
    ['the KEY pill', () => host.querySelector('button[aria-label^="Key: "]')],
  ])(
    'Studio demo, muted: taking over its auto playback with %s pauses it, and the tour plays on',
    async (_, control) => {
      await toAutoPlayback();
      await click(control());
      expect(status()).toBe('user');
      expect(sound()).toBe('off');
      expect(button('Pause')).toBeNull();
      expect(button('Play')).toBeTruthy();
      await step(100);
      const held = position();
      await step(2000);
      expect(position()).toBe(held);
      expect(env.chords).toEqual([]);
      expect(env.state.drums).toBe(0);
      // Nothing holds the tour in the visitor's hands: its autoplay returns.
      await step(12_000);
      expect(status()).toBe('playing');
    },
  );

  it('Studio demo, muted: its "Play it back" step box waits for a Play', async () => {
    await mount(STUDIO_TOUR, StudioScene);
    await step(500);
    await click(soundToggle());
    await click(soundToggle());
    await click(stepBoxes(STUDIO_TOUR)[3]);
    await expectPausedThenResumes();
  });

  it('Songs demo, muted on a rest: Play turns Sound on and plays on', async () => {
    await mount(SONGS_TOUR, SongsScene);
    await step(500);
    await click(byText('Sweet Home Alabama'));
    await click(button('Play'));
    // Its 4th bar is a rest: 13 beats in at 98 BPM.
    await step(8200);
    await click(soundToggle());
    expect(button('Play')).toBeTruthy();
    expect(host.textContent).toContain('Rest');
    const heard = env.chords.length;

    await click(button('Play'));
    expect(sound()).toBe('on');
    expect(soundToggle()).toHaveAccessibleName('Mute demo sound');
    expect(button('Stop')).toBeTruthy();
    // Back round to bar 1.
    await step(3000);
    expect(env.chords.length).toBeGreaterThan(heard);
  });

  it('Songs demo, muted', async () => {
    await mount(SONGS_TOUR, SongsScene);
    await step(500);
    await click(button('Play'));
    await step(3000);
    // Its pause is labelled Stop (it keeps the chord it stopped on).
    expect(button('Stop')).toBeTruthy();
    const heard = env.chords.length;
    expect(heard).toBeGreaterThan(0);

    await click(soundToggle());
    expect(button('Stop')).toBeNull();
    expect(button('Play')).toBeTruthy();
    await step(3000);
    expect(env.chords.length).toBe(heard);

    await click(button('Play'));
    expect(sound()).toBe('on');
    await step(3000);
    expect(env.chords.length).toBeGreaterThan(heard);
  });
});

describe('Connected demo: the guided loop through a visitor’s clicks', () => {
  const toGuidedLoop = async (soundOn = false) => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(100);
    // The toggle turns Sound on without taking the tour over.
    if (soundOn) await click(soundToggle());
    await step(CONNECTED_STUDIO_MS - 100);
    expect(currentStep()).toContain('Play it in the Studio');
    expect(status()).toBe('playing');
    expect(button('Pause')).toBeTruthy();
  };
  const ruler = (i: number) =>
    [...host.querySelectorAll('button')].find(
      (b) => b.textContent === LOOP[i].label,
    );

  it('issue 3: a ruler pick keeps it playing from the picked bar, heard on the click that turns Sound on', async () => {
    await toGuidedLoop();
    expect(sound()).toBe('off');
    expect(env.chords).toEqual([]);

    await click(ruler(2));
    expect(status()).toBe('user');
    expect(sound()).toBe('on');
    expect(button('Pause')).toBeTruthy();
    await step(50);
    // Its first hit, as the loop's own: on its clock, at its level.
    expect(hitsOf(LOOP[2].midis)).toEqual([
      expect.objectContaining(ON_THE_CLOCK),
    ]);
    expect(position()).toBe('3:1:1');

    await step(500);
    expect(button('Pause')).toBeTruthy();
    expect(position()).toMatch(/^3:/);
    expect(position()).not.toBe('3:1:1');
    // Its second half note, a half note later, then the next bar.
    await step(550);
    const [first, second] = hitsOf(LOOP[2].midis);
    expect(second).toMatchObject(ON_THE_CLOCK);
    expect(second.at - first.at).toBe(1000);
    await step(1000);
    expect(struck(LOOP[3].midis)).toBe(1);
    expect(position()).toMatch(/^4:/);
  });

  it('the click that turns Sound on is heard once the audio context is up', async () => {
    await toGuidedLoop();
    env.state.defer = true;
    const pickAt = performance.now();
    await click(ruler(2));
    expect(sound()).toBe('on');
    // The pass's first hit came due before the audio did: nothing yet...
    await step(100);
    expect(env.hits).toEqual([]);
    // ...so it's struck as soon as it's up, once, and the bar keeps time.
    await settleStarts();
    await step(50);
    expect(hitsOf(LOOP[2].midis)).toEqual([
      expect.objectContaining(ON_THE_CLOCK),
    ]);
    await step(1000);
    const hits = hitsOf(LOOP[2].midis);
    expect(hits).toHaveLength(2);
    expect(Math.abs(hits[1].at - pickAt - 1000)).toBeLessThanOrEqual(50);
    expect(button('Pause')).toBeTruthy();
  });

  it('with Sound already on, a pick strikes its bar once, on the loop’s clock', async () => {
    await toGuidedLoop(true);
    expect(sound()).toBe('on');
    env.hits.length = 0;

    await click(ruler(0));
    await step(50);
    expect(hitsOf(LOOP[0].midis)).toEqual([
      expect.objectContaining(ON_THE_CLOCK),
    ]);
    await step(850);
    expect(hitsOf(LOOP[0].midis)).toHaveLength(1);
    await step(200);
    const [first, second] = hitsOf(LOOP[0].midis);
    expect(second.at - first.at).toBe(1000);
    expect(button('Pause')).toBeTruthy();
  });

  it('a pick during the visitor’s own pass strikes on its clock too', async () => {
    await mount(CONNECTED_TOUR, ConnectionsScene);
    await step(500);
    await click(stepBoxes(CONNECTED_TOUR)[2]);
    await click(button('Play'));
    await step(1300);
    env.hits.length = 0;

    await click(ruler(2));
    await step(1050);
    const [first, second] = hitsOf(LOOP[2].midis);
    expect(first).toMatchObject(ON_THE_CLOCK);
    expect(second.at - first.at).toBe(1000);
  });

  it.each([
    [
      'a key on the piano roll',
      () =>
        host.querySelector(
          '[aria-label="Piano roll keys"] button[aria-label^="Play "]',
        ),
    ],
    ['the KEY pill', () => host.querySelector('button[aria-label^="Key: "]')],
  ])(
    'with Sound on, taking it over with %s doesn’t strike the sounding chord again',
    async (_, control) => {
      await toGuidedLoop(true);
      // Into bar 2's first half note, which the guided loop struck.
      await step(300);
      env.hits.length = 0;
      await click(control());
      expect(button('Pause')).toBeTruthy();
      await step(400);
      expect(hitsOf(LOOP[1].midis)).toEqual([]);
      // Its second half note, on time.
      await step(600);
      expect(hitsOf(LOOP[1].midis)).toEqual([
        expect.objectContaining(ON_THE_CLOCK),
      ]);
    },
  );

  const rollKey = () =>
    host.querySelector(
      '[aria-label="Piano roll keys"] button[aria-label^="Play "]',
    );
  const keyPill = () => host.querySelector('button[aria-label^="Key: "]');

  it('Sound turned on mid-note: a take-over strikes the chord the loop played silently', async () => {
    await toGuidedLoop();
    await step(300);
    await click(soundToggle());
    await step(100);
    env.hits.length = 0;
    await click(rollKey());
    await step(50);
    expect(hitsOf(LOOP[1].midis)).toEqual([
      expect.objectContaining(ON_THE_CLOCK),
    ]);
  });

  it('after a focus pause, a take-over strikes the chord that has died away', async () => {
    await toGuidedLoop(true);
    await step(300);
    // Keyboard focus in the demo pauses the tour (and the loop with it).
    const matches = vi
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(function (this: Element, sel: string) {
        return sel === ':focus-visible';
      });
    try {
      await act(async () => {
        (rollKey() as HTMLElement).focus();
        await flushMicro();
      });
    } finally {
      matches.mockRestore();
    }
    expect(status()).toBe('paused');
    await step(3000);
    env.hits.length = 0;
    await click(rollKey());
    await step(50);
    expect(hitsOf(LOOP[1].midis)).toEqual([
      expect.objectContaining(ON_THE_CLOCK),
    ]);
  });

  it.each([
    ['a key on the piano roll', rollKey],
    ['the KEY pill', keyPill],
  ])(
    'taking it over with %s, on the click that turns Sound on, its chord is heard once the audio context is up',
    async (_, control) => {
      await toGuidedLoop();
      await step(300);
      env.state.defer = true;
      const at = performance.now();
      await click(control());
      expect(button('Pause')).toBeTruthy();
      await step(100);
      expect(env.hits).toEqual([]);
      await settleStarts();
      await step(50);
      // The rest of its half note, on the loop's clock...
      expect(hitsOf(LOOP[1].midis)).toEqual([
        expect.objectContaining(ON_THE_CLOCK),
      ]);
      // ...then its second half note, on time.
      await step(600);
      const hits = hitsOf(LOOP[1].midis);
      expect(hits).toHaveLength(2);
      expect(Math.abs(hits[1].at - at - 700)).toBeLessThanOrEqual(50);
    },
  );

  it('muted, with the audio context running: a take-over strikes its chord once', async () => {
    await toGuidedLoop(true);
    await click(soundToggle());
    expect(sound()).toBe('off');
    await step(300);
    env.hits.length = 0;
    await click(rollKey());
    expect(sound()).toBe('on');
    await step(650);
    expect(hitsOf(LOOP[1].midis)).toEqual([
      expect.objectContaining(ON_THE_CLOCK),
    ]);
    expect(button('Pause')).toBeTruthy();
  });

  it('a pick of the bar that is playing restarts it', async () => {
    await toGuidedLoop(true);
    await step(500);
    expect(position()).toMatch(/^2:/);
    expect(position()).not.toBe('2:1:1');
    await click(ruler(1));
    await step(50);
    expect(position()).toBe('2:1:1');
    expect(button('Pause')).toBeTruthy();
    await step(500);
    expect(position()).toMatch(/^2:/);
    expect(position()).not.toBe('2:1:1');
  });

  it('a key on the piano roll keeps it playing where it was', async () => {
    await toGuidedLoop();
    const key = host.querySelector(
      '[aria-label="Piano roll keys"] button[aria-label^="Play "]',
    );
    await click(key);
    expect(status()).toBe('user');
    expect(sound()).toBe('on');
    expect(button('Pause')).toBeTruthy();
    await step(50);
    // Bar 2 (F♯7), where the guided loop was.
    const at = position();
    expect(at).toMatch(/^2:1:/);
    await step(1000);
    expect(button('Pause')).toBeTruthy();
    expect(position()).not.toBe(at);
    expect(struck(LOOP[1].midis)).toBeGreaterThan(0);
  });

  it('the KEY pill keeps it playing', async () => {
    await toGuidedLoop();
    await click(host.querySelector('button[aria-label^="Key: "]'));
    expect(status()).toBe('user');
    expect(button('Pause')).toBeTruthy();
    expect(struck(LOOP[LOOP.length - 1].midis)).toBe(1);
    await step(1000);
    expect(button('Pause')).toBeTruthy();
  });

  it('Pause holds the playhead where it was, and Play resumes there', async () => {
    await toGuidedLoop();
    await step(500);
    await click(button('Pause'));
    expect(button('Play')).toBeTruthy();
    await step(100);
    const at = position();
    // Mid-bar, not parked at its start.
    expect(at).toMatch(/^2:/);
    expect(at).not.toBe('2:1:1');
    await step(1000);
    expect(position()).toBe(at);

    await click(button('Play'));
    expect(sound()).toBe('on');
    await step(500);
    expect(position()).toMatch(/^2:/);
    expect(position()).not.toBe(at);
  });

  it('Stop still stops at the top', async () => {
    await toGuidedLoop();
    await click(button('Stop'));
    expect(button('Play')).toBeTruthy();
    await step(50);
    expect(position()).toBe('1:1:1');
    expect(sound()).toBe('off');
  });
});

describe('A Play waiting on the audio context', () => {
  const cases = [
    ['Studio demo', STUDIO_TOUR, StudioScene],
    ['Connected demo’s Studio step', CONNECTED_TOUR, ConnectionsScene],
  ] as const;
  const interruptions = [
    [
      'the demo leaves the screen',
      () => setOnScreen(false),
      () => setOnScreen(true),
    ],
    ['the tab hides', () => setHidden(true), () => setHidden(false)],
    ['the visitor mutes', () => click(soundToggle()), async () => {}],
  ] as const;

  /** On the scene's Studio, stopped, Sound off (not muted). */
  const toStopped = async (
    tab: TourScript,
    Scene: ComponentType<SceneProps>,
  ) => {
    await mount(tab, Scene);
    await step(500);
    await click(stepBoxes(tab)[2]);
    await click(button('Stop'));
    await step(100);
    expect(sound()).toBe('off');
    expect(button('Play')).toBeTruthy();
  };

  describe.each(cases)('%s', (_, tab, Scene) => {
    it.each(interruptions)(
      'is dropped if %s before Sound is on',
      async (__, interrupt, restore) => {
        await toStopped(tab, Scene);
        env.state.defer = true;
        await click(button('Play'));
        // Coming on: shown as on, and the Play waits for it.
        expect(sound()).toBe('on');
        expect(button('Pause')).toBeNull();

        await interrupt();
        await settleStarts();
        await step(500);
        await restore();
        await step(300);
        expect(sound()).toBe('off');
        expect(button('Pause')).toBeNull();
        const held = position();
        await step(2000);
        expect(position()).toBe(held);
        expect(env.chords).toEqual([]);
        expect(env.state.drums).toBe(0);
      },
    );

    it('starts once Sound is on', async () => {
      await toStopped(tab, Scene);
      env.state.defer = true;
      await click(button('Play'));
      await step(200);
      expect(button('Pause')).toBeNull();
      await settleStarts();
      expect(button('Pause')).toBeTruthy();
      expect(sound()).toBe('on');
      await step(2000);
      expect(env.chords.length).toBeGreaterThan(0);
    });

    it('never starts if the audio context won’t', async () => {
      await toStopped(tab, Scene);
      env.state.defer = true;
      await click(button('Play'));
      await settleStarts(false);
      await step(500);
      expect(sound()).toBe('off');
      expect(button('Pause')).toBeNull();
    });
  });
});
