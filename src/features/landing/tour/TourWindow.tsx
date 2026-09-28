import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

/**
 * Faux app window for a module demo: a rounded frame around the scene.
 * `flush` drops the frame so the window sits edge to edge in its section's
 * hairlines.
 */
export const TourWindow = ({
  flush,
  children,
}: {
  flush?: boolean;
  children: ReactNode;
}) => {
  return (
    <div
      className={cn(
        'relative h-full overflow-hidden bg-[#101012]',
        !flush &&
          'rounded-[18px] border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]',
      )}
    >
      {children}
    </div>
  );
};
