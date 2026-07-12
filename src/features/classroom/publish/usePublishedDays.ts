/**
 * usePublishedDays — production hook hits Ryan's `POST /classrooms/:cid/publish`.
 *
 * Sprint 7 swap: `publishDayToClassroom` is async and POSTs to REST. The
 * response is normalized + cached in localStorage so `getPublishedDay(pdid)`
 * survives page refresh (Ryan doesn't ship a get-one endpoint yet). Rule 1
 * firewall runs client-side as a pre-flight before the round trip; the server
 * runs the authoritative version. Republish idempotency depends on Ryan's
 * upsert fix landing — until then, republishing mints a fresh id (tracked as
 * a known bug in Sprint 7 notes; assignments FK'd to old ids may dangle).
 *
 * `unpublish` is deferred — Ryan has no DELETE endpoint. `unpublishForUser`
 * stays as a dev-only helper for the sim harness only.
 */
import { useCallback, useEffect, useState } from 'react';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import {
  STORAGE_KEY as ASSIGNMENTS_KEY,
  type AssignmentStore,
} from '../assignments/assignmentsStore';
import type { AgePreset, Day, StudentLanguage } from '../types';
import {
  type DaySnapshot,
  findForbiddenSubstring,
  publishDay,
} from './publishDay';

export const STORAGE_KEY = 'ma-teacher:published:v1';
export const SCHEMA_VERSION = 1;

export interface PublishedDay {
  id: string;
  classroomId: string;
  teacherId: string;
  sourceRef: string;
  snapshot: DaySnapshot;
  publishedAt: string;
  updatedAt?: string;
  languages?: StudentLanguage[];
  agePreset?: AgePreset;
}

export interface PublishedStore {
  schemaVersion: number;
  entries: Record<string, PublishedDay>;
}

