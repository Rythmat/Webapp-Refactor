import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { UserKey } from '@/lib/local-store/userScope';
import type {
  OpenError,
  OpenIntent,
  OpenOutcome,
  OpenPhase,
  OpenSource,
  WaitingFor,
} from './types';

// ── Where the Studio session stands (milestone 1.4) ────────────────────────
//
// openSession's state: which open is running and in which phase, what the
// Opening overlay shows, the last outcome, and the session it settled on
// (its draft, owner, room and generation). The overlay, the error panel, the
// save chip and the Projects dialog read it; openSession writes it. Only
// openSession and the DraftSessionPort write draftId and userKey (a fork
// after a write conflict moves them through adoptActiveDraft).
//
// Kept apart from the editor store, which 1.4 adds no keys to. Type-only
// imports: the Studio dashboard loads this (the Continue tile).

export interface SessionState {
  phase: OpenPhase;
  intent: OpenIntent | null;
  source: OpenSource | null;
  /** The overlay's line ('Opening ‘X’…'). */
  label: string | null;
  waitingFor: WaitingFor;
  startedAt: number | null;
  overlay: 'none' | 'dim' | 'full';
  cancellable: boolean;
  error: OpenError | null;
  /** What the panel's Retry opens again. */
  retryIntent: OpenIntent | null;
  lastOutcome: OpenOutcome | null;
  /** The live session's draft and its owner. */
  draftId: string | null;
  userKey: UserKey | null;
  /**
   * The room the last open settled into, for the rejoin rule and the
   * overlay. NOT live membership: collab can leave a room without an open
   * (kicked, host left, room full on reconnect). Membership checks (E15:
   * disabling New, Open, the Library template and Join; refusing a link)
   * read the editor store's roomId.
   */
  roomId: string | null;
  /** The session generation the live session settled on. */
  generation: number;
  /** A Premium lesson the student was asked to upgrade for. */
  upgradeLessonId: string | null;
}

export const INITIAL_SESSION_STATE: Readonly<SessionState> = Object.freeze({
  phase: 'idle',
  intent: null,
  source: null,
  label: null,
  waitingFor: null,
  startedAt: null,
  overlay: 'none',
  cancellable: false,
  error: null,
  retryIntent: null,
  lastOutcome: null,
  draftId: null,
  userKey: null,
  roomId: null,
  generation: 0,
  upgradeLessonId: null,
});

export const useSessionStore: UseBoundStore<StoreApi<SessionState>> =
  create<SessionState>()(() => ({ ...INITIAL_SESSION_STATE }));

/** The phases of an open still in progress: waiting through baselining. */
export const BUSY_PHASES: readonly OpenPhase[] = Object.freeze([
  'waiting',
  'validating',
  'preparing',
  'keeping',
  'switching',
  'loading',
  'baselining',
]);

/** Whether `phase` is one of BUSY_PHASES. */
export function isBusyPhase(phase: OpenPhase): boolean {
  return BUSY_PHASES.includes(phase);
}

/** Whether an open is in progress now. */
export function isOpening(): boolean {
  return isBusyPhase(useSessionStore.getState().phase);
}

/**
 * Make `draftId` (owned by `userKey`) the live session's draft without an
 * open: the DraftSessionPort's fork after a write conflict, once it holds
 * the new draft's lock and has begun it.
 */
export function adoptActiveDraft(draftId: string, userKey: UserKey): void {
  const state = useSessionStore.getState();
  if (state.draftId === draftId && state.userKey === userKey) return;
  useSessionStore.setState({ draftId, userKey });
}
