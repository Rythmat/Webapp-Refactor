// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { frameTaskNames } from '@/daw/engine/engineClock';
import {
  ANCHOR_ALIASES,
  ANCHOR_FRAME_TASK,
  type Rect,
  currentAnchorId,
  rackOfFxTrack,
  registerAnchor,
  resolveAnchor,
  subscribeAnchorRect,
} from '../anchorRegistry';
import {
  anchorEl,
  flushFrame,
  setBox,
  settleMutations,
  stubFrames,
} from './anchorTestUtils';

// ── The tutorial anchor registry (practice-tutorial-16, ia-flows-29) ───────
// One shared way to find and measure what a lesson step points at, without a
// per-frame loop: a measurement runs on the editor's frame loop only after
// something moved, and an anchor that mounts late is scrolled into view
// (practice-tutorial-20).

const BOX = { top: 100, left: 200, width: 80, height: 30 };

let scrolled: Element[];
const cleanups: Array<() => void> = [];

beforeEach(() => {
  stubFrames();
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this);
  });
});

afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function watch(
  target: string | string[],
  options?: Parameters<typeof subscribeAnchorRect>[2],
) {
  const calls: Array<{ rect: Rect | null; id: string | null }> = [];
  cleanups.push(
    subscribeAnchorRect(
      target,
      (rect, id) => calls.push({ rect, id }),
      options,
    ),
  );
  return calls;
}

describe('resolveAnchor', () => {
  it('takes the first id with a box, in priority order', () => {
    anchorEl('menu-card', { ...BOX, width: 0, height: 0 }); // not drawn yet
    const button = anchorEl('menu-button', BOX);
    expect(resolveAnchor(['missing', 'menu-card', 'menu-button'])?.el).toBe(
      button,
    );
    const card = anchorEl('menu-card', BOX);
    expect(resolveAnchor(['menu-card', 'menu-button'])?.el).toBe(card);
  });

  it('skips an anchor an overflow-hidden ancestor clips out entirely', () => {
    const panel = document.createElement('div');
    panel.style.overflowX = 'hidden';
    panel.style.overflowY = 'hidden';
    setBox(panel, { top: 0, left: 0, width: 300, height: 50 });
    document.body.appendChild(panel);
    anchorEl('first', { ...BOX, top: 400 }, { parent: panel });
    const fallback = anchorEl('second', BOX);
    expect(resolveAnchor(['first', 'second'])?.el).toBe(fallback);
  });

  it('keeps an anchor that is only scrolled out of a scrolling list', () => {
    const list = document.createElement('div');
    list.style.overflowY = 'auto';
    list.style.overflowX = 'hidden';
    setBox(list, { top: 0, left: 0, width: 300, height: 50 });
    document.body.appendChild(list);
    const row = anchorEl(
      'fx-add-saturator',
      { ...BOX, top: 400 },
      {
        parent: list,
        rack: 'track',
      },
    );
    anchorEl('chanstrip-tab-fx', BOX);
    expect(resolveAnchor(['fx-add-saturator', 'chanstrip-tab-fx'])?.el).toBe(
      row,
    );
  });

  // The dock clips its content (overflow hidden) and the FX list scrolls
  // inside it: a row below the fold is outside both boxes, but scrolling the
  // list brings it back, so it still wins over the fallback (the lesson
  // walkthrough's edm saturate and house add-ducker steps).
  it('keeps a row scrolled out of a list that a clipping dock holds', () => {
    const dock = document.createElement('div');
    dock.style.overflowX = 'hidden';
    dock.style.overflowY = 'hidden';
    setBox(dock, { top: 0, left: 0, width: 300, height: 120 });
    document.body.appendChild(dock);
    const list = document.createElement('div');
    list.style.overflowY = 'auto';
    list.style.overflowX = 'hidden';
    setBox(list, { top: 20, left: 0, width: 130, height: 100 });
    dock.appendChild(list);
    const row = anchorEl(
      'fx-add-ducker',
      { ...BOX, left: 10, top: 400 },
      { parent: list, rack: 'track' },
    );
    anchorEl('chanstrip-tab-fx', BOX);
    expect(resolveAnchor(['fx-add-ducker', 'chanstrip-tab-fx'])?.el).toBe(row);
  });

  it('prefers a visible duplicate of the same id', () => {
    const panel = document.createElement('div');
    panel.style.overflowX = 'hidden';
    panel.style.overflowY = 'hidden';
    setBox(panel, { top: 0, left: 0, width: 300, height: 50 });
    document.body.appendChild(panel);
    anchorEl('dup', { ...BOX, top: 400 }, { parent: panel });
    const shown = anchorEl('dup', BOX);
    expect(resolveAnchor('dup')?.el).toBe(shown);
  });

  it('resolves fx-add-* in the track dock by default, another rack on request', () => {
    // The FX list is mounted per rack with the same ids; the master rack's
    // comes first in the DOM, which used to win.
    const master = anchorEl('fx-add-compressor', BOX, { rack: 'master' });
    const track = anchorEl('fx-add-compressor', BOX, { rack: 'track' });
    const ret = anchorEl('fx-add-compressor', BOX, { rack: 'return:A' });
    expect(resolveAnchor('fx-add-compressor')?.el).toBe(track);
    expect(resolveAnchor('fx-add-compressor', { rack: 'master' })?.el).toBe(
      master,
    );
    expect(resolveAnchor('fx-add-compressor', { rack: 'return:A' })?.el).toBe(
      ret,
    );
  });

  it('falls back past an fx-add-* whose rack is not on screen', () => {
    anchorEl('fx-add-delay', BOX, { rack: 'master' });
    const tab = anchorEl('chanstrip-tab-fx', BOX);
    expect(resolveAnchor(['fx-add-delay', 'chanstrip-tab-fx'])?.el).toBe(tab);
  });

  it('finds an element registered without the attribute', () => {
    const el = document.createElement('div');
    setBox(el, BOX);
    document.body.appendChild(el);
    const unregister = registerAnchor('registered-only', el);
    expect(resolveAnchor('registered-only')?.el).toBe(el);
    unregister();
    expect(resolveAnchor('registered-only')).toBeNull();
  });
});

