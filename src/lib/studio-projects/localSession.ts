import type { ActivitySectionId } from '@/curriculum/types/activity';
import {
  forgetLiveSession,
  isLoadableSession,
  loadSession,
  markSessionLoaded,
  resetSessionToEmpty,
  serializeSession,
  sessionFingerprint,
  sessionLoadedAt,
  SESSION_SCHEMA_VERSION,
  type LoadOutcome,
  type SessionData,
} from '@/daw/persistence/SessionSerializer';
import { decodeSession } from '@/daw/persistence/projectDocument/codec';
import { migrateSession } from '@/daw/persistence/projectDocument/migrations';
import {
  backupBeforeMigration,
  draftContentHash,
  draftCopiesThatGiveWay,
  forgetQuarantinedDraft,
  listQuarantinedDrafts,
  pruneMigrationBackups,
  quarantineDraft,
  quarantinedChars,
  readQuarantinedDraft,
  recoverableDrafts,
  type QuarantineOutcome,
  type RecoverableDraft,
} from '@/daw/persistence/projectDocument/quarantine';
import {
  hasWorkToKeep,
  isDocumentDirty,
  isDocumentEmpty,
  markDocumentBaseline,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { ISO_LENGTH, userNamespace } from '@/daw/persistence/storageNamespace';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { inSharedSession } from '@/daw/session/sharedSession';
import { useStore, type AllSlices } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import type {
  PracticeLevel,
  PracticeOpenTrack,
} from '@/features/practiceTracks/generatePracticeTrack';
import { showError, showNotice } from '@/util/toast';

// The live-session marker lives in SessionSerializer, which every load goes
// through; re-exported for the editor's boot and the seeds outside it.
export { markSessionLoaded, sessionLoadedAt };

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

// ── Drafts this build can't read ─────────────────────────────────────────
//
// A draft this build can't load (a newer build's after a rollback, a damaged
// one, or text that isn't JSON at all) is never dropped and never written
// over (decision D9). Before anything can replace it, it is copied word for
// word to the quarantine (projectDocument/quarantine.ts), under the user it
// belongs to, deduplicated by content and capped per user. Its raw text is
// read before any JSON.parse, since a draft that failed to parse used to
// read as no draft at all and was written over.

/** Whether the quarantine holds `outcome`'s draft now. */
const isKeptAside = (outcome: QuarantineOutcome): boolean =>
  outcome.status === 'quarantined' || outcome.status === 'already';

/** Tell the student their last session was kept aside rather than opened. */
function announceQuarantined(): void {
  showNotice("Your last session couldn't be opened", {
    description:
      "This version of the Studio can't read it, so it's kept safe on this device.",
  });
}

// ── Autosave ─────────────────────────────────────────────────────────────

// Single-slot autosave. Crash recovery only — cloud is always the source of
// truth for explicitly-saved projects. Cleared by File ▸ New Project so the
// reload doesn't restore the project being left; a link that opens something
// else keeps the work it replaces (see Kept work) and the autosave follows
// the new session.
const LOCAL_AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

/** The autosave as storage holds it, unparsed; null when there is none. */
function readRawAutosave(): string | null {
  try {
    return localStorage.getItem(LOCAL_AUTOSAVE_KEY);
  } catch (err) {
    console.warn('[autosave] Local read failed', err);
    return null;
  }
}

// An autosave this build can't read and couldn't keep aside either (storage
// full, or its owner's quarantine at its cap): the only copy of that draft.
// While the autosave still holds it, nothing writes over it or removes it,
// so this page's session has no crash copy; each write tries the quarantine
// again, since room may have come free.
let heldAutosave: { raw: string; userId: string | null | undefined } | null =
  null;

/** Whether the autosave must be left as it is (see heldAutosave). */
function autosaveIsHeld(): boolean {
  if (heldAutosave === null) return false;
  const { raw, userId } = heldAutosave;
  // Another tab may have written over it since: then it is nothing of ours.
  if (readRawAutosave() !== raw || isKeptAside(quarantineDraft(raw, userId))) {
    heldAutosave = null;
    return false;
  }
  return true;
}

/**
 * Keep aside an autosave this build can't load, before the session that
 * starts now writes over it. True when it is safe in the quarantine; false
 * when the quarantine couldn't take it, in which case the autosave is held
 * (left as it is) and the student is told.
 */
function setAsideUnreadableAutosave(
  raw: string,
  userId: string | null | undefined,
): boolean {
  const outcome = quarantineDraft(raw, userId);
  if (isKeptAside(outcome)) {
    if (heldAutosave?.raw === raw) heldAutosave = null;
    // Told once: a reload finds the same draft 'already' kept.
    if (outcome.status === 'quarantined') announceQuarantined();
    return true;
  }
  if (heldAutosave?.raw !== raw) {
    heldAutosave = { raw, userId };
    showError(
      "Your last session couldn't be opened or set aside on this device, so autosave is off to keep it safe. Save your work to your projects.",
    );
  }
  return false;
}

// Whether the student has been told this page that storage is too full for
// the autosave: once, until a write gets through again, so a full device
// says so rather than leaving the next reload to restore an older copy.
let toldOutOfRoom = false;

// The draft a fresh page restored from the autosave in another format (or
// one that needed repairs), while the autosave still holds it as stored
// (restoreAutosave). Decision D9 asks for its backup before the first write
// over it, the write that loses the original. So the write waits for the
// backup as long as the project is as restored: the stored draft is still
// the session's crash copy then, and it is never written over just to change
// its format at the cost of its original or of anyone's kept work. Once the
// project changes, the write goes ahead, backed up or not: a crash copy of
// new work outweighs the backup (backupBeforeMigration).
let restoredDraft: {
  raw: string;
  userId: string | null | undefined;
  /** The session generation it was restored in. */
  generation: number;
  /** Whether a backup of the user's holds it. */
  backedUp: boolean;
} | null = null;

/** restoredDraft, while the autosave still holds it as stored. */
function draftStillStored(): NonNullable<typeof restoredDraft> | null {
  const draft = restoredDraft;
  if (draft !== null && readRawAutosave() === draft.raw) return draft;
  // Written over since: by this page, or by another tab.
  restoredDraft = null;
  return null;
}

/**
 * Write the live session to the autosave; true when it was written. When
 * storage is too full to take it, the student is told once (and again after
 * a write has got through in between).
 *
 * With `userId`, full storage may make room when the live session holds
 * work: its only crash copy outweighs a spare copy and work someone else set
 * aside long ago. First the copies kept elsewhere too and the pre-migration
 * backups go (draftCopiesThatGiveWay), then, if that isn't enough, the
 * oldest kept session of another user on this device (one at most). As few
 * as make room go, and only if they do. The user's own kept work stays, a
 * slot this build can't restore is never dropped, and a session nobody has
 * changed since it opened (or one still being opened) takes nobody's place,
 * since its link opens it again: nor does a restored draft rewritten
 * unchanged, which the autosave holds already (see restoredDraft).
 */
export function writeLocalSession(userId?: string | null): boolean {
  return writeSession(userId, true);
}

/** writeLocalSession; `warn` says whether a refusal is worth a toast. */
function writeSession(
  userId: string | null | undefined,
  warn: boolean,
): boolean {
  // Only once this page holds a session. Before that the store is the empty
  // one a page starts with, and writing it would replace the autosave a boot
  // is about to restore (a cloud open still fetching, say); after
  // clearLocalSession() it would put back the project being left.
  if (sessionLoadedAt() === null) return false;
  if (autosaveIsHeld()) return false;
  try {
    const restored = draftStillStored();
    if (restored !== null && !restored.backedUp) {
      // Storage may have room for its backup now.
      restored.backedUp =
        backupBeforeMigration(restored.raw, restored.userId) !== 'failed';
    }
    // The project as restored, which the stored draft holds already.
    const asRestored =
      restored !== null &&
      restored.generation === getSessionGeneration() &&
      !isDocumentDirty();
    if (asRestored && !restored.backedUp) return false;

    const value = JSON.stringify(serializeSession());
    const makingRoom = () => {
      if (asRestored || userId === undefined || seeding > 0) return [];
      if (!hasWorkToKeep()) return [];
      const copies = draftCopiesThatGiveWay();
      const oldest = inTrimOrder(keptKeys())
        .filter((key) => !key.startsWith(keptNamespace(userId)))
        .find(isRestorableSlot);
      return oldest === undefined ? copies : [...copies, oldest];
    };
    if (setItemMakingRoom(LOCAL_AUTOSAVE_KEY, value, makingRoom)) {
      toldOutOfRoom = false;
      restoredDraft = null;
      return true;
    }
    // Quota errors are common when project size grows.
    console.warn('[autosave] Local write failed: storage is full');
    // Nothing is lost while the stored draft holds the session as it is.
    if (warn && !toldOutOfRoom && !asRestored) {
      toldOutOfRoom = true;
      showError(
        "This device is out of room, so your work isn't being kept here. Save it to your projects.",
      );
    }
    return false;
  } catch (err) {
    console.warn('[autosave] Local write failed', err);
    return false;
  }
}

/** The autosave, parsed but not checked: for showing its name. */
export function readLocalSession(): SessionData | null {
  try {
    const raw = readRawAutosave();
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
  // A draft the quarantine couldn't take is its own only copy: it stays.
  if (autosaveIsHeld()) return;
  try {
    localStorage.removeItem(LOCAL_AUTOSAVE_KEY);
  } catch (err) {
    console.warn('[autosave] Local clear failed', err);
  }
}

/** loadSession, also guarded against anything that throws on the way in. */
function loadDraft(stored: SessionData | string): LoadOutcome {
  try {
    return loadSession(stored);
  } catch (err) {
    console.warn('[session] Could not load a draft', err);
    return { ok: false, reason: 'migration-failed', detail: String(err) };
  }
}

/**
 * Whether a draft that loaded is to be backed up before anything writes over
 * it (backupBeforeMigration): one written in another format (before codec
 * v3, or a later schema this build reads as v3), and one that needed repairs
 * (values loaded as their defaults), whose original would otherwise be gone
 * at the next write.
 */
const needsBackup = (outcome: Extract<LoadOutcome, { ok: true }>): boolean =>
  outcome.from !== SESSION_SCHEMA_VERSION || outcome.repaired > 0;

// Drafts this page tried to load and couldn't, by the hash of their
// session's text: a Restore of one would fail the same way again with this
// build, so the boot doesn't offer it back again while this page lasts. A
// fresh page (a reload, a new build) tries again.
const unopenedThisPage = new Set<string>();

/** The key unopenedThisPage files a draft's session under. */
const sessionKey = (session: unknown): string =>
  draftContentHash(JSON.stringify(session) ?? '');

/** Note that the draft whose session is `session` failed to load. */
function noteUnopened(session: unknown): void {
  try {
    unopenedThisPage.add(sessionKey(session));
  } catch {
    // Only the offer back on this page depends on it.
  }
}

/**
 * The editor's plain boot, also taken when a link can't be opened: carry on
 * with the session this page already holds ('live'), or on a fresh page
 * restore the autosave ('restored'). The store outlives the editor route, so
 * restoring over a live session would put an older copy over newer work.
 *
 * Every boot through here also offers back the user's work set aside on an
 * earlier boot that this build can open (see Work set aside, offered back),
 * lets go of exact repeats among the drafts set aside, and of pre-migration
 * backups past their lifetime.
 */
export function resumeLocalSession(
  userId?: string | null,
): 'live' | 'restored' | 'empty' {
  let raw: string | null = null;
  let resumed: 'live' | 'restored' | 'empty' = 'live';
  if (sessionLoadedAt() === null) {
    // A fresh page: nothing this page noted belongs to it.
    unopenedThisPage.clear();
    toldOutOfRoom = false;
    restoredDraft = null;
    raw = readRawAutosave();
    resumed = restoreAutosave(raw, userId);
  }
  forgetRepeatedSetAsides(userId);
  // Not the autosave this boot read: restored, it is the session; set aside
  // just now, it waits for a build that can open it.
  offerBackSetAsideWork(userId, raw);
  pruneMigrationBackups();
  return resumed;
}

/**
 * A fresh page's restore of the autosave `raw` holds. One this build can't
 * read is kept aside first (decision D9), and the editor starts empty. One
 * written in another format, or one that needed repairs, is copied to
 * `userId`'s pre-migration backup and then written again at once, rather
 * than with the first edit: the backup is what undoes a migration that
 * proves lossy. Without a backup it stays as stored until the project
 * changes (see restoredDraft).
 */
function restoreAutosave(
  raw: string | null,
  userId: string | null | undefined,
): 'restored' | 'empty' {
  if (raw) {
    const outcome = loadDraft(raw);
    if (outcome.ok) {
      // Whether the draft as stored stays somewhere once the session writes:
      // a v3 one is what the autosave writes again, an older one is safe only
      // in its backup.
      let stored = true;
      const rewrite = needsBackup(outcome);
      if (rewrite) {
        const backedUp = backupBeforeMigration(raw, userId) !== 'failed';
        restoredDraft = {
          raw,
          userId,
          generation: getSessionGeneration(),
          backedUp,
        };
        stored = backedUp;
      }
      // A copy set aside on an earlier boot has nothing left to offer.
      if (stored) forgetQuarantinedCopies(raw, userId);
      // Written again at once, over a draft its backup holds, but never at
      // anyone's expense: dropping someone's kept work, or the backup, to
      // change a draft's format would trade a copy for nothing, so this
      // write makes no room. If it doesn't fit, the autosave keeps the draft
      // as it was, and the backup with it, until the project changes.
      if (rewrite && stored) writeSession(undefined, false);
      return 'restored';
    }
    noteUnopened(parsedOrRaw(raw));
    setAsideUnreadableAutosave(raw, userId);
  }
  // Nothing to restore: the empty project on screen is the session now.
  markSessionLoaded();
  markDocumentBaseline();
  return 'empty';
}

/** `raw` parsed, or as it is when it isn't JSON. */
function parsedOrRaw(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

// ── Kept work ────────────────────────────────────────────────────────────
//
// A template, demo, lesson, song, practice track, new project or collab link
// replaces the session. Whatever work it held is copied to a timestamped slot
// first, so a link never loses work and never has to ask (owner decision 6).
// Slots are per user, since school Chromebooks are shared.
//
// Whether a session holds work is the save status's call (decision D7): the
// project document has changed since it was opened or saved, or it is kept
// nowhere else whole (a restored draft, a jam import, a cloud save that left
// out what today's cloud can't hold). Arming a track, the metronome, the
// playhead and zoom are not the project, so they never make work; markers,
// the metre, mastering, Score marks and the Prism builder are.
//
// Until milestone 1.4 moves kept work to IndexedDB drafts with a Projects
// dialog, it shares localStorage with the rest of the app, so the slots are
// capped as an interim limit: the newest MAX_KEPT_PER_USER per user, and
// KEPT_BUDGET characters across everyone on the device, the quarantined
// drafts and the pre-migration backups included. When the budget or full
// storage needs room, spare copies go before any kept work: the backups and
// the quarantined drafts kept elsewhere too (draftCopiesThatGiveWay), since
// kept work is the only copy of what it holds. Then the oldest slots go, and
// only once newer work is stored in their place, except that a session kept
// only because its cloud copy lacks what today's cloud can't hold (a chord
// lane, markers, …; KeptSession.cloudCopy) goes before any other: the cloud
// holds the rest of it, while other kept work may be the only copy of all of
// it. A slot this build can't restore is never dropped: it moves to the
// quarantine instead, or stays where it is.

const KEPT_PREFIX = 'musicAtlas:daw:kept:';
const MAX_KEPT_PER_USER = 5;
// A fifth of the ~5M characters Chrome gives the whole app. A session is
// typically 10-20K characters; a long one a few hundred K.
const KEPT_BUDGET = 1_000_000;

/** One kept session, as stored under `musicAtlas:daw:kept:<user>:<keptAt>`. */
export interface KeptSession {
  /** ISO time it was kept. */
  keptAt: string;
  projectName: string;
  session: SessionData;
  /**
   * 'partial' when it was kept only because its cloud copy, as saved, lacks
   * what today's cloud can't hold (SaveStatus.savedInPart): it gives way to
   * other kept work first. Builds before it read the slot without it.
   */
  cloudCopy?: 'partial';
}

export interface KeptSessionInfo {
  key: string;
  keptAt: string;
  projectName: string;
}

export type KeepOutcome =
  | { status: 'nothing' }
  | {
      status: 'kept';
      slot: KeptSessionInfo;
      /**
       * A second slot, on a fresh page whose store held work of its own when
       * the link came (tracks or chords added while it loaded): `slot` holds
       * the last session's autosave then, and this the store's work. Each
       * slot is announced on its own.
       */
      also?: KeptSessionInfo;
    }
  /** Storage refused it: the session must not be replaced. */
  | { status: 'failed' };

/**
 * The prefix of a user's slot keys, which go on with the ISO time the slot
 * was kept. It names the user as the quarantine and the prefs do
 * (userNamespace).
 */
const keptNamespace = (userId?: string | null) =>
  `${KEPT_PREFIX}${userNamespace(userId)}:`;

/** The user a slot's key files it under, as keptNamespace was given it. */
function keptOwner(key: string): string {
  const namespace = key.slice(KEPT_PREFIX.length, -ISO_LENGTH - 1);
  try {
    return decodeURIComponent(namespace);
  } catch {
    return namespace;
  }
}

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

/** A slot as storage holds it: its raw text, and what that parses to. */
interface StoredSlot {
  raw: string;
  /** Null when the text isn't a kept session at all. */
  kept: KeptSession | null;
}

function readKeptSlot(key: string): StoredSlot | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let kept: KeptSession | null = null;
  try {
    const parsed = JSON.parse(raw) as KeptSession;
    kept = parsed?.session?.data ? parsed : null;
  } catch {
    // Not JSON: unreadable, kept for whatever can read it.
  }
  return { raw, kept };
}

/** Whether this build can bring back the slot under `key`. */
function isRestorableSlot(key: string): boolean {
  const kept = readKeptSlot(key)?.kept;
  return kept != null && isLoadableSession(kept.session);
}

/**
 * Move a slot this build can't restore to the quarantine, word for word,
 * rather than drop it (decision D9): a newer build's slot after a rollback,
 * or a damaged one. True when the quarantine holds it and the slot is gone;
 * false when the quarantine couldn't take it, so the slot stays.
 */
function quarantineKeptSlot(key: string, raw: string): boolean {
  if (!isKeptAside(quarantineDraft(raw, keptOwner(key)))) return false;
  try {
    localStorage.removeItem(key);
  } catch {
    // Both copies stay; nothing is lost.
  }
  return true;
}

/**
 * Remove `key` to make way for newer kept work: dropped when this build can
 * restore it, otherwise moved to the quarantine (or left, when that can't
 * take it). True when it was dropped, freeing its share of the budget.
 */
function dropKeptSlot(key: string): boolean {
  if (isRestorableSlot(key)) {
    localStorage.removeItem(key);
    return true;
  }
  const slot = readKeptSlot(key);
  if (slot !== null) quarantineKeptSlot(key, slot.raw);
  return false;
}

/** Whether the slot under `key` was kept only for its cloud copy's gaps. */
const keptForCloudGaps = (key: string): boolean =>
  readKeptSlot(key)?.kept?.cloudCopy === 'partial';

/**
 * Slot keys (oldest first) in the order they give way to newer work: those
 * kept only for their cloud copy's gaps, then the rest, each oldest first.
 */
function inTrimOrder(keys: readonly string[]): string[] {
  const partial = keys.filter(keptForCloudGaps);
  return [...partial, ...keys.filter((key) => !partial.includes(key))];
}

/**
 * Hold the slots to their caps once a new one is stored, in trim order
 * (inTrimOrder): MAX_KEPT_PER_USER under `namespace`, KEPT_BUDGET across
 * every user, with the quarantined drafts and the backups counted in it.
 * Over the budget, the copies draftCopiesThatGiveWay lists go first; no
 * other quarantined draft ever makes room. The slots in `spare` stay
 * regardless (the new ones, and any slot a caller of keepOutgoingSession
 * names as `except`).
 */
function trimKeptSessions(namespace: string, spare: readonly string[]): void {
  const own = keptKeys(namespace);
  const excess = own.length - MAX_KEPT_PER_USER;
  if (excess > 0) {
    const candidates = own.filter((key) => !spare.includes(key));
    for (const key of inTrimOrder(candidates).slice(0, excess)) {
      dropKeptSlot(key);
    }
  }
  const all = keptKeys();
  let total =
    quarantinedChars() + all.reduce((sum, key) => sum + keptSize(key), 0);
  // Within the budget, as it mostly is: no slot needs reading.
  if (total <= KEPT_BUDGET) return;
  // Spare copies first: none of them is the only copy of anyone's work.
  for (const key of draftCopiesThatGiveWay()) {
    if (total <= KEPT_BUDGET) return;
    total -= keptSize(key);
    forgetQuarantinedDraft(key);
  }
  for (const key of inTrimOrder(all)) {
    if (total <= KEPT_BUDGET) break;
    if (spare.includes(key)) continue;
    const size = keptSize(key);
    // A slot moved to the quarantine still counts there.
    if (dropKeptSlot(key)) total -= size;
  }
}

export function readKeptSession(key: string): KeptSession | null {
  return readKeptSlot(key)?.kept ?? null;
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

/**
 * Whether a draft (as v3) holds a project, judged as the save status judges
 * the live one: its document differs from an empty project's (isDocumentEmpty).
 * A chord lane, a marker or a progression with no tracks is a project too.
 * Null when the draft can't be decoded.
 */
function workIn(session: SessionData): boolean | null {
  try {
    const { project } = decodeSession(session);
    return !isDocumentEmpty(project as unknown as AllSlices);
  } catch {
    return null;
  }
}

/** What a link is about to replace, when it holds work (outgoingWork). */
type OutgoingWork =
  /** The live session. */
  | { kind: 'live' }
  /**
   * On a fresh page: the autosave, the only copy of the last session, and
   * the format it was written in (MigrationResult.from).
   */
  | { kind: 'autosave'; raw: string; session: SessionData; from: number }
  /** On a fresh page: an autosave this build can't read. */
  | { kind: 'unreadable'; raw: string };

/**
 * What a link is about to replace that holds work, in the order it is kept.
 * On a page that holds a session (sessionLoadedAt), the live one, when it
 * changed since it opened or is kept nowhere else whole: a template, demo,
 * song or cloud project nobody has changed opens again from where it came,
 * and keeping those would push real work out of the slots.
 *
 * A fresh page holds no session yet, so its outgoing work is the autosave,
 * the only copy of the last session. The store counts too when it holds
 * tracks or chords all the same: the editor takes input while a link is
 * still loading (until milestone 1.4's Opening overlay), and the store
 * outlives File ▸ New until its reload. Other keys the page's mount effects
 * write to the empty store make no work.
 */
function outgoingWork(): OutgoingWork[] {
  if (sessionLoadedAt() !== null) {
    return hasWorkToKeep() ? [{ kind: 'live' }] : [];
  }
  const work: OutgoingWork[] = [];
  const stored = autosavedWork();
  if (stored !== null) work.push(stored);
  const live = useStore.getState();
  if (
    (live.tracks.length > 0 || live.chordRegions.length > 0) &&
    hasWorkToKeep()
  ) {
    work.push({ kind: 'live' });
  }
  return work;
}

/** The autosave, when it holds work: a fresh page's outgoing work. */
function autosavedWork(): OutgoingWork | null {
  const raw = readRawAutosave();
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'unreadable', raw };
  }
  const migrated = migrateSession(parsed);
  if (!migrated.ok) return { kind: 'unreadable', raw };
  // One that can't be decoded is kept all the same: keeping loses nothing.
  return (workIn(migrated.session) ?? true)
    ? {
        kind: 'autosave',
        raw,
        session: parsed as SessionData,
        from: migrated.from,
      }
    : null;
}

/** A free slot key under `namespace`: kept now, or a moment after. */
function newSlotKey(namespace: string): { key: string; keptAt: string } {
  let time = Date.now();
  let keptAt = new Date(time).toISOString();
  while (localStorage.getItem(namespace + keptAt) !== null) {
    keptAt = new Date(++time).toISOString();
  }
  return { key: namespace + keptAt, keptAt };
}

/**
 * Before a link replaces the session: copy the work it holds, if any, to a
 * new kept slot. When storage is full, spare copies (draftCopiesThatGiveWay)
 * and then the oldest kept work (anyone's, in trim order) make room if
 * dropping them does; otherwise the outcome is 'failed', nothing has been
 * dropped, and the caller must leave the session where it is. `except` names
 * a slot that is never dropped for it.
 *
 * On a fresh page the outgoing work is the autosave, and the store too when
 * it holds work of its own (KeepOutcome.also). An autosave this build can't
 * read goes to the quarantine instead of a slot, or the outcome is 'failed'
 * when the quarantine can't take it.
 */
export function keepOutgoingSession(
  userId?: string | null,
  { except }: { except?: string } = {},
): KeepOutcome {
  const { outcome, created } = keepOutgoing(userId, except);
  if (created.length > 0) {
    try {
      trimKeptSessions(
        keptNamespace(userId),
        except ? [...created, except] : created,
      );
    } catch (err) {
      // Over the caps until the next keep; nothing is lost.
      console.warn('[kept] Could not trim the kept sessions', err);
    }
  }
  return outcome;
}

/**
 * keepOutgoingSession without holding the slots to their caps: the caller
 * trims (trimKeptSessions) once the new slots, `created`, are there to stay.
 * `created` is empty when no slot was written (nothing to keep, kept
 * already, set aside, or refused). Never throws.
 */
function keepOutgoing(
  userId: string | null | undefined,
  except: string | undefined,
): { outcome: KeepOutcome; created: string[] } {
  const created: string[] = [];
  const slots: KeptSessionInfo[] = [];
  try {
    for (const work of outgoingWork()) {
      const kept = keepWork(work, userId, except, created);
      if (kept === 'failed') {
        // The session stays where it is, so a slot this kept just now is a
        // second copy of what the autosave still holds.
        for (const key of created) forgetKeptSlot(key);
        return { outcome: { status: 'failed' }, created: [] };
      }
      if (kept === null) continue;
      slots.push(kept.slot);
      if (kept.created) created.push(kept.slot.key);
    }
  } catch (err) {
    console.warn('[kept] Could not keep the outgoing session', err);
    for (const key of created) forgetKeptSlot(key);
    return { outcome: { status: 'failed' }, created: [] };
  }
  const [slot, also] = slots;
  if (slot === undefined) return { outcome: { status: 'nothing' }, created };
  return {
    outcome:
      also === undefined
        ? { status: 'kept', slot }
        : { status: 'kept', slot, also },
    created,
  };
}

/**
 * Keep one piece of outgoing work: the slot holding it, and whether that
 * slot is new (`created`) or an earlier link kept the same work already;
 * null when it went to the quarantine instead; 'failed' when storage refused
 * it. Slots in `except` and `created` never make room for it.
 */
function keepWork(
  work: OutgoingWork,
  userId: string | null | undefined,
  except: string | undefined,
  created: readonly string[],
): { slot: KeptSessionInfo; created: boolean } | null | 'failed' {
  if (work.kind === 'unreadable') {
    return setAsideUnreadableAutosave(work.raw, userId) ? null : 'failed';
  }
  const namespace = keptNamespace(userId);
  const session = work.kind === 'live' ? serializeSession() : work.session;
  const own = keptKeys(namespace);
  // Kept already: the same work, set aside by an earlier link.
  const newestKey = own[own.length - 1];
  const newest =
    newestKey && newestKey !== except ? readKeptSession(newestKey) : null;
  if (
    newest &&
    sessionFingerprint(newest.session) === sessionFingerprint(session)
  ) {
    if (work.kind === 'autosave' && work.from !== SESSION_SCHEMA_VERSION) {
      // The autosave, in another format, is written over next, and no slot
      // holds it as it was: the slot may hold the work as v3.
      backupBeforeMigration(work.raw, userId);
    }
    const { keptAt, projectName } = newest;
    return { slot: { key: newestKey, keptAt, projectName }, created: false };
  }

  const projectName = session.data.projectName || 'Untitled Project';
  const { key, keptAt } = newSlotKey(namespace);
  const kept: KeptSession = { keptAt, projectName, session };
  // Kept only because what today's cloud can't hold is missing from its
  // cloud copy: it is the first to give way (see Kept work).
  if (work.kind === 'live' && keptForCloudGapsOnly()) {
    kept.cloudCopy = 'partial';
  }
  const droppable = () => [
    ...draftCopiesThatGiveWay(),
    ...inTrimOrder(keptKeys()).filter(
      (old) =>
        old !== except && !created.includes(old) && isRestorableSlot(old),
    ),
  ];
  if (!setItemMakingRoom(key, JSON.stringify(kept), droppable)) {
    console.warn('[kept] No room to keep the outgoing session');
    return 'failed';
  }
  return { slot: { key, keptAt, projectName }, created: true };
}

/**
 * Whether the live session is work only because its cloud copy, as last
 * saved, lacks what today's cloud can't hold: unchanged since that save, and
 * still linked to it (SaveStatus.savedInPart).
 */
function keptForCloudGapsOnly(): boolean {
  return useSaveStatusStore.getState().savedInPart && !isDocumentDirty();
}

/**
 * Load a kept session as the live one and drop its slot: it is the live
 * session now, and the autosave holds it. False when it is gone or can't be
 * loaded: then it moves to the quarantine, word for word, whatever the
 * reason, and this page doesn't offer it back. Whatever was live is not kept
 * (see swapInKeptSession for that). Never throws.
 */
export function restoreKeptSession(key: string): boolean {
  const slot = readKeptSlot(key);
  if (slot === null) return false;
  const outcome = slot.kept ? loadDraft(slot.kept.session) : null;
  if (!slot.kept || !outcome?.ok) {
    if (slot.kept) noteUnopened(slot.kept.session);
    quarantineKeptSlot(key, slot.raw);
    return false;
  }
  if (needsBackup(outcome)) {
    // The slot goes once the autosave holds the session as v3.
    backupBeforeMigration(JSON.stringify(slot.kept.session), keptOwner(key));
  }
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

/**
 * Whether this build can decode `session`: everything a load does before it
 * changes anything. A load can still fail after this (a bug on the way in).
 */
function decodes(session: SessionData): boolean {
  const migrated = migrateSession(session);
  if (!migrated.ok) return false;
  try {
    decodeSession(migrated.session);
    return true;
  } catch {
    return false;
  }
}

export type SwapOutcome =
  /**
   * `replaced` is the slot now holding what was live, if it held work, and
   * `also` a second one as in KeepOutcome.
   */
  | {
      status: 'restored';
      replaced: KeptSessionInfo | null;
      also?: KeptSessionInfo;
    }
  | { status: 'failed' };

/**
 * Bring a kept session back in place of the live one, keeping that in turn
 * when it holds work. The slot is decoded first and is never what makes room
 * for the live one, and the slot caps apply only once it is back, so a
 * failure loses no kept work. A slot this build can't read moves to the
 * quarantine. Never throws.
 */
export function swapInKeptSession(
  key: string,
  userId?: string | null,
): SwapOutcome {
  try {
    const slot = readKeptSlot(key);
    if (slot === null) return { status: 'failed' };
    if (!slot.kept || !decodes(slot.kept.session)) {
      quarantineKeptSlot(key, slot.raw);
      return { status: 'failed' };
    }
    const { outcome: replaced, created } = keepOutgoing(userId, key);
    if (replaced.status === 'failed') return { status: 'failed' };
    const generation = getSessionGeneration();
    if (!restoreKeptSession(key)) {
      // Nothing opened, so what was live still is. Its new slots go too,
      // unless the load got as far as letting go of the caches the live
      // session's Oracle patches were in: then a slot is their copy.
      if (getSessionGeneration() === generation) {
        for (const slotKey of created) forgetKeptSlot(slotKey);
      }
      return { status: 'failed' };
    }
    if (created.length > 0) {
      trimKeptSessions(keptNamespace(userId), created);
    }
    const replacedSlot = replaced.status === 'kept' ? replaced.slot : null;
    const also = replaced.status === 'kept' ? replaced.also : undefined;
    return also === undefined
      ? { status: 'restored', replaced: replacedSlot }
      : { status: 'restored', replaced: replacedSlot, also };
  } catch (err) {
    console.warn('[kept] Could not bring kept work back', err);
    return { status: 'failed' };
  }
}

/** Remove the slot under `key`, which another copy makes redundant. */
function forgetKeptSlot(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Both copies stay; nothing is lost.
  }
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
  const { isRecording } = useStore.getState();
  if (inSharedSession()) {
    showError('Leave the shared session to bring back your previous work.');
    return;
  }
  if (isRecording) {
    showError('Stop recording first, then restore your previous work.');
    return;
  }
  let outcome: SwapOutcome;
  try {
    outcome = swapInKeptSession(slot.key, userId);
  } catch (err) {
    console.warn('[kept] Could not bring kept work back', err);
    outcome = { status: 'failed' };
  }
  if (outcome.status === 'failed') {
    showError('Your previous work could not be brought back.');
    return;
  }
  // What it replaced was kept in turn, with its own way back.
  if (outcome.replaced) announceKeptWork(outcome.replaced, userId);
  if (outcome.also) announceKeptWork(outcome.also, userId);
}

// ── Work set aside, offered back ─────────────────────────────────────────
//
// A draft the quarantine took on an earlier boot may be one this build can
// open: a newer build's draft once that build is deployed again, or one a
// bug kept from loading. The editor's plain boot (resumeLocalSession) moves
// it to a kept slot, as it was stored, and announces it with a Restore, so it
// comes back the way any kept work does. Only the student's own entries: one
// 1.1 or 1.2 set aside recorded nobody, and on a shared Chromebook may be
// someone else's, so it stays listed for milestone 1.4's Projects dialog. So
// does an entry that holds no work, which would only be a toast to dismiss,
// and one this page already failed to load, whose Restore would only fail
// again.

/** The draft in a quarantined entry: a kept slot's session, or the draft. */
function quarantinedSession(raw: string): SessionData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { session } = parsed as Partial<KeptSession>;
    return session?.data ? session : (parsed as SessionData);
  } catch {
    return null;
  }
}

