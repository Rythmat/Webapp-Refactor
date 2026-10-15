import { createContext, useContext } from 'react';

/**
 * The page's root element (`.atlas-root`), for the dialogs and popovers that
 * render in a portal: inside it they get the page's colour tokens and its
 * stacking layers (theme/layers.ts), which a portal into <body> would lose.
 * Null before the page mounts, and in tests that render a piece alone; a
 * portal then falls back to <body>.
 */
export const AtlasPortalContext = createContext<HTMLElement | null>(null);

export const useAtlasPortal = (): HTMLElement | null =>
  useContext(AtlasPortalContext);
