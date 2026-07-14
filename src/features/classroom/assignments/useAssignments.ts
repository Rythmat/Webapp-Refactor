/**
 * useAssignments — production hook hits Ryan's REST assignments API.
 *
 * Sprint 7 swap: React Query drives everything —
 *   list  → GET  /classrooms/:cid/assignments
 *   create → POST /classrooms/:cid/assignments
 *   close  → PATCH /classrooms/:cid/assignments/:assignmentId { status:'closed' }
 *
 * Ryan's close is idempotent (200 on already-closed). Get-one isn't a
 * separate endpoint; getAssignment filters the list cache client-side.
 *
 * The `*ForUser` helpers remain as a dev-only localStorage fallback used by
 * the simulation harness and offline tests.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import {
  type Assignment,
  type AssignmentKind,
  type AssignmentStore,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from './assignmentsStore';

export {
  STORAGE_KEY,
  SCHEMA_VERSION,
  type Assignment,
  type AssignmentKind,
  type AssignmentStatus,
  type AtlasAssignmentRef,
} from './assignmentsStore';

// -----------------------------------------------------------------------------
// Dev-only localStorage store
// -----------------------------------------------------------------------------

const EMPTY_STORE: AssignmentStore = {
  schemaVersion: SCHEMA_VERSION,
  entries: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const readStore = (userId: string | null | undefined): AssignmentStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as AssignmentStore;
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
  store: AssignmentStore,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
  } catch {
    // No-op on quota / privacy mode.
  }
};

const generateAssignmentId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `local-asn-${Date.now().toString(36)}-${rand}`;
};

/** Kinds an author can pick today. Flip 'atlas' to true when the P5 wire lands. */
export const ASSIGNMENT_KIND_ENABLED: Record<AssignmentKind, boolean> = {
  day: true,
  atlas: false,
  instructions: true,
};

export interface CreateAssignmentInput {
  classroomId: string;
  title: string;
  kind: AssignmentKind;
  instructions?: string;
  publishedDayId?: string;
  dueAt?: string;
}

export interface PublishedDayResolver {
  getPublishedDay: (
    publishedDayId: string,
  ) => { classroomId: string } | undefined;
}

