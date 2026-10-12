import { CornerDownLeft, Search, X } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_FOCUS,
  ATLAS_POPOVER,
  AtlasEyebrow,
} from '@/components/atlas/components/UI/primitives';
import type { AtlasStop } from '@/components/atlas/navigation/atlasStop';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import {
  useAtlasNavigate,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  searchGlobe,
  type GlobeResult,
} from '@/components/atlas/search/globeSearch';
import { atlasVar } from '@/components/atlas/theme/tokens';

/** How many rows each group shows in the dropdown before "See all". */
const PER_GROUP = 4;

/** The stop a result opens. Shared with the full results panel. */
export function resultToStop(result: GlobeResult): AtlasStop {
  switch (result.kind) {
    case 'artist':
      return { kind: 'artist', artist: result.artist.name };
    case 'place':
      return { kind: 'place', place: result.place };
    case 'event':
    case 'song':
      return { kind: 'event', eventId: result.event.id };
  }
}

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The globe's search field — always on screen, so nobody has to know it
 * exists to find it. ⌘K (Ctrl+K) jumps to it from anywhere on the globe.
 *
 * Results appear as you type, grouped into Artists, Places, History, and
 * Songs; arrow keys move through them and Enter opens one. Enter with nothing
 * highlighted opens the full results panel, which — like every other view —
 * is its own URL.
 */
export function AtlasSearchBar() {
  const navigate = useAtlasNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Show the committed query while its results panel is up.
  const committed = useAtlasStopSelector((stop) =>
    stop.kind === 'search' ? stop.query : null,
  );
  useEffect(() => {
    if (committed !== null) setQuery(committed);
  }, [committed]);

  // Deferred so typing stays responsive while ~3,000 entries are scored.
  const deferred = useDeferredValue(query);
  const groups = useMemo(() => searchGlobe(deferred, PER_GROUP), [deferred]);
  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups]);
  const total = groups.reduce((sum, g) => sum + g.total, 0);

  useEffect(() => setActive(-1), [deferred]);

  // ⌘K / Ctrl+K from anywhere on the globe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close when focus or a click lands outside.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const choose = (result: GlobeResult) => {
    navigate.go(resultToStop(result));
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const commit = () => {
    const q = query.trim();
    if (q.length < 2) return;
    navigate.toSearch(q);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && flat[active]) choose(flat[active]);
      else commit();
    } else if (e.key === 'Escape') {
      if (open) setOpen(false);
      else inputRef.current?.blur();
    }
  };

  const showDropdown = open && deferred.trim().length >= 2;
  let rowIndex = -1;

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-atlas-text-2"
        />
        <input
          ref={inputRef}
          aria-activedescendant={
            active >= 0 ? `${listboxId}-${active}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          aria-label="Search the globe"
          autoComplete="off"
          className="w-full rounded-full border border-white/15 bg-white/[0.04] py-2 pl-9 pr-16 text-sm text-atlas-text transition-colors placeholder:text-atlas-text-2 focus:border-atlas-focus/60 focus:outline-none focus:ring-1 focus:ring-atlas-focus"
          placeholder="Search artists, places, songs, history…"
          role="combobox"
          spellCheck={false}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query ? (
            <button
              aria-label="Clear search"
              className={`rounded-full p-1 text-atlas-text-2 transition-colors hover:text-atlas-text ${ATLAS_FOCUS}`}
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : (
            <kbd className="rounded-full border border-white/15 px-2 py-0.5 font-sans text-xs text-atlas-text-2">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          )}
        </div>
      </div>

      {showDropdown && (
        <div
          className={`absolute inset-x-0 top-full z-[1100] mt-1.5 max-h-[min(70vh,560px)] overflow-y-auto py-1.5 ${ATLAS_POPOVER}`}
          id={listboxId}
          role="listbox"
        >
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-sm text-atlas-text-2">
              Nothing on the globe matches “{deferred.trim()}”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.kind} className="py-1" role="presentation">
                <AtlasEyebrow
                  as="p"
                  className="px-3 pb-1 pt-1.5"
                  dot={atlasVar(group.kind)}
                >
                  {group.label}
                  {group.total > group.results.length && (
                    <span className="font-normal normal-case tracking-normal">
                      · {group.total}
                    </span>
                  )}
                </AtlasEyebrow>
                {group.results.map((result) => {
                  rowIndex += 1;
                  const index = rowIndex;
                  const presentation = describeStop(resultToStop(result));
                  return (
                    <button
                      key={result.id}
                      aria-selected={index === active}
                      className={`flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors ${
                        index === active
                          ? 'bg-white/[0.08]'
                          : 'hover:bg-white/[0.04]'
                      }`}
                      id={`${listboxId}-${index}`}
                      role="option"
                      tabIndex={-1}
                      type="button"
                      onClick={() => choose(result)}
                      onMouseEnter={() => setActive(index)}
                    >
                      <span className="w-14 shrink-0">
                        <StopThumb presentation={presentation} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-atlas-text">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-atlas-text-2">
                          {result.subtitle}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}

          {total > 0 && (
            <button
              className="mt-1 flex w-full items-center justify-between border-t border-atlas-panel-border px-3 py-2 text-left text-sm text-atlas-accent transition-colors hover:bg-white/[0.04]"
              type="button"
              onClick={commit}
            >
              <span>
                See all {total} results for “{deferred.trim()}”
              </span>
              <CornerDownLeft aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
