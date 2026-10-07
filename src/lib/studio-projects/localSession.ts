import type { ActivitySectionId } from '@/curriculum/types/activity';
import {
  deserializeSession,
  forgetLiveSession,
  isLoadableSession,
  isPristineSession,
  markSessionLoaded,
  markSessionPristine,
  resetSessionToEmpty,
  serializeSession,
  sessionFingerprint,
  sessionLoadedAt,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { canUndo, resetUndoHistory } from '@/daw/store/undoMiddleware';
import type {
  PracticeLevel,
  PracticeOpenTrack,
} from '@/features/practiceTracks/generatePracticeTrack';
import { showError, showNotice } from '@/util/toast';

// The live-session marker lives in SessionSerializer, which every load goes
// through; re-exported for the editor's boot and the seeds outside it.
export { markSessionLoaded, markSessionPristine, sessionLoadedAt };

// ── Making room ──────────────────────────────────────────────────────────
//
// localStorage holds about 5 MB for the whole app. When it is full, the
// Studio may drop older kept work to store newer work, but never drops
// anything that doesn't then make room: how full storage is can't be read,
// only tried, so a probe write checks first.

const PROBE_KEY = 'musicAtlas:daw:storage-probe';

/** Whether `chars` more characters fit in storage as it is now. */
function hasRoomFor(chars: number, wide: boolean): boolean {
  // The probe matches the value's width: a browser may store text that is
  // all Latin-1 in half the space.
  const filler = wide ? '\u0100' : 'x';
  try {
    localStorage.removeItem(PROBE_KEY);
    localStorage.setItem(
      PROBE_KEY,
      filler.repeat(Math.max(0, chars - PROBE_KEY.length)),
    );
    return true;
  } catch {
    return false;
  } finally {
    try {
      localStorage.removeItem(PROBE_KEY);
    } catch {
      // Nothing was written.
    }
  }
}

/**
 * Write `value` under `key`; true when it was written. When storage is full,
 * drop the first of `droppable()` (oldest first): as few as make room, and
 * none unless a probe shows that dropping them does. If the write still
 * fails, what was dropped goes back.
 */
function setItemMakingRoom(
  key: string,
  value: string,
  droppableKeys: () => readonly string[],
): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Full, most likely; see below.
  }
  const droppable = droppableKeys();
  const current = localStorage.getItem(key);
  const needed =
    current === null
      ? key.length + value.length
      : value.length - current.length;
  const wide = /[\u0100-\uffff]/.test(value);
  let freed = 0;
  for (let count = 1; count <= droppable.length; count++) {
    const candidate = droppable[count - 1];
    freed += candidate.length + (localStorage.getItem(candidate)?.length ?? 0);
    if (!hasRoomFor(needed - freed, wide)) continue;

    const dropped: [string, string][] = [];
    for (const old of droppable.slice(0, count)) {
      const oldValue = localStorage.getItem(old);
      if (oldValue === null) continue;
      dropped.push([old, oldValue]);
      localStorage.removeItem(old);
    }
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // Storage counted differently from the probe: put it all back.
      for (const [old, oldValue] of dropped) {
        try {
          localStorage.setItem(old, oldValue);
        } catch (err) {
          console.warn('[kept] Could not put back', old, err);
        }
      }
      return false;
    }
  }
  return false;
}

// ── Autosave ─────────────────────────────────────────────────────────────

// Single-slot autosave. Crash recovery only — cloud is always the source of
// truth for explicitly-saved projects. Cleared by File ▸ New Project so the
// reload doesn't restore the project being left; a link that opens something
// else keeps the work it replaces (see Kept work) and the autosave follows
// the new session.
const LOCAL_AUTOSAVE_KEY = 'musicAtlas:daw:autosave';
// An autosave this build can't read, set aside instead of written over.
const UNREADABLE_PREFIX = 'musicAtlas:daw:unreadable:';

/**
 * Write the live session to the autosave; true when it was written.
 *
 * With `userId`, full storage may drop the oldest kept session of another
 * user on this device to make room (one, and only if that does) when the
 * live session holds work: its only crash copy outweighs work someone else
 * set aside long ago. The user's own kept work stays, and a session nobody
 * has changed since it opened (or one still being opened) takes nobody's
 * place, since its link opens it again.
 */
