// ── The editor shell's geometry and layout prefs (milestones 2.4, B4a) ─────
//
// The regions (top bar, main, Inspector, side rail, dock, bottom rail) and
// the sizes the student can change: the dock's height for each of its tabs, the Inspector
// column's width, and whether the Inspector is open in each view. Those are
// per-user prefs (the registry's 'pref' scope, kept by prefsStore under each
// student's own key), so a shared Chromebook gives every student their own
// layout and a new project leaves it alone.
//
// Pure: the store and the prefs store load this on every page, so it has
// type imports only.

import type { ChannelStripTabId, ViewType } from '@/daw/store/uiSlice';

/** The editor's top bar (2.5). */
export const TOP_BAR_PX = 44;
/** The bottom rail: Master, the transport and the song (B4a). */
export const BOTTOM_RAIL_PX = 44;
/** The side rail of Inspector icons, at the right edge (B4a). */
export const SIDE_RAIL_PX = 48;

/** The dock's tab bar, always shown in Create. */
export const DOCK_TAB_BAR_PX = 32;
/** The dock is never shorter than this, tab bar included. */
export const DOCK_MIN_PX = 120;
/** …and never taller than this share of the shell's body. */
export const DOCK_MAX_FRAC = 0.85;
/** Heights a dock drag snaps to, as shares of the body, within SNAP_PX. */
export const DOCK_SNAPS = [0.25, 0.4, 0.6, 0.85] as const;
export const DOCK_SNAP_PX = 12;
/** A double-click on the dock's edge goes between the default and this. */
export const DOCK_TALL_FRAC = 0.6;
/** One arrow-key step of a resizer. */
export const RESIZE_STEP_PX = 16;

/**
 * The Mix view's strips keep at least this much of the body under an open
 * RackDock: their name, effects, knobs, M/S and a 100 px fader.
 */
export const MIX_STRIPS_MIN_PX = 300;

/** The RackDock's tallest, in a body `bodyPx` high (2.10). */
export function rackMaxPx(bodyPx: number): number {
  return Math.max(
    DOCK_MIN_PX,
    Math.min(Math.round(bodyPx * DOCK_MAX_FRAC), bodyPx - MIX_STRIPS_MIN_PX),
  );
}

/**
 * What fills the dock's slot: one of its tabs or Master (2.9) in Create, the
 * RackDock in Mix (2.10).
 */
export type DockSlotId = ChannelStripTabId | 'master' | 'rack';

/**
 * The dock's slots. Each keeps a height of its own once the student sets
 * one; until then every dock opens at the same height (shellGeometry's
 * DOCK_DEFAULT_PX; owner, 2026-10-22). A slot missing here, or one too
 * many, fails to compile.
 */
const DOCK_SLOT_TABLE: Readonly<Record<DockSlotId, true>> = {
  controls: true,
  fx: true,
  prism: true,
  'piano-roll': true,
  master: true,
  rack: true,
};

/** Every dock slot. */
export const DOCK_SLOTS = Object.freeze(
  Object.keys(DOCK_SLOT_TABLE),
) as readonly DockSlotId[];

/** Whether `value` is one of the dock's slots. */
export function isDockSlot(value: unknown): value is DockSlotId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(DOCK_SLOT_TABLE, value)
  );
}

/**
 * Tabs the dock had once (Parts until 2.9, the drums' Grooves until
 * 2026-10-22): a stored height for one is still a valid pref, and is never
 * read.
 */
const FORMER_DOCK_TABS = ['parts', 'grooves'];

/** The Inspector panel, beside the side rail. */
export const INSPECTOR_MIN_PX = 240;
export const INSPECTOR_MAX_PX = 420;
export const INSPECTOR_DEFAULT_PX = 300;

/**
 * The side rail's panels, top to bottom (owner's choice, 2026-10-16): one
 * shows in the Inspector at a time.
 */
export const INSPECTOR_PANELS = [
  'insight',
  'library',
  'lessons',
  'people',
] as const;
export type InspectorPanelId = (typeof INSPECTOR_PANELS)[number];

/**
 * Below this window width the Inspector starts closed, so the timeline keeps
 * its width on a Chromebook; from it, Create opens with the Inspector.
 */
export const INSPECTOR_PINNED_MIN_VIEWPORT = 1440;

