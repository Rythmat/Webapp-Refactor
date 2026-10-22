import { useCallback, useRef } from 'react';
import { addFrameTask } from '@/daw/engine/engineClock';

// ── Tutorial anchor registry ────────────────────────────────────────────────
// The places a lesson step can point at, and the one way the lesson overlay
// (Spotlight, CoachCard) finds and measures them.
//
// An anchor is an element with a `data-tutorial-id`. The 38 sites that render
// one today need nothing else: while a lesson runs, a MutationObserver on
// <body> notices anchors that mount, unmount or move, and a lookup reads them
// from the DOM. New code can register an element directly with
// `registerAnchor` or the `useTutorialAnchor` ref callback (which also stamps
// the attribute, so the lesson walkthrough finds it the same way).
//
// `subscribeAnchorRect` resolves a step's target and reports its box. It does
// not poll: a ResizeObserver on the anchor, scroll (capture) and resize
// listeners, the MutationObserver and CSS transition/animation events each
// ask for a measurement, which runs as an engineClock task on the next frame
// (at most one a frame), and the task stays registered only while the box
// keeps moving. When the step's target resolves to a new element (the step
// opened, or its anchor mounted late, e.g. after a precondition switched the
// dock's tab), that element is scrolled into view once.

export type Target = string | string[];

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Which effect rack an anchor belongs to. The side rail's Effects library
 * adds to one rack at a time (a track's, the master's or a return's;
 * shell/mix/rackTarget.ts) with the same `fx-add-*` ids, so each row says
 * which rack it adds to.
 */
export type AnchorRack = 'track' | 'master' | `return:${string}`;

export interface AnchorMeta {
  rack?: AnchorRack;
}

export interface AnchorOptions {
  /** The rack a rack-stamped anchor must belong to. Default: the track dock. */
  rack?: AnchorRack;
}

export const ANCHOR_ATTR = 'data-tutorial-id';
export const RACK_ATTR = 'data-tutorial-target';
export const DEFAULT_RACK: AnchorRack = 'track';

/** The engineClock task name while a re-measure is pending (tests, dev tools). */
export const ANCHOR_FRAME_TASK = 'tutorial-anchors';

/**
 * Renamed anchors, old id → current id. When a `data-tutorial-id` has to
 * change (a control is renamed or moved), add the old id here so lessons,
 * classroom slides and saved content that still name it keep resolving. Only
 * real renames go here.
 *
 * The Stage B shell moved these Studio Basics anchors onto the controls that
 * took their place (docs/studio-tutorial-anchors.md):
 */
export const ANCHOR_ALIASES: Readonly<Record<string, string>> = {
  // The top bar's Back went; the bottom rail has Go to start.
  'transport-back': 'transport-to-start',
  // The Inspector toggle and the side panel's tabs became the side rail.
  'inspector-toggle': 'rail-insight',
  'insight-tab': 'rail-insight',
  'library-tab': 'rail-library',
  // The timeline's lane, ruler and clip menus are one canvas menu, with
  // Paste here among its items.
  'lane-menu': 'clip-menu',
  'ruler-menu': 'clip-menu',
  'lane-menu-paste': 'clip-menu-paste',
  // The Piano Roll window became the dock's Notes tab.
  'piano-roll-modal': 'dock-body',
  'piano-roll-analyze': 'dock-analyze-notes',
  'piano-roll-close': 'dock-toggle',
  // Project ▾'s Lead sheet (MusicXML) went into its Notation… dialog.
  'file-export-musicxml': 'file-export-notation',
};

/** The id an anchor renders today, following ANCHOR_ALIASES. */
export function currentAnchorId(id: string): string {
  const seen = new Set<string>();
  let current = id;
  while (ANCHOR_ALIASES[current] && !seen.has(current)) {
    seen.add(current);
    current = ANCHOR_ALIASES[current];
  }
  return current;
}

export const idsOf = (target?: Target): string[] =>
  !target ? [] : Array.isArray(target) ? target : [target];

export const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

// ── Registered anchors ──────────────────────────────────────────────────────

const registered = new Map<string, Map<Element, AnchorMeta>>();

/** The targets being watched (by anchorKey), each shared by its subscribers. */
const watchers = new Map<string, AnchorWatcher>();

