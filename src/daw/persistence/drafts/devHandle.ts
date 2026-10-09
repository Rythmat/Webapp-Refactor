import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { ACTIVE_DRAFT_KEY } from '@/lib/studio-projects/drafts/activeDraft';
import { MIRROR_PREFIX } from '@/lib/studio-projects/drafts/draftMirror';
import type { DraftBody, DraftMeta } from '@/lib/studio-projects/drafts/types';
import {
  DRAFT_DEBOUNCE_MS,
  DRAFT_MAX_WAIT_MS,
  draftStore,
  flushDraftNow,
  liveDraftId,
  whenDraftWritesSettled,
  type WriteOutcome,
} from './autosave';
import { useDraftStatusStore, type DraftStatus } from './draftStatusStore';
import { draftMediaRestoring } from './pendingMedia';

// ── window.__MA_DRAFTS__ (milestone 1.4, DEV_AUTH_BYPASS only) ─────────────
//
// What the browser harness reads and drives: the autosave's status, the
// stored drafts and bodies, a flush, and the constants it waits by. Folds
// out of production builds with DEV_AUTH_BYPASS.

export interface DraftDevHandle {
  status(): DraftStatus & { activeDraftId: string | null };
  list(userKey?: string): Promise<DraftMeta[]>;
  readBody(draftId: string): Promise<DraftBody | null>;
  /** Write the live session now; resolves when every queued write is done. */
  flush(): Promise<WriteOutcome>;
  mediaRestoring(): boolean;
  constants: {
    DEBOUNCE_MS: number;
    MAX_WAIT_MS: number;
    MIRROR_PREFIX: string;
    ACTIVE_DRAFT_KEY: string;
  };
}

export function createDraftDevHandle(): DraftDevHandle {
  return {
    status: () => ({
      ...useDraftStatusStore.getState(),
      activeDraftId: liveDraftId(),
    }),
    list: (userKey) => {
      const key = userKey ?? useDraftStatusStore.getState().userKey;
      return key ? draftStore().list(key) : Promise.resolve([]);
    },
    readBody: (draftId) => draftStore().readBody(draftId),
    flush: async () => {
      const outcome = await flushDraftNow();
      await whenDraftWritesSettled();
      return outcome;
    },
    mediaRestoring: draftMediaRestoring,
    constants: {
      DEBOUNCE_MS: DRAFT_DEBOUNCE_MS,
      MAX_WAIT_MS: DRAFT_MAX_WAIT_MS,
      MIRROR_PREFIX,
      ACTIVE_DRAFT_KEY,
    },
  };
}

/** Install window.__MA_DRAFTS__ (DEV_AUTH_BYPASS only). Returns the uninstall. */
export function installDraftDevHandle(): () => void {
  if (!DEV_AUTH_BYPASS || typeof window === 'undefined') return () => {};
  const w = window as unknown as { __MA_DRAFTS__?: DraftDevHandle };
  const handle = createDraftDevHandle();
  w.__MA_DRAFTS__ = handle;
  return () => {
    if (w.__MA_DRAFTS__ === handle) delete w.__MA_DRAFTS__;
  };
}
