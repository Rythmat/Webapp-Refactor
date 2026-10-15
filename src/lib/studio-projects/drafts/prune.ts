import { DEVICE_USER_KEY, type UserKey } from '@/lib/local-store/userScope';
import {
  draftHasWork,
  draftIsCloudEqual,
  draftIsReadOnly,
  draftTouchedAt,
} from './predicates';
import type { DraftMeta } from './types';

// ── Pruning drafts (milestone 1.4, spec §5 "Prune") ────────────────────────
//
// Drafts that aren't work (pristine, cloud-equal, empty) are caches, and kept
// work doesn't last forever. What goes, and when:
//
// Never: the protected set (the active draft, drafts locked by other tabs,
// the tab's pointer), drafts with work touched in the last 30 days,
// read-only drafts (a newer build's schema), drafts whose record a later
// build wrote (meta.v other than 1: this build can't tell what they are),
// and the quarantine.
//
// 'boot' and 'switch' (the user's newest draft always stays: it is what a
// plain /studio/editor in a new tab resumes, even when the cloud has it —
// owner-visible choice, see the track report; sign-out and quota still
// remove it):
//   1. the user's drafts without work, except the user's newest draft;
//   2. the user's cloud-equal drafts, except the user's newest draft;
//   3. while the user has more than 50 drafts, kept drafts older than
//      30 days, oldest first;
//   4. '~device' drafts ('Found on this device') older than 30 days;
//   5. for each other user not seen on this device for 60 days (meta
//      'user:<key>'.lastSeenAt; never recorded = leave alone): their drafts
//      without work, cloud-equal ones included;
//   6. then gcMedia (10-minute grace) for the user, for '~device' (copies
//      left behind when a 'Found on this device' draft was claimed), and for
//      every other user touched.
// 'quota' (one step per call: the caller retries its write after each, and
//   calls again if it still fails):
//   1. orphan media older than MEDIA_QUOTA_GRACE_MS (minus
//      PrunePolicy.protectMedia). Never no grace at all: media keys are per
//      user, not per tab, so another tab of the same user may have just
//      stored a take whose draft write (debounced up to DRAFT_MAX_WAIT_MS,
//      plus the media settle) doesn't reference it yet; protectMedia only
//      knows this tab's pending media;
//   2. the user's cloud-equal drafts;
//   3. the user's drafts without work;
//   4. the user's single oldest kept draft older than 30 days.
// 'sign-out': the user's cloud-equal drafts, then gcMedia.
//
// A draft's age is measured from the latest of updatedAt, createdAt and
// keptAt, so an import (whose updatedAt is its content's own time, maybe
// months back) still gets its 30 days from when it reached this store.
//
// Deletes are conditional on the record seen when planning (writeSeq and
// the fields patchMeta changes: owner, origin, keptAt, projectId, the cloud
// record, updatedAt), so a draft another tab wrote or patched in between —
// claimed, kept, its cloud link cleared — is left for the next prune.
//
// Pure planning plus a small runner over the store's primitives; no store,
// codec or React imports.

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Work this recent is never pruned. */
export const WORK_PROTECTED_MS = 30 * DAY_MS;
/** Kept drafts older than this may go once a user has too many drafts. */
export const KEPT_MAX_AGE_MS = 30 * DAY_MS;
/** How many drafts a user may have before old kept ones go. */
export const KEPT_SOFT_CAP = 50;
/** How long 'Found on this device' drafts stay. */
export const DEVICE_DRAFT_MAX_AGE_MS = 30 * DAY_MS;
/** A user unseen this long loses their drafts without work. */
export const USER_UNSEEN_MS = 60 * DAY_MS;
/** Unreferenced media younger than this stays (a draft write may follow). */
export const MEDIA_GC_GRACE_MS = 10 * 60 * 1000;
/**
 * The quota sweep's grace: longer than a draft write's max wait (5 s) plus
 * the media settle, so another tab's just-stored take survives (header).
 */
export const MEDIA_QUOTA_GRACE_MS = 2 * 60 * 1000;

/** The meta-store key of a user's last visit: { lastSeenAt: number }. */
export const userSeenKey = (userKey: UserKey): string => `user:${userKey}`;

/** What userSeenKey holds. */
export interface UserSeenRecord {
  lastSeenAt: number;
}

export type PruneReason = 'boot' | 'switch' | 'quota' | 'sign-out';

export interface PrunePolicy {
  userKey: UserKey;
  /** Draft ids never removed: active, locked elsewhere, the pointer. */
  protect: ReadonlySet<string>;
  reason: PruneReason;
  /** SESSION_SCHEMA_VERSION (passed in so this never loads the codec). */
  schemaVersion: number;
  now?: number;
  /**
   * Media ids never collected, whatever their age: the live session's
   * stored media that no committed draft references yet (pendingMedia's
   * manifest). Matters for 'quota', whose orphan sweep has no grace.
   */
  protectMedia?: ReadonlySet<string>;
}

