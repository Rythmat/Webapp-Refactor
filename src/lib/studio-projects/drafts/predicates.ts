import type { DraftMeta } from './types';

// ── What a draft is worth keeping for ──────────────────────────────────────
//
// A draft is work only when losing it would lose something: it holds a
// project, that project isn't the untouched source it opened from (a
// template, a demo, a lesson's start), and it isn't exactly what the cloud
// already holds whole. Pristine and cloud-equal drafts are caches: hidden in
// Projects, and pruned. An unknown fingerprint (null) can't be proved equal
// to anything, so such a draft counts as work. Pure: the Studio dashboard
// loads this.

// Every predicate is total: it runs over every stored record (prune, resume,
// Projects rows, the dashboard tile), including partly written ones and
// those a newer or older build wrote, so a missing or malformed field never
// throws. Whatever can't be proved leans to keeping: not pristine, not
// cloud-equal, and work when it may hold content.

const isHash = (value: unknown): value is string => typeof value === 'string';

/**
 * The document is exactly as it opened from a source that can be opened
 * again: baseline.reopenable, with a known fingerprint equal to the
 * baseline's.
 */
export function draftIsPristine(m: DraftMeta): boolean {
  const baseline = m.baseline as DraftMeta['baseline'] | null | undefined;
  return (
    baseline != null &&
    baseline.reopenable === true &&
    isHash(m.docFingerprint) &&
    m.docFingerprint === baseline.fingerprint
  );
}

/**
 * The cloud holds exactly this document, whole: the last save was complete,
 * the fingerprint is known and equals the saved one, and no media waits on
 * this device (stored or missing).
 */
export function draftIsCloudEqual(m: DraftMeta): boolean {
  const cloud = m.cloud as DraftMeta['cloud'] | null;
  const media = m.media as DraftMeta['media'] | null | undefined;
  return (
    cloud != null &&
    cloud.savedComplete === true &&
    isHash(m.docFingerprint) &&
    m.docFingerprint === cloud.savedFingerprint &&
    Array.isArray(media) &&
    media.length === 0 &&
    m.mediaMissing === 0
  );
}

/**
 * hasContent, and neither pristine nor cloud-equal. A meta that doesn't say
 * (hasContent missing) may hold content, so it counts.
 */
export function draftHasWork(m: DraftMeta): boolean {
  return (
    (m.hasContent as boolean | undefined) !== false &&
    !draftIsPristine(m) &&
    !draftIsCloudEqual(m)
  );
}

/**
 * Written by a newer build in a schema this build can't write back
 * (`schemaVersion` is SESSION_SCHEMA_VERSION, passed in so this module
 * never loads the codec). Opened read-only, never written over or pruned.
 */
export function draftIsReadOnly(m: DraftMeta, schemaVersion: number): boolean {
  return typeof m.schema === 'number' && m.schema > schemaVersion;
}

const finiteOr0 = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * The latest moment a draft was touched: max(updatedAt, createdAt, keptAt).
 * Every age-based prune rule ('~device' 30 days, kept 30 days, work younger
 * than 30 days, users unseen 60 days) measures from this, so an import whose
 * updatedAt is its content's own time (months back) still gets its full
 * grace from createdAt, when it reached this store.
 */
export function draftTouchedAt(m: DraftMeta): number {
  return Math.max(
    finiteOr0(m.updatedAt),
    finiteOr0(m.createdAt),
    finiteOr0(m.keptAt),
  );
}
