/**
 * chordIdentity.ts — what chord a chord-lane region holds, apart from how its
 * label spells it.
 *
 * A region's `name`, `noteName` and `degreeKey` are labels in several
 * dialects ('5 maj/7' with 'F/A', '1 dom9' with 'D9', a typed 'Am'), and
 * reading the chord back out of them is ambiguous: '/7' is a bass degree in a
 * song chart and an inversion in the engine. The identity says it once, as
 * pitch classes: root, quality and bass. Milestone 1.16a (this folder's owner)
 * fills it in where chords are made. Until then nothing writes one, the codec
 * keeps whatever a region carries, and every write that changes a region's
 * label drops it (withoutIdentity), so an identity never outlives the label
 * it was made for.
 *
 * `label` records the region name the identity describes. A build from before
 * this field renames a region without dropping its identity, so a reader only
 * trusts an identity whose label still equals the region's name
 * (identityIsCurrent) and treats any other as absent.
 */

export interface ChordRegionIdentity {
  /** Root pitch class, 0–11 (C = 0). */
  rootPc: number;
  /**
   * A key of @prism/engine's CHORDS without a slash ('major', 'minor7',
   * 'dominant9'): the bass lives in `bassPc`, not in the quality. The same
   * vocabulary as Learn's ChordIdentity.
   */
  quality: string;
  /** Bass pitch class, 0–11; equal to `rootPc` in root position. */
  bassPc: number;
  /**
   * Where it came from: 'given' when the student or a chart named the chord,
   * 'detected' when analysis of the notes found it, 'derived' when it was
   * read back from an older region's labels.
   */
  source: 'given' | 'detected' | 'derived';
  /** The region `name` this identity describes. */
  label: string;
}

const SOURCES: ReadonlySet<string> = new Set(['given', 'detected', 'derived']);

const isPitchClass = (v: unknown): boolean =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 11;

/**
 * Whether `value` has the shape of a ChordRegionIdentity. Identities arrive
 * from drafts, cloud documents and collaborators verbatim, so a reader checks
 * the shape before trusting one.
 */
export function isChordRegionIdentity(
  value: unknown,
): value is ChordRegionIdentity {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isPitchClass(v.rootPc) &&
    isPitchClass(v.bassPc) &&
    typeof v.quality === 'string' &&
    v.quality !== '' &&
    !v.quality.includes('/') &&
    typeof v.source === 'string' &&
    SOURCES.has(v.source) &&
    typeof v.label === 'string'
  );
}

/**
 * Whether the region's identity can be trusted: it is well formed and still
 * describes the region's current name. False when there is none.
 */
export function identityIsCurrent(region: {
  name: string;
  identity?: ChordRegionIdentity;
}): boolean {
  const { identity } = region;
  return isChordRegionIdentity(identity) && identity.label === region.name;
}

/**
 * The region without its identity, for a write that changes the region's
 * label (rename, a same-tick replace, a bass added to the name). Returns the
 * same object when there is no identity, so unchanged regions keep their
 * reference (the collab diff and undo detect changes by reference).
 */
export function withoutIdentity<R extends { identity?: ChordRegionIdentity }>(
  region: R,
): R {
  if (region.identity === undefined) return region;
  const copy = { ...region };
  delete copy.identity;
  return copy;
}
