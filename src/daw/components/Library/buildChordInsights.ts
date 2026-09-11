import {
  CHORDS,
  unstepChord,
  degreeMidi,
  generateChord,
  noteNameInKey,
  chordToneNames,
  respellLeadingChords,
  getChordColor,
  getModeOffset,
  ionianToModeLabel,
} from '@prism/engine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { UnisonChordRegion, UnisonDocument } from '@/unison/types/schema';
import { getChordTheory } from './chordTheoryMap';
import {
  PARENT_SCALE_INFO,
  FAMILY_INTERVALS,
  FAMILY_MODES,
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
 * matching UNISON chord (roman numeral, diatonic / borrowed) when given.
 */
export function buildChordInsights(
  degreeKeys: readonly string[],
  rootNote: number,
  mode: string,
  unisonChordMap: Map<string, UnisonChordRegion>,
): ChordInsight[] {
  const rootMidi = rootNote + 48;
  // Leading diminished chords are named by where they resolve (Priority 1).
  const parentRootMidi = rootMidi - getModeOffset(mode);
  const leadingRoots = new Map<string, string>();
  respellLeadingChords(
    degreeKeys.map((degree) => {
      const root = noteNameInKey(
        degreeMidi(parentRootMidi, degree) % 12,
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
    const parentRoot = rootMidi - getModeOffset(mode);
    const bassMidi = degreeMidi(parentRoot, degreeName);
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

    const [r, g, b] = getChordColor(degreeName, parentRoot);

    const chordRootPc = bassMidi % 12;
    const chordRootMode = getChordTheory(quality).mode;

    const chordModeInfo = PARENT_SCALE_INFO[chordRootMode];
    const chordParentFamily = chordModeInfo?.family ?? 'Ionian';
    const chordParentRootPc = chordModeInfo
      ? (chordRootPc + chordModeInfo.offset) % 12
      : chordRootPc;

    const sessionInterval = (rootNote - chordParentRootPc + 12) % 12;
    const chordFamilyIntervals = FAMILY_INTERVALS[chordParentFamily];
    const sessionDegIdx = chordFamilyIntervals?.indexOf(sessionInterval) ?? -1;
    const sessionMode =
      sessionDegIdx >= 0
        ? (FAMILY_MODES[chordParentFamily]?.[sessionDegIdx] ?? null)
        : null;

    const isChordParent = !chordModeInfo || chordModeInfo.offset === 0;
    const isSessionParent = isChordParent || chordParentRootPc === rootNote;
    const parentKeyLetter = displayAccidentals(
      noteNameInKey(chordParentRootPc, rootNote, mode),
    );
    const parentMode = FAMILY_MODES[chordParentFamily]?.[0] ?? chordRootMode;

    const allInterps = findAllInterpretations(degreeName);
    const alternatives = allInterps.filter(
      (i) => i.chordRootMode !== chordRootMode,
    );

    // UNISON enrichment lookup
    const unisonRegion = unisonChordMap.get(degreeName);

    results.push({
      degreeName: ionianToModeLabel(degreeName, mode),
      hybrid: degreeToHybrid(ionianToModeLabel(degreeName, mode)),
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
      description: getChordTheory(quality).description,
      alternatives,
      // UNISON fields
      isDiatonic: unisonRegion?.isDiatonic,
      modalInterchange: unisonRegion?.modalInterchange,
      sourceMode: unisonRegion?.sourceMode,
    });
  }

  return results;
}
