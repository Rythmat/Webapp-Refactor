import {
  CHORDS,
  unstepChord,
  degreeMidi,
  generateChord,
  noteNameInKey,
  noteNameLetter,
  chordToneNames,
  chordToneNamesInKey,
  detectChordWithInversion,
  respellLeadingChords,
  resolveDegreeKey,
  getChordColor,
} from '@prism/engine';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { UnisonChordRegion, UnisonDocument } from '@/unison/types/schema';
import {
  getExpectedQualities,
  getScaleDegree,
  isDiatonic,
} from '@/unison/engine/diatonicChecker';
import { getBestBorrowedSource } from '@/unison/engine/modalInterchange';
import { detectSecondaryDominant } from '@/unison/engine/secondaryDominant';
import {
  chordDescription,
  chordModeContext,
  placeInSource,
  type ChordModeContext,
  type ChordSource,
} from './chordInKey';
import {
  INVERSION_LABELS,
  formatQuality,
  degreeToHybrid,
  intervalsToString,
  rgbString,
  findAllInterpretations,
  type ChordInsight,
  type ChordInterpretation,
} from './insightConstants';

/** Whether a pitch class is in the key's scale. */
function inScale(pc: number, rootNote: number, mode: string): boolean {
  return getScaleDegree(pc, rootNote, mode) !== null;
}

/** A UNISON document's chord timeline keyed by hybrid name (first wins). */
export function unisonChordLookup(
  doc: UnisonDocument | null | undefined,
): Map<string, UnisonChordRegion> {
  const map = new Map<string, UnisonChordRegion>();
  for (const region of doc?.analysis.chordTimeline ?? []) {
    if (!map.has(region.hybridName)) map.set(region.hybridName, region);
  }
  return map;
}

/**
 * What a chord is in the session key: its colour, the modes and parent scale
 * its lesson links point to, and the other scales it also belongs to. The
 * progression cards and the live "Now Playing" chord both read it from here,
 * so the same chord gets the same colour, links and alternatives in each.
 */
function chordKeyFacts(
  degreeName: string,
  chordRootPc: number,
  quality: string,
  rootNote: number,
  mode: string,
  source: ChordSource | null = null,
  /** The scale it comes from, for spelling its parent; worked out if absent. */
  from: { scaleRootPc: number; scaleMode: string } | null = null,
): {
  color: string;
  context: ChordModeContext;
  parentKeyLetter: string;
  alternatives: ChordInterpretation[];
} {
  const [r, g, b] = getChordColor(degreeName, rootNote + 48, mode);
  const context = chordModeContext({
    chordRootPc,
    quality,
    intervals: CHORDS[quality] ?? [],
    rootNote,
    mode,
    tonicName: displayAccidentals(noteNameInKey(rootNote, rootNote, mode)),
    source,
  });
  const scale =
    context.degreeSentence === null
      ? (from ??
        placeInSource(chordRootPc, CHORDS[quality] ?? [], rootNote, source))
      : null;
  return {
    color: rgbString(r, g, b),
    context,
    // A chord from outside the key names its parent as the scale it comes
    // from spells it: E♭ minor's parent is G♭ major, not F♯.
    parentKeyLetter: displayAccidentals(
      scale
        ? noteNameInKey(
            context.parentRootPc,
            scale.scaleRootPc,
            scale.scaleMode,
          )
        : noteNameInKey(context.parentRootPc, rootNote, mode),
    ),
    alternatives: findAllInterpretations(degreeName).filter(
      (i) => i.chordRootMode !== context.chordRootMode,
    ),
  };
}

/**
 * Where a chord outside the key comes from: the analysis's word when it has
 * one (borrowed from a mode, or the 5 or 7 of a degree), else the same rules
 * without the song around it — the live chord, or before an analysis runs.
 * Null for a chord in the key, or one no rule places.
 */
export function chordSource(
  chordRootPc: number,
  quality: string,
  rootNote: number,
  mode: string,
  region?: UnisonChordRegion,
): ChordSource | null {
  const tonicizes = (targetPc: number): ChordSource | null => {
    const degree = getScaleDegree(targetPc, rootNote, mode);
    if (degree === null) return null;
    const triad = getExpectedQualities(degree, mode).triad;
    return {
      kind: 'tonicizes',
      rootPc: targetPc,
      minor: triad === 'minor' || triad === 'diminished',
    };
  };
  const mi = region?.modalInterchange;
  if (mi?.type === 'secondary-dominant')
    return tonicizes((chordRootPc + 5) % 12);
  if (mi?.type === 'secondary-leading-tone')
    return tonicizes((chordRootPc + 1) % 12);
  const borrowedMode = mi?.sourceMode ?? region?.sourceMode;
  if (borrowedMode) return { kind: 'borrowed', mode: borrowedMode };
  if (region) return null;

  if (isDiatonic(chordRootPc, quality, rootNote, mode)) return null;
  const secondary = detectSecondaryDominant(
    chordRootPc,
    quality,
    null,
    null,
    rootNote,
    mode,
  );
  if (secondary?.type === 'secondary-dominant')
    return tonicizes((chordRootPc + 5) % 12);
  const borrowed = getBestBorrowedSource(chordRootPc, quality, rootNote, mode);
  if (borrowed) return { kind: 'borrowed', mode: borrowed.sourceMode };
  if (secondary) return tonicizes((chordRootPc + 1) % 12);
  return null;
}

