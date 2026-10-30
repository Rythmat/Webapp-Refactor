import { HeartIcon } from '@/components/icons/HeartIcon';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/components/utilities';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { focusSearch } from './focus';
import { useBrowserStore } from './browserStore';
import {
  GENRES,
  INSTRUMENTS,
  INSTRUMENT_LABEL,
  TYPES,
  TYPE_LABEL,
} from './items';
import { isEmptyQuery, type BrowserQuery, type Facet } from './query';

// ── The Library's search, filters and tag chips (milestone 2.14) ───────────
//
// One search; ♡ and three filter menus, Instrument, Genre and Type, whose
// choices each say how many items they would leave; Clear; then up to six
// tag chips from what is listed. An active filter shows its value on the
// white/10 fill, with a check in its menu (not colour alone).

export type FacetCounts = Record<Facet, Map<string, number>>;

const FACETS: {
  facet: Facet;
  any: string;
  values: readonly string[];
  label(value: string): string;
}[] = [
  {
    facet: 'instrument',
    any: 'Any instrument',
    values: INSTRUMENTS,
    label: (v) => INSTRUMENT_LABEL[v as keyof typeof INSTRUMENT_LABEL] ?? v,
  },
  { facet: 'genre', any: 'Any genre', values: GENRES, label: (v) => v },
  {
    facet: 'type',
    any: 'Any type',
    values: TYPES,
    label: (v) => TYPE_LABEL[v as keyof typeof TYPE_LABEL] ?? v,
  },
];

const FACET_NAME: Record<Facet, string> = {
  instrument: 'Instrument',
  genre: 'Genre',
  type: 'Type',
};

export function BrowserSearch() {
  const text = useBrowserStore((s) => s.query.text);
  const setQuery = useBrowserStore((s) => s.setQuery);
  return (
    <label
      className={cn(
        'flex h-8 items-center gap-2 rounded-[var(--daw-radius-sm)] border border-daw-outline px-2 text-daw-text-3 focus-within:border-daw-text-2 [&_svg]:size-4',
        TRANSITION,
      )}
    >
      <Search aria-hidden />
      <input
        type="search"
        data-testid="library-search"
        aria-label="Search the library"
        placeholder="Search parts, grooves, kits and sounds"
        value={text}
        onChange={(e) => setQuery({ text: e.target.value })}
        className={cn(
          TYPE_CLASS.body,
          'h-7 min-w-0 flex-1 bg-transparent text-daw-text outline-none placeholder:text-daw-text-3 [&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {text ? (
        <IconButton
          label="Clear the search"
          icon={<X />}
          size="sm"
          data-testid="library-search-clear"
          onClick={() => {
            setQuery({ text: '' });
            focusSearch();
          }}
        />
      ) : null}
    </label>
  );
}

export function BrowserFilters({
  query,
  counts,
  favouriteCount,
}: {
  query: BrowserQuery;
  counts: FacetCounts;
  favouriteCount: number;
}) {
  const setQuery = useBrowserStore((s) => s.setQuery);
  const clearQuery = useBrowserStore((s) => s.clearQuery);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        size="sm"
        variant={query.favouritesOnly ? 'secondary' : 'ghost'}
        data-testid="library-filter-favourites"
        aria-pressed={query.favouritesOnly}
        title="Show only your favorites"
        aria-label={`Favorites only, ${favouriteCount}`}
        className={cn(query.favouritesOnly && 'bg-daw-hover')}
        onClick={() => setQuery({ favouritesOnly: !query.favouritesOnly })}
      >
        <HeartIcon filled={query.favouritesOnly} />
        <span className="tabular-nums">{favouriteCount}</span>
      </Button>
      {FACETS.map(({ facet, any, values, label }) => {
        const value = query[facet];
        const total = [...counts[facet].values()].reduce((a, b) => a + b, 0);
        return (
          <Menu key={facet}>
            <MenuTrigger asChild>
              <Button
                size="sm"
                variant={value ? 'secondary' : 'ghost'}
                data-testid={`library-filter-${facet}`}
                aria-label={
                  value
                    ? `${FACET_NAME[facet]}: ${label(value)}`
                    : FACET_NAME[facet]
                }
                className={cn(value && 'bg-daw-hover')}
              >
                {value ? label(value) : FACET_NAME[facet]}
                <ChevronDown aria-hidden />
              </Button>
            </MenuTrigger>
            <MenuContent align="start" data-testid="library-filter-menu">
              <MenuRadioGroup
                value={value ?? ''}
                onValueChange={(next) =>
                  setQuery({ [facet]: next === '' ? null : next })
                }
              >
                <MenuRadioItem value="" data-value="">
                  <span className="min-w-0 flex-1">{any}</span>
                  <Count n={total} />
                </MenuRadioItem>
                {values.map((v) => {
                  const n = counts[facet].get(v) ?? 0;
                  return (
                    <MenuRadioItem
                      key={v}
                      value={v}
                      data-value={v}
                      disabled={n === 0 && v !== value}
                    >
                      <span className="min-w-0 flex-1">{label(v)}</span>
                      <Count n={n} />
                    </MenuRadioItem>
                  );
                })}
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
        );
      })}
      {isEmptyQuery(query) ? null : (
        <Button
          size="sm"
          variant="quiet"
          data-testid="library-filter-clear"
          onClick={() => {
            clearQuery();
            focusSearch();
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span data-count={n} className="ml-4 tabular-nums text-daw-text-3">
      {n}
    </span>
  );
}

export function BrowserChips({
  tags,
  active,
}: {
  tags: readonly string[];
  active: readonly string[];
}) {
  const setQuery = useBrowserStore((s) => s.setQuery);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Tags">
      {tags.map((tag) => {
        const on = active.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            data-testid="library-chip"
            data-tag={tag}
            aria-pressed={on}
            onClick={() =>
              setQuery({
                tags: on ? active.filter((t) => t !== tag) : [...active, tag],
              })
            }
            className={cn(
              TYPE_CLASS.label,
              'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2.5',
              on
                ? 'bg-daw-hover font-bold text-daw-text underline underline-offset-2'
                : 'bg-daw-chip text-daw-text-2 hover:text-daw-text',
              TRANSITION,
              FOCUS_RING,
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
