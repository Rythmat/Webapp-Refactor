import { Laptop } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { TourTabId } from '../tour/tourSteps';

/** An icon from the app (`public/icons`), at the landing's icon size. */
export const appIcon = (src: string, className = 'size-10') => (
  <img src={src} alt="" draggable={false} className={className} />
);

/**
 * A module's icon — the same as the app sidebar (ClassroomSidebar) — sized by
 * `className` (the landing's icon size by default). Kept apart from
 * `LANDING_MODULES` so pages can use the icons without pulling in the landing's
 * demo scenes.
 */
export const moduleIcon = (id: TourTabId, className = 'size-10'): ReactNode =>
  id === 'teach' ? (
    <Laptop className={cn(className, 'text-white/80')} />
  ) : (
    appIcon(`/icons/${id}-icon.svg`, className)
  );

export const MODULE_ICONS: Record<TourTabId, ReactNode> = {
  learn: moduleIcon('learn'),
  studio: moduleIcon('studio'),
  globe: moduleIcon('globe'),
  arcade: moduleIcon('arcade'),
  teach: moduleIcon('teach'),
};
