import { draftHasWork } from '@/lib/studio-projects/drafts/predicates';
import { DEVICE_USER_KEY, type UserKey } from '@/lib/local-store/userScope';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import { showError, showNotice } from '@/util/toast';
import { getSessionDeps } from './sessionDeps';
import type {
  BootNotice,
  OpenError,
  OpenIntent,
  OpenOptions,
  OpenOutcome,
  SessionUser,
} from './types';

// ── What an open tells the student (milestone 1.4) ─────────────────────────
//
// The toasts openSession shows once a session is ready: the work it
// replaced was kept (Restore · View), this tab got a copy of a project open
// in another tab, what the cold boot found (work found on this device,
// recovered work, drafts that couldn't be opened, storage that isn't
// there), unsaved work left in another draft, and the two answers to a
// ?project= link this device has changes for. Refusals that change nothing
// are toasts too (showOpenError).
//
// A toast's button opens through openSession while the editor is mounted,
// and by URL once it isn't (the editor's boot opens it then).

const EDITOR_PATH = '/studio/editor';

/** sessionStorage: the drafts this tab already told the student about. */
export const NOTICED_DRAFTS_KEY = 'musicAtlas:daw:noticedDrafts';
/** sessionStorage: a pre-1.4 tab's kept-work note, left for its next boot. */
export const LEGACY_KEPT_NOTICE_KEY = 'musicAtlas:daw:keptNotice';

type Opener = (intent: OpenIntent, opts: OpenOptions) => Promise<OpenOutcome>;

let opener: Opener | null = null;

/** openSession registers itself here (no import cycle). */
export function setNoticeOpener(open: Opener | null): void {
  opener = open;
}

/** Open `intent` from a toast: in place, or by URL once the editor is gone. */
function openFromToast(intent: OpenIntent, url: string): void {
  if (opener && getSessionDeps()) {
    void opener(intent, { source: 'toast' });
    return;
  }
  window.location.assign(url);
}

/** Show the Projects dialog, focused on `draftId` when given. */
export function viewInProjects(draftId?: string): void {
  const deps = getSessionDeps();
  if (deps) {
    deps.openProjectsDialog(draftId ? { focusDraftId: draftId } : undefined);
    return;
  }
  window.location.assign(`${EDITOR_PATH}?projects=1`);
}

function restoreDraft(draftId: string): void {
  openFromToast(
    { kind: 'draft', draftId },
    `${EDITOR_PATH}?draft=${encodeURIComponent(draftId)}`,
  );
}

const draftName = (meta: Pick<DraftMeta, 'name'>): string =>
  meta.name?.trim() || 'Untitled Project';

/**
 * The work an open replaced was kept: Restore brings it back (not in a
 * shared session, where loading it would overwrite the room), View lists it.
 */
export function announceKept(
  kept: DraftMeta,
  { restorable }: { restorable: boolean },
): void {
  const view = { label: 'View', onClick: () => viewInProjects(kept.draftId) };
  showNotice('Your previous work was kept', {
    description: draftName(kept),
    ...(restorable
      ? {
          action: {
            label: 'Restore',
            onClick: () => restoreDraft(kept.draftId),
          },
          secondaryAction: view,
        }
      : { action: view }),
  });
}

/** This tab opened a copy: the draft is open in another tab. */
export function announceFork(): void {
  showNotice('This project is open in another tab — this tab has a copy');
}

