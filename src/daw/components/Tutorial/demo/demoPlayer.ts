import { useStore, type AllSlices } from '@/daw/store';
import {
  type AnchorRack,
  type Rect,
  type Target,
  idsOf,
  resolveAnchor,
} from '../anchorRegistry';
import {
  AFTER_MS,
  FAST_BEAT_MS,
  FAST_TARGET_MS,
  GLIDE_MS,
  MISSING_TARGET_MS,
  RUN_TIMEOUT_MS,
  readingMs,
  type DemoAction,
  type DemoBeat,
  type DemoKeyPress,
} from './demoTypes';

// ── Playing a demo ─────────────────────────────────────────────────────────
// DemoPlayer runs a step's beats in order (demoTypes.ts has the authoring
// side): for each, it waits for the target to come on screen, tells the
// stage where the cursor goes and what its callout says (onFrame), waits for
// the glide and the reading time, then does the action on the real element.
// It knows nothing of React: TutorialLayer's useStepDemo plays one and draws
// its frames (DemoStage.tsx).
//
// Every wait is a timer, so tests drive it with fake timers, and every wait
// ends early on skip() (the beats left then run at once, unseen) or abort()
// (it stops where it is). A missing target never hangs it: the beat is
// passed over after MISSING_TARGET_MS.

export interface Point {
  x: number;
  y: number;
}

/** What the stage shows, as the demo goes. */
export interface DemoFrame {
  /** The beat being played, from 0. */
  beat: number;
  /** Where the cursor's tip is; null hides it (before the first move, while skipping). */
  point: Point | null;
  /** The callout, once the cursor has arrived; null between beats. */
  caption: string | null;
  /** The beat's target once the cursor is on it (the spotlight frames it). */
  target?: Target;
  rack?: AnchorRack;
  /** Changes each time a click should ripple. */
  clickKey: string | null;
}

/** How a play ended: every beat watched, skipped to the end, or stopped. */
export type DemoOutcome = 'done' | 'skipped' | 'aborted';

export interface DemoPlayerOptions {
  onFrame(frame: DemoFrame): void;
  /** Read at each move: under reduced motion the cursor jumps, so no glide is waited for. */
  reducedMotion?: () => boolean;
  /** The store a `run` action gets (the editor's, by default). */
  getStore?: () => AllSlices;
}

/** How often a missing target is looked for. */
const POLL_MS = 100;

const centerOf = (r: Rect): Point => ({
  x: Math.round(r.left + r.width / 2),
  y: Math.round(r.top + r.height / 2),
});

/** A key or store action happens without its element; a pointer action can't. */
const needsNoElement = (action: DemoAction | undefined): boolean =>
  typeof action === 'function' ||
  (typeof action === 'object' && action.on !== 'element');

const isPointerAction = (action: DemoAction | undefined) =>
  action === 'click' || action === 'doubleClick' || action === 'hover';

export class DemoPlayer {
  private fast = false;
  private stopped = false;
  private wake: (() => void) | null = null;
  private hovered: { el: Element; point: Point } | null = null;
  private point: Point | null = null;
  private clicks = 0;

  constructor(
    private readonly beats: readonly DemoBeat[],
    private readonly options: DemoPlayerOptions,
  ) {}

  /** Run the beats left at once, without the glide or the pauses. */
  skip(): void {
    this.fast = true;
    this.wake?.();
  }

  /** Stop now: nothing more is done. */
  abort(): void {
    this.stopped = true;
    this.wake?.();
    this.leaveHover();
  }

  get skipping(): boolean {
    return this.fast;
  }

  async play(): Promise<DemoOutcome> {
    for (let i = 0; i < this.beats.length; i++) {
      if (this.stopped) return 'aborted';
      try {
        await this.playBeat(this.beats[i], i);
      } catch (err) {
        // A beat that fails is passed over; the demo goes on.
        console.warn('[lesson demo] a beat failed', err);
      }
    }
    this.leaveHover();
    if (this.stopped) return 'aborted';
    this.emit({ beat: this.beats.length - 1, point: null, caption: null });
    return this.fast ? 'skipped' : 'done';
  }

  // ── One beat ─────────────────────────────────────────────────────────────

