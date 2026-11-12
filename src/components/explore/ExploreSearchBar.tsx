import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';

/**
 * Explore's search, across the top as Suno's is: a wide rounded field that
 * keeps its words in `?q=` (replacing the entry, so Back leaves the page),
 * a beat after the typing stops.
 */
export function ExploreSearchBar({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [text, setText] = useState(q);

  // An address that changes under it (Back, a link) wins.
  useEffect(() => setText(q), [q]);

  useEffect(() => {
    if (text === q) return undefined;
    const timer = setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (text.trim()) next.set('q', text);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <label className={cn('relative flex h-12 w-full items-center', className)}>
      <span className="sr-only">{placeholder}</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 size-[1.125rem] text-white/60"
      />
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'size-full rounded-full bg-[#242427]/85 pl-[2.625rem] pr-10 text-[0.875rem] text-white placeholder:text-white/40 hover:bg-[#28282b] focus:bg-[#28282b] [&::-webkit-search-cancel-button]:hidden',
          TRANSITION,
          FOCUS_RING,
        )}
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          aria-label="Clear search"
          className={cn(
            'absolute right-2.5 grid size-7 place-items-center rounded-full text-daw-text-3 hover:text-white',
            FOCUS_RING,
          )}
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </label>
  );
}