/**
 * Move one of the user's quarantined drafts to a kept slot of its own; null
 * when it stays in the quarantine (it holds no work, it won't decode, it is
 * `except`, this page failed to load it, or storage refuses the slot).
 * Nothing is dropped to make room: the slot takes the entry's place, and the
 * slot caps apply again at the next keep.
 */
function adoptQuarantinedDraft(
  draft: RecoverableDraft,
  userId: string | null | undefined,
  except: string | null,
): KeptSessionInfo | null {
  const raw = readQuarantinedDraft(draft.key);
  if (raw === null || raw === except) return null;
  if (workIn(draft.result.session) !== true) return null;
  const session = quarantinedSession(raw);
  if (session === null || unopenedThisPage.has(sessionKey(session))) {
    return null;
  }
  const { projectName } = draft;
  try {
    const { key, keptAt } = newSlotKey(keptNamespace(userId));
    localStorage.setItem(
      key,
      JSON.stringify({ keptAt, projectName, session } satisfies KeptSession),
    );
    // A copy in both places until this goes: nothing is lost either way.
    forgetQuarantinedDraft(draft.key);
    return { key, keptAt, projectName };
  } catch (err) {
    console.warn('[kept] Could not offer back work set aside', err);
    return null;
  }
}

/**
 * Offer back the user's work set aside on an earlier boot that this build
 * can open, but `except` (the autosave this boot read): each draft becomes
 * kept work, announced with a Restore. Never throws.
 */
