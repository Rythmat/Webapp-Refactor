import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useStore, type Track } from '@/daw/store';

// ── Renaming a track in its row (milestone 2.6) ─────────────────────────────
//
// The name turns into a field: from a double-click on it, F2 or N with focus
// on it, or Rename in the ⋯ menu. Enter or leaving the field keeps the new
// name (an empty one changes nothing), Escape keeps the old one.

const renameRequests = new EventTarget();

/** Asks the row of `trackId` to show its name field (the list's F2 / N). */
export function requestTrackRename(trackId: string): void {
  renameRequests.dispatchEvent(new CustomEvent(trackId));
}

export interface TrackRename {
  editing: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  start(): void;
  /** Start from the ⋯ menu, which would otherwise take focus back. */
  startFromMenu(): void;
  /** The menu's close: keeps focus in the field when Rename was chosen. */
  menuCloseAutoFocus(event: Event): void;
  commit(): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}

export function useTrackRename(track: Pick<Track, 'id' | 'name'>): TrackRename {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fromMenu = useRef(false);

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
    const value = inputRef.current?.value.trim();
    if (value && value !== track.name) {
      useStore.getState().updateTrack(track.id, { name: value });
    }
    setEditing(false);
  }, [track.id, track.name]);

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
    startFromMenu: () => {
      fromMenu.current = true;
      setEditing(true);
    },
    menuCloseAutoFocus: (event) => {
      if (!fromMenu.current) return;
      fromMenu.current = false;
      event.preventDefault();
    },
    commit,
    onKeyDown: (e) => {
      // The field's keys are its own: no shortcut sees them.
      e.stopPropagation();
      if (e.key === 'Enter') finishAndRefocus(true);
      else if (e.key === 'Escape') finishAndRefocus(false);
    },
  };
}
