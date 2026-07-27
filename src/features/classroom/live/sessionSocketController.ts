/**
 * sessionSocketController — pure factory owning the classroom_session
 * PartyKit lifecycle. Extracted from useSessionSync so the socket/REST
 * choreography can be tested without React or a real WebSocket.
 *
 * Everything React-adjacent (useState/useRef/useEffect) stays inside
 * `useSessionSync.ts`; this file has no React import. Collaborators
 * (`socketFactory`, `restClient`, `onStateChange`, `onStatusChange`,
 * `onResponse`) are all injected, so a test constructs the controller
 * with fakes and drives it manually.
 *
 * Contract (mirrors what useSessionSync did inline previously):
 *   • On `open()`: fire a REST GET to seed `stateRef`, then open the
 *     socket. If the socket delivers `hello` before the REST resolves,
 *     the REST snapshot is DROPPED (race guard from Sprint 5 verify).
 *   • Incoming socket messages route through `applySessionSocketMessage`
 *     (state) + `applySocketMessageForUser` (localStorage mirror).
 *   • `type:'response'` messages fan out via `onResponse` — the caller
 *     wires it to `recordMspResponseForUser` for the MSP inbox.
 *   • Teacher `sendNav/sendLock/sendShare/sendMode` all PATCH the full
 *     merged state field. `sendEnd` optimistically ends the local session
 *     BEFORE the PATCH so a caller can `sendEnd() + navigate()` without
 *     stranding SessionReportPage in a "still-live" state.
 *   • Student `sendResponse` POSTs to /responses.
 *   • Close codes 4001 (unauthorized) + 4002 (ended) both call
 *     `socket.close()` explicitly — this stops partysocket's default
 *     infinite reconnect loop.
 *   • Heartbeat pings every `heartbeatMs` (default 25s). `close()` clears
 *     the interval and calls `socket.close()`.
 */
import type { PhaseKey } from '../phases';
import type { InteractionResponsePayload } from '../types';
import {
  applySessionSocketMessage,
  applySocketMessageForUser,
  endSessionForUser,
  type ServerSessionSnapshot,
  type SessionMediaCommand,
  type SessionMode,
  type SessionPair,
  type SessionRole,
  type SessionShowcase,
  type SessionSocketMessage,
  type SessionState,
  type SessionTimer,
} from './sessionsStore';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

/** Structural minimum of the socket interface — matches what partysocket
 *  exposes AND what a hand-rolled fake needs to implement. */
export interface SocketLike {
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: SocketEventPayload) => void,
  ): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/** Minimal union of the event shapes we actually read from. */
export type SocketEventPayload =
  | { type: 'open' }
  | { type: 'message'; data: string }
  | { type: 'close'; code: number; reason?: string }
  | { type: 'error'; message?: string };

/** The narrow slice of the REST API the controller uses. Injectable so
 *  tests can pass a plain `vi.fn()`-backed object. */
export interface SessionRestClient {
  get(): Promise<ServerSessionSnapshot>;
  patch(payload: SessionPatchPayload): Promise<unknown>;
  postResponse(payload: {
    interactionId: string;
    payload: InteractionResponsePayload;
  }): Promise<unknown>;
}

export interface SessionStatePatch {
  phase: PhaseKey;
  /** Deck slide index; -1 = legacy phase-level nav. Always carried in the
   *  merged PATCH so a lock/mode/share change can't drop the nav position. */
  slideIndex: number;
  locked: boolean;
  mode: SessionMode;
  share: { interactionId: string; on: boolean } | null;
  /** Phase 3 — carried in every merged PATCH so a nav/lock change can't drop them. */
  pairs: SessionPair[] | null;
  showcase: SessionShowcase | null;
  /** Phase 4 — likewise carried on every merge. */
  timer: SessionTimer | null;
  media: SessionMediaCommand | null;
}

export interface SessionPatchPayload {
  state?: SessionStatePatch;
  status?: 'live' | 'ended';
}

