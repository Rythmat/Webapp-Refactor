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

/**
 * A corner card's box as the map frames around it: only `share` of its width,
 * from the side it is on (frameGeometry.ts, CORNER_INSET_SHARE).
 */
export function cornerBox(
  box: Box,
  side: 'left' | 'right',
  share: number,
): Box {
  const width = box.width * share;
  return side === 'left'
    ? {
        top: box.top,
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.left + width,
        width,
      }
    : {
        top: box.top,
        bottom: box.bottom,
        height: box.height,
        left: box.right - width,
        right: box.right,
        width,
      };
}

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

/** No zone over the map. */
export const NO_MAP_INSETS: MapInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const sameInsets = (a: MapInsets, b: MapInsets): boolean =>
  a.top === b.top &&
  a.right === b.right &&
  a.bottom === b.bottom &&
  a.left === b.left;

/**
 * What several zones cover together: on each edge, the deepest. The cards
 * at the left and the Inspector at the right each keep their own side; a
 * bar and a sheet along the bottom don't add up, the taller one counts.
 */
export function combineInsets(zones: readonly MapInsets[]): MapInsets {
  return zones.reduce<MapInsets>(
    (all, z) => ({
      top: Math.max(all.top, z.top),
      right: Math.max(all.right, z.right),
      bottom: Math.max(all.bottom, z.bottom),
      left: Math.max(all.left, z.left),
    }),
    NO_MAP_INSETS,
  );
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
