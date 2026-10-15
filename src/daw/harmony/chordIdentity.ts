/**
 * chordIdentity.ts — what chord a chord-lane region holds, apart from how its
 * label spells it.
 *
 * A region's `name`, `noteName` and `degreeKey` are labels in several
 * dialects ('5 maj/7' with 'F/A', '1 dom9' with 'D9', a typed 'Am'), and
 * reading the chord back out of them is ambiguous: '/7' is a bass degree in a
 * song chart and an inversion in the engine. The identity says it once, as
 * pitch classes: root, quality and bass. Every place that makes a chord fills
 * it in (milestone 1.16a): Prism and its suggestions, typed chords, analysis,
 * and the seeds from songs, lessons and practice tracks. A project saved
 * before that gets one read from its labels when it opens
 * (ensureChordIdentity). A region without one is still legal: readers fall
 * back to the labels.
 *
 * `label` records the region name the identity describes. A write that gives
 * a region another chord drops the identity or brings a new one; a build from
 * before this field renames a region without dropping it, so a reader only
 * trusts an identity whose label still equals the region's name
 * (identityIsCurrent) and treats any other as absent.
 */
import { CHORDS, detectChordWithInversion, unstepChord } from '@prism/engine';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  normalizeQuality,
  parseChord,
  type ChordSpec,
} from '@/lib/chordNotation';
import { qualityIntervals } from '@/lib/chordNotation/qualities';
import { degreeToPc, type KeyFrame } from './keyFrame';

export type ChordIdentitySource = 'given' | 'detected' | 'derived';

