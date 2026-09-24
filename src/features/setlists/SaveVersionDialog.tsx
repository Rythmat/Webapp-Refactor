import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showSuccess } from '@/components/utils/toast';
import { SongRoutes } from '@/constants/routes';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import { listTree, roleList } from './setListsStore';
import { useSetLists } from './useSetLists';

/**
 * "Save This Version As…" — the moment a player turns a chart they have put
 * in their own key into something they keep. The version stores the key and
 * the notes, never a copy of the chords, so corrections to the published
 * chart keep reaching it.
 */

export interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song;
  semitones: number;
}

const NEW_LIST = '__new__';

export const SaveVersionDialog: FC<SaveVersionDialogProps> = ({
  open,
  onOpenChange,
  song,
  semitones,
}) => {
  const navigate = useNavigate();
  const { blob, status, actions } = useSetLists();
  const inKey = useMemo(
    () => transposeSong(song, semitones),
    [song, semitones],
  );

  const defaultName =
    semitones === 0 ? song.title : `${song.title} (${inKey.key})`;
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState('');
  const [destination, setDestination] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');

  const inbox = roleList(blob, 'inbox');
  const options = useMemo(
    () =>
      listTree(blob).flatMap(({ artist, shows }) =>
        shows.flatMap(({ show, setLists }) =>
          setLists.map((list) => ({
            id: list.id,
            label: list.role
              ? list.title
              : `${artist.title} ▸ ${show.title} ▸ ${list.title}`,
          })),
        ),
      ),
    [blob],
  );

  const shift = semitones > 6 ? semitones - 12 : semitones;
  const chosen = destination || inbox?.id || NEW_LIST;

  const save = () => {
    const result = actions.saveVersionAs({
      songId: song.id,
      name: name.trim() || song.title,
      semitones,
      notes: notes.trim() || undefined,
      destination:
        chosen === NEW_LIST
          ? { kind: 'new', title: newTitle.trim() || 'New Set List' }
          : { kind: 'existing', setListId: chosen },
    });
    onOpenChange(false);
    showSuccess(
      `Saved to ${
        chosen === NEW_LIST
          ? newTitle.trim() || 'New Set List'
          : (options.find((o) => o.id === chosen)?.label ?? 'your set list')
      }`,
    );
    navigate(SongRoutes.setList({ setListId: result.setListId }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#161618] text-white">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Save this version as…
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-white/50">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-white/35"
            />
          </label>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-white/50">Key</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/80">
              {inKey.key}
              {shift !== 0 && (
                <span className="ml-1 text-white/45">
                  {shift > 0 ? `+${shift}` : shift}
                </span>
              )}
            </span>
            {shift === 0 && (
              <span className="text-xs text-white/35">as written</span>
            )}
          </div>

          <label className="block">
            <span className="text-xs text-white/50">Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="count in 4 · cut last chorus"
              className="mt-1 w-full rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-white/25 focus:border-white/35"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/50">Set list</span>
            <select
              value={chosen}
              onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#161618] px-3 py-1.5 text-sm outline-none focus:border-white/35"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
              <option value={NEW_LIST}>New set list…</option>
            </select>
          </label>

          {chosen === NEW_LIST && (
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Name the new set list"
              className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-white/25 focus:border-white/35"
            />
          )}

          {status === 'signedOut' && (
            <p className="text-xs text-amber-300/80">
              You are not signed in, so this will not be kept.
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-[#7ecfcf] px-4 py-1.5 text-sm font-semibold text-[#191919]"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