describe('ANCHOR_ALIASES', () => {
  const aliases = ANCHOR_ALIASES as Record<string, string>;
  afterEach(() => {
    for (const key of Object.keys(aliases)) delete aliases[key];
  });

  it('holds only real renames (none yet, or each to a different id)', () => {
    for (const [from, to] of Object.entries(ANCHOR_ALIASES)) {
      expect(to).not.toBe(from);
    }
  });

  it('resolves an old id to the anchor that renders the new one', () => {
    aliases['old-name'] = 'new-name';
    const el = anchorEl('new-name', BOX);
    expect(currentAnchorId('old-name')).toBe('new-name');
    expect(currentAnchorId('unrelated')).toBe('unrelated');
    const found = resolveAnchor('old-name');
    expect(found?.el).toBe(el);
    // Reported as the step names it.
    expect(found?.id).toBe('old-name');
  });

  it('survives an alias cycle', () => {
    aliases.a = 'b';
    aliases.b = 'a';
    expect(['a', 'b']).toContain(currentAnchorId('a'));
  });
});

describe('rackOfFxTrack', () => {
  it('names the rack from the track id FxBrowser adds to', () => {
    expect(rackOfFxTrack('master')).toBe('master');
    expect(rackOfFxTrack('return-A')).toBe('return:A');
    expect(rackOfFxTrack('track-123')).toBe('track');
  });
});

