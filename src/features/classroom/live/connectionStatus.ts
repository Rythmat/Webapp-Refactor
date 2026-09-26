/**
 * Session transport status — the single source of truth for "can students
 * actually join this?".
 *
 * There are two different questions in play and they used to share one word:
 *
 *   - `ConnectionStatus` (sessionSocketController) is SOCKET truth: is the
 *     websocket open right now?
 *   - `SessionTransportStatus` (here) is SESSION truth: is this a real server
 *     session at all?
 *
 * Conflating them is how a practice session came to report "connected". A
 * `local-sess-` id has no server and no socket, so the old code short-circuited
 * the socket path and set `connected` — a green pill on the teacher's dashboard
 * for a session no student on earth could join. That is the exact failure the
 * "no silent mocks" rule exists to prevent: a teacher standing in front of a
 * class must be able to tell a working session from a practice one.
 *
 * `practice` is therefore a FIRST-CLASS status, not an error state. The local
 * mock is a legitimate, shipped offline mode; it simply has to say so.
 */
import type { ConnectionStatus } from './sessionSocketController';

export type SessionTransportStatus =
  /** Socket opening, or REST snapshot still in flight. */
  | 'connecting'
  /** Real server session, socket open. Students can join. */
  | 'connected'
  /** Real server session, socket down. Students may be stranded. */
  | 'offline'
  /** Local mock — this device only. No student can ever join. */
  | 'practice';

/**
 * Sessions started by the offline/dev mock (`startSessionForUser`) never exist
 * on the server. THE single owner of this predicate — `useSessionSync`, the
 * socket controller and the start hook all import it from here rather than
 * each re-deriving the prefix.
 */
export const LOCAL_SESSION_PREFIX = 'local-sess-';

export const isLocalSessionId = (sessionId: string): boolean =>
  sessionId.startsWith(LOCAL_SESSION_PREFIX);

/**
 * Map raw socket state onto session truth. A local session short-circuits to
 * `practice` BEFORE the socket status is consulted, which is what makes
 * "`local-sess-` reporting connected" unrepresentable rather than merely
 * unlikely.
 */
export const toTransportStatus = (
  sessionId: string,
  socket: ConnectionStatus,
): SessionTransportStatus => {
  if (isLocalSessionId(sessionId)) return 'practice';
  switch (socket) {
    case 'connecting':
      return 'connecting';
    case 'connected':
      return 'connected';
    case 'disconnected':
    case 'error':
      return 'offline';
  }
};

interface TransportCopy {
  label: string;
  /** One line naming the missing capability, for the badge's tooltip. */
  detail: string;
  tone: 'live' | 'pending' | 'warn' | 'practice';
}

/** Copy for every status. Exhaustive: adding a status is a compile error. */
export const TRANSPORT_COPY: Record<SessionTransportStatus, TransportCopy> = {
  connecting: {
    label: 'Connecting',
    detail: 'Opening the live connection…',
    tone: 'pending',
  },
  connected: {
    label: 'Live',
    detail: 'Connected. Students can join with the class code.',
    tone: 'live',
  },
  offline: {
    label: 'Offline',
    detail:
      'The live connection dropped. The lesson still works on this device, but student devices may not be receiving updates.',
    tone: 'warn',
  },
  practice: {
    label: 'Practice',
    detail:
      'Practice mode — this device only. No session was created on the server, so students cannot join.',
    tone: 'practice',
  },
};
