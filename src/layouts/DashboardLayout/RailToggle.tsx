import { PanelLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { isIconRailPath, useAppRail } from './appRailStore';

/**
 * Opens the app rail from a top bar's left end, as Samply's (owner,
 * 2026-11-10). On a desk (960px and wider) it shows only while the rail is
 * shut and no icon rail stands in for it (the Studio editor's); narrower,
 * where the rail slides over the page, it's always there.
 * It shows the Music Atlas logo, which turns into the sidebar icon under the
 * pointer or keyboard focus (owner, 2026-11-10, every page), as Home's icon
 * rail's does.
 */
export function RailToggle({ className }: { className?: string }) {
  const open = useAppRail((s) => s.open);
  const toggle = useAppRail((s) => s.toggle);
  const { pathname } = useLocation();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Open sidebar"
      title="Open sidebar"
      data-rail-toggle
      className={cn(
        'group grid size-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/[0.08]',
        TRANSITION,
        FOCUS_RING,
        (open || isIconRailPath(pathname)) && 'min-[960px]:hidden',
        className,
      )}
    >
      <Logo className="col-start-1 row-start-1 size-[1.136rem] group-hover:opacity-0 group-focus-visible:opacity-0" />
      <PanelLeft
        aria-hidden
        strokeWidth={1.75}
        className="col-start-1 row-start-1 size-[1.136rem] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  );
}
