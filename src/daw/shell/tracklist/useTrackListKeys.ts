import type { RefObject } from 'react';
import { swallowNativeMenu } from '@/daw/commands/clipCommands';
import { TRACKS_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap, type KeymapHandlers } from '@/daw/commands/registry';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { isTrackLockedByRemote } from '@/daw/store/trackLock';
import { duplicateTrack } from './duplicateTrack';
import { requestTrackMenu } from './trackMenuRequests';
import { requestTrackRename } from './useTrackRename';

// ── The track list's keys (milestone 2.6, A11Y#3) ──────────────────────────
//
// While focus is on a track's name (the row's selector): ↑ and ↓ select the
// track above or below (Home and End, the first and last), ⌥↑ and ⌥↓ move
// it, Enter opens it in the dock and puts focus there, F2 or N renames it, M
// and S mute and solo it, and ⌘D duplicates it, focus going to the copy
// (milestone 2.15). They are the 'tracks' region scope (keymaps.ts), so the
// shortcut sheet lists them and musical typing, when on, takes the letters
// first. On the row's other controls (the fader's arrows, a toggle's Enter)
// the keys stay theirs.

/** The track whose name has focus inside `list`, if one has. */
function focusedTrackId(
  list: HTMLElement | null,
  target: EventTarget | null,
): string | null {
  if (
    !(target instanceof Element) ||
    !target.closest('[data-track-selector]')
  ) {
    return null;
  }
  const row = target.closest('[data-track-id]');
  return row && list?.contains(row) ? row.getAttribute('data-track-id') : null;
}

/** Focuses the name of `trackId`'s row, after the render that moves it. */
export function focusTrackRow(trackId: string): void {
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(
        `[data-track-id="${trackId}"] [data-track-selector]`,
      )
      ?.focus(),
  );
}

/** Opens the dock (on its tab, or the instrument) and puts focus in it. */
function editInDock(): void {
  const s = useStore.getState();
  if (s.channelStripTab === null) s.setChannelStripTab('controls');
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>('[data-dock-content]')?.focus(),
  );
}

export function useTrackListKeys(list: RefObject<HTMLElement>): void {
  const ids = () => useStore.getState().tracks.map((t) => t.id);
  const current = (e: KeyboardEvent) => focusedTrackId(list.current, e.target);

  const select =
    (pick: (index: number, count: number) => number) => (e: KeyboardEvent) => {
      const id = current(e);
      if (!id) return false;
      const all = ids();
      const index = all.indexOf(id);
      const next =
        all[Math.max(0, Math.min(all.length - 1, pick(index, all.length)))];
      // A track a collaborator holds can't be selected (setSelectedTrackId
      // says so); focus moves to it anyway, so the keys carry on past it.
      useStore.getState().setSelectedTrackId(next);
      focusTrackRow(next);
    };

  const move = (by: number) => (e: KeyboardEvent) => {
    const id = current(e);
    if (!id) return false;
    const all = ids();
    const index = all.indexOf(id);
    const to = index + by;
    if (index < 0 || to < 0 || to >= all.length) return;
    withTransaction('Move track', () =>
      useStore.getState().reorderTrack(id, to),
    );
    focusTrackRow(id);
  };

  const onTrack = (act: (id: string) => void) => (e: KeyboardEvent) => {
    const id = current(e);
    if (!id) return false;
    act(id);
  };

  const handlers: KeymapHandlers = {
    'tracks.previous': select((i) => (i < 0 ? 0 : i - 1)),
    'tracks.next': select((i) => i + 1),
    'tracks.first': select(() => 0),
    'tracks.last': select((_, n) => n - 1),
    'tracks.moveUp': move(-1),
    'tracks.moveDown': move(1),
    'tracks.edit': onTrack((id) => {
      useStore.getState().setSelectedTrackId(id);
      editInDock();
    }),
    'tracks.rename': onTrack((id) => {
      if (isTrackLockedByRemote(useStore.getState().remoteUsers, id)) return;
      requestTrackRename(id);
    }),
    'tracks.duplicate': onTrack((id) => {
      const copy = duplicateTrack(id);
      if (copy) focusTrackRow(copy);
    }),
    'tracks.menu': (e) => {
      const id = current(e);
      if (!id) return false;
      if (e.code === 'ContextMenu') swallowNativeMenu();
      requestTrackMenu(id);
    },
    'tracks.mute': onTrack((id) => useStore.getState().toggleMute(id)),
    'tracks.solo': onTrack((id) => useStore.getState().toggleSolo(id)),
  };
  useKeymap(TRACKS_SCOPE.id, handlers, { element: list });
}
