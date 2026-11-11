import { create } from 'zustand';
import { isEditorPath } from '@/daw/preload';

// ── The app rail's open state (owner, 2026-11-10: Samply's sidebar) ────────
// On a desk (960px and wider, as Samply's) the rail sits beside the page and
// pushes it over; whether it's open is remembered on this device. Narrower,
// it slides over the page and always starts shut, so it has its own state
// that's never saved.

const OPEN_KEY = 'ma.appRail.open';

/** Wide enough to push the page over, as Samply's (960px); narrower, the
 *  rail slides over the page. */
export const DESK_QUERY = '(min-width: 960px)';
/** Pages whose shut rail keeps its icons (IconRail) on a desk: every page
 *  but the Studio editor, which needs the room (owner, 2026-11-11; it was
 *  Home only). The narrow sheet has no shut state to fill. */
export function isIconRailPath(pathname: string): boolean {
  return !isEditorPath(pathname);
}

/** Wide enough that a first visit finds the rail open. */
const WIDE_QUERY = '(min-width: 1024px)';

const matches = (query: string) =>
  typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;

function initialOpen(): boolean {
  try {
    const saved = window.localStorage.getItem(OPEN_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    // Storage blocked: decide by the width.
  }
  return matches(WIDE_QUERY);
}

interface AppRailState {
  /** On a desk: the rail beside the page. */
  open: boolean;
  /** On a phone: the rail over the page. */
  sheetOpen: boolean;
  /** The last page outside the Account area: where "‹ Account" goes back to. */
  lastOutside: string | null;
  setOpen(open: boolean): void;
  setSheetOpen(open: boolean): void;
  /** The toggle: the desk's rail, or the phone's sheet. */
  toggle(): void;
  setLastOutside(path: string): void;
}

export const useAppRail = create<AppRailState>((set, get) => ({
  open: initialOpen(),
  sheetOpen: false,
  lastOutside: null,
  setOpen(open) {
    set({ open });
    try {
      window.localStorage.setItem(OPEN_KEY, open ? '1' : '0');
    } catch {
      // Storage blocked: the choice lasts this visit.
    }
  },
  setSheetOpen(sheetOpen) {
    set({ sheetOpen });
  },
  setLastOutside(lastOutside) {
    set({ lastOutside });
  },
  toggle() {
    if (matches(DESK_QUERY)) get().setOpen(!get().open);
    else set({ sheetOpen: !get().sheetOpen });
  },
}));
