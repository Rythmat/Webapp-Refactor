import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type NoteInfo,
  type ScorePart,
  type StaffLayout,
} from '@/components/notation/StaffView';
import { keySignatureAlterations } from '@/lib/notation';
import {
  isGlyphMark,
  MARK_STYLES,
  markLabel,
  marksAt,
  marksBarEnd,
  withMark,
  withMarkText,
  withoutMark,
  type ScoreMarkKind,
} from './scoreText';
import {
  withPageBreak,
  withSystemBreak,
  withSystemRun,
  type SystemMarks,
} from '@/lib/notation/systemPlan';
import { LETTER_PORTRAIT } from '@/lib/notation/pageLayout';
import { useStore } from '@/daw/store';
import { smartRedo, smartUndo } from '@/daw/store/undoMiddleware';
import { useUndoState } from '@/daw/store/useUndoState';
import type { PaletteAction } from './ScorePalettes';
import {
  ACCIDENTALS,
  ARTICULATIONS,
  accidentalPitch,
  toggledAlteration,
  accidentalSpelling,
  withSpelling,
  DURATIONS,
  articulationSide,
  articulationsFor,
  articulationKey,
  dropNoteIds,
  durationTicks,
  groupChordArticulations,
  planTie,
  type TieCandidate,
  type NoteLayer,
  parseSlur,
  remapNoteIds,
  slurKey,
  toggleArticulation,
  toggleSlur,
  type ArticulationKind,
  type DurationChoice,
} from './noteEditor';
import { nextBeat, readChordInput } from './chordInput';
import {
  CHORD_FONT_SIZE,
  chordRange,
  placeChords,
  withChordsHidden,
  withPartChordsRestored,
  type BeatAnchor,
} from './scoreChords';
import {
  applyNoteEdit,
  applyNoteEdits,
  applyNoteSplit,
  parseNoteId,
} from './scoreEdit';
import {
  addToSelection,
  articulationMarkKey,
  markRange,
  slurMarkKey,
  tieMarkKey,
  type ScoreMark,
} from './scoreMarks';
import {
  copyMeasures,
  copyNotes,
  pasteNotes,
  type ScoreClipboard,
} from './scoreClipboard';
import {
  applyClick,
  cellKey,
  cellRange,
  clickKind,
  noteRange,
  notesInCells,
  parseCellKey,
  type Cell,
} from './scoreSelection';
import {
  breaksFromRowSizes,
  nextSectionLabel,
  repeatEndSet,
  repeatStartSet,
  withRepeatEnd,
  withRepeatStart,
  withoutRepeatAt,
} from './roadmap';
import type { ScoreTrackPart } from './scoreParts';

/** A rehearsal mark's own height plus its gap, for stacking one over a
 * chord symbol. */
const MARK_ROW = 22;

// ── The score editor ───────────────────────────────────────────────────────
// Everything the Score view does to the music: what is selected, what the
// keys and the toolbar do to it, and the layer drawn over the staves. It
// lives apart from the page around it so the Lead Sheet can edit its melody
// with exactly the same tools rather than a second set that drifts.

export interface ScoreEditingOptions {
  /** The parts on the page, as the staff renderer draws them. */
  parts: ScorePart[];
  /** The same parts with their track identity, for editing the clips. */
  scoreParts: ScoreTrackPart[];
  /**
   * Show the song's chord symbols over every part without being asked. A lead
   * sheet is chords over a melody by definition; a score turns them on per
   * instrument.
   */
  chordsAlwaysVisible?: boolean;
}

