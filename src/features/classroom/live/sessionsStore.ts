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

/** Phase 3 — a Studio collaboration group (pair or trio). */
export interface SessionPair {
  id: string;
  enrollmentIds: string[];
  /** The client that creates the collab room + invites the others. */
  hostEnrollmentId: string;
}

export interface ShowcaseArtifact {
  projectId: string;
  /** Collab room to open on the projector to feature it live. */
  roomId?: string;
  name: string;
}

/** Phase 3 — the currently-featured student project. */
export interface SessionShowcase {
  slideId: string;
  enrollmentId: string;
  displayName: string;
  artifact: ShowcaseArtifact;
}

/** Phase 4 — a running slide timer. `endsAt` is a Date.now() epoch-ms deadline
 *  (the TEACHER client fires the advancing nav at zero; the server never
 *  schedules). Fans out to all roles for the shared countdown. */
export interface SessionTimer {
  slideId: string;
  endsAt: number;
  durationSec: number;
  autoAdvance: boolean;
}

/** Phase 4 — remote play/pause for a media slide's video, projector-targeted.
 *  `cmdId` is a monotonic nonce so a re-applied state still re-fires the
 *  projector effect (and identical consecutive commands aren't swallowed). */
export interface SessionMediaCommand {
  slideId: string;
  action: 'play' | 'pause';
  atSec?: number;
  cmdId: number;
}

export interface SessionState {
  sessionId: string;
  classroomId: string;
  publishedDayId: string;
  teacherId: string;
  currentPhase: PhaseKey;
  /**
   * Index into the published Day's `deck.slides`. `-1` or absent = legacy
   * phase-granular navigation (no deck). Optional so pre-deck sessions in
   * localStorage stay valid without a schema bump — read via `?? -1`.
   */
  slideIndex?: number;
  mode: SessionMode;
  locked: boolean;
  sharedInteractionIds: string[];
  /**
   * Phase 3 — Studio pairing. Fans out to teacher + student, NEVER the
   * projector (carries enrollment ids — Rule 2). Optional/absent on legacy.
   */
  pairs?: SessionPair[] | null;
  /**
   * Phase 3 — the featured project. Fans out to ALL roles (a deliberate,
   * teacher-approved share, not a Rule 2 leak). Optional/absent on legacy.
   */
  showcase?: SessionShowcase | null;
  /** Phase 4 — the running slide timer (all roles). Absent/null = no timer. */
  timer?: SessionTimer | null;
  /** Phase 4 — the last projector media command (all roles). Absent/null = none. */
  media?: SessionMediaCommand | null;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
}

