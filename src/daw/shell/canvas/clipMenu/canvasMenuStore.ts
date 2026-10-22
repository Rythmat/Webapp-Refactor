import { create } from 'zustand';
import { getPlayheadTick } from '@/daw/engine/playheadClock';

// ── Which canvas menu is open (milestone 2.12) ─────────────────────────────
//
// One menu serves the whole Create canvas: a clip (right-click, its Edit
// pill or a key), an empty lane, a marker, the ruler and a song section
// (milestone 2.13: a right-click or a key in the sections lane). Whoever opens it
// says what it is for and where it hangs; CanvasMenu renders it. It lives
// here, beside the editor's store rather than in it: a menu being open is
// nothing a project holds, saves or undoes.

export type CanvasMenuTarget =
  /** `tick`: where a right-click landed in the clip (Suggest chords there);
   *  the pill and the keys open the menu without one. */
  | { kind: 'clip'; trackId: string; clipId: string; tick?: number }
  /** `tick`: the pointer's, unsnapped: each item snaps it its own way (a
   *  new clip from the grid line before it, a paste to the nearest). */
  | { kind: 'lane'; trackId: string; tick: number }
  | { kind: 'marker'; markerId: string; tick: number }
  | { kind: 'ruler'; tick: number }
  /** A chord on the chord ruler; `tick`: the pointer's, on the grid. */
  | { kind: 'chord'; chordId: string; tick: number }
  /** The chord ruler where it has no chord. */
  | { kind: 'chordLane'; tick: number }
  | { kind: 'section'; sectionId: string; tick: number };

/** Where the menu hangs, in viewport px: a point, or a box (the pill). */
export interface CanvasMenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What opened it: a right-click hangs it at the pointer, the pill under
 *  itself, a key under the clip's pill (or the clip). */
export type CanvasMenuSource = 'pointer' | 'pill' | 'key';

export interface CanvasMenuRequest {
  target: CanvasMenuTarget;
  anchor: CanvasMenuAnchor;
  source: CanvasMenuSource;
  /** The playhead when it opened: whether Split at playhead can act. */
  playheadTick: number;
  /**
   * Where focus goes back to when it closes, for a menu opened from a key
   * outside the canvas (a section in the sections lane); else the pill.
   */
  returnFocus?: HTMLElement | null;
  /**
   * Where focus goes instead of `returnFocus` once that has left the page
   * (its section deleted from this menu, or while it was open): the
   * section next to it in the sections lane.
   */
  returnFocusFallback?: () => HTMLElement | null;
}

interface CanvasMenuState {
  request: CanvasMenuRequest | null;
  /** The selected clip's Edit pill while one shows: a key opens the menu
   *  under it. */
  pill: HTMLElement | null;
  /** Where a clip sits on screen, from the Timeline while it is mounted: a
   *  key opens the menu under a clip whose pill is out of sight. */
  clipAnchor: ((clipId: string) => CanvasMenuAnchor | null) | null;
  open: (request: CanvasMenuRequest) => void;
  close: () => void;
  setPill: (pill: HTMLElement | null) => void;
}

export const useCanvasMenuStore = create<CanvasMenuState>((set) => ({
  request: null,
  pill: null,
  clipAnchor: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
  setPill: (pill) => set({ pill }),
}));

/** A box anchor from an element's place on screen. */
export function anchorOf(el: Element): CanvasMenuAnchor {
  const box = el.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

/**
 * Opens the menu on a clip from its pill or a key: under the pill while it
 * shows, else under the clip. False when the clip is nowhere on the canvas.
 */
export function openClipMenu(
  target: { trackId: string; clipId: string },
  source: Exclude<CanvasMenuSource, 'pointer'>,
): boolean {
  const { pill, clipAnchor, open } = useCanvasMenuStore.getState();
  const anchor =
    pill && pill.dataset.clipId === target.clipId
      ? anchorOf(pill)
      : (clipAnchor?.(target.clipId) ?? null);
  if (!anchor) return false;
  open({
    target: { kind: 'clip', ...target },
    anchor,
    source,
    playheadTick: getPlayheadTick(),
  });
  return true;
}