/**
 * Registers `el` as the anchor `id` until the returned function is called.
 * Needed only for an element that cannot carry a `data-tutorial-id` itself;
 * the attribute alone is enough everywhere else.
 */
export function registerAnchor(
  id: string,
  el: Element,
  meta: AnchorMeta = {},
): () => void {
  const els = registered.get(id) ?? new Map<Element, AnchorMeta>();
  els.set(el, meta);
  registered.set(id, els);
  watchers.forEach((w) => w.schedule());
  return () => {
    const current = registered.get(id);
    if (current?.get(el) !== meta) return;
    current.delete(el);
    if (current.size === 0) registered.delete(id);
    watchers.forEach((w) => w.schedule());
  };
}

/**
 * A ref callback that registers the element it is put on as anchor `id`, and
 * stamps `data-tutorial-id` (and the rack) on it for the lesson walkthrough.
 */
export function useTutorialAnchor(
  id: string,
  meta?: AnchorMeta,
): (el: Element | null) => void {
  const release = useRef<(() => void) | null>(null);
  const rack = meta?.rack;
  return useCallback(
    (el: Element | null) => {
      release.current?.();
      release.current = null;
      if (!el) return;
      if (!el.hasAttribute(ANCHOR_ATTR)) el.setAttribute(ANCHOR_ATTR, id);
      if (rack && !el.hasAttribute(RACK_ATTR)) el.setAttribute(RACK_ATTR, rack);
      release.current = registerAnchor(id, el, { rack });
    },
    [id, rack],
  );
}

// ── Resolving a target ──────────────────────────────────────────────────────

const selectorOf = (id: string) =>
  `[${ANCHOR_ATTR}="${id.replace(/["\\]/g, '\\$&')}"]`;

interface Candidate {
  el: Element;
  rack: string | null;
}

function candidatesOf(id: string): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<Element>();
  for (const [el, meta] of registered.get(id) ?? []) {
    if (!el.isConnected) continue;
    seen.add(el);
    out.push({ el, rack: meta.rack ?? el.getAttribute(RACK_ATTR) });
  }
  for (const el of document.querySelectorAll(selectorOf(id))) {
    if (!seen.has(el)) out.push({ el, rack: el.getAttribute(RACK_ATTR) });
  }
  return out;
}

const VISIBLE = 0;
const SCROLLABLE = 1;
const CLIPPED = 2;

/**
 * Whether a student can see the box `r` of `el`: VISIBLE; SCROLLABLE when a
 * scrolling ancestor (overflow auto/scroll) or the window has it out of view,
 * so scrolling brings it back; CLIPPED when an ancestor with overflow hidden
 * or clip has it entirely out of its box. Ancestors are walked along the
 * containing-block chain (an absolute box escapes static ancestors, a fixed
 * one all but a transformed one), as the lesson walkthrough does.
 */
function visibilityOf(el: Element, box: DOMRect): number {
  let result = VISIBLE;
  // The box to judge outer ancestors by: past a scrolling ancestor that has
  // the anchor out of view, scrolling can bring it anywhere inside that
  // ancestor, so an outer clip (the dock's overflow hidden) is judged on the
  // scroller's box, not the anchor's (the FX list's fx-add-* rows).
  let r: { left: number; right: number; top: number; bottom: number } = box;
  let mode = getComputedStyle(el).position;
  for (
    let a = el.parentElement;
    a && a !== document.body && a !== document.documentElement;
    a = a.parentElement
  ) {
    const s = getComputedStyle(a);
    const holdsFixed =
      (!!s.transform && s.transform !== 'none') ||
      (!!s.perspective && s.perspective !== 'none') ||
      (!!s.filter && s.filter !== 'none') ||
      /paint|layout|strict|content/.test(s.contain ?? '');
    const holdsAbsolute = holdsFixed || s.position !== 'static';
    if (mode === 'fixed' ? !holdsFixed : mode === 'absolute' && !holdsAbsolute)
      continue;
    mode =
      s.position === 'fixed' || s.position === 'absolute'
        ? s.position
        : 'static';
    const clipsX = s.overflowX !== 'visible' && s.overflowX !== '';
    const clipsY = s.overflowY !== 'visible' && s.overflowY !== '';
    if (!clipsX && !clipsY) continue;
    const b = a.getBoundingClientRect();
    const outX = clipsX && (r.right <= b.left || r.left >= b.right);
    const outY = clipsY && (r.bottom <= b.top || r.top >= b.bottom);
    if (!outX && !outY) continue;
    if (
      (outX && !/auto|scroll/.test(s.overflowX)) ||
      (outY && !/auto|scroll/.test(s.overflowY))
    )
      return CLIPPED;
    result = SCROLLABLE;
    r = b;
  }
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) {
    result = SCROLLABLE;
  }
  return result;
}

