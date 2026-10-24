import { Search } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { ResultThumb } from '@/features/search/ResultThumb';
import type { SearchResult } from '@/features/search/types';
import { useGlobalSearch } from '@/features/search/useGlobalSearch';

/** How many results the list holds. */
const MAX_RESULTS = 8;
/** The list's clearance above the element it stops at, in CSS px. */
const STOP_GAP = 12;
/**
 * The list never gets shorter than one row, in CSS px; it scrolls within
 * whatever room it has, so on a short, narrow screen it stays clear.
 */
const MIN_LIST = 64;
/** The clearance kept from the element to the left (the prompt box). */
const AVOID_GAP = 16;
/** Less room than this beside the prompt box, and the list goes above it. */
const MIN_WIDTH = 200;

interface Row extends SearchResult {
  /** Its category's name ("Songs", "Artists", …), shown under the title. */
  group: string;
}

/**
 * Home's search, after Suno's (Discover, top right): a frosted pill in the
 * page's top-right corner, with the field inside it, which widens while it
 * has focus. As you type, a small list drops down under it, filtered across
 * everything Search knows (useGlobalSearch: songs, artists, courses, theory,
 * the globe, the arcade, pages, your classrooms), the best few first. A
 * result opens its own page; there is no results page (owner, 2026-10-24).
 * A combobox: ↑/↓ move through the list, Enter opens the highlighted
 * result, Escape clears the field (closing the list) and then leaves it,
 * and leaving the pill closes the list.
 *
 * `stopAtId` names the element the list must end above (Home: the Studio /
 * Projects columns): the list is never taller than the room down to it, and
 * scrolls within itself when the results don't fit. `avoidId` names the
 * element to its left that neither may cover (Home: the prompt box): the
 * expanded pill, and the list with it, are never wider than the room from
 * that element's right edge to the pill's own; where that room is too
 * narrow, the list ends above that element instead.
 */
export const HomeSearchPill = ({
  stopAtId,
  avoidId,
}: {
  stopAtId?: string;
  avoidId?: string;
}) => {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<number>();

  const { groups, hasQuery } = useGlobalSearch(query);

  // Best first: each category's top hit, then each one's second, and so on,
  // so one category can't fill the list.
  const rows = useMemo<Row[]>(() => {
    if (!hasQuery) return [];
    const out: Row[] = [];
    const deepest = Math.max(0, ...groups.map((g) => g.results.length));
    for (let i = 0; i < deepest && out.length < MAX_RESULTS; i++) {
      for (const g of groups) {
        const r = g.results[i];
        if (r && out.length < MAX_RESULTS) out.push({ ...r, group: g.label });
      }
    }
    return out;
  }, [groups, hasQuery]);

  const showList = open && hasQuery;
  const current = Math.min(active, Math.max(0, rows.length - 1));

  // Where the pill and list may reach (both scroll with the page, so this
  // changes only with the layout: measured on focus, on opening and on
  // resize). Beside the prompt box, when there's room: no wider than the
  // room right of it, the list down to the columns. Too narrow for that:
  // full width, the list stopping above the prompt box instead.
  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const avoid = avoidId ? document.getElementById(avoidId) : null;
      const stop = stopAtId ? document.getElementById(stopAtId) : null;
      const roomX = avoid
        ? wrap.getBoundingClientRect().right -
          avoid.getBoundingClientRect().right -
          AVOID_GAP
        : Infinity;
      const beside = roomX >= MIN_WIDTH;
      setMaxWidth(beside && Number.isFinite(roomX) ? roomX : undefined);
      const panel = panelRef.current;
      const floor = beside ? stop : avoid;
      if (!panel || !floor) return;
      const roomY =
        floor.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        STOP_GAP;
      setMaxHeight(Math.max(MIN_LIST, roomY));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, showList, stopAtId, avoidId]);

  // Keep the highlighted row in view as the arrows move past the fold.
  useEffect(() => {
    if (!showList) return;
    document
      .getElementById(`${listId}-${current}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [showList, current, listId]);

  const choose = (row: Row) => {
    setOpen(false);
    setQuery('');
    navigate(row.to);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!rows.length) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + rows.length) % rows.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (showList && rows[current]) choose(rows[current]);
    } else if (event.key === 'Escape') {
      // Ours, not the browser's (Chrome clears a search field on Escape;
      // others don't): typed text clears, which closes the list; an empty
      // field lets go.
      event.preventDefault();
      if (query) setQuery('');
      else event.currentTarget.blur();
    }
  };

  // Focus leaving the pill and its list closes the list.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ maxWidth }}
      onBlur={onBlur}
    >
      <div
        role="search"
        className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-white backdrop-blur-md transition-colors duration-150 focus-within:border-white/20 hover:bg-white/[0.14]"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <input
          type="search"
          role="combobox"
          aria-label="Search Music Atlas"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && rows[current] ? `${listId}-${current}` : undefined
          }
          placeholder="Search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-16 min-w-0 border-none bg-transparent text-[0.9375rem] leading-6 text-white outline-none transition-[width] duration-200 ease-out placeholder:text-white/50 focus:w-60 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      {showList && (
        // The prompt box's glass (PROMPT_FRAME: 20px corners, hairline edge,
        // soft shadow) on the pill's white/10, frosted hard so it reads over
        // the cards; exactly as wide as the expanded pill.
        <div
          ref={panelRef}
          style={{ maxHeight }}
          className="absolute inset-x-0 top-full mt-2 overflow-y-auto overscroll-contain rounded-[1.25rem] border border-white/10 bg-white/10 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.36)] backdrop-blur-xl [scrollbar-width:thin]"
        >
          {rows.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-white/55">
              No matches for “{query.trim()}”
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results">
              {rows.map((row, i) => (
                <li
                  key={row.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                >
                  <Link
                    to={row.to}
                    tabIndex={-1}
                    // Keep the field focused, so the click lands before the
                    // list closes on blur.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(row);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-1.5 outline-none transition-colors duration-100',
                      i === current && 'bg-white/[0.08]',
                    )}
                  >
                    <ResultThumb result={row} size={48} square />
                    <span className="min-w-0">
                      <span className="block truncate text-sm leading-5 text-white">
                        {row.title}
                      </span>
                      <span className="block truncate text-xs leading-4 text-white/50">
                        {row.subtitle
                          ? `${row.group} · ${row.subtitle}`
                          : row.group}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