export function writeLocalSession(userId?: string | null): boolean {
  // Only once this page holds a session. Before that the store is the empty
  // one a page starts with, and writing it would replace the autosave a boot
  // is about to restore (a cloud open still fetching, say); after
  // clearLocalSession() it would put back the project being left.
  if (sessionLoadedAt() === null) return false;
  try {
    const session = serializeSession();
    const value = JSON.stringify(session);
    const othersOldest = () =>
      userId === undefined ||
      seeding > 0 ||
      !hasWork(session.data) ||
      isPristineSession(session)
        ? []
        : keptKeys()
            .filter((key) => !key.startsWith(keptNamespace(userId)))
            .slice(0, 1);
    if (setItemMakingRoom(LOCAL_AUTOSAVE_KEY, value, othersOldest)) return true;
    // Quota errors are common when project size grows; log and move on.
    console.warn('[autosave] Local write failed: storage is full');
    return false;
  } catch (err) {
    console.warn('[autosave] Local write failed', err);
    return false;
  }
}

export function readLocalSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch (err) {
    console.warn('[autosave] Local read failed', err);
    return null;
  }
}

export function clearLocalSession(): void {
  // Nothing may write the session back until the next one loads: File ▸ New
  // Project reloads the page right after this, and the autosave's flush on
  // pagehide would otherwise restore the project being left.
  forgetLiveSession();
  try {
    localStorage.removeItem(LOCAL_AUTOSAVE_KEY);
  } catch (err) {
    console.warn('[autosave] Local clear failed', err);
  }
}

/** Restore the autosave, if there is a readable one; true when it loaded. */
export function restoreLocalSessionIfPresent(): boolean {
  const session = readLocalSession();
  if (!session) return false;
  return deserializeSession(session);
}

/**
 * Copy an autosave this build can't load (a newer format after a rollback,
 * or a damaged one) to a key of its own, since the session that starts now
 * would write over it; true when it is safe. Milestone 1.3's quarantine
 * takes this over.
 */
function setAsideUnreadableAutosave(): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (raw !== null) {
      localStorage.setItem(UNREADABLE_PREFIX + new Date().toISOString(), raw);
    }
    return true;
  } catch (err) {
    console.warn('[autosave] Could not set aside an unreadable autosave', err);
    return false;
  }
}

/**
 * The editor's plain boot, also taken when a link can't be opened: carry on
 * with the session this page already holds ('live'), or on a fresh page
 * restore the autosave ('restored'). The store outlives the editor route, so
 * restoring over a live session would put an older copy over newer work.
 */
export function resumeLocalSession(): 'live' | 'restored' | 'empty' {
  if (sessionLoadedAt() !== null) return 'live';
  const saved = readLocalSession();
  if (saved) {
    try {
      if (deserializeSession(saved)) return 'restored';
    } catch (err) {
      console.warn('[autosave] Could not restore the autosave', err);
    }
    setAsideUnreadableAutosave();
  }
  // Nothing to restore: the empty project on screen is the session now.
  markSessionLoaded();
  return 'empty';
}

/**
 * The name of the Studio session that starting fresh would throw away, or null
 * when there is nothing worth asking about.
 *
 * Two places can be holding one. The store survives SPA navigation, so a player
 * who walked from the Studio to the song library still has their session in
 * memory — but only an *edited* one is worth a prompt, and undo history is what
 * tells the two apart: it is reset whenever a project is loaded or a song is
 * seeded, so anything on the stack is the player's own work. The autosave is
 * the other place: a session from an earlier visit that nothing has restored
 * yet, whose only copy this is.
 */
export function unsavedStudioSession(): string | null {
  const live = useStore.getState();
  if (live.tracks.length > 0 || live.chordRegions.length > 0)
    return canUndo() ? live.projectName || 'Untitled Project' : null;

  const saved = readLocalSession()?.data;
  if (!saved) return null;
  const hasContent =
    saved.tracks.length > 0 || (saved.chordRegions?.length ?? 0) > 0;
  return hasContent ? saved.projectName || 'Untitled Project' : null;
}

// ── Kept work ────────────────────────────────────────────────────────────
//
// A template, demo, lesson, song, practice track, new project or collab link
// replaces the session. Whatever work it held is copied to a timestamped slot
// first, so a link never loses work and never has to ask (owner decision 6).
// Slots are per user, since school Chromebooks are shared.
//
// Until milestone 1.4 moves kept work to IndexedDB drafts with a Projects
// dialog, it shares localStorage with the rest of the app, so the slots are
// capped as an interim limit: the newest MAX_KEPT_PER_USER per user, and
// KEPT_BUDGET characters across everyone on the device. The oldest go first,
// and only once newer work is stored in their place.

