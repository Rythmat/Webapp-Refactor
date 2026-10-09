import type { UserKey } from '@/lib/local-store/userScope';

// ── This tab's draft (milestone 1.4, decisions E2 and E4) ──────────────────
//
// sessionStorage remembers which draft this tab has open, so a refresh (or
// a crash and reopen of the tab) resumes the same draft, and a duplicated
// tab, which copies sessionStorage, finds it locked and forks. The pointer
// names its owner: sessionStorage survives the Auth0 sign-out round trip in
// the same tab, so a pointer for another user is ignored (the caller
// compares userKey).
//
// Junk-tolerant: an unreadable value reads as no pointer. Never throws.
// No store, codec or React imports: the Studio dashboard loads this.

/** The sessionStorage key holding this tab's pointer. */
export const ACTIVE_DRAFT_KEY = 'musicAtlas:daw:activeDraft';

export interface ActiveDraftPointer {
  draftId: string;
  userKey: UserKey;
}

function sessionStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    // Reading it throws where storage is refused (a sandboxed frame).
    return null;
  }
}

const isId = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

/** This tab's pointer, or null when there is none (or it is junk). */
export function readActiveDraft(
  storage: Storage | null = sessionStore(),
): ActiveDraftPointer | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ACTIVE_DRAFT_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { draftId, userKey } = parsed as Record<string, unknown>;
    return isId(draftId) && isId(userKey) ? { draftId, userKey } : null;
  } catch {
    return null;
  }
}

/** Point this tab at a draft, or (null) at none. */
export function writeActiveDraft(
  pointer: ActiveDraftPointer | null,
  storage: Storage | null = sessionStore(),
): void {
  if (!storage) return;
  try {
    if (pointer === null || !isId(pointer.draftId) || !isId(pointer.userKey)) {
      storage.removeItem(ACTIVE_DRAFT_KEY);
      return;
    }
    storage.setItem(
      ACTIVE_DRAFT_KEY,
      JSON.stringify({ draftId: pointer.draftId, userKey: pointer.userKey }),
    );
  } catch (err) {
    console.warn('[drafts] Remembering this tab’s draft failed:', err);
  }
}
