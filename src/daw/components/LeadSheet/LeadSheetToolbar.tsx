import { memo, useCallback, useMemo } from 'react';
import {
  Printer,
  Plus,
  Minus,
  Type,
  Music,
  Repeat,
  Bookmark,
  Repeat2,
  Layers,
  Lock,
  GitMerge,
} from 'lucide-react';
import { useLeadSheetSections, useStore } from '@/daw/store';
import { printSheet } from '@/daw/commands/projectCommands';
import {
  buildLeadSheetExport,
  buildLeadSheetMelodyExport,
  MUSICXML_TYPE,
} from '@/daw/midi/scoreExport';
import { downloadFile } from '@/daw/utils/exportFiles';
import { withTransaction } from '@/daw/store/history';
import type { LeadSheetChordFormat } from '@/daw/store/uiSlice';
import type { ChordRecordMode } from '@/daw/store/prismSlice';
import {
  chordNotationLabel,
  chordNotationLockTitle,
} from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';
import { pickMelodyTracks } from './leadSheetMelody';
import { MelodyTrackPicker } from './MelodyTrackPicker';
import { SendToSetListButton } from './SendToSetList';
import { promptDialog } from '@/daw/ui/DialogHost';
import { ScoreLayoutSwitch } from '../Score/ScoreLayoutSwitch';

interface LeadSheetToolbarProps {
  selectedMeasureIdx: number | null;
}

