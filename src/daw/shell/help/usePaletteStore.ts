import { create } from 'zustand';
import { overlayAround } from '@/daw/commands/keys';

// ── The command palette's open state (milestone 2.15) ──────────────────────
//
// ⌘K (help.palette) and '⋯' ▸ Find a command open it. It remembers where
// focus was when it opened (the opener): the palette lists what works there
// and, once it has closed, runs the chosen command as if its key had been
// pressed there (dispatcher.ts runCommand). Opened from a menu, the opener
// is the page, since the menu is about to go. The '?' sheet passes where it
// was opened from, since focus is still in the sheet as it hands over.

interface PaletteState {
  isOpen: boolean;
  /** Where focus was when it opened (null: the page). */
  opener: Element | null;
  /** Opens it; `from` is the opener when the caller knows better. */
  open: (from?: Element | null) => void;
  close: () => void;
}

export const usePaletteStore = create<PaletteState>()((set) => ({
  isOpen: false,
  opener: null,
  open: (from) => {
    const active = from === undefined ? document.activeElement : from;
    const opener =
      active &&
      active !== document.body &&
      active.isConnected &&
      !overlayAround(active)
        ? active
        : null;
    set({ isOpen: true, opener });
  },
  close: () => set({ isOpen: false }),
}));