  private async playBeat(beat: DemoBeat, index: number): Promise<void> {
    const { action } = beat;
    let el: Element | null = null;
    if (idsOf(beat.target).length > 0) {
      el = await this.waitForTarget(beat);
      if (this.stopped) return;
      if (!el) {
        // Passed over: the cursor stays put and nothing is clicked. A store
        // action or a shortcut still happens (it may be the demo's restore).
        if (needsNoElement(action)) await this.act(beat, index, null);
        return;
      }
      if (this.hovered && this.hovered.el !== el) this.leaveHover();
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      if (this.fast) {
        this.point = centerOf(el.getBoundingClientRect());
        this.emit({ beat: index, point: null, caption: null });
      } else {
        // The glide, captionless; then the callout once the cursor is there.
        this.point = centerOf(el.getBoundingClientRect());
        this.emit({ beat: index, point: this.point, caption: null });
        if (!this.options.reducedMotion?.()) await this.sleep(GLIDE_MS);
        if (this.stopped) return;
        if (el.isConnected) this.point = centerOf(el.getBoundingClientRect());
        this.emit({
          beat: index,
          point: this.point,
          caption: beat.caption,
          target: beat.target,
          rack: beat.rack,
        });
        if (isPointerAction(action)) this.enter(el, this.point);
      }
    } else if (this.fast) {
      this.emit({ beat: index, point: null, caption: null });
    } else {
      // A caption with no move: the cursor stays where it is.
      this.emit({ beat: index, point: this.point, caption: beat.caption });
    }

    if (!this.fast) await this.sleep(beat.holdMs ?? readingMs(beat.caption));
    if (this.stopped) return;
    await this.act(beat, index, el);
    if (this.stopped) return;
    await this.sleep(this.fast ? FAST_BEAT_MS : (beat.afterMs ?? AFTER_MS));
  }

  /** The beat's target once it is on screen, or null after the wait. */
  private async waitForTarget(beat: DemoBeat): Promise<Element | null> {
    let waited = 0;
    for (;;) {
      const found = resolveAnchor(beat.target, { rack: beat.rack });
      if (found) return found.el;
      if (this.stopped) return null;
      if (waited >= (this.fast ? FAST_TARGET_MS : MISSING_TARGET_MS)) {
        return null;
      }
      await this.sleep(POLL_MS);
      waited += POLL_MS;
    }
  }

  private async act(
    beat: DemoBeat,
    index: number,
    el: Element | null,
  ): Promise<void> {
    const { action } = beat;
    if (!action) return;
    try {
      if (typeof action === 'function') {
        await this.runAction(action);
      } else if (typeof action === 'object') {
        pressKey(action, el);
      } else if (el && action !== 'hover') {
        const point = el.isConnected
          ? centerOf(el.getBoundingClientRect())
          : (this.point ?? { x: 0, y: 0 });
        const hit = hitAt(el, point);
        if (!this.fast) {
          this.clicks += 1;
          this.emit({
            beat: index,
            point,
            caption: beat.caption,
            target: beat.target,
            rack: beat.rack,
            clickKey: `${index}:${this.clicks}`,
          });
        }
        clickAt(hit, point, 1);
        if (action === 'doubleClick') {
          clickAt(hit, point, 2);
          hit.dispatchEvent(mouse('dblclick', point, { detail: 2 }));
        }
      }
    } catch (err) {
      // An action that throws is passed over; the demo goes on.
      console.warn('[lesson demo] a beat failed', err);
    }
  }