export const LeadSheetToolbar = memo(function LeadSheetToolbar({
  selectedMeasureIdx,
}: LeadSheetToolbarProps) {
  const chordFormat = useStore((s) => s.leadSheetChordFormat);
  const setChordFormat = useStore((s) => s.setLeadSheetChordFormat);
  // Jazz / Roman decide the chord symbols; the format picker only applies to hybrid.
  const chordNotation = useChordNotation();
  const formatLocked = chordNotation !== 'hybrid';
  const chordRegions = useStore((s) => s.chordRegions);
  const insertMeasures = useStore((s) => s.insertMeasures);
  const deleteMeasures = useStore((s) => s.deleteMeasures);
  const showRepeats = useStore((s) => s.leadSheetShowRepeats);
  const setShowRepeats = useStore((s) => s.setLeadSheetShowRepeats);
  // The song's sections, as marks on the bars they start at (milestone 2.13).
  const sections = useLeadSheetSections();
  const markSectionAtBar = useStore((s) => s.markSectionAtBar);
  const removeSectionAtBar = useStore((s) => s.removeSectionAtBar);
  const repeats = useStore((s) => s.leadSheetRepeats);
  const addRepeat = useStore((s) => s.addLeadSheetRepeat);
  const removeRepeat = useStore((s) => s.removeLeadSheetRepeat);
  const chordRecordMode = useStore((s) => s.chordRecordMode);
  const setChordRecordMode = useStore((s) => s.setChordRecordMode);
  const showMelody = useStore((s) => s.leadSheetShowMelody);
  const setShowMelody = useStore((s) => s.setLeadSheetShowMelody);
  const melodyTrackIds = useStore((s) => s.leadSheetMelodyTrackIds);
  const tracks = useStore((s) => s.tracks);

  // Printed from the Lead sheet layout: the lessons' Print-the-lead-sheet
  // done moment.
  const handleExportPdf = useCallback(() => {
    printSheet('printLeadSheet');
  }, []);

  const toggleRepeats = useCallback(() => {
    setShowRepeats(!showRepeats);
  }, [showRepeats, setShowRepeats]);

  // The melody tracks the sheet shows: with Melody on, each writes its own
  // staff instead of slashes. The picker beside the button chooses them.
  const melodyTracks = useMemo(
    () => (showMelody ? pickMelodyTracks(tracks, melodyTrackIds).tracks : []),
    [showMelody, tracks, melodyTrackIds],
  );
  const melodyIds = useMemo(
    () => melodyTracks.map((track) => track.id),
    [melodyTracks],
  );
  // The sheet as it is shown (scoreExport.ts): with a melody, the melody
  // under its chords (leadsheet-10); otherwise the chord chart, the same file
  // as the Export dialog's lead sheet.
  const handleExportMusicXml = useCallback(() => {
    const state = useStore.getState();
    const file =
      (melodyIds.length > 0 && buildLeadSheetMelodyExport(state, melodyIds)) ||
      buildLeadSheetExport(state);
    if (!file) return;
    downloadFile(new Blob([file.xml], { type: MUSICXML_TYPE }), file.filename);
    useStore.getState().markDone('exportMusicXml');
  }, [melodyIds]);

  const toggleMelody = useCallback(() => {
    setShowMelody(!showMelody);
  }, [showMelody, setShowMelody]);

  const toggleFormat = useCallback(() => {
    const cycle: Record<LeadSheetChordFormat, LeadSheetChordFormat> = {
      jazz: 'hybrid',
      hybrid: 'numbers',
      numbers: 'jazz',
    };
    setChordFormat(cycle[chordFormat]);
  }, [chordFormat, setChordFormat]);

  // A bar goes in after the selected one, or at the end with nothing
  // selected, so a chart can grow past its last chord (leadsheet-07). The
  // melody tracks the sheet shows move with the bars.
  const handleInsertMeasure = useCallback(() => {
    withTransaction('Insert bar', () =>
      insertMeasures(
        selectedMeasureIdx === null
          ? Number.POSITIVE_INFINITY
          : selectedMeasureIdx + 1,
        1,
        melodyIds,
      ),
    );
  }, [selectedMeasureIdx, insertMeasures, melodyIds]);

  const handleDeleteMeasure = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    withTransaction('Delete bar', () =>
      deleteMeasures(selectedMeasureIdx, 1, melodyIds),
    );
  }, [selectedMeasureIdx, deleteMeasures, melodyIds]);

  const hasSectionAtSelected =
    selectedMeasureIdx !== null &&
    sections.some((s) => s.measureIdx === selectedMeasureIdx);

  const hasRepeatAtSelected =
    selectedMeasureIdx !== null &&
    repeats.some((r) => r.startMeasure === selectedMeasureIdx);

  const handleAddSection = useCallback(async () => {
    if (selectedMeasureIdx === null) return;
    const measureIdx = selectedMeasureIdx;
    const label = await promptDialog({
      title: 'Add a section',
      label: 'Section label',
      description: 'For example A, B, Intro or Bridge.',
      confirmLabel: 'Add',
      maxLength: 24,
      validate: (value) => (value.trim() ? null : 'Type a label to add it.'),
    });
    if (!label || !label.trim()) return;
    markSectionAtBar(measureIdx, label.trim());
  }, [selectedMeasureIdx, markSectionAtBar]);

  const handleRemoveSection = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    removeSectionAtBar(selectedMeasureIdx);
  }, [selectedMeasureIdx, removeSectionAtBar]);

  const handleAddRepeat = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    addRepeat({
      startMeasure: selectedMeasureIdx,
      endMeasure: selectedMeasureIdx,
    });
  }, [selectedMeasureIdx, addRepeat]);

  const handleRemoveRepeat = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    removeRepeat(selectedMeasureIdx);
  }, [selectedMeasureIdx, removeRepeat]);

  const btnClass =
    'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors hover:bg-white/5';
  const btnStyle = {
    color: 'var(--daw-text)',
    background: 'none',
    border: 'none',
  };

  return (
    <div
      // Wraps rather than running under the side rail: with the layout
      // switch first it needs about 1,175 px, more than a Chromebook gives.
      className="leadsheet-toolbar flex flex-wrap items-center gap-1 border-b px-3 py-1.5"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'var(--daw-surface-1)',
      }}
    >
      {/* The Score page's layouts (the Score and the Lead sheet are one page). */}
      <ScoreLayoutSwitch />
      <div
        aria-hidden
        className="mx-1 h-5 w-px shrink-0"
        style={{ background: 'var(--daw-hairline)' }}
      />

      {/* Chord format toggle (locked to the global notation in jazz / roman) */}
      {formatLocked ? (
        <button
          className="flex h-7 cursor-default items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium"
          style={{ ...btnStyle, opacity: 0.4 }}
          aria-disabled
          title={chordNotationLockTitle(chordNotation)}
        >
          <Type size={13} strokeWidth={2} />
          {chordNotationLabel(chordNotation)}
        </button>
      ) : (
        <button
          className={btnClass}
          style={btnStyle}
          onClick={toggleFormat}
          title={`Chord format: ${chordFormat === 'jazz' ? 'Spelled' : chordFormat === 'hybrid' ? 'Hybrid' : 'Numbers'}`}
        >
          <Type size={13} strokeWidth={2} />
          {chordFormat === 'jazz'
            ? 'Spelled'
            : chordFormat === 'hybrid'
              ? 'Hybrid'
              : 'Numbers'}
        </button>
      )}

      {/* Repeat shorthand toggle */}
      <button
        className={btnClass}
        style={{
          ...btnStyle,
          opacity: showRepeats ? 1 : 0.5,
        }}
        onClick={toggleRepeats}
        title={`Repeat shorthand: ${showRepeats ? 'On' : 'Off'}`}
      >
        <Repeat size={13} strokeWidth={2} />
      </button>

      {/* Add Melody — writes the melody tracks onto the staff, and the
          picker beside it says which */}
      <div className="flex items-center">
        <button
          data-tutorial-id="leadsheet-melody-toggle"
          className={btnClass}
          style={{
            ...btnStyle,
            opacity: showMelody ? 1 : 0.5,
            color: showMelody ? 'var(--daw-accent)' : 'var(--daw-text)',
          }}
          onClick={toggleMelody}
          aria-pressed={showMelody}
          title={
            showMelody
              ? melodyTracks.length > 0
                ? `Melody from ${melodyTracks.map((t) => `\u201C${t.name}\u201D`).join(', ')} \u2014 click to hide`
                : 'Melody is on, but there is no instrument track to read it from \u2014 click to hide'
              : 'Add Melody: write the melody tracks on the staff'
          }
        >
          <Music size={13} strokeWidth={2} />
          Melody
        </button>
        <MelodyTrackPicker className={btnClass} style={btnStyle} />
      </div>

      <div
        className="mx-1 h-4 w-px"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      />

      {/* Measure operations */}
      <button
        data-tutorial-id="leadsheet-add-measure"
        className={btnClass}
        style={btnStyle}
        onClick={handleInsertMeasure}
        title="Insert measure"
      >
        <Plus size={13} strokeWidth={2} />
        Measure
      </button>

      <button
        className={btnClass}
        style={{
          ...btnStyle,
          opacity: selectedMeasureIdx === null ? 0.4 : 1,
        }}
        onClick={handleDeleteMeasure}
        disabled={selectedMeasureIdx === null}
        title="Delete selected measure"
      >
        <Minus size={13} strokeWidth={2} />
        Measure
      </button>

      <div
        className="mx-1 h-4 w-px"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      />

      {/* Section markers */}
      <button
        className={btnClass}
        style={{
          ...btnStyle,
          opacity: selectedMeasureIdx === null ? 0.4 : 1,
        }}
        onClick={
          hasSectionAtSelected
            ? handleRemoveSection
            : () => void handleAddSection()
        }
        disabled={selectedMeasureIdx === null}
        title={
          hasSectionAtSelected ? 'Remove section marker' : 'Add section marker'
        }
      >
        <Bookmark size={13} strokeWidth={2} />
        {hasSectionAtSelected ? '− Section' : '+ Section'}
      </button>

      {/* Repeat brackets */}
      <button
        className={btnClass}
        style={{
          ...btnStyle,
          opacity: selectedMeasureIdx === null ? 0.4 : 1,
        }}
        onClick={hasRepeatAtSelected ? handleRemoveRepeat : handleAddRepeat}
        disabled={selectedMeasureIdx === null}
        title={
          hasRepeatAtSelected ? 'Remove repeat bracket' : 'Add repeat bracket'
        }
      >
        <Repeat2 size={13} strokeWidth={2} />
        {hasRepeatAtSelected ? '− Repeat' : '+ Repeat'}
      </button>

      <div
        className="mx-1 h-4 w-px"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      />

      {/* Chord record mode toggle */}
      <div
        className="flex items-center rounded-md"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {(['replace', 'locked', 'merge'] as const).map((m) => (
          <button
            key={m}
            className={btnClass}
            style={{
              ...btnStyle,
              backgroundColor:
                chordRecordMode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            onClick={() => setChordRecordMode(m as ChordRecordMode)}
            title={
              m === 'replace'
                ? 'New chords overwrite existing'
                : m === 'locked'
                  ? 'Existing chords are protected'
                  : 'Merge new notes with existing chords'
            }
          >
            {m === 'replace' && <Layers size={13} strokeWidth={2} />}
            {m === 'locked' && <Lock size={13} strokeWidth={2} />}
            {m === 'merge' && <GitMerge size={13} strokeWidth={2} />}
            <span className="ml-0.5">
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Export buttons */}
      <button
        data-tutorial-id="leadsheet-export-musicxml"
        className={btnClass}
        style={{
          ...btnStyle,
          opacity: chordRegions.length === 0 ? 0.4 : 1,
        }}
        onClick={handleExportMusicXml}
        disabled={chordRegions.length === 0}
        title="Export as MusicXML"
      >
        <Music size={13} strokeWidth={2} />
        MusicXML
      </button>

      <button
        data-tutorial-id="leadsheet-print"
        className={btnClass}
        style={btnStyle}
        onClick={handleExportPdf}
        title="Export as PDF (Print)"
      >
        <Printer size={13} strokeWidth={2} />
        PDF
      </button>

      <SendToSetListButton className={btnClass} style={btnStyle} />
    </div>
  );
});