/** Callback the controller fires whenever it sees a `type:'response'`
 *  message. Callers wire this to `recordMspResponseForUser` — kept as an
 *  injected callback so the controller has zero MSP-module coupling. */
export interface ResponseSocketMessage {
  type: 'response';
  at: string;
  interactionId: string;
  sessionId: string;
  enrollmentId: string;
  displayName?: string;
  payload: InteractionResponsePayload;
}

export interface SessionSocketControllerConfig {
  sessionId: string;
  role: SessionRole;
  userId: string | null;
  restClient: SessionRestClient;
  socketFactory: () => SocketLike;
  onStatusChange: (status: ConnectionStatus) => void;
  onResponse: (msg: ResponseSocketMessage) => void;
  /**
   * Optional: fires when `sendEnd`'s PATCH cannot be delivered after every
   * retry. Callers that do `sendEnd(); navigate(...)` fire-and-forget style
   * can install this to surface a "session may not have ended on the
   * server" toast + offer a manual retry. `sendEnd`'s returned Promise
   * carries the same error for awaiting callers.
   */
  onEndFailed?: (error: unknown) => void;
  /** Injectable clock — tests pin it; production defaults to `Date.now`. */
  now?: () => number;
  /** Heartbeat interval in ms. Default: 25 s. */
  heartbeatMs?: number;
  /**
   * Delays (ms) between `sendEnd` PATCH retries. Length = number of RETRIES
   * (attempts = length + 1). Default `[500, 2000]` → 3 total attempts over
   * ~2.5 s, covering typical transient network hiccups. Pass `[]` to
   * disable retries; pass `[0, 0]` in tests for instant retries.
   */
  endRetryDelaysMs?: number[];
}

export type SendEndResult = { ok: true } | { ok: false; error: unknown };

export interface SessionSocketController {
  open(): void;
  close(): void;
  sendNav(phase: PhaseKey, slideIndex?: number): void;
  sendLock(locked: boolean): void;
  sendShare(interactionId: string, on: boolean): void;
  sendMode(mode: SessionMode): void;
  /** Phase 3 — set the Studio pairing (teacher only). */
  sendPairs(pairs: SessionPair[] | null): void;
  /** Phase 3 — set / clear the featured project (teacher only). */
  sendShowcase(showcase: SessionShowcase | null): void;
  /** Phase 4 — start / clear the slide timer (teacher only). */
  sendTimer(timer: SessionTimer | null): void;
  /** Phase 4 — remote play/pause a media slide's video (teacher only). */
  sendMedia(slideId: string, action: 'play' | 'pause', atSec?: number): void;
  /**
   * Phase 4 — a student's local slide position (student-paced). Sent as an
   * ephemeral socket message (NOT a state PATCH); the server stamps the
   * enrollmentId from the socket auth and fans out to the teacher only.
   */
  sendPosition(slideIndex: number): void;
  /**
   * Optimistically ends the local cached session, then retries the PATCH
   * per `endRetryDelaysMs`. Returns a Promise callers can await for
   * success/error; fire-and-forget callers should install
   * `onEndFailed` on the config to surface a persistent failure toast.
   */
  sendEnd(): Promise<SendEndResult>;
  sendResponse(
    interactionId: string,
    payload: InteractionResponsePayload,
  ): void;
}

/** Close codes from the party server (see classroom_session/party.ts). */
const CLOSE_UNAUTHORIZED = 4001;
const CLOSE_ENDED = 4002;

const DEFAULT_HEARTBEAT_MS = 25_000;

const buildStatePatch = (
  base: SessionState,
  change: Partial<SessionStatePatch>,
): SessionStatePatch => ({
  phase: change.phase ?? base.currentPhase,
  slideIndex: change.slideIndex ?? base.slideIndex ?? -1,
  locked: change.locked ?? base.locked,
  mode: change.mode ?? base.mode,
  share:
    'share' in change
      ? (change.share ?? null)
      : base.sharedInteractionIds.length > 0
        ? { interactionId: base.sharedInteractionIds[0], on: true }
        : null,
  pairs: 'pairs' in change ? (change.pairs ?? null) : (base.pairs ?? null),
  showcase:
    'showcase' in change ? (change.showcase ?? null) : (base.showcase ?? null),
  timer: 'timer' in change ? (change.timer ?? null) : (base.timer ?? null),
  media: 'media' in change ? (change.media ?? null) : (base.media ?? null),
});

