import { useEffect, useState, type RefObject } from 'react';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import { EQ_NUMBERS_MIN_H } from '@/daw/components/Effects/eqScale';
import {
  DOCK_MAX_FRAC,
  dockHeightPx,
  dockMinPx,
  rackMaxPx,
  BOTTOM_RAIL_PX,
  TOP_BAR_PX,
  type DockHeights,
  type DockSlotId,
} from './layoutModel';

// ── The shell's sizes as CSS variables (milestone 2.4) ─────────────────────
//
// The dock's height and the Inspector's width are custom properties on the
// shell root: --daw-dock-h (tab bar included) and --daw-insp-w. A resize
// drag writes them directly, so nothing re-renders while it moves; the
// student's sizes (per-user prefs) and the window's height set them
// otherwise, again without a React render of the shell. A maximized dock
// (2.9) takes the whole body.

export const DOCK_HEIGHT_VAR = '--daw-dock-h';
export const INSPECTOR_WIDTH_VAR = '--daw-insp-w';

/**
 * Where the dock's height is kept: one height for every dock in Create,
 * Instrument, Effects, Edit and Master alike (owner, 2026-10-22: Master
 * opens at the others' height), kept in the Instrument slot. Each tab and
 * Master used to keep a height of their own, so a dock jumped from one to
 * the next; their old heights are still valid prefs, and are never read.
 * `tab` and `master` stay so callers say what the dock shows.
 */
export function dockSlotOf(
  _tab: ChannelStripTabId | null,
  _master = false,
): DockSlotId {
  return 'controls';
}

/**
 * What an Effects dock spends around its EQ's graph, which fills its card
 * edge to edge: the dock's 1 px top edge, the card row's 8 px padding above
 * and below (FxCards' CARD_GAP_PX) and the card's 32 px header
 * (CARD_HEADER_PX). Kept here rather than imported, so the shell's chunk
 * doesn't take in the effect cards.
 */
const EQ_DOCK_CHROME_PX = 1 + 2 * 8 + 32;

/**
 * Every dock's default height, whatever it shows: just tall enough for an
 * EQ's graph in the Effects dock to show its numbers (eqScale; owner,
 * 2026-10-22), so the dock keeps its height from tab to tab. A height the
 * student sets stands, for every dock (dockSlotOf).
 */
export const DOCK_DEFAULT_PX = EQ_NUMBERS_MIN_H + EQ_DOCK_CHROME_PX;

/** The dock's height in px for `slot`, in a body `bodyPx` high. */
export function dockPxFor(
  slot: DockSlotId,
  heights: DockHeights,
  bodyPx: number,
): number {
  const min = dockMinPx(slot);
  const frac = heights[slot];
  if (frac === undefined) {
    const max = Math.max(min, Math.round(bodyPx * DOCK_MAX_FRAC));
    return Math.min(max, Math.max(min, DOCK_DEFAULT_PX));
  }
  return dockHeightPx(frac, bodyPx, min);
}

/**
 * The shell's body: its height less the top bar and the bottom rail, 0
 * before it is laid out.
 */
export function bodyPxOf(root: HTMLElement | null): number {
  return root
    ? Math.max(0, root.clientHeight - TOP_BAR_PX - BOTTOM_RAIL_PX)
    : 0;
}

/**
 * The shell body's height, re-rendering the caller when the window resizes
 * (never during a drag or playback).
 */
export function useShellBodyPx(rootRef: RefObject<HTMLElement>): number {
  const [bodyPx, setBodyPx] = useState(0);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setBodyPx(bodyPxOf(root));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [rootRef]);
  return bodyPx;
}

/**
 * Keeps --daw-dock-h and --daw-insp-w on the shell root in step with the
 * student's sizes and the window, by store subscription and a
 * ResizeObserver: no React render.
 */
export function useShellGeometry(rootRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const s = useStore.getState();
      const body = bodyPxOf(root);
      if (body > 0) {
        // Mix's RackDock (2.10) has a height of its own in the same slot.
        const slot =
          s.currentView === 'studio'
            ? 'rack'
            : dockSlotOf(s.channelStripTab, s.dockMaster);
        const px =
          slot === 'rack'
            ? Math.min(dockPxFor(slot, s.dockHeights, body), rackMaxPx(body))
            : s.dockMaximized
              ? body
              : dockPxFor(slot, s.dockHeights, body);
        root.style.setProperty(DOCK_HEIGHT_VAR, `${px}px`);
      }
      root.style.setProperty(INSPECTOR_WIDTH_VAR, `${s.inspectorWidth}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    const unsubscribe = useStore.subscribe(
      (s) =>
        [
          s.channelStripTab,
          s.dockHeights,
          s.inspectorWidth,
          s.dockMaster,
          s.dockMaximized,
          s.currentView,
        ] as const,
      apply,
      { equalityFn: (a, b) => a.every((v, i) => v === b[i]) },
    );
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [rootRef]);
}
