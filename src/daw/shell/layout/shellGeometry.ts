import { useEffect, useState, type RefObject } from 'react';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import {
  DOCK_DEFAULT_FRAC,
  dockFracFor,
  dockHeightPx,
  BOTTOM_RAIL_PX,
  TOP_BAR_PX,
  type DockHeights,
} from './layoutModel';

// ── The shell's sizes as CSS variables (milestone 2.4) ─────────────────────
//
// The dock's height and the Inspector's width are custom properties on the
// shell root: --daw-dock-h (tab bar included) and --daw-insp-w. A resize
// drag writes them directly, so nothing re-renders while it moves; the
// student's sizes (per-user prefs) and the window's height set them
// otherwise, again without a React render of the shell.

export const DOCK_HEIGHT_VAR = '--daw-dock-h';
export const INSPECTOR_WIDTH_VAR = '--daw-insp-w';

/** The tab the dock sizes itself for: the open one, else Instrument. */
const sizingTab = (tab: ChannelStripTabId | null): ChannelStripTabId =>
  tab !== null && tab in DOCK_DEFAULT_FRAC ? tab : 'controls';

/** The dock's height in px for the open tab, in a body `bodyPx` high. */
export function dockPxFor(
  tab: ChannelStripTabId | null,
  heights: DockHeights,
  bodyPx: number,
): number {
  return dockHeightPx(dockFracFor(sizingTab(tab), heights), bodyPx);
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
        root.style.setProperty(
          DOCK_HEIGHT_VAR,
          `${dockPxFor(s.channelStripTab, s.dockHeights, body)}px`,
        );
      }
      root.style.setProperty(INSPECTOR_WIDTH_VAR, `${s.inspectorWidth}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(root);
    const unsubscribe = useStore.subscribe(
      (s) => [s.channelStripTab, s.dockHeights, s.inspectorWidth] as const,
      apply,
      {
        equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2],
      },
    );
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [rootRef]);
}
