import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { CollabRole } from '@/daw/collab/types';
import type {
  PracticeLevel,
  PracticeOpenTrack,
} from '@/features/practiceTracks/generatePracticeTrack';
import type {
  DraftBaseline,
  DraftBody,
  DraftCloudRecord,
  DraftLock,
  DraftMeta,
  QuarantineRecord,
  UserKey,
} from '@/lib/studio-projects/drafts/types';

// ── openSession: the shared shapes (milestone 1.4) ─────────────────────────
//
// One state machine opens every Studio session: a boot link, a cold resume,
// a return to the editor, a rejoin, kept-work Restore, File ▸ New and Open,
// a Library template, a toolbar Join, leaving a room, the Song page. It
// reaches drafts, collab, auth and navigation only through SessionDeps
// (sessionDeps.ts), which DawApp registers.
//
// Type-only imports: the Studio dashboard loads the session store, which
// loads this.

/** Who asked for the open. */
export type OpenSource =
  | 'boot'
  | 'link'
  | 'menu'
  | 'dialog'
  | 'library'
  | 'toolbar'
  | 'toast'
  | 'panel'
  | 'leave-collab';

/** What to open. */
export type OpenIntent =
  | { kind: 'resume' }
  | { kind: 'draft'; draftId: string }
  | {
      kind: 'project';
      projectId: string;
      /**
       * Open the cloud copy as saved, even when this device has a draft of
       * it with changes or the live session already is it ('Open saved
       * version'). The draft is kept, never discarded.
       */
      fromCloud?: true;
    }
  | { kind: 'new' }
  | { kind: 'template'; templateId: string }
  | { kind: 'demo'; demoId: string }
  | { kind: 'tutorial'; tutorialId: string }
  | { kind: 'song'; songId: string; transpose: number /* integer -11..11 */ }
  | {
      kind: 'practiceMode';
      mode: string;
      rootParam: string | null;
      openTrack: PracticeOpenTrack;
      level: PracticeLevel;
    }
  | {
      kind: 'practiceGenre';
      genre: string;
      level: number;
      section: ActivitySectionId;
    }
  | { kind: 'jam' }
  | {
      kind: 'collab';
      /** A room code, or 'new' to create one. */
      code: string;
      host: boolean;
      jamImport: boolean;
      awaitHost: boolean;
    }
  | { kind: 'rejoin'; roomId: string; role: CollabRole };

export type OpenIntentKind = OpenIntent['kind'];

export interface OpenOptions {
  source: OpenSource;
  /** What happens to the outgoing work: kept when it has work ('auto'), or not. */
  keep?: 'auto' | 'discard';
  signal?: AbortSignal;
}

export type OpenPhase =
  | 'idle'
  | 'waiting'
  | 'validating'
  | 'preparing'
  | 'keeping'
  | 'switching'
  | 'loading'
  | 'baselining'
  | 'ready'
  | 'failed';

export type WaitingFor =
  | 'owner'
  | 'token'
  | 'plan'
  | 'host'
  | 'save'
  | 'take'
  | null;

export type OpenErrorKind =
  | 'not-found'
  | 'no-access'
  | 'signed-out'
  | 'offline'
  | 'server'
  | 'timeout'
  | 'session-ended'
  | 'room-full'
  | 'version'
  | 'storage'
  | 'unreadable'
  | 'busy'
  | 'in-room'
  | 'unknown';

export interface OpenError {
  kind: OpenErrorKind;
  /** Plain words: no ids, no HTTP codes. */
  message: string;
  retryable: boolean;
  surface: 'toast' | 'panel';
  cause?: unknown;
}

export type OpenOutcome =
  | {
      status: 'ready';
      draftId: string;
      kept: DraftMeta | null;
      forked: boolean;
      generation: number;
    }
  /** Nothing changed. */
  | { status: 'refused'; error: OpenError }
  /** Nothing changed: the lesson needs Premium. */
  | { status: 'upgrade'; lessonId: string }
  | { status: 'failed'; error: OpenError; restored: 'kept' | 'empty' }
  | { status: 'superseded' }
  | { status: 'cancelled' };

export interface SessionUser {
  userId: string | null;
  userKey: UserKey;
}

/** A draft an open has reserved: locked, or planned as a new id or a fork. */
export interface DraftClaim {
  draftId: string;
  userKey: UserKey;
  mode: 'new' | 'existing' | 'fork';
  /** For a fork: the draft it copies. */
  sourceDraftId?: string;
  lock: DraftLock | null;
}

