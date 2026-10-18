import { buildScoreParts } from '@/daw/components/Score/scoreParts';
import { spellingMap } from '@/daw/components/Score/noteEditor';
import { breaksFromRowSizes } from '@/daw/components/Score/roadmap';
import type { AllSlices } from '@/daw/store';
import { leadSheetSectionsOf } from '@/daw/store/sectionsSlice';
import { chartExtraBars } from '@/daw/time/measureEdits';
import { timeSignatureOf } from '@/daw/time/timeModel';
import { fileSlug, songSlug } from '@/daw/utils/exportFiles';
import { buildLeadSheetXml } from './MusicXmlExport';
import { buildScoreXml } from './ScoreMusicXmlExport';

// ── Notation exports: the Score and the lead sheet as MusicXML (milestone 2.15)
//
// The two MusicXML files the Studio writes, worked out from the store's
// state alone (no React, no download), so the Score's button, the lead
// sheet's button and the Export dialog all write the same file under the
// same name. The callers hand the result to downloadFile as a Blob of
// MUSICXML_TYPE.

/** The media type MusicXML files are saved with. */
export const MUSICXML_TYPE = 'application/vnd.recordare.musicxml+xml';

export interface NotationFile {
  xml: string;
  filename: string;
}

export type FullScoreState = Pick<
  AllSlices,
  | 'tracks'
  | 'projectName'
  | 'composerName'
  | 'bpm'
  | 'rootNote'
  | 'mode'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
  | 'scoreSlashNotes'
  | 'scoreSpellings'
  | 'scoreArticulations'
  | 'scoreSlurs'
  | 'scoreChordTracks'
  | 'chordRegions'
  | 'sections'
  | 'leadSheetRepeats'
  | 'measureRowSizes'
  | 'measuresPerLine'
>;

/** Articulation kinds by note id, from the Score's 'id|kind' entries. */
function articulationsOf(entries: readonly string[]): Map<string, string[]> {
  const articulations = new Map<string, string[]>();
  for (const entry of entries) {
    const cut = entry.lastIndexOf('|');
    const id = entry.slice(0, cut);
    articulations.set(id, [
      ...(articulations.get(id) ?? []),
      entry.slice(cut + 1),
    ]);
  }
  return articulations;
}

/**
 * The Score as MusicXML: every notatable track holding notes, one part each,
 * with what the Score lays over them (chord symbols, articulations, slurs,
 * section marks, repeats, system breaks), as the Score page draws it.
 *
 * With `trackIds`, only those tracks' parts, still built against the whole
 * song (the same bar count, key and marks as in the full score). Chord
 * symbols stay on the parts that carry them in the full score (the Score's
 * chord tracks, or its top part when none is chosen): a chosen part that
 * carried them keeps them, and a selection without one has no chord symbols
 * (rather than moving them onto a part that never showed them). Tempo,
 * section marks and system breaks go on the first chosen part, as they go
 * on the top part of the full score.
 *
 * Named after the song ('my-song-score.musicxml'), or after the song and
 * the track when one track is asked for ('my-song-bass.musicxml'). Null
 * when no chosen part has notes.
 */
export function buildFullScoreXml(
  state: FullScoreState,
  opts: { trackIds?: readonly string[] } = {},
): NotationFile | null {
  const timeSignature: [number, number] = [
    state.timeSignatureNumerator,
    state.timeSignatureDenominator,
  ];
  const all = buildScoreParts({
    tracks: state.tracks,
    rootNote: state.rootNote,
    mode: state.mode,
    timeSignature,
    slashNotes: new Set(state.scoreSlashNotes),
    spellings: spellingMap(state.scoreSpellings),
  });
  const only = opts.trackIds ? new Set(opts.trackIds) : null;
  const parts = only ? all.filter((p) => only.has(p.id)) : all;
  if (parts.length === 0) return null;

  let chordPartIds: ReadonlySet<string> = new Set(state.scoreChordTracks);
  let chordRegions = state.chordRegions;
  if (only) {
    const carriers =
      chordPartIds.size > 0
        ? chordPartIds
        : new Set(all.slice(0, 1).map((p) => p.id));
    chordPartIds = new Set(
      parts.filter((p) => carriers.has(p.id)).map((p) => p.id),
    );
    // An empty set would put them on the top part (buildScoreXml's default).
    if (chordPartIds.size === 0) chordRegions = [];
  }

  // Every part shares the song's bars, so any part's count is the score's.
  const measureCount = Math.max(0, ...all.map((p) => p.score.measures.length));
  const xml = buildScoreXml(
    parts.map(({ id, name, score }) => ({
      id,
      name,
      score,
      drums: score.staves.includes('percussion'),
    })),
    {
      title: state.projectName,
      composer: state.composerName || undefined,
      bpm: state.bpm,
      chordRegions,
      chordPartIds,
      articulations: articulationsOf(state.scoreArticulations),
      slurs: state.scoreSlurs.map((pair) => {
        const cut = pair.indexOf('|');
        return [pair.slice(0, cut), pair.slice(cut + 1)] as const;
      }),
      sections: leadSheetSectionsOf(state),
      repeats: state.leadSheetRepeats,
      systemStarts: breaksFromRowSizes(
        state.measureRowSizes,
        state.measuresPerLine || 4,
        measureCount,
      ),
    },
  );

  const song = songSlug(state.projectName);
  const one =
    opts.trackIds?.length === 1
      ? state.tracks.find((t) => t.id === opts.trackIds![0])
      : undefined;
  return {
    xml,
    filename: one
      ? `${song}-${fileSlug(one.name, 'track')}.musicxml`
      : `${song}-score.musicxml`,
  };
}

export type LeadSheetExportState = Pick<
  AllSlices,
  | 'chordRegions'
  | 'projectName'
  | 'bpm'
  | 'rootNote'
  | 'mode'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
  | 'leadSheetBars'
  | 'sections'
>;

/**
 * The lead sheet (the chord chart) as MusicXML, as the lead sheet draws it:
 * in the project's metre (not 4/4, ia-flows-34) and as long as its chart
 * (the bars added past the last chord, or the song's sections where they run
 * on: chartExtraBars), with the song's sections as rehearsal marks, as the
 * Score's export writes them. Named 'my-song-lead-sheet.musicxml'. Null when
 * the song has no chords.
 */
export function buildLeadSheetExport(
  state: LeadSheetExportState,
): NotationFile | null {
  if (state.chordRegions.length === 0) return null;
  const timeSignature = timeSignatureOf(state);
  const xml = buildLeadSheetXml(state.chordRegions, {
    title: state.projectName,
    bpm: state.bpm,
    rootNote: state.rootNote,
    mode: state.mode,
    timeSignature,
    extraBars: chartExtraBars(
      state.leadSheetBars,
      state.sections,
      timeSignature,
    ),
    sections: leadSheetSectionsOf(state),
  });
  return {
    xml,
    filename: `${songSlug(state.projectName)}-lead-sheet.musicxml`,
  };
}
