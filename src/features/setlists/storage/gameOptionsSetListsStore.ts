import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  gameOptionsQueryKey,
  useGameOptions,
} from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';
import type { GameOptionsMap } from '@/lib/gameOptions/api';
import { emptyBlob, estimateBlobBytes, normalizeBlob } from '../setListsStore';
import type { SetListsBlob } from '../types';

/**
 * Where set lists live.
 *
 * The backend has no set-list table yet, so the whole document rides in the
 * per-user JSON store the arcade games use, under its own key. That store
 * shallow-merges by key, so writing the whole document under 'setlists' is
 * safe. THIS FILE IS THE SEAM: when real /setlists endpoints land, only this
 * hook changes — the store functions, the hook API and every screen stay put.
 */

export const SETLISTS_GAME_ID = 'setlists';
const SAVE_DEBOUNCE_MS = 800;
const MAX_BYTES = 512 * 1024;
const CHANNEL = 'ma-setlists';

export type SetListsStatus = 'loading' | 'ready' | 'signedOut' | 'error';
/** What the header should say about the user's work. */
export type SaveState = 'saved' | 'saving' | 'unsaved';

export interface SetListsStorage {
  blob: SetListsBlob;
  status: SetListsStatus;
  isSaving: boolean;
  /** True when local edits have not reached the server. */
  isDirty: boolean;
  /** Saved, saving, or tried and failed — never a spinner that lies. */
  saveState: SaveState;
  save: (next: SetListsBlob) => void;
  flush: () => Promise<void>;
}

export function useSetListsStorage(): SetListsStorage {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const query = useGameOptions<Partial<SetListsBlob>>(SETLISTS_GAME_ID);
  const saveOptions = useSaveGameOptions(SETLISTS_GAME_ID);

  const [local, setLocal] = useState<SetListsBlob | null>(null);
  const [isDirty, setDirty] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef<SetListsBlob | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const stored = query.data;
  const blob = local ?? normalizeBlob(stored);

  const push = useCallback(async () => {
    const next = pending.current;
    if (!next || inFlight.current) return;
    if (estimateBlobBytes(next) > MAX_BYTES) return;
    inFlight.current = true;
    pending.current = null;
    try {
      await saveOptions.mutateAsync(next as unknown as Record<string, unknown>);
      setFailed(false);
      setDirty(pending.current !== null);
    } catch {
      setFailed(true);
      // Keep the edit locally and let the next change retry; the UI says
      // "Not saved" rather than silently dropping the user's work.
      setDirty(true);
    } finally {
      inFlight.current = false;
      if (pending.current) void push();
    }
  }, [saveOptions]);

  const save = useCallback(
    (next: SetListsBlob) => {
      setLocal(next);
      setDirty(true);
      pending.current = next;
      // Everything else reading the cache (the star on a song row) follows.
      queryClient.setQueryData<{ options: GameOptionsMap }>(
        gameOptionsQueryKey,
        (prev) => ({
          options: {
            ...(prev?.options ?? {}),
            [SETLISTS_GAME_ID]: next as unknown as Record<string, unknown>,
          },
        }),
      );
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL);
        channel.postMessage(next);
        channel.close();
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void push(), SAVE_DEBOUNCE_MS);
    },
    [push, queryClient],
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await push();
  }, [push]);

  // Another tab's edits.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => setLocal(normalizeBlob(event.data));
    return () => channel.close();
  }, []);

  // Leaving the page: get the last edit out the door.
  useEffect(() => {
    const onHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  const status: SetListsStatus = !token
    ? 'signedOut'
    : query.isPending
      ? 'loading'
      : query.isError && !local
        ? 'error'
        : 'ready';

  return {
    blob: status === 'signedOut' && !local ? emptyBlob() : blob,
    status,
    isSaving: saveOptions.isPending,
    isDirty,
    saveState: failed && isDirty ? 'unsaved' : isDirty ? 'saving' : 'saved',
    save,
    flush,
  };
}
