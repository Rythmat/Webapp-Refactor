/**
 * useAssignmentProgress / useMyAssignmentProgress — production hooks hit the
 * REST progress endpoints.
 *
 *   - useAssignmentProgress(classroomId, assignmentId)
 *       list  → GET  /classrooms/:cid/assignments/:aid/progress
 *       Backend doesn't ship `not_started` materialization; consumers
 *       backfill against the roster (`useEnrollments.active`).
 *   - useMyAssignmentProgress(classroomId, assignmentId, enrollmentId)
 *       setMyProgress  → POST /classrooms/:cid/assignments/:aid/progress
 *
 * NOTE: per the classroom-v2 contract audit, `/responses`, `/progress/me`,
 * session list, CSV export, and purge are NOT backend endpoints and will
 * not ship. `recordMyResponse` and the teacher-side response aggregation
 * therefore stay client-side (localStorage) — CSV exports build from
 * that local state via `exportCsv.ts`.
 *
 * `*ForUser` helpers remain as the dev-only localStorage fallback used by
 * the simulation harness.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import type { InteractionResponsePayload } from '../types';

export const STORAGE_KEY = 'ma-teacher:progress:v1';
export const SCHEMA_VERSION = 1;

const LOCAL_ENROLLMENT_ID = 'local-preview';

export type AssignmentProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'done'
  | 'abandoned';

export interface ArtifactRef {
  module: 'globe' | 'learn' | 'studio' | 'arcade';
  deepLink: string;
  preview?: string | null;
}

export interface AssignmentProgress {
  assignmentId: string;
  enrollmentId: string;
  status: AssignmentProgressStatus;
  artifactRef?: ArtifactRef | null;
  updatedAt: string;
}

type ResponsesForEnrollment = Record<string, InteractionResponsePayload>;
type ResponsesForAssignment = Record<string, ResponsesForEnrollment>;

export interface ProgressStore {
  schemaVersion: number;
  progress: Record<string, Record<string, AssignmentProgress>>;
  responses: Record<string, ResponsesForAssignment>;
}

const EMPTY_STORE: ProgressStore = {
  schemaVersion: SCHEMA_VERSION,
  progress: {},
  responses: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const readStore = (userId: string | null | undefined): ProgressStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as ProgressStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${keyFor(userId)}.bak`, raw);
      return EMPTY_STORE;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      progress: parsed.progress ?? {},
      responses: parsed.responses ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
};

const writeStore = (
  userId: string | null | undefined,
  store: ProgressStore,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
  } catch {
    // No-op.
  }
};

/** In offline mode there is no real enrollment — return the synthetic id. */
export const useLocalEnrollmentId = (): string => LOCAL_ENROLLMENT_ID;

// -----------------------------------------------------------------------------
// DEV-ONLY sim harness helpers
// -----------------------------------------------------------------------------

export interface SetMyProgressInput {
  status: AssignmentProgressStatus;
  artifactRef?: ArtifactRef;
}

export interface RecordMyResponseInput {
  interactionId: string;
  payload: InteractionResponsePayload;
}

export interface SetMyProgressForUserInput extends SetMyProgressInput {
  assignmentId: string;
  enrollmentId: string;
}

export interface RecordMyResponseForUserInput extends RecordMyResponseInput {
  assignmentId: string;
  enrollmentId: string;
}

/** DEV-ONLY. Sim harness fallback; production path is the REST mutation. */
export const setMyProgressForUser = (
  userId: string | null,
  input: SetMyProgressForUserInput,
): AssignmentProgress => {
  const current = readStore(userId);
  const row: AssignmentProgress = {
    assignmentId: input.assignmentId,
    enrollmentId: input.enrollmentId,
    status: input.status,
    artifactRef: input.artifactRef ?? null,
    updatedAt: new Date().toISOString(),
  };
  const byAssignment = { ...(current.progress[input.assignmentId] ?? {}) };
  byAssignment[input.enrollmentId] = row;
  const next: ProgressStore = {
    ...current,
    progress: {
      ...current.progress,
      [input.assignmentId]: byAssignment,
    },
  };
  writeStore(userId, next);
  return row;
};

/** DEV-ONLY. Sim harness fallback. */
export const recordMyResponseForUser = (
  userId: string | null,
  input: RecordMyResponseForUserInput,
): void => {
  const current = readStore(userId);
  const byEnrollment = { ...(current.responses[input.assignmentId] ?? {}) };
  const bag = { ...(byEnrollment[input.enrollmentId] ?? {}) };
  bag[input.interactionId] = input.payload;
  byEnrollment[input.enrollmentId] = bag;
  const next: ProgressStore = {
    ...current,
    responses: {
      ...current.responses,
      [input.assignmentId]: byEnrollment,
    },
  };
  writeStore(userId, next);
};

export const readProgressStoreForUser = (
  userId: string | null,
): ProgressStore => readStore(userId);

const useLocalProgressStore = (userId: string | null): ProgressStore => {
  const [store, setStore] = useState<ProgressStore>(() => readStore(userId));

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

  return store;
};

// -----------------------------------------------------------------------------
// Production hooks — React Query + REST
// -----------------------------------------------------------------------------

const dateToIso = (v: Date | string | null | undefined): string =>
  v == null
    ? new Date().toISOString()
    : typeof v === 'string'
      ? v
      : v.toISOString();

interface RawProgress {
  assignmentId: string;
  enrollmentId: string;
  status: 'not_started' | 'in_progress' | 'done';
  artifactRef: unknown;
  updatedAt: Date | string;
}

