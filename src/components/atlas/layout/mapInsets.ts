import { useEffect, useRef, type RefObject } from 'react';
import type { MapInsets } from '@/components/atlas/types';

/**
 * What the page's overlays cover of the map (MapInsets), measured from the
 * zones' own boxes. The zones sit over the map in the same container, so a
 * zone's distance from the container's edge is what it covers. Pure, so the
 * arithmetic is tested without a layout.
 */

interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

const shown = (box: Box | null | undefined): box is Box =>
  !!box && box.width > 0 && box.height > 0;

export function insetsFrom(
  container: Box,
  zones: {
    /** The panel along the left edge (desktop). */
    left?: Box | null;
    /** The row along the top edge (the map-control buttons). */
    top?: Box | null;
    /** Whatever stands along the bottom edge (the bar, the sheet's top). */
    bottom?: (Box | null | undefined)[];
    /** Whatever stands along the right edge (the mind map, an open legend). */
    right?: (Box | null | undefined)[];
  },
): MapInsets {
  const px = (n: number) => Math.max(0, Math.round(n));
  return {
    top: shown(zones.top) ? px(zones.top.bottom - container.top) : 0,
    left: shown(zones.left) ? px(zones.left.right - container.left) : 0,
    bottom: Math.max(
      0,
      ...(zones.bottom ?? [])
        .filter(shown)
        .map((box) => px(container.bottom - box.top)),
    ),
    right: Math.max(
      0,
      ...(zones.right ?? [])
        .filter(shown)
        .map((box) => px(container.right - box.left)),
    ),
  };
}

/**
 * Report the insets whenever a zone changes size, and whenever `layoutKey`
 * says a zone came or went. `measure` reads the boxes; `observe` lists the
 * elements whose size matters. Both are read fresh on each report.
 */
export function useReportInsets(
  rootRef: RefObject<HTMLElement | null>,
  observe: (root: HTMLElement) => (Element | null | undefined)[],
  measure: (root: HTMLElement) => MapInsets,
  onInsets: ((insets: MapInsets) => void) | undefined,
  layoutKey: string,
): void {
  const latest = useRef({ observe, measure });
  latest.current = { observe, measure };
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !onInsets) return;
    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        onInsets(latest.current.measure(root)),
      );
    };
    const ro = new ResizeObserver(report);
    ro.observe(root);
    for (const el of latest.current.observe(root)) if (el) ro.observe(el);
    report();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rootRef, onInsets, layoutKey]);
}

/** The map-control buttons, inside the controls zone (MapControls). */
export const CONTROLS_ROW = '[data-atlas-controls-row]';
