import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

export interface UnderlineTab {
  key: string;
  label: string;
  /** Where it goes: a path, or `?tab=…` on the page. */
  to: string;
}

/**
 * A page's tabs, as the Studio's (src/daw/ui/Tabs): bold words, dim until
 * chosen; the chosen one on the selected fill with a 2px underline
 * (studio-audit decision: white/10 plus the underline). Links, so each tab
 * is a URL and the page reads which is current from it.
 */
export function UnderlineTabs({
  items,
  activeKey,
  label,
  className,
}: {
  items: readonly UnderlineTab[];
  activeKey: string;
  /** What the tabs choose between, for assistive tech. */
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('min-w-0', className)}>
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key} className="shrink-0">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                data-tab={item.key}
                className={cn(
                  'relative inline-flex h-9 items-center whitespace-nowrap rounded-[var(--daw-radius-sm)] px-3 text-[0.875rem] font-bold',
                  'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full',
                  TRANSITION,
                  FOCUS_RING,
                  active
                    ? 'bg-daw-selected text-daw-text after:bg-daw-text'
                    : 'text-daw-text-3 after:bg-transparent hover:text-daw-text',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