const KEPT_PREFIX = 'musicAtlas:daw:kept:';
const MAX_KEPT_PER_USER = 5;
// A fifth of the ~5M characters Chrome gives the whole app. A session is
// typically 10-20K characters; a long one a few hundred K.
const KEPT_BUDGET = 1_000_000;
// Slot keys end in the ISO time they were kept: 2026-10-07T09:00:00.000Z.
const ISO_LENGTH = 24;

/** One kept session, as stored under `musicAtlas:daw:kept:<user>:<keptAt>`. */
export interface KeptSession {
  /** ISO time it was kept. */
  keptAt: string;
  projectName: string;
  session: SessionData;
}

export interface KeptSessionInfo {
  key: string;
  keptAt: string;
  projectName: string;
}

export type KeepOutcome =
  | { status: 'nothing' }
  | { status: 'kept'; slot: KeptSessionInfo }
  /** Storage refused it: the session must not be replaced. */
  | { status: 'failed' };

// Encoded, so one user's id can't be a prefix of another's namespace.
const keptNamespace = (userId?: string | null) =>
  `${KEPT_PREFIX}${encodeURIComponent(userId || 'anon')}:`;

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Kept-slot keys, oldest first: everyone's, or those under `namespace`. */
function keptKeys(namespace = KEPT_PREFIX): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(namespace)) keys.push(key);
  }
  return keys.sort(
    (a, b) =>
      byText(a.slice(-ISO_LENGTH), b.slice(-ISO_LENGTH)) || byText(a, b),
  );
}

const keptSize = (key: string) =>
  key.length + (localStorage.getItem(key)?.length ?? 0);

/**
 * Hold the slots to their caps once a new one is stored, oldest first:
 * MAX_KEPT_PER_USER under `namespace`, KEPT_BUDGET across every user. The
 * slots in `spare` stay regardless (the new one, one being restored).
 */
function trimKeptSessions(namespace: string, spare: readonly string[]): void {
  for (const key of keptKeys(namespace).slice(0, -MAX_KEPT_PER_USER)) {
    if (!spare.includes(key)) localStorage.removeItem(key);
  }
  const all = keptKeys();
  let total = all.reduce((sum, key) => sum + keptSize(key), 0);
  for (const key of all) {
    if (total <= KEPT_BUDGET) break;
    if (spare.includes(key)) continue;
    total -= keptSize(key);
    localStorage.removeItem(key);
  }
}

export function readKeptSession(key: string): KeptSession | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const kept = JSON.parse(raw) as KeptSession;
    return kept?.session?.data ? kept : null;
  } catch {
    return null;
  }
}

/** The user's kept sessions, newest first. */
export function listKeptSessions(userId?: string | null): KeptSessionInfo[] {
  try {
    return keptKeys(keptNamespace(userId))
      .reverse()
      .flatMap((key) => {
        const kept = readKeptSession(key);
        return kept
          ? [{ key, keptAt: kept.keptAt, projectName: kept.projectName }]
          : [];
      });
  } catch {
    return [];
  }
}

// Read defensively: the autosave is whatever an earlier page left behind.
const hasWork = (data: SessionData['data'] | undefined) =>
  (data?.tracks?.length ?? 0) > 0 || (data?.chordRegions?.length ?? 0) > 0;

/**
 * The session a link is about to replace, when it holds work: the live one,
 * unless it is empty or untouched since it opened (a template, demo, song or
 * cloud project nobody has changed opens again from where it came, and
 * keeping those would push real work out of the slots); on a fresh page, the
 * autosave, which is then the only copy of the last session.
 */
function outgoingWork(): SessionData | null {
  const live = useStore.getState();
  const liveHasWork = live.tracks.length > 0 || live.chordRegions.length > 0;
  if (sessionLoadedAt() !== null || liveHasWork) {
    if (!liveHasWork) return null;
    const session = serializeSession();
    return isPristineSession(session) ? null : session;
  }
  const saved = readLocalSession();
  return saved && hasWork(saved.data) ? saved : null;
}

/**
 * Before a link replaces the session: copy the work it holds, if any, to a
 * new kept slot. When storage is full, the oldest kept work (anyone's) makes
 * room if dropping it does; otherwise the outcome is 'failed', nothing has
 * been dropped, and the caller must leave the session where it is. `except`
 * names a slot that is never dropped for it (one about to be restored).
 */
