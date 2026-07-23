/**
 * useEnrollments — production hook is REST-backed via React Query.
 *
 * Hits the classroom API's endpoints
 * (`GET /classrooms/:cid/enrollments?status=all` +
 *  `PATCH .../enrollments/:eid`). The four callbacks (approve / deny / kick /
 * reactivate) all collapse to a single PATCH with
 * `{ status: 'active' | 'removed' }` — the verb names survive because
 * `RosterTabs` still calls them, but they resolve to the same mutation.
 * Timestamps returned: `joinedAt`, `approvedAt`, `removedAt` (three mutable
 * stamps; the Sprint 3 `deniedAt`/`reactivatedAt` fields were retired).
 *
 * The `*ForUser` helpers below (approveEnrollmentForUser, etc.) are the
 * dev-only localStorage fallback consumed by the simulation harness and its
 * tests. Production code paths must NOT call them — they never touch the API.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  isValidTransition,
  type Enrollment,
  type EnrollmentStatus,
  type EnrollmentStore,
} from './enrollmentsStore';

export {
  ENROLLMENT_TRANSITIONS,
  SCHEMA_VERSION,
  STORAGE_KEY,
  isValidTransition,
  type Enrollment,
  type EnrollmentStatus,
  type EnrollmentStore,
} from './enrollmentsStore';

// -----------------------------------------------------------------------------
// Dev-only localStorage store — used ONLY by simulationStore for solo teacher
// testing. Production hook never reads/writes here.
// -----------------------------------------------------------------------------

const EMPTY_STORE: EnrollmentStore = {
  schemaVersion: SCHEMA_VERSION,
  entries: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const readStore = (userId: string | null | undefined): EnrollmentStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as EnrollmentStore;
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
  store: EnrollmentStore,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
  } catch {
    // No-op on quota / privacy mode.
  }
};

export const generateEnrollmentId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `local-enr-${Date.now().toString(36)}-${rand}`;
};

const transition = (
  userId: string | null,
  enrollmentId: string,
  to: EnrollmentStatus,
  stamps: Partial<Pick<Enrollment, 'approvedAt' | 'removedAt'>>,
): Enrollment => {
  const current = readStore(userId);
  const existing = current.entries[enrollmentId];
  if (!existing) {
    throw new Error(`Unknown enrollment "${enrollmentId}"`);
  }
  if (!isValidTransition(existing.status, to)) {
    throw new Error(
      `Invalid transition ${existing.status} -> ${to} for "${enrollmentId}"`,
    );
  }
  const updated: Enrollment = { ...existing, ...stamps, status: to };
  const next: EnrollmentStore = {
    ...current,
    entries: { ...current.entries, [enrollmentId]: updated },
  };
  writeStore(userId, next);
  return updated;
};

/** DEV-ONLY. Sim harness fallback — production path is the REST mutation. */
export const approveEnrollmentForUser = async (
  userId: string | null,
  enrollmentId: string,
): Promise<Enrollment> =>
  transition(userId, enrollmentId, 'active', {
    approvedAt: new Date().toISOString(),
  });

/** DEV-ONLY. Sim harness fallback. */
export const denyEnrollmentForUser = async (
  userId: string | null,
  enrollmentId: string,
): Promise<Enrollment> => {
  const current = readStore(userId);
  const existing = current.entries[enrollmentId];
  if (existing?.status !== 'pending') {
    throw new Error(`Cannot deny non-pending enrollment "${enrollmentId}"`);
  }
  return transition(userId, enrollmentId, 'removed', {
    removedAt: new Date().toISOString(),
  });
};

/** DEV-ONLY. Sim harness fallback. */
export const kickEnrollmentForUser = async (
  userId: string | null,
  enrollmentId: string,
): Promise<Enrollment> => {
  const current = readStore(userId);
  const existing = current.entries[enrollmentId];
  if (existing?.status !== 'active') {
    throw new Error(`Cannot kick non-active enrollment "${enrollmentId}"`);
  }
  return transition(userId, enrollmentId, 'removed', {
    removedAt: new Date().toISOString(),
  });
};

/** DEV-ONLY. Sim harness fallback. Reactivate rewrites approvedAt. */
export const reactivateEnrollmentForUser = async (
  userId: string | null,
  enrollmentId: string,
): Promise<Enrollment> =>
  transition(userId, enrollmentId, 'active', {
    approvedAt: new Date().toISOString(),
    removedAt: null,
  });

export const readEnrollmentStoreForUser = (
  userId: string | null,
): EnrollmentStore => readStore(userId);

/** DEV-ONLY. Bulk-write N active enrollments — used by the simulation harness. */
export const seedActiveEnrollmentsForUser = (
  userId: string | null,
  records: Array<
    Pick<Enrollment, 'id' | 'classroomId' | 'accountId' | 'displayName'>
  >,
): Enrollment[] => {
  const current = readStore(userId);
  const nowIso = new Date().toISOString();
  const nextEntries = { ...current.entries };
  const created: Enrollment[] = [];
  for (const r of records) {
    const e: Enrollment = {
      id: r.id,
      classroomId: r.classroomId,
      accountId: r.accountId,
      displayName: r.displayName,
      status: 'active',
      joinedAt: nowIso,
      approvedAt: nowIso,
      removedAt: null,
    };
    nextEntries[e.id] = e;
    created.push(e);
  }
  const next: EnrollmentStore = { ...current, entries: nextEntries };
  writeStore(userId, next);
  return created;
};

