import { useSyncExternalStore } from 'react';

// ── The TopRail's leading slot (Studio milestone 1.4) ──────────────────────
//
// The app TopRail leaves its left side empty; the Studio editor portals its
// save chip and Undo/Redo there while it is mounted (EditorTopRailSlot).
// TopRail registers the element, the editor reads it. A tiny external
// store with no editor imports, so the TopRail (on every dashboard route)
// loads nothing of the Studio. Milestone 2.5 moves the chip and buttons into
// the editor's own top bar and this slot can go.

let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** The TopRail's ref callback: the slot element, or null as it unmounts. */
export function setTopRailSlot(element: HTMLElement | null): void {
  if (slot === element) return;
  slot = element;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readSlot = () => slot;
const readServerSlot = () => null;

/** The slot element while a TopRail is mounted, else null. */
export function useTopRailSlot(): HTMLElement | null {
  return useSyncExternalStore(subscribe, readSlot, readServerSlot);
}
