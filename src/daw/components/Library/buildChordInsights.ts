import {
  CHORDS,
  unstepChord,
  degreeMidi,
  generateChord,
  noteNameInKey,
  chordToneNames,
  respellLeadingChords,
  getChordColor,
} from '@prism/engine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { UnisonChordRegion, UnisonDocument } from '@/unison/types/schema';
import { chordDescription, chordModeContext } from './chordInKey';
import {
  formatQuality,
  degreeToHybrid,
  intervalsToString,
  rgbString,
  findAllInterpretations,
  type ChordInsight,
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

    const [r, g, b] = getChordColor(degreeName, rootMidi, mode);

    const context = chordModeContext({
      chordRootPc: bassMidi % 12,
      quality,
      intervals: intervals ?? [],
      rootNote,
      mode,
      tonicName: displayAccidentals(noteNameInKey(rootNote, rootNote, mode)),
    });
    const { chordRootMode, sessionMode, parentMode, isSessionParent } = context;
    const parentKeyLetter = displayAccidentals(
      noteNameInKey(context.parentRootPc, rootNote, mode),
    );

    const allInterps = findAllInterpretations(degreeName);
    const alternatives = allInterps.filter(
      (i) => i.chordRootMode !== chordRootMode,
    );

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
      color: rgbString(r, g, b),
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
