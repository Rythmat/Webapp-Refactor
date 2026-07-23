/**
 * simulationStore — DEV-ONLY multi-user harness. Seeds N fake active
 * enrollments per session, auto-generates plausible responses across the
 * current phase's interactions, cleans up on demand. Every response is
 * dispatched through applyMessageForUser so the mock and Ryan's future
 * PartyKit server take the exact same envelope.
 *
 * `import.meta.env.DEV` gates callers; Vite constant-folds prod bundles to
 * eliminate this file from `dist/`.
 */
import {
  removeEnrollmentsHardForUser,
  seedActiveEnrollmentsForUser,
} from '../enrollments/useEnrollments';
import type { PhaseKey } from '../phases';
import type { PublishedDay } from '../publish/usePublishedDays';
import type { Interaction, InteractionResponsePayload } from '../types';
import {
  applyMessageForUser,
  deleteResponsesForEnrollmentsForUser,
} from './sessionsStore';

export const STORAGE_KEY = 'ma-teacher:sim-enrollments:v1';
export const SCHEMA_VERSION = 1;

export interface SimStore {
  schemaVersion: number;
  bySession: Record<string, string[]>;
}

const EMPTY_STORE: SimStore = {
  schemaVersion: SCHEMA_VERSION,
  bySession: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const readStore = (userId: string | null | undefined): SimStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as SimStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${keyFor(userId)}.bak`, raw);
      return EMPTY_STORE;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      bySession: parsed.bySession ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
};

const writeStore = (
  userId: string | null | undefined,
  store: SimStore,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
  } catch {
    // No-op on quota / privacy mode.
  }
};

export const readSimStoreForUser = (userId: string | null): SimStore =>
  readStore(userId);

const CHECK_IN_EMOJIS = ['🙂', '😀', '😐', '😕', '🤩'];

export const generatePlausibleResponse = (
  interaction: Interaction,
  seed: number,
): InteractionResponsePayload => {
  switch (interaction.type) {
    case 'choice': {
      const n = interaction.choice?.options.length ?? 1;
      const pick = ((seed % n) + n) % n;
      return {
        kind: 'choice',
        choices: interaction.choice?.multi ? [pick, (pick + 1) % n] : [pick],
      };
    }
    case 'text':
      return { kind: 'text', text: `Simulated student ${seed + 1} response` };
    case 'number': {
      const min = interaction.number?.min ?? 0;
      const max = interaction.number?.max ?? 10;
      const range = Math.max(1, max - min + 1);
      return { kind: 'number', value: min + (seed % range) };
    }
    case 'draw':
      return {
        kind: 'draw',
        strokes: [
          {
            points: [
              { x: 10, y: 10 + seed },
              { x: 40, y: 30 },
              { x: 60, y: 60 - seed },
            ],
          },
        ],
      };
    case 'check-in':
      return {
        kind: 'check-in',
        value: CHECK_IN_EMOJIS[((seed % 5) + 5) % 5],
      };
    case 'atlas':
      return {
        kind: 'atlas',
        module: interaction.atlas?.module ?? 'learn',
        activityRef: interaction.atlas?.activityRef ?? 'sim',
        result: { completion: true },
      };
    case 'showcase':
      return {
        kind: 'showcase',
        artifact: {
          projectId: `sim-project-${seed}`,
          roomId: `sim${(((seed % 1000) + 1000) % 1000).toString().padStart(3, '0')}`,
          name: `Sim Project ${seed}`,
        },
      };
  }
};

const generateSimEnrollmentId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `local-sim-${Date.now().toString(36)}-${rand}`;
};

export interface SeedStudentsInput {
  classroomId: string;
  count: number;
}

export interface SeedStudentsResult {
  createdEnrollmentIds: string[];
}

export const seedStudentsForUser = (
  userId: string | null,
  sessionId: string,
  input: SeedStudentsInput,
): SeedStudentsResult => {
  const current = readStore(userId);
  const already = current.bySession[sessionId] ?? [];
  const offset = already.length;
  const records = Array.from({ length: input.count }, (_, i) => {
    const id = generateSimEnrollmentId();
    const displayIndex = offset + i + 1;
    return {
      id,
      classroomId: input.classroomId,
      accountId: `sim-${id}`,
      displayName: `Sim Student ${displayIndex}`,
    };
  });
  seedActiveEnrollmentsForUser(userId, records);
  const createdEnrollmentIds = records.map((r) => r.id);
  const next: SimStore = {
    ...current,
    bySession: {
      ...current.bySession,
      [sessionId]: [...already, ...createdEnrollmentIds],
    },
  };
  writeStore(userId, next);
  return { createdEnrollmentIds };
};

export interface AutoRespondInput {
  sessionId: string;
  phaseKey: PhaseKey;
  publishedDay: PublishedDay;
  enrollmentIds: string[];
}

export const autoRespondForUser = (
  userId: string | null,
  input: AutoRespondInput,
): { dispatched: number } => {
  const cell = input.publishedDay.snapshot.cells[input.phaseKey];
  const interactions = cell?.presentation?.interactions ?? [];
  let dispatched = 0;
  input.enrollmentIds.forEach((enrollmentId, studentIdx) => {
    interactions.forEach((interaction, ixIdx) => {
      const payload = generatePlausibleResponse(
        interaction,
        studentIdx + ixIdx,
      );
      const msg = applyMessageForUser(userId, {
        sessionId: input.sessionId,
        from: 'student',
        fromEnrollmentId: enrollmentId,
        body: {
          kind: 'response',
          interactionId: interaction.id,
          enrollmentId,
          payload,
        },
      });
      if (msg) dispatched += 1;
    });
  });
  return { dispatched };
};

export const clearSimulationForUser = (
  userId: string | null,
  sessionId: string,
): { removedEnrollmentIds: string[] } => {
  const current = readStore(userId);
  const ids = current.bySession[sessionId] ?? [];
  if (ids.length === 0) return { removedEnrollmentIds: [] };
  removeEnrollmentsHardForUser(userId, ids);
  deleteResponsesForEnrollmentsForUser(userId, sessionId, ids);
  const nextBySession = { ...current.bySession };
  delete nextBySession[sessionId];
  writeStore(userId, { ...current, bySession: nextBySession });
  return { removedEnrollmentIds: ids };
};