export function keepOutgoingSession(
  userId?: string | null,
  { except }: { except?: string } = {},
): KeepOutcome {
  const namespace = keptNamespace(userId);
  try {
    const session = outgoingWork();
    if (!session) return { status: 'nothing' };
    // A fresh page's autosave from a newer build: this build could never
    // restore it, so it is set aside for a build that can, with no Restore.
    if (!isLoadableSession(session)) {
      return setAsideUnreadableAutosave()
        ? { status: 'nothing' }
        : { status: 'failed' };
    }
    const own = keptKeys(namespace);
    // Kept already: the same work, set aside by an earlier link.
    const newestKey = own[own.length - 1];
    const newest =
      newestKey && newestKey !== except ? readKeptSession(newestKey) : null;
    if (
      newest &&
      sessionFingerprint(newest.session) === sessionFingerprint(session)
    ) {
      const { keptAt, projectName } = newest;
      return { status: 'kept', slot: { key: newestKey, keptAt, projectName } };
    }

    const projectName = session.data.projectName || 'Untitled Project';
    let time = Date.now();
    let keptAt = new Date(time).toISOString();
    while (localStorage.getItem(namespace + keptAt) !== null) {
      keptAt = new Date(++time).toISOString();
    }
    const key = namespace + keptAt;
    const value = JSON.stringify({
      keptAt,
      projectName,
      session,
    } satisfies KeptSession);
    const droppable = () => keptKeys().filter((old) => old !== except);
    if (!setItemMakingRoom(key, value, droppable)) {
      console.warn('[kept] No room to keep the outgoing session');
      return { status: 'failed' };
    }
    trimKeptSessions(namespace, except ? [key, except] : [key]);
    return { status: 'kept', slot: { key, keptAt, projectName } };
  } catch (err) {
    console.warn('[kept] Could not keep the outgoing session', err);
    return { status: 'failed' };
  }
}

/**
 * Load a kept session as the live one and drop its slot: it is the live
 * session now, and the autosave holds it. False when it is gone or can't be
 * read. Whatever was live is not kept (see swapInKeptSession for that).
 */
export function restoreKeptSession(key: string): boolean {
  const kept = readKeptSession(key);
  if (!kept || !deserializeSession(kept.session)) return false;
  // Written now, not on the autosave's schedule: a Restore clicked after
  // leaving the editor has no autosave running. The slot goes only once the
  // autosave holds the session, so it is never the one copy that is dropped.
  if (writeLocalSession()) {
    try {
      localStorage.removeItem(key);
    } catch {
      // The copy stays; nothing is lost.
    }
  }
  return true;
}

export type SwapOutcome =
  /** `replaced` is the slot now holding what was live, if it held work. */
  | { status: 'restored'; replaced: KeptSessionInfo | null }
  | { status: 'failed' };

/**
 * Bring a kept session back in place of the live one, keeping that in turn
 * when it holds work. The slot is read first and is never what makes room
 * for the live one, so a failure changes neither.
 */
export function swapInKeptSession(
  key: string,
  userId?: string | null,
): SwapOutcome {
  const kept = readKeptSession(key);
  if (!kept || !isLoadableSession(kept.session)) return { status: 'failed' };
  const replaced = keepOutgoingSession(userId, { except: key });
  if (replaced.status === 'failed' || !restoreKeptSession(key)) {
    return { status: 'failed' };
  }
  return {
    status: 'restored',
    replaced: replaced.status === 'kept' ? replaced.slot : null,
  };
}

/**
 * Tell the student their work was set aside, with a Restore to bring it
 * back. A collab session passes `restorable` false: loading a private
 * session there would overwrite the shared one.
 */
export function announceKeptWork(
  slot: KeptSessionInfo,
  userId?: string | null,
  { restorable = true }: { restorable?: boolean } = {},
): void {
  showNotice('Your previous work was kept', {
    description: slot.projectName,
    action: restorable
      ? { label: 'Restore', onClick: () => restoreKeptWork(slot, userId) }
      : undefined,
  });
}

// File ▸ New and leaving a shared session reload into a blank project, and a
// toast shown before the reload would go with the page: the slot to announce
// waits in this tab's sessionStorage for the editor's next boot.
const KEPT_NOTICE_KEY = 'musicAtlas:daw:keptNotice';

