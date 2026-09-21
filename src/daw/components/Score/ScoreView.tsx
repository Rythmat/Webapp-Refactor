import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NOTES } from '@prism/engine';
import { StaffView, type ScorePart } from '@/components/notation/StaffView';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useMe } from '@/hooks/data/auth/useMe';
import '../LeadSheet/leadsheet-print.css';
import { NoteEditorBar } from './NoteEditorBar';
import { ScorePalettes } from './ScorePalettes';
import { ScorePartsPanel } from './ScorePartsPanel';
import { buildScoreParts, isNotatable } from './scoreParts';
import { spellingMap } from './noteEditor';
import { useScoreEditing } from './useScoreEditing';
import { breaksFromRowSizes } from './roadmap';
import { downloadScoreXml } from '@/daw/midi/ScoreMusicXmlExport';
import { inches } from '@/lib/notation/pageLayout';

// ── Score ──────────────────────────────────────────────────────────────────
// Every track of the project notated and stacked, the way a conductor's score
// is laid out: one part per track, shared barlines, the transport's playhead
// running through all of them. The editing itself lives in useScoreEditing,
// which the Lead Sheet uses too.

/** Room at the top of printed page 1 for the title block (page pixels). */
const PRINT_TITLE_INSET = inches(0.85);

export function ScoreView() {
  const tracks = useStore((s) => s.tracks);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const projectName = useStore((s) => s.projectName);
  const composerName = useStore((s) => s.composerName);
  const setComposerName = useStore((s) => s.setComposerName);
  // The roadmap lives with the lead sheet's, so edits show up in both views.
  const slashNotes = useStore((s) => s.scoreSlashNotes);
  const scoreSpellings = useStore((s) => s.scoreSpellings);

  // Composer defaults to whoever is signed in, as on the lead sheet.
  const { data: meData } = useMe();
  useEffect(() => {
    if (!composerName && meData) {
      const name = meData.nickname || meData.username || meData.fullName || '';
      if (name) setComposerName(name);
    }
  }, [meData, composerName, setComposerName]);

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

  const slashSet = useMemo(() => new Set(slashNotes), [slashNotes]);
  const spellings = useMemo(
    () => spellingMap(scoreSpellings),
    [scoreSpellings],
  );
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks,
        rootNote,
        mode,
        timeSignature,
        slashNotes: slashSet,
        spellings,
      }),
    [tracks, rootNote, mode, timeSignature, slashSet, spellings],
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

  // Exports: MusicXML of every part, and printing the engraved pages.
  const exportMusicXml = useCallback(() => {
    const s = useStore.getState();
    const articulations = new Map<string, string[]>();
    for (const entry of s.scoreArticulations) {
      const cut = entry.lastIndexOf('|');
      const id = entry.slice(0, cut);
      articulations.set(id, [
        ...(articulations.get(id) ?? []),
        entry.slice(cut + 1),
      ]);
    }
    const measureCount = Math.max(
      0,
      ...scoreParts.map((p) => p.score.measures.length),
    );
    downloadScoreXml(
      scoreParts.map(({ id, name, score }) => ({
        id,
        name,
        score,
        drums: score.staves.includes('percussion'),
      })),
      {
        title: projectName,
        composer: composerName || undefined,
        bpm,
        chordRegions: s.chordRegions,
        chordPartIds: new Set(s.scoreChordTracks),
        articulations,
        slurs: s.scoreSlurs.map((pair) => {
          const cut = pair.indexOf('|');
          return [pair.slice(0, cut), pair.slice(cut + 1)] as const;
        }),
        sections: s.leadSheetSections,
        repeats: s.leadSheetRepeats,
        systemStarts: breaksFromRowSizes(
          s.measureRowSizes,
          s.measuresPerLine || 4,
          measureCount,
        ),
      },
    );
  }, [bpm, composerName, projectName, scoreParts]);

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
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <ScorePalettes {...editing.palette} />
        <ScorePartsPanel
          parts={editing.partRows}
          onToggleChords={editing.onToggleChords}
          onRestoreChords={editing.onRestoreChords}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="score-no-print">
          <NoteEditorBar {...editing.editor} />
        </div>
        <div
          className="score-no-print flex shrink-0 items-center gap-3 px-3 text-xs"
          style={{
            height: 36,
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)',
          }}
        >
          <span className="font-semibold uppercase tracking-wider">Score</span>
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
              style={{ border: '1px solid var(--color-border)' }}
            >
              Print / PDF
            </button>
            <button
              type="button"
              onClick={exportMusicXml}
              disabled={parts.length === 0}
              title="Download every part as MusicXML, for MuseScore, Finale, Sibelius or Dorico"
              className="rounded px-2 py-1 font-semibold uppercase tracking-wider transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ border: '1px solid var(--color-border)' }}
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
          </div>

          {parts.length === 0 ? (
            <div
              className="py-16 text-center text-sm"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No notes to notate yet. Record or write MIDI on a track and it
              will appear here.
            </div>
          ) : (
            <StaffView
              parts={parts}
              printTitleInset={PRINT_TITLE_INSET}
              {...editing.staff}
            />
          )}
        </div>
      </div>
    </div>
  );
}
