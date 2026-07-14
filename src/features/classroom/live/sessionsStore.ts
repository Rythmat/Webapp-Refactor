/**
 * sessionsStore — pure store + frozen envelope for classroom live sessions.
 *
 * Sprint 4 body: local CustomEvent + storage broadcast mocks realtime. Every
 * mutation flows through applyMessageForUser so the mock and future PartyKit
 * server take the exact same `SessionMessage` envelope. Ryan's PartyKit
 * handler in Sprint 5 binds to this shape 1:1; the `v: 1` version tag lets
 * us bump on divergence.
 */
import type { PhaseKey } from '../phases';
import type { InteractionResponsePayload } from '../types';

export const STORAGE_KEY = 'ma-teacher:sessions:v1';
export const SCHEMA_VERSION = 1;
export const EVENT_CHANNEL = 'ma-teacher:sessions:event:v1';

export type SessionMode = 'teacher_paced' | 'student_paced';
export type SessionStatus = 'live' | 'ended';
export type SessionRole = 'teacher' | 'student' | 'projector';

export interface SessionState {
  sessionId: string;
  classroomId: string;
  publishedDayId: string;
  teacherId: string;
  currentPhase: PhaseKey;
  mode: SessionMode;
  locked: boolean;
  sharedInteractionIds: string[];
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
}

export interface NavBody {
  kind: 'nav';
  phase: PhaseKey;
}
export interface LockBody {
  kind: 'lock';
  locked: boolean;
}
export interface ShareBody {
  kind: 'share';
  interactionId: string;
  on: boolean;
}
export interface ModeBody {
  kind: 'mode';
  mode: SessionMode;
}
export interface EndBody {
  kind: 'end';
}
export interface ResponseBody {
  kind: 'response';
  interactionId: string;
  enrollmentId: string;
  payload: InteractionResponsePayload;
}
export interface StateSyncBody {
  kind: 'state';
  state: SessionState;
}

export type SessionMessageBody =
  | NavBody
  | LockBody
  | ShareBody
  | ModeBody
  | EndBody
  | ResponseBody
  | StateSyncBody;

export interface SessionMessage {
  v: 1;
  sessionId: string;
  from: SessionRole;
  fromEnrollmentId?: string;
  ts: string;
  seq: number;
  body: SessionMessageBody;
}

export type ResponsesForSession = Record<
  string,
  Record<string, InteractionResponsePayload>
>;

export interface SessionStore {
  schemaVersion: number;
  sessions: Record<string, SessionState>;
  responses: Record<string, ResponsesForSession>;
  seq: Record<string, number>;
}

const EMPTY_STORE: SessionStore = {
  schemaVersion: SCHEMA_VERSION,
  sessions: {},
  responses: {},
  seq: {},
};

const isBrowser = typeof window !== 'undefined';

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

const readStore = (userId: string | null | undefined): SessionStore => {
  if (!isBrowser) return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as SessionStore;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) {
      window.localStorage.setItem(`${keyFor(userId)}.bak`, raw);
      return EMPTY_STORE;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      sessions: parsed.sessions ?? {},
      responses: parsed.responses ?? {},
      seq: parsed.seq ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
};

const writeStore = (
  userId: string | null | undefined,
  store: SessionStore,
  broadcast?: SessionMessage,
): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(store));
    window.dispatchEvent(new Event(`${keyFor(userId)}:changed`));
    if (broadcast) {
      window.dispatchEvent(
        new CustomEvent<SessionMessage>(EVENT_CHANNEL, { detail: broadcast }),
      );
    }
  } catch {
    // Quota / privacy mode — silently no-op.
  }
};

const generateSessionId = (): string => {
  const rand = Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, '0');
  return `local-sess-${Date.now().toString(36)}-${rand}`;
};

const nextSeq = (store: SessionStore, sessionId: string): number => {
  const prev = store.seq[sessionId] ?? 0;
  return prev + 1;
};

export const readSessionsStoreForUser = (userId: string | null): SessionStore =>
  readStore(userId);

export const getActiveSessionForClassroomForUser = (
  userId: string | null,
  classroomId: string,
): SessionState | undefined => {
  const store = readStore(userId);
  for (const s of Object.values(store.sessions)) {
    if (s.classroomId === classroomId && s.status === 'live') return s;
  }
  return undefined;
};

export interface StartSessionInput {
  classroomId: string;
  publishedDayId: string;
  teacherId?: string;
  initialPhase?: PhaseKey;
}

export const startSessionForUser = (
  userId: string | null,
  input: StartSessionInput,
): SessionState => {
  const current = readStore(userId);
  const nowIso = new Date().toISOString();
  const state: SessionState = {
    sessionId: generateSessionId(),
    classroomId: input.classroomId,
    publishedDayId: input.publishedDayId,
    teacherId: input.teacherId ?? userId ?? 'local-teacher',
    currentPhase: input.initialPhase ?? 'connectRegulate',
    mode: 'teacher_paced',
    locked: false,
    sharedInteractionIds: [],
    status: 'live',
    startedAt: nowIso,
    updatedAt: nowIso,
  };
  const next: SessionStore = {
    ...current,
    sessions: { ...current.sessions, [state.sessionId]: state },
    seq: { ...current.seq, [state.sessionId]: 0 },
  };
  writeStore(userId, next);
  return state;
};