/** Announce `slot` on the editor's next boot, for a caller about to reload. */
export function announceKeptWorkAfterReload(slot: KeptSessionInfo): void {
  try {
    sessionStorage.setItem(KEPT_NOTICE_KEY, JSON.stringify(slot));
  } catch {
    // The work is kept; only the notice is lost.
  }
}

/** The editor's boot: announce work kept just before the page reloaded. */
export function announceKeptWorkFromReload(userId?: string | null): void {
  try {
    const raw = sessionStorage.getItem(KEPT_NOTICE_KEY);
    if (raw === null) return;
    sessionStorage.removeItem(KEPT_NOTICE_KEY);
    const slot = JSON.parse(raw) as KeptSessionInfo;
    if (readKeptSession(slot.key)) announceKeptWork(slot, userId);
  } catch {
    // Nothing to announce.
  }
}

/** The kept-work toast's Restore: the kept session comes back as the live one. */
export function restoreKeptWork(
  slot: KeptSessionInfo,
  userId?: string | null,
): void {
  const { roomId, isRecording } = useStore.getState();
  if (roomId) {
    showError('Leave the shared session to bring back your previous work.');
    return;
  }
  if (isRecording) {
    showError('Stop recording first, then restore your previous work.');
    return;
  }
  const outcome = swapInKeptSession(slot.key, userId);
  if (outcome.status === 'failed') {
    showError('Your previous work could not be brought back.');
    return;
  }
  // What it replaced was kept in turn, with its own way back.
  if (outcome.replaced) announceKeptWork(outcome.replaced, userId);
}

export type ReplaceOutcome =
  /** The new session is open; `kept` holds the work it replaced, if any. */
  | { status: 'opened'; kept: KeptSessionInfo | null }
  /** The outgoing work couldn't be kept, so nothing was changed. */
  | { status: 'refused' }
  /**
   * The seed threw. The work it replaced is back when there was any
   * (`restored`); otherwise the project is empty, not half seeded.
   */
  | { status: 'failed'; error: unknown; restored: boolean };

// Seeds in progress (see replaceSession). A session half built by one is not
// work for the autosave to make room for.
let seeding = 0;

/**
 * Replace the live session with what `seed` builds, as every editor link
 * does: keep the outgoing work (refusing when it can't be kept), start an
 * empty project, seed it, and take the result as the new baseline, so the
 * seed is not an undo step. If the seed throws, the kept work comes back.
 *
 * `reopenable` says the link can open the same thing again (a template,
 * demo, song, lesson, practice track or cloud project), so until it is
 * changed it holds no work for the next link to keep. A jam import or a
 * shared session is the only copy, and stays keepable.
 *
 * A seed that returns at once is baselined before this returns, so nothing
 * (an autosave flush, say) can catch the session between the two.
 */
export function replaceSession(
  userId: string | null | undefined,
  seed: () => void | Promise<void>,
  { reopenable = false }: { reopenable?: boolean } = {},
): Promise<ReplaceOutcome> {
  const outcome = keepOutgoingSession(userId);
  if (outcome.status === 'failed') {
    return Promise.resolve({ status: 'refused' });
  }
  const kept = outcome.status === 'kept' ? outcome.slot : null;
  resetSessionToEmpty();
  seeding++;
  const opened = (): ReplaceOutcome => {
    seeding--;
    resetUndoHistory();
    if (reopenable) markSessionPristine();
    return { status: 'opened', kept };
  };
  const failed = (error: unknown): ReplaceOutcome => {
    seeding--;
    const restored = kept !== null && restoreKeptSession(kept.key);
    if (!restored) resetSessionToEmpty();
    return { status: 'failed', error, restored };
  };
  try {
    const seeded = seed();
    return seeded instanceof Promise
      ? seeded.then(opened, failed)
      : Promise.resolve(opened());
  } catch (error) {
    return Promise.resolve(failed(error));
  }
}

// ── Boot links ───────────────────────────────────────────────────────────
//
// What `/studio/editor?…` asks the editor to open, read in the order the boot
// has always checked the parameters. Validated before anything is cleared:
// a link that names nothing real changes nothing.