export type DockHeights = Partial<Record<DockSlotId, number>>;
export type InspectorOpenByView = Partial<Record<ViewType, boolean>>;
/** The position readout: bars and beats, or minutes and seconds. */
export type ReadoutMode = 'bars' | 'time';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * A dock showing device cards (an instrument, a track's Effects, Master,
 * the Mix view's rack) is never shorter than this, its 32 px bar included:
 * its cards keep their main controls and room for a sideways scrollbar, so
 * nothing spills out of them (FxCards' cardLayout, OracleSynthCard's
 * synthCardLayout).
 */
export const DOCK_FX_MIN_PX = 184;

const CARD_SLOTS: ReadonlySet<DockSlotId> = new Set([
  'controls',
  'fx',
  'master',
  'rack',
]);

/** The shortest the dock may be for `slot`. */
export function dockMinPx(slot: DockSlotId): number {
  return CARD_SLOTS.has(slot) ? DOCK_FX_MIN_PX : DOCK_MIN_PX;
}

/** The dock's height in px, tab bar included, for a body `bodyPx` high. */
export function dockHeightPx(
  frac: number,
  bodyPx: number,
  min: number = DOCK_MIN_PX,
): number {
  const max = Math.max(min, Math.round(bodyPx * DOCK_MAX_FRAC));
  return clamp(Math.round(frac * bodyPx), min, max);
}

/**
 * Where a dock drag lands: within the limits, and on a snap height when it
 * comes within DOCK_SNAP_PX of one.
 */
export function snapDockPx(
  px: number,
  bodyPx: number,
  min: number = DOCK_MIN_PX,
): number {
  const max = Math.max(min, Math.round(bodyPx * DOCK_MAX_FRAC));
  const clamped = clamp(px, min, max);
  for (const frac of DOCK_SNAPS) {
    const at = Math.round(frac * bodyPx);
    if (Math.abs(at - clamped) <= DOCK_SNAP_PX) return clamp(at, min, max);
  }
  return Math.round(clamped);
}

export function clampInspectorPx(px: number): number {
  return Math.round(clamp(px, INSPECTOR_MIN_PX, INSPECTOR_MAX_PX));
}

/** Whether the Inspector opens in `view` before the student has chosen. */
export function defaultInspectorOpen(
  view: ViewType,
  viewportWidth: number,
): boolean {
  return view === 'arrange' && viewportWidth >= INSPECTOR_PINNED_MIN_VIEWPORT;
}

/** The window's width, or the laptop width without a window (tests, SSR). */
export function viewportWidth(): number {
  return typeof window === 'undefined'
    ? INSPECTOR_PINNED_MIN_VIEWPORT
    : window.innerWidth;
}

/** Whether the Inspector is open in `view`: the student's choice, else the default. */
export function resolveInspectorOpen(
  view: ViewType,
  byView: InspectorOpenByView,
  width: number = viewportWidth(),
): boolean {
  return byView[view] ?? defaultInspectorOpen(view, width);
}

// ── Validation (prefsStore takes nothing else from storage) ────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const DOCK_TABS = new Set<string>([...DOCK_SLOTS, ...FORMER_DOCK_TABS]);
const VIEWS = new Set<string>([
  'arrange',
  'studio',
  'score',
  'leadsheet',
  'practice',
]);

export function isDockHeights(value: unknown): value is DockHeights {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([tab, frac]) =>
        DOCK_TABS.has(tab) &&
        typeof frac === 'number' &&
        Number.isFinite(frac) &&
        frac > 0 &&
        frac <= DOCK_MAX_FRAC,
    )
  );
}

export function isInspectorOpenByView(
  value: unknown,
): value is InspectorOpenByView {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([view, open]) => VIEWS.has(view) && typeof open === 'boolean',
    )
  );
}

export function isInspectorWidth(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= INSPECTOR_MIN_PX &&
    value <= INSPECTOR_MAX_PX
  );
}

export function isInspectorPanel(value: unknown): value is InspectorPanelId {
  return (
    typeof value === 'string' &&
    (INSPECTOR_PANELS as readonly string[]).includes(value)
  );
}

export function isReadoutMode(value: unknown): value is ReadoutMode {
  return value === 'bars' || value === 'time';
}
