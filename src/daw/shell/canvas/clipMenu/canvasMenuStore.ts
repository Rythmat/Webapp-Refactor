import { create } from 'zustand';
import { getPlayheadTick } from '@/daw/engine/playheadClock';

// ── Which canvas menu is open (milestone 2.12) ─────────────────────────────
//
// One menu serves the whole Create canvas: a clip (right-click, its Edit
// pill or a key), an empty lane, a marker and the ruler. Whoever opens it
// says what it is for and where it hangs; CanvasMenu renders it. It lives
// here, beside the editor's store rather than in it: a menu being open is
// nothing a project holds, saves or undoes.

export type CanvasMenuTarget =
  | { kind: 'clip'; trackId: string; clipId: string }
  | { kind: 'lane'; trackId: string; tick: number }
  | { kind: 'marker'; markerId: string; tick: number }
  | { kind: 'ruler'; tick: number };

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
