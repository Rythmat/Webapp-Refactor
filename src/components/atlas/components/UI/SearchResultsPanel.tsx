import { useMemo, useState } from 'react';
import { resultToStop } from '@/components/atlas/components/UI/AtlasSearchBar';
import {
  PanelRow,
  SidePanel,
} from '@/components/atlas/components/UI/SidePanel';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import { searchGlobe } from '@/components/atlas/search/globeSearch';

/** Rows per group before "Show all". Keeps a broad query like "jazz" usable. */
const INITIAL_PER_GROUP = 8;

/**
 * The full results of a committed search (`?q=`), grouped the same way as the
 * dropdown. Being its own stop, a search is a step in the trail and a URL —
 * "every Afrobeats moment on the globe" is a link, not something a student has
 * to retype.
 */
export function SearchResultsPanel({ query }: { query: string }) {
  const navigate = useAtlasNavigate();
  const groups = useMemo(() => searchGlobe(query), [query]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const total = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <SidePanel
      subtitle={`${total} result${total === 1 ? '' : 's'} on the globe`}
      title={`“${query}”`}
      onClose={navigate.home}
    >
      {groups.length === 0 ? (
        <p className="p-2 text-sm text-white/60">
          Nothing on the globe matches that yet. Try an artist, a city, a genre,
          or a song title.
        </p>
      ) : (
        groups.map((group) => {
          const open = expanded.has(group.kind);
          const shown = open
            ? group.results
            : group.results.slice(0, INITIAL_PER_GROUP);
          return (
            <section key={group.kind} className="mb-2">
              <h4 className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {group.label} · {group.total}
              </h4>
              <ul className="space-y-0.5">
                {shown.map((result) => {
                  const stop = resultToStop(result);
                  return (
                    <li key={result.id}>
                      <PanelRow
                        presentation={describeStop(stop)}
                        subtitle={result.subtitle}
                        title={result.title}
                        onClick={() => navigate.go(stop)}
                      />
                    </li>
                  );
                })}
              </ul>
              {group.results.length > INITIAL_PER_GROUP && (
                <button
                  className="mt-1 px-2 text-xs text-[#60a5fa] hover:underline"
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (open) next.delete(group.kind);
                      else next.add(group.kind);
                      return next;
                    })
                  }
                >
                  {open
                    ? 'Show fewer'
                    : `Show all ${group.total} ${group.label.toLowerCase()}`}
                </button>
              )}
            </section>
          );
        })
      )}
    </SidePanel>
  );
}
