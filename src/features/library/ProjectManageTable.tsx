import { ChevronDown, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CAPTION } from '@/components/kit/libraryLook';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { relativeWhen } from '@/daw/shell/projects/projectRows';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { LibraryItemMenuContent } from './LibraryItemMenu';
import { LibraryPlayButton } from './LibraryPlayButton';
import type { LibraryItem, ProjectEntry } from './libraryItems';
import type { LibraryProject } from './libraryLocalMeta';
import { moveInProject } from './libraryProjects';
import {
  GENRE_TAGS,
  STATUS_TAGS,
  tagLabel,
  type TagOption,
} from './libraryTags';
import { artSeedOf, studioHrefOf, type PlayItem } from './libraryTypes';
import { ProjectCover } from './player/PlayerParts';
import type { LibraryActions } from './useLibraryActions';

// ── A project's Manage view: its sessions as a table (owner, 2026-11-11) ───
// Samply's Manage, audited (Name, Duration, Sample rate, LUFS, Last
// updated, Kind, with the columns to pick): here what a Studio session
// has, where it is kept, its tempo and tracks, its genre and status (set
// in place on a saved session, patchMeta), and when it was made and last
// changed. Each row plays (on through the project) and keeps its menu.

type Column =
  | 'kept'
  | 'bpm'
  | 'tracks'
  | 'genre'
  | 'status'
  | 'updated'
  | 'created';

const COLUMNS: readonly { id: Column; label: string }[] = [
  { id: 'kept', label: 'Kept' },
  { id: 'bpm', label: 'BPM' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'genre', label: 'Genre' },
  { id: 'status', label: 'Status' },
  { id: 'updated', label: 'Last updated' },
  { id: 'created', label: 'Created' },
];

const SHOWN_AT_FIRST: readonly Column[] = [
  'kept',
  'bpm',
  'tracks',
  'genre',
  'status',
  'updated',
];

function kept(item: LibraryItem): string {
  if (!item.saved) return 'On this device';
  return item.editedOnDevice ? 'Edited here' : 'Saved';
}

export function ProjectManageTable({
  entry,
  projects,
  actions,
  favorites,
  queue,
  now,
}: {
  entry: ProjectEntry;
  projects: readonly LibraryProject[];
  actions: LibraryActions;
  favorites: ReadonlySet<string>;
  queue: readonly PlayItem[];
  now: number;
}) {
  const [shown, setShown] = useState<ReadonlySet<Column>>(
    () => new Set(SHOWN_AT_FIRST),
  );
  const columns = COLUMNS.filter((c) => shown.has(c.id));
  const count = entry.sessions.length;

  const cell = (item: LibraryItem, column: Column) => {
    switch (column) {
      case 'kept':
        return kept(item);
      case 'bpm':
        return item.bpm ? String(item.bpm) : '—';
      case 'tracks':
        return item.trackCount !== null ? String(item.trackCount) : '—';
      case 'genre':
        return (
          <TagCell
            item={item}
            options={GENRE_TAGS}
            value={item.genre}
            onPick={(v) => actions.setMeta(item, { libraryGenre: v })}
          />
        );
      case 'status':
        return (
          <TagCell
            item={item}
            options={STATUS_TAGS}
            value={item.status}
            onPick={(v) => actions.setMeta(item, { libraryStatus: v })}
          />
        );
      case 'updated':
        return item.updatedAt ? relativeWhen(item.updatedAt, now) : '—';
      case 'created':
        return item.createdAt ? relativeWhen(item.createdAt, now) : '—';
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full min-w-[40rem] text-left text-[0.795rem]">
        <thead className="bg-white/[0.04] text-[0.75rem] text-white/50">
          <tr>
            <th className="w-10 px-3 py-2 font-normal">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Choose columns"
                  title="Columns"
                  className={cn(
                    'grid size-6 place-items-center rounded-md hover:bg-white/[0.08] hover:text-white',
                    FOCUS_RING,
                  )}
                >
                  <SlidersHorizontal aria-hidden className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel className="text-[0.75rem] font-normal text-white/50">
                    Columns
                  </DropdownMenuLabel>
                  {COLUMNS.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={shown.has(c.id)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(on) =>
                        setShown((prev) => {
                          const next = new Set(prev);
                          if (on) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        })
                      }
                    >
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </th>
            <th className="px-3 py-2 font-normal">Name</th>
            {columns.map((c) => (
              <th
                key={c.id}
                className="whitespace-nowrap px-3 py-2 font-normal"
              >
                {c.label}
              </th>
            ))}
            <th className="w-20 px-3 py-2" aria-label="Play and more" />
          </tr>
        </thead>
        <tbody>
          {entry.sessions.map((item, n) => (
            <tr
              key={item.key}
              className="border-t border-white/[0.04] even:bg-white/[0.02]"
            >
              <td className="px-3 py-2 tabular-nums text-white/40">{n + 1}</td>
              <td className="max-w-64 px-3 py-2">
                <Link
                  to={studioHrefOf(item.source)}
                  className={cn(
                    'flex min-w-0 items-center gap-2.5 rounded text-white hover:underline',
                    FOCUS_RING,
                  )}
                >
                  <span className="size-7 shrink-0 overflow-hidden rounded ring-1 ring-inset ring-white/[0.08]">
                    <ProjectCover seed={artSeedOf(item.source)} />
                  </span>
                  <span className="truncate">{item.name}</span>
                </Link>
              </td>
              {columns.map((c) => (
                <td
                  key={c.id}
                  className="whitespace-nowrap px-3 py-2 tabular-nums text-white/60"
                >
                  {cell(item, c.id)}
                </td>
              ))}
              <td className="px-3 py-1.5">
                <div className="flex items-center justify-end gap-1">
                  <LibraryPlayButton item={queue[n]} queue={queue} size="sm" />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`More for ${item.name}`}
                      className={cn(
                        'grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/[0.08] hover:text-white',
                        TRANSITION,
                        FOCUS_RING,
                      )}
                    >
                      <MoreHorizontal aria-hidden className="size-4" />
                    </DropdownMenuTrigger>
                    <LibraryItemMenuContent
                      item={item}
                      actions={actions}
                      favorite={favorites.has(item.key)}
                      projects={projects}
                      place={{
                        canMoveUp: n > 0,
                        canMoveDown: n < count - 1,
                        move: (by) =>
                          moveInProject(entry.project.id, item.key, by),
                      }}
                      kind="dropdown"
                    />
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A genre or status: set in place on a saved session; a dash on one only
 *  on this device (the account keeps the tags). */
function TagCell({
  item,
  options,
  value,
  onPick,
}: {
  item: LibraryItem;
  options: readonly TagOption[];
  value: string | null;
  onPick: (value: string | null) => void;
}) {
  const label = tagLabel(options, value);
  if (!item.saved) {
    return (
      <span className={CAPTION} title="Save it to your account to tag it">
        —
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-white/[0.08] hover:text-white',
          label ? 'text-white/80' : 'text-white/35',
          FOCUS_RING,
        )}
      >
        {label ?? 'Add'}
        <ChevronDown aria-hidden className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onPick(null)}>None</DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => onPick(o.value)}
            className={o.value === value ? 'font-semibold' : undefined}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
