import {
  AudioWaveform,
  Download,
  FileAudio,
  Heart,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import { DRAG_MIME, type DragPayload } from '@/daw/data/libraryItems';
import {
  deleteLibraryAudio,
  getLibraryAudio,
  setLibraryAudioFavorite,
  type LibraryAudioItem,
} from '@/daw/library/audioLibrary';
import { confirmDialog } from '@/daw/ui/DialogHost';
import { IconButton } from '@/daw/ui/IconButton';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING, TYPE_CLASS } from '@/daw/ui/styles';
import { downloadFile } from '@/daw/utils/exportFiles';
import {
  clock,
  extensionOf,
  togglePreview,
  useLibraryPreview,
} from './libraryHelpers';

const TYPE_LABEL = { stem: 'Stem', upload: 'Upload' } as const;

/** Its art: the track's color, with what it is; Play over it on hover. */
function Art({ item }: { item: LibraryAudioItem }) {
  const playing = useLibraryPreview((s) => s.playingId === item.id);
  const Kind = item.kind === 'stem' ? AudioWaveform : FileAudio;
  const color = item.color || 'var(--daw-text-3)';
  return (
    <button
      type="button"
      onClick={() => void togglePreview(item.id)}
      aria-label={playing ? `Stop ${item.name}` : `Play ${item.name}`}
      className={cn(
        'group/art relative flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--daw-radius-md)]',
        FOCUS_RING,
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 70%, var(--daw-bg)), color-mix(in oklab, ${color} 30%, var(--daw-bg)))`,
      }}
    >
      <Kind
        aria-hidden
        className={cn(
          'size-5 text-white/85 transition-opacity',
          playing ? 'opacity-0' : 'group-hover/art:opacity-0',
        )}
      />
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity',
          playing ? 'opacity-100' : 'opacity-0 group-hover/art:opacity-100',
        )}
      >
        {playing ? (
          <Pause className="size-5 fill-current text-white" />
        ) : (
          <Play className="size-5 fill-current text-white" />
        )}
      </span>
    </button>
  );
}

/**
 * A stem or upload in the Library, as Suno's rows are: art (Play on hover),
 * its name, its tag and kind, and on hover ♡ and ⋯ (Add to song, Download,
 * Delete). Drag it onto the timeline to put it in the song there.
 */
export function LibraryAudioRow({
  item,
  onAdd,
}: {
  item: LibraryAudioItem;
  onAdd: (item: LibraryAudioItem) => void;
}) {
  const onDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = { kind: 'library-audio', itemId: item.id };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const download = async () => {
    const full = await getLibraryAudio(item.id);
    if (full)
      downloadFile(full.blob, `${item.name}.${extensionOf(item.contentType)}`);
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete ${item.name}?`,
      description: `It leaves your Library. Songs that already use it keep their copy.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) await deleteLibraryAudio(item.id);
  };

  return (
    <li
      draggable
      onDragStart={onDragStart}
      data-testid="library-audio-row"
      className="group flex h-16 cursor-grab items-center gap-2.5 rounded-[var(--daw-radius-lg)] px-2 transition-colors hover:bg-daw-hover active:cursor-grabbing"
    >
      <Art item={item} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(TYPE_CLASS.item, 'truncate font-bold text-daw-text')}
        >
          {item.name}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-daw-text-3">
          {item.tag && (
            <span
              className={cn(
                TYPE_CLASS.label,
                'max-w-[60%] truncate rounded-[var(--daw-radius-xs)] bg-white/10 px-1 text-daw-text',
              )}
            >
              {item.tag}
            </span>
          )}
          <span className={cn(TYPE_CLASS.micro, 'shrink-0')}>
            {TYPE_LABEL[item.kind]}
          </span>
          {item.durationSec !== null && (
            <span className={cn(TYPE_CLASS.label, 'shrink-0 tabular-nums')}>
              {clock(item.durationSec)}
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center',
          !item.favorite &&
            'opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100',
        )}
      >
        <IconButton
          label={item.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          icon={
            <Heart
              className={cn(item.favorite && 'fill-current text-daw-text')}
            />
          }
          size="sm"
          aria-pressed={item.favorite}
          onClick={() => void setLibraryAudioFavorite(item.id, !item.favorite)}
        />
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={`More for ${item.name}`}
              icon={<MoreVertical />}
              size="sm"
              className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon={<Plus />} onSelect={() => onAdd(item)}>
              Add to song
            </MenuItem>
            <MenuItem icon={<Download />} onSelect={() => void download()}>
              Download
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 />} danger onSelect={() => void remove()}>
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </li>
  );
}
