import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SHELF_ITEM, Shelf } from '@/components/explore/Shelf';
import { cn } from '@/components/utilities';
import { LibraryRoutes, StudioRoutes } from '@/constants/routes';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { homeLibraryCards, toProjectEntries } from '../libraryItems';
import { useLibraryMeta } from '../libraryLocalMeta';
import { useLibraryItems } from '../useLibraryItems';
import { HomeLibraryCard } from './HomeLibraryCard';

// ── Home's Library row (owner, 2026-11-11) ─────────────────────────────────
// Suno's "New Albums" on its home page, for the student's own work: their
// projects (folders of sessions, the albums), then their newest sessions in
// no project, in Suno's row (the app's Shelf: title, See all, arrows). A
// student with nothing yet gets one card that starts a session. Loaded on its
// own (HomeInlet), so the Studio's draft store stays off Home's first load.

const LIMIT = 12;

export function HomeLibraryShelf() {
  const { items, loading } = useLibraryItems();
  const meta = useLibraryMeta();
  const cards = useMemo(
    () =>
      homeLibraryCards(toProjectEntries(meta.projects, items), items, LIMIT),
    [meta.projects, items],
  );

  if (loading && cards.length === 0) return <HomeLibrarySkeleton />;

  return (
    <Shelf
      id="home-library"
      title="Your Library"
      seeAll={LibraryRoutes.root()}
      count={cards.length}
    >
      {cards.length === 0 ? (
        <li className={SHELF_ITEM}>
          <StartSessionCard />
        </li>
      ) : (
        cards.map((card) => (
          <li key={card.key} className={SHELF_ITEM}>
            <HomeLibraryCard card={card} projects={meta.projects} />
          </li>
        ))
      )}
    </Shelf>
  );
}

function StartSessionCard() {
  return (
    <Link
      to={`${StudioRoutes.editor.definition}?new=1`}
      className={cn('group block rounded-[0.909rem]', FOCUS_RING)}
    >
      <div
        className={cn(
          'grid aspect-square place-items-center rounded-[0.909rem] border border-dashed border-white/15 text-white/60 group-hover:border-white/30 group-hover:text-white',
          TRANSITION,
        )}
      >
        <Plus aria-hidden className="size-8" />
      </div>
      <p className="mt-[0.568rem] truncate text-[0.909rem] font-medium leading-5 text-white">
        Start a session
      </p>
      <p className="truncate text-[0.795rem] leading-[1.136rem] text-white/50">
        It shows up here
      </p>
    </Link>
  );
}

/** The row's shape while the Library loads: the title and five covers. */
function HomeLibrarySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your Library"
      className="flex flex-col gap-4"
    >
      <div className="h-6 w-32 animate-pulse rounded bg-white/[0.06]" />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 5 }, (_, n) => (
          <div key={n} className={SHELF_ITEM}>
            <div className="aspect-square animate-pulse rounded-[0.909rem] bg-white/[0.06]" />
            <div className="mt-2.5 h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}
