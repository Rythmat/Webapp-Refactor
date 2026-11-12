import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TAB, TAB_ACTIVE } from '@/components/kit/libraryLook';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import { OFFICE_PAGE_TITLE } from '@/features/office/ui/styles';

// ── What Learn's and Songs' pages share: the column, the grid, the head ───

/** Learn's own grids: a `fit` shelf's 210px cards, 24px apart (owner,
 *  2026-11-10), two across on a phone. */
export const LEARN_GRID =
  'grid grid-cols-2 gap-[1.364rem] sm:grid-cols-[repeat(auto-fill,11.932rem)]';

/** A Learn grid. */
export function LearnGrid({ children }: { children: ReactNode }) {
  return <ul className={LEARN_GRID}>{children}</ul>;
}

/** The page's column: the whole window, a rem in from the panel's edge with
 *  the panel's own padding, as Suno's. */
export const EXPLORE_COLUMN = 'w-full px-2';

/**
 * Learn's head, in Samply's library look (owner, 2026-11-10): "Learn" large
 * at the top left in the Classroom page's regular-weight title (it opens
 * /learn, the way back from a section), and 16px under it the instruments
 * as small tabs, the one showing on a soft pill. Like Samply's, it scrolls
 * away with the page: the app's toolbar then shows the title. Songs wears
 * it too (owner, 2026-11-11), its own title over its filters in place of
 * the tabs.
 */
export function ExploreNavBar({
  title = 'Learn',
  titleTo = LearnRoutes.root(),
  items = [],
  activeKey,
  children,
}: {
  title?: string;
  titleTo?: string;
  items?: readonly { key: string; label: string; to: string }[];
  activeKey?: string;
  /** What stands under the title in the tabs' place. */
  children?: ReactNode;
}) {
  return (
    <>
      <div
        data-explore-head
        className="flex shrink-0 flex-col gap-[0.909rem] px-2 pb-4"
      >
        <h1 className={OFFICE_PAGE_TITLE}>
          <Link
            to={titleTo}
            className={cn('rounded-lg hover:text-white/85', FOCUS_RING)}
          >
            {title}
          </Link>
        </h1>
        {children ?? (
          <nav
            aria-label={title}
            className="-mx-1 flex items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                aria-current={item.key === activeKey ? 'page' : undefined}
                className={cn(TAB, item.key === activeKey && TAB_ACTIVE)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
