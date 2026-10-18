import {
  AudioWaveform,
  Disc3,
  Drum,
  Heart,
  LayoutTemplate,
  Loader2,
  Music,
  Play,
  Plus,
  Square,
} from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { DRAG_MIME, type DragPayload } from '@/daw/data/libraryItems';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { addItemAsTrack, openTemplate } from './addItem';
import { useBrowserStore } from './browserStore';
import type { BrowserItem } from './items';
import type { BrowserType } from './query';

// ── A Library row (milestone 2.14) ─────────────────────────────────────────
//
// ▶ previews · the name over what it is (key, tempo, length and chords for a
// part) · ♡ keeps it · + makes a new track holding it at bar 1. The row
// itself drags onto the timeline (F11): onto a track's lane at a bar, or
// anywhere else for a new track. A template is a name that opens it as a new
// project (never in a shared session), with no ▶ or +.
//
// The buttons name themselves for a screen reader; their hints are plain
// titles, so a list of some 240 rows doesn't mount 720 tooltips.

const TYPE_ICON: Record<BrowserType, ReactNode> = {
  part: <Music />,
  groove: <Disc3 />,
  kit: <Drum />,
  preset: <AudioWaveform />,
  template: <LayoutTemplate />,
};

export interface BrowserRowProps {
  item: BrowserItem;
  meta: string;
  favourite: boolean;
  /** 'loading' | 'playing' while this row's preview is, else null. */
  preview: 'loading' | 'playing' | null;
  /** Why + is off (the track limit), or null. */
  addBlocked: string | null;
  busy: boolean;
  inRoom: boolean;
  onPreview(item: BrowserItem): void;
}

export const BrowserRow = memo(function BrowserRow({
  item,
  meta,
  favourite,
  preview,
  addBlocked,
  busy,
  inRoom,
  onPreview,
}: BrowserRowProps) {
  const toggleFavourite = useStore((s) => s.toggleLibraryFavourite);
  const isTemplate = item.type === 'template';

  const onDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = { kind: 'library-item', itemId: item.id };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
    useBrowserStore.getState().setDragging(item);
  };
  const onDragEnd = () => useBrowserStore.getState().setDragging(null);

  return (
    <li
      data-testid="library-row"
      data-item-id={item.id}
      data-type={item.type}
      draggable={!isTemplate}
      onDragStart={isTemplate ? undefined : onDragStart}
      onDragEnd={isTemplate ? undefined : onDragEnd}
      title={isTemplate ? undefined : `${item.name} · ${meta}`}
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1 hover:bg-daw-hover',
        !isTemplate && 'cursor-grab active:cursor-grabbing',
        TRANSITION,
      )}
    >
      {isTemplate ? (
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center text-daw-text-3 [&_svg]:size-4"
        >
          {TYPE_ICON.template}
        </span>
      ) : (
        <IconButton
          size="sm"
          noTooltip
          data-testid="library-preview"
          data-state={preview ?? 'idle'}
          aria-pressed={preview !== null}
          label={`Preview ${item.name}`}
          title={preview ? 'Stop' : 'Preview'}
          icon={
            preview === 'loading' ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : preview === 'playing' ? (
              <Square />
            ) : (
              <Play />
            )
          }
          onClick={() => onPreview(item)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        {isTemplate ? (
          <button
            type="button"
            data-testid={`library-${item.templateId}`}
            aria-disabled={inRoom || undefined}
            title={
              inRoom
                ? 'Leave the shared session to open a template'
                : 'Opens as a new project; what you have open now is kept, with a Restore'
            }
            onClick={() => {
              if (!inRoom) openTemplate(item.templateId);
            }}
            className={cn(
              TYPE_CLASS.body,
              'min-h-6 min-w-6 self-start rounded-[var(--daw-radius-sm)] text-left font-bold',
              inRoom
                ? 'cursor-not-allowed text-daw-text-3 opacity-60'
                : 'text-daw-text',
              FOCUS_RING,
            )}
          >
            {item.name}
          </button>
        ) : (
          <span
            data-testid="library-row-name"
            className={cn(TYPE_CLASS.body, 'truncate font-bold text-daw-text')}
          >
            {item.name}
          </span>
        )}
        <span
          data-testid="library-row-meta"
          className={cn(TYPE_CLASS.label, 'line-clamp-2 text-daw-text-3')}
        >
          {meta}
        </span>
      </div>
      <IconButton
        size="sm"
        noTooltip
        data-testid="library-favourite"
        aria-pressed={favourite}
        label={`Favourite ${item.name}`}
        title={favourite ? 'Remove from favourites' : 'Add to favourites'}
        icon={<Heart fill={favourite ? 'currentColor' : 'none'} />}
        className={favourite ? 'text-daw-text' : 'text-daw-text-3'}
        onClick={() => toggleFavourite(item.id)}
      />
      {isTemplate ? null : (
        <IconButton
          size="sm"
          noTooltip
          data-testid="library-add"
          aria-disabled={addBlocked !== null || busy || undefined}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
          label={`Add ${item.name} on a new track`}
          title={addBlocked ?? 'New track, at bar 1'}
          icon={
            busy ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Plus />
            )
          }
          onClick={() => {
            if (busy) return;
            // At the limit addItem says so, as addTrack does.
            void addItemAsTrack(item);
          }}
        />
      )}
    </li>
  );
});
