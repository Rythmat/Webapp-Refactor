// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AllSlices } from '@/daw/store';
import { DemoPlayer, codeOfKey, type DemoFrame } from '../demo/demoPlayer';
import {
  AFTER_MS,
  GLIDE_MS,
  MISSING_TARGET_MS,
  readingMs,
  type DemoBeat,
} from '../demo/demoTypes';
import { anchorEl } from './anchorTestUtils';

// ── The demo player (TutorialStep.demo) ────────────────────────────────────
// It plays a step's beats in order on the real DOM: the cursor's frames for
// the stage, then each action on its element (the whole pointer and mouse
// sequence for a click, a key press, store actions). A target that isn't
// there is passed over after a short wait; Skip runs what is left at once;
// abort stops it where it is; reduced motion drops the glide's wait.

const BOX = { top: 100, left: 200, width: 40, height: 20 };
const CENTER = { x: 220, y: 110 };

const POINTER_TYPES = [
  'pointerover',
  'pointerenter',
  'mouseover',
  'mouseenter',
  'pointermove',
  'mousemove',
  'pointerdown',
  'mousedown',
  'pointerup',
  'mouseup',
  'click',
  'dblclick',
  'pointerout',
  'pointerleave',
  'mouseout',
  'mouseleave',
];

/** Records every pointer and mouse event `el` gets, as `id:type`. */
function record(el: Element, id: string, log: string[]) {
  for (const type of POINTER_TYPES) {
    el.addEventListener(type, () => log.push(`${id}:${type}`));
  }
}

const fakeStore = { tag: 'store' } as unknown as AllSlices;

function player(beats: DemoBeat[], reduced = false) {
  const frames: DemoFrame[] = [];
  const p = new DemoPlayer(beats, {
    onFrame: (f) => frames.push(f),
    reducedMotion: () => reduced,
    getStore: () => fakeStore,
  });
  return { p, frames };
}

