import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  GripVertical,
  Music,
  Plus,
  Printer,
  StickyNote,
  Trash2,
  Type,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { normalizeSongMode } from '@/components/common/CircleOfFifthsSvg';
import { KeyWheel } from '@/components/common/KeyWheel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SongRoutes } from '@/constants/routes';
import { getSong } from '@/curriculum/data/songs';
import {
  semitonesToTonic,
  transposeSong,
} from '@/curriculum/songLibrary/transpose';
import { SongPickerDialog } from '@/features/classroom/slides/wizard/SongPickerDialog';
import {
  dropIndex,
  hasDragItem,
  readDragItem,
  setDragItem,
} from '../setListDnd';
import type { SetListEntry, SetListSongEntry } from '../types';
import { useSetLists } from '../useSetLists';
import { InlineTitle } from './SetListsIndexPage';

/**
 * One set list, in the order it will be played: songs (each in whatever key
 * this set needs) and the player's own text pages between them, dragged into
 * order by the handle on the left.
 */

export const SetListEditorPage: FC = () => {
  const { setListId = '' } = useParams<{ setListId: string }>();
  const navigate = useNavigate();
  const { blob, status, saveState, actions, flush } = useSetLists();
  const [picking, setPicking] = useState(false);
  const [over, setOver] = useState<{
    index: number;
    half: 'top' | 'bottom';
  } | null>(null);

  const list = blob.setLists[setListId];
  const show = list ? blob.shows[list.showId] : undefined;
  const artist = show ? blob.artists[show.artistId] : undefined;

  if (!list)
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: '#101012' }}
      >
        <div className="text-center">
          <p className="text-white/70">
            {status === 'loading'
              ? 'Loading your set lists…'
              : 'That set list is gone.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(SongRoutes.setLists())}
            className="mt-3 text-sm text-[#7ecfcf] hover:underline"
          >
            Back to Set Lists
          </button>
        </div>
      </div>
    );

  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const item = readDragItem(e.dataTransfer);
    setOver(null);
    // A drag from another list — or from the classroom calendar — is not ours.
    if (!item || item.setListId !== setListId) return;
    const half = over?.index === index ? over.half : 'top';
    actions.moveEntry(
      setListId,
      item.index,
      dropIndex(item.index, index, half),
    );
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: '#101012' }}
    >
      <header className="flex-shrink-0 border-b border-white/10 px-6 py-3 md:px-10">
        <div className="flex flex-col items-start">
          <button
            type="button"
            onClick={() => navigate(SongRoutes.setLists())}
            className="text-xs font-medium text-white/50 hover:text-white hover:underline"
          >
            Set Lists
          </button>
          <button
            type="button"
            onClick={() => navigate(SongRoutes.setLists())}
            aria-label="Back to Set Lists"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs text-white/40">
              {artist && (
                <InlineTitle
                  value={artist.title}
                  onCommit={(t) => actions.renameArtist(artist.id, t)}
                />
              )}
              <span>▸</span>
              {show && (
                <InlineTitle
                  value={show.title}
                  onCommit={(t) => actions.renameShow(show.id, t)}
                />
              )}
            </div>
            <InlineTitle
              value={list.title}
              onCommit={(t) => actions.renameSetList(list.id, t)}
              className="text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">
              {status === 'signedOut'
                ? 'Sign in to save'
                : saveState === 'unsaved'
                  ? 'Not saved'
                  : saveState === 'saving'
                    ? 'Saving…'
                    : 'Saved ✓'}
            </span>
            <button
              type="button"
              onClick={async () => {
                await flush();
                navigate(SongRoutes.setListPrint({ setListId }));
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:border-white/30"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </header>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4 md:px-10">
        {list.entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
            <p className="text-white/70">Nothing in this set yet.</p>
            <p className="mt-1 text-sm text-white/40">
              Add the first song, or a note to yourself.
            </p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {list.entries.map((entry, index) => (
              <li
                key={entry.id}
                onDragOver={(e) => {
                  if (!hasDragItem(e.dataTransfer)) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setOver({
                    index,
                    half:
                      e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom',
                  });
                }}
                onDragLeave={() =>
                  setOver((o) => (o?.index === index ? null : o))
                }
                onDrop={onDrop(index)}
                className={
                  over?.index === index
                    ? over.half === 'top'
                      ? 'border-t-2 border-[#7ecfcf]'
                      : 'border-b-2 border-[#7ecfcf]'
                    : ''
                }
              >
                <EntryRow
                  entry={entry}
                  index={index}
                  setListId={setListId}
                  count={list.entries.length}
                />
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-sm font-semibold text-[#191919]"
          >
            <Plus size={15} /> Add song
          </button>
          <button
            type="button"
            onClick={() => actions.addText(setListId, '')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:border-white/30"
          >
            <Type size={15} /> Add text
          </button>
        </div>
      </div>

      <SongPickerDialog
        open={picking}
        onOpenChange={setPicking}
        onSelect={(song) => {
          actions.addSong(setListId, song.id);
          setPicking(false);
        }}
      />
    </div>
  );
};

const EntryRow: FC<{
  entry: SetListEntry;
  index: number;
  setListId: string;
  count: number;
}> = ({ entry, index, setListId, count }) => {
  const { actions } = useSetLists();
  const move = (to: number) => actions.moveEntry(setListId, index, to);

  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2">
      {/* Only the handle drags: a draggable row would break text selection. */}
      <div
        draggable
        onDragStart={(e) =>
          setDragItem(e.dataTransfer, { setListId, entryId: entry.id, index })
        }
        className="mt-1 cursor-grab text-white/25 hover:text-white/60 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>
      <div className="mt-0.5 flex flex-col gap-0.5">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => move(index - 1)}
          className="text-white/30 hover:text-white disabled:opacity-20"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === count - 1}
          onClick={() => move(index + 1)}
          className="text-white/30 hover:text-white disabled:opacity-20"
        >
          <ChevronDown size={13} />
        </button>
      </div>
      <span className="mt-1 w-5 flex-shrink-0 text-right text-xs text-white/30">
        {index + 1}
      </span>

      {entry.kind === 'song' ? (
        <SongEntryBody entry={entry} setListId={setListId} />
      ) : (
        <textarea
          value={entry.text}
          onChange={(e) =>
            actions.setEntryText(setListId, entry.id, e.target.value)
          }
          placeholder="A note for the band — transitions, staging, anything. Prints as its own page."
          rows={Math.max(2, entry.text.split('\n').length)}
          className="mt-0.5 flex-1 resize-none rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-white/25"
        />
      )}

      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Duplicate"
          onClick={() => actions.duplicateEntry(setListId, entry.id)}
          className="rounded p-1 text-white/30 hover:text-white"
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          aria-label="Remove from set"
          onClick={() => actions.removeEntry(setListId, entry.id)}
          className="rounded p-1 text-white/30 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const SongEntryBody: FC<{ entry: SetListSongEntry; setListId: string }> = ({
  entry,
  setListId,
}) => {
  const { actions } = useSetLists();
  const song = getSong(entry.songId);
  const inKey = useMemo(
    () => (song ? transposeSong(song, entry.semitones) : null),
    [song, entry.semitones],
  );
  const [notesOpen, setNotesOpen] = useState(false);

  if (!song)
    return (
      <div className="flex-1 text-sm text-white/40">
        <span className="italic">Missing song ({entry.songId})</span>
      </div>
    );

  const shift = entry.semitones > 6 ? entry.semitones - 12 : entry.semitones;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <Music size={13} className="flex-shrink-0 text-white/30" />
        <a
          href={SongRoutes.song({ songId: song.id })}
          className="truncate font-medium text-white/90 hover:underline"
        >
          {entry.title ?? song.title}
        </a>
        <span className="truncate text-xs text-white/40">{song.artist}</span>

        {/* The key this set plays it in — the song page's wheel, per entry. */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/70 hover:border-white/35"
              title="Key for this set"
            >
              {inKey?.key ?? song.key}
              {shift !== 0 && (
                <span className="ml-1 text-white/45">
                  {shift > 0 ? `+${shift}` : shift}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="w-auto rounded-xl border-0 p-4"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <KeyWheel
              selectedPc={(((inKey ?? song).keyRoot % 12) + 12) % 12}
              mode={normalizeSongMode(song.mode)}
              onSelectPc={(pc) =>
                actions.setEntryTranspose(
                  setListId,
                  entry.id,
                  semitonesToTonic(song, pc),
                )
              }
              ariaLabel="Key for this set"
              footer={
                <span
                  className="text-[10px] font-medium capitalize"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {song.key.replace(/^[A-G](?:♯|♭)?\s*/, '') || 'major'}
                </span>
              }
            />
            {shift !== 0 && (
              <button
                type="button"
                onClick={() =>
                  actions.setEntryTranspose(setListId, entry.id, 0)
                }
                className="mt-3 w-full text-center text-[11px] text-white/70 hover:underline"
              >
                Reset to {song.key}
              </button>
            )}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className={`rounded p-1 ${entry.notes ? 'text-[#7ecfcf]' : 'text-white/30 hover:text-white'}`}
          aria-label="Note for this song"
          title="Note for this song"
        >
          <StickyNote size={14} />
        </button>
      </div>

      {(notesOpen || entry.notes) && (
        <input
          value={entry.notes ?? ''}
          autoFocus={notesOpen && !entry.notes}
          onChange={(e) =>
            actions.setEntryNotes(setListId, entry.id, e.target.value)
          }
          placeholder="count in 4 · cut last chorus · watch the drummer"
          className="mt-1 w-full rounded border border-white/10 bg-transparent px-2 py-0.5 text-xs text-white/70 outline-none placeholder:text-white/25 focus:border-white/25"
        />
      )}
    </div>
  );
};