export interface ResolvedAnchor {
  /** The id as the step names it (before ANCHOR_ALIASES). */
  id: string;
  el: Element;
  rect: Rect;
}

const toRect = (r: DOMRect): Rect => ({
  top: r.top,
  left: r.left,
  width: r.width,
  height: r.height,
});

/**
 * The element a step's target points at now. Ids are tried in priority
 * order and the first with a match wins, as before (a button, then the menu
 * it opens). A match has a non-zero box, belongs to the step's rack when it
 * says which rack it is in, and is not clipped out by an overflow ancestor;
 * one only scrolled out of view still counts (it is scrolled back), but a
 * fully visible duplicate of the same id is preferred.
 */
export function resolveAnchor(
  target?: Target,
  options: AnchorOptions = {},
): ResolvedAnchor | null {
  const rack = options.rack ?? DEFAULT_RACK;
  for (const id of idsOf(target)) {
    let best: ResolvedAnchor | null = null;
    let bestVisibility = CLIPPED;
    for (const candidate of candidatesOf(currentAnchorId(id))) {
      if (candidate.rack !== null && candidate.rack !== rack) continue;
      const r = candidate.el.getBoundingClientRect();
      if (!(r.width > 0 || r.height > 0)) continue;
      const visibility = visibilityOf(candidate.el, r);
      if (visibility < bestVisibility) {
        best = { id, el: candidate.el, rect: toRect(r) };
        bestVisibility = visibility;
        if (visibility === VISIBLE) break;
      }
    }
    if (best) return best;
  }
  return null;
}

// ── Watching a target ───────────────────────────────────────────────────────

export type AnchorListener = (rect: Rect | null, id: string | null) => void;

/** How long a CSS transition or animation near the anchor is followed. */
const FOLLOW_MS = 1000;

const OBSERVED_ATTRIBUTES = [
  'style',
  'class',
  'hidden',
  'open',
  ANCHOR_ATTR,
  RACK_ATTR,
];

const hasElement = (nodes: NodeList) => {
  for (const node of nodes) if (node.nodeType === 1) return true;
  return false;
};

class AnchorWatcher {
  readonly listeners = new Set<AnchorListener>();
  measured = false;
  rect: Rect | null = null;
  id: string | null = null;
  private el: Element | null = null;
  private removeTask: (() => void) | null = null;
  private followUntil = 0;
  private readonly selector: string;
  private readonly ro: ResizeObserver | null;
  private readonly mo: MutationObserver | null;

