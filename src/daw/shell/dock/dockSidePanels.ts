import { create } from 'zustand';

// ── The dock's side panels, folded or open (owner, 2026-10-22) ─────────────
//
// The instrument view's left columns fold to a rail: the sound menu every
// MIDI instrument shares (SoundBrowser), and the Tuner (an audio track's
// tuner column, or the tuner under a guitar's or a voice's input). Each is
// remembered on this device, apart from the other; it isn't part of the
// project or synced to collaborators.

export type DockSidePanel = 'sounds' | 'tuner';

const KEY = 'ma.studio.dockPanelsFolded';

function load(): Record<DockSidePanel, boolean> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const saved = raw
      ? (JSON.parse(raw) as Partial<Record<DockSidePanel, unknown>>)
      : {};
    return { sounds: saved.sounds === true, tuner: saved.tuner === true };
  } catch {
    return { sounds: false, tuner: false };
  }
}

interface DockSidePanelsState {
  folded: Record<DockSidePanel, boolean>;
  setFolded(panel: DockSidePanel, folded: boolean): void;
}

export const useDockSidePanels = create<DockSidePanelsState>((set, get) => ({
  folded: load(),
  setFolded(panel, folded) {
    const next = { ...get().folded, [panel]: folded };
    set({ folded: next });
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
    } catch {
      // A private window or blocked storage: folded for this visit only.
    }
  },
}));

/** Whether a side panel is folded, and a way to fold or open it. */
export function useDockPanelFolded(
  panel: DockSidePanel,
): [folded: boolean, setFolded: (folded: boolean) => void] {
  const folded = useDockSidePanels((s) => s.folded[panel]);
  const setFolded = useDockSidePanels((s) => s.setFolded);
  return [folded, (next) => setFolded(panel, next)];
}
