import { useMemo, useState } from 'react';
import { NOTES } from '@prism/engine';
import { StaffView, type ScorePart } from '@/components/notation/StaffView';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { regionToMeasures } from '@/daw/midi/leadSheetUtils';
import type { UiSlice } from '@/daw/store/uiSlice';
import type { Track } from '@/daw/store/tracksSlice';
import { chartExtraBars } from '@/daw/time/measureEdits';
import { ComposerLine } from '../LeadSheet/ComposerLine';
import { LeadSheetChartView } from '../LeadSheet/LeadSheetView';
import '../LeadSheet/leadsheet-print.css';
import {
  PRINT_TITLE_INSET,
  useLeadSheetPrint,
} from '../LeadSheet/useLeadSheetPrint';
import { ScorePalettes } from './ScorePalettes';
import { ScorePartsPanel } from './ScorePartsPanel';
import { ScoreToolbar } from './ScoreToolbar';
import {
  buildScoreParts,
  isDrumTrack,
  isNotatable,
  SCORE_MIN_MEASURES,
  ScorePartsCache,
} from './scoreParts';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { spellingMap } from './noteEditor';
import { useScoreEditing } from './useScoreEditing';

// ── Score ──────────────────────────────────────────────────────────────────
// The Score and the Lead sheet are one editor (owner, 2026-10-21): one page,
// one toolbar (ScoreToolbar) and one palette column. Its tracks are notated
// and stacked the way a conductor's score is laid out, one part per track,
// shared barlines, the transport's playhead running through all of them,
// with the song's chords standing over them; the toolbar's Staves menu
// says which tracks have a staff. With none to show (every one off, or no
// notes yet), the page is the chord chart (LeadSheetChartView), under the
// same toolbar. The editing itself lives in useScoreEditing, and the note
// tools are palettes beside the staff rather than a row above it.

/** The tracks with a staff on the page: the instruments not switched off. */
function staveTracks(
  tracks: readonly Track[],
  hidden: readonly string[],
): Track[] {
  return tracks.filter((t) => isNotatable(t) && !hidden.includes(t.id));
}

/**
 * Staves while a shown track has notes, or note input has a pitched one to
 * write on; otherwise the chord chart.
 */
function pageOf(
  s: Pick<UiSlice, 'scoreHiddenTrackIds' | 'scoreNoteInput'> & {
    tracks: Track[];
  },
): 'staves' | 'chart' {
  const shown = staveTracks(s.tracks, s.scoreHiddenTrackIds);
  const notes = shown.some((t) => t.midiClips.some((c) => c.events.length));
  const writable = s.scoreNoteInput && shown.some((t) => !isDrumTrack(t));
  return notes || writable ? 'staves' : 'chart';
}

export function ScoreView() {
  const page = useStore(pageOf);
  return page === 'staves' ? <ScoreStaves /> : <LeadSheetChartView />;
}