export const endSessionForUser = (
  userId: string | null,
  sessionId: string,
): void => {
  const current = readStore(userId);
  const existing = current.sessions[sessionId];
  if (!existing || existing.status === 'ended') return;
  const nowIso = new Date().toISOString();
  const state: SessionState = {
    ...existing,
    status: 'ended',
    locked: false,
    sharedInteractionIds: [],
    endedAt: nowIso,
    updatedAt: nowIso,
  };
  const next: SessionStore = {
    ...current,
    sessions: { ...current.sessions, [sessionId]: state },
  };
  writeStore(userId, next);
};

const applyBodyToState = (
  state: SessionState,
  body: SessionMessageBody,
  nowIso: string,
): SessionState => {
  switch (body.kind) {
    case 'nav':
      return { ...state, currentPhase: body.phase, updatedAt: nowIso };
    case 'lock':
      return { ...state, locked: body.locked, updatedAt: nowIso };
    case 'share': {
      const has = state.sharedInteractionIds.includes(body.interactionId);
      const sharedInteractionIds = body.on
        ? has
          ? state.sharedInteractionIds
          : [...state.sharedInteractionIds, body.interactionId]
        : state.sharedInteractionIds.filter((id) => id !== body.interactionId);
      return { ...state, sharedInteractionIds, updatedAt: nowIso };
    }
    case 'mode':
      return { ...state, mode: body.mode, updatedAt: nowIso };
    case 'end':
      return {
        ...state,
        status: 'ended',
        locked: false,
        sharedInteractionIds: [],
        endedAt: nowIso,
        updatedAt: nowIso,
      };
    case 'state':
      return { ...body.state, updatedAt: nowIso };
    case 'response':
      return { ...state, updatedAt: nowIso };
  }
};

const roleCanSend = (role: SessionRole, body: SessionMessageBody): boolean => {
  if (role === 'projector') return false;
  if (role === 'student') return body.kind === 'response';
  return body.kind !== 'response';
};

export interface ApplyMessageInput {
  sessionId: string;
  from: SessionRole;
  fromEnrollmentId?: string;
  body: SessionMessageBody;
}

export const applyMessageForUser = (
  userId: string | null,
  input: ApplyMessageInput,
): SessionMessage | null => {
  if (!roleCanSend(input.from, input.body)) return null;
  const current = readStore(userId);
  const existing = current.sessions[input.sessionId];
  if (!existing) return null;
  const nowIso = new Date().toISOString();
  const seq = nextSeq(current, input.sessionId);

  let nextSessions = current.sessions;
  let nextResponses = current.responses;
  if (input.body.kind === 'response') {
    const forSession: ResponsesForSession = {
      ...(current.responses[input.sessionId] ?? {}),
    };
    const bag = { ...(forSession[input.body.enrollmentId] ?? {}) };
    bag[input.body.interactionId] = input.body.payload;
    forSession[input.body.enrollmentId] = bag;
    nextResponses = { ...current.responses, [input.sessionId]: forSession };
  } else {
    nextSessions = {
      ...current.sessions,
      [input.sessionId]: applyBodyToState(existing, input.body, nowIso),
    };
  }

  const nextStore: SessionStore = {
    ...current,
    sessions: nextSessions,
    responses: nextResponses,
    seq: { ...current.seq, [input.sessionId]: seq },
  };

  const msg: SessionMessage = {
    v: 1,
    sessionId: input.sessionId,
    from: input.from,
    fromEnrollmentId: input.fromEnrollmentId,
    ts: nowIso,
    seq,
    body: input.body,
  };
  writeStore(userId, nextStore, msg);
  return msg;
};

export const startSessionFromDayForUser = (
  userId: string | null,
  input: StartSessionInput,
): SessionState => startSessionForUser(userId, input);

/**
 * Prune response bags for a list of enrollment ids in one session. Used by
 * the dev-mode simulation harness on Clear; safe to call in prod but has no
 * consumer outside sim today.
 */
export const deleteResponsesForEnrollmentsForUser = (
  userId: string | null,
  sessionId: string,
  enrollmentIds: string[],
): void => {
  if (enrollmentIds.length === 0) return;
  const current = readStore(userId);
  const forSession = current.responses[sessionId];
  if (!forSession) return;
  const nextForSession: ResponsesForSession = { ...forSession };
  let changed = false;
  for (const id of enrollmentIds) {
    if (id in nextForSession) {
      delete nextForSession[id];
      changed = true;
    }
  }
  if (!changed) return;
  const nextStore: SessionStore = {
    ...current,
    responses: { ...current.responses, [sessionId]: nextForSession },
  };
  writeStore(userId, nextStore);
};