export interface ChordRegionIdentity {
  /** Root pitch class, 0–11 (C = 0). */
  rootPc: number;
  /**
   * A quality key without a slash ('major', 'minor7', 'dominant9'): one of
   * @prism/engine's CHORDS, or one the app writes that CHORDS lacks
   * ('add9', 'dominant11'; lib/chordNotation's qualityIntervals knows both).
   * The bass lives in `bassPc`, not in the quality. The same vocabulary as
   * Learn's ChordIdentity.
   */
  quality: string;
  /** Bass pitch class, 0–11; equal to `rootPc` in root position. */
  bassPc: number;
  /**
   * Where it came from: 'given' when the student or a chart named the chord,
   * 'detected' when analysis of the notes found it, 'derived' when it was
   * read back from an older region's labels.
   */
  source: ChordIdentitySource;
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

// ── Making one ─────────────────────────────────────────────────────────────

/** A chord as pitch classes: what an identity says, without where it came from. */
export type ChordPitches = Pick<
  ChordRegionIdentity,
  'rootPc' | 'quality' | 'bassPc'
>;

/** What a region carries for an identity to describe. */
export interface IdentityLabels {
  name: string;
  noteName: string;
  degreeKey?: string;
  identity?: ChordRegionIdentity;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const ascii = (s: string) => s.replace(/♭/g, 'b').replace(/♯/g, '#');

/** An engine slash quality ('major/5'): the quality names its own bass. */
function engineSlash(quality: string): number[] | null {
  const intervals = quality.includes('/') ? CHORDS[quality] : undefined;
  return intervals && Math.min(...intervals) < 0 ? intervals : null;
}

/**
 * Root, quality and bass from a root and a quality in any spelling the app
 * writes ('min7', 'm7', 'major/5'; empty is major). An engine slash quality
 * puts its bass where its intervals do; `bassPc` overrides. Null when the
 * quality isn't one the app knows.
 */
function pitchesFrom(
  rootPc: number,
  rawQuality: string,
  bassPc?: number,
): ChordPitches | null {
  const quality = normalizeQuality(rawQuality.trim() || 'major');
  const slash = engineSlash(quality);
  const base = slash ? quality.slice(0, quality.indexOf('/')) : quality;
  if (!qualityIntervals(base)) return null;
  const root = mod12(rootPc);
  const bass =
    bassPc !== undefined
      ? mod12(bassPc)
      : slash
        ? mod12(root + Math.min(...slash))
        : root;
  return { rootPc: root, quality: base, bassPc: bass };
}

/**
 * The chord an engine degree name holds: '5 dominant7', '4 major/1',
 * 'b3 major', its degree counted on the major scale from `fromPc`. Prism's
 * graph names count from the parent major key, degreeKeys from the tonic.
 */
export function pitchesOfDegreeName(
  name: string,
  fromPc: number,
): ChordPitches | null {
  const space = name.indexOf(' ');
  if (space < 0) return null;
  const rootPc = degreeToPc(name.slice(0, space), fromPc);
  if (rootPc === null) return null;
  return pitchesFrom(rootPc, unstepChord(name));
}

/** The chord sounding notes spell, read as analysis reads them. */
export function pitchesOfNotes(midis: readonly number[]): ChordPitches | null {
  if (midis.length === 0) return null;
  const match = detectChordWithInversion([...midis]);
  if (!match) return null;
  return {
    rootPc: match.rootPc,
    quality: match.quality,
    bassPc: mod12(Math.min(...midis)),
  };
}

const SLASH = /^(.*?)\s*\/\s*([b#♭♯]?[1-7]|[A-G](?:bb|##|b|#|♭|♯)?)$/;
const DEGREE_BASS = /^[b#♭♯]?[1-7]$/;

interface ReadLabel {
  spec: ChordSpec;
  /** The text after a trailing slash: a degree ('1', '♭3') or a letter. */
  slash?: string;
}

function readLabel(text: string | undefined): ReadLabel | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const match = SLASH.exec(trimmed);
  const spec = parseChord(match ? match[1] : trimmed);
  if (!spec || spec.bass !== undefined) return null;
  return match ? { spec, slash: match[2] } : { spec };
}

/**
 * The chord one label names, its degrees counted from the key's tonic. A
 * slash letter is the bass. A slash degree is the engine's inversion
 * ('maj/3' = the chord's 3rd below) when `engineSlashes` and CHORDS has
 * one, else a degree of the key ('2 maj/1' = D/C in C).
 */
function pitchesOfLabel(
  label: ReadLabel,
  frame: KeyFrame | null,
  engineSlashes: boolean,
): ChordPitches | null {
  const { spec, slash } = label;
  let rootPc: number | null = null;
  if (typeof spec.root === 'string') {
    rootPc = noteNameToPitchClass(ascii(spec.root));
  } else if (spec.tonicDegree && frame) {
    rootPc = degreeToPc(spec.tonicDegree, frame.tonicPc);
  }
  if (rootPc === null) return null;
  if (!slash) return pitchesFrom(rootPc, spec.quality);
  if (!DEGREE_BASS.test(slash)) {
    const bassPc = noteNameToPitchClass(ascii(slash));
    return bassPc === null ? null : pitchesFrom(rootPc, spec.quality, bassPc);
  }
  if (engineSlashes) {
    const inversion = `${normalizeQuality(spec.quality.trim() || 'major')}/${ascii(slash)}`;
    if (engineSlash(inversion)) return pitchesFrom(rootPc, inversion);
  }
  if (!frame) return null;
  const bassPc = degreeToPc(slash, frame.tonicPc);
  return bassPc === null ? null : pitchesFrom(rootPc, spec.quality, bassPc);
}

/**
 * The chord a region's labels name, read the way each source writes them
 * (utils/chordRegionNotation lists the dialects), or null when they don't
 * name one the app knows.
 *
 * The letter name comes first: it needs no key, so it holds even where the
 * degrees count from another key (a song's key change). Then the degreeKey,
 * then the name. A label without a quality ('D' from the live analyzer, the
 * placeholder 'maj') takes one from another label on the same root. A slash
 * degree is the engine's inversion unless the region's degreeKey has no
 * slash: then the engine had nothing to say about the bass, and the '/1' of
 * a practice track's '2 maj/1' is the key's tonic.
 */
export function pitchesOfLabels(
  region: IdentityLabels,
  frame: KeyFrame | null,
): ChordPitches | null {
  const degreeKey = readLabel(region.degreeKey);
  const fromNote = readLabel(region.noteName);
  const fromName =
    region.name === region.noteName ? null : readLabel(region.name);
  const letterNote = typeof fromNote?.spec.root === 'string' ? fromNote : null;
  const candidates = [letterNote, degreeKey, fromName, fromNote].filter(
    (label, i, all): label is ReadLabel =>
      label !== null && all.indexOf(label) === i,
  );
  // The engine's own slash qualities, unless the degreeKey proves the
  // engine named no bass.
  const engineSlashes = !degreeKey || degreeKey.slash !== undefined;
  const read = candidates.map((label) => ({
    label,
    pitches: pitchesOfLabel(label, frame, engineSlashes || label === degreeKey),
  }));

  const first = read.find((r) => r.pitches !== null);
  if (!first?.pitches) return null;
  let pitches = first.pitches;
  const others = read.filter(
    (r) => r !== first && r.pitches?.rootPc === pitches.rootPc,
  );
  // A bare root ('D', or 'C' under the placeholder 'maj') takes its quality
  // from another label on the same root, and its bass too when it has none.
  if (!first.label.spec.quality.trim()) {
    const donor = others.find((r) => r.label.spec.quality.trim());
    if (donor?.pitches) {
      pitches = {
        ...pitches,
        quality: donor.pitches.quality,
        bassPc: first.label.slash ? pitches.bassPc : donor.pitches.bassPc,
      };
    }
  } else if (!first.label.slash) {
    // A plain chord takes the bass another label gives the same chord.
    const donor = others.find(
      (r) => r.label.slash && r.pitches?.quality === pitches.quality,
    );
    if (donor?.pitches) pitches = { ...pitches, bassPc: donor.pitches.bassPc };
  }
  return pitches;
}

/** `region` described by `pitches`, from `source`, for the name it has now. */
export function withIdentity<R extends IdentityLabels>(
  region: R,
  pitches: ChordPitches,
  source: ChordIdentitySource,
): R {
  return { ...region, identity: { ...pitches, source, label: region.name } };
}

/**
 * The region with an identity that describes it: the same object when it
 * already has one, else one read from its labels (`source`, 'derived' by
 * default). A stale identity is replaced, and dropped when the labels name
 * no chord the app knows: absent is legal, wrong is not. Running it twice
 * changes nothing.
 */
export function ensureChordIdentity<R extends IdentityLabels>(
  region: R,
  frame: KeyFrame | null,
  source: ChordIdentitySource = 'derived',
): R {
  if (identityIsCurrent(region)) return region;
  const pitches = pitchesOfLabels(region, frame);
  return pitches
    ? withIdentity(region, pitches, source)
    : withoutIdentity(region);
}

/**
 * ensureChordIdentity over a lane: the same array when every region already
 * has its identity, so an unchanged lane keeps its reference.
 */
export function ensureChordIdentities<R extends IdentityLabels>(
  regions: R[],
  frame: KeyFrame | null,
  source: ChordIdentitySource = 'derived',
): R[] {
  let changed = false;
  const next = regions.map((region) => {
    const ensured = ensureChordIdentity(region, frame, source);
    if (ensured !== region) changed = true;
    return ensured;
  });
  return changed ? next : regions;
}

/**
 * A region's identity carried over to a new name for the same chord, as a
 * key change relabels it ('1 maj' in C is '4 maj' in G). Undefined when it
 * had none it could trust.
 */
export function identityRelabelled(
  region: IdentityLabels,
  name: string,
): ChordRegionIdentity | undefined {
  return identityIsCurrent(region)
    ? { ...region.identity!, label: name }
    : undefined;
}