function ScoreStaves() {
  // The score prints through the lead sheet's print rules (its named page).
  useLeadSheetPrint();
  const allTracks = useStore((s) => s.tracks);
  const hidden = useStore((s) => s.scoreHiddenTrackIds);
  const tracks = useMemo(
    () => staveTracks(allTracks, hidden),
    [allTracks, hidden],
  );
  const chordRegions = useStore((s) => s.chordRegions);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const projectName = useStore((s) => s.projectName);
  // The roadmap lives with the lead sheet's, so edits show up in both views.
  const slashNotes = useStore((s) => s.scoreSlashNotes);
  const scoreSpellings = useStore((s) => s.scoreSpellings);
  // Note input shows the instruments with nothing written yet, to write on.
  const noteInput = useStore((s) => s.scoreNoteInput);
  // The chart's bars: chords past the last note, bars added with + Measure
  // and the bars the song's sections cover all get their bars, so the
  // staves are as long as the chord chart is.
  const extraBars = useStore((s) =>
    chartExtraBars(s.leadSheetBars, s.sections, timeSignatureOf(s)),
  );
  const ticksPerMeasure = ticksPerBar({ numerator, denominator });
  const chordBars = useMemo(
    () => regionToMeasures(chordRegions, ticksPerMeasure, extraBars).length,
    [chordRegions, ticksPerMeasure, extraBars],
  );

  const timeSignature: [number, number] = useMemo(
    () => [numerator, denominator],
    [numerator, denominator],
  );

  const slashSet = useMemo(() => new Set(slashNotes), [slashNotes]);
  const spellings = useMemo(
    () => spellingMap(scoreSpellings),
    [scoreSpellings],
  );
  // Parts are rebuilt only for the tracks an edit touched, and a change that
  // leaves the music alone (a fader, a mute) hands back the same parts, so
  // the staff has nothing to engrave.
  const [partsCache] = useState(() => new ScorePartsCache());
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks,
        rootNote,
        mode,
        timeSignature,
        slashNotes: slashSet,
        spellings,
        cache: partsCache,
        includeEmpty: noteInput,
        ...(chordBars > SCORE_MIN_MEASURES ? { minMeasures: chordBars } : {}),
      }),
    [
      tracks,
      rootNote,
      mode,
      timeSignature,
      slashSet,
      spellings,
      partsCache,
      noteInput,
      chordBars,
    ],
  );
  const parts: ScorePart[] = useMemo(
    () => scoreParts.map(({ id, name, score }) => ({ id, name, score })),
    [scoreParts],
  );

  const keyDisplay = useMemo(() => {
    if (rootNote === null) return '';
    const note = displayAccidentals(NOTES[rootNote] ?? '');
    const modeLabel =
      mode === 'ionian' ? 'Major' : mode === 'aeolian' ? 'Minor' : mode;
    return `${note} ${modeLabel}`;
  }, [rootNote, mode]);

  const editing = useScoreEditing({ parts, scoreParts });
  const { selection } = editing;

  // The toolbar's bar, section and repeat tools work on a bar: the first one
  // touched by whatever is selected.
  const selectedMeasureIdx = useMemo(() => {
    const cells = [...selection.cells]
      .map((key) => Number(key.split(':')[1] ?? NaN))
      .filter(Number.isFinite);
    if (cells.length > 0) return Math.min(...cells);
    if (selection.barline !== null) return selection.barline;
    const starts = [...selection.chords]
      .map((key) => key.split(':').slice(1).join(':'))
      .map((id) => chordRegions.find((r) => r.id === id)?.startTick)
      .filter((tick): tick is number => tick !== undefined);
    if (starts.length > 0) {
      return Math.floor(Math.min(...starts) / ticksPerMeasure);
    }
    return null;
  }, [
    selection.cells,
    selection.barline,
    selection.chords,
    chordRegions,
    ticksPerMeasure,
  ]);

  const staveTrackIds = useMemo(() => parts.map((p) => p.id), [parts]);

  const skipped = allTracks.filter(
    (t) =>
      !isNotatable(t) && (t.midiClips.length > 0 || t.audioClips.length > 0),
  );

  return (
    <div
      className="leadsheet-container score-print-root flex flex-1 overflow-hidden"
      data-score-selection={`${selection.notes.size}n ${selection.cells.size}m ${selection.barline ?? '-'}b ${selection.chords.size}c ${selection.rests.size}r ${selection.marks.size}k`}
    >
      <div
        className="score-no-print flex w-[216px] shrink-0 flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--daw-hairline)' }}
      >
        <ScorePalettes {...editing.palette} notes={editing.editor} />
        <ScorePartsPanel
          parts={editing.partRows}
          onSetStaff={editing.onSetStaff}
          onToggleChords={editing.onToggleChords}
          onRestoreChords={editing.onRestoreChords}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ScoreToolbar
          selectedMeasureIdx={selectedMeasureIdx}
          staveTrackIds={staveTrackIds}
          status={
            <span
              className="ml-2 flex items-center gap-2 text-[11px]"
              style={{ color: 'var(--daw-text-3)' }}
            >
              {editing.noteInput.on && (
                <span
                  data-note-input-status
                  className="rounded px-2 py-0.5 font-semibold uppercase tracking-wider"
                  style={{
                    border: '1px solid var(--daw-accent)',
                    color: 'var(--daw-text)',
                  }}
                >
                  Note input · {editing.noteInput.dotted ? 'dotted ' : ''}
                  {editing.noteInput.duration.name.toLowerCase()}
                </span>
              )}
              {skipped.length > 0 && (
                <span title={skipped.map((t) => t.name).join(', ')}>
                  {skipped.length} not notated (audio)
                </span>
              )}
            </span>
          }
        />

        <div
          className="leadsheet-scroll flex-1 overflow-y-auto"
          style={{ padding: '32px 48px' }}
        >
          <div className="score-print-title">
            <h1
              className="leadsheet-title mb-1 text-center text-xl font-bold"
              style={{ color: 'var(--daw-text)' }}
            >
              {projectName}
            </h1>

            <ComposerLine />

            <div
              className="leadsheet-subtitle mb-6 flex justify-center gap-4 text-xs"
              style={{ color: 'var(--daw-text-3)' }}
            >
              {keyDisplay && <span>Key: {keyDisplay}</span>}
              <span>Tempo: {bpm} BPM</span>
              <span>
                Time: {numerator}/{denominator}
              </span>
            </div>
          </div>

          {parts.length === 0 ? (
            <div
              className="py-16 text-center text-sm"
              style={{ color: 'var(--daw-text-3)' }}
            >
              {noteInput
                ? 'Add an instrument track to write notes on it.'
                : 'No notes to notate yet. Record or write MIDI on a track, or press Add notes (N) to write them here.'}
            </div>
          ) : (
            <StaffView
              parts={parts}
              printTitleInset={PRINT_TITLE_INSET}
              // An edit redraws only the systems it changed; Learn's staves
              // leave this off.
              incremental
              {...editing.staff}
            />
          )}
        </div>
      </div>
    </div>
  );
}
