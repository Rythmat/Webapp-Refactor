import { Laptop } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TourTabId } from '../tour/tourSteps';

/** An icon from the app (`public/icons`), at the landing's icon size. */
export const appIcon = (src: string) => (
  <img src={src} alt="" draggable={false} className="size-10" />
);

/**
 * Each module's icon — the same as the app sidebar (ClassroomSidebar). Kept
 * apart from `LANDING_MODULES` so pages can use the icons without pulling in
 * the landing's demo scenes.
 */
export const MODULE_ICONS: Record<TourTabId, ReactNode> = {
  learn: appIcon('/icons/learn-icon.svg'),
  studio: appIcon('/icons/studio-icon.svg'),
  globe: appIcon('/icons/globe-icon.svg'),
  arcade: appIcon('/icons/arcade-icon.svg'),
  teach: <Laptop className="size-10 text-white/80" />,
};
