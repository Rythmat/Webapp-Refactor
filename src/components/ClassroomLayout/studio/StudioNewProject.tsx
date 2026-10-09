import { History, Plus } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { useSessionStore } from '@/daw/session/sessionStore';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
  otherUserNamespaces,
  type UserKey,
} from '@/lib/local-store/userScope';
import { lockedDraftIds } from '@/lib/studio-projects/drafts/draftLock';
import { getDraftStore } from '@/lib/studio-projects/drafts/draftStore';
import {
  draftHasWork,
  draftIsReadOnly,
} from '@/lib/studio-projects/drafts/predicates';
import type {
  DraftMeta,
  DraftOrigin,
} from '@/lib/studio-projects/drafts/types';

const tileClass =
  'group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]';

/**
 * The newest session schema this build writes (SESSION_SCHEMA_VERSION in
 * the codec, which the dashboard must not load; a test keeps them equal).
 * A draft written in a newer schema opens read-only, so it isn't offered.
 */
export const DASHBOARD_SCHEMA_VERSION = 3;

/**
 * The pre-1.4 device-wide autosave (legacyImport's LEGACY_AUTOSAVE_KEY),
 * read only, never written: on the first visit after 1.4 ships the editor
 * hasn't imported it into drafts yet.
 */
export const LEGACY_AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

const UNTITLED = 'Untitled Project';

export interface ContinueTarget {
  /** Where the tile goes: the plain editor, or `?draft=<id>`. */
  href: string;
  name: string;
}

/** The legacy autosave's project name, when it holds a session. */
function legacyAutosaveName(): string | null {
  try {
    const raw = localStorage.getItem(LEGACY_AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: unknown } | null;
    const data = parsed?.data as { projectName?: unknown } | null | undefined;
    if (!data || typeof data !== 'object') return null;
    return typeof data.projectName === 'string' && data.projectName.trim()
      ? data.projectName.trim()
      : UNTITLED;
  } catch {
    return null;
  }
}

/**
 * Origins a plain editor boot resumes first, and the ones it falls back to
 * (draftSessionPort's chooseResume): the tile offers what resume would.
 */
const RESUME_ORIGINS: ReadonlySet<DraftOrigin> = new Set([
  'session',
  'migrated',
  'fork',
]);
const FALLBACK_RESUME_ORIGINS: ReadonlySet<DraftOrigin> = new Set([
  'kept',
  'recovered',
]);

/**
 * The draft 'Continue' offers, as the editor's resume and boot prune see
 * this user's drafts (newest first, as list() returns them):
 * - only drafts this build can write and no other tab holds (a held one
 *   would open as a '(copy)');
 * - only drafts the boot prune keeps: those with work, and the newest one
 *   (no-work and cloud-equal drafts other than the newest are pruned before
 *   the claim, so a link to one ends in 'not found');
 * - session, migrated and fork work first; kept and recovered work only
 *   when nothing else qualifies;
 * - and only when it holds something.
 */
export function pickContinueDraft(
  drafts: readonly DraftMeta[],
  locked: ReadonlySet<string>,
): DraftMeta | null {
  const newestId = drafts[0]?.draftId ?? null;
  const open = drafts.filter(
    (meta) =>
      !draftIsReadOnly(meta, DASHBOARD_SCHEMA_VERSION) &&
      !locked.has(meta.draftId) &&
      (meta.draftId === newestId || draftHasWork(meta)),
  );
  const pick =
    open.find((meta) => RESUME_ORIGINS.has(meta.origin)) ??
    open.find((meta) => FALLBACK_RESUME_ORIGINS.has(meta.origin)) ??
    null;
  return pick && pick.hasContent !== false ? pick : null;
}

/**
 * What 'Continue last session' opens for `userKey`:
 * - the live session (this page's editor has a draft of this user's): the
 *   plain editor, which resumes it in place;
 * - else the draft the editor's resume would pick (pickContinueDraft):
 *   `?draft=<id>`;
 * - else, with no drafts at all and no one else's Studio data on this
 *   device, a pre-1.4 autosave: the plain editor (its resume imports it).
 *   On a shared device that autosave is nobody's yet (E6: 'Found on this
 *   device'), so it is never offered as this user's;
 * - else nothing (null).
 * Never throws.
 */
export async function findContinueTarget(
  userKey: UserKey,
  live: { draftId: string | null; userKey: UserKey | null },
  env: { locks?: LockManager | null } = {},
): Promise<ContinueTarget | null> {
  const editor = StudioRoutes.editor.definition;
  const store = getDraftStore();
  try {
    if (live.draftId !== null && live.userKey === userKey) {
      const meta = await store.getMeta(live.draftId).catch(() => null);
      return { href: editor, name: meta?.name?.trim() || UNTITLED };
    }
    const [drafts, locked] = await Promise.all([
      store.list(userKey),
      lockedDraftIds(env.locks === undefined ? {} : { locks: env.locks }),
    ]);
    const pick = pickContinueDraft(drafts, locked);
    if (pick) {
      return {
        href: `${editor}?draft=${encodeURIComponent(pick.draftId)}`,
        name: pick.name?.trim() || UNTITLED,
      };
    }
    if (drafts.length === 0) {
      const legacy = legacyAutosaveName();
      if (legacy === null) return null;
      const others = await otherUserNamespaces(userKey, { store });
      if (others.size === 0) return { href: editor, name: legacy };
    }
    return null;
  } catch (err) {
    console.warn('[studio] The last session could not be looked up:', err);
    return null;
  }
}

const subscribeUser = (onChange: () => void) =>
  onLocalStoreUserChange(onChange);

/**
 * "New Project" section of the Studio Dashboard: start a blank session, and —
 * when this user has work on this device — continue the last one. Both open
 * the DAW editor (`/studio/editor`).
 */
export const StudioNewProject = () => {
  const navigate = useNavigate();
  // Whose device storage this is; null until auth has said.
  const userKey = useSyncExternalStore(subscribeUser, getLocalStoreUserKey);
  const liveDraftId = useSessionStore((s) => s.draftId);
  const liveUserKey = useSessionStore((s) => s.userKey);
  const [target, setTarget] = useState<ContinueTarget | null>(null);

  useEffect(() => {
    setTarget(null);
    if (userKey === null) return;
    let live = true;
    void findContinueTarget(userKey, {
      draftId: liveDraftId,
      userKey: liveUserKey,
    }).then((found) => {
      if (live) setTarget(found);
    });
    return () => {
      live = false;
    };
  }, [userKey, liveDraftId, liveUserKey]);

  return (
    <section aria-label="New Project" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center gap-2 md:gap-3">
        <img
          src="/icons/studio-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          New Project
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
        <button
          type="button"
          onClick={() => navigate(`${StudioRoutes.editor.definition}?new=1`)}
          className={tileClass}
        >
          <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/15">
            <Plus className="size-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-medium text-white">Blank Project</div>
            <div className="text-sm text-white/60">
              Start from an empty session
            </div>
          </div>
        </button>

        {target && (
          <button
            type="button"
            data-testid="studio-continue-tile"
            data-href={target.href}
            onClick={() => navigate(target.href)}
            className={tileClass}
          >
            <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/15">
              <History className="size-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-medium text-white">
                Continue last session
              </div>
              <div className="truncate text-sm text-white/60">
                {target.name}
              </div>
            </div>
          </button>
        )}
      </div>
    </section>
  );
};
