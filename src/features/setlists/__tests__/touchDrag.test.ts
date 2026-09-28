/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETLIST_SONG_MIME, readSongDrag, setSongDrag } from '../setListDnd';
import {
  attachTouchDrag,
  dataTransferShim,
  isScrollGesture,
  makeDragEvent,
} from '../touchDrag';

/** A touch event jsdom will carry, with only the fields the shim reads. */
function touch(
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  x: number,
  y: number,
  target: Element,
): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const list = [{ clientX: x, clientY: y, target }];
  Object.defineProperties(ev, {
    touches: { value: type === 'touchend' ? [] : list },
    changedTouches: { value: list },
  });
  target.dispatchEvent(ev);
  return ev;
}

describe('dataTransferShim', () => {
  it('behaves like the DataTransfer the handlers expect', () => {
    const dt = dataTransferShim();
    expect(Array.from(dt.types)).toEqual([]);
    dt.setData('a/b', 'hello');
    expect(Array.from(dt.types)).toEqual(['a/b']);
    expect(dt.getData('a/b')).toBe('hello');
    expect(dt.getData('nope')).toBe('');
  });

  it("carries the page's real payloads unchanged", () => {
    const dt = dataTransferShim();
    setSongDrag(dt, { songId: 'song_1', title: 'Blue Monk' });
    expect(readSongDrag(dt)).toEqual({ songId: 'song_1', title: 'Blue Monk' });
    expect(dt.effectAllowed).toBe('copy');
  });
});

describe('makeDragEvent', () => {
  it('produces an event a drop handler can read', () => {
    const dt = dataTransferShim();
    dt.setData(SETLIST_SONG_MIME, '{}');
    const ev = makeDragEvent('dragover', dt, 12, 34) as DragEvent;
    expect(ev.type).toBe('dragover');
    expect(ev.bubbles).toBe(true);
    expect(ev.cancelable).toBe(true);
    expect(ev.dataTransfer).toBe(dt);
    expect(ev.clientX).toBe(12);
    expect(ev.clientY).toBe(34);
  });

  it('reports no related target, so a drop zone clears its highlight', () => {
    const ev = makeDragEvent(
      'dragleave',
      dataTransferShim(),
      0,
      0,
    ) as DragEvent;
    expect(ev.relatedTarget).toBeNull();
  });
});

describe('isScrollGesture', () => {
  it('lets a resting finger through and calls a travelling one a scroll', () => {
    expect(isScrollGesture(0, 0)).toBe(false);
    expect(isScrollGesture(3, -4)).toBe(false);
    expect(isScrollGesture(0, 40)).toBe(true);
    expect(isScrollGesture(-40, 0)).toBe(true);
  });
});

describe('attachTouchDrag', () => {
  let root: HTMLDivElement;
  let source: HTMLDivElement;
  let target: HTMLDivElement;
  let detach: () => void;
  const seen: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    seen.length = 0;

    root = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('draggable', 'true');
    target = document.createElement('div');
    root.append(source, target);
    document.body.append(root);

    source.addEventListener('dragstart', (e) => {
      seen.push('dragstart');
      setSongDrag((e as DragEvent).dataTransfer!, {
        songId: 'song_1',
        title: 'Blue Monk',
      });
    });
    source.addEventListener('dragend', () => seen.push('dragend'));
    for (const type of ['dragover', 'dragleave', 'drop'] as const) {
      target.addEventListener(type, (e) => {
        seen.push(type);
        if (type === 'drop') {
          const item = readSongDrag((e as DragEvent).dataTransfer!);
          seen.push(`dropped:${item?.songId}`);
        }
      });
    }

    detach = attachTouchDrag(root, { elementAt: () => target });
  });

  afterEach(() => {
    detach();
    root.remove();
    vi.useRealTimers();
  });

  it('turns a long press and a move into a real drop', () => {
    touch('touchstart', 10, 10, source);
    vi.advanceTimersByTime(300);
    expect(seen).toEqual(['dragstart']);

    touch('touchmove', 200, 50, source);
    touch('touchend', 200, 50, source);

    expect(seen).toEqual([
      'dragstart',
      'dragover',
      'drop',
      'dropped:song_1',
      'dragend',
    ]);
  });

  it('does not start a drag before the press is long enough', () => {
    touch('touchstart', 10, 10, source);
    vi.advanceTimersByTime(100);
    touch('touchmove', 200, 50, source);
    touch('touchend', 200, 50, source);
    expect(seen).toEqual([]);
  });

  it('treats a finger that travels first as a scroll, not a drag', () => {
    touch('touchstart', 10, 10, source);
    touch('touchmove', 10, 90, source); // past the slop, before the timer
    vi.advanceTimersByTime(300);
    touch('touchend', 10, 90, source);
    expect(seen).toEqual([]);
  });

  it('leaves alone a press on something that is not draggable', () => {
    touch('touchstart', 10, 10, target);
    vi.advanceTimersByTime(300);
    touch('touchend', 10, 10, target);
    expect(seen).toEqual([]);
  });

  it('abandons the drag when no handler claims the payload', () => {
    const plain = document.createElement('div');
    plain.setAttribute('draggable', 'true');
    root.append(plain);
    touch('touchstart', 10, 10, plain);
    vi.advanceTimersByTime(300);
    touch('touchmove', 200, 50, plain);
    touch('touchend', 200, 50, plain);
    // No dragover or drop: nothing was written, so there was nothing to carry.
    expect(seen).toEqual([]);
  });

  it('swallows the click that a finger-lift would otherwise fire', () => {
    const clicks = vi.fn();
    target.addEventListener('click', clicks);

    touch('touchstart', 10, 10, source);
    vi.advanceTimersByTime(300);
    touch('touchmove', 200, 50, source);
    touch('touchend', 200, 50, source);

    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks).not.toHaveBeenCalled();
  });

  it('stops listening once detached', () => {
    detach();
    touch('touchstart', 10, 10, source);
    vi.advanceTimersByTime(300);
    expect(seen).toEqual([]);
  });
});
