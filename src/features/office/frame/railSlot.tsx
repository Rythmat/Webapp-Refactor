import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';

// ── A page's controls on the rails (owner, 2026-11-09) ─────────────────────
// As the Studio's rails carry the view's own controls, an Office page can
// put its controls on the frame: the bottom rail's right (Plan's List ·
// Week · Month, the live room's slide stepper) and the top rail's right (the
// editor's Present and Go Live, the live room's Present and End). The frame
// owns the slots; a page portals into them. While a page holds the top
// slot, the class's own Go Live steps aside, so there's one white pill.

export interface RailSlots {
  bottom: HTMLElement | null;
  top: HTMLElement | null;
  /** How many mounted pages hold the top slot. */
  claimTop: Dispatch<SetStateAction<number>>;
}

export const RailSlotContext = createContext<RailSlots>({
  bottom: null,
  top: null,
  claimTop: () => {},
});

/** Render children in the bottom rail's right-hand slot (from `sm` up). */
export const OfficeRailSlot = ({ children }: { children: ReactNode }) => {
  const { bottom } = useContext(RailSlotContext);
  return bottom ? createPortal(children, bottom) : null;
};

/** Render a page's actions at the top rail's right, in place of Go Live. */
export const OfficeTopActions = ({ children }: { children: ReactNode }) => {
  const { top, claimTop } = useContext(RailSlotContext);
  useEffect(() => {
    claimTop((n) => n + 1);
    return () => claimTop((n) => n - 1);
  }, [claimTop]);
  return top ? createPortal(children, top) : null;
};