const EMPTY_STORE: PublishedStore = {
  schemaVersion: SCHEMA_VERSION,
  entries: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const readStore = (userId: string | null | undefined): PublishedStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as PublishedStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${keyFor(userId)}.bak`, raw);
      return EMPTY_STORE;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      entries: parsed.entries ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
};

const writeStore = (
  userId: string | null | undefined,
  store: PublishedStore,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
  } catch {
    // Quota / privacy mode — silently no-op.
  }
};

const generatePublishedDayId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `local-pd-${Date.now().toString(36)}-${rand}`;
};

const cascadeCloseAssignments = (
  userId: string | null | undefined,
  publishedDayId: string,
): void => {
  if (!isBrowser) return;
  try {
    const scopedKey = `${ASSIGNMENTS_KEY}:${userId || 'anon'}`;
    const raw = window.localStorage.getItem(scopedKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as AssignmentStore;
    if (!parsed?.entries) return;
    let changed = false;
    const nextEntries = { ...parsed.entries };
    for (const [id, a] of Object.entries(nextEntries)) {
      if (a.publishedDayId === publishedDayId && a.status === 'open') {
        nextEntries[id] = { ...a, status: 'closed' };
        changed = true;
      }
    }
    if (!changed) return;
    const next: AssignmentStore = { ...parsed, entries: nextEntries };
    window.localStorage.setItem(scopedKey, JSON.stringify(next));
    window.dispatchEvent(new Event(`${scopedKey}:changed`));
  } catch {
    // No-op on read failure.
  }
};

export interface PublishDayInput {
  classroomId: string;
  day: Day;
  teacherId?: string;
}

/** DEV-ONLY. Sim harness fallback; production path is publishDayToClassroom. */
export const publishDayForUser = (
  userId: string | null,
  input: PublishDayInput,
): PublishedDay => {
  const snapshot = publishDay(input.day);
  const forbidden = findForbiddenSubstring(snapshot);
  if (forbidden !== null) {
    throw new Error(`Rule 1 firewall violation: "${forbidden}"`);
  }
  const current = readStore(userId);
  const existing = Object.values(current.entries).find(
    (pd) =>
      pd.classroomId === input.classroomId && pd.sourceRef === input.day.id,
  );
  const nowIso = new Date().toISOString();
  const record: PublishedDay = existing
    ? { ...existing, snapshot, updatedAt: nowIso }
    : {
        id: generatePublishedDayId(),
        classroomId: input.classroomId,
        teacherId: input.teacherId ?? userId ?? 'local-teacher',
        sourceRef: input.day.id,
        snapshot,
        publishedAt: nowIso,
      };
  const next: PublishedStore = {
    ...current,
    entries: { ...current.entries, [record.id]: record },
  };
  writeStore(userId, next);
  return record;
};

/** DEV-ONLY. Sim harness cleanup — production has no DELETE endpoint yet. */
export const unpublishForUser = (
  userId: string | null,
  publishedDayId: string,
): void => {
  const current = readStore(userId);
  if (!(publishedDayId in current.entries)) return;
  const nextEntries = { ...current.entries };
  delete nextEntries[publishedDayId];
  const next: PublishedStore = { ...current, entries: nextEntries };
  writeStore(userId, next);
  cascadeCloseAssignments(userId, publishedDayId);
};

export const readPublishedStoreForUser = (
  userId: string | null,
): PublishedStore => readStore(userId);

const dateToIso = (v: Date | string | null | undefined): string =>
  v == null
    ? new Date().toISOString()
    : typeof v === 'string'
      ? v
      : v.toISOString();

const parseFirewallError = (err: unknown): { forbidden: string } | null => {
  if (!(err instanceof Error)) return null;
  // Try both parseable JSON body and Ryan's current JSON.stringify-in-message
  // form; either way we pluck the forbidden term.
  const msg = err.message;
  try {
    const body = JSON.parse(msg) as {
      code?: string;
      forbidden?: string;
      match?: string;
    };
    if (
      body.code === 'rule_1_firewall_violation' ||
      body.code === 'firewall_violation'
    ) {
      return { forbidden: body.forbidden ?? body.match ?? 'unknown' };
    }
  } catch {
    // Not JSON — try to find the sub inside the message text.
    const m = msg.match(/"(match|forbidden)":\s*"([^"]+)"/);
    if (m) return { forbidden: m[2] };
  }
  return null;
};

export interface UsePublishedDays {
  publishedDays: PublishedDay[];
  getPublishedDay: (publishedDayId: string) => PublishedDay | undefined;
  publishDayToClassroom: (input: PublishDayInput) => Promise<PublishedDay>;
}

export const usePublishedDays = (classroomId: string): UsePublishedDays => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const musicAtlas = useMusicAtlas();

  const [store, setStore] = useState<PublishedStore>(() => readStore(userId));

  useEffect(() => {
    if (!isBrowser) return;
    const onChange = () => setStore(readStore(userId));
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

  const publishedDays = Object.values(store.entries).filter(
    (pd) => pd.classroomId === classroomId,
  );

  const getPublishedDay = useCallback(
    (publishedDayId: string) => store.entries[publishedDayId],
    [store.entries],
  );

  const publishDayToClassroom = useCallback(
    async (input: PublishDayInput): Promise<PublishedDay> => {
      const snapshot = publishDay(input.day);
      const forbidden = findForbiddenSubstring(snapshot);
      if (forbidden !== null) {
        throw new Error(`Rule 1 firewall violation: "${forbidden}"`);
      }
      let raw;
      try {
        raw = await musicAtlas.classrooms.postClassroomsByIdPublish(
          input.classroomId,
          {
            sourceRef: input.day.id,
            snapshot,
          },
        );
      } catch (err) {
        const parsed = parseFirewallError(err);
        if (parsed) {
          throw new Error(`Rule 1 firewall violation: "${parsed.forbidden}"`);
        }
        throw err;
      }
      const record: PublishedDay = {
        id: raw.id,
        classroomId: raw.classroomId,
        teacherId: raw.teacherId,
        sourceRef: raw.sourceRef ?? input.day.id,
        snapshot: raw.snapshot as DaySnapshot,
        publishedAt: dateToIso(raw.publishedAt),
      };
      const current = readStore(userId);
      const next: PublishedStore = {
        ...current,
        entries: { ...current.entries, [record.id]: record },
      };
      writeStore(userId, next);
      setStore(next);
      return record;
    },
    [musicAtlas, userId],
  );

  return { publishedDays, getPublishedDay, publishDayToClassroom };
};
