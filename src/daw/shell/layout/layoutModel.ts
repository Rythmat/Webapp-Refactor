// ── The editor shell's geometry and layout prefs (milestone 2.4) ───────────
//
// The five regions (top bar, main, Inspector, dock) and the sizes the
// student can change: the dock's height for each of its tabs, the Inspector
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
 * Each tab's default height, as a share of the body (window height less the
 * top bar): 220 px on a Chromebook in focus mode (611 px of body), the
 * plan's pixel budget, and a little more for the two editors.
 */
export const DOCK_DEFAULT_FRAC: Readonly<Record<ChannelStripTabId, number>> = {
  controls: 0.36,
  fx: 0.36,
  grooves: 0.36,
  parts: 0.36,
  prism: 0.4,
  'piano-roll': 0.4,
};

/** The Inspector column (LibraryPanel until 2.8 replaces it). */
export const INSPECTOR_MIN_PX = 200;
export const INSPECTOR_MAX_PX = 420;
export const INSPECTOR_DEFAULT_PX = 200;

/**
 * Below this window width the Inspector starts closed, so the timeline keeps
 * its width on a Chromebook; from it, Create opens with the Inspector.
 */
export const INSPECTOR_PINNED_MIN_VIEWPORT = 1440;

export type DockHeights = Partial<Record<ChannelStripTabId, number>>;
export type InspectorOpenByView = Partial<Record<ViewType, boolean>>;
/** The position readout: bars and beats, or minutes and seconds. */
export type ReadoutMode = 'bars' | 'time';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** The dock's share of the body for `tab`: the student's, else the default. */
export function dockFracFor(
  tab: ChannelStripTabId,
  heights: DockHeights,
): number {
  return heights[tab] ?? DOCK_DEFAULT_FRAC[tab];
}

/** The dock's height in px, tab bar included, for a body `bodyPx` high. */
export function dockHeightPx(frac: number, bodyPx: number): number {
  const max = Math.max(DOCK_MIN_PX, Math.round(bodyPx * DOCK_MAX_FRAC));
  return clamp(Math.round(frac * bodyPx), DOCK_MIN_PX, max);
}

/**
 * Where a dock drag lands: within the limits, and on a snap height when it
 * comes within DOCK_SNAP_PX of one.
 */
export function snapDockPx(px: number, bodyPx: number): number {
  const max = Math.max(DOCK_MIN_PX, Math.round(bodyPx * DOCK_MAX_FRAC));
  const clamped = clamp(px, DOCK_MIN_PX, max);
  for (const frac of DOCK_SNAPS) {
    const at = Math.round(frac * bodyPx);
    if (Math.abs(at - clamped) <= DOCK_SNAP_PX)
      return clamp(at, DOCK_MIN_PX, max);
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

const DOCK_TABS = new Set<string>(Object.keys(DOCK_DEFAULT_FRAC));
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

export function isReadoutMode(value: unknown): value is ReadoutMode {
  return value === 'bars' || value === 'time';
}
