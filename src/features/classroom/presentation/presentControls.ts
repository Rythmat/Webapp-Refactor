import { createContext } from 'react';

/**
 * Where a slide's own controls go while presenting: on the same row as the
 * slide bar, at its height (owner, 2026-11-10: the globe's next-place bar
 * level with the next-slide bar). Null off Present (the room's screen, the
 * editor), where a slide draws its controls on its own canvas.
 */
export const PresentControlsContext = createContext<HTMLElement | null>(null);
