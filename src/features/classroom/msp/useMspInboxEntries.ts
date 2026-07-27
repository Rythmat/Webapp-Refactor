/**
 * useMspInboxEntries — read-only subscription to the current user's MSP inbox.
 *
 * Used by the teacher dashboard to detect module completions that arrived while
 * a student's live tab was closed. It NEVER consumes entries (consumption
 * belongs to the student's `useMspReport`); this is a pure observer that
 * refreshes on same-tab (`msp:inbox`, `…:changed`) and cross-tab (`storage`)
 * signals.
 */
import { useEffect, useState } from 'react';
import { useMe } from '@/hooks/data';
import {
  INBOX_EVENT,
  mspInboxStorageKey,
  readMspInboxForUser,
  type MspResponseEntry,
} from './mspResponseInbox';

const isBrowser = typeof window !== 'undefined';

export const useMspInboxEntries = (): MspResponseEntry[] => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const [entries, setEntries] = useState<MspResponseEntry[]>(() =>
    Object.values(readMspInboxForUser(userId).entries),
  );

  useEffect(() => {
    if (!isBrowser) return;
    const refresh = () =>
      setEntries(Object.values(readMspInboxForUser(userId).entries));
    refresh();
    const changedEvent = `${mspInboxStorageKey(userId)}:changed`;
    const onStorage = (e: StorageEvent) => {
      if (e.key === mspInboxStorageKey(userId)) refresh();
    };
    window.addEventListener(INBOX_EVENT, refresh);
    window.addEventListener(changedEvent, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(INBOX_EVENT, refresh);
      window.removeEventListener(changedEvent, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);

  return entries;
};