function offerBackSetAsideWork(
  userId: string | null | undefined,
  except: string | null,
): void {
  for (const draft of recoverableDrafts(userId)) {
    const slot = adoptQuarantinedDraft(draft, userId, except);
    if (slot !== null) announceKeptWork(slot, userId);
  }
}

/**
 * Let go of exact repeats among the drafts set aside that `userId` sees,
 * keeping the oldest copy of each: milestone 1.1 set the same unreadable
 * autosave aside again on every boot, and each copy counted against the
 * kept-work budget, crowding out kept work. Only copies under the same owner
 * (or under none) count as repeats, so nothing leaves anyone's list. Never
 * throws.
 */
function forgetRepeatedSetAsides(userId: string | null | undefined): void {
  try {
    const seen = new Map<string, string[]>();
    // Oldest first, so the oldest copy is the one that stays.
    for (const draft of listQuarantinedDrafts(userId).reverse()) {
      const raw = readQuarantinedDraft(draft.key);
      if (raw === null) continue;
      const group = `${draft.owner ?? ''}|${draftContentHash(raw)}`;
      const copies = seen.get(group) ?? [];
      if (copies.includes(raw)) {
        forgetQuarantinedDraft(draft.key);
        continue;
      }
      copies.push(raw);
      seen.set(group, copies);
    }
  } catch (err) {
    console.warn('[kept] Could not tidy the drafts set aside', err);
  }
}