describe('subscribeAnchorRect', () => {
  it('measures on the next frame, then leaves the frame loop', () => {
    anchorEl('target', BOX);
    const calls = watch('target');
    expect(calls).toEqual([]);
    expect(frameTaskNames()).toContain(ANCHOR_FRAME_TASK);

    flushFrame();
    expect(calls).toEqual([{ rect: BOX, id: 'target' }]);
    // One more frame confirms the box is still, and the task goes.
    flushFrame();
    expect(frameTaskNames()).not.toContain(ANCHOR_FRAME_TASK);
    expect(calls).toHaveLength(1);
  });

  it('runs no frame task while nothing is pending', async () => {
    const el = anchorEl('target', BOX);
    watch('target');
    flushFrame();
    flushFrame();
    expect(frameTaskNames()).toEqual([]);

    // A text change elsewhere (a live readout) asks for nothing.
    const readout = document.createElement('span');
    document.body.appendChild(readout);
    await settleMutations();
    flushFrame();
    flushFrame();
    readout.textContent = 'C major';
    readout.style.color = 'red';
    await settleMutations();
    expect(frameTaskNames()).toEqual([]);

    // A scroll or resize does, once.
    window.dispatchEvent(new Event('resize'));
    expect(frameTaskNames()).toEqual([ANCHOR_FRAME_TASK]);
    setBox(el, { ...BOX, top: 140 });
    flushFrame();
    flushFrame();
    expect(frameTaskNames()).toEqual([]);
  });

  it('reports a move, and keeps measuring while the box moves', async () => {
    const dock = document.createElement('div');
    document.body.appendChild(dock);
    const el = anchorEl('target', BOX, { parent: dock });
    const calls = watch('target');
    flushFrame();
    flushFrame();

    // The dock's spring writes its style every frame.
    for (const top of [120, 140, 160]) {
      dock.style.height = `${top}px`;
      setBox(el, { ...BOX, top });
      await settleMutations();
      flushFrame();
    }
    expect(calls.map((c) => c.rect?.top)).toEqual([100, 120, 140, 160]);
    flushFrame();
    expect(frameTaskNames()).toEqual([]);
  });

  it('follows an anchor that mounts late and scrolls it into view once', async () => {
    const tab = anchorEl('chanstrip-tab-fx', BOX);
    const calls = watch(['fx-add-saturator', 'chanstrip-tab-fx']);
    flushFrame();
    expect(calls.at(-1)?.id).toBe('chanstrip-tab-fx');
    expect(scrolled).toEqual([tab]);
    flushFrame();

    // The step's precondition opens the FX tab: the list mounts after.
    const row = anchorEl(
      'fx-add-saturator',
      { ...BOX, top: 300 },
      { rack: 'track', tag: 'button' },
    );
    await settleMutations();
    flushFrame();
    expect(calls.at(-1)).toEqual({
      rect: { ...BOX, top: 300 },
      id: 'fx-add-saturator',
    });
    expect(scrolled).toEqual([tab, row]);

    // Further changes re-measure, but never scroll the same anchor again.
    document.body.appendChild(document.createElement('div'));
    window.dispatchEvent(new Event('resize'));
    await settleMutations();
    flushFrame();
    flushFrame();
    expect(scrolled).toEqual([tab, row]);
  });

  it('reports null once the anchor is gone', async () => {
    const el = anchorEl('target', BOX);
    const calls = watch('target');
    flushFrame();
    el.remove();
    await settleMutations();
    flushFrame();
    expect(calls.at(-1)).toEqual({ rect: null, id: null });
  });

  it('shares one watcher between subscribers of the same target', () => {
    anchorEl('target', BOX);
    const first = watch('target');
    const second = watch('target');
    flushFrame();
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    // A later subscriber hears the current box at once.
    const third = watch('target');
    expect(third).toEqual([{ rect: BOX, id: 'target' }]);
  });

  it('stops watching once the last subscriber leaves', () => {
    anchorEl('target', BOX);
    const stop = subscribeAnchorRect('target', () => {});
    expect(frameTaskNames()).toContain(ANCHOR_FRAME_TASK);
    stop();
    expect(frameTaskNames()).toEqual([]);
    window.dispatchEvent(new Event('resize'));
    expect(frameTaskNames()).toEqual([]);
  });
});
