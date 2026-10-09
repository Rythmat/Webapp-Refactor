import {
  classifyStudioFailure,
  type StudioFailureKind,
} from '@/lib/studio-projects/studioApiError';
import { isDraftStorageError } from '@/lib/studio-projects/drafts/types';
import type { OpenError, OpenErrorKind, OpenIntent } from './types';

// ── Why an open didn't happen, in words a student reads (milestone 1.4) ────
//
// Every OpenError carries a plain message (no ids, no HTTP codes), whether
// Retry can help, and where it shows: a toast when the link named nothing,
// was refused or the outgoing work couldn't be kept (nothing changed), the
// error panel (OpeningHost) for transient failures and for anything that
// failed after the session was switched.

/** Why a link was refused when the work it would replace can't be kept. */
export const KEEP_REFUSED =
  "Your current work couldn't be set aside on this device, so it's still open. Save it, then try again.";

export const IN_ROOM_REFUSED = 'Leave the shared session first';

export const BUSY_RECORDING = 'Finishing your recording, try again';

/** Where each kind shows when nothing has changed yet. */
const PANEL_KINDS: ReadonlySet<OpenErrorKind> = new Set<OpenErrorKind>([
  'offline',
  'server',
  'timeout',
  'signed-out',
  'session-ended',
  'room-full',
  'version',
]);

/** Kinds Retry can help with. */
const RETRYABLE_KINDS: ReadonlySet<OpenErrorKind> = new Set<OpenErrorKind>([
  'offline',
  'server',
  'timeout',
  'signed-out',
  'session-ended',
  'unknown',
]);

/** An OpenError of `kind`, shown where that kind shows. */
export function openError(
  kind: OpenErrorKind,
  message: string,
  extra: {
    cause?: unknown;
    surface?: 'toast' | 'panel';
    retryable?: boolean;
  } = {},
): OpenError {
  const error: OpenError = {
    kind,
    message,
    retryable: extra.retryable ?? RETRYABLE_KINDS.has(kind),
    surface: extra.surface ?? (PANEL_KINDS.has(kind) ? 'panel' : 'toast'),
  };
  if (extra.cause !== undefined) error.cause = extra.cause;
  return error;
}

/** What a fetch or build was for, so its failure can name it. */
export type OpenSubject =
  | 'project'
  | 'song'
  | 'practice'
  | 'demo'
  | 'draft'
  | 'session';

const NOUN: Record<OpenSubject, string> = {
  project: 'That project',
  song: 'That song',
  practice: 'That practice track',
  demo: 'That demo',
  draft: 'That draft',
  session: 'That session',
};

const OFFLINE = "You're offline. Check your connection, then try again.";
const SERVER =
  "The Studio server isn't answering right now. Try again in a moment.";
const TIMEOUT = 'Opening took too long. Try again.';
const SIGNED_OUT = 'Your sign-in has expired. Sign in again, then try again.';

/** No sign-in to open with: the panel, with Retry. */
export function signedOutError(): OpenError {
  return openError('signed-out', SIGNED_OUT);
}

/** The OpenError of a failed fetch or build, by what it was for. */
export function openErrorFromFailure(
  error: unknown,
  subject: OpenSubject,
): OpenError {
  if (isDraftStorageError(error)) return draftOpenError(error, subject);
  const kind: StudioFailureKind = classifyStudioFailure(error);
  const noun = NOUN[subject];
  switch (kind) {
    case 'offline':
      return openError('offline', OFFLINE, { cause: error });
    case 'server':
      return openError('server', SERVER, { cause: error });
    case 'timeout':
      return openError('timeout', TIMEOUT, { cause: error });
    case 'signed-out':
      return openError('signed-out', SIGNED_OUT, { cause: error });
    case 'no-access':
      return openError('no-access', `${noun} isn't shared with you.`, {
        cause: error,
      });
    case 'not-found':
      return openError('not-found', `${noun} could not be found.`, {
        cause: error,
      });
    default:
      return openError('unknown', `${noun} could not be opened.`, {
        cause: error,
        // Nothing changed: a toast, as pre-1.4 links said it.
        surface: 'toast',
        retryable: false,
      });
  }
}

/** A draft that couldn't be claimed or read. */
function draftOpenError(
  error: { kind: string },
  subject: OpenSubject,
): OpenError {
  const noun = NOUN[subject === 'session' ? 'draft' : subject];
  switch (error.kind) {
    case 'not-found':
      return openError('not-found', "That draft couldn't be found.", {
        cause: error,
      });
    case 'readonly':
      return openError(
        'unreadable',
        `${noun} was made by a newer version of Music Atlas. Refresh the page to open it.`,
        { cause: error },
      );
    case 'corrupt':
      return openError(
        'unreadable',
        `${noun} couldn't be opened. It's kept in Projects.`,
        { cause: error },
      );
    default:
      return openError('storage', KEEP_REFUSED, { cause: error });
  }
}

const ROOM_NOT_ACTIVE =
  'That session has ended, or its host hasn’t opened it yet.';

/**
 * A room that couldn't be joined (CollabProvider cleared the room and set
 * roomError): the panel, with the provider's own words where it gave them.
 */
export function roomOpenError(roomError: string | null): OpenError {
  const said = roomError?.trim() || null;
  if (said && /full/i.test(said)) {
    return openError('room-full', said, { retryable: true });
  }
  if (said && /update|being updated/i.test(said)) {
    return openError('version', said, { retryable: false });
  }
  if (said && /sign-in|sign in/i.test(said)) {
    return openError('signed-out', said);
  }
  return openError('session-ended', said ?? ROOM_NOT_ACTIVE);
}

/** The same error, shown on the panel (a failure after the switch). */
export function onPanel(error: OpenError): OpenError {
  return error.surface === 'panel' ? error : { ...error, surface: 'panel' };
}

/** The panel's title for an open of `intent`. */
export function openErrorTitle(intent: OpenIntent | null): string {
  switch (intent?.kind) {
    case 'collab':
    case 'rejoin':
      return 'Couldn’t join the session';
    case 'tutorial':
      return 'Couldn’t open the lesson';
    case 'practiceMode':
    case 'practiceGenre':
      return 'Couldn’t build your practice track';
    case 'song':
      return 'Couldn’t open the song';
    case 'resume':
    case 'draft':
      return 'Couldn’t open your work';
    default:
      return 'Couldn’t open the project';
  }
}

/** The error of an open whose wait (sign-in, plan) ran out. */
export function waitTimeoutError(
  waitingFor: 'owner' | 'token' | 'plan',
): OpenError {
  return openError(
    'timeout',
    waitingFor === 'plan'
      ? 'Checking your plan took too long. Try again.'
      : 'Signing you in took too long. Try again.',
  );
}

/** The error of an open whose collab join didn't finish in time. */
export const JOIN_TIMEOUT: OpenError = Object.freeze(
  openError('timeout', 'Joining the session took too long. Try again.'),
);