/**
 * Let go of the user's quarantined copies of `raw`, a draft that has just
 * been restored: the session holds it now, and the text as stored is kept
 * elsewhere (the autosave, or the pre-migration backup).
 */
function forgetQuarantinedCopies(
  raw: string,
  userId: string | null | undefined,
): void {
  const owner = userNamespace(userId);
  for (const draft of listQuarantinedDrafts(userId)) {
    if (draft.owner === owner && readQuarantinedDraft(draft.key) === raw) {
      forgetQuarantinedDraft(draft.key);
    }
  }
}

/**
 * The name of the Studio session that starting fresh would throw away, or
 * null when there is nothing worth asking about: what keepOutgoingSession
 * would keep. The live session when this page holds one (the store survives
 * SPA navigation, so a player who walked from the Studio to the song library
 * still has it in memory) and it holds work; on a fresh page, the autosave,
 * whose only copy this is. Test-only since the Song page opens songs through
 * replaceSession, which keeps the work instead of asking.
 */
export function unsavedStudioSession(): string | null {
  try {
    for (const work of outgoingWork()) {
      if (work.kind === 'live') {
        return useStore.getState().projectName || 'Untitled Project';
      }
      if (work.kind === 'autosave') {
        return work.session.data.projectName || 'Untitled Project';
      }
      // An autosave this build can't read is kept aside, not lost.
    }
    return null;
  } catch {
    return null;
  }
}

