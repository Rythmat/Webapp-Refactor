import { HeartIcon } from '@/components/icons/HeartIcon';
import {
  AudioWaveform,
  Download,
  FileAudio,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
} from '@/daw/components/Library/InsightCard';
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
import { FOCUS_RING } from '@/daw/ui/styles';
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
        'group/art relative flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[12px]',
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
      className="group flex h-16 cursor-grab items-center gap-2.5 rounded-[14px] px-2 transition-colors hover:bg-white/[0.06] active:cursor-grabbing"
    >
      <Art item={item} />
      <div className="min-w-0 flex-1">
        <div className={cn(INSIGHT_TEXT, 'truncate font-medium')}>
          {item.name}
        </div>
        <div className={cn(INSIGHT_DIM, 'flex min-w-0 items-center gap-1.5')}>
          {item.tag && (
            <span className="max-w-[60%] truncate rounded-full bg-white/[0.06] px-2 text-[12px] font-medium text-white/70">
              {item.tag}
            </span>
          )}
          <span className="shrink-0">{TYPE_LABEL[item.kind]}</span>
          {item.durationSec !== null && (
            <span className="shrink-0 tabular-nums">
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
            <HeartIcon
              filled={item.favorite}
              className={cn(item.favorite && 'text-daw-text')}
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
