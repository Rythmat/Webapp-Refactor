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
  slotRef,
  className,
  style,
}: {
  nav: OfficeNav;
  /** The right-hand slot a page's controls portal into (`OfficeRailSlot`). */
  slotRef: (el: HTMLElement | null) => void;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const narrow = useMediaQuery('(max-width: 639.98px)');
  const label = nav.scope === 'class' ? 'Class pages' : 'Office pages';
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 max-sm:grid-cols-[auto] max-sm:justify-center',
        className,
      )}
      style={style}
    >
      <span aria-hidden className="max-sm:hidden" />
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
      <div
        ref={slotRef}
        className="flex min-w-0 items-center justify-end gap-2 max-sm:hidden"
      />
    </div>
  );
};
