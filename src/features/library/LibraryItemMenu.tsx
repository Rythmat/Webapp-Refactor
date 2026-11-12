import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FolderMinus,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  ListPlus,
  Pencil,
  Play,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { AppIcons } from '@/components/icons/appIcons';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { useCoverPicker } from './ProjectCoverPicker';
import type { LibraryItem, ProjectEntry } from './libraryItems';
import type { LibraryProject } from './libraryLocalMeta';
import { GENRE_TAGS, STATUS_TAGS, type TagOption } from './libraryTags';
import { playItemOf, type LibraryActions } from './useLibraryActions';

// ── The Library's menus: a "…" and a right-click ───────────────────────────
// Samply's row menus (owner, 2026-11-11): a session's, with what a Studio
// session can do from here, and a project's. Each one list, drawn by
// either Radix menu.

type Parts = {
  Content: ComponentType<{ children: ReactNode; align?: 'start' | 'end' }>;
  Item: ComponentType<{
    children: ReactNode;
    onSelect?: () => void;
    className?: string;
  }>;
  Separator: ComponentType;
  Sub: ComponentType<{ children: ReactNode }>;
  SubTrigger: ComponentType<{ children: ReactNode }>;
  SubContent: ComponentType<{ children: ReactNode }>;
};

const DROPDOWN: Parts = {
  Content: DropdownMenuContent as Parts['Content'],
  Item: ({ className, ...props }) => (
    <DropdownMenuItem {...props} className={cn('gap-2', className)} />
  ),
  Separator: DropdownMenuSeparator as Parts['Separator'],
  Sub: DropdownMenuSub as Parts['Sub'],
  SubTrigger: (props) => (
    <DropdownMenuSubTrigger {...props} className="gap-2" />
  ),
  SubContent: DropdownMenuSubContent as Parts['SubContent'],
};

const CONTEXT: Parts = {
  Content: ContextMenuContent as Parts['Content'],
  Item: ({ className, ...props }) => (
    <ContextMenuItem {...props} className={cn('gap-2', className)} />
  ),
  Separator: ContextMenuSeparator as Parts['Separator'],
  Sub: ContextMenuSub as Parts['Sub'],
  SubTrigger: (props) => <ContextMenuSubTrigger {...props} className="gap-2" />,
  SubContent: ContextMenuSubContent as Parts['SubContent'],
};

const ICON = 'size-4';

/** Where a session's menu is opened: its project's page adds moving it
 *  up and down there. */
export interface InProjectPlace {
  canMoveUp: boolean;
  canMoveDown: boolean;
  move(by: -1 | 1): void;
}

/** A session's menu; put it in a DropdownMenu or a ContextMenu. */
export function LibraryItemMenuContent({
  item,
  actions,
  favorite,
  projects,
  kind,
  place,
}: {
  item: LibraryItem;
  actions: LibraryActions;
  favorite: boolean;
  /** The student's projects, to put it in one. */
  projects: readonly LibraryProject[];
  kind: 'dropdown' | 'context';
  place?: InProjectPlace;
}) {
  const P = kind === 'dropdown' ? DROPDOWN : CONTEXT;
  const saved = item.source.kind === 'cloud';
  const home = projects.find((p) => p.sessions.includes(item.key)) ?? null;
  return (
    <P.Content align="end">
      <P.Item onSelect={() => actions.play(item)}>
        <Play aria-hidden className={ICON} />
        Play
      </P.Item>
      <P.Item onSelect={() => actions.queue(item)}>
        <ListPlus aria-hidden className={ICON} />
        Add to queue
      </P.Item>
      <P.Item onSelect={() => actions.open(item)}>
        <AppIcons.studio aria-hidden className={ICON} />
        Open in Studio
      </P.Item>
      <P.Separator />
      <P.Sub>
        <P.SubTrigger>
          <FolderPlus aria-hidden className={ICON} />
          {home ? 'Move to project' : 'Add to project'}
        </P.SubTrigger>
        <P.SubContent>
          <div className="max-h-72 overflow-y-auto">
            {projects.map((project) => (
              <P.Item
                key={project.id}
                onSelect={() =>
                  project.id !== home?.id &&
                  actions.addToProject(project.id, [item])
                }
              >
                <Check
                  aria-hidden
                  className={
                    project.id === home?.id ? ICON : `${ICON} invisible`
                  }
                />
                <span className="max-w-56 truncate">{project.name}</span>
              </P.Item>
            ))}
          </div>
          {projects.length > 0 && <P.Separator />}
          <P.Item onSelect={() => actions.newProject([item])}>
            <Plus aria-hidden className={ICON} />
            New project…
          </P.Item>
        </P.SubContent>
      </P.Sub>
      {home && (
        <P.Item onSelect={() => actions.removeFromProject(item)}>
          <FolderMinus aria-hidden className={ICON} />
          <span className="max-w-56 truncate">Remove from {home.name}</span>
        </P.Item>
      )}
      {place && (
        <>
          {place.canMoveUp && (
            <P.Item onSelect={() => place.move(-1)}>
              <ArrowUp aria-hidden className={ICON} />
              Move up
            </P.Item>
          )}
          {place.canMoveDown && (
            <P.Item onSelect={() => place.move(1)}>
              <ArrowDown aria-hidden className={ICON} />
              Move down
            </P.Item>
          )}
        </>
      )}
      <P.Separator />
      <P.Item onSelect={() => actions.copyLink(item)}>
        <Link2 aria-hidden className={ICON} />
        Copy link
      </P.Item>
      <P.Item onSelect={() => actions.favorite(item)}>
        <Star
          aria-hidden
          className={ICON}
          fill={favorite ? 'currentColor' : 'none'}
        />
        {favorite ? 'Unfavorite' : 'Favorite'}
      </P.Item>
      {saved && (
        <>
          <TagSub
            P={P}
            label="Genre"
            options={GENRE_TAGS}
            value={item.genre}
            onPick={(value) => actions.setMeta(item, { libraryGenre: value })}
          />
          <TagSub
            P={P}
            label="Status"
            options={STATUS_TAGS}
            value={item.status}
            onPick={(value) => actions.setMeta(item, { libraryStatus: value })}
          />
        </>
      )}
      <P.Item onSelect={() => actions.download(playItemOf(item))}>
        <Download aria-hidden className={ICON} />
        Download WAV
      </P.Item>
      {item.canDelete && (
        <>
          <P.Separator />
          <P.Item
            onSelect={() => actions.remove(item)}
            className="text-red-300 focus:text-red-200"
          >
            <Trash2 aria-hidden className={ICON} />
            Delete…
          </P.Item>
        </>
      )}
    </P.Content>
  );
}

