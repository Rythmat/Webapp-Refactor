import { useCallback, useMemo, useState } from 'react';
import { NOTES } from '@prism/engine';
import { StaffView, type ScorePart } from '@/components/notation/StaffView';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { ComposerLine } from '../LeadSheet/ComposerLine';
import '../LeadSheet/leadsheet-print.css';
import { useLeadSheetPrint } from '../LeadSheet/useLeadSheetPrint';
import { ScoreLayoutSwitch } from './ScoreLayoutSwitch';
import { ScorePalettes } from './ScorePalettes';
import { ScorePartsPanel } from './ScorePartsPanel';
import { buildScoreParts, isNotatable, ScorePartsCache } from './scoreParts';
import { spellingMap } from './noteEditor';
import { useScoreEditing } from './useScoreEditing';
import { buildFullScoreXml, MUSICXML_TYPE } from '@/daw/midi/scoreExport';
import { downloadFile } from '@/daw/utils/exportFiles';
import { inches } from '@/lib/notation/pageLayout';

// ── Score ──────────────────────────────────────────────────────────────────
// Every track of the project notated and stacked, the way a conductor's score
// is laid out: one part per track, shared barlines, the transport's playhead
// running through all of them. The editing itself lives in useScoreEditing,
// which the Lead Sheet uses too. The Score and the Lead sheet are one page
// (one Score tab; ScoreLayoutSwitch picks the layout), and the note tools
// are palettes beside the staff rather than a row above it.

/** Room at the top of printed page 1 for the title block (page pixels). */
const PRINT_TITLE_INSET = inches(0.85);

export function ScoreView() {
  // The score prints through the lead sheet's print rules (its named page).
  useLeadSheetPrint();
  const tracks = useStore((s) => s.tracks);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const projectName = useStore((s) => s.projectName);
  // The roadmap lives with the lead sheet's, so edits show up in both views.
  const slashNotes = useStore((s) => s.scoreSlashNotes);
  const scoreSpellings = useStore((s) => s.scoreSpellings);

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
      }),
    [tracks, rootNote, mode, timeSignature, slashSet, spellings, partsCache],
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

  // Every editing tool lives in the shared hook, so the Lead Sheet's melody
  // is edited with exactly these tools rather than a second set.
  const editing = useScoreEditing({ parts, scoreParts });
  const { selection } = editing;

  // Exports: MusicXML of every part, and printing the engraved pages. The
  // file is the Export dialog's full score, built from the store at the
  // click (scoreExport.ts).
  const exportMusicXml = useCallback(() => {
    const file = buildFullScoreXml(useStore.getState());
    if (!file) return;
    downloadFile(new Blob([file.xml], { type: MUSICXML_TYPE }), file.filename);
  }, []);

  const skipped = tracks.filter(
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
          onToggleChords={editing.onToggleChords}
          onRestoreChords={editing.onRestoreChords}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className="score-no-print flex shrink-0 items-center gap-3 px-3 text-xs"
          style={{
            height: 40,
            borderBottom: '1px solid var(--daw-hairline)',
            color: 'var(--daw-text-3)',
          }}
        >
          <ScoreLayoutSwitch />
          <span>
            {parts.length} {parts.length === 1 ? 'part' : 'parts'}
          </span>
          {skipped.length > 0 && (
            <span title={skipped.map((t) => t.name).join(', ')}>
              · {skipped.length} not notated (audio)
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Selection highlights are editing state, not the music.
                editing.staff.onBackgroundPointerDown();
                requestAnimationFrame(() => window.print());
              }}
              disabled={parts.length === 0}
              title="Print the score, or save it as a PDF from the print dialog"
              className="rounded px-2 py-1 font-semibold uppercase tracking-wider transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ border: '1px solid var(--daw-hairline)' }}
            >
              Print / PDF
            </button>
            <button
              type="button"
              onClick={exportMusicXml}
              disabled={parts.length === 0}
              title="Download every part as MusicXML, for MuseScore, Finale, Sibelius or Dorico"
              className="rounded px-2 py-1 font-semibold uppercase tracking-wider transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ border: '1px solid var(--daw-hairline)' }}
            >
              MusicXML
            </button>
          </div>
        </div>

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
              No notes to notate yet. Record or write MIDI on a track and it
              will appear here.
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
