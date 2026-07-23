import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

/** Full-width marketing section. Content spans the page width (edge padding
 *  `px-6 md:px-10`, matching the nav + landing); no centered max-width column. */
export const MarketingSection = ({
  id,
  children,
  className,
  containerClassName,
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  bleed?: boolean;
}) => {
  return (
    <section
      id={id}
      className={cn('relative w-full px-6 py-16 sm:py-20 md:px-10', className)}
    >
      {bleed ? (
        children
      ) : (
        <div className={cn('w-full', containerClassName)}>
          {children}
        </div>
      )}
    </section>
  );
};