/** A project's menu; put it in a DropdownMenu or a ContextMenu. */
export function ProjectMenuContent({
  entry,
  actions,
  favorite,
  kind,
}: {
  entry: ProjectEntry;
  actions: LibraryActions;
  favorite: boolean;
  kind: 'dropdown' | 'context';
}) {
  const P = kind === 'dropdown' ? DROPDOWN : CONTEXT;
  const empty = entry.sessions.length === 0;
  return (
    <P.Content align="end">
      {!empty && (
        <>
          <P.Item onSelect={() => actions.playProject(entry)}>
            <Play aria-hidden className={ICON} />
            Play all
          </P.Item>
          <P.Item onSelect={() => actions.queueProject(entry)}>
            <ListPlus aria-hidden className={ICON} />
            Add to queue
          </P.Item>
          <P.Separator />
        </>
      )}
      <P.Item onSelect={() => actions.renameProject(entry)}>
        <Pencil aria-hidden className={ICON} />
        Rename
      </P.Item>
      <P.Item onSelect={() => useCoverPicker.getState().open(entry.project.id)}>
        <ImageIcon aria-hidden className={ICON} />
        Choose image…
      </P.Item>
      <P.Item onSelect={() => actions.copyProjectLink(entry)}>
        <Link2 aria-hidden className={ICON} />
        Copy link
      </P.Item>
      <P.Item onSelect={() => actions.favorite({ key: entry.key })}>
        <Star
          aria-hidden
          className={ICON}
          fill={favorite ? 'currentColor' : 'none'}
        />
        {favorite ? 'Unfavorite' : 'Favorite'}
      </P.Item>
      <P.Separator />
      <P.Item
        onSelect={() => actions.deleteProject(entry)}
        className="text-red-300 focus:text-red-200"
      >
        <Trash2 aria-hidden className={ICON} />
        Delete project…
      </P.Item>
    </P.Content>
  );
}

function TagSub({
  P,
  label,
  options,
  value,
  onPick,
}: {
  P: Parts;
  label: string;
  options: readonly TagOption[];
  value: string | null;
  onPick: (value: string | null) => void;
}) {
  return (
    <P.Sub>
      <P.SubTrigger>
        <span className={ICON} aria-hidden />
        {label}
      </P.SubTrigger>
      <P.SubContent>
        <div className="max-h-72 overflow-y-auto">
          <P.Item onSelect={() => onPick(null)}>
            <Check
              aria-hidden
              className={value === null ? ICON : `${ICON} invisible`}
            />
            None
          </P.Item>
          {options.map((option) => (
            <P.Item key={option.value} onSelect={() => onPick(option.value)}>
              <Check
                aria-hidden
                className={value === option.value ? ICON : `${ICON} invisible`}
              />
              {option.label}
            </P.Item>
          ))}
        </div>
      </P.SubContent>
    </P.Sub>
  );
}