export interface NavBody {
  kind: 'nav';
  phase: PhaseKey;
  /** Slide-granular nav; absent = phase-level nav (legacy). */
  slideIndex?: number;
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
export interface PairsBody {
  kind: 'pairs';
  pairs: SessionPair[] | null;
}
export interface ShowcaseBody {
  kind: 'showcase';
  showcase: SessionShowcase | null;
}
export interface TimerBody {
  kind: 'timer';
  timer: SessionTimer | null;
}
export interface MediaBody {
  kind: 'media';
  slideId: string;
  action: 'play' | 'pause';
  atSec?: number;
}
/** Phase 4 — a student's local slide position (student-paced). Written to the
 *  `positions` side-map, never SessionState. */
export interface PositionBody {
  kind: 'position';
  enrollmentId: string;
  slideIndex: number;
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
  | PairsBody
  | ShowcaseBody
  | TimerBody
  | MediaBody
  | PositionBody
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
  /**
   * Phase 4 — per-student slide position for student-paced decks, keyed
   * sessionId → enrollmentId → slideIndex. A teacher-only side-map (like
   * `responses`), NOT a SessionState field: it never rides the state broadcast
   * (Rule 2 — position is identified) and never reaches the projector.
   */
  positions: Record<string, Record<string, number>>;
  seq: Record<string, number>;
}

const EMPTY_STORE: SessionStore = {
  schemaVersion: SCHEMA_VERSION,
  sessions: {},
  responses: {},
  positions: {},
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
      positions: parsed.positions ?? {},
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
  // Return the NEWEST live session (max startedAt; ISO-8601 compares lexically
  // in chronological order). `startSessionForUser` keeps at most one live per
  // classroom, but a legacy store may already hold several — always resolve to
  // the one the teacher is driving, never the oldest (which could be a stale,
  // still-locked session that would strand a joining student on the lock screen).
  let newest: SessionState | undefined;
  for (const s of Object.values(store.sessions)) {
    if (s.classroomId !== classroomId || s.status !== 'live') continue;
    if (!newest || s.startedAt > newest.startedAt) newest = s;
  }
  return newest;
};

export interface StartSessionInput {
  classroomId: string;
  publishedDayId: string;
  teacherId?: string;
  initialPhase?: PhaseKey;
  /** Start at a deck slide (0 for deck sessions); omit for legacy phase nav. */
  initialSlideIndex?: number;
}

export const startSessionForUser = (
  userId: string | null,
  input: StartSessionInput,
): SessionState => {
  const current = readStore(userId);
  const nowIso = new Date().toISOString();

  // One live session per classroom: end every existing `live` session for this
  // classroom before inserting the new one, so a stale record can't be resolved
  // by getActiveSessionForClassroomForUser (student/projector discovery). Mirror
  // endSessionForUser's cascade (locked:false, shares cleared) so an old locked
  // session can never strand a student on the lock screen. A single writeStore
  // below fires the `:changed` + `storage` events once — all readers converge.
  const sessions: Record<string, SessionState> = { ...current.sessions };
  for (const [id, s] of Object.entries(sessions)) {
    if (s.classroomId === input.classroomId && s.status === 'live') {
      sessions[id] = {
        ...s,
        status: 'ended',
        locked: false,
        sharedInteractionIds: [],
        endedAt: nowIso,
        updatedAt: nowIso,
      };
    }
  }

  const state: SessionState = {
    sessionId: generateSessionId(),
    classroomId: input.classroomId,
    publishedDayId: input.publishedDayId,
    teacherId: input.teacherId ?? userId ?? 'local-teacher',
    currentPhase: input.initialPhase ?? 'connectRegulate',
    slideIndex: input.initialSlideIndex ?? -1,
    mode: 'teacher_paced',
    locked: false,
    sharedInteractionIds: [],
    status: 'live',
    startedAt: nowIso,
    updatedAt: nowIso,
  };
  sessions[state.sessionId] = state;

  const next: SessionStore = {
    ...current,
    sessions,
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
    // Clear any running timer so the teacher's auto-advance effect can't fire a
    // late nav after the session has ended.
    timer: null,
    endedAt: nowIso,
    updatedAt: nowIso,
  };
  const next: SessionStore = {
    ...current,
    sessions: { ...current.sessions, [sessionId]: state },
  };
  writeStore(userId, next);
};

/**
 * End EVERY `live` session for a classroom (not just one) — the teacher's "End"
 * makes the whole class not-live. Because `getActiveSessionForClassroomForUser`
 * resolves the newest `live` record, ending a single session would let a stale
 * leftover keep the class showing as live everywhere; ending them all also
 * self-heals a store that accumulated duplicate live sessions. Mirrors the
 * cascade in `startSessionForUser` (locked:false, shares + timer cleared).
 */
export const endClassroomLiveSessionsForUser = (
  userId: string | null,
  classroomId: string,
): void => {
  const current = readStore(userId);
  const nowIso = new Date().toISOString();
  let changed = false;
  const sessions: Record<string, SessionState> = { ...current.sessions };
  for (const [id, s] of Object.entries(sessions)) {
    if (s.classroomId === classroomId && s.status === 'live') {
      sessions[id] = {
        ...s,
        status: 'ended',
        locked: false,
        sharedInteractionIds: [],
        timer: null,
        endedAt: nowIso,
        updatedAt: nowIso,
      };
      changed = true;
    }
  }
  // One write fires the `:changed` + `storage` events once → all reader tabs
  // (dashboard / projector / is-live signals) converge to not-live.
  if (changed) writeStore(userId, { ...current, sessions });
};

const applyBodyToState = (
  state: SessionState,
  body: SessionMessageBody,
  nowIso: string,
): SessionState => {
  switch (body.kind) {
    case 'nav':
      return {
        ...state,
        currentPhase: body.phase,
        ...(body.slideIndex !== undefined
          ? { slideIndex: body.slideIndex }
          : {}),
        updatedAt: nowIso,
      };
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
    case 'pairs':
      return { ...state, pairs: body.pairs, updatedAt: nowIso };
    case 'showcase':
      return { ...state, showcase: body.showcase, updatedAt: nowIso };
    case 'timer':
      return { ...state, timer: body.timer, updatedAt: nowIso };
    case 'media':
      return {
        ...state,
        media: {
          slideId: body.slideId,
          action: body.action,
          ...(body.atSec !== undefined ? { atSec: body.atSec } : {}),
          cmdId: (state.media?.cmdId ?? 0) + 1,
        },
        updatedAt: nowIso,
      };
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
    case 'position':
      // Side-map writes (responses / positions) don't mutate SessionState.
      return { ...state, updatedAt: nowIso };
  }
};

const roleCanSend = (role: SessionRole, body: SessionMessageBody): boolean => {
  if (role === 'projector') return false;
  if (role === 'student')
    return body.kind === 'response' || body.kind === 'position';
  return body.kind !== 'response' && body.kind !== 'position';
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
  // An ended session accepts nothing but a (re-)end — a late nav/lock/timer or a
  // straggling response must not resurrect or mutate it.
  if (existing.status === 'ended' && input.body.kind !== 'end') return null;
  const nowIso = new Date().toISOString();
  const seq = nextSeq(current, input.sessionId);

  let nextSessions = current.sessions;
  let nextResponses = current.responses;
  let nextPositions = current.positions;
  if (input.body.kind === 'response') {
    const forSession: ResponsesForSession = {
      ...(current.responses[input.sessionId] ?? {}),
    };
    const bag = { ...(forSession[input.body.enrollmentId] ?? {}) };
    bag[input.body.interactionId] = input.body.payload;
    forSession[input.body.enrollmentId] = bag;
    nextResponses = { ...current.responses, [input.sessionId]: forSession };
  } else if (input.body.kind === 'position') {
    const forSession = { ...(current.positions[input.sessionId] ?? {}) };
    forSession[input.body.enrollmentId] = input.body.slideIndex;
    nextPositions = { ...current.positions, [input.sessionId]: forSession };
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
    positions: nextPositions,
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

// ─── Socket message layer (Sprint 5+) ──────────────────────────────────────
// The classroom_session PartyKit party fans out server-persisted state
// changes as flat `{ type, ..., at }` messages. `applySessionSocketMessage`
// is a pure reducer over the local `SessionState`; `applySocketMessageForUser`
// wires it into the localStorage store so `useLocalSessionStore` /
// `SessionReportPage` / `useLiveResponses` all see socket-driven updates
// through their existing readers.

/** Session snapshot the party's `hello` message carries — matches
 *  `SessionSnapshot` in src/daw/collab/server/classroom_session/auth.ts. */
export interface ServerSessionSnapshot {
  id: string;
  classroomId: string;
  teacherId: string;
  publishedDayId: string;
  code: string;
  status: SessionStatus;
  state: unknown;
  startedAt: string;
  endedAt: string | null;
}

/** Parsed shape of the session's server-authoritative state field. */
interface ServerAuthoritativeState {
  phase?: PhaseKey;
  interactionIndex?: number;
  slideIndex?: number;
  locked?: boolean;
  mode?: SessionMode;
  share?: { interactionId: string; on: boolean } | null;
  pairs?: SessionPair[] | null;
  showcase?: SessionShowcase | null;
  timer?: SessionTimer | null;
  media?: SessionMediaCommand | null;
}

export type PresenceStateValue = 'joined' | 'active' | 'idle' | 'left';

/** Flat server envelope — matches every payload the party emits over the
 *  wire. Keep field names in strict sync with
 *  src/daw/collab/server/classroom_session/party.ts. */
export type SessionSocketMessage =
  | { type: 'hello'; session: ServerSessionSnapshot; role: SessionRole }
  | {
      type: 'nav';
      phase: string;
      interactionIndex: number;
      focusOpen: boolean;
      /** Deck slide index; absent on legacy phase-level nav. */
      slideIndex?: number;
    }
  | { type: 'lock'; on: boolean }
  | { type: 'share'; interactionId: string; on: boolean }
  | { type: 'mode'; value: SessionMode }
  | { type: 'pairs'; pairs: SessionPair[] | null }
  | { type: 'showcase'; showcase: SessionShowcase | null }
  | { type: 'timer'; timer: SessionTimer | null }
  | {
      type: 'media';
      slideId: string;
      action: 'play' | 'pause';
      atSec?: number;
      cmdId?: number;
    }
  | { type: 'end' }
  | {
      type: 'response';
      at: string;
      interactionId: string;
      sessionId: string;
      enrollmentId: string;
      displayName?: string;
      payload: InteractionResponsePayload;
    }
  | {
      type: 'presence';
      at: string;
      delta: Array<{ enrollmentId: string; state: PresenceStateValue }>;
    }
  | {
      type: 'position';
      at: string;
      sessionId: string;
      enrollmentId: string;
      slideIndex: number;
    }
  | { type: 'pong'; t: number; at: string };

/**
 * Pure reducer: fold a socket message into the local session state. Returns
 * the new state, or the input state unchanged when the message doesn't
 * affect it (e.g. `presence`, `pong`, `response`). Returns `null` only if
 * the input is null AND the message isn't a `hello` (nothing to fold into).
 */
export const applySessionSocketMessage = (
  state: SessionState | null,
  msg: SessionSocketMessage,
): SessionState | null => {
  const nowIso = new Date().toISOString();
  // An ended session is terminal locally — never let a straggling socket message
  // resurrect it (a reconnect `hello` still `live` on the server, a late nav,
  // etc.). Returning the same reference makes `applySocketMessageForUser` skip
  // the state write while still recording response/position side-maps.
  if (state?.status === 'ended' && msg.type !== 'end') return state;
  switch (msg.type) {
    case 'hello': {
      const snap = msg.session;
      const s = (snap.state ?? {}) as ServerAuthoritativeState;
      return {
        sessionId: snap.id,
        classroomId: snap.classroomId,
        publishedDayId: snap.publishedDayId,
        teacherId: snap.teacherId,
        currentPhase: (s.phase as PhaseKey | undefined) ?? 'connectRegulate',
        slideIndex: s.slideIndex ?? -1,
        mode: s.mode ?? 'teacher_paced',
        locked: s.locked ?? false,
        sharedInteractionIds:
          s.share?.on && s.share.interactionId ? [s.share.interactionId] : [],
        pairs: s.pairs ?? null,
        showcase: s.showcase ?? null,
        timer: s.timer ?? null,
        media: s.media ?? null,
        status: snap.status,
        startedAt: snap.startedAt,
        endedAt: snap.endedAt ?? undefined,
        updatedAt: nowIso,
      };
    }
    case 'nav':
      if (!state) return state;
      return {
        ...state,
        currentPhase: msg.phase as PhaseKey,
        ...(msg.slideIndex !== undefined ? { slideIndex: msg.slideIndex } : {}),
        updatedAt: nowIso,
      };
    case 'lock':
      if (!state) return state;
      return { ...state, locked: msg.on, updatedAt: nowIso };
    case 'share':
      if (!state) return state;
      return {
        ...state,
        sharedInteractionIds: msg.on ? [msg.interactionId] : [],
        updatedAt: nowIso,
      };
    case 'mode':
      if (!state) return state;
      return { ...state, mode: msg.value, updatedAt: nowIso };
    case 'pairs':
      if (!state) return state;
      return { ...state, pairs: msg.pairs, updatedAt: nowIso };
    case 'showcase':
      if (!state) return state;
      return { ...state, showcase: msg.showcase, updatedAt: nowIso };
    case 'timer':
      if (!state) return state;
      return { ...state, timer: msg.timer, updatedAt: nowIso };
    case 'media':
      if (!state) return state;
      return {
        ...state,
        media: {
          slideId: msg.slideId,
          action: msg.action,
          ...(msg.atSec !== undefined ? { atSec: msg.atSec } : {}),
          cmdId: msg.cmdId ?? (state.media?.cmdId ?? 0) + 1,
        },
        updatedAt: nowIso,
      };
    case 'end':
      if (!state) return state;
      return {
        ...state,
        status: 'ended',
        locked: false,
        sharedInteractionIds: [],
        endedAt: nowIso,
        updatedAt: nowIso,
      };
    case 'response':
    case 'presence':
    case 'position':
    case 'pong':
      // Response bag + positions map live in the store (handled by
      // applySocketMessageForUser). Presence + pong don't touch SessionState.
      return state;
  }
};

/**
 * Store-side mutator: update the localStorage-backed store from a socket
 * message. Handles both state changes (via `applySessionSocketMessage`)
 * and response-bag inserts (for `type:'response'`). Fires the same
 * `EVENT_CHANNEL` CustomEvent as the local dispatcher so `useLocalSessionStore`
 * re-renders in the same way. Broadcast is optional — set false when the
 * mutator itself is the socket handler (single writer) to avoid feedback.
 */
export const applySocketMessageForUser = (
  userId: string | null,
  sessionId: string,
  msg: SessionSocketMessage,
): void => {
  const current = readStore(userId);
  const existing = current.sessions[sessionId] ?? null;
  const nextState = applySessionSocketMessage(existing, msg);

  let nextResponses = current.responses;
  let nextPositions = current.positions;
  if (msg.type === 'response') {
    const forSession: ResponsesForSession = {
      ...(current.responses[sessionId] ?? {}),
    };
    const bag = { ...(forSession[msg.enrollmentId] ?? {}) };
    bag[msg.interactionId] = msg.payload;
    forSession[msg.enrollmentId] = bag;
    nextResponses = { ...current.responses, [sessionId]: forSession };
  } else if (msg.type === 'position') {
    const forSession = { ...(current.positions[sessionId] ?? {}) };
    forSession[msg.enrollmentId] = msg.slideIndex;
    nextPositions = { ...current.positions, [sessionId]: forSession };
  }

  // No-op if reducer returned nothing new AND no side-map write happened.
  const stateChanged = nextState !== existing;
  const responsesChanged = nextResponses !== current.responses;
  const positionsChanged = nextPositions !== current.positions;
  if (!stateChanged && !responsesChanged && !positionsChanged) return;

  const nextSessions = nextState
    ? { ...current.sessions, [sessionId]: nextState }
    : current.sessions;
  const nextStore: SessionStore = {
    ...current,
    sessions: nextSessions,
    responses: nextResponses,
    positions: nextPositions,
  };
  writeStore(userId, nextStore);
};

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