/**
 * Insight chord cards for a list of degree keys ("2 minor9", "5 dominant13"),
 * one per distinct chord, in first-appearance order — enriched with the
 * matching UNISON chord (diatonic / borrowed) when given.
 *
 * Degrees count from the key's tonic, as chord-lane regions and UNISON write
 * them: in A minor, "1 minor" is A minor and "b7 major" is G major. Parent-
 * relative keys (Prism's stringSeq) go through ionianToModeLabel first.
 */
export function buildChordInsights(
  degreeKeys: readonly string[],
  rootNote: number,
  mode: string,
  unisonChordMap: Map<string, UnisonChordRegion>,
): ChordInsight[] {
  const rootMidi = rootNote + 48;
  // Each chord's place: where one from outside the key comes from, and its
  // root spelled in that scale — the leading tone of A harmonic minor is G♯,
  // not A♭; E♭ minor's 6 is C♭ (owner, 2026-10-24).
  const placed = new Map(
    degreeKeys.map((degreeName) => {
      const quality = unstepChord(degreeName);
      const rootPc = degreeMidi(rootMidi, degreeName) % 12;
      const unisonRegion = unisonChordMap.get(degreeName);
      const source = chordSource(rootPc, quality, rootNote, mode, unisonRegion);
      const from = inScale(rootPc, rootNote, mode)
        ? null
        : placeInSource(rootPc, CHORDS[quality] ?? [], rootNote, source);
      const root = from
        ? noteNameInKey(rootPc, from.scaleRootPc, from.scaleMode)
        : noteNameInKey(rootPc, rootNote, mode);
      return [degreeName, { unisonRegion, source, from, root }] as const;
    }),
  );
  // Leading diminished chords are named by where they resolve (Priority 1).
  const leadingRoots = new Map<string, string>();
  respellLeadingChords(
    degreeKeys.map(
      (degree) =>
        `${placed.get(degree)!.root} ${unstepChord(degree).replace(/^diminished/, 'dim')}`,
    ),
  ).forEach((name, i) => {
    if (!leadingRoots.has(degreeKeys[i])) {
      leadingRoots.set(degreeKeys[i], name.split(' ')[0]);
    }
  });
  const seen = new Set<string>();
  const results: ChordInsight[] = [];

  for (const degreeName of degreeKeys) {
    if (seen.has(degreeName)) continue;
    seen.add(degreeName);

    const quality = unstepChord(degreeName);
    const bassMidi = degreeMidi(rootMidi, degreeName);
    const pitchedNotes = generateChord(bassMidi, quality);
    const { unisonRegion, source, from } = placed.get(degreeName)!;
    const chordRoot =
      leadingRoots.get(degreeName) ?? placed.get(degreeName)!.root;
    const chordTones = chordToneNames(chordRoot, CHORDS[quality] ?? []);
    const noteNames = pitchedNotes.map((n) =>
      displayAccidentals(
        chordTones.get(n % 12) ?? noteNameInKey(n % 12, rootNote, mode),
      ),
    );
    const rootLetter = displayAccidentals(chordRoot);
    const intervals = CHORDS[quality];

    const { color, context, parentKeyLetter, alternatives } = chordKeyFacts(
      degreeName,
      bassMidi % 12,
      quality,
      rootNote,
      mode,
      source,
      from,
    );
    const { chordRootMode, sessionMode, parentMode, isSessionParent } = context;

    results.push({
      degreeName,
      hybrid: degreeToHybrid(degreeName),
      quality,
      chordLabel: `${rootLetter} ${formatQuality(quality)}`,
      rootLetter,
      noteNames,
      intervals: intervals ? intervalsToString(intervals) : '',
      color,
      sessionMode,
      chordRootMode,
      parentKeyLetter,
      parentMode,
      isSessionParent,
      description: chordDescription(quality, context),
      alternatives,
      // UNISON fields
      isDiatonic: unisonRegion?.isDiatonic,
      modalInterchange: unisonRegion?.modalInterchange,
      sourceMode: unisonRegion?.sourceMode,
    });
  }

  return results;
}