export interface PreparedDraft {
  claim: DraftClaim;
  meta: DraftMeta;
  body: DraftBody;
  /**
   * The body (and the meta's own fields) came from the draft's mirror,
   * newer than the stored record, which storage couldn't take when the
   * claim reconciled it (full, failing). begin writes it over the record
   * and the status shows `error` until a write lands; the mirror stays
   * until then. The meta's writeSeq is still the stored record's.
   */
  fromMirror?: { writeSeq: number; error: 'quota' | 'unavailable' };
}

/** Things the cold boot found, told once the session is ready. */
export type BootNotice =
  | { kind: 'device-found'; count: number }
  | { kind: 'recovered'; name: string; draftId: string }
  | { kind: 'quarantined'; count: number }
  | { kind: 'unsaved-elsewhere'; draftId: string; name: string; at: number }
  | { kind: 'storage-unavailable' };

/**
 * The drafts side of an open. [draft-autosave] implements it
 * (getDraftSessionPort()). Only openSession and this port write
 * useSessionStore's draftId and userKey (adoptActiveDraft).
 */
export interface DraftSessionPort {
  activeDraftId(): string | null;
  /**
   * Once per page and user: legacy import, mirror reconcile (unlocked
   * drafts only), prune, lastSeenAt. `protect`: draft ids the open names
   * (a draft intent), kept from the prune while the prepare runs.
   */
  prepareUser(
    user: SessionUser,
    signal?: AbortSignal,
    opts?: { protect?: readonly string[] },
  ): Promise<BootNotice[]>;
  /** The pointer (same userKey, writable), else the newest unlocked session/migrated/fork draft by content time. */
  chooseResume(user: SessionUser): Promise<string | null>;
  /** The newest unlocked draft of `projectId` with work and no roomId. */
  findProjectDraft(
    user: SessionUser,
    projectId: string,
  ): Promise<DraftMeta | null>;
  /** Lock the target or plan a fork; no draftId = a new draft. */
  claim(
    user: SessionUser,
    target: { draftId?: string; boot: boolean },
    signal?: AbortSignal,
  ): Promise<DraftClaim>;
  /**
   * The claimed draft, validated (parse + isLoadableSession). For an
   * 'existing' claim it first reconciles that draft's own mirror under the
   * lock. Rejects 'not-found' | 'readonly' | 'corrupt' (quarantined).
   */
  read(claim: DraftClaim): Promise<PreparedDraft>;
  release(claim: DraftClaim): void;
  /** Pause, settle media (3 s), strict write; throws only when the live session has work. */
  flushOutgoing(reason: string): Promise<DraftMeta | null>;
  /** The kept meta, or null once removed; releases the lock. */
  retireOutgoing(policy: 'auto' | 'discard'): Promise<DraftMeta | null>;
  /** Sync: pointer + status; writes paused. */
  activate(claim: DraftClaim): void;
  /** Sync, after reset: decode; meta.projectId wins; a fork becomes '<name> (copy)' with no projectId. */
  apply(prepared: PreparedDraft): void;
  /** The first record, or adopt the claimed one; resumes writes. */
  begin(
    baseline: DraftBaseline,
    extras?: { roomId?: string },
  ): Promise<DraftMeta | null>;
  restoreMedia(meta: DraftMeta, generation: number): Promise<void>;
  unkeep(draftId: string): Promise<void>;
  /** null clears (File ▸ Delete of the open project). */
  patchCloud(
    draftId: string,
    patch: { projectId?: string | null; cloud?: DraftCloudRecord | null },
  ): Promise<void>;
  /** Re-runs the legacy import. */
  listDrafts(user: SessionUser): Promise<{
    mine: DraftMeta[];
    device: DraftMeta[];
    quarantined: QuarantineRecord[];
    locked: Set<string>;
  }>;
  /** Refuses the active draft (activeDraftId()) and locked ones. */
  deleteDraft(draftId: string): Promise<'deleted' | 'refused'>;
  claimDeviceDraft(
    user: SessionUser,
    draftId: string,
  ): Promise<DraftMeta | null>;
}

/** The collab calls an open makes (CollabProvider's, through DawApp). */
export interface CollabPort {
  leaveRoom(): void;
  createAndJoinRoom(): void;
  joinRoom(
    roomId: string,
    role?: CollabRole,
    partykitHost?: string,
    partykitRoom?: string,
    roomCode?: string,
  ): void;
  joinRoomById(roomId: string, role?: CollabRole): void;
  joinRoomAwaitingHost(roomId: string): void;
}
