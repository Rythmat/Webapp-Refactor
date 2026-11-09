import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// ── A page's controls on the bottom rail (owner, 2026-11-09) ───────────────
// As the Studio's bottom rail carries the view's own controls beside the
// tabs, an Office page can put its view switch (Plan's List · Week · Month)
// at the rail's right. The frame owns the slot; a page portals into it.

export const RailSlotContext = createContext<HTMLElement | null>(null);

/** Render children in the bottom rail's right-hand slot (from `sm` up). */
export const OfficeRailSlot = ({ children }: { children: ReactNode }) => {
  const slot = useContext(RailSlotContext);
  return slot ? createPortal(children, slot) : null;
};
