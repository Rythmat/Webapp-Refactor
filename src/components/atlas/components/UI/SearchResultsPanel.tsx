import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import {
  PanelRow,
  SidePanel,
} from '@/components/atlas/components/UI/SidePanel';
import {
  AtlasEyebrow,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import {
  useVirtualRows,
  VIRTUALIZE_OVER,
} from '@/components/atlas/hooks/useVirtualRows';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  resultToStop,
  searchGlobe,
  type GlobeResultGroup,
} from '@/components/atlas/search/globeSearch';
import { atlasVar } from '@/components/atlas/theme/tokens';

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
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <SidePanel
      bodyRef={bodyRef}
      subtitle={`${total} result${total === 1 ? '' : 's'} on the globe`}
      title={`“${query}”`}
      onClose={navigate.home}
    >
      {groups.length === 0 ? (
        <p className="p-2 text-sm text-atlas-text-2">
          Nothing on the globe matches that yet. Try an artist, a city, a genre,
          or a song title.
        </p>
      ) : (
        groups.map((group) => (
          <ResultGroup
            key={group.kind}
            group={group}
            open={expanded.has(group.kind)}
            scrollRef={bodyRef}
            onToggle={() =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(group.kind)) next.delete(group.kind);
                else next.add(group.kind);
                return next;
              })
            }
          />
        ))
      )}
    </SidePanel>
  );
}

/**
 * One kind of result. "Show all" on a broad query can list hundreds, so an
 * open group longer than VIRTUALIZE_OVER renders only the rows in view.
 */
function ResultGroup({
  group,
  open,
  scrollRef,
  onToggle,
}: {
  group: GlobeResultGroup;
  open: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  onToggle: () => void;
}) {
  const navigate = useAtlasNavigate();
  const listRef = useRef<HTMLUListElement>(null);
  const shown = useMemo(
    () => (open ? group.results : group.results.slice(0, INITIAL_PER_GROUP)),
    [group, open],
  );
  const itemKey = useCallback((i: number) => shown[i]?.id ?? i, [shown]);
  const list = useVirtualRows({
    count: shown.length,
    enabled: shown.length > VIRTUALIZE_OVER,
    scrollRef,
    listRef,
    estimateSize: 61,
    gap: 2,
    getItemKey: itemKey,
  });

  return (
    <section className="mb-2">
      <AtlasEyebrow
        as="h4"
        className="px-2 pb-1 pt-2"
        dot={atlasVar(group.kind)}
      >
        {group.label} · {group.total}
      </AtlasEyebrow>
      <ul
        ref={listRef}
        className={list.virtual ? 'relative' : 'space-y-0.5'}
        style={list.virtual ? { height: list.totalSize } : undefined}
        {...list.listProps}
      >
        {list.rows.map(({ index, top }) => {
          const result = shown[index];
          const stop = resultToStop(result);
          return (
            <li
              key={result.id}
              ref={list.measureElement}
              data-index={index}
              style={
                list.virtual
                  ? {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${top}px)`,
                    }
                  : undefined
              }
            >
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
        <AtlasPillButton className="ml-2 mt-1" size="sm" onClick={onToggle}>
          {open
            ? 'Show fewer'
            : `Show all ${group.total} ${group.label.toLowerCase()}`}
        </AtlasPillButton>
      )}
    </section>
  );
}
