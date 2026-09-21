import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NOTES } from '@prism/engine';
import { StaffView, type ScorePart } from '@/components/notation/StaffView';
import { useStore } from '@/daw/store';
import { TICKS_PER_MEASURE, regionToMeasures } from '@/daw/midi/leadSheetUtils';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { Track } from '@/daw/store/tracksSlice';
import { NoteEditorBar } from '../Score/NoteEditorBar';
import { ScorePalettes } from '../Score/ScorePalettes';
import { buildScoreParts } from '../Score/scoreParts';
import { useScoreEditing } from '../Score/useScoreEditing';
import { LeadSheetToolbar } from './LeadSheetToolbar';
import './leadsheet-print.css';

// ── The lead sheet, written out ────────────────────────────────────────────
// With a melody assigned, the sheet is one part of a score: the same staff
// renderer, the same palette, the same note editor the Score uses, with the
// song's chord symbols standing over the melody. There is one editor, so a
// tie drawn here behaves exactly as it does there.

interface LeadSheetScoreViewProps {
  /** The track the sheet's melody is read from and written back to. */
  track: Track;
}

export function LeadSheetScoreView({ track }: LeadSheetScoreViewProps) {
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const projectName = useStore((s) => s.projectName);
  const composerName = useStore((s) => s.composerName);
  const setComposerName = useStore((s) => s.setComposerName);
  const chordRegions = useStore((s) => s.chordRegions);
  const slashNotes = useStore((s) => s.scoreSlashNotes);

  const [isEditingComposer, setIsEditingComposer] = useState(false);
  const [composerInput, setComposerInput] = useState('');
  const composerInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditingComposer && composerInputRef.current) {
      composerInputRef.current.focus();
      composerInputRef.current.select();
    }
  }, [isEditingComposer]);
  const commitComposer = useCallback(() => {
    const trimmed = composerInput.trim();
    if (trimmed) setComposerName(trimmed);
    setIsEditingComposer(false);
  }, [composerInput, setComposerName]);

  const timeSignature: [number, number] = useMemo(
    () => [numerator, denominator],
    [numerator, denominator],
  );

  // The sheet is as long as the chart is: chords can run past the melody.
  const measureCount = useMemo(
    () => Math.max(1, regionToMeasures(chordRegions).length),
    [chordRegions],
  );

  const slashSet = useMemo(() => new Set(slashNotes), [slashNotes]);
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks: [track],
        rootNote,
        mode,
        timeSignature,
        slashNotes: slashSet,
        minMeasures: measureCount,
      }),
    [track, rootNote, mode, timeSignature, slashSet, measureCount],
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

  // A lead sheet always carries its chords, so the part shows them without
  // being switched on the way a score's instruments are.
  const editing = useScoreEditing({
    parts,
    scoreParts,
    chordsAlwaysVisible: true,
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
        Math.min(...chords.map((c) => c.startTick)) / TICKS_PER_MEASURE,
      );
    }
    return null;
  }, [selection.cells, selection.barline, selection.chords, chordRegions]);

  return (
    <div
      className="leadsheet-container flex flex-1 overflow-hidden"
      data-score-selection={`${selection.notes.size}n ${selection.cells.size}m ${selection.barline ?? '-'}b ${selection.chords.size}c ${selection.rests.size}r ${selection.marks.size}k`}
    >
      <div
        className="leadsheet-palette flex w-[216px] shrink-0 flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <ScorePalettes {...editing.palette} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <LeadSheetToolbar selectedMeasureIdx={selectedMeasureIdx} />
        <NoteEditorBar {...editing.editor} />

        <div
          className="leadsheet-scroll flex-1 overflow-y-auto"
          style={{ padding: '32px 48px' }}
        >
          <h1
            className="leadsheet-title mb-1 text-center text-xl font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            {projectName}
          </h1>

          {isEditingComposer ? (
            <div className="mb-1 flex justify-center">
              <input
                ref={composerInputRef}
                value={composerInput}
                onChange={(e) => setComposerInput(e.target.value)}
                onBlur={commitComposer}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitComposer();
                  if (e.key === 'Escape') setIsEditingComposer(false);
                }}
                className="rounded border px-2 py-0.5 text-center text-sm"
                style={{
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-accent, #7ecfcf)',
                  outline: 'none',
                  width: 200,
                }}
              />
            </div>
          ) : (
            <div
              className="leadsheet-composer mb-1 cursor-pointer text-center text-sm"
              style={{ color: 'var(--color-text-dim)' }}
              onDoubleClick={() => {
                setComposerInput(composerName);
                setIsEditingComposer(true);
              }}
              title="Double-click to edit composer"
            >
              {composerName
                ? `by ${composerName}`
                : 'Double-click to add composer'}
            </div>
          )}

          <div
            className="leadsheet-subtitle mb-6 flex justify-center gap-4 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {keyDisplay && <span>Key: {keyDisplay}</span>}
            <span>Tempo: {bpm} BPM</span>
            <span>
              Time: {numerator}/{denominator}
            </span>
          </div>

          {parts.length === 0 ? (
            <div
              className="py-16 text-center text-sm"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {track.name} has no notes yet. Record or write a melody on it, or
              turn Melody off to go back to the chord chart.
            </div>
          ) : (
            <StaffView parts={parts} {...editing.staff} />
          )}
        </div>
      </div>
    </div>
  );
}
