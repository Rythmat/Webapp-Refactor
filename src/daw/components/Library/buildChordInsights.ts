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
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { UnisonChordRegion, UnisonDocument } from '@/unison/types/schema';
import {
  chordDescription,
  chordModeContext,
  type ChordModeContext,
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
  });
  return {
    color: rgbString(r, g, b),
    context,
    parentKeyLetter: displayAccidentals(
      noteNameInKey(context.parentRootPc, rootNote, mode),
    ),
    alternatives: findAllInterpretations(degreeName).filter(
      (i) => i.chordRootMode !== context.chordRootMode,
    ),
  };
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
  // Leading diminished chords are named by where they resolve (Priority 1).
  const leadingRoots = new Map<string, string>();
  respellLeadingChords(
    degreeKeys.map((degree) => {
      const root = noteNameInKey(
        degreeMidi(rootMidi, degree) % 12,
        rootNote,
        mode,
      );
      return `${root} ${unstepChord(degree).replace(/^diminished/, 'dim')}`;
    }),
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
    const chordRoot =
      leadingRoots.get(degreeName) ??
      noteNameInKey(bassMidi % 12, rootNote, mode);
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
    );
    const { chordRootMode, sessionMode, parentMode, isSessionParent } = context;

    // UNISON enrichment lookup
    const unisonRegion = unisonChordMap.get(degreeName);

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
  const keyMode = rootNote !== null ? mode : undefined;
  const rootLetter = displayAccidentals(
    rootNote !== null
      ? noteNameInKey(rootPc, rootNote, mode)
      : noteNameLetter(rootPc + 48),
  );
  const intervals = CHORDS[quality];
  // Chord tones as one unit from the root (Rule 3): D major in G minor is D F# A.
  const chordTones = chordToneNamesInKey(
    rootPc,
    intervals ?? [],
    rootNote ?? 0,
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
      ? chordKeyFacts(degreeName, rootPc, quality, rootNote, mode)
      : null;

  return {
    chordLabel,
    hybrid: degreeName ? degreeToHybrid(degreeName) : null,
    quality,
    inversion,
    rootLetter,
    noteNames: sorted.map((n) =>
      displayAccidentals(
        chordTones.get(n % 12) ?? noteNameInKey(n % 12, rootNote ?? 0, keyMode),
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
