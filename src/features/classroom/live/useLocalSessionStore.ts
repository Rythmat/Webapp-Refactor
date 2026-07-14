/**
 * useLocalSessionStore — React wrapper around sessionsStore. Same subscribe
 * pattern as usePublishedDays. Component-facing surface stays stable when
 * Ryan's PartyKit swap lands in Sprint 5 — only useSessionSync flips its body.
 */
import { useCallback, useEffect, useState } from 'react';
import { useMe } from '@/hooks/data';
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  applyMessageForUser,
  endSessionForUser,
  getActiveSessionForClassroomForUser,
  readSessionsStoreForUser,
  startSessionForUser,
  type ApplyMessageInput,
  type SessionMessage,
  type SessionState,
  type SessionStore,
  type StartSessionInput,
} from './sessionsStore';

const EMPTY_STORE: SessionStore = {
  schemaVersion: SCHEMA_VERSION,
  sessions: {},
  responses: {},
  seq: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

export interface UseLocalSessionStore {
  store: SessionStore;
  getSession: (sessionId: string) => SessionState | undefined;
  getActiveSessionForClassroom: (
    classroomId: string,
  ) => SessionState | undefined;
  startSession: (input: StartSessionInput) => SessionState;
  endSession: (sessionId: string) => void;
  dispatch: (input: ApplyMessageInput) => SessionMessage | null;
}

export const useLocalSessionStore = (): UseLocalSessionStore => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;

  const [store, setStore] = useState<SessionStore>(() =>
    isBrowser ? readSessionsStoreForUser(userId) : EMPTY_STORE,
  );

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setStore(readSessionsStoreForUser(userId));
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(userId)) onChange();
    };
    onChange();
    const scopedEvent = `${keyFor(userId)}:changed`;
    window.addEventListener(scopedEvent, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(scopedEvent, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);

  const getSession = useCallback(
    (sessionId: string) => store.sessions[sessionId],
    [store.sessions],
  );

  const getActiveSessionForClassroom = useCallback(
    (classroomId: string) =>
      getActiveSessionForClassroomForUser(userId, classroomId),
    [userId, store.sessions],
  );

  const startSession = useCallback(
    (input: StartSessionInput) => {
      const state = startSessionForUser(userId, input);
      setStore(readSessionsStoreForUser(userId));
      return state;
    },
    [userId],
  );

  const endSession = useCallback(
    (sessionId: string) => {
      endSessionForUser(userId, sessionId);
      setStore(readSessionsStoreForUser(userId));
    },
    [userId],
  );

  const dispatch = useCallback(
    (input: ApplyMessageInput) => {
      const msg = applyMessageForUser(userId, input);
      if (msg) setStore(readSessionsStoreForUser(userId));
      return msg;
    },
    [userId],
  );

  return {
    store,
    getSession,
    getActiveSessionForClassroom,
    startSession,
    endSession,
    dispatch,
  };
};
