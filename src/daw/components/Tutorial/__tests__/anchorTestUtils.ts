import { vi } from 'vitest';

// Shared by the anchor registry, Spotlight and CoachCard tests: jsdom lays
// nothing out, so a test gives an anchor its box, and drives the editor's
// frame loop (engineClock) one frame at a time through a stubbed rAF.

const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;

/** Stubs requestAnimationFrame so frames run only on flushFrame(). */
export function stubFrames(): void {
  frames.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id);
  });
}

/** Runs the frame that is requested, if any. */
export function flushFrame(now = performance.now()): void {
  const callbacks = Array.from(frames.values());
  frames.clear();
  for (const cb of callbacks) cb(now);
}

/** Lets MutationObserver callbacks (microtasks) run. */
export const settleMutations = () => new Promise((r) => setTimeout(r, 0));

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Gives `el` a layout box (jsdom's are all zero). */
export function setBox(el: Element, box: Box): void {
  el.getBoundingClientRect = () =>
    ({
      ...box,
      x: box.left,
      y: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
      toJSON: () => box,
    }) as DOMRect;
}

/** An element with `data-tutorial-id`, appended to `parent` (default body). */
export function anchorEl(
  id: string,
  box: Box | null,
  options: { parent?: Element; rack?: string; tag?: string } = {},
): HTMLElement {
  const el = document.createElement(options.tag ?? 'div');
  el.setAttribute('data-tutorial-id', id);
  if (options.rack) el.setAttribute('data-tutorial-target', options.rack);
  if (box) setBox(el, box);
  (options.parent ?? document.body).appendChild(el);
  return el;
}

/** Stubs matchMedia so prefers-reduced-motion reads `reduce`. */
export function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}