export interface PruneReport {
  deletedDrafts: string[];
  deletedMedia: number;
  freedChars: number;
}

/** The latest moment a draft was touched (see the header): predicates'. */
export { draftTouchedAt };

/** Whether no rule may ever remove `m` under `policy`. */
export function isNeverPruned(
  m: DraftMeta,
  policy: Pick<PrunePolicy, 'protect' | 'schemaVersion'>,
  now: number,
): boolean {
  return (
    policy.protect.has(m.draftId) ||
    m.v !== 1 ||
    draftIsReadOnly(m, policy.schemaVersion) ||
    (draftHasWork(m) && now - draftTouchedAt(m) < WORK_PROTECTED_MS)
  );
}

/** Newest first, as DraftStore.list returns them. */
const newestFirst = (a: DraftMeta, b: DraftMeta) =>
  b.updatedAt - a.updatedAt ||
  (a.draftId < b.draftId ? 1 : a.draftId > b.draftId ? -1 : 0);

/** What a prune will delete: drafts (with the writeSeq seen) and media sweeps. */
export interface PrunePlan {
  drafts: DraftMeta[];
  /** Users whose media to collect, with the grace to use. */
  gcMedia: { userKey: UserKey; graceMs: number }[];
}

/** What planPrune reads. */
export interface PruneInput {
  policy: PrunePolicy;
  now: number;
  /** The policy user's drafts. */
  mine: DraftMeta[];
  /** '~device' drafts (empty when the user is '~device'). */
  device: DraftMeta[];
  /** Other users' drafts and when each was last seen (null = never recorded). */
  others: {
    userKey: UserKey;
    lastSeenAt: number | null;
    drafts: DraftMeta[];
  }[];
}

/** The 'boot', 'switch' and 'sign-out' plans (quota runs step by step). */
export function planPrune(input: PruneInput): PrunePlan {
  const { policy, now } = input;
  const out = new Map<string, DraftMeta>();
  const mayGo = (m: DraftMeta) =>
    !out.has(m.draftId) && !isNeverPruned(m, policy, now);
  const take = (m: DraftMeta) => {
    if (mayGo(m)) out.set(m.draftId, m);
  };
  const mine = [...input.mine].sort(newestFirst);
  const gc: PrunePlan['gcMedia'] = [
    { userKey: policy.userKey, graceMs: MEDIA_GC_GRACE_MS },
  ];
  const gcAlso = (userKey: UserKey) => {
    if (!gc.some((g) => g.userKey === userKey))
      gc.push({ userKey, graceMs: MEDIA_GC_GRACE_MS });
  };

  if (policy.reason === 'sign-out') {
    for (const m of mine) if (draftIsCloudEqual(m)) take(m);
    return { drafts: [...out.values()], gcMedia: gc };
  }
  if (policy.reason === 'quota') {
    throw new Error('planPrune: quota prunes run step by step');
  }

  // 1–2. Drafts without work and cloud-equal ones, except the newest.
  mine.forEach((m, index) => {
    if (index > 0 && (draftIsCloudEqual(m) || !draftHasWork(m))) take(m);
  });

  // 3. Too many drafts: old kept ones go, oldest first.
  let remaining = mine.length - out.size;
  if (remaining > KEPT_SOFT_CAP) {
    const oldKept = mine
      .filter(
        (m) =>
          m.origin === 'kept' &&
          !out.has(m.draftId) &&
          now - draftTouchedAt(m) > KEPT_MAX_AGE_MS,
      )
      .sort((a, b) => draftTouchedAt(a) - draftTouchedAt(b));
    for (const m of oldKept) {
      if (remaining <= KEPT_SOFT_CAP) break;
      if (!mayGo(m)) continue;
      out.set(m.draftId, m);
      remaining -= 1;
    }
  }

  // 4. 'Found on this device' lasts 30 days.
  // Its media is collected every time: a claimed draft's media was copied
  // to its new owner, and the '~device' copies would otherwise stay forever
  // against the device budget.
  if (policy.userKey !== DEVICE_USER_KEY) {
    for (const m of input.device) {
      if (now - draftTouchedAt(m) > DEVICE_DRAFT_MAX_AGE_MS && mayGo(m))
        out.set(m.draftId, m);
    }
    gcAlso(DEVICE_USER_KEY);
  }

  // 5. Users not seen for 60 days: their caches.
  for (const other of input.others) {
    if (other.userKey === policy.userKey || other.userKey === DEVICE_USER_KEY)
      continue;
    if (other.lastSeenAt === null || now - other.lastSeenAt <= USER_UNSEEN_MS)
      continue;
    let touched = false;
    for (const m of other.drafts) {
      if (!draftHasWork(m) && mayGo(m)) {
        out.set(m.draftId, m);
        touched = true;
      }
    }
    if (touched) gcAlso(other.userKey);
  }

  return { drafts: [...out.values()], gcMedia: gc };
}

