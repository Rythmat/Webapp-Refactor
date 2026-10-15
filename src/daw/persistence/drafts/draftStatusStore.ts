import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { UserKey } from '@/lib/local-store/userScope';
import type { DraftErrorKind } from '@/lib/studio-projects/drafts/types';

// ── Where the live draft stands (milestone 1.4) ────────────────────────────
//
// The autosave's state for the save chip, the Projects dialog and the
// harness: which draft the live session writes to, whether this page's
// changes have reached it (pendingSeq counts changes, committedSeq the last
// one a write committed), any storage error, and the pending media.
// The autosave writes everything but `media`, which pendingMedia writes.
// Outside the editor store, which 1.4 adds no keys to.

/** Media bytes of clips and samples not in the cloud (pendingMedia). */
export interface PendingMediaStatus {
  /** Items whose bytes are only in memory so far. */
  pendingInMemory: number;
  /** Items stored in the draft's media. */
  stored: number;
  /** Items that couldn't be stored (budget, failure, bytes gone). */
  missing: number;
  /** Writes running now. */
  writing: number;
  /** Items being restored from storage now. */
  restoring: number;
  lastError: DraftErrorKind | null;
}

export interface DraftStatus {
  draftId: string | null;
  userKey: UserKey | null;
  adapter: 'indexeddb' | 'localstorage' | null;
  /** Page-local change counter: moves on every change the draft must take. */
  pendingSeq: number;
  /** The pendingSeq the last committed write covered. */
  committedSeq: number;
  committedAt: number | null;
  writing: boolean;
  paused: boolean;
  error: DraftErrorKind | null;
  mirror: 'none' | 'written' | 'too-big' | 'failed';
  /** Written by pendingMedia. */
  media: PendingMediaStatus;
  /** Set by the running writer: try the failed write again. */
  retry: (() => void) | null;
}

export const INITIAL_PENDING_MEDIA_STATUS: Readonly<PendingMediaStatus> =
  Object.freeze({
    pendingInMemory: 0,
    stored: 0,
    missing: 0,
    writing: 0,
    restoring: 0,
    lastError: null,
  });

export const INITIAL_DRAFT_STATUS: Readonly<DraftStatus> = Object.freeze({
  draftId: null,
  userKey: null,
  adapter: null,
  pendingSeq: 0,
  committedSeq: 0,
  committedAt: null,
  writing: false,
  paused: false,
  error: null,
  mirror: 'none',
  media: INITIAL_PENDING_MEDIA_STATUS,
  retry: null,
});

export const useDraftStatusStore: UseBoundStore<StoreApi<DraftStatus>> =
  create<DraftStatus>()(() => ({
    ...INITIAL_DRAFT_STATUS,
    media: { ...INITIAL_PENDING_MEDIA_STATUS },
  }));