  private async runAction(run: (store: AllSlices) => unknown): Promise<void> {
    const store = (this.options.getStore ?? useStore.getState)();
    const result = run(store);
    if (!(result instanceof Promise)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      result,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, RUN_TIMEOUT_MS);
      }),
    ]).finally(() => clearTimeout(timer));
  }

  // ── The pointer over an element ──────────────────────────────────────────

  private enter(el: Element, point: Point): void {
    if (this.hovered?.el === el) return;
    this.leaveHover();
    const hit = hitAt(el, point);
    hit.dispatchEvent(pointer('pointerover', point));
    hit.dispatchEvent(pointer('pointerenter', point, { bubbles: false }));
    hit.dispatchEvent(mouse('mouseover', point));
    hit.dispatchEvent(mouse('mouseenter', point, { bubbles: false }));
    hit.dispatchEvent(pointer('pointermove', point));
    hit.dispatchEvent(mouse('mousemove', point));
    this.hovered = { el: hit, point };
  }

  private leaveHover(): void {
    const hovered = this.hovered;
    this.hovered = null;
    if (!hovered || !hovered.el.isConnected) return;
    const { el, point } = hovered;
    el.dispatchEvent(pointer('pointerout', point));
    el.dispatchEvent(pointer('pointerleave', point, { bubbles: false }));
    el.dispatchEvent(mouse('mouseout', point));
    el.dispatchEvent(mouse('mouseleave', point, { bubbles: false }));
  }

  // ── Time ─────────────────────────────────────────────────────────────────

  private emit(frame: Omit<DemoFrame, 'clickKey'> & { clickKey?: string }) {
    this.options.onFrame({ clickKey: null, ...frame });
  }

  /** Waits `ms`, or less: skip() and abort() end every wait at once. */
  private sleep(ms: number): Promise<void> {
    if (this.stopped || ms <= 0) return Promise.resolve();
    if (this.fast && ms > FAST_BEAT_MS) ms = FAST_BEAT_MS;
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        if (this.wake === done) this.wake = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.wake = done;
    });
  }
}

// ── Events ─────────────────────────────────────────────────────────────────

/** The innermost element under `point` inside `anchor` (what a real click hits). */
function hitAt(anchor: Element, point: Point): Element {
  if (typeof document.elementsFromPoint === 'function') {
    for (const el of document.elementsFromPoint(point.x, point.y)) {
      if (anchor.contains(el)) return el;
    }
  }
  return anchor;
}

function mouseInit(point: Point, init: MouseEventInit = {}): MouseEventInit {
  return {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: point.x,
    clientY: point.y,
    screenX: point.x,
    screenY: point.y,
    button: 0,
    ...init,
  };
}

function mouse(type: string, point: Point, init?: MouseEventInit): MouseEvent {
  return new MouseEvent(type, mouseInit(point, init));
}

/** A mouse PointerEvent (a MouseEvent with its fields where there's none, as in jsdom). */
function pointer(type: string, point: Point, init?: MouseEventInit): Event {
  const base = mouseInit(point, init);
  if (typeof PointerEvent === 'function') {
    return new PointerEvent(type, {
      ...base,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    });
  }
  const event = new MouseEvent(type, base);
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
    isPrimary: { value: true },
  });
  return event;
}

/**
 * One press and release, as a browser sends it: pointerdown, mousedown,
 * pointerup, mouseup, click. A pointerdown or pointerup a control cancels
 * keeps its mouse event back, as in a browser (a Radix menu trigger does).
 */
function clickAt(el: Element, point: Point, detail: number): void {
  if (el.dispatchEvent(pointer('pointerdown', point, { buttons: 1, detail }))) {
    el.dispatchEvent(mouse('mousedown', point, { buttons: 1, detail }));
  }
  if (el.dispatchEvent(pointer('pointerup', point, { buttons: 0, detail }))) {
    el.dispatchEvent(mouse('mouseup', point, { buttons: 0, detail }));
  }
  el.dispatchEvent(mouse('click', point, { detail }));
}

/** KeyboardEvent.code for a key a demo names ('l' → 'KeyL', ' ' → 'Space'). */
export function codeOfKey(key: string): string {
  if (key === ' ') return 'Space';
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^\d$/.test(key)) return `Digit${key}`;
  return key;
}

const isMac = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/**
 * A key press: keydown then keyup on the target (focused first) or on the
 * page's body, where a shortcut with nothing focused lands.
 */
function pressKey(press: DemoKeyPress, el: Element | null): void {
  const target =
    press.on === 'element' && el ? el : (document.body ?? document);
  if (target instanceof HTMLElement && target !== document.body) {
    target.focus();
  }
  const mac = isMac();
  const init: KeyboardEventInit = {
    key: press.key,
    code: press.code ?? codeOfKey(press.key),
    bubbles: true,
    cancelable: true,
    composed: true,
    metaKey: !!press.mod && mac,
    ctrlKey: !!press.mod && !mac,
    shiftKey: !!press.shift,
    altKey: !!press.alt,
  };
  target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
}
