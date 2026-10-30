import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  Compass,
  CornerDownLeft,
  Eraser,
  Layers,
  Link2,
  Orbit,
  Pause,
  Play,
  Search,
  type LucideIcon,
} from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_NO_EXIT_ANIMATION,
  ATLAS_POPOVER,
  AtlasEyebrow,
} from '@/components/atlas/components/UI/primitives';
import { guidesData } from '@/components/atlas/data/loaders';
import { useLazyResource } from '@/components/atlas/hooks/useLazyResource';
import { useAtlasPortal } from '@/components/atlas/layout/portalRoot';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';
import type { TrailEntry } from '@/components/atlas/navigation/useAtlasTrail';
import { resultToStop } from '@/components/atlas/search/globeSearch';
import {
  buildPalette,
  paletteItems,
  recentStops,
  type PaletteCommand,
  type PaletteItem,
} from '@/components/atlas/search/paletteModel';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { atlasVar } from '@/components/atlas/theme/tokens';
import { cn } from '@/lib/utils';

export interface AtlasCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the palette opens with: the search on screen, if any. */
  initialQuery: string;
  /** Where focus goes back to when the palette closes. */
  opener: RefObject<HTMLElement | null>;
  /** The toolbar's trail, so Recent and Clear act on the same one. */
  trail: {
    entries: TrailEntry[];
    cursorPos: number;
    jump: (entry: TrailEntry) => void;
    clear: () => void;
  };
  /** The toolbar's Copy link, which also says "Link copied". */
  onCopyLink: () => void;
}

/** An action's glyph, in the thumbnail's place. */
const ACTION_ICONS: Record<string, LucideIcon> = {
  spin: Play,
  'stop-spin': Pause,
  'copy-link': Link2,
  'clear-trail': Eraser,
  layers: Layers,
  connections: Orbit,
};

function itemStop(item: PaletteItem) {
  switch (item.type) {
    case 'result':
      return resultToStop(item.result);
    case 'recent':
      return item.entry.stop;
    case 'pathway':
      return { kind: 'pathway' as const, pathwayId: item.pathwayId };
    case 'tour':
      return { kind: 'tour' as const, tourId: item.tourId };
    default:
      return null;
  }
}

/** One row: a thumbnail (or a glyph), a name and a secondary line. */
function PaletteRow({
  item,
  onSelect,
}: {
  item: PaletteItem;
  onSelect: (item: PaletteItem) => void;
}) {
  const stop = itemStop(item);
  const presentation = stop ? describeStop(stop) : null;

  let title: string;
  let subtitle: string | undefined;
  let leading;
  if (item.type === 'see-all') {
    title = `See all ${item.total} results for “${item.query}”`;
    leading = (
      <span className="flex aspect-video w-full items-center justify-center rounded-lg bg-white/[0.06]">
        <Search aria-hidden className="size-4 text-atlas-text-2" />
      </span>
    );
  } else if (item.type === 'action') {
    const Icon = ACTION_ICONS[item.command.id] ?? Compass;
    title = item.command.title;
    subtitle = item.command.subtitle;
    leading = (
      <span className="flex aspect-video w-full items-center justify-center rounded-lg bg-white/[0.06]">
        <Icon aria-hidden className="size-4 text-atlas-text" />
      </span>
    );
  } else {
    title =
      item.type === 'result'
        ? item.result.title
        : item.type === 'recent'
          ? (presentation?.title ?? '')
          : item.title;
    subtitle =
      item.type === 'result'
        ? item.result.subtitle
        : item.type === 'recent'
          ? presentation?.subtitle
          : item.subtitle;
    leading = presentation && <StopThumb presentation={presentation} />;
  }

  return (
    <Command.Item
      className="group flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left data-[selected=true]:bg-white/[0.08]"
      value={item.id}
      onSelect={() => onSelect(item)}
    >
      <span className="w-14 shrink-0">{leading}</span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm',
            item.type === 'see-all'
              ? 'font-bold text-atlas-text'
              : 'text-atlas-text',
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-atlas-text-2">
            {subtitle}
          </span>
        )}
      </span>
      <CornerDownLeft
        aria-hidden
        className="size-3.5 shrink-0 text-atlas-text-3 opacity-0 group-data-[selected=true]:opacity-100"
      />
    </Command.Item>
  );
}