async function playToEnd(p: DemoPlayer) {
  const done = p.play();
  await vi.runAllTimersAsync();
  return done;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('the demo player', () => {
  it('plays the beats in order and does each action on its element', async () => {
    const log: string[] = [];
    record(anchorEl('a-button', BOX), 'a', log);
    record(anchorEl('b-clip', { ...BOX, top: 300 }), 'b', log);
    record(anchorEl('c-hint', { ...BOX, left: 500 }), 'c', log);
    const keys: string[] = [];
    window.addEventListener('keydown', (e) =>
      keys.push(`down:${e.code}:${e.target === document.body}`),
    );
    window.addEventListener('keyup', (e) => keys.push(`up:${e.code}`));
    const run = vi.fn(() => void log.push('run'));

    const { p, frames } = player([
      { target: 'a-button', caption: 'Click it', action: 'click' },
      { target: 'b-clip', caption: 'Twice', action: 'doubleClick' },
      { target: 'c-hint', caption: 'Hover', action: 'hover' },
      { caption: 'Loop it', action: { key: 'l' } },
      { target: 'a-button', caption: 'Store', action: run },
    ]);
    await expect(playToEnd(p)).resolves.toBe('done');

    const a = log.filter((e) => e.startsWith('a:')).slice(0, 11);
    expect(a).toEqual([
      'a:pointerover',
      'a:pointerenter',
      'a:mouseover',
      'a:mouseenter',
      'a:pointermove',
      'a:mousemove',
      'a:pointerdown',
      'a:mousedown',
      'a:pointerup',
      'a:mouseup',
      'a:click',
    ]);
    // The pointer leaves a before it enters b.
    expect(log.indexOf('a:pointerout')).toBeLessThan(
      log.indexOf('b:pointerover'),
    );
    const b = log.filter((e) => /^b:(pointerdown|click|dblclick)$/.test(e));
    expect(b).toEqual([
      'b:pointerdown',
      'b:click',
      'b:pointerdown',
      'b:click',
      'b:dblclick',
    ]);
    // A hover doesn't click, and the pointer leaves when the cursor moves on.
    expect(log).toContain('c:pointerover');
    expect(log).not.toContain('c:click');
    expect(log).toContain('c:pointerleave');
    // The shortcut lands on the page, as one pressed with nothing focused.
    expect(keys).toEqual(['down:KeyL:true', 'up:KeyL']);
    expect(run).toHaveBeenCalledWith(fakeStore);
    // Store actions come last, after the key press.
    expect(log.at(-1)).toBe('run');

    // The callouts, in order, each beside the cursor at its target's center.
    const captions = frames.flatMap((f) => (f.caption ? [f.caption] : []));
    expect([...new Set(captions)]).toEqual([
      'Click it',
      'Twice',
      'Hover',
      'Loop it',
      'Store',
    ]);
    expect(frames.find((f) => f.caption === 'Click it')?.point).toEqual(CENTER);
    // The clicks ripple; the cursor is hidden once it's over.
    expect(frames.filter((f) => f.clickKey).length).toBe(2);
    expect(frames.at(-1)).toMatchObject({ point: null, caption: null });
  });

  it('paces a beat: the glide, the time to read, the action, the pause', async () => {
    const click = vi.fn();
    anchorEl('a-button', BOX).addEventListener('click', click);
    const caption = 'Mix shows every track';
    const { p, frames } = player([
      { target: 'a-button', caption, action: 'click' },
      { target: 'a-button', caption: 'Then this', holdMs: 50 },
    ]);
    const done = p.play();
    await vi.advanceTimersByTimeAsync(0);
    // Gliding: the cursor moves, the callout waits.
    expect(frames.at(-1)).toMatchObject({ point: CENTER, caption: null });
    await vi.advanceTimersByTimeAsync(GLIDE_MS);
    expect(frames.at(-1)?.caption).toBe(caption);
    expect(click).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(readingMs(caption));
    expect(click).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(AFTER_MS - 1);
    expect(frames.some((f) => f.caption === 'Then this')).toBe(false);
    await vi.advanceTimersByTimeAsync(GLIDE_MS + 1);
    expect(frames.at(-1)?.caption).toBe('Then this');
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe('done');
  });

  it('keeps the mouse event back when a control cancels pointerdown, as a browser does', async () => {
    const log: string[] = [];
    const el = anchorEl('menu-trigger', BOX);
    record(el, 'm', log);
    el.addEventListener('pointerdown', (e) => e.preventDefault());
    const { p } = player([
      { target: 'menu-trigger', caption: 'Open it', action: 'click' },
    ]);
    await playToEnd(p);
    expect(log).toContain('m:pointerdown');
    expect(log).not.toContain('m:mousedown');
    expect(log).toContain('m:click');
  });

  it('presses a key on its element when asked, with ⌘ or Ctrl for mod', async () => {
    const field = anchorEl('name-field', BOX, { tag: 'input' });
    const seen: KeyboardEvent[] = [];
    field.addEventListener('keydown', (e) => seen.push(e as KeyboardEvent));
    const { p } = player([
      {
        target: 'name-field',
        caption: 'Save',
        action: { key: 's', mod: true, on: 'element' },
      },
    ]);
    await playToEnd(p);
    expect(seen).toHaveLength(1);
    expect(seen[0].code).toBe('KeyS');
    expect(seen[0].metaKey || seen[0].ctrlKey).toBe(true);
    expect(document.activeElement).toBe(field);
  });

  it('names key codes as the editor’s shortcuts read them', () => {
    expect(codeOfKey('l')).toBe('KeyL');
    expect(codeOfKey('L')).toBe('KeyL');
    expect(codeOfKey(' ')).toBe('Space');
    expect(codeOfKey('3')).toBe('Digit3');
    expect(codeOfKey('Escape')).toBe('Escape');
  });

  it('passes over a target that isn’t on screen, after a short wait', async () => {
    const click = vi.fn();
    anchorEl('here', BOX).addEventListener('click', click);
    const missed = vi.fn();
    const restore = vi.fn();
    const { p, frames } = player([
      { target: 'nowhere', caption: 'Not shown', action: 'click' },
      // A store action still runs: it may be the demo's restore.
      { target: 'nowhere-either', caption: 'Restore', action: restore },
      { target: 'here', caption: 'Shown', action: 'click' },
    ]);
    document.addEventListener('click', missed);
    const done = p.play();
    await vi.advanceTimersByTimeAsync(MISSING_TARGET_MS - 100);
    expect(frames.some((f) => f.caption === 'Not shown')).toBe(false);
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe('done');
    expect(frames.some((f) => f.caption === 'Not shown')).toBe(false);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(missed).toHaveBeenCalledTimes(1);
  });

  it('finds a target that comes on screen while it waits', async () => {
    const click = vi.fn();
    const { p } = player([
      { target: 'late', caption: 'Here it is', action: 'click' },
    ]);
    const done = p.play();
    await vi.advanceTimersByTimeAsync(500);
    anchorEl('late', BOX).addEventListener('click', click);
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe('done');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('never hangs: a demo of missing targets ends', async () => {
    const { p } = player([
      { target: 'gone-1', caption: 'One', action: 'click' },
      { target: 'gone-2', caption: 'Two', action: 'hover' },
    ]);
    const done = p.play();
    await vi.advanceTimersByTimeAsync(2 * (MISSING_TARGET_MS + 200));
    await expect(done).resolves.toBe('done');
  });

  it('skips to the end at once: the beats left still run, unseen', async () => {
    const log: string[] = [];
    anchorEl('mute', BOX).addEventListener('click', () => log.push('mute'));
    anchorEl('unmute', { ...BOX, top: 300 }).addEventListener('click', () =>
      log.push('unmute'),
    );
    const { p, frames } = player([
      { target: 'mute', caption: 'Mute the bass', action: 'click' },
      { target: 'unmute', caption: 'And back on', action: 'click' },
      { caption: 'All done', action: () => void log.push('run') },
    ]);
    const done = p.play();
    await vi.advanceTimersByTimeAsync(GLIDE_MS + 100);
    expect(log).toEqual([]);
    const seen = frames.length;
    p.skip();
    expect(p.skipping).toBe(true);
    // A few renders' worth, nowhere near the demo's own pace.
    await vi.advanceTimersByTimeAsync(400);
    await expect(done).resolves.toBe('skipped');
    expect(log).toEqual(['mute', 'unmute', 'run']);
    // Nothing more is shown once skipped: no cursor, no callouts.
    expect(
      frames.slice(seen).every((f) => f.point === null && f.caption === null),
    ).toBe(true);
  });

  it('stops where it is when aborted', async () => {
    const click = vi.fn();
    anchorEl('a-button', BOX).addEventListener('click', click);
    const leave = vi.fn();
    const hint = anchorEl('hint', { ...BOX, top: 300 });
    hint.addEventListener('pointerleave', leave);
    const { p } = player([
      { target: 'hint', caption: 'Hover', action: 'hover' },
      { target: 'a-button', caption: 'Never', action: 'click' },
    ]);
    const done = p.play();
    await vi.advanceTimersByTimeAsync(GLIDE_MS + 10);
    p.abort();
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe('aborted');
    expect(click).not.toHaveBeenCalled();
    // The pointer it left over the hint is taken off.
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('under reduced motion, jumps: no glide to wait for', async () => {
    const click = vi.fn();
    anchorEl('a-button', BOX).addEventListener('click', click);
    const { p, frames } = player(
      [
        {
          target: 'a-button',
          caption: 'Click it',
          action: 'click',
          holdMs: 300,
        },
      ],
      true,
    );
    const done = p.play();
    await vi.advanceTimersByTimeAsync(0);
    // The callout shows as the cursor gets there, at once.
    expect(frames.at(-1)).toMatchObject({ point: CENTER, caption: 'Click it' });
    await vi.advanceTimersByTimeAsync(300);
    expect(click).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe('done');
  });

  it('waits for a store action’s promise, but not forever', async () => {
    const after = vi.fn();
    const { p } = player([
      { caption: 'Slow', action: () => new Promise<void>(() => {}) },
      { caption: 'Next', action: after },
    ]);
    const done = p.play();
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe('done');
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('goes on past a beat that throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const after = vi.fn();
    const { p } = player([
      {
        caption: 'Oops',
        action: () => {
          throw new Error('no such track');
        },
      },
      { caption: 'Next', action: after },
    ]);
    await expect(playToEnd(p)).resolves.toBe('done');
    expect(after).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