/** A refusal or a toast-surface failure: nothing changed. */
export function showOpenError(error: OpenError): void {
  showError(error.message);
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// The cold boot's notices, told once per page and user (prepareUser is
// memoized the same way, and may hand the same notices back).
const toldBootNotices = new Set<UserKey>();

/** What the cold boot found, once per page and user. */
export function announceBootNotices(
  userKey: UserKey,
  notices: readonly BootNotice[],
): void {
  if (toldBootNotices.has(userKey)) return;
  toldBootNotices.add(userKey);
  for (const notice of notices) announceBootNotice(notice);
}

function announceBootNotice(notice: BootNotice): void {
  switch (notice.kind) {
    case 'device-found':
      showNotice('Work was found on this device', {
        description: `${plural(notice.count, 'project', 'projects')} in Projects`,
        action: { label: 'View', onClick: () => viewInProjects() },
      });
      return;
    case 'recovered':
      showNotice('Unsaved work was recovered', {
        description: notice.name || 'Untitled Project',
        action: { label: 'Open', onClick: () => restoreDraft(notice.draftId) },
        secondaryAction: {
          label: 'View',
          onClick: () => viewInProjects(notice.draftId),
        },
      });
      return;
    case 'quarantined':
      showNotice(
        `${plural(notice.count, "draft couldn't", "drafts couldn't")} be opened`,
        { action: { label: 'View', onClick: () => viewInProjects() } },
      );
      return;
    case 'unsaved-elsewhere':
      announceUnsavedElsewhere(notice);
      return;
    case 'storage-unavailable':
      showNotice("This browser can't keep drafts right now", {
        description: 'Save to your account (Ctrl+S or ⌘S) to keep your work.',
      });
      return;
  }
}

/** When something happened, in a student's words: a time today, else a date. */
export function whenLabel(at: number, now = Date.now()): string {
  const date = new Date(at);
  const today = new Date(now);
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function readNoticed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTICED_DRAFTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

function markNoticed(draftId: string): void {
  try {
    const noticed = readNoticed();
    noticed.add(draftId);
    sessionStorage.setItem(
      NOTICED_DRAFTS_KEY,
      JSON.stringify([...noticed].slice(-50)),
    );
  } catch {
    // Told again in a later boot of this tab; nothing is lost.
  }
}

function announceUnsavedElsewhere(notice: {
  draftId: string;
  name: string;
  at: number;
}): void {
  if (readNoticed().has(notice.draftId)) return;
  markNoticed(notice.draftId);
  showNotice(`Unsaved work from ${whenLabel(notice.at)} is in Projects`, {
    description: notice.name || 'Untitled Project',
    action: {
      label: 'View',
      onClick: () => viewInProjects(notice.draftId),
    },
  });
}

/**
 * After a link on a cold page opened something else: the newest draft of
 * this user's that holds work nobody has open (not kept, not another tab's,
 * not the one just opened or kept), once per tab. Never throws.
 */
export async function noticeUnsavedElsewhere(
  user: SessionUser,
  opts: { exclude: ReadonlySet<string>; stillCurrent: () => boolean },
): Promise<void> {
  const deps = getSessionDeps();
  if (!deps) return;
  try {
    const { mine, locked } = await deps.drafts.listDrafts(user);
    if (!opts.stillCurrent()) return;
    const noticed = readNoticed();
    const candidate = mine
      .filter(
        (m) =>
          m.userKey !== DEVICE_USER_KEY &&
          m.origin !== 'kept' &&
          !locked.has(m.draftId) &&
          !opts.exclude.has(m.draftId) &&
          !noticed.has(m.draftId) &&
          draftHasWork(m),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (!candidate) return;
    announceUnsavedElsewhere({
      draftId: candidate.draftId,
      name: candidate.name,
      at: candidate.updatedAt,
    });
  } catch (err) {
    console.warn('[open] could not look for unsaved drafts', err);
  }
}

/**
 * A pre-1.4 tab kept work just before it reloaded (File ▸ New, leaving a
 * room) and left a note for its next boot. The work itself reached the
 * drafts through the legacy import; the note is read once, removed, and
 * told with View.
 */
export function announceLegacyKeptNotice(): void {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(LEGACY_KEPT_NOTICE_KEY);
    if (raw === null) return;
    sessionStorage.removeItem(LEGACY_KEPT_NOTICE_KEY);
  } catch {
    return;
  }
  let name = 'Untitled Project';
  try {
    const slot = JSON.parse(raw) as { projectName?: unknown };
    if (typeof slot.projectName === 'string' && slot.projectName.trim()) {
      name = slot.projectName;
    }
  } catch {
    // The name is all the note adds; the work is in Projects either way.
  }
  showNotice('Your previous work was kept', {
    description: name,
    action: { label: 'View', onClick: () => viewInProjects() },
  });
}

/** ?project=X opened this device's unsaved changes to X. */
export function announceOpenedProjectDraft(projectId: string): void {
  showNotice('Opened your unsaved changes', {
    action: {
      label: 'Open saved version',
      onClick: () =>
        openFromToast(
          { kind: 'project', projectId, fromCloud: true },
          `${EDITOR_PATH}?project=${encodeURIComponent(projectId)}&saved=1`,
        ),
    },
  });
}

/** ?project=X opened the cloud copy; this device's changes stay kept. */
export function announceProjectDraftKept(draftId: string): void {
  showNotice('Changes on this device weren’t saved — kept', {
    action: { label: 'View', onClick: () => viewInProjects(draftId) },
  });
}

/** A rejoin found the room gone: the project stays as it is. */
export function announceRoomGone(message: string): void {
  showNotice(message);
}

/** Test seam: forget what this page has told. */
export function resetSessionNoticesForTests(): void {
  toldBootNotices.clear();
}