/**
 * The Globe's command palette, opened with ⌘K / Ctrl+K or the search button
 * in the top bar: one place to find anything on the globe and to do
 * anything the page can do.
 *
 * Typing searches places, artists, history and songs with the same matching
 * and ranking as the old search field (search/globeSearch.ts), and choosing a
 * result opens it exactly as that field did. Below the results, or with
 * nothing typed: where you have just been, the page's actions, and every
 * pathway and guided tour.
 *
 * A modal dialog (Radix): focus is held inside while it is open, Escape or a
 * click outside closes it, and focus goes back to whatever opened it. The
 * list is cmdk's (arrow keys, Home / End, Enter), but the field is our own:
 * cmdk 1.0 sets the field's aria-activedescendant once and never updates it,
 * so a screen reader would not hear the arrow keys move.
 *
 * Loaded on first use (Frame/TopRail), so cmdk is not in the page's first
 * download.
 */
export default function AtlasCommandPalette({
  open,
  onOpenChange,
  initialQuery,
  opener,
  trail,
  onCopyLink,
}: AtlasCommandPaletteProps) {
  const portal = useAtlasPortal();
  const navigate = useAtlasNavigate();
  const dispatch = useAtlasDispatch();
  const globeRotating = useAtlasSelector((s) => s.globeRotating);

  const [query, setQuery] = useState(initialQuery);
  // Each opening starts from the search on screen, or from nothing.
  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  // Deferred so typing stays responsive while ~3,000 entries are scored.
  const deferred = useDeferredValue(query);

  // What to do once the palette has closed and focus is back on the opener:
  // an opened panel then takes focus from there and gives it back on close
  // (layout/usePanelFocus), as it did from the old search field.
  const pending = useRef<(() => void) | null>(null);
  const run = (action: () => void) => {
    pending.current = action;
    onOpenChange(false);
  };

  const canClear = trail.entries.length > 1;
  const actions = useMemo<PaletteCommand[]>(
    () => [
      globeRotating
        ? {
            id: 'stop-spin',
            title: 'Stop the globe spinning',
            keywords: ['spin', 'rotate', 'pause'],
          }
        : {
            id: 'spin',
            title: 'Spin the globe',
            keywords: ['spin', 'rotate', 'turn'],
          },
      {
        id: 'copy-link',
        title: 'Copy link',
        subtitle: 'A link to exactly this view',
        keywords: ['share', 'url', 'bookmark'],
      },
      ...(canClear
        ? [
            {
              id: 'clear-trail',
              title: 'Clear trail',
              subtitle: 'Start a fresh trail from here',
              keywords: ['history', 'reset', 'path'],
            },
          ]
        : []),
      {
        id: 'connections',
        title: 'Go to Connections',
        subtitle: 'The places in a ring, and the links between them',
        keywords: ['ring', 'chord', 'links', 'network', 'connections'],
      },
      {
        id: 'layers',
        title: 'Open Layers',
        subtitle: 'Show or hide cities, arcs, states and colors',
        keywords: ['layers', 'hide', 'show', 'map'],
      },
    ],
    [globeRotating, canClear],
  );

  // Recent tours and pathways take their titles from the on-demand tours,
  // which this chunk already holds (the Actions list names them).
  const guides = useLazyResource(guidesData).status;
  const recent = useMemo(
    () => recentStops(trail.entries, trail.cursorPos),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `guides` re-describes once they load
    [trail.entries, trail.cursorPos, guides],
  );
  const groups = useMemo(
    () => buildPalette(deferred, { recent, actions }),
    [deferred, recent, actions],
  );

  // The highlighted row: the first one whenever the list changes.
  const [selected, setSelected] = useState('');
  useLayoutEffect(() => {
    setSelected(paletteItems(groups)[0]?.id ?? '');
  }, [groups]);

  // The field announces the highlighted row (see the note above).
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>();
  const [listId, setListId] = useState<string>();
  useEffect(() => {
    const list = listRef.current;
    setListId(list?.id);
    const row = Array.from(
      list?.querySelectorAll<HTMLElement>('[cmdk-item]') ?? [],
    ).find((el) => el.getAttribute('data-value') === selected);
    setActiveId(row?.id);
  }, [selected, groups]);

  const actionRuns: Record<string, () => void> = {
    spin: () => dispatch({ type: 'SET_GLOBE_ROTATING', payload: true }),
    'stop-spin': () => dispatch({ type: 'SET_GLOBE_ROTATING', payload: false }),
    'copy-link': onCopyLink,
    'clear-trail': trail.clear,
    layers: () => navigate.setFrame({ panel: 'layers' }),
    connections: () => navigate.toSection('ring'),
  };

  const choose = (item: PaletteItem) => {
    switch (item.type) {
      case 'result':
        return run(() => navigate.go(resultToStop(item.result)));
      case 'see-all':
        return run(() => navigate.toSearch(item.query));
      case 'recent':
        return run(() => trail.jump(item.entry));
      case 'pathway':
        return run(() => navigate.toPathway(item.pathwayId));
      case 'tour':
        return run(() => navigate.toTour(item.tourId));
      case 'action':
        return run(() => actionRuns[item.command.id]?.());
    }
  };

  const typed = deferred.trim();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={portal}>
        {/* A plain dim, no blur: the globe keeps animating under it. */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 bg-black/60',
            ATLAS_Z.popovers,
            ATLAS_NO_EXIT_ANIMATION,
          )}
        />
        <Dialog.Content
          aria-modal="true"
          className={cn(
            ATLAS_POPOVER,
            ATLAS_Z.popovers,
            ATLAS_NO_EXIT_ANIMATION,
            // Phones: full width at the top, clear of the keyboard. Larger
            // screens: centred, a little above the middle.
            'fixed inset-x-2 top-2 flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden focus:outline-none',
            'sm:inset-x-auto sm:left-1/2 sm:top-[12vh] sm:max-h-[min(72vh,600px)] sm:w-[min(640px,calc(100vw-2rem))] sm:-translate-x-1/2',
          )}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const back = opener.current;
            if (back?.isConnected) back.focus({ preventScroll: true });
            const action = pending.current;
            pending.current = null;
            action?.();
          }}
        >
          <Dialog.Title className="sr-only">Search the globe</Dialog.Title>
          <Dialog.Description className="sr-only">
            Find places, artists, history and songs, or run a command. Arrow
            keys move through the list, Enter opens, Escape closes.
          </Dialog.Description>
          <Command
            className="flex min-h-0 flex-1 flex-col"
            loop
            shouldFilter={false}
            value={selected}
            vimBindings={false}
            onValueChange={setSelected}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-atlas-panel-border px-4">
              <Search
                aria-hidden
                className="size-4 shrink-0 text-atlas-text-2"
              />
              <input
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded
                aria-label="Search the globe or run a command"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-atlas-text placeholder:text-atlas-text-3 focus:outline-none sm:text-sm"
                placeholder="Search artists, places, songs, history… or a command"
                role="combobox"
                spellCheck={false}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="hidden shrink-0 rounded-full border border-white/15 px-2 py-0.5 font-sans text-xs text-atlas-text-2 sm:inline">
                Esc
              </kbd>
            </div>
            <Command.List
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
              label="Results and commands"
            >
              <Command.Empty className="px-3 py-6 text-center text-sm text-atlas-text-2">
                Nothing on the globe matches “{typed}”.
              </Command.Empty>
              {groups.map((group) => (
                <Command.Group
                  key={group.id}
                  className="py-1"
                  heading={
                    group.label && (
                      <AtlasEyebrow
                        className="px-2.5 pb-1 pt-1.5"
                        dot={group.kind ? atlasVar(group.kind) : undefined}
                      >
                        {group.label}
                      </AtlasEyebrow>
                    )
                  }
                >
                  {group.items.map((item) => (
                    <PaletteRow key={item.id} item={item} onSelect={choose} />
                  ))}
                </Command.Group>
              ))}
            </Command.List>
            <p className="hidden shrink-0 gap-4 border-t border-atlas-panel-border px-4 py-2 text-xs text-atlas-text-3 sm:flex">
              <span>↑ ↓ to move</span>
              <span>↵ to open</span>
              <span>Esc to close</span>
            </p>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
