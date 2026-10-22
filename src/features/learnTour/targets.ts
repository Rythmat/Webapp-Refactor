// ── What a Learn tour step points at, and the moves it makes ────────────────
// A step names the controls it means by CSS and, where the markup has no
// handle of its own, by their words: the lesson screens and the Studio's
// Practice Track are found by the attributes and labels they already carry,
// so the tour adds nothing to their markup (their DOM snapshots stay put, and
// src/daw is untouched). Everything here works on the live page.

export interface TargetSpec {
  /** Every element this selects is a candidate. */
  css: string;
  /** Only candidates whose text matches. */
  text?: RegExp;
  /** Every visible match, not only the first. */
  all?: boolean;
}

/** One target, or several lit together. */
export type Targets = TargetSpec | readonly TargetSpec[];

/** What a target can be: a control, or a drawing (the key wheel is SVG). */
export type TourElement = HTMLElement | SVGElement;

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const specsOf = (targets: Targets): readonly TargetSpec[] =>
  Array.isArray(targets) ? targets : [targets as TargetSpec];

/** On screen: laid out, not hidden, and not faded out. */
export function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false;
  if (el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

const textOf = (el: Element) =>
  (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/** The elements a step points at, as the page stands. */
export function findTargets(
  targets: Targets,
  root: ParentNode = document,
): TourElement[] {
  const found: TourElement[] = [];
  for (const spec of specsOf(targets)) {
    let candidates: Element[];
    try {
      candidates = [...root.querySelectorAll(spec.css)];
    } catch {
      continue;
    }
    const matches = candidates.filter(
      (el): el is TourElement =>
        (el instanceof HTMLElement || el instanceof SVGElement) &&
        !el.closest('[data-learn-tour-layer]') &&
        (!spec.text || spec.text.test(textOf(el))) &&
        isVisible(el),
    );
    found.push(...(spec.all ? matches : matches.slice(0, 1)));
  }
  return found;
}

/** The box around every element, or null with none. */
export function unionRect(els: readonly Element[]): Rect | null {
  if (els.length === 0) return null;
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return { top, left, width: right - left, height: bottom - top };
}

export const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5);

/** The nearest ancestor that scrolls up and down. */
export function findScroller(el: Element | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight + 4
    )
      return node;
  }
  return null;
}

/** Brings an element into view in its scroller, unless it's already there. */
export function reveal(el: Element, reducedMotion: boolean) {
  const r = el.getBoundingClientRect();
  const inView =
    r.top >= 64 && r.bottom <= window.innerHeight - 64 && r.top < r.bottom;
  if (inView) return;
  el.scrollIntoView?.({
    block: r.height > window.innerHeight * 0.6 ? 'start' : 'center',
    behavior: reducedMotion ? 'auto' : 'smooth',
  });
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Glides a scroller to the bottom and back to the top: "scroll down the page
 * and back up". Stops where it is if the player takes over (a wheel, a touch,
 * a key) or `cancelled` says so. Under reduced motion it doesn't move.
 */
export async function scrollDownAndUp(
  scroller: HTMLElement,
  cancelled: () => boolean,
  reducedMotion: boolean,
): Promise<void> {
  if (reducedMotion) return;
  let interrupted = false;
  const stop = () => {
    interrupted = true;
  };
  const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  events.forEach((e) => scroller.addEventListener(e, stop, { passive: true }));
  const glide = (to: number) =>
    new Promise<void>((resolve) => {
      const from = scroller.scrollTop;
      const distance = to - from;
      const duration = Math.min(3200, Math.max(900, Math.abs(distance) * 1.4));
      const start = performance.now();
      const frame = (now: number) => {
        if (interrupted || cancelled()) return resolve();
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        scroller.scrollTop = from + distance * eased;
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  try {
    await sleep(500);
    if (interrupted || cancelled()) return;
    await glide(scroller.scrollHeight - scroller.clientHeight);
    if (interrupted || cancelled()) return;
    await sleep(700);
    if (interrupted || cancelled()) return;
    await glide(0);
  } finally {
    events.forEach((e) => scroller.removeEventListener(e, stop));
  }
}

/** Types into a React-controlled input as a player would, a letter at a time. */
export async function typeInto(
  input: HTMLInputElement,
  text: string,
  reducedMotion: boolean,
) {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  const put = (value: string) => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  input.focus();
  if (reducedMotion) return put(text);
  for (let i = 1; i <= text.length; i++) {
    put(text.slice(0, i));
    await sleep(70);
  }
}

/**
 * A chip carried from one element to another, as a hand would drag it: the
 * tour's own drag, before it makes the move itself. Resolves when it lands.
 */
export async function ghostDrag(
  from: Element,
  to: Element,
  label: string,
  reducedMotion: boolean,
): Promise<void> {
  if (reducedMotion) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const chip = document.createElement('div');
  chip.setAttribute('aria-hidden', 'true');
  chip.setAttribute('data-learn-tour-layer', '');
  chip.textContent = label;
  Object.assign(chip.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    zIndex: '2147483000',
    pointerEvents: 'none',
    padding: '6px 12px',
    borderRadius: '9999px',
    background: '#7ecfcf',
    color: '#101012',
    font: "600 13px 'Glacial Indifference', system-ui, sans-serif",
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    whiteSpace: 'nowrap',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(chip);
  const at = (r: DOMRect, dy = 0) =>
    `translate(${r.left + Math.min(24, r.width / 2)}px, ${r.top + r.height / 2 - 14 + dy}px)`;
  try {
    const animation = chip.animate(
      [
        { transform: `${at(a)} scale(0.9)`, opacity: 0 },
        { transform: `${at(a, -6)} scale(1.05)`, opacity: 1, offset: 0.15 },
        { transform: `${at(b, -6)} scale(1.05)`, opacity: 1, offset: 0.85 },
        { transform: `${at(b)} scale(0.9)`, opacity: 0 },
      ],
      { duration: 1300, easing: 'ease-in-out' },
    );
    await animation.finished;
  } catch {
    // No Web Animations (tests): the move is made without the flourish.
  } finally {
    chip.remove();
  }
}

/** Clicks a control as a player would (an SVG part has no click()). */
export function clickElement(el: Element | undefined): boolean {
  if (!el) return false;
  if (el instanceof HTMLElement) el.click();
  else
    el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
  return true;
}

/** Closes whatever popover, menu or non-modal sheet is open, as Escape does. */
export function pressEscape() {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
}
