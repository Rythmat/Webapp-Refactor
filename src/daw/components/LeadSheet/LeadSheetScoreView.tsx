import { useMemo, useState } from 'react';
import { NOTES } from '@prism/engine';
import { StaffView, type ScorePart } from '@/components/notation/StaffView';
import { useStore } from '@/daw/store';
import { chartExtraBars } from '@/daw/time/measureEdits';
import { timeSignatureOf } from '@/daw/time/timeModel';
import { regionToMeasures } from '@/daw/midi/leadSheetUtils';
import { ticksPerBar } from '@/daw/utils/timelineScale';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { Track } from '@/daw/store/tracksSlice';
import { ScorePalettes } from '../Score/ScorePalettes';
import { ScorePartsCache } from '../Score/scoreParts';
import { useScoreEditing } from '../Score/useScoreEditing';
import { ComposerLine } from './ComposerLine';
import { LeadSheetToolbar } from './LeadSheetToolbar';
import { melodyScoreParts } from './leadSheetMelody';
import './leadsheet-print.css';
import { PRINT_TITLE_INSET, useLeadSheetPrint } from './useLeadSheetPrint';

// ── The lead sheet, written out ────────────────────────────────────────────
// With Melody on, the sheet is a score of its melody tracks: the same staff
// renderer and the same palettes (the note tools among them) the Score
// uses, with the song's chord symbols standing over the top staff. There is
// one editor, so a tie drawn here behaves exactly as it does there, and an
// edit lands on the track its note belongs to, whichever staff it is on.

interface LeadSheetScoreViewProps {
  /**
   * The tracks the melody is read from and written back to, top staff first
   * (pickMelodyTracks).
   */
  tracks: Track[];
}

/** "Lead", "Lead and Keys", "Lead, Keys and Bass". */
function listNames(names: string[]): string {
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function LeadSheetScoreView({ tracks }: LeadSheetScoreViewProps) {
  useLeadSheetPrint();
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const projectName = useStore((s) => s.projectName);
  const chordRegions = useStore((s) => s.chordRegions);
  const slashNotes = useStore((s) => s.scoreSlashNotes);

  const timeSignature: [number, number] = useMemo(
    () => [numerator, denominator],
    [numerator, denominator],
  );
  // Bars are the project's own, so a 3/4 score is cut into 1440-tick bars
  // rather than the 1920 a 4/4 default would impose.
  const ticksPerMeasure = ticksPerBar(numerator, denominator);

  // Bars past the last chord: added ones, or as many as the song's sections
  // cover, as the chord chart counts them (milestone 2.13).
  const extraBars = useStore((s) =>
    chartExtraBars(s.leadSheetBars, s.sections, timeSignatureOf(s)),
  );
  // The sheet is as long as the chart is: chords and sections can run past
  // the melody.
  const measureCount = useMemo(
    () =>
      Math.max(
        1,
        regionToMeasures(chordRegions, ticksPerMeasure, extraBars).length,
      ),
    [chordRegions, ticksPerMeasure, extraBars],
  );

  const slashSet = useMemo(() => new Set(slashNotes), [slashNotes]);
  // The parts are kept between builds, as the Score keeps its parts: a
  // change to a track that leaves its notes alone (a fader move) hands back
  // the same part, so the staff has nothing to engrave.
  const [partsCache] = useState(() => new ScorePartsCache());
  const scoreParts = useMemo(
    () =>
      melodyScoreParts(tracks, {
        rootNote,
        mode,
        timeSignature,
        slashNotes: slashSet,
        minMeasures: measureCount,
        cache: partsCache,
      }),
    [tracks, rootNote, mode, timeSignature, slashSet, measureCount, partsCache],
  );
  const emptyNames = useMemo(
    () => scoreParts.filter((p) => p.noteCount === 0).map((p) => p.name),
    [scoreParts],
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

  // A lead sheet always carries its chords, so the top staff shows them
  // without being switched on the way a score's instruments are; the staves
  // under it share them rather than repeating them.
  const editing = useScoreEditing({
    parts,
    scoreParts,
    chordsAlwaysVisible: 'top',
  });
  const { selection } = editing;

  // The toolbar's insert/delete work on a bar, so hand it the first one
  // touched by whatever is selected.
  const selectedMeasureIdx = useMemo(() => {
    const cells = [...selection.cells].map((key) =>
      Number(key.split(':')[1] ?? NaN),
    );
    if (cells.length > 0) return Math.min(...cells.filter(Number.isFinite));
    if (selection.barline !== null) return selection.barline;
    const chords = [...selection.chords]
      .map((key) => key.split(':').slice(1).join(':'))
      .map((regionId) => chordRegions.find((r) => r.id === regionId))
      .filter((region): region is NonNullable<typeof region> => !!region);
    if (chords.length > 0) {
      return Math.floor(
        Math.min(...chords.map((c) => c.startTick)) / ticksPerMeasure,
      );
    }
    return null;
  }, [
    selection.cells,
    selection.barline,
    selection.chords,
    chordRegions,
    ticksPerMeasure,
  ]);

  return (
    // score-print-root: the sheet prints its engraved pages as the Score
    // does, on the borderless @page score they are drawn for, not under the
    // chord chart's 0.75 in margins (leadsheet-11).
    <div
      // It prints as the Score does, its engraved pages one to a sheet with
      // the title in the room StaffView keeps at the top of page 1.
      className="leadsheet-container leadsheet-score score-print-root flex flex-1 overflow-hidden"
      data-score-selection={`${selection.notes.size}n ${selection.cells.size}m ${selection.barline ?? '-'}b ${selection.chords.size}c ${selection.rests.size}r ${selection.marks.size}k`}
    >
      <div
        className="leadsheet-palette score-no-print flex w-[216px] shrink-0 flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--daw-hairline)' }}
      >
        <ScorePalettes {...editing.palette} notes={editing.editor} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <LeadSheetToolbar selectedMeasureIdx={selectedMeasureIdx} />

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

          {emptyNames.length > 0 && (
            <div
              className="score-no-print mb-4 text-center text-xs"
              style={{ color: 'var(--daw-text-3)' }}
              data-testid="melody-empty-hint"
            >
              {listNames(emptyNames)} {emptyNames.length === 1 ? 'has' : 'have'}{' '}
              no notes yet. Press Add notes (N) to write here, record a melody
              in Create, or turn Melody off to go back to the chord chart.
            </div>
          )}

          <StaffView
            parts={parts}
            printTitleInset={PRINT_TITLE_INSET}
            // An edit redraws only the systems it changed, as in the Score.
            incremental
            {...editing.staff}
          />
        </div>
      </div>
    </div>
  );
}