export type BootIntent =
  /** No link: carry on with the session (see resumeLocalSession). */
  | { kind: 'resume' }
  /** The caller seeded the store before navigating (a Song page). */
  | { kind: 'seeded' }
  | { kind: 'project'; projectId: string }
  | { kind: 'template'; templateId: string }
  | { kind: 'demo'; demoId: string }
  | { kind: 'tutorial'; tutorialId: string }
  | { kind: 'song'; songId: string }
  | {
      kind: 'practiceGenre';
      genre: string;
      level: number;
      section: ActivitySectionId;
    }
  | {
      kind: 'practiceMode';
      mode: string;
      rootParam: string | null;
      openTrack: PracticeOpenTrack;
      level: PracticeLevel;
    }
  /** `code` is 'new' for a fresh room. */
  | { kind: 'collab'; code: string; host: boolean; jamImport: boolean }
  | { kind: 'jam' }
  | { kind: 'new' };

const SECTIONS: readonly ActivitySectionId[] = ['A', 'B', 'C', 'D'];

export function readBootIntent(search: string): BootIntent {
  const params = new URLSearchParams(search);
  const get = (name: string) => params.get(name);
  const isJamImport = get('jam') === '1';

  if (get('seeded') === '1') return { kind: 'seeded' };
  const projectId = get('project');
  if (projectId) return { kind: 'project', projectId };
  const templateId = get('template');
  if (templateId) return { kind: 'template', templateId };
  const demoId = get('demo');
  if (demoId) return { kind: 'demo', demoId };
  const tutorialId = get('tutorial');
  if (tutorialId) return { kind: 'tutorial', tutorialId };
  const songId = get('song');
  if (songId) return { kind: 'song', songId };

  const genre = get('practiceGenre');
  if (genre) {
    const level = Number(get('practiceLevel'));
    const section = get('practiceSection') as ActivitySectionId | null;
    return {
      kind: 'practiceGenre',
      genre,
      level: Number.isFinite(level) && level > 0 ? level : 1,
      section: section && SECTIONS.includes(section) ? section : 'A',
    };
  }

  const mode = get('practiceMode');
  if (mode) {
    // `practiceOpen` defaults to melody when missing or invalid (the
    // evergreen sidebar entry can't know which section was just finished).
    const level = Number(get('practiceLevel'));
    return {
      kind: 'practiceMode',
      mode,
      rootParam: get('practiceRoot'),
      openTrack: get('practiceOpen') === 'chords' ? 'chords' : 'melody',
      level: level === 2 || level === 3 ? level : 1,
    };
  }

  const code = get('collab')?.trim();
  if (code) {
    return {
      kind: 'collab',
      // A room id is used as given: rooms are told apart by case.
      code: code.toLowerCase() === 'new' ? 'new' : code,
      host: get('host') === '1',
      jamImport: isJamImport,
    };
  }
  if (isJamImport) return { kind: 'jam' };
  if (get('new') === '1') return { kind: 'new' };
  return { kind: 'resume' };
}

/** The lookups a boot link's ids are checked against (the editor's data). */
export interface BootCatalog {
  hasTemplate: (id: string) => boolean;
  hasDemo: (id: string) => boolean;
  hasTutorial: (id: string) => boolean;
  isPracticeMode: (mode: string) => boolean;
  /** A recorded jam is waiting to be imported. */
  hasPendingJam: () => boolean;
}

// Room codes are eight hex characters (crypto.randomUUID().slice(0, 8)), and
// a classroom showcase links its own room id; this admits any plain id, in
// either case, and turns away what can't be one.
const COLLAB_CODE = /^[\w-]{4,64}$/;

/**
 * Why a boot link can't be opened, or null when it can. A project, song or
 * genre practice track is only known once it has been fetched, so the boot
 * checks those itself.
 */
export function bootIntentError(
  intent: BootIntent,
  catalog: BootCatalog,
): string | null {
  switch (intent.kind) {
    case 'template':
      return catalog.hasTemplate(intent.templateId)
        ? null
        : 'That template could not be found.';
    case 'demo':
      return catalog.hasDemo(intent.demoId)
        ? null
        : 'That demo could not be found.';
    case 'tutorial':
      return catalog.hasTutorial(intent.tutorialId)
        ? null
        : 'That lesson could not be found.';
    case 'practiceMode':
      return catalog.isPracticeMode(intent.mode)
        ? null
        : 'That practice track mode could not be found.';
    case 'collab':
      return intent.code === 'new' || COLLAB_CODE.test(intent.code)
        ? null
        : 'That session link is not valid.';
    case 'jam':
      return catalog.hasPendingJam() ? null : 'That jam could not be found.';
    default:
      return null;
  }
}