/**
 * Fold a just-built full-state patch back onto the SessionState snapshot so a
 * *second* send within the same tick builds on the first send's result rather
 * than the stale pre-send snapshot. Without this, two synchronous sends both
 * read the un-echoed `stateRef`: the timer auto-advance (`sendNav` then
 * `sendTimer(null)`) would emit a second PATCH carrying the STALE pre-advance
 * `slideIndex`, snapping the deck back a slide; and a quick media Play→Pause
 * would compute the SAME `cmdId` twice, so the projector swallows the second
 * command. The socket echo (`applyIncoming`) later overwrites with the
 * server-authoritative state, reconciling any divergence — this mirrors the
 * local-mock, which writes the store synchronously between sends.
 */
const mergePatchIntoState = (
  base: SessionState,
  patch: SessionStatePatch,
): SessionState => ({
  ...base,
  currentPhase: patch.phase,
  slideIndex: patch.slideIndex,
  locked: patch.locked,
  mode: patch.mode,
  sharedInteractionIds: patch.share?.on ? [patch.share.interactionId] : [],
  pairs: patch.pairs,
  showcase: patch.showcase,
  timer: patch.timer,
  media: patch.media,
});

export function createSessionSocketController(
  cfg: SessionSocketControllerConfig,
): SessionSocketController {
  const {
    sessionId,
    role,
    userId,
    restClient,
    socketFactory,
    onStatusChange,
    onResponse,
    onEndFailed,
    now = () => Date.now(),
    heartbeatMs = DEFAULT_HEARTBEAT_MS,
    endRetryDelaysMs = [500, 2000],
  } = cfg;

  // Snapshot of the last-known SessionState — used to build PATCH-merged
  // state fields for teacher sends.
  let stateRef: SessionState | null = null;
  let socket: SocketLike | null = null;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const applyIncoming = (msg: SessionSocketMessage): void => {
    // Localstorage-mirror + response bag.
    applySocketMessageForUser(userId, sessionId, msg);
    // Local in-memory snapshot ref for PATCH merges.
    const next = applySessionSocketMessage(stateRef, msg);
    if (next) stateRef = next;
    if (msg.type === 'response') onResponse(msg);
  };

  const start = async (): Promise<void> => {
    // Kick off the REST GET; if the socket wins the race and populates
    // stateRef via `hello`, drop the REST snapshot (server-authoritative
    // wins). See Sprint 5 adversarial verify: HIGH finding on stale REST
    // clobbering newer socket state.
    void (async () => {
      try {
        const snap = await restClient.get();
        if (closed) return;
        if (stateRef) return; // socket hello already landed.
        applyIncoming({ type: 'hello', session: snap, role });
      } catch {
        // Non-fatal — socket hello will populate.
      }
    })();

    onStatusChange('connecting');
    socket = socketFactory();

    socket.addEventListener('open', () => {
      onStatusChange('connected');
    });

    socket.addEventListener('message', (event) => {
      if (event.type !== 'message') return;
      let msg: SessionSocketMessage;
      try {
        msg = JSON.parse(event.data) as SessionSocketMessage;
      } catch {
        return;
      }
      applyIncoming(msg);
    });

    socket.addEventListener('close', (event) => {
      if (event.type !== 'close') return;
      // Terminal close codes: stop partysocket's default infinite reconnect
      // loop by explicitly calling close() — otherwise a 4001 will retry
      // forever against the same rejecting auth endpoint.
      if (event.code === CLOSE_ENDED) {
        onStatusChange('disconnected');
        socket?.close();
      } else if (event.code === CLOSE_UNAUTHORIZED) {
        onStatusChange('error');
        socket?.close();
      } else {
        onStatusChange('disconnected');
      }
    });

    socket.addEventListener('error', () => {
      onStatusChange('error');
    });

    heartbeatId = setInterval(() => {
      try {
        socket?.send(JSON.stringify({ type: 'ping', t: now() }));
      } catch {
        // Socket may be mid-close.
      }
    }, heartbeatMs);
  };

  const patchState = async (
    change: Partial<SessionStatePatch>,
  ): Promise<void> => {
    const base = stateRef;
    if (!base) return; // no baseline — drop
    const patch = buildStatePatch(base, change);
    // Optimistically advance the local snapshot BEFORE awaiting the REST round-
    // trip so a second synchronous send this tick merges on top of this one
    // (see mergePatchIntoState). The socket echo reconciles authoritatively.
    stateRef = mergePatchIntoState(base, patch);
    try {
      await restClient.patch({ state: patch });
    } catch {
      // Fire-and-forget; the socket echo will authoritatively update state.
    }
  };

  return {
    open() {
      void start();
    },
    close() {
      closed = true;
      if (heartbeatId != null) {
        clearInterval(heartbeatId);
        heartbeatId = null;
      }
      socket?.close();
      socket = null;
    },
    sendNav(phase, slideIndex) {
      void patchState({
        phase,
        ...(slideIndex !== undefined ? { slideIndex } : {}),
      });
    },
    sendLock(locked) {
      void patchState({ locked });
    },
    sendShare(interactionId, on) {
      if (!on) {
        // Guard the off-path: only fire share:null when the currently-
        // shared interaction id matches the one being turned off. A stale
        // UI button firing sendShare('B', false) while share is 'A'
        // would otherwise clobber A on the server. The server has a
        // single-share model today, so this guard is defensive against
        // stale clients + future multi-share.
        const currentShareId = stateRef?.sharedInteractionIds[0];
        if (currentShareId !== interactionId) return;
        void patchState({ share: null });
        return;
      }
      void patchState({ share: { interactionId, on: true } });
    },
    sendMode(mode) {
      void patchState({ mode });
    },
    sendPairs(pairs) {
      void patchState({ pairs });
    },
    sendShowcase(showcase) {
      void patchState({ showcase });
    },
    sendTimer(timer) {
      void patchState({ timer });
    },
    sendMedia(slideId, action, atSec) {
      void patchState({
        media: {
          slideId,
          action,
          ...(atSec !== undefined ? { atSec } : {}),
          cmdId: (stateRef?.media?.cmdId ?? 0) + 1,
        },
      });
    },
    sendPosition(slideIndex) {
      try {
        socket?.send(JSON.stringify({ type: 'position', slideIndex }));
      } catch {
        // Socket may be mid-close.
      }
    },
    async sendEnd(): Promise<SendEndResult> {
      // Optimistically end the local cached session BEFORE the PATCH.
      // Callers typically fire sendEnd() then navigate() back-to-back; the
      // socket echo may never reach this tab (unmount closes the socket
      // before the PATCH round-trips), and SessionReportPage reads directly
      // from useLocalSessionStore without opening its own socket. Without
      // this write, the report page would render "still open" forever.
      endSessionForUser(userId, sessionId);
      const attempts = endRetryDelaysMs.length + 1;
      let lastError: unknown;
      for (let i = 0; i < attempts; i++) {
        try {
          await restClient.patch({ status: 'ended' });
          return { ok: true };
        } catch (err) {
          lastError = err;
          const delay = endRetryDelaysMs[i];
          if (delay != null) {
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
      // Every retry exhausted. Local state stays ended (optimistic write is
      // deliberate — teacher chose to end, and reverting after they've
      // navigated away would be worse UX). Surface the failure to the
      // caller + optional callback so the UI can toast + offer manual retry.
      onEndFailed?.(lastError);
      return { ok: false, error: lastError };
    },
    sendResponse(interactionId, payload) {
      void restClient.postResponse({ interactionId, payload }).catch(() => {});
    },
  };
}

export { CLOSE_UNAUTHORIZED, CLOSE_ENDED, DEFAULT_HEARTBEAT_MS };