/**
 * The next quota step's drafts (steps 2–4; step 1, media, is the runner's).
 * Empty when no step has anything left.
 */
export function planQuotaDrafts(
  mine: DraftMeta[],
  policy: PrunePolicy,
  now: number,
): DraftMeta[] {
  const candidates = mine.filter((m) => !isNeverPruned(m, policy, now));
  const cloudEqual = candidates.filter(draftIsCloudEqual);
  if (cloudEqual.length > 0) return cloudEqual;
  const noWork = candidates.filter((m) => !draftHasWork(m));
  if (noWork.length > 0) return noWork;
  const oldKept = candidates
    .filter(
      (m) => m.origin === 'kept' && now - draftTouchedAt(m) > KEPT_MAX_AGE_MS,
    )
    .sort((a, b) => draftTouchedAt(a) - draftTouchedAt(b));
  return oldKept.slice(0, 1);
}

// ── Running a prune over a store ───────────────────────────────────────────

/**
 * Whether `stored` is still the record a prune planned on: the same write
 * and none of the fields patchMeta changes moved (a claim, a keep, a cloud
 * link cleared after File ▸ Delete can each turn a cache back into work).
 */
export function sameDraftState(stored: DraftMeta, planned: DraftMeta): boolean {
  return (
    stored.writeSeq === planned.writeSeq &&
    stored.userKey === planned.userKey &&
    stored.origin === planned.origin &&
    stored.updatedAt === planned.updatedAt &&
    (stored.keptAt ?? null) === (planned.keptAt ?? null) &&
    (stored.projectId ?? null) === (planned.projectId ?? null) &&
    (stored.cloud?.savedAt ?? null) === (planned.cloud?.savedAt ?? null) &&
    (stored.cloud?.savedFingerprint ?? null) ===
      (planned.cloud?.savedFingerprint ?? null)
  );
}

/** The store primitives a prune needs (both adapters provide them). */
export interface PruneOps {
  list(userKey: UserKey): Promise<DraftMeta[]>;
  knownUserKeys(): Promise<Set<UserKey>>;
  getMetaValue<T>(key: string): Promise<T | null>;
  /**
   * Delete the draft only if its stored record is still `planned` (see
   * sameDraftState); true when deleted.
   */
  removeIfUnchanged(planned: DraftMeta): Promise<boolean>;
  gcMedia(
    userKey: UserKey,
    opts?: { graceMs?: number; protect?: ReadonlySet<string> },
  ): Promise<number>;
}

async function removeAll(
  ops: PruneOps,
  drafts: DraftMeta[],
  report: PruneReport,
): Promise<void> {
  for (const m of drafts) {
    if (await ops.removeIfUnchanged(m)) {
      report.deletedDrafts.push(m.draftId);
      report.freedChars += m.chars;
    }
  }
}

/** Run `policy` over a store. Rejects only when listing the user's drafts does. */
export async function runPrune(
  ops: PruneOps,
  policy: PrunePolicy,
): Promise<PruneReport> {
  const now = policy.now ?? Date.now();
  const report: PruneReport = {
    deletedDrafts: [],
    deletedMedia: 0,
    freedChars: 0,
  };
  const mine = await ops.list(policy.userKey);

  if (policy.reason === 'quota') {
    report.deletedMedia = await ops.gcMedia(policy.userKey, {
      graceMs: MEDIA_QUOTA_GRACE_MS,
      protect: policy.protectMedia,
    });
    if (report.deletedMedia > 0) return report;
    await removeAll(ops, planQuotaDrafts(mine, policy, now), report);
    return report;
  }

  const device =
    policy.reason === 'sign-out' || policy.userKey === DEVICE_USER_KEY
      ? []
      : await ops.list(DEVICE_USER_KEY);
  const others: PruneInput['others'] = [];
  if (policy.reason !== 'sign-out') {
    const keys = await ops.knownUserKeys();
    for (const userKey of keys) {
      if (userKey === policy.userKey || userKey === DEVICE_USER_KEY) continue;
      const seen = await ops.getMetaValue<UserSeenRecord>(userSeenKey(userKey));
      const lastSeenAt =
        seen && Number.isFinite(seen.lastSeenAt) ? seen.lastSeenAt : null;
      if (lastSeenAt === null || now - lastSeenAt <= USER_UNSEEN_MS) continue;
      others.push({ userKey, lastSeenAt, drafts: await ops.list(userKey) });
    }
  }

  const plan = planPrune({ policy, now, mine, device, others });
  await removeAll(ops, plan.drafts, report);
  for (const { userKey, graceMs } of plan.gcMedia) {
    report.deletedMedia += await ops.gcMedia(userKey, {
      graceMs,
      protect: policy.protectMedia,
    });
  }
  return report;
}