/** DEV-ONLY. Hard-delete enrollments by id — bypasses transitions. */
export const removeEnrollmentsHardForUser = (
  userId: string | null,
  ids: string[],
): void => {
  const current = readStore(userId);
  let changed = false;
  const nextEntries = { ...current.entries };
  for (const id of ids) {
    if (id in nextEntries) {
      delete nextEntries[id];
      changed = true;
    }
  }
  if (!changed) return;
  writeStore(userId, { ...current, entries: nextEntries });
};

/** DEV-ONLY. Creates a pending row so the student banner is demonstrable pre-swap. */
export const seedPreviewPendingEnrollmentForUser = (
  userId: string | null,
  input: { classroomId: string; accountId: string; displayName: string },
): Enrollment => {
  const current = readStore(userId);
  const already = Object.values(current.entries).find(
    (e) =>
      e.classroomId === input.classroomId && e.accountId === input.accountId,
  );
  if (already) return already;
  const record: Enrollment = {
    id: generateEnrollmentId(),
    classroomId: input.classroomId,
    accountId: input.accountId,
    displayName: input.displayName,
    status: 'pending',
    joinedAt: new Date().toISOString(),
    approvedAt: null,
    removedAt: null,
  };
  const next: EnrollmentStore = {
    ...current,
    entries: { ...current.entries, [record.id]: record },
  };
  writeStore(userId, next);
  return record;
};

// -----------------------------------------------------------------------------
// Production hook — React Query + REST
// -----------------------------------------------------------------------------

export interface UseEnrollments {
  enrollments: Enrollment[];
  pending: Enrollment[];
  active: Enrollment[];
  removed: Enrollment[];
  myEnrollment: Enrollment | undefined;
  getEnrollment: (enrollmentId: string) => Enrollment | undefined;
  approve: (enrollmentId: string) => Promise<Enrollment>;
  deny: (enrollmentId: string) => Promise<Enrollment>;
  kick: (enrollmentId: string) => Promise<Enrollment>;
  reactivate: (enrollmentId: string) => Promise<Enrollment>;
  isLoading: boolean;
  /** True once the enrollments query has fetched successfully (not merely
   *  stopped loading — an errored query is `!isLoading` but NOT `isSuccess`). */
  isSuccess: boolean;
}

const dateToIso = (v: Date | string | null | undefined): string | null =>
  v == null ? null : typeof v === 'string' ? v : v.toISOString();

const normalizeEnrollment = (raw: {
  id: string;
  classroomId: string;
  accountId: string;
  displayName: string;
  status: 'pending' | 'active' | 'removed';
  joinedAt: Date | string;
  approvedAt: Date | string | null;
  removedAt: Date | string | null;
}): Enrollment => ({
  id: raw.id,
  classroomId: raw.classroomId,
  accountId: raw.accountId,
  displayName: raw.displayName,
  status: raw.status,
  joinedAt: dateToIso(raw.joinedAt) ?? new Date().toISOString(),
  approvedAt: dateToIso(raw.approvedAt),
  removedAt: dateToIso(raw.removedAt),
});

export const useEnrollments = (classroomId: string): UseEnrollments => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const accountId = me?.id ?? null;

  const queryKey = ['classroom', classroomId, 'enrollments', 'all'] as const;

  const { data = [], isLoading, isSuccess } = useQuery({
    queryKey,
    queryFn: async () => {
      const raw = await musicAtlas.classrooms.getClassroomsByIdEnrollments({
        id: classroomId,
        status: 'all',
      });
      return (raw as Array<Parameters<typeof normalizeEnrollment>[0]>).map(
        normalizeEnrollment,
      );
    },
    enabled: Boolean(classroomId),
  });

  const patchMutation = useMutation({
    mutationFn: async (input: {
      enrollmentId: string;
      status: 'active' | 'removed';
    }) => {
      const raw =
        await musicAtlas.classrooms.patchClassroomsByIdEnrollmentsByEnrollmentId(
          classroomId,
          input.enrollmentId,
          { status: input.status },
        );
      return normalizeEnrollment(
        raw as Parameters<typeof normalizeEnrollment>[0],
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Enrollment[]>(queryKey, (prev) =>
        (prev ?? []).map((e) => (e.id === updated.id ? updated : e)),
      );
    },
  });

  const patch = useCallback(
    async (enrollmentId: string, status: 'active' | 'removed') =>
      patchMutation.mutateAsync({ enrollmentId, status }),
    [patchMutation],
  );

  const approve = useCallback(
    (enrollmentId: string) => patch(enrollmentId, 'active'),
    [patch],
  );
  const deny = useCallback(
    (enrollmentId: string) => patch(enrollmentId, 'removed'),
    [patch],
  );
  const kick = useCallback(
    (enrollmentId: string) => patch(enrollmentId, 'removed'),
    [patch],
  );
  const reactivate = useCallback(
    (enrollmentId: string) => patch(enrollmentId, 'active'),
    [patch],
  );

  const pending = data.filter((e) => e.status === 'pending');
  const active = data.filter((e) => e.status === 'active');
  const removed = data.filter((e) => e.status === 'removed');
  const myEnrollment = accountId
    ? data.find((e) => e.accountId === accountId)
    : undefined;

  const getEnrollment = useCallback(
    (enrollmentId: string) => data.find((e) => e.id === enrollmentId),
    [data],
  );

  return {
    enrollments: data,
    pending,
    active,
    removed,
    myEnrollment,
    getEnrollment,
    approve,
    deny,
    kick,
    reactivate,
    isLoading,
    isSuccess,
  };
};
