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
import { parseNoteId } from '@/daw/model/noteKeys';
import { SCORE_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { showWarning } from '@/components/utils/toast';
import { useLeadSheetSections, useStore } from '@/daw/store';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { studioPlayheadSource } from '@/daw/engine/studioPlayheadSource';
import { smartRedo, smartUndo } from '@/daw/store/undoMiddleware';
import { withTransaction } from '@/daw/store/history';
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
  articulationKey,
  durationTicks,
  groupChordArticulations,
  planTie,
  type NoteLayer,
  parseSlur,
  slurKey,
  toggleArticulation,
  toggleSlur,
  type ArticulationKind,
  type DurationChoice,
} from './noteEditor';
import {
  CHORD_INPUT_HINT,
  chordInputText,
  nextBeat,
  typedChord,
} from '@/daw/harmony/chordInput';
import { keyFrameOf } from '@/daw/harmony/keyFrame';
import { ChordInputHint, chordBoxBorder } from '@/daw/harmony/ChordInputHint';
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
  followNoteEdit,
  type NoteEditResult,
  type NoteKeyedMarks,
} from './scoreEdit';
import {
  addToSelection,
  articulationMarkKey,
  markRange,
  slurMarkKey,
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
import {
  articulationIndex,
  byBar,
  clipEventIndex,
  noteIndex,
  scoreMarksOf,
  systemOpeningBars,
  tieCandidatesOf,
} from './scoreLookups';

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
  // The song's sections, as marks on the bars they start at (milestone 2.13).
  const sections = useLeadSheetSections();
  const markSectionAtBar = useStore((s) => s.markSectionAtBar);
  const removeSectionAtBar = useStore((s) => s.removeSectionAtBar);
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
  /**
   * Where a chord is being typed, what has been typed so far, and whether
   * the last try to write it named no chord (the box then says so).
   */
  const [chordEntry, setChordEntry] = useState<{
    partIndex: number;
    tick: number;
    text: string;
    refused?: boolean;
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

  /**
   * Marks follow their notes: an edit gives a moved note a new id, and says
   * which old id became which (followNoteEdit). Then `adjust` makes the
   * edit's own changes to the marks, on the ids the notes have now. Each list
   * is written only when it changed.
   */
  const followEdit = useCallback(
    (
      result: NoteEditResult,
      adjust?: (
        marks: NoteKeyedMarks,
        result: NoteEditResult,
      ) => NoteKeyedMarks,
    ) => {
      let next = followNoteEdit(
        {
          articulations,
          slurs,
          spellings: scoreSpellings,
          slashNotes,
        },
        result,
      );
      if (adjust) next = adjust(next, result);
      if (next.articulations !== articulations) {
        setArticulations(next.articulations);
      }
      if (next.slurs !== slurs) setSlurs(next.slurs);
      if (next.spellings !== scoreSpellings) setScoreSpellings(next.spellings);
      if (next.slashNotes !== slashNotes) setSlashNotes(next.slashNotes);
    },
    [
      articulations,
      slurs,
      scoreSpellings,
      slashNotes,
      setArticulations,
      setSlurs,
      setScoreSpellings,
      setSlashNotes,
    ],
  );

  const writeEdit = useCallback(
    (
      ids: Iterable<string>,
      edit: Parameters<typeof applyNoteEdit>[2],
      adjust?: Parameters<typeof followEdit>[1],
    ) => {
      // The notes and the marks that follow them are one undo step, and
      // one update to collaborators.
      return withTransaction('Edit notes', () => {
        const result = applyNoteEdit(
          tracks,
          ids,
          edit,
          keyFifths,
          updateMidiClipEvents,
        );
        followEdit(result, adjust);
        return result.ids;
      });
    },
    [tracks, keyFifths, updateMidiClipEvents, followEdit],
  );

  /** Several different edits in one pass; marks follow as with writeEdit. */
  const writeEdits = useCallback(
    (
      edits: Map<string, Parameters<typeof applyNoteEdit>[2]>,
      adjust?: Parameters<typeof followEdit>[1],
    ) => {
      return withTransaction('Edit notes', () => {
        const result = applyNoteEdits(
          tracks,
          edits,
          keyFifths,
          updateMidiClipEvents,
        );
        followEdit(result, adjust);
        return result.ids;
      });
    },
    [tracks, keyFifths, updateMidiClipEvents, followEdit],
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
          // No mark on the closing barline: it would start a section a bar
          // past the song, which the Score doesn't draw there.
          if (selected >= measureCount) break;
          const existing = sections.find((s) => s.measureIdx === selected);
          if (existing) removeSectionAtBar(selected);
          else markSectionAtBar(selected, nextSectionLabel(sections));
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
      markSectionAtBar,
      removeSectionAtBar,
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

      // The slash list is rewritten only when a note joins or leaves it, so
      // a plain length change writes no marks.
      const nextIds = writeEdit(
        selectedNotes,
        { durationTicks: ticks },
        (marks, { ids }) => {
          if (into === 'slashes') {
            const slashed = new Set(marks.slashNotes);
            return ids.every((id) => slashed.has(id))
              ? marks
              : { ...marks, slashNotes: [...new Set([...slashed, ...ids])] };
          }
          // Back to pitched notation.
          const edited = new Set(ids);
          return marks.slashNotes.some((id) => edited.has(id))
            ? {
                ...marks,
                slashNotes: marks.slashNotes.filter((id) => !edited.has(id)),
              }
            : marks;
        },
      );
      setSelectedNotes(new Set(nextIds));
    },
    [selectedNotes, writeEdit, ticksPerQuarter, dotted, layer, layout],
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
      const spelled = new Map<string, string>();
      for (const note of selectedSpelled) {
        const target = wanted.get(note.letter) ?? alteration;
        if (note.alteration === target) continue;
        const midi = accidentalPitch(note, target);
        if (midi < 0 || midi > 127) continue;
        edits.set(note.id, { midi });
        spelled.set(note.id, accidentalSpelling(note, target));
      }
      if (edits.size === 0) return;
      const nextIds = writeEdits(edits, (marks, { renamed }) => {
        let spellings = marks.spellings;
        for (const [id, name] of spelled) {
          const now = renamed.get(id);
          if (now) spellings = withSpelling(spellings, now, name);
        }
        return { ...marks, spellings };
      });
      setSelectedNotes(new Set(nextIds));
    },
    [selectedSpelled, keyFifths, writeEdits, setSelectedNotes],
  );

  /** Each drawn note's clip event, found without searching every clip. */
  const eventAt = useMemo(() => clipEventIndex(tracks), [tracks]);
  /** The drawn notes by id and by beat, for the markings and the overlay. */
  const drawnNotes = useMemo(() => noteIndex(layout?.notes ?? []), [layout]);

  /** Every note as the tie logic sees it (see tieCandidatesOf). */
  const tieCandidates = useMemo(
    () => tieCandidatesOf(layout?.notes ?? [], eventAt),
    [layout, eventAt],
  );

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

  /** The beat a chord would be written over: the selected note or rest. */
  const chordTarget = useMemo(() => {
    const note = (layout?.notes ?? []).find((n) => selectedNotes.has(n.id));
    if (note) return { partIndex: note.partIndex, tick: note.tick };
    const rest = (layout?.rests ?? []).find((r) => selectedRests.has(r.key));
    if (rest) return { partIndex: rest.partIndex, tick: rest.tick };
    return null;
  }, [layout, selectedNotes, selectedRests]);

  // ── Markings: articulations, slurs and ties ─────────────────────────────
  /** Each note's articulations, read once rather than once per note. */
  const articulationsByNote = useMemo(
    () => articulationIndex(articulations),
    [articulations],
  );
  const chordMarks = useMemo(
    () =>
      groupChordArticulations(
        layout?.notes ?? [],
        (id) => articulationsByNote.get(id) ?? [],
      ),
    [layout, articulationsByNote],
  );

  /** Every marking on the page, as something that can be picked up. */
  const marks = useMemo(
    () =>
      scoreMarksOf({
        chordMarks,
        notes: drawnNotes,
        kindsOf: (id) => articulationsByNote.get(id) ?? [],
        slurs,
      }),
    [chordMarks, drawnNotes, articulationsByNote, slurs],
  );

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
  // The project's bar while there are no parts to read it from.
  const projectBarTicks = useStore((s) => ticksPerBar(timeSignatureOf(s)));
  const measureTicks = parts[0]?.score.ticksPerMeasure ?? projectBarTicks;

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
            : (articulationsByNote.get(item.id)?.length ?? 0) > 0
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
  }, [layout, articulationsByNote]);

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

  /**
   * Write what has been typed, and say whether it was a chord. It is stored
   * as the lane stores chords (a degree name in a key, the letter name, the
   * degreeKey) with its identity, never as the typed text.
   */
  const commitChordEntry = useCallback(
    (entry: { partIndex: number; tick: number; text: string }) => {
      const { rootNote, mode } = useStore.getState();
      const chord = typedChord(entry.text, keyFrameOf(rootNote, mode));
      if (!chord) return false;
      const { name, noteName, color, degreeKey, identity } = chord;
      const existing = chordRegions.find((r) => r.startTick === entry.tick);
      if (existing) {
        renameChordRegion(existing.id, name, noteName, {
          color,
          degreeKey,
          identity,
        });
      } else {
        insertChordRegion(entry.tick, name, noteName, color, {
          degreeKey,
          identity,
        });
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

  /**
   * Space writes this chord and walks on to the next beat; text that names
   * no chord stays, and the box says so.
   */
  const advanceChordEntry = useCallback(() => {
    if (!chordEntry) return;
    if (chordEntry.text.trim() && !commitChordEntry(chordEntry)) {
      setChordEntry({ ...chordEntry, refused: true });
      return;
    }
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
      // A pasted name renames the section starting on this barline, or
      // starts one there; a barline without one leaves its bars unnamed.
      // The closing barline starts nothing: a section there would be a bar
      // past the song.
      if (selected < measureCount) {
        if (clipboard.sectionLabel) {
          markSectionAtBar(selected, clipboard.sectionLabel);
        } else {
          removeSectionAtBar(selected);
        }
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
    const { writes, noteIds, removedIds } = pasteNotes(
      clipboard,
      target,
      tracks,
      trackIdByPart,
    );
    for (const write of writes) {
      if (write.newClipStartTick !== undefined) {
        useStore.getState().addMidiClip(write.trackId, {
          id: write.clipId,
          startTick: write.newClipStartTick,
          events: write.events,
        });
      } else {
        updateMidiClipEvents(write.trackId, write.clipId, write.events);
      }
    }
    // The notes a measure paste cleared take their marks with them, so none
    // carries over to a pasted note that lands where one of them sat.
    followEdit({
      ids: noteIds,
      renamed: new Map(),
      removed: new Set(removedIds),
    });
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
    markSectionAtBar,
    removeSectionAtBar,
    systemBreaks,
    toggleSystemBreak,
    updateMidiClipEvents,
    followEdit,
  ]);

  // ── Keys (the score scope) ──────────────────────────────────────────────
  // MuseScore's keys. Delete clears what's selected (notes, the bars picked,
  // a barline's repeat and rehearsal mark, markings, chord symbols); Up and
  // Down move the selected notes a staff step (Shift for an octave); 2–7 set
  // their length, . > - _ ; their articulation, S a slur, T a tie, K a chord
  // symbol over them. ⌥N / ⌥R / ⌥H pick the row that numbers write into
  // (Option rather than ⌘, which the browser and macOS keep for themselves:
  // new window, reload, hide application). Return breaks the system at the
  // picked barline, ⌘M puts a rehearsal mark there. With a chord symbol
  // picked, Space walks on to the next beat and types. ⌘C / ⌘V work whatever
  // is selected; what they act on is decided above. Delete and Escape are
  // always the Score's here, so neither reaches a clip in Create or stops
  // the music. A key a command doesn't take goes on to the global keys.
  const editingNotes = selectedNotes.size > 0 && editingSection === null;
  const atBarline =
    editingSection === null &&
    selectedNotes.size === 0 &&
    targetBarline !== null;
  const moveNotes = (steps: number) => {
    if (!editingNotes) return false;
    setSelectedNotes(new Set(writeEdit(selectedNotes, { steps })));
  };
  useKeymap(SCORE_SCOPE.id, {
    'score.delete': () => {
      if (editingSection !== null) return;
      if (selectedNotes.size > 0) {
        writeEdit(selectedNotes, { remove: true });
        setSelectedNotes(new Set());
      } else if (selectedCells.size > 0) {
        writeEdit(notesInCells(layout?.notes ?? [], selectedCells), {
          remove: true,
        });
      } else if (targetBarline !== null) {
        setRepeats(withoutRepeatAt(repeats, targetBarline));
        removeSectionAtBar(targetBarline);
      }
      if (selectedMarks.size > 0) deleteSelectedMarks();
      if (selectedChords.size > 0) hideSelectedChords();
    },
    'score.up': () => moveNotes(1),
    'score.down': () => moveNotes(-1),
    'score.octaveUp': () => moveNotes(7),
    'score.octaveDown': () => moveNotes(-7),
    'score.duration': (e) => {
      const duration = DURATIONS.find((choice) => choice.key === e.key);
      if (!editingNotes || !duration) return false;
      applyDuration(duration);
    },
    'score.articulation': (e) => {
      const articulation = ARTICULATIONS.find((choice) => choice.key === e.key);
      if (!editingNotes || !articulation) return false;
      applyArticulation(articulation.kind);
    },
    'score.slur': () => {
      if (!editingNotes) return false;
      applySlur();
    },
    'score.tie': () => {
      if (!editingNotes) return false;
      applyTie();
    },
    'score.chord': () => {
      if (!editingNotes || !chordTarget) return false;
      setChordEntry({ ...chordTarget, text: '' });
    },
    'score.nextBeat': () => {
      if (selectedChords.size === 0 || chordEntry) return false;
      const first = chordPlacements.find((p) => selectedChords.has(p.key));
      if (!first) return;
      const next = nextBeat(beatAnchors, first);
      if (next) {
        setSelectedChords(new Set());
        setChordEntry({ partIndex: next.partIndex, tick: next.tick, text: '' });
      }
    },
    'score.layerNotes': () => setLayer('notes'),
    'score.layerRests': () => setLayer('rests'),
    'score.layerSlashes': () => setLayer('slashes'),
    'score.systemBreak': () => {
      if (!atBarline || targetBarline === null) return false;
      toggleSystemBreak(targetBarline);
    },
    'score.rehearsalMark': () => {
      if (!atBarline || selectedCells.size > 0) return false;
      apply('text.rehearsalMark');
    },
    'score.copy': () => handleCopy(),
    'score.paste': () => handlePaste(),
    'score.escape': () => {
      if (editingSection !== null) return;
      if (
        selectedNotes.size > 0 ||
        selectedCells.size > 0 ||
        targetBarline !== null
      ) {
        clearSelection();
      }
      if (selectedMarks.size > 0) setSelectedMarks(new Set());
      if (selectedChords.size > 0) setSelectedChords(new Set());
      // The chord menu goes with the selection it was opened on (score-26).
      setChordMenu(null);
    },
  });

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
      styles.set(id, { color: 'var(--daw-accent)', glow: true });
    }
    // Rests are painted through the same map, keyed by their own id.
    for (const key of selectedRests) {
      styles.set(key, { color: 'var(--daw-accent)', glow: true });
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

  // What each barline looks up, by bar and by system, built once a layout.
  const sectionsByBar = useMemo(() => byBar(sections), [sections]);
  const textMarksByBar = useMemo(() => byBar(textMarks), [textMarks]);
  const openingBars = useMemo(
    () => systemOpeningBars(layout?.barlines ?? []),
    [layout],
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
                'color-mix(in srgb, var(--daw-accent) 16%, transparent)',
              border: '1px solid var(--daw-accent)',
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
                    fill={picked ? 'var(--daw-accent)' : 'var(--daw-text)'}
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
          const from = ends ? drawnNotes.byId.get(ends.fromId)?.[0] : undefined;
          const to = ends ? drawnNotes.byId.get(ends.toId)?.[0] : undefined;
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
                stroke={picked ? 'var(--daw-accent)' : 'var(--daw-text)'}
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
            const fragments = [
              ...(drawnNotes.byId.get(mark.noteIds[0]) ?? []),
            ].sort((a, b) => a.tick - b.tick);
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
                    stroke="var(--daw-accent)"
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
          const left = (beat?.x ?? box.x) - 2;
          const top = box.y - 22 * scale;
          return (
            <>
              <input
                autoFocus
                value={chordEntry.text}
                placeholder="_"
                aria-label="Chord symbol"
                aria-invalid={chordEntry.refused || undefined}
                onChange={(event) =>
                  setChordEntry({
                    ...chordEntry,
                    text: event.target.value,
                    refused: false,
                  })
                }
                onBlur={() => {
                  // Leaving the box writes what it holds; text that names no
                  // chord is dropped, and a toast says why.
                  if (chordEntry.text.trim() && !commitChordEntry(chordEntry)) {
                    showWarning(
                      `"${chordEntry.text.trim()}": ${CHORD_INPUT_HINT}`,
                    );
                  }
                  setChordEntry(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === ' ') {
                    event.preventDefault();
                    advanceChordEntry();
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    if (
                      chordEntry.text.trim() &&
                      !commitChordEntry(chordEntry)
                    ) {
                      setChordEntry({ ...chordEntry, refused: true });
                    } else {
                      setChordEntry(null);
                    }
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setChordEntry(null);
                  }
                  event.stopPropagation();
                }}
                className="absolute rounded-sm px-0.5 outline-none"
                style={{
                  left,
                  top,
                  width: 72 * scale,
                  fontFamily: "'Glacial Indifference', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: CHORD_FONT_SIZE * scale,
                  lineHeight: 1,
                  color: 'var(--daw-text)',
                  background: 'var(--daw-popover)',
                  border: chordBoxBorder(!!chordEntry.refused),
                  zIndex: 6,
                }}
              />
              {chordEntry.refused && (
                <ChordInputHint
                  style={{ left, top: top + CHORD_FONT_SIZE * scale + 6 }}
                />
              )}
            </>
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
              // The lead sheet's own chord type: bold Glacial at 16px.
              fontFamily: "'Glacial Indifference', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: CHORD_FONT_SIZE * (layout?.scale ?? 1),
              zIndex: 5,
              color: isSelected ? 'var(--daw-accent)' : 'var(--daw-text)',
              background: isSelected
                ? 'color-mix(in srgb, var(--daw-accent) 20%, transparent)'
                : 'transparent',
            }}
          >
            {chord.text}
          </button>
        );
      })}
      {layout.barlines.map((barline) => {
        const isSelected = selected === barline.measureIndex;
        const section = sectionsByBar.get(barline.measureIndex)?.[0];
        // Signs and directives sit above the staff, clear of the rehearsal
        // letter; a jump reads at the end of its bar, so it hangs right.
        const barMarks = barline.atSystemEnd
          ? []
          : (textMarksByBar.get(barline.measureIndex) ?? []);
        const broken = systemBreaks.has(barline.measureIndex);
        const atSystemStart =
          !barline.atSystemEnd &&
          !(
            (openingBars.get(barline.system) ?? barline.measureIndex) <
            barline.measureIndex
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
              className="absolute rounded-sm transition-colors hover:bg-[color:var(--daw-accent)]/25"
              style={{
                // A system's opening barline sits right of the brace, so its
                // target leans inward rather than over the bracket.
                left: barline.x - (atSystemStart ? 2 : 7),
                top: barline.y,
                width: 14,
                height: barline.height,
                background: isSelected
                  ? 'color-mix(in srgb, var(--daw-accent) 35%, transparent)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid var(--daw-accent)'
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
                      // Renames the section starting on this barline. A name
                      // left as it was is no edit: writing it again would
                      // retype the section from its name and add an undo step.
                      if (label && label !== section.label.trim()) {
                        markSectionAtBar(section.measureIdx, label);
                      }
                      setEditingSection(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingSection(null);
                    }}
                    className="w-20 rounded-sm border px-1 text-[11px] font-bold outline-none"
                    style={{
                      background: 'var(--daw-surface-2)',
                      borderColor: 'var(--daw-accent)',
                      color: 'var(--daw-text)',
                    }}
                  />
                ) : (
                  <button
                    onDoubleClick={() => setEditingSection(section.measureIdx)}
                    onClick={() => setSelected(barline.measureIndex)}
                    title="Double-click to rename"
                    className="rounded-sm border px-1 text-[11px] font-bold"
                    style={{
                      borderColor: 'var(--daw-text)',
                      color: 'var(--daw-text)',
                      background: 'var(--daw-bg)',
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
                        background: 'var(--daw-surface-2)',
                        borderColor: 'var(--daw-accent)',
                        color: 'var(--daw-text)',
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
                        color: 'var(--daw-text)',
                        fontFamily: glyph
                          ? 'Bravura'
                          : "'Glacial Indifference', system-ui, sans-serif",
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
                  color: 'var(--daw-text-3)',
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
                background: 'var(--daw-accent)',
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
              color: 'var(--daw-text)',
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
            background: 'var(--daw-popover)',
            border: '1px solid var(--daw-hairline)',
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
                const region = chordRegions.find(
                  (r) => r.id === chordMenu.regionId,
                );
                if (chord) {
                  // Opens on the chord it renames, ready to edit.
                  const { rootNote, mode } = useStore.getState();
                  setChordEntry({
                    partIndex: chord.partIndex,
                    tick: chord.tick,
                    text: region
                      ? chordInputText(region, keyFrameOf(rootNote, mode))
                      : '',
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
                color: item.danger ? '#ef4444' : 'var(--daw-text)',
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
      // The staff paints the playhead itself, so neither this hook nor the
      // views using it re-render as it moves (milestone 1.7, score-05).
      playheadSource: studioPlayheadSource,
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
      // Like ⌘Z, never mid-take: undoing the step that made the record
      // track would leave the take nowhere to land.
      onUndo: () => {
        if (useStore.getState().isRecording) return;
        smartUndo();
        clearSelection();
      },
      onRedo: () => {
        if (useStore.getState().isRecording) return;
        smartRedo();
        clearSelection();
      },
      // The bar names the row: its click also sets `layer`, which this
      // render's applyDuration would still read as the previous row.
      onDuration: (choice: DurationChoice, into: NoteLayer) =>
        applyDuration(choice, dotted, into),
      onToggleDot: (into: NoteLayer) => {
        const next = !dotted;
        setDotted(next);
        if (currentDuration) applyDuration(currentDuration, next, into);
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