/**
 * The chord cards of an analyzed selection, read in the analysis's key: the
 * session key, or — for notes in a session with none set — the key the
 * notes suggest.
 */
export function selectionChordInsights(doc: UnisonDocument): ChordInsight[] {
  const { rootPc, mode } = doc.analysis.key;
  return buildChordInsights(
    doc.analysis.chordTimeline.map((c) => c.hybridName),
    rootPc,
    mode,
    unisonChordLookup(doc),
  );
}

/**
 * Which chord a card is, whatever key it's read in: its root's pitch class
 * and its quality. Picked notes that make a chord the song's cards already
 * show point at that card, not a second one (owner, 2026-10-24).
 */
export function chordMatchKey(chord: ChordInsight): string {
  return `${noteNameToPitchClass(chord.rootLetter) ?? chord.rootLetter}:${chord.quality}`;
}

/** The chord being played live (MIDI keys or detected audio notes). */
export interface LiveChord {
  /** "D min7 (1st Inversion)". */
  chordLabel: string;
  /** "2 min7", read from the session key; null without a key. */
  hybrid: string | null;
  quality: string;
  inversion: number;
  rootLetter: string;
  /** The held notes, low to high, spelled as chord tones. */
  noteNames: string[];
  intervals: string;
  // In the session key; null (or none) without one.
  color: string | null;
  sessionMode: string | null;
  chordRootMode: string | null;
  parentKeyLetter: string | null;
  parentMode: string | null;
  isSessionParent: boolean;
  alternatives: ChordInterpretation[];
}

/**
 * The chord in a set of held MIDI notes, for Insight's "Now Playing", or null
 * when fewer than two notes are held or they make no known chord. Its place in
 * the key comes from the same code as the progression cards (chordKeyFacts), with
 * the degree read the way the live chord colours read it (resolveDegreeKey).
 */
export function buildLiveChord(
  notes: Iterable<number>,
  rootNote: number | null,
  mode: string,
): LiveChord | null {
  const sorted = [...notes].sort((a, b) => a - b);
  if (sorted.length < 2) return null;
  const match = detectChordWithInversion(sorted);
  if (!match) return null;

  const { quality, rootPc, inversion } = match;
  const intervals = CHORDS[quality];
  // A chord from outside the key is spelled in the scale it comes from, as
  // the cards spell it.
  const source =
    rootNote !== null ? chordSource(rootPc, quality, rootNote, mode) : null;
  const from =
    rootNote !== null && !inScale(rootPc, rootNote, mode)
      ? placeInSource(rootPc, intervals ?? [], rootNote, source)
      : null;
  const spellPc = from ? from.scaleRootPc : (rootNote ?? 0);
  const keyMode = from ? from.scaleMode : rootNote !== null ? mode : undefined;
  const rootLetter = displayAccidentals(
    rootNote !== null
      ? noteNameInKey(rootPc, spellPc, keyMode)
      : noteNameLetter(rootPc + 48),
  );
  // Chord tones as one unit from the root (Rule 3): D major in G minor is D F# A.
  const chordTones = chordToneNamesInKey(
    rootPc,
    intervals ?? [],
    spellPc,
    keyMode,
  );
  const inversionLabel = INVERSION_LABELS[inversion];
  const chordLabel = inversionLabel
    ? `${rootLetter} ${formatQuality(quality)} (${inversionLabel})`
    : `${rootLetter} ${formatQuality(quality)}`;

  const degreeName =
    rootNote !== null ? resolveDegreeKey(rootPc, quality, rootNote) : null;
  const inKey =
    rootNote !== null && degreeName
      ? chordKeyFacts(degreeName, rootPc, quality, rootNote, mode, source, from)
      : null;

  return {
    chordLabel,
    hybrid: degreeName ? degreeToHybrid(degreeName) : null,
    quality,
    inversion,
    rootLetter,
    noteNames: sorted.map((n) =>
      displayAccidentals(
        chordTones.get(n % 12) ?? noteNameInKey(n % 12, spellPc, keyMode),
      ),
    ),
    intervals: intervals ? intervalsToString(intervals) : '',
    color: inKey?.color ?? null,
    sessionMode: inKey?.context.sessionMode ?? null,
    chordRootMode: inKey?.context.chordRootMode ?? null,
    parentKeyLetter: inKey?.parentKeyLetter ?? null,
    parentMode: inKey?.context.parentMode ?? null,
    isSessionParent: inKey?.context.isSessionParent ?? true,
    alternatives: inKey?.alternatives ?? [],
  };
}