/** DEV-ONLY. Sim harness fallback. */
export const createAssignmentForUser = (
  userId: string | null,
  input: CreateAssignmentInput,
  resolver: PublishedDayResolver,
): Assignment => {
  if (!ASSIGNMENT_KIND_ENABLED[input.kind]) {
    throw new Error(`Assignment kind "${input.kind}" not enabled`);
  }
  if (input.kind === 'day') {
    if (!input.publishedDayId) {
      throw new Error('publishedDayId required for kind="day"');
    }
    const pd = resolver.getPublishedDay(input.publishedDayId);
    if (!pd) {
      throw new Error(`Unknown publishedDayId "${input.publishedDayId}"`);
    }
    if (pd.classroomId !== input.classroomId) {
      throw new Error('publishedDay belongs to a different classroom');
    }
  }
  if (input.kind === 'instructions') {
    if (!input.instructions?.trim()) {
      throw new Error('instructions required for kind="instructions"');
    }
  }
  const record: Assignment = {
    id: generateAssignmentId(),
    classroomId: input.classroomId,
    title: input.title.trim() || 'Untitled assignment',
    kind: input.kind,
    instructions:
      input.kind === 'instructions' ? input.instructions?.trim() : null,
    publishedDayId:
      input.kind === 'day' ? (input.publishedDayId ?? null) : null,
    atlasRef: null,
    dueAt: input.dueAt ?? null,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  const current = readStore(userId);
  const next: AssignmentStore = {
    ...current,
    entries: { ...current.entries, [record.id]: record },
  };
  writeStore(userId, next);
  return record;
};

/** DEV-ONLY. Sim harness fallback. */
export const closeAssignmentForUser = (
  userId: string | null,
  assignmentId: string,
): void => {
  const current = readStore(userId);
  const existing = current.entries[assignmentId];
  if (!existing || existing.status === 'closed') return;
  const next: AssignmentStore = {
    ...current,
    entries: {
      ...current.entries,
      [assignmentId]: {
        ...existing,
        status: 'closed',
        updatedAt: new Date().toISOString(),
      },
    },
  };
  writeStore(userId, next);
};

export const readAssignmentStoreForUser = (
  userId: string | null,
): AssignmentStore => readStore(userId);

// -----------------------------------------------------------------------------
// Production hook — React Query + REST
// -----------------------------------------------------------------------------

const dateToIso = (v: Date | string | null | undefined): string | null =>
  v == null ? null : typeof v === 'string' ? v : v.toISOString();

interface RawAssignment {
  id: string;
  classroomId: string;
  title: string;
  instructions: string | null;
  kind: 'day' | 'atlas' | 'instructions';
  publishedDayId: string | null;
  atlasRef: unknown;
  dueAt: Date | string | null;
  status: 'open' | 'closed';
  createdAt: Date | string;
}

const normalizeAssignment = (raw: RawAssignment): Assignment => ({
  id: raw.id,
  classroomId: raw.classroomId,
  title: raw.title,
  instructions: raw.instructions,
  kind: raw.kind,
  publishedDayId: raw.publishedDayId,
  atlasRef: (raw.atlasRef ?? null) as Assignment['atlasRef'],
  dueAt: dateToIso(raw.dueAt),
  status: raw.status,
  createdAt: dateToIso(raw.createdAt) ?? new Date().toISOString(),
});

export interface UseAssignments {
  assignments: Assignment[];
  getAssignment: (assignmentId: string) => Assignment | undefined;
  createAssignment: (input: CreateAssignmentInput) => Promise<Assignment>;
  closeAssignment: (assignmentId: string) => Promise<Assignment>;
  isLoading: boolean;
}

export const useAssignments = (classroomId: string): UseAssignments => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();
  useMe();

  const queryKey = ['classroom', classroomId, 'assignments'] as const;

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const raw =
        await musicAtlas.classrooms.getClassroomsByIdAssignments(classroomId);
      return (raw as RawAssignment[]).map(normalizeAssignment);
    },
    enabled: Boolean(classroomId),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      if (!ASSIGNMENT_KIND_ENABLED[input.kind]) {
        throw new Error(`Assignment kind "${input.kind}" not enabled`);
      }
      if (input.kind === 'day' && !input.publishedDayId) {
        throw new Error('publishedDayId required for kind="day"');
      }
      if (input.kind === 'instructions' && !input.instructions?.trim()) {
        throw new Error('instructions required for kind="instructions"');
      }
      const raw = await musicAtlas.classrooms.postClassroomsByIdAssignments(
        input.classroomId,
        {
          title: input.title.trim() || 'Untitled assignment',
          kind: input.kind,
          instructions:
            input.kind === 'instructions'
              ? (input.instructions?.trim() ?? null)
              : null,
          publishedDayId:
            input.kind === 'day' ? (input.publishedDayId ?? null) : null,
          dueAt: input.dueAt ?? null,
        },
      );
      return normalizeAssignment(raw as RawAssignment);
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Assignment[]>(queryKey, (prev) => {
        const filtered = (prev ?? []).filter((a) => a.id !== created.id);
        return [created, ...filtered];
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const raw =
        await musicAtlas.classrooms.patchClassroomsByIdAssignmentsByAssignmentId(
          classroomId,
          assignmentId,
          { status: 'closed' },
        );
      return normalizeAssignment(raw as RawAssignment);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Assignment[]>(queryKey, (prev) =>
        (prev ?? []).map((a) => (a.id === updated.id ? updated : a)),
      );
    },
  });

  const getAssignment = useCallback(
    (assignmentId: string) => data.find((a) => a.id === assignmentId),
    [data],
  );

  const createAssignment = useCallback(
    (input: CreateAssignmentInput) => createMutation.mutateAsync(input),
    [createMutation],
  );

  const closeAssignment = useCallback(
    (assignmentId: string) => closeMutation.mutateAsync(assignmentId),
    [closeMutation],
  );

  return {
    assignments: data,
    getAssignment,
    createAssignment,
    closeAssignment,
    isLoading,
  };
};