  constructor(
    private readonly ids: string[],
    private readonly rack: AnchorRack,
  ) {
    this.selector = ids.map((id) => selectorOf(currentAnchorId(id))).join(',');
    this.ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(this.schedule)
        : null;
    this.mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(this.onMutations)
        : null;
    this.mo?.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRIBUTES,
    });
    document.addEventListener('scroll', this.onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', this.schedule);
    document.addEventListener('transitionrun', this.onMotionStart, true);
    document.addEventListener('animationstart', this.onMotionStart, true);
    document.addEventListener('transitionend', this.onMotionEnd, true);
    document.addEventListener('transitioncancel', this.onMotionEnd, true);
    document.addEventListener('animationend', this.onMotionEnd, true);
    // The first measurement waits for the frame, after the step's
    // preconditions (applied in TutorialLayer's effect) have run.
    this.schedule();
  }

  stop(): void {
    this.removeTask?.();
    this.removeTask = null;
    this.ro?.disconnect();
    this.mo?.disconnect();
    document.removeEventListener('scroll', this.onScroll, { capture: true });
    window.removeEventListener('resize', this.schedule);
    document.removeEventListener('transitionrun', this.onMotionStart, true);
    document.removeEventListener('animationstart', this.onMotionStart, true);
    document.removeEventListener('transitionend', this.onMotionEnd, true);
    document.removeEventListener('transitioncancel', this.onMotionEnd, true);
    document.removeEventListener('animationend', this.onMotionEnd, true);
  }

  /** Asks for a measurement on the next frame. */
  readonly schedule = (): void => {
    if (this.removeTask) return;
    this.removeTask = addFrameTask(this.frame, { name: ANCHOR_FRAME_TASK });
  };

  private readonly frame = (now: number): void => {
    // Keep measuring while the box moves (a spring, a transition), then let
    // the frame loop go.
    const changed = this.measure();
    if (!changed && now >= this.followUntil) {
      this.removeTask?.();
      this.removeTask = null;
    }
  };

  /** Measures the target; true when what it reports changed. */
  private measure(): boolean {
    const found = resolveAnchor(this.ids, { rack: this.rack });
    const el = found?.el ?? null;
    let rect = found?.rect ?? null;
    const moved = el !== this.el;
    if (moved) {
      if (this.el) this.ro?.unobserve(this.el);
      this.el = el;
      if (el) {
        this.ro?.observe(el);
        if (typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          rect = toRect(el.getBoundingClientRect());
        }
      }
    }
    const id = found?.id ?? null;
    if (this.measured && !moved && id === this.id && sameRect(this.rect, rect))
      return false;
    this.measured = true;
    this.rect = rect;
    this.id = id;
    for (const listener of Array.from(this.listeners)) listener(rect, id);
    return true;
  }

  /** True when a change to `node` can move or reveal one of the anchors. */
  private touches(node: Node): boolean {
    if (this.el && node.contains(this.el)) return true;
    if (node.nodeType !== 1) return false;
    const el = node as Element;
    if (el.matches(this.selector) || el.querySelector(this.selector)) {
      return true;
    }
    for (const id of this.ids) {
      for (const anchor of registered.get(currentAnchorId(id))?.keys() ?? []) {
        if (el.contains(anchor)) return true;
      }
    }
    return false;
  }

  private readonly onMutations = (records: MutationRecord[]): void => {
    if (this.removeTask) return;
    for (const record of records) {
      const relevant =
        record.type === 'childList'
          ? // An element added or removed anywhere can shift the anchor;
            // text changes (a live readout) can't move it far, and are skipped.
            hasElement(record.addedNodes) || hasElement(record.removedNodes)
          : record.attributeName === ANCHOR_ATTR ||
            record.attributeName === RACK_ATTR ||
            this.touches(record.target);
      if (relevant) {
        this.schedule();
        return;
      }
    }
  };

  private readonly onScroll = (event: Event): void => {
    if (this.removeTask) return;
    const t = event.target;
    if (
      t === document ||
      t === window ||
      (t instanceof Node && this.touches(t))
    )
      this.schedule();
  };

  private readonly onMotionStart = (event: Event): void => {
    if (!(event.target instanceof Node) || !this.touches(event.target)) return;
    this.followUntil = performance.now() + FOLLOW_MS;
    this.schedule();
  };

  private readonly onMotionEnd = (event: Event): void => {
    if (!(event.target instanceof Node) || !this.touches(event.target)) return;
    this.followUntil = 0;
    this.schedule();
  };
}

/**
 * Calls `listener` with the box of the element `target` resolves to (see
 * resolveAnchor), and again each time it moves, resizes or resolves to
 * something else (null when nothing matches). The first call comes on the
 * next frame, or at once when another subscriber already watches the same
 * target. Subscribers to the same target share one watcher.
 */
export function subscribeAnchorRect(
  target: Target | undefined,
  listener: AnchorListener,
  options: AnchorOptions = {},
): () => void {
  const ids = idsOf(target);
  if (ids.length === 0) return () => {};
  const rack = options.rack ?? DEFAULT_RACK;
  const key = anchorKey(ids, rack);
  let watcher = watchers.get(key);
  if (!watcher) {
    watcher = new AnchorWatcher(ids, rack);
    watchers.set(key, watcher);
  }
  const w = watcher;
  w.listeners.add(listener);
  if (w.measured) listener(w.rect, w.id);
  return () => {
    w.listeners.delete(listener);
    if (w.listeners.size === 0 && watchers.get(key) === w) {
      w.stop();
      watchers.delete(key);
    }
  };
}

/** A value-stable key for a target and rack, for effect dependencies. */
export const anchorKey = (target?: Target, rack?: AnchorRack) =>
  `${idsOf(target).join('|')}#${rack ?? DEFAULT_RACK}`;
