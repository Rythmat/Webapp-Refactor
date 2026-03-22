import { memo, useCallback } from 'react';
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
import { useStore } from '@/daw/store';
import { downloadLeadSheet } from '@/daw/midi/MusicXmlExport';
import type { LeadSheetChordFormat } from '@/daw/store/uiSlice';
import type { ChordRecordMode } from '@/daw/store/prismSlice';

interface LeadSheetToolbarProps {
  selectedMeasureIdx: number | null;
}

export const LeadSheetToolbar = memo(function LeadSheetToolbar({
  selectedMeasureIdx,
}: LeadSheetToolbarProps) {
  const chordFormat = useStore((s) => s.leadSheetChordFormat);
  const setChordFormat = useStore((s) => s.setLeadSheetChordFormat);
  const chordRegions = useStore((s) => s.chordRegions);
  const bpm = useStore((s) => s.bpm);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const insertMeasure = useStore((s) => s.insertMeasure);
  const deleteMeasure = useStore((s) => s.deleteMeasure);
  const showRepeats = useStore((s) => s.leadSheetShowRepeats);
  const setShowRepeats = useStore((s) => s.setLeadSheetShowRepeats);
  const projectName = useStore((s) => s.projectName);
  const sections = useStore((s) => s.leadSheetSections);
  const addSection = useStore((s) => s.addLeadSheetSection);
  const removeSection = useStore((s) => s.removeLeadSheetSection);
  const repeats = useStore((s) => s.leadSheetRepeats);
  const addRepeat = useStore((s) => s.addLeadSheetRepeat);
  const removeRepeat = useStore((s) => s.removeLeadSheetRepeat);
  const chordRecordMode = useStore((s) => s.chordRecordMode);
  const setChordRecordMode = useStore((s) => s.setChordRecordMode);

  const handleExportMusicXml = useCallback(() => {
    if (chordRegions.length === 0) return;
    downloadLeadSheet(chordRegions, {
      title: projectName,
      bpm,
      rootNote,
      mode,
    });
  }, [chordRegions, bpm, rootNote, mode, projectName]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  const toggleRepeats = useCallback(() => {
    setShowRepeats(!showRepeats);
  }, [showRepeats, setShowRepeats]);

  const toggleFormat = useCallback(() => {
    const cycle: Record<LeadSheetChordFormat, LeadSheetChordFormat> = {
      jazz: 'hybrid',
      hybrid: 'numbers',
      numbers: 'jazz',
    };
    setChordFormat(cycle[chordFormat]);
  }, [chordFormat, setChordFormat]);

  const handleInsertMeasure = useCallback(() => {
    const idx = selectedMeasureIdx ?? 0;
    insertMeasure(idx + 1);
  }, [selectedMeasureIdx, insertMeasure]);

  const handleDeleteMeasure = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    deleteMeasure(selectedMeasureIdx);
  }, [selectedMeasureIdx, deleteMeasure]);

  const hasSectionAtSelected =
    selectedMeasureIdx !== null &&
    sections.some((s) => s.measureIdx === selectedMeasureIdx);

  const hasRepeatAtSelected =
    selectedMeasureIdx !== null &&
    repeats.some((r) => r.startMeasure === selectedMeasureIdx);

  const handleAddSection = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    const label = window.prompt('Section label (e.g. A, B, Intro, Bridge):');
    if (!label || !label.trim()) return;
    addSection({ measureIdx: selectedMeasureIdx, label: label.trim() });
  }, [selectedMeasureIdx, addSection]);

  const handleRemoveSection = useCallback(() => {
    if (selectedMeasureIdx === null) return;
    removeSection(selectedMeasureIdx);
  }, [selectedMeasureIdx, removeSection]);

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
    color: 'var(--color-text)',
    background: 'none',
    border: 'none',
  };

  return (
    <div
      className="leadsheet-toolbar flex items-center gap-1 border-b px-3 py-1.5"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'var(--color-surface-1)',
      }}
    >
      {/* Chord format toggle */}
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

      <div
        className="mx-1 h-4 w-px"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      />

      {/* Measure operations */}
      <button
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
        onClick={hasSectionAtSelected ? handleRemoveSection : handleAddSection}
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
        className={btnClass}
        style={btnStyle}
        onClick={handleExportPdf}
        title="Export as PDF (Print)"
      >
        <Printer size={13} strokeWidth={2} />
        PDF
      </button>
    </div>
  );
});