export function useScoreEditing({
  parts,
  scoreParts,
  chordsAlwaysVisible = false,
}: ScoreEditingOptions) {
  const tracks = useStore((s) => s.tracks);
  const position = useStore((s) => s.position);
  // The roadmap lives with the lead sheet's, so edits show up in both views.
  const measuresPerLine = useStore((s) => s.measuresPerLine);
  const measureRowSizes = useStore((s) => s.measureRowSizes);
  const scoreSystemBreaks = useStore((s) => s.scoreSystemBreaks);
  const setScoreSystemBreaks = useStore((s) => s.setScoreSystemBreaks);
  const scorePageBreaks = useStore((s) => s.scorePageBreaks);
  const setScorePageBreaks = useStore((s) => s.setScorePageBreaks);
  const scoreSystemRuns = useStore((s) => s.scoreSystemRuns);
  const textMarks = useStore((s) => s.scoreTextMarks);
  const setTextMarks = useStore((s) => s.setScoreTextMarks);
  /** The free text mark being typed into, if any. */
  const [editingMark, setEditingMark] = useState<string | null>(null);
  /** The most marks standing over any one bar, for the room they need. */
  const deepestMarkStack = useMemo(() => {
    const perBar = new Map<number, number>();
    for (const mark of textMarks) {
      perBar.set(mark.measureIdx, (perBar.get(mark.measureIdx) ?? 0) + 1);
    }
    return Math.max(0, ...perBar.values());
  }, [textMarks]);
  const setScoreSystemRuns = useStore((s) => s.setScoreSystemRuns);
  // Undo covers the whole project, not just the score, so it reads from the
  // store's own history rather than anything this hook keeps.
  const { canUndo, canRedo } = useUndoState();
  const scoreSpellings = useStore((s) => s.scoreSpellings);
  const setScoreSpellings = useStore((s) => s.setScoreSpellings);
  const setMeasureRowSizes = useStore((s) => s.setMeasureRowSizes);
  const sections = useStore((s) => s.leadSheetSections);
  const addSection = useStore((s) => s.addLeadSheetSection);
  const removeSection = useStore((s) => s.removeLeadSheetSection);
  const repeats = useStore((s) => s.leadSheetRepeats);
  const setRepeats = useStore((s) => s.setLeadSheetRepeats);
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);
  const chordRegions = useStore((s) => s.chordRegions);
  const insertChordRegion = useStore((s) => s.insertChordRegion);
  const renameChordRegion = useStore((s) => s.renameChordRegion);
  const moveChordRegion = useStore((s) => s.moveChordRegion);
  const deleteChordRegion = useStore((s) => s.deleteChordRegion);
  const markAsMelody = useStore((s) => s.markAsMelody);
  const fermatas = useStore((s) => s.measureFermatas);
  const measureRestMap = useStore((s) => s.measureRestMap);
  const setFermatas = useStore((s) => s.setMeasureFermatas);
  const chordFormat = useStore((s) => s.leadSheetChordFormat);
  const scoreChordTracks = useStore((s) => s.scoreChordTracks);
  const toggleScoreChordTrack = useStore((s) => s.toggleScoreChordTrack);
  const scoreChordHidden = useStore((s) => s.scoreChordHidden);
  const setScoreChordHidden = useStore((s) => s.setScoreChordHidden);
  const articulations = useStore((s) => s.scoreArticulations);
  const setArticulations = useStore((s) => s.setScoreArticulations);
  const slurs = useStore((s) => s.scoreSlurs);
  const setSlurs = useStore((s) => s.setScoreSlurs);
  const slashNotes = useStore((s) => s.scoreSlashNotes);
  const setSlashNotes = useStore((s) => s.setScoreSlashNotes);

  const measureCount = parts[0]?.score.measures.length ?? 0;

  // ── Selection + roadmap edits ───────────────────────────────────────────
  // A barline is named by the measure it precedes, so `selected` is that
  // measure's index; `measureCount` is the closing barline.
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Measures are selected per instrument, keyed `part:measure`.
  const [selectedCells, setSelectedCells] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const measureAnchor = useRef<Cell | null>(null);
  const noteAnchor = useRef<string | null>(null);
  const [clipboard, setClipboard] = useState<ScoreClipboard | null>(null);
  const [selectedChords, setSelectedChords] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const chordAnchor = useRef<string | null>(null);
  /** Where a chord is being typed, and what has been typed so far. */
  const [chordEntry, setChordEntry] = useState<{
    partIndex: number;
    tick: number;
    text: string;
  } | null>(null);
  /** A chord symbol being dragged to another beat. */
  const chordDragRef = useRef<{
    key: string;
    regionId: string;
    partIndex: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    originTick: number;
    moved: boolean;
  } | null>(null);
  const [chordDragging, setChordDragging] = useState(false);
  const [chordDrag, setChordDrag] = useState<{
    key: string;
    x: number;
    y: number;
    tick: number;
  } | null>(null);
  /** Right-click menu on a chord symbol: where it opened, and on what. */
  const [chordMenu, setChordMenu] = useState<{
    key: string;
    regionId: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedMarks, setSelectedMarks] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectedRests, setSelectedRests] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const restAnchor = useRef<string | null>(null);
  const markAnchor = useRef<string | null>(null);
  const [dotted, setDotted] = useState(false);
  const [layer, setLayer] = useState<NoteLayer>('notes');
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragRef = useRef<{
    startX: number;
    startY: number;
    ids: string[];
    ticksPerPx: number;
    moved: boolean;
  } | null>(null);
  const [layout, setLayout] = useState<StaffLayout | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const handleLayout = useCallback(
    (next: StaffLayout | null) => setLayout(next),
    [],
  );

  const beatTicks = parts[0]?.score.beatTicks ?? 480;

  /**
   * Two presses in the same spot, close together. Pointer events always
   * report a detail of 0, so a double-click is recognised here rather than
   * read off the event.
   */
  const lastPress = useRef<{ x: number; y: number; at: number } | null>(null);
  const isDoublePress = useCallback((event: React.PointerEvent) => {
    const now = performance.now();
    const previous = lastPress.current;
    lastPress.current = { x: event.clientX, y: event.clientY, at: now };
    return (
      !!previous &&
      now - previous.at < 450 &&
      Math.abs(previous.x - event.clientX) < 6 &&
      Math.abs(previous.y - event.clientY) < 6
    );
  }, []);

  /**
   * The beat under a point on the page, in one part: which bar it falls in,
   * and the nearest beat inside it. Used for dropping a dragged chord symbol
   * and for double-clicking a beat to write one.
   */
  const beatAt = useCallback(
    (partIndex: number, x: number, y: number) => {
      const boxes = (layout?.measures ?? []).filter(
        (m) => m.partIndex === partIndex && x >= m.x && x <= m.x + m.width,
      );
      if (boxes.length === 0) return null;
      // Across systems, the bar on the line nearest the pointer.
      const box = boxes.reduce((best, m) =>
        Math.abs(m.y + m.height / 2 - y) <
        Math.abs(best.y + best.height / 2 - y)
          ? m
          : best,
      );
      const span = box.endTick - box.startTick || 1;
      const raw = box.startTick + ((x - box.x) / box.width) * span;
      const snapped = Math.round(raw / beatTicks) * beatTicks;
      return {
        measureIndex: box.measureIndex,
        tick: Math.min(
          Math.max(snapped, box.startTick),
          box.endTick - beatTicks,
        ),
      };
    },
    [layout, beatTicks],
  );

  // Breaks a chord-chart import brought with it still count, so an imported
  // layout survives; everything set here is a mark on a bar.
  const importedBreaks = useMemo(
    () =>
      measureRowSizes
        ? breaksFromRowSizes(measureRowSizes, measuresPerLine, measureCount)
        : new Set<number>(),
    [measureRowSizes, measuresPerLine, measureCount],
  );
  const systemBreaks = useMemo(
    () => new Set<number>([...importedBreaks, ...scoreSystemBreaks]),
    [importedBreaks, scoreSystemBreaks],
  );
  const systemMarks: SystemMarks = useMemo(
    () => ({
      breaks: systemBreaks,
      runs: new Map(scoreSystemRuns),
      pageBreaks: new Set(scorePageBreaks),
    }),
    [systemBreaks, scoreSystemRuns, scorePageBreaks],
  );
  const repeatStarts = useMemo(() => repeatStartSet(repeats), [repeats]);
  const repeatEnds = useMemo(() => repeatEndSet(repeats), [repeats]);

  const toggleSystemBreak = useCallback(
    (barline: number) => {
      setScoreSystemBreaks(
        withSystemBreak(scoreSystemBreaks, barline, measureCount),
      );
    },
    [scoreSystemBreaks, measureCount, setScoreSystemBreaks],
  );

  const togglePageBreak = useCallback(
    (barline: number) => {
      setScorePageBreaks(withPageBreak(scorePageBreaks, barline, measureCount));
    },
    [scorePageBreaks, measureCount, setScorePageBreaks],
  );

  /** Hold the selected bars on one line, however many there are. */
  const makeIntoSystem = useCallback(
    (bars: number[]) => {
      if (bars.length === 0) return;
      const next = withSystemRun(scoreSystemRuns, scoreSystemBreaks, bars);
      setScoreSystemRuns(next.runs);
      setScoreSystemBreaks(next.breaks);
    },
    [
      scoreSystemRuns,
      scoreSystemBreaks,
      setScoreSystemRuns,
      setScoreSystemBreaks,
    ],
  );

  // ── Notes: select, drag, delete ─────────────────────────────────────────
  const keyFifths = parts[0]?.score.keyFifths ?? 0;
  const GRID_TICKS = 120; // a sixteenth

  const writeEdit = useCallback(
    (ids: Iterable<string>, edit: Parameters<typeof applyNoteEdit>[2]) => {
      const before = [...ids];
      const after = applyNoteEdit(
        tracks,
        before,
        edit,
        keyFifths,
        updateMidiClipEvents,
      );
      // Marks follow their notes: an edit renames a note's id.
      if (edit.remove) {
        const gone = new Set(before);
        setArticulations(dropNoteIds(articulations, gone));
        setSlurs(dropNoteIds(slurs, gone));
      } else if (after.length === before.length) {
        const rename = new Map(before.map((id, i) => [id, after[i]]));
        setArticulations(remapNoteIds(articulations, rename));
        setSlurs(remapNoteIds(slurs, rename));
      }
      return after;
    },
    [
      tracks,
      keyFifths,
      updateMidiClipEvents,
      articulations,
      slurs,
      setArticulations,
      setSlurs,
    ],
  );

  /** Several different edits in one pass; marks follow as with writeEdit. */
  const writeEdits = useCallback(
    (edits: Map<string, Parameters<typeof applyNoteEdit>[2]>) => {
      const before = [...edits.keys()];
      const after = applyNoteEdits(
        tracks,
        edits,
        keyFifths,
        updateMidiClipEvents,
      );
      const removed = new Set(before.filter((id) => edits.get(id)?.remove));
      const kept = before.filter((id) => !removed.has(id));
      const rename = new Map(kept.map((id, i) => [id, after[i] ?? id]));
      setArticulations(
        dropNoteIds(remapNoteIds(articulations, rename), removed),
      );
      setSlurs(dropNoteIds(remapNoteIds(slurs, rename), removed));
      return after;
    },
    [
      tracks,
      keyFifths,
      updateMidiClipEvents,
      articulations,
      slurs,
      setArticulations,
      setSlurs,
    ],
  );

  const handleNotePointerDown = useCallback(
    (
      { noteId }: { noteId: string; noteIds: string[] },
      event: React.PointerEvent,
    ) => {
      event.preventDefault();
      setSelected(null);
      setSelectedCells(new Set());
      setSelectedRests(new Set());
      setSelectedMarks(new Set());
      // Double-click writes a chord over the beat, as on the chart.
      const doubled = isDoublePress(event);
      const at = layout?.notes.find((n) => n.id === noteId);
      if (doubled && at) {
        setChordEntry({ partIndex: at.partIndex, tick: at.tick, text: '' });
        return;
      }
      const kind = clickKind(event);
      let next: Set<string>;
      if (kind === 'replace' && selectedNotes.has(noteId)) {
        next = new Set(selectedNotes); // keep the group being dragged
      } else {
        next = applyClick(selectedNotes, kind, noteId, () =>
          noteRange(layout?.notes ?? [], noteAnchor.current ?? noteId, noteId),
        );
      }
      if (kind !== 'range') noteAnchor.current = noteId;
      setSelectedNotes(next);

      const measure = layout?.measures[0];
      const ticksPerPx =
        measure && measure.width > 0
          ? (measure.endTick - measure.startTick) / measure.width
          : 1;
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        ids: [...next],
        ticksPerPx,
        moved: false,
      };
      setDragging(true);
    },
    [selectedNotes, layout],
  );

  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;

  // Dragging: snap to a sixteenth across, to staff steps down the page.
  useEffect(() => {
    if (!dragging) return;
    const stepPx = layout?.stepPx ?? 5;
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      drag.moved = true;
      const ticks =
        Math.round((dx * drag.ticksPerPx) / GRID_TICKS) * GRID_TICKS;
      const steps = -Math.round(dy / stepPx);
      setDragOffset({
        x: ticks / drag.ticksPerPx,
        y: -steps * stepPx,
      });
    };
    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      setDragOffset(null);
      if (!drag?.moved) return;
      const offset = dragOffsetRef.current;
      if (!offset) return;
      const ticks = Math.round(offset.x * drag.ticksPerPx);
      const steps = -Math.round(offset.y / stepPx);
      if (ticks === 0 && steps === 0) return;
      const nextIds = writeEdit(drag.ids, {
        steps,
        deltaTicks: ticks,
      });
      setSelectedNotes(new Set(nextIds));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, layout, writeEdit]);

  const handleRestPointerDown = useCallback(
    (key: string, event: React.PointerEvent) => {
      event.preventDefault();
      setSelectedNotes(new Set());
      setSelectedCells(new Set());
      setSelectedMarks(new Set());
      setSelected(null);
      const doubled = isDoublePress(event);
      const at = layout?.rests.find((r) => r.key === key);
      if (doubled && at) {
        setChordEntry({ partIndex: at.partIndex, tick: at.tick, text: '' });
        return;
      }
      const kind = clickKind(event);
      setSelectedRests((current) =>
        applyClick(current, kind, key, () => {
          // A run of rests covers the parts and the time the ends span.
          const rests = layout?.rests ?? [];
          const anchor = rests.find((r) => r.key === restAnchor.current);
          const target = rests.find((r) => r.key === key);
          if (!anchor || !target) return [key];
          const parts_ = [anchor.partIndex, target.partIndex].sort(
            (a, b) => a - b,
          );
          const ticks = [anchor.tick, target.tick].sort((a, b) => a - b);
          return rests
            .filter(
              (r) =>
                r.partIndex >= parts_[0] &&
                r.partIndex <= parts_[1] &&
                r.tick >= ticks[0] &&
                r.tick <= ticks[1],
            )
            .map((r) => r.key);
        }),
      );
      if (kind !== 'range') restAnchor.current = key;
    },
    [layout],
  );

  const handleMeasurePointerDown = useCallback(
    (cell: Cell, event: React.PointerEvent) => {
      setSelectedNotes(new Set());
      setSelectedRests(new Set());
      setSelectedMarks(new Set());
      setSelected(null);
      if (isDoublePress(event)) {
        // Keep the press from moving focus, or the entry box blurs the
        // instant it opens.
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        const beat = beatAt(
          cell.partIndex,
          event.clientX - box.left,
          event.clientY - box.top,
        );
        if (beat) {
          setChordEntry({
            partIndex: cell.partIndex,
            tick: beat.tick,
            text: '',
          });
          return;
        }
      }
      const kind = clickKind(event);
      const key = cellKey(cell);
      setSelectedCells((current) =>
        applyClick(current, kind, key, () =>
          cellRange(measureAnchor.current ?? cell, cell),
        ),
      );
      if (kind !== 'range') measureAnchor.current = cell;
    },
    [beatAt, isDoublePress],
  );

  const clearSelection = useCallback(() => {
    setChordMenu(null);
    setSelectedRests(new Set());
    setSelectedNotes(new Set());
    setSelectedCells(new Set());
    setSelectedChords(new Set());
    setSelectedMarks(new Set());
    setSelected(null);
  }, []);

  const selectedCellList = useMemo(
    () => [...selectedCells].map(parseCellKey),
    [selectedCells],
  );

  /** What a palette cell applies to: the selected barline, or a measure's. */
  const targetBarline =
    selected ??
    (selectedCellList.length > 0
      ? Math.min(...selectedCellList.map((c) => c.measureIndex))
      : null);

  const apply = useCallback(
    (action: PaletteAction) => {
      const selected = targetBarline;
      if (selected === null) return;
      switch (action) {
        case 'barline.normal':
          setRepeats(withoutRepeatAt(repeats, selected));
          break;
        case 'repeat.start':
          setRepeats(withRepeatStart(repeats, selected, measureCount));
          break;
        case 'repeat.end':
          setRepeats(withRepeatEnd(repeats, selected));
          break;
        case 'layout.systemBreak':
          toggleSystemBreak(selected);
          break;
        case 'layout.pageBreak':
          togglePageBreak(selected);
          break;
        case 'text.staffText': {
          // Written empty and opened for typing, so the words go straight in.
          const marks = withMark(textMarks, selected, 'text', '');
          setTextMarks(marks);
          setEditingMark(marks[marks.length - 1].id);
          break;
        }
        case 'jump.segno':
        case 'jump.coda':
        case 'jump.dc':
        case 'jump.ds':
        case 'jump.dcAlCoda':
        case 'jump.dsAlCoda': {
          const kind = action.slice('jump.'.length) as ScoreMarkKind;
          setTextMarks(withMark(textMarks, selected, kind));
          break;
        }
        case 'layout.makeSystem': {
          // Whatever bars are selected become one line. With only a barline
          // picked there is nothing to gather, so it does nothing.
          const bars = [...selectedCells]
            .map((key) => parseCellKey(key).measureIndex)
            .filter((bar, i, all) => all.indexOf(bar) === i)
            .sort((a, b) => a - b);
          makeIntoSystem(bars);
          break;
        }
        case 'text.rehearsalMark': {
          const existing = sections.find((s) => s.measureIdx === selected);
          if (existing) removeSection(selected);
          else
            addSection({
              measureIdx: selected,
              label: nextSectionLabel(sections),
            });
          break;
        }
      }
    },
    [
      targetBarline,
      repeats,
      sections,
      measureCount,
      setRepeats,
      addSection,
      removeSection,
      toggleSystemBreak,
      togglePageBreak,
      textMarks,
      setTextMarks,
      makeIntoSystem,
      selectedCells,
      setMeasureRowSizes,
      fermatas,
      setFermatas,
    ],
  );

  // MuseScore's keys: Return breaks the system, Delete clears what's selected,
  // Up/Down move the selected notes by a staff step (Shift for an octave).
  useEffect(() => {
    if (editingSection !== null) return;
    if (selectedNotes.size > 0) {
      const onNoteKey = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          writeEdit(selectedNotes, { remove: true });
          setSelectedNotes(new Set());
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          const direction = event.key === 'ArrowUp' ? 1 : -1;
          const steps = direction * (event.shiftKey ? 7 : 1);
          setSelectedNotes(new Set(writeEdit(selectedNotes, { steps })));
        } else if (event.key === 'Escape') {
          clearSelection();
        }
      };
      window.addEventListener('keydown', onNoteKey);
      return () => window.removeEventListener('keydown', onNoteKey);
    }
    if (selectedCells.size > 0) {
      const onCellKey = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          writeEdit(notesInCells(layout?.notes ?? [], selectedCells), {
            remove: true,
          });
        } else if (event.key === 'Escape') {
          clearSelection();
        } else if (event.key === 'Enter' && targetBarline !== null) {
          event.preventDefault();
          toggleSystemBreak(targetBarline);
        }
      };
      window.addEventListener('keydown', onCellKey);
      return () => window.removeEventListener('keydown', onCellKey);
    }
    const selected = targetBarline;
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        toggleSystemBreak(selected);
      } else if (event.key === 'Escape') {
        clearSelection();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        setRepeats(withoutRepeatAt(repeats, selected));
        removeSection(selected);
      } else if ((event.metaKey || event.ctrlKey) && event.key === 'm') {
        event.preventDefault();
        apply('text.rehearsalMark');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    targetBarline,
    selectedNotes,
    selectedCells,
    layout,
    editingSection,
    repeats,
    toggleSystemBreak,
    setRepeats,
    removeSection,
    apply,
    writeEdit,
    clearSelection,
  ]);

  // ── Note editor ─────────────────────────────────────────────────────────
  const ticksPerQuarter = parts[0]?.score.ticksPerQuarter ?? 480;

  /** The length the selected notes share, if they share one. */
  const currentDuration = useMemo(() => {
    const lengths = new Set<number>();
    for (const id of selectedNotes) {
      const ref = parseNoteId(id);
      const clip = tracks
        .find((t) => t.id === ref?.trackId)
        ?.midiClips.find((c) => c.id === ref?.clipId);
      const event = clip?.events.find(
        (e) => e.startTick === ref?.startTick && e.note === ref?.midi,
      );
      if (event) lengths.add(event.durationTicks);
    }
    if (lengths.size !== 1) return null;
    const ticks = [...lengths][0];
    return (
      DURATIONS.find(
        (choice) =>
          durationTicks(choice, ticksPerQuarter, false) === ticks ||
          durationTicks(choice, ticksPerQuarter, true) === ticks,
      ) ?? null
    );
  }, [selectedNotes, tracks, ticksPerQuarter]);

  /**
   * A duration goes into whichever row is live: it sets a note's length,
   * clears that much space as a rest, or writes the note as a slash.
   */
  const applyDuration = useCallback(
    (choice: DurationChoice, withDot = dotted, into: NoteLayer = layer) => {
      if (selectedNotes.size === 0) return;
      const ticks = durationTicks(choice, ticksPerQuarter, withDot);

      if (into === 'rests') {
        // A rest is the absence of notes: clear the selection and anything
        // else sounding inside the span it leaves behind.
        const ids = new Set(selectedNotes);
        for (const id of selectedNotes) {
          const start = (layout?.notes ?? []).find((n) => n.id === id);
          if (!start) continue;
          for (const other of layout?.notes ?? []) {
            if (
              other.partIndex === start.partIndex &&
              other.tick >= start.tick &&
              other.tick < start.tick + ticks
            ) {
              ids.add(other.id);
            }
          }
        }
        writeEdit(ids, { remove: true });
        setSelectedNotes(new Set());
        return;
      }

      const nextIds = writeEdit(selectedNotes, { durationTicks: ticks });
      if (into === 'slashes') {
        setSlashNotes([...new Set([...slashNotes, ...nextIds])]);
      } else {
        // Back to pitched notation.
        const dropped = new Set(nextIds);
        setSlashNotes(slashNotes.filter((id) => !dropped.has(id)));
      }
      setSelectedNotes(new Set(nextIds));
    },
    [
      selectedNotes,
      writeEdit,
      ticksPerQuarter,
      dotted,
      layer,
      layout,
      slashNotes,
      setSlashNotes,
    ],
  );

  const activeArticulations = useMemo(() => {
    const active = new Set<ArticulationKind>();
    if (selectedNotes.size === 0) return active;
    for (const { kind } of ARTICULATIONS) {
      const all = [...selectedNotes].every((id) =>
        articulations.includes(articulationKey(id, kind)),
      );
      if (all) active.add(kind);
    }
    return active;
  }, [selectedNotes, articulations]);

  /** A slur runs from the selection's first note to its last. */
  const slurEnds = useMemo(() => {
    const ordered = (layout?.notes ?? [])
      .filter((n) => selectedNotes.has(n.id))
      .sort((a, b) => a.tick - b.tick || a.partIndex - b.partIndex);
    if (ordered.length < 2) return null;
    const from = ordered[0];
    const to = ordered[ordered.length - 1];
    // A slur runs through time; notes struck together have nothing to join.
    if (from.tick === to.tick) return null;
    return { from: from.id, to: to.id };
  }, [selectedNotes, layout]);

  const applyArticulation = useCallback(
    (kind: ArticulationKind) => {
      if (selectedNotes.size === 0) return;
      setArticulations(toggleArticulation(articulations, selectedNotes, kind));
    },
    [selectedNotes, articulations, setArticulations],
  );

  /** The written spelling of every selected note, where the score drew one. */
  const selectedSpelled = useMemo(
    () => (layout?.notes ?? []).filter((note) => selectedNotes.has(note.id)),
    [layout, selectedNotes],
  );

  /** The one accidental every selected note carries, if they agree. */
  const currentAccidental = useMemo(() => {
    if (selectedSpelled.length === 0) return null;
    const alterations = new Set(selectedSpelled.map((n) => n.alteration));
    if (alterations.size !== 1) return null;
    const alteration = [...alterations][0];
    return ACCIDENTALS.find((a) => a.alteration === alteration) ?? null;
  }, [selectedSpelled]);

  /**
   * Write an accidental on the selection. The notehead keeps its line — an
   * accidental never moves a note up or down the staff — so the letter and
   * octave stay and only the sounding pitch moves. The spelling is pinned to
   * the note's new id so the key does not respell a sharp as a flat, and the
   * engraver draws the sign itself, at the right size and clear of its
   * neighbours.
   */
  const applyAccidental = useCallback(
    (alteration: number) => {
      if (selectedSpelled.length === 0) return;
      // Clicking the accidental the notes already carry takes it off again,
      // putting them back to whatever the key writes for that letter.
      const signature = keySignatureAlterations(keyFifths);
      const wanted = toggledAlteration(selectedSpelled, alteration, signature);
      const edits = new Map<string, Parameters<typeof applyNoteEdit>[2]>();
      const nextSpellings: Array<{ id: string; name: string }> = [];
      for (const note of selectedSpelled) {
        const target = wanted.get(note.letter) ?? alteration;
        if (note.alteration === target) continue;
        const midi = accidentalPitch(note, target);
        if (midi < 0 || midi > 127) continue;
        edits.set(note.id, { midi });
        const ref = parseNoteId(note.id);
        if (!ref) continue;
        nextSpellings.push({
          id: `${ref.trackId}:${ref.clipId}:${ref.startTick}:${midi}`,
          name: accidentalSpelling(note, target),
        });
      }
      if (edits.size === 0) return;
      const nextIds = writeEdits(edits);
      let spellings = scoreSpellings;
      for (const { id, name } of nextSpellings) {
        spellings = withSpelling(spellings, id, name);
      }
      setScoreSpellings(spellings);
      setSelectedNotes(new Set(nextIds));
    },
    [
      selectedSpelled,
      keyFifths,
      writeEdits,
      scoreSpellings,
      setScoreSpellings,
      setSelectedNotes,
    ],
  );

  /**
   * Every note as the tie logic sees it. The notation engine splits a long
   * note across the beat and ties the pieces, so one id can be drawn more
   * than once; the source note is the earliest piece, and its length comes
   * from the clip event rather than from any one piece.
   */
  const tieCandidates = useMemo(() => {
    const byId = new Map<string, TieCandidate>();
    for (const info of layout?.notes ?? []) {
      const ref = parseNoteId(info.id);
      if (!ref) continue;
      const event = tracks
        .find((t) => t.id === ref.trackId)
        ?.midiClips.find((c) => c.id === ref.clipId)
        ?.events.find(
          (e) => e.startTick === ref.startTick && e.note === ref.midi,
        );
      if (!event) continue;
      const existing = byId.get(info.id);
      if (existing && existing.tick <= info.tick) continue;
      byId.set(info.id, {
        id: info.id,
        partIndex: info.partIndex,
        tick: info.tick,
        midi: event.note,
        durationTicks: event.durationTicks,
      });
    }
    return [...byId.values()];
  }, [layout, tracks]);

  /** The tie the selection would make, or null when it cannot make one. */
  const tiePlan = useMemo(() => {
    const picked = tieCandidates.filter((n) => selectedNotes.has(n.id));
    if (picked.length === 0) return null;
    return planTie(picked, tieCandidates, layout?.rests ?? []);
  }, [selectedNotes, tieCandidates, layout]);

  const canTie = tiePlan !== null;

  /**
   * Tie the selection. Several notes of one pitch join into one; a single
   * note reaches forward to the same pitch again, or takes over a following
   * rest for exactly that rest's length. Either way the held note grows and
   * whatever it absorbed goes, which is what a tie means as sound — the
   * notation engine puts the tie curve back when it splits the note.
   */
  const applyTie = useCallback(() => {
    if (!tiePlan) return;
    // One pass: the held note takes the whole span, the notes it absorbs go.
    const edits = new Map<string, Parameters<typeof applyNoteEdit>[2]>([
      [tiePlan.holdId, { durationTicks: tiePlan.durationTicks }],
      ...tiePlan.removeIds.map(
        (id) =>
          [id, { remove: true }] as [
            string,
            Parameters<typeof applyNoteEdit>[2],
          ],
      ),
    ]);
    setSelectedNotes(new Set(writeEdits(edits)));
  }, [tiePlan, writeEdits]);

  const applySlur = useCallback(() => {
    if (!slurEnds) return;
    setSlurs(toggleSlur(slurs, slurEnds.from, slurEnds.to));
  }, [slurEnds, slurs, setSlurs]);

  /**
   * ⌥N / ⌥R / ⌥H pick the row that numbers write into. Option is used rather
   * than ⌘, which the browser and macOS keep for themselves (new window,
   * reload, hide application).
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      // Option rewrites the letter on macOS; `code` stays put.
      const key = event.code.replace('Key', '').toLowerCase();
      const next: NoteLayer | null =
        key === 'n'
          ? 'notes'
          : key === 'r'
            ? 'rests'
            : key === 'h'
              ? 'slashes'
              : null;
      if (!next) return;
      event.preventDefault();
      setLayer(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /** The beat a chord would be written over: the selected note or rest. */
  const chordTarget = useMemo(() => {
    const note = (layout?.notes ?? []).find((n) => selectedNotes.has(n.id));
    if (note) return { partIndex: note.partIndex, tick: note.tick };
    const rest = (layout?.rests ?? []).find((r) => selectedRests.has(r.key));
    if (rest) return { partIndex: rest.partIndex, tick: rest.tick };
    return null;
  }, [layout, selectedNotes, selectedRests]);

  // The editor's keys work whenever notes are selected.
  useEffect(() => {
    if (selectedNotes.size === 0 || editingSection !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const duration = DURATIONS.find((choice) => choice.key === event.key);
      if (duration) {
        event.preventDefault();
        applyDuration(duration);
        return;
      }
      const articulation = ARTICULATIONS.find(
        (choice) => choice.key === event.key,
      );
      if (articulation) {
        event.preventDefault();
        applyArticulation(articulation.kind);
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        applySlur();
        return;
      }
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        applyTie();
        return;
      }
      if ((event.key === 'k' || event.key === 'K') && chordTarget) {
        event.preventDefault();
        setChordEntry({ ...chordTarget, text: '' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selectedNotes,
    editingSection,
    applyDuration,
    applyArticulation,
    applySlur,
    applyTie,
    chordTarget,
  ]);

  // ── Markings: articulations, slurs and ties ─────────────────────────────
  const chordMarks = useMemo(
    () =>
      groupChordArticulations(layout?.notes ?? [], (id) =>
        articulationsFor(articulations, id),
      ),
    [layout, articulations],
  );

  /** Every marking on the page, as something that can be picked up. */
  const marks = useMemo(() => {
    const out: ScoreMark[] = [];
    for (const chord of chordMarks) {
      for (const kind of chord.kinds) {
        out.push({
          key: articulationMarkKey(chord.note.id, kind),
          kind: { type: 'articulation', kind },
          partIndex: chord.note.partIndex,
          tick: chord.note.tick,
          // A chord's mark belongs to every note of it that carries the mark.
          noteIds: (layout?.notes ?? [])
            .filter(
              (n) =>
                n.partIndex === chord.note.partIndex &&
                n.tick === chord.note.tick &&
                articulationsFor(articulations, n.id).includes(kind),
            )
            .map((n) => n.id),
        });
      }
    }
    for (const entry of slurs) {
      const ends = parseSlur(entry);
      const from = (layout?.notes ?? []).find((n) => n.id === ends?.fromId);
      if (!ends || !from) continue;
      out.push({
        key: slurMarkKey(ends.fromId, ends.toId),
        kind: { type: 'slur' },
        partIndex: from.partIndex,
        tick: from.tick,
        noteIds: [ends.fromId, ends.toId],
      });
    }
    // A note drawn twice is one note held across a barline: that is a tie.
    const fragments = new Map<string, NoteInfo[]>();
    for (const note of layout?.notes ?? []) {
      fragments.set(note.id, [...(fragments.get(note.id) ?? []), note]);
    }
    for (const [id, pieces] of fragments) {
      if (pieces.length < 2) continue;
      const ordered = [...pieces].sort((a, b) => a.tick - b.tick);
      for (let i = 1; i < ordered.length; i++) {
        out.push({
          key: tieMarkKey(id, ordered[i].tick),
          kind: { type: 'tie' },
          partIndex: ordered[i].partIndex,
          tick: ordered[i - 1].tick,
          noteIds: [id],
          splitTick: ordered[i].tick,
        });
      }
    }
    return out;
  }, [chordMarks, layout, articulations, slurs]);

  const handleMarkPointerDown = useCallback(
    (key: string, event: React.PointerEvent) => {
      event.stopPropagation();
      setSelectedNotes(new Set());
      setSelectedCells(new Set());
      setSelectedChords(new Set());
      setSelectedRests(new Set());
      setSelected(null);
      const kind = clickKind(event);
      if (kind === 'range' && markAnchor.current) {
        // A run only gathers markings of the kind it started from.
        setSelectedMarks(new Set(markRange(marks, markAnchor.current, key)));
        return;
      }
      if (kind === 'toggle') {
        setSelectedMarks((current) => addToSelection(marks, current, key));
        markAnchor.current = key;
        return;
      }
      setSelectedMarks(new Set([key]));
      markAnchor.current = key;
    },
    [marks],
  );

  /** Delete takes the selected markings off; a tie splits its note in two. */
  const deleteSelectedMarks = useCallback(() => {
    if (selectedMarks.size === 0) return;
    let nextArticulations = articulations;
    let nextSlurs = slurs;
    for (const key of selectedMarks) {
      const mark = marks.find((m) => m.key === key);
      if (!mark) continue;
      if (mark.kind.type === 'articulation') {
        const kind = mark.kind.kind;
        const drop = new Set(
          mark.noteIds.map((id) => articulationKey(id, kind)),
        );
        nextArticulations = nextArticulations.filter((e) => !drop.has(e));
      } else if (mark.kind.type === 'slur') {
        const drop = slurKey(mark.noteIds[0], mark.noteIds[1]);
        nextSlurs = nextSlurs.filter((e) => e !== drop);
      } else if (mark.splitTick !== undefined) {
        applyNoteSplit(
          tracks,
          mark.noteIds[0],
          mark.splitTick,
          updateMidiClipEvents,
        );
      }
    }
    if (nextArticulations !== articulations)
      setArticulations(nextArticulations);
    if (nextSlurs !== slurs) setSlurs(nextSlurs);
    setSelectedMarks(new Set());
  }, [
    selectedMarks,
    marks,
    articulations,
    slurs,
    tracks,
    updateMidiClipEvents,
    setArticulations,
    setSlurs,
  ]);

  // ── Chord symbols ───────────────────────────────────────────────────────
  const partIndexByTrack = useMemo(
    () => new Map(scoreParts.map((part, index) => [part.id, index])),
    [scoreParts],
  );
  const trackIdByPart = useMemo(
    () => new Map(scoreParts.map((part, index) => [index, part.id])),
    [scoreParts],
  );
  const measureTicks = parts[0]?.score.ticksPerMeasure ?? 1920;

  const visibleChordParts = useMemo(
    () =>
      new Set(
        scoreParts
          .map((part, index) =>
            chordsAlwaysVisible || scoreChordTracks.includes(part.id)
              ? index
              : -1,
          )
          .filter((index) => index >= 0),
      ),
    [scoreParts, scoreChordTracks, chordsAlwaysVisible],
  );
  const hiddenChords = useMemo(
    () => new Set(scoreChordHidden),
    [scoreChordHidden],
  );
  /** Every beat as drawn — a note, a rest or a slash — for chords to sit on. */
  const beatAnchors = useMemo(() => {
    const byBeat = new Map<string, BeatAnchor>();
    const note = (item: NoteInfo): BeatAnchor => ({
      partIndex: item.partIndex,
      tick: item.tick,
      x: item.x,
      // How high this note reaches: a stem up carries the ink three and a
      // half spaces above the head; otherwise it is the head itself, plus
      // room for a mark when the note is carrying one.
      inkTop:
        item.y -
        item.space *
          (item.stem === 'up'
            ? 8
            : articulationsFor(articulations, item.id).length > 0
              ? 4
              : 1.5),
    });
    for (const item of layout?.notes ?? []) {
      const key = `${item.partIndex}:${item.tick}`;
      const current = byBeat.get(key);
      const next = note(item);
      byBeat.set(
        key,
        current
          ? {
              ...(next.x < current.x ? next : current),
              inkTop: Math.min(
                current.inkTop ?? Number.POSITIVE_INFINITY,
                next.inkTop as number,
              ),
            }
          : next,
      );
    }
    for (const item of layout?.rests ?? []) {
      const key = `${item.partIndex}:${item.tick}`;
      if (!byBeat.has(key)) {
        byBeat.set(key, {
          partIndex: item.partIndex,
          tick: item.tick,
          x: item.x,
        });
      }
    }
    return [...byBeat.values()].sort(
      (a, b) => a.partIndex - b.partIndex || a.tick - b.tick,
    );
  }, [layout, articulations]);

  const chordPlacements = useMemo(
    () =>
      layout
        ? placeChords({
            regions: chordRegions,
            measures: layout.measures,
            anchors: beatAnchors,
            visibleParts: visibleChordParts,
            hidden: hiddenChords,
            trackIdByPart,
            format: chordFormat,
            scale: layout.scale,
          })
        : [],
    [
      layout,
      chordRegions,
      beatAnchors,
      visibleChordParts,
      hiddenChords,
      trackIdByPart,
      chordFormat,
    ],
  );

  /** Write what has been typed, and say whether it was a chord. */
  const commitChordEntry = useCallback(
    (entry: { partIndex: number; tick: number; text: string }) => {
      const chord = readChordInput(entry.text);
      if (!chord) return false;
      const existing = chordRegions.find((r) => r.startTick === entry.tick);
      if (existing) {
        renameChordRegion(existing.id, chord.label, chord.label);
      } else {
        insertChordRegion(entry.tick, chord.label, chord.label);
      }
      // A part has to be showing chords for what was just typed to appear.
      const trackId = trackIdByPart.get(entry.partIndex);
      if (
        !chordsAlwaysVisible &&
        trackId &&
        !scoreChordTracks.includes(trackId)
      ) {
        toggleScoreChordTrack(trackId);
      }
      return true;
    },
    [
      chordRegions,
      renameChordRegion,
      insertChordRegion,
      trackIdByPart,
      scoreChordTracks,
      toggleScoreChordTrack,
      chordsAlwaysVisible,
    ],
  );

  /** Space writes this chord and walks on to the next beat. */
  const advanceChordEntry = useCallback(() => {
    if (!chordEntry) return;
    if (chordEntry.text.trim()) commitChordEntry(chordEntry);
    const next = nextBeat(beatAnchors, chordEntry);
    setChordEntry(
      next ? { partIndex: next.partIndex, tick: next.tick, text: '' } : null,
    );
  }, [chordEntry, commitChordEntry, beatAnchors]);

  const handleChordPointerDown = useCallback(
    (key: string, event: React.PointerEvent) => {
      event.stopPropagation();
      setSelectedNotes(new Set());
      setSelectedCells(new Set());
      setSelectedMarks(new Set());
      setSelectedRests(new Set());
      setSelected(null);
      setChordMenu(null);
      const kind = clickKind(event);
      setSelectedChords((current) =>
        applyClick(current, kind, key, () =>
          chordRange(chordPlacements, chordAnchor.current ?? key, key),
        ),
      );
      if (kind !== 'range') chordAnchor.current = key;
      // A plain press also picks the symbol up: chords are dragged to the
      // beat they belong on, snapping as they go.
      const placement = chordPlacements.find((c) => c.key === key);
      if (kind === 'replace' && placement) {
        chordDragRef.current = {
          key,
          regionId: placement.regionId,
          partIndex: placement.partIndex,
          startClientX: event.clientX,
          startClientY: event.clientY,
          originX: placement.x,
          originY: placement.y,
          originTick: placement.tick,
          moved: false,
        };
        setChordDragging(true);
      }
    },
    [chordPlacements],
  );

  /** Follow a dragged chord symbol, and drop it on the beat under it. */
  useEffect(() => {
    if (!chordDragging) return;
    const move = (event: PointerEvent) => {
      const drag = chordDragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      drag.moved = true;
      const beat = beatAt(
        drag.partIndex,
        drag.originX + dx,
        drag.originY + dy + 30,
      );
      setChordDrag({
        key: drag.key,
        x: drag.originX + dx,
        y: drag.originY + dy,
        tick: beat?.tick ?? drag.originTick,
      });
    };
    const up = () => {
      const drag = chordDragRef.current;
      const dropped = chordDragRef.current && chordDrag;
      chordDragRef.current = null;
      setChordDragging(false);
      setChordDrag(null);
      if (drag?.moved && dropped && chordDrag.tick !== drag.originTick) {
        moveChordRegion(drag.regionId, chordDrag.tick);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [chordDragging, chordDrag, beatAt, moveChordRegion]);

  const hideSelectedChords = useCallback(() => {
    if (selectedChords.size === 0) return;
    setScoreChordHidden(
      withChordsHidden(scoreChordHidden, selectedChords, trackIdByPart),
    );
    setSelectedChords(new Set());
  }, [selectedChords, scoreChordHidden, trackIdByPart, setScoreChordHidden]);

  const partRows = useMemo(
    () =>
      scoreParts.map((part) => ({
        id: part.id,
        name: part.name,
        color: part.color,
        showChords: scoreChordTracks.includes(part.id),
        hiddenChords: scoreChordHidden.filter((entry) =>
          entry.startsWith(`${part.id}:`),
        ).length,
      })),
    [scoreParts, scoreChordTracks, scoreChordHidden],
  );

  // ── Copy and paste ──────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (selectedMarks.size > 0) {
      // Copying markings keeps what they are, not which notes they were on.
      const kinds = [...selectedMarks]
        .map((key) => marks.find((m) => m.key === key)?.kind)
        .filter((kind): kind is NonNullable<typeof kind> => !!kind);
      setClipboard({ kind: 'marks', marks: kinds });
      return;
    }
    if (selectedRests.size > 0) {
      // Copying a rest copies the silence: pasting it clears that much space.
      const rests = (layout?.rests ?? []).filter((r) =>
        selectedRests.has(r.key),
      );
      if (rests.length === 0) return;
      const start = Math.min(...rests.map((r) => r.tick));
      const end = Math.max(...rests.map((r) => r.tick + r.durationTicks));
      setClipboard({
        kind: 'notes',
        notes: [],
        span: end - start,
        replace: true,
        partCount: 1,
      });
      return;
    }
    if (selectedNotes.size > 0) {
      setClipboard(copyNotes(tracks, selectedNotes, partIndexByTrack));
      return;
    }
    if (selectedCells.size > 0) {
      const ids = notesInCells(layout?.notes ?? [], selectedCells);
      setClipboard(
        copyMeasures(
          tracks,
          ids,
          partIndexByTrack,
          selectedCellList,
          measureTicks,
        ),
      );
      return;
    }
    if (selected !== null) {
      const section = sections.find((sec) => sec.measureIdx === selected);
      setClipboard({
        kind: 'barline',
        repeatStart: repeatStarts.has(selected),
        repeatEnd: repeatEnds.has(selected - 1),
        sectionLabel: section?.label ?? null,
        systemBreak: systemBreaks.has(selected),
      });
    }
  }, [
    selectedMarks,
    marks,
    selectedRests,
    selectedNotes,
    selectedCells,
    selectedCellList,
    selected,
    tracks,
    partIndexByTrack,
    layout,
    measureTicks,
    sections,
    repeatStarts,
    repeatEnds,
    systemBreaks,
  ]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    if (clipboard.kind === 'marks') {
      // Markings land on whatever notes are selected now.
      if (selectedNotes.size === 0) return;
      let nextArticulations = articulations;
      let nextSlurs = slurs;
      for (const kind of clipboard.marks) {
        if (kind.type === 'articulation') {
          const already = new Set(
            [...selectedNotes].map((id) => articulationKey(id, kind.kind)),
          );
          nextArticulations = toggleArticulation(
            nextArticulations.filter((entry) => !already.has(entry)),
            selectedNotes,
            kind.kind,
          );
        } else if (kind.type === 'slur' && slurEnds) {
          const key = slurKey(slurEnds.from, slurEnds.to);
          nextSlurs = [...nextSlurs.filter((entry) => entry !== key), key];
        }
      }
      setArticulations(nextArticulations);
      setSlurs(nextSlurs);
      return;
    }
    if (clipboard.kind === 'barline') {
      // A barline's marks only paste onto another barline.
      if (selected === null) return;
      let next = withoutRepeatAt(repeats, selected);
      if (clipboard.repeatStart) {
        next = withRepeatStart(next, selected, measureCount);
      }
      if (clipboard.repeatEnd) next = withRepeatEnd(next, selected);
      setRepeats(next);
      removeSection(selected);
      if (clipboard.sectionLabel) {
        addSection({ measureIdx: selected, label: clipboard.sectionLabel });
      }
      if (clipboard.systemBreak !== systemBreaks.has(selected)) {
        toggleSystemBreak(selected);
      }
      return;
    }
    // Notes paste at a selected note, or at the start of a selected measure.
    let target: { partIndex: number; tick: number } | null = null;
    if (selectedRests.size > 0) {
      // Pasting onto a rest writes at the rest's own place.
      const first = (layout?.rests ?? [])
        .filter((r) => selectedRests.has(r.key))
        .sort((a, b) => a.tick - b.tick || a.partIndex - b.partIndex)[0];
      if (first) target = { partIndex: first.partIndex, tick: first.tick };
    } else if (selectedNotes.size > 0) {
      const first = (layout?.notes ?? [])
        .filter((n) => selectedNotes.has(n.id))
        .sort((a, b) => a.tick - b.tick || a.partIndex - b.partIndex)[0];
      if (first) target = { partIndex: first.partIndex, tick: first.tick };
    } else if (selectedCellList.length > 0) {
      const cell = [...selectedCellList].sort(
        (a, b) => a.measureIndex - b.measureIndex || a.partIndex - b.partIndex,
      )[0];
      target = {
        partIndex: cell.partIndex,
        tick: cell.measureIndex * measureTicks,
      };
    }
    if (!target) return;
    const { writes, noteIds } = pasteNotes(
      clipboard,
      target,
      tracks,
      trackIdByPart,
    );
    for (const write of writes) {
      updateMidiClipEvents(write.trackId, write.clipId, write.events);
    }
    setSelectedNotes(new Set(noteIds));
    setSelectedCells(new Set());
    setSelectedRests(new Set());
  }, [
    clipboard,
    selected,
    selectedRests,
    selectedNotes,
    articulations,
    slurs,
    slurEnds,
    setArticulations,
    setSlurs,
    selectedCellList,
    layout,
    tracks,
    trackIdByPart,
    measureTicks,
    measureCount,
    repeats,
    setRepeats,
    addSection,
    removeSection,
    systemBreaks,
    toggleSystemBreak,
    updateMidiClipEvents,
  ]);

  // ⌘C / ⌘V work whatever is selected; what they act on is decided above.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === 'c') {
        event.preventDefault();
        handleCopy();
      } else if (event.key === 'v') {
        event.preventDefault();
        handlePaste();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCopy, handlePaste]);

  // Markings answer to Delete and Escape like anything else selected.
  useEffect(() => {
    if (selectedMarks.size === 0 || editingSection !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedMarks();
      } else if (event.key === 'Escape') {
        setSelectedMarks(new Set());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedMarks, editingSection, deleteSelectedMarks]);

  // With a chord symbol picked, space walks on to the next beat and types.
  useEffect(() => {
    if (selectedChords.size === 0 || chordEntry) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key !== ' ') return;
      event.preventDefault();
      const first = chordPlacements.find((p) => selectedChords.has(p.key));
      if (!first) return;
      const next = nextBeat(beatAnchors, first);
      if (next) {
        setSelectedChords(new Set());
        setChordEntry({ partIndex: next.partIndex, tick: next.tick, text: '' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedChords, chordEntry, chordPlacements, beatAnchors]);

  // Chords come off a part with Delete, like anything else selected.
  useEffect(() => {
    if (selectedChords.size === 0 || editingSection !== null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        hideSelectedChords();
      } else if (event.key === 'Escape') {
        setSelectedChords(new Set());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedChords, editingSection, hideSelectedChords]);

  /** Runs of empty bars the sheet writes as one multi-bar rest. */
  const multiRests = useMemo(() => {
    if (!measureRestMap) return undefined;
    const map = new Map<number, number>();
    for (const [index, bars] of Object.entries(measureRestMap)) {
      if (bars > 1) map.set(Number(index), bars);
    }
    return map.size > 0 ? map : undefined;
  }, [measureRestMap]);

  const noteStyles = useMemo(() => {
    const styles = new Map<string, { color?: string; glow?: boolean }>();
    for (const id of selectedNotes) {
      styles.set(id, { color: 'var(--color-accent, #7ecfcf)', glow: true });
    }
    // Rests are painted through the same map, keyed by their own id.
    for (const key of selectedRests) {
      styles.set(key, { color: 'var(--color-accent, #7ecfcf)', glow: true });
    }
    return styles;
  }, [selectedNotes, selectedRests]);

  const noteOffsets = useMemo(() => {
    const offsets = new Map<string, { x: number; y: number }>();
    if (!dragOffset) return offsets;
    for (const id of selectedNotes) offsets.set(id, dragOffset);
    return offsets;
  }, [dragOffset, selectedNotes]);

  /** A rehearsal mark sits above whatever else opens that bar. */
  const markTop = useCallback(
    (barline: { measureIndex: number; y: number }) => {
      const box = layout?.measures.find(
        (m) => m.partIndex === 0 && m.measureIndex === barline.measureIndex,
      );
      const chord = box
        ? chordPlacements.find(
            (c) => c.partIndex === 0 && c.tick === box.startTick,
          )
        : undefined;
      return Math.min(
        barline.y - 20,
        (chord?.y ?? Number.POSITIVE_INFINITY) - MARK_ROW,
      );
    },
    [layout, chordPlacements],
  );

  const overlay = layout ? (
    <>
      {layout.measures
        .filter((m) => selectedCells.has(cellKey(m)))
        .map((m) => (
          <div
            key={`m${m.system}:${m.partIndex}:${m.measureIndex}`}
            data-measure-selected={cellKey(m)}
            className="pointer-events-none absolute"
            style={{
              left: m.x,
              top: m.y,
              width: m.width,
              height: m.height,
              background:
                'color-mix(in srgb, var(--color-accent, #7ecfcf) 16%, transparent)',
              border: '1px solid var(--color-accent, #7ecfcf)',
              borderRadius: 2,
            }}
          />
        ))}
      {/* Marks, slurs and ties: one layer that scales with the staff. Each
          is clickable on its own, and shows when it is selected. */}
      <svg
        className="ma-marks absolute inset-0 size-full overflow-visible"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        {chordMarks.map(({ key, note, side, kinds }) => {
          const above = side === 'above';
          const space = note.space * 2;
          const start = above ? note.y - space * 1.4 : note.y + space * 1.4;
          return (
            <g key={`art-${key}`}>
              {kinds.map((kind, index) => {
                const choice = ARTICULATIONS.find((a) => a.kind === kind);
                const markKey = articulationMarkKey(note.id, kind);
                const picked = selectedMarks.has(markKey);
                const y = above ? start - index * space : start + index * space;
                return (
                  <text
                    key={kind}
                    x={note.x}
                    y={y}
                    textAnchor="middle"
                    fontFamily="Bravura"
                    fontSize={space * 4}
                    fill={
                      picked
                        ? 'var(--color-accent, #7ecfcf)'
                        : 'var(--color-text)'
                    }
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onPointerDown={(event) =>
                      handleMarkPointerDown(markKey, event)
                    }
                  >
                    {above ? choice?.glyph : choice?.glyphBelow}
                  </text>
                );
              })}
            </g>
          );
        })}
        {slurs.map((entry) => {
          const ends = parseSlur(entry);
          const from = (layout?.notes ?? []).find((n) => n.id === ends?.fromId);
          const to = (layout?.notes ?? []).find((n) => n.id === ends?.toId);
          if (!ends || !from || !to || from.x === to.x) return null;
          const side =
            articulationSide(from) === articulationSide(to)
              ? articulationSide(from)
              : 'above';
          const above = side === 'above';
          const space = from.space * 2;
          const lift = above ? -space * 1.2 : space * 1.2;
          const y1 = from.y + lift;
          const y2 = to.y + lift;
          const peak =
            (above ? Math.min(y1, y2) : Math.max(y1, y2)) + lift * 1.8;
          const d = `M ${from.x} ${y1} Q ${(from.x + to.x) / 2} ${peak} ${to.x} ${y2}`;
          const markKey = slurMarkKey(ends.fromId, ends.toId);
          const picked = selectedMarks.has(markKey);
          return (
            <g key={entry}>
              <path
                d={d}
                fill="none"
                stroke={
                  picked ? 'var(--color-accent, #7ecfcf)' : 'var(--color-text)'
                }
                strokeWidth={Math.max(1, from.space * 0.22)}
                strokeLinecap="round"
              />
              {/* A wider invisible arc, so the thin curve is easy to hit. */}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(10, from.space * 2)}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onPointerDown={(event) => handleMarkPointerDown(markKey, event)}
              />
            </g>
          );
        })}
        {/* Ties are drawn by the engine; these sit over them to be clicked. */}
        {marks
          .filter((mark) => mark.kind.type === 'tie')
          .map((mark) => {
            const fragments = (layout?.notes ?? [])
              .filter((n) => n.id === mark.noteIds[0])
              .sort((a, b) => a.tick - b.tick);
            const from = fragments.find((n) => n.tick === mark.tick);
            const to = fragments.find((n) => n.tick === mark.splitTick);
            if (!from || !to) return null;
            const picked = selectedMarks.has(mark.key);
            const space = from.space * 2;
            const y =
              from.y + (articulationSide(from) === 'above' ? -space : space);
            return (
              <g key={mark.key}>
                {picked && (
                  <path
                    d={`M ${from.x} ${y} Q ${(from.x + to.x) / 2} ${y + (y < from.y ? -space : space)} ${to.x} ${y}`}
                    fill="none"
                    stroke="var(--color-accent, #7ecfcf)"
                    strokeWidth={Math.max(1.6, from.space * 0.4)}
                  />
                )}
                <path
                  d={`M ${from.x} ${y} Q ${(from.x + to.x) / 2} ${y + (y < from.y ? -space : space)} ${to.x} ${y}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(10, from.space * 2)}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onPointerDown={(event) =>
                    handleMarkPointerDown(mark.key, event)
                  }
                />
              </g>
            );
          })}
      </svg>
      {chordEntry &&
        (() => {
          // The prompt stands where the chord will: over its own beat.
          const beat = beatAnchors.find(
            (b) =>
              b.partIndex === chordEntry.partIndex &&
              b.tick === chordEntry.tick,
          );
          const box = layout.measures.find(
            (m) =>
              m.partIndex === chordEntry.partIndex &&
              chordEntry.tick >= m.startTick &&
              chordEntry.tick < m.endTick,
          );
          if (!box) return null;
          const scale = layout.scale;
          return (
            <input
              autoFocus
              value={chordEntry.text}
              placeholder="_"
              onChange={(event) =>
                setChordEntry({ ...chordEntry, text: event.target.value })
              }
              onBlur={() => {
                if (chordEntry.text.trim()) commitChordEntry(chordEntry);
                setChordEntry(null);
              }}
              onKeyDown={(event) => {
                if (event.key === ' ') {
                  event.preventDefault();
                  advanceChordEntry();
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  if (chordEntry.text.trim()) commitChordEntry(chordEntry);
                  setChordEntry(null);
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  setChordEntry(null);
                }
                event.stopPropagation();
              }}
              className="absolute rounded-sm px-0.5 outline-none"
              style={{
                left: (beat?.x ?? box.x) - 2,
                top: box.y - 22 * scale,
                width: 72 * scale,
                fontFamily: 'serif',
                fontWeight: 700,
                fontSize: CHORD_FONT_SIZE * scale,
                lineHeight: 1,
                color: 'var(--color-text)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-accent, #7ecfcf)',
                zIndex: 6,
              }}
            />
          );
        })()}
      {chordPlacements.map((chord) => {
        const isSelected = selectedChords.has(chord.key);
        const dragged = chordDrag?.key === chord.key ? chordDrag : null;
        return (
          <button
            key={chord.key}
            onPointerDown={(event) => handleChordPointerDown(chord.key, event)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setChordMenu({
                key: chord.key,
                regionId: chord.regionId,
                x: chord.x,
                y: Math.max(0, chord.y) + 18,
              });
            }}
            title={`${chord.text} — drag it to another beat, or right-click for more`}
            className="absolute whitespace-nowrap rounded-sm px-0.5 leading-none"
            style={{
              // Centred over the beat it belongs to, above the click strip.
              left: dragged ? dragged.x : chord.x,
              top: Math.max(0, dragged ? dragged.y : chord.y),
              cursor: dragged ? 'grabbing' : 'grab',
              opacity: dragged ? 0.75 : 1,
              transform: 'translateX(-50%)',
              // The lead sheet's own chord type: bold serif at 16px.
              fontFamily: 'serif',
              fontWeight: 700,
              fontSize: CHORD_FONT_SIZE * (layout?.scale ?? 1),
              zIndex: 5,
              color: isSelected
                ? 'var(--color-accent, #7ecfcf)'
                : 'var(--color-text)',
              background: isSelected
                ? 'color-mix(in srgb, var(--color-accent, #7ecfcf) 20%, transparent)'
                : 'transparent',
            }}
          >
            {chord.text}
          </button>
        );
      })}
      {layout.barlines.map((barline) => {
        const isSelected = selected === barline.measureIndex;
        const section = sections.find(
          (sec) => sec.measureIdx === barline.measureIndex,
        );
        // Signs and directives sit above the staff, clear of the rehearsal
        // letter; a jump reads at the end of its bar, so it hangs right.
        const barMarks = barline.atSystemEnd
          ? []
          : marksAt(textMarks, barline.measureIndex);
        const broken = systemBreaks.has(barline.measureIndex);
        const atSystemStart =
          !barline.atSystemEnd &&
          !layout.barlines.some(
            (other) =>
              other.system === barline.system &&
              !other.atSystemEnd &&
              other.measureIndex < barline.measureIndex,
          );
        return (
          <div
            key={`${barline.system}:${barline.measureIndex}:${barline.atSystemEnd}`}
          >
            {/* Click target sitting on the barline itself. */}
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                setSelectedNotes(new Set());
                setSelectedCells(new Set());
                setSelectedRests(new Set());
                setSelectedMarks(new Set());
                setSelected(barline.measureIndex);
              }}
              title={`Barline before bar ${barline.measureIndex + 1}`}
              className="absolute rounded-sm transition-colors hover:bg-[color:var(--color-accent,#7ecfcf)]/25"
              style={{
                // A system's opening barline sits right of the brace, so its
                // target leans inward rather than over the bracket.
                left: barline.x - (atSystemStart ? 2 : 7),
                top: barline.y,
                width: 14,
                height: barline.height,
                background: isSelected
                  ? 'color-mix(in srgb, var(--color-accent, #7ecfcf) 35%, transparent)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid var(--color-accent, #7ecfcf)'
                  : '1px solid transparent',
                cursor: 'pointer',
              }}
            />
            {/* Rehearsal mark, above the top staff — and above a chord
                symbol standing on the same barline, as MuseScore stacks
                them. */}
            {section && !barline.atSystemEnd && (
              <div
                className="absolute flex leading-none"
                style={{
                  left: barline.x + 2,
                  top: Math.max(0, markTop(barline)),
                }}
              >
                {editingSection === barline.measureIndex ? (
                  <input
                    autoFocus
                    defaultValue={section.label}
                    onBlur={(e) => {
                      const label = e.target.value.trim();
                      if (label)
                        addSection({ measureIdx: section.measureIdx, label });
                      setEditingSection(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingSection(null);
                    }}
                    className="w-20 rounded-sm border px-1 text-[11px] font-bold outline-none"
                    style={{
                      background: 'var(--color-surface-2)',
                      borderColor: 'var(--color-accent, #7ecfcf)',
                      color: 'var(--color-text)',
                    }}
                  />
                ) : (
                  <button
                    onDoubleClick={() => setEditingSection(section.measureIdx)}
                    onClick={() => setSelected(barline.measureIndex)}
                    title="Double-click to rename"
                    className="rounded-sm border px-1 text-[11px] font-bold"
                    style={{
                      borderColor: 'var(--color-text)',
                      color: 'var(--color-text)',
                      background: 'var(--color-bg)',
                    }}
                  >
                    {section.label}
                  </button>
                )}
              </div>
            )}
            {barMarks.map((mark, index) => {
              const atEnd = marksBarEnd(mark.kind);
              const glyph = isGlyphMark(mark.kind);
              const editing = editingMark === mark.id;
              return (
                <div
                  key={mark.id}
                  className="absolute"
                  style={{
                    // A jump is read on the way out of its bar, so it hangs
                    // back from the barline; everything else stands after it.
                    left: atEnd ? barline.x - 4 : barline.x + 2,
                    transform: atEnd ? 'translateX(-100%)' : undefined,
                    top: Math.max(
                      0,
                      barline.y - 38 - index * 16 - (section ? 18 : 0),
                    ),
                  }}
                >
                  {editing ? (
                    <input
                      autoFocus
                      defaultValue={mark.text ?? ''}
                      placeholder="Text…"
                      onBlur={(e) => {
                        setTextMarks(
                          withMarkText(textMarks, mark.id, e.target.value),
                        );
                        setEditingMark(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') {
                          setTextMarks(withoutMark(textMarks, mark.id));
                          setEditingMark(null);
                        }
                      }}
                      className="w-28 rounded-sm border px-1 text-[11px] outline-none"
                      style={{
                        background: 'var(--color-surface-2)',
                        borderColor: 'var(--color-accent, #7ecfcf)',
                        color: 'var(--color-text)',
                      }}
                    />
                  ) : (
                    <button
                      onDoubleClick={() =>
                        mark.kind === 'text' && setEditingMark(mark.id)
                      }
                      onClick={() => setSelected(barline.measureIndex)}
                      title={
                        mark.kind === 'text'
                          ? 'Double-click to edit'
                          : MARK_STYLES[mark.kind].name
                      }
                      className="whitespace-nowrap px-0.5"
                      style={{
                        color: 'var(--color-text)',
                        fontFamily: glyph ? 'Bravura' : 'serif',
                        fontSize: glyph ? 20 : 12,
                        fontStyle: glyph ? 'normal' : 'italic',
                        fontWeight: glyph ? 400 : 600,
                        lineHeight: 1,
                      }}
                    >
                      {markLabel(mark)}
                    </button>
                  )}
                </div>
              );
            })}

            {/* System break marker, as MuseScore shows one. */}
            {broken && barline.atSystemEnd && (
              <div
                className="pointer-events-none absolute text-[13px]"
                style={{
                  left: barline.x + 4,
                  top: Math.max(0, barline.y - 18),
                  color: 'var(--color-text-dim)',
                }}
                title="System break"
              >
                ↵
              </div>
            )}
          </div>
        );
      })}
      {/* Where a dragged chord symbol will land. */}
      {chordDrag &&
        (() => {
          const box = layout.measures.find(
            (m) =>
              m.partIndex ===
                (chordPlacements.find((c) => c.key === chordDrag.key)
                  ?.partIndex ?? 0) &&
              chordDrag.tick >= m.startTick &&
              chordDrag.tick < m.endTick,
          );
          if (!box) return null;
          const span = box.endTick - box.startTick || 1;
          const x =
            box.x + ((chordDrag.tick - box.startTick) / span) * box.width;
          return (
            <div
              className="pointer-events-none absolute"
              style={{
                left: x - 1,
                top: box.y,
                width: 2,
                height: box.height,
                background: 'var(--color-accent, #7ecfcf)',
                opacity: 0.8,
                zIndex: 4,
              }}
            />
          );
        })()}
      {/* Fermatas, held over a whole bar as the chart writes them. */}
      {(fermatas ?? []).map((measureIndex) => {
        const box = layout.measures.find(
          (m) => m.partIndex === 0 && m.measureIndex === measureIndex,
        );
        if (!box) return null;
        return (
          <div
            key={`fermata:${measureIndex}`}
            className="pointer-events-none absolute"
            style={{
              left: box.x + box.width / 2,
              top: Math.max(0, box.y - 26 * layout.scale),
              transform: 'translateX(-50%)',
              fontFamily: 'Bravura',
              fontSize: 26 * layout.scale,
              lineHeight: 1,
              color: 'var(--color-text)',
              zIndex: 5,
            }}
          >
            {'\uE4C0'}
          </div>
        );
      })}
      {/* Right-click on a chord: the chart's own menu. */}
      {chordMenu && (
        <div
          className="absolute rounded-md py-1 text-xs"
          style={{
            left: chordMenu.x,
            top: chordMenu.y,
            minWidth: 150,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 20,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {[
            {
              label: 'Rename',
              run: () => {
                const chord = chordPlacements.find(
                  (c) => c.key === chordMenu.key,
                );
                if (chord) {
                  setChordEntry({
                    partIndex: chord.partIndex,
                    tick: chord.tick,
                    text: '',
                  });
                }
              },
            },
            {
              label: 'Mark as melody',
              run: () => markAsMelody(chordMenu.regionId),
            },
            {
              label: 'Take off this part',
              run: () =>
                setScoreChordHidden(
                  withChordsHidden(
                    scoreChordHidden,
                    [chordMenu.key],
                    trackIdByPart,
                  ),
                ),
            },
            {
              label: 'Delete chord',
              danger: true,
              run: () => deleteChordRegion(chordMenu.regionId),
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.run();
                setChordMenu(null);
                setSelectedChords(new Set());
              }}
              className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
              style={{
                color: item.danger ? '#ef4444' : 'var(--color-text)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  ) : null;

  return {
    // What is selected, for the panels and for tests.
    selection: {
      notes: selectedNotes,
      rests: selectedRests,
      cells: selectedCells,
      chords: selectedChords,
      marks: selectedMarks,
      barline: selected,
    },
    /** Props for the staff renderer. */
    staff: {
      noteStyles,
      noteOffsets,
      playheadTick: position,
      // The score is engraved onto paper, so a system is the same size
      // whatever the window is doing and what is drawn is what prints.
      page: LETTER_PORTRAIT,
      measuresPerSystem: measureRowSizes ? undefined : measuresPerLine || 4,
      systemMarks,
      repeatStarts,
      repeatEnds,
      // A row of rehearsal marks needs room above the chord symbols.
      // Room above every system for whatever the overlay stands there: the
      // rehearsal letters, and however deep the marks stack on one bar.
      headroom:
        (sections.length > 0 ? MARK_ROW : 0) +
        (textMarks.length > 0 ? MARK_ROW + deepestMarkStack * 16 : 0),
      multiRests,
      onLayout: handleLayout,
      overlay,
      onNotePointerDown: handleNotePointerDown,
      onMeasurePointerDown: handleMeasurePointerDown,
      onRestPointerDown: handleRestPointerDown,
      onBackgroundPointerDown: clearSelection,
    },
    /** Props for the note editor bar. */
    editor: {
      hasNotes: selectedNotes.size > 0,
      layer,
      onLayer: setLayer,
      currentDuration,
      dotted,
      activeArticulations,
      slurred:
        !!slurEnds && slurs.includes(slurKey(slurEnds.from, slurEnds.to)),
      canTie,
      onTie: applyTie,
      canAddChord: chordTarget !== null,
      onAddChord: () =>
        chordTarget && setChordEntry({ ...chordTarget, text: '' }),
      currentAccidental: currentAccidental?.alteration ?? null,
      onAccidental: applyAccidental,
      canUndo,
      canRedo,
      onUndo: () => {
        smartUndo();
        clearSelection();
      },
      onRedo: () => {
        smartRedo();
        clearSelection();
      },
      onDuration: (choice: DurationChoice) => applyDuration(choice),
      onToggleDot: () => {
        const next = !dotted;
        setDotted(next);
        if (currentDuration) applyDuration(currentDuration, next);
      },
      onArticulation: applyArticulation,
      onSlur: applySlur,
    },
    /** What a palette cell applies to, and how to apply one. */
    palette: { hasSelection: targetBarline !== null, onApply: apply },
    /** Per-part chord symbol switches. */
    partRows,
    onToggleChords: toggleScoreChordTrack,
    onRestoreChords: (trackId: string) =>
      setScoreChordHidden(withPartChordsRestored(scoreChordHidden, trackId)),
  };
}
