import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/components/utilities';

export type FloatingCardRadius = 'lg' | 'xl' | '2xl';

export interface FloatingCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 12, 16 or 20 (the default, the prompt bar's) px corners. */
  radius?: FloatingCardRadius;
}

const RADIUS_CLASS: Record<FloatingCardRadius, string> = {
  lg: 'rounded-[var(--daw-radius-lg)]',
  xl: 'rounded-[var(--daw-radius-xl)]',
  '2xl': 'rounded-[var(--daw-radius-2xl)]',
};

/**
 * A card that floats over the stage without an anchor (the prompt bar, its
 * status and reply cards, a coach card), in the page's flow rather than a
 * portal: Popover is for what opens from a trigger. Opaque, as every
 * overlay is, with a white/10 edge and a soft shadow. It is design-system
 * work wherever it floats, so it marks itself for the design probe.
 */
export const FloatingCard = forwardRef<HTMLDivElement, FloatingCardProps>(
  function FloatingCard({ radius = '2xl', className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-ds="v2"
        className={cn(
          'border border-daw-edge bg-daw-popover text-daw-text [box-shadow:var(--daw-shadow-float)]',
          RADIUS_CLASS[radius],
          className,
        )}
        {...props}
      />
    );
  },
);
