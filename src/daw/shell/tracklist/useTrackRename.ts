import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useStore, type Track } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';

// ── Renaming a track in its row (milestone 2.6) ─────────────────────────────
//
// The name turns into a field: from a double-click on it, or F2 or N with
// focus on it. Enter or leaving the field keeps the new name (an empty one
// changes nothing), Escape keeps the old one. The ⋯ menu has its own name
// field at its top (2.15, TrackMenu), which renames the same way.

const renameRequests = new EventTarget();

/** Renames the track as one undo step; an empty or unchanged name does nothing. */
export function renameTrack(trackId: string, name: string): void {
  const value = name.trim();
  const track = useStore.getState().tracks.find((t) => t.id === trackId);
  if (!track || !value || value === track.name) return;
  withTransaction('Rename track', () =>
    useStore.getState().updateTrack(trackId, { name: value }),
  );
}

/** Asks the row of `trackId` to show its name field (the list's F2 / N). */
export function requestTrackRename(trackId: string): void {
  renameRequests.dispatchEvent(new CustomEvent(trackId));
}

export interface TrackRename {
  editing: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  start(): void;
  commit(): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}

export function useTrackRename(track: Pick<Track, 'id' | 'name'>): TrackRename {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    const start = () => setEditing(true);
    renameRequests.addEventListener(track.id, start);
    return () => renameRequests.removeEventListener(track.id, start);
  }, [track.id]);

  const commit = useCallback(() => {
    renameTrack(track.id, inputRef.current?.value ?? '');
    setEditing(false);
  }, [track.id]);

  const finishAndRefocus = useCallback(
    (keep: boolean) => {
      if (keep) commit();
      else setEditing(false);
      // Back to the row's name, so the keys carry on from there.
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            `[data-track-id="${track.id}"] [data-track-selector]`,
          )
          ?.focus(),
      );
    },
    [commit, track.id],
  );

  return {
    editing,
    inputRef,
    start: () => setEditing(true),
    commit,
    onKeyDown: (e) => {
      // The field's keys are its own: no shortcut sees them.
      e.stopPropagation();
      if (e.key === 'Enter') finishAndRefocus(true);
      else if (e.key === 'Escape') finishAndRefocus(false);
    },
  };
}