const normalizeProgress = (raw: RawProgress): AssignmentProgress => ({
  assignmentId: raw.assignmentId,
  enrollmentId: raw.enrollmentId,
  status: raw.status,
  artifactRef: (raw.artifactRef ?? null) as ArtifactRef | null,
  updatedAt: dateToIso(raw.updatedAt),
});

export interface UseAssignmentProgress {
  progress: AssignmentProgress[];
  listProgress: (assignmentId: string) => AssignmentProgress[];
  countResponses: (assignmentId: string) => number;
  getResponsesByEnrollment: (
    assignmentId: string,
  ) => Record<string, Record<string, InteractionResponsePayload>>;
  isLoading: boolean;
}

/**
 * Teacher-side read of the progress rows for one assignment. Ryan's endpoint
 * returns only rows that have been touched; consumers backfill `not_started`
 * via the roster (see AssignmentProgressPage).
 *
 * The response aggregate (`countResponses`, `getResponsesByEnrollment`) still
 * reads localStorage until Ryan ships the response list endpoint.
 */
export const useAssignmentProgress = (
  classroomId?: string,
  assignmentId?: string,
): UseAssignmentProgress => {
  const musicAtlas = useMusicAtlas();
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const store = useLocalProgressStore(userId);

  const queryKey = [
    'classroom',
    classroomId,
    'assignment',
    assignmentId,
    'progress',
  ] as const;

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!classroomId || !assignmentId) return [] as AssignmentProgress[];
      const raw =
        await musicAtlas.classrooms.getClassroomsByIdAssignmentsByAssignmentIdProgress(
          classroomId,
          assignmentId,
        );
      return (raw as RawProgress[]).map(normalizeProgress);
    },
    enabled: Boolean(classroomId && assignmentId),
  });

  const listProgress = useCallback(
    (aid: string) => data.filter((p) => p.assignmentId === aid),
    [data],
  );

  const countResponses = useCallback(
    (aid: string) => {
      const byEnrollment = store.responses[aid] ?? {};
      let count = 0;
      for (const bag of Object.values(byEnrollment)) {
        count += Object.keys(bag).length;
      }
      return count;
    },
    [store.responses],
  );

  const getResponsesByEnrollment = useCallback(
    (aid: string) => store.responses[aid] ?? {},
    [store.responses],
  );

  return {
    progress: data,
    listProgress,
    countResponses,
    getResponsesByEnrollment,
    isLoading,
  };
};

export interface UseMyAssignmentProgress {
  myProgress: AssignmentProgress | undefined;
  myResponses: Record<string, InteractionResponsePayload>;
  setMyProgress: (input: SetMyProgressInput) => Promise<AssignmentProgress>;
  recordMyResponse: (input: RecordMyResponseInput) => void;
}

/**
 * Student-side hook. `setMyProgress` hits POST /progress. `recordMyResponse`
 * still writes localStorage — Ryan's async response endpoint isn't shipped
 * yet, so per-interaction answers persist locally only.
 */
export const useMyAssignmentProgress = (
  assignmentId: string,
  enrollmentId: string,
  classroomId?: string,
): UseMyAssignmentProgress => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const userId = me?.id ?? null;
  const store = useLocalProgressStore(userId);

  const progressQueryKey = [
    'classroom',
    classroomId,
    'assignment',
    assignmentId,
    'progress',
  ] as const;

  const { data: progressList = [] } = useQuery({
    queryKey: progressQueryKey,
    queryFn: async () => {
      if (!classroomId) return [] as AssignmentProgress[];
      const raw =
        await musicAtlas.classrooms.getClassroomsByIdAssignmentsByAssignmentIdProgress(
          classroomId,
          assignmentId,
        );
      return (raw as RawProgress[]).map(normalizeProgress);
    },
    enabled: Boolean(classroomId && assignmentId),
  });

  const myProgress = progressList.find((p) => p.enrollmentId === enrollmentId);
  const myResponses = store.responses[assignmentId]?.[enrollmentId] ?? {};

  const setMyProgressMutation = useMutation({
    mutationFn: async (input: SetMyProgressInput) => {
      if (!classroomId) {
        throw new Error(
          'classroomId required to POST progress; pass it as the third arg to useMyAssignmentProgress',
        );
      }
      const raw =
        await musicAtlas.classrooms.postClassroomsByIdAssignmentsByAssignmentIdProgress(
          classroomId,
          assignmentId,
          {
            status: input.status === 'abandoned' ? 'done' : input.status,
            artifactRef: input.artifactRef,
          },
        );
      return normalizeProgress(raw as RawProgress);
    },
    onSuccess: (row) => {
      queryClient.setQueryData<AssignmentProgress[]>(
        progressQueryKey,
        (prev) => {
          const filtered = (prev ?? []).filter(
            (p) => p.enrollmentId !== row.enrollmentId,
          );
          return [...filtered, row];
        },
      );
    },
  });

  const setMyProgress = useCallback(
    (input: SetMyProgressInput) => setMyProgressMutation.mutateAsync(input),
    [setMyProgressMutation],
  );

  const recordMyResponse = useCallback(
    (input: RecordMyResponseInput) => {
      // Responses stay client-side — no async response endpoint on the
      // backend (per the classroom-v2 contract audit).
      recordMyResponseForUser(userId, {
        ...input,
        assignmentId,
        enrollmentId,
      });
    },
    [userId, assignmentId, enrollmentId],
  );

  return { myProgress, myResponses, setMyProgress, recordMyResponse };
};