export type ReplaceOutcome =
  /**
   * The new session is open; `kept` holds the work it replaced, if any, and
   * `also` a second slot as in KeepOutcome. Each wants its own toast.
   */
  | { status: 'opened'; kept: KeptSessionInfo | null; also?: KeptSessionInfo }
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
 * seed is not an undo step and not an unsaved change. If the seed throws,
 * the kept work comes back (on a fresh page that kept two slots, the
 * autosave's).
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
  const also = outcome.status === 'kept' ? outcome.also : undefined;
  resetSessionToEmpty();
  seeding++;
  const opened = (): ReplaceOutcome => {
    seeding--;
    resetUndoHistory();
    // Kept nowhere else whole unless its link opens it again. Most seeds end
    // as a baseline of their own: one with nothing written since, complete
    // or not as this link says, needs no second fingerprint.
    const status = useSaveStatusStore.getState();
    if (
      status.documentVersion !== status.baselineVersion ||
      status.savedComplete !== reopenable
    ) {
      markDocumentBaseline({ savedComplete: reopenable });
    }
    return also === undefined
      ? { status: 'opened', kept }
      : { status: 'opened', kept, also };
  };
  const failed = (error: unknown): ReplaceOutcome => {
    seeding--;
    // restoreKeptSession never throws: a slot it can't read goes to the
    // quarantine, and the project starts empty instead.
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
