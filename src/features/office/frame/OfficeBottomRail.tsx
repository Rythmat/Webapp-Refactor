import { Link } from 'react-router-dom';
import { useMediaQuery } from '@/components/atlas/hooks/useMediaQuery';
import { cn } from '@/components/utilities';
import { PILL_ZONE } from '@/daw/ui/Pill';
import { OFFICE_SEGMENT } from '../ui/styles';
import type { OfficeNav } from './officeNav';

/**
 * The bottom rail: the pages of wherever the teacher is, as the Studio's
 * Create · Mix · Score — the Office's (Today … Review) or, inside a class,
 * that class's (Overview … Progress). On a phone the tabs take their short
 * names and scroll sideways.
 */
export const OfficeBottomRail = ({
  nav,
  className,
  style,
}: {
  nav: OfficeNav;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const narrow = useMediaQuery('(max-width: 639.98px)');
  const label = nav.scope === 'class' ? 'Class pages' : 'Office pages';
  return (
    <div
      className={cn('flex min-w-0 items-center justify-center px-2', className)}
      style={style}
    >
      <nav
        aria-label={label}
        className={cn(
          PILL_ZONE,
          'max-w-full overflow-x-auto [scrollbar-width:none]',
        )}
      >
        {nav.tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={nav.active === tab.id ? 'page' : undefined}
            aria-label={
              narrow && tab.short !== tab.label ? tab.label : undefined
            }
            className={cn(OFFICE_SEGMENT, narrow && 'px-3')}
          >
            {narrow ? tab.short : tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};
