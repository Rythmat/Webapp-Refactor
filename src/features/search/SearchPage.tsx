import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import type { SearchResult } from './types';
import { useGlobalSearch } from './useGlobalSearch';

/** Debounce a rapidly-changing value (keystrokes) to a settled value. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * `/search` — dedicated global content search. Reads/writes `?q=` so results are
 * deep-linkable, matches all app content via {@link useGlobalSearch}, and lets
 * users jump to any hit (click, or ↑/↓ + Enter).
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [input, setInput] = useState(() => searchParams.get('q') ?? '');
  const debounced = useDebouncedValue(input, 200);

  // Mirror the settled query into the URL (replace — no history spam).
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (debounced === current) return;
    const next = new URLSearchParams(searchParams);
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // Only re-run when the debounced query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { groups, hasQuery } = useGlobalSearch(debounced);

  // Flattened result list for keyboard navigation.
  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [debounced]);

  // Autofocus the input on mount (SearchInput renders a plain <input>).
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current?.querySelector('input')?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!flat.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flat.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
      } else if (e.key === 'Enter') {
        const target = flat[activeIndex];
        if (target) {
          e.preventDefault();
          navigate(target.to);
        }
      }
    },
    [flat, activeIndex, navigate],
  );

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-6 text-white md:gap-8 md:px-10 md:py-10"
    >
      <div>
        <h1 className="mb-4 text-3xl font-semibold">Search</h1>
        <SearchInput
          value={input}
          onChange={setInput}
          onClear={() => setInput('')}
          placeholder="Search songs, courses, theory, the globe, your classrooms…"
        />
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <section key={group.category}>
                <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-white/40">
                  <GroupIcon className="h-4 w-4" />
                  <span>{group.label}</span>
                  <span className="text-white/25">{group.total}</span>
                </div>

                {group.loading && group.results.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {group.results.map((result) => (
                      <ResultRow
                        key={result.id}
                        result={result}
                        active={flat[activeIndex] === result}
                        onHover={() => setActiveIndex(flat.indexOf(result))}
                      />
                    ))}
                  </ul>
                )}

                {group.seeAllTo && group.total > group.results.length && (
                  <Link
                    to={group.seeAllTo}
                    className="mt-2 inline-block text-xs text-white/50 transition-colors hover:text-white/80"
                  >
                    See all {group.total} &rarr;
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      ) : hasQuery ? (
        <p className="text-sm text-white/50">
          No results for &ldquo;{debounced}&rdquo;.
        </p>
      ) : null}
    </div>
  );
}

const THUMB_SIZE = 48;

/**
 * Row thumbnail. Prefers an image (artist portrait, learn hex tile, or globe
 * video still), falls back to a generative HexAvatar (songs/artists), then to
 * the category icon.
 */
function ResultThumb({ result }: { result: SearchResult }) {
  const [broken, setBroken] = useState(false);
  const thumb = result.thumb;

  if (thumb?.src && !broken) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          thumb.shape === 'circle' && 'rounded-full bg-white/[0.04]',
          thumb.shape === 'rounded' && 'rounded-lg bg-white/[0.04]',
        )}
        style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
      >
        <img
          src={thumb.src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className={cn(
            'h-full w-full',
            thumb.shape === 'hex' ? 'object-contain' : 'object-cover',
          )}
        />
      </div>
    );
  }

  if (thumb?.avatarSeed) {
    return (
      <HexAvatarSVG
        config={defaultAvatarConfig(thumb.avatarSeed)}
        size={THUMB_SIZE}
        className="shrink-0 rounded-full"
      />
    );
  }

  const RowIcon = result.icon;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-white/[0.05]"
      style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
    >
      <RowIcon className="h-5 w-5 text-white/55" />
    </div>
  );
}

function ResultRow({
  result,
  active,
  onHover,
}: {
  result: SearchResult;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <li>
      <Link
        to={result.to}
        onMouseEnter={onHover}
        className={cn(
          'flex items-center gap-4 rounded-xl px-3 py-2 outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-white/40',
          active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]',
        )}
      >
        <ResultThumb result={result} />
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-white">
            {result.title}
          </div>
          {result.subtitle && (
            <div className="truncate text-sm text-white/50">
              {result.subtitle}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
