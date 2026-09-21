import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import {
  regionToMeasures,
  PPQ,
  BEATS_PER_MEASURE,
  TICKS_PER_MEASURE,
} from '@/daw/midi/leadSheetUtils';
import { NOTES } from '@prism/engine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useMe } from '@/hooks/data/auth/useMe';
import { ScorePalettes, type PaletteAction } from '../Score/ScorePalettes';
import {
  breaksFromRowSizes,
  nextSectionLabel,
  rowSizesFromBreaks,
  withRepeatEnd,
  withRepeatStart,
  withoutRepeatAt,
} from '../Score/roadmap';
import { LeadSheetScoreView } from './LeadSheetScoreView';
import { LeadSheetStaff } from './LeadSheetStaff';
import { LeadSheetToolbar } from './LeadSheetToolbar';
import {
  buildClipboard,
  type CopySource,
  isEmptyRoadmap,
  pasteChords,
  pasteRoadmap,
  roadmapAt,
  type LeadSheetClipboard,
} from './leadSheetClipboard';
import { pickMelodyTrack } from './leadSheetMelody';
import {
  applyItemClick,
  clickKind,
  itemsOfKind,
  measuresInSelection,
  selectionKind,
  type LeadSheetItem,
  type RangeContext,
} from './leadSheetSelection';
import './leadsheet-print.css';

/** Default number of measures per system (row) */
const DEFAULT_MEASURES_PER_LINE = 4;

/**
 * The lead sheet in one of its two forms. With a melody assigned it is a
 * one-part score, written and edited with the Score's own tools; without one
 * it is the chord chart, slashes and all.
 */
export function LeadSheetView() {
  const showMelody = useStore((s) => s.leadSheetShowMelody);
  const melodyTrackId = useStore((s) => s.leadSheetMelodyTrackId);
  const tracks = useStore((s) => s.tracks);
  const melodyTrack = useMemo(
    () => (showMelody ? pickMelodyTrack(tracks, melodyTrackId) : null),
    [showMelody, tracks, melodyTrackId],
  );
  return melodyTrack ? (
    <LeadSheetScoreView track={melodyTrack} />
  ) : (
    <LeadSheetChartView />
  );
}

function LeadSheetChartView() {
  const chordRegions = useStore((s) => s.chordRegions);
  const MEASURES_PER_LINE =
    useStore((s) => s.measuresPerLine) || DEFAULT_MEASURES_PER_LINE;
  const measureRowSizes = useStore((s) => s.measureRowSizes);
  const measureRestMap = useStore((s) => s.measureRestMap);
  const measureFermatas = useStore((s) => s.measureFermatas);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  const chordFormat = useStore((s) => s.leadSheetChordFormat);
  const selectedChordIdx = useStore((s) => s.leadSheetSelectedChordIdx);
  const setSelectedChordIdx = useStore((s) => s.setLeadSheetSelectedChordIdx);
  const sections = useStore((s) => s.leadSheetSections);
  const repeats = useStore((s) => s.leadSheetRepeats);
  const showRepeats = useStore((s) => s.leadSheetShowRepeats);
  const renameChordRegion = useStore((s) => s.renameChordRegion);
  const insertChordRegion = useStore((s) => s.insertChordRegion);
  const projectName = useStore((s) => s.projectName);
  const composerName = useStore((s) => s.composerName);
  const setComposerName = useStore((s) => s.setComposerName);
  const position = useStore((s) => s.position);
  const isPlaying = useStore((s) => s.isPlaying);
  const moveChordRegion = useStore((s) => s.moveChordRegion);
  const deleteChordRegion = useStore((s) => s.deleteChordRegion);
  const markAsMelody = useStore((s) => s.markAsMelody);
  // Editing: the roadmap is shared with the Score, so marks show in both.
  const setChordRegions = useStore((s) => s.setChordRegions);
  const setMeasureRowSizes = useStore((s) => s.setMeasureRowSizes);
  const setRepeats = useStore((s) => s.setLeadSheetRepeats);
  const addSection = useStore((s) => s.addLeadSheetSection);
  const removeSection = useStore((s) => s.removeLeadSheetSection);
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);

  // Auto-populate composer from logged-in user
  const { data: meData } = useMe();
  useEffect(() => {
    if (!composerName && meData) {
      const name = meData.nickname || meData.username || meData.fullName || '';
      if (name) setComposerName(name);
    }
  }, [meData, composerName, setComposerName]);

  // Inline editing for composer
  const [isEditingComposer, setIsEditingComposer] = useState(false);
  const [composerInput, setComposerInput] = useState('');
  const composerInputRef = useRef<HTMLInputElement>(null);

  const handleComposerDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setComposerInput(composerName);
      setIsEditingComposer(true);
    },
    [composerName],
  );

  const commitComposer = useCallback(() => {
    const trimmed = composerInput.trim();
    if (trimmed) setComposerName(trimmed);
    setIsEditingComposer(false);
  }, [composerInput, setComposerName]);

  useEffect(() => {
    if (isEditingComposer && composerInputRef.current) {
      composerInputRef.current.focus();
      composerInputRef.current.select();
    }
  }, [isEditingComposer]);

  // Track which measure is "selected" for insert/delete operations
  const [selectedMeasureIdx, setSelectedMeasureIdx] = useState<number | null>(
    null,
  );

  // Measure container width for stretching systems to fill available space
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContentWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build measures from chord regions
  const rawMeasures = useMemo(
    () => regionToMeasures(chordRegions),
    [chordRegions],
  );

  // Filter out ghost measures consumed by multi-bar rests.
  // If measureRestMap says index 8 is a 2-bar rest, skip index 9 (the consumed bar).
  const measures = useMemo(() => {
    if (!measureRestMap) return rawMeasures;
    const skipSet = new Set<number>();
    for (const [idxStr, count] of Object.entries(measureRestMap)) {
      const idx = Number(idxStr);
      for (let j = 1; j < count; j++) {
        skipSet.add(idx + j);
      }
    }
    if (skipSet.size === 0) return rawMeasures;
    return rawMeasures.filter((m) => !skipSet.has(m.index));
  }, [rawMeasures, measureRestMap]);

  // Split measures into systems (rows) — uses custom row sizes if available
  const systems = useMemo(() => {
    const result: {
      startIndex: number;
      measures: typeof measures;
      rowSize: number;
    }[] = [];
    if (measureRowSizes && measureRowSizes.length > 0) {
      // Custom row sizes from chord chart export
      let i = 0;
      for (const size of measureRowSizes) {
        if (i >= measures.length) break;
        result.push({
          startIndex: i,
          measures: measures.slice(i, i + size),
          rowSize: size,
        });
        i += size;
      }
      // Any remaining measures use default
      while (i < measures.length) {
        result.push({
          startIndex: i,
          measures: measures.slice(i, i + MEASURES_PER_LINE),
          rowSize: MEASURES_PER_LINE,
        });
        i += MEASURES_PER_LINE;
      }
    } else {
      // Uniform row sizes
      for (let i = 0; i < measures.length; i += MEASURES_PER_LINE) {
        result.push({
          startIndex: i,
          measures: measures.slice(i, i + MEASURES_PER_LINE),
          rowSize: MEASURES_PER_LINE,
        });
      }
    }
    return result;
  }, [measures, measureRowSizes, MEASURES_PER_LINE]);

  // Playhead position mapped to system index
  const playheadSystemIdx = useMemo(() => {
    if (!isPlaying && position === 0) return -1;
    if (systems.length === 0) return -1;
    const measureIdx = Math.floor(position / 1920);
    // Find which system contains this measure
    for (let si = 0; si < systems.length; si++) {
      const sys = systems[si];
      if (
        measureIdx >= sys.startIndex &&
        measureIdx < sys.startIndex + sys.measures.length
      ) {
        return si;
      }
    }
    return systems.length - 1;
  }, [position, isPlaying, systems]);

  // Auto-scroll to keep playhead system visible during playback
  const prevSystemIdx = useRef(-1);
  useEffect(() => {
    if (!isPlaying || playheadSystemIdx < 0) return;
    if (playheadSystemIdx === prevSystemIdx.current) return;
    prevSystemIdx.current = playheadSystemIdx;
    const scrollEl = contentRef.current;
    if (!scrollEl) return;
    const systemEls = scrollEl.querySelectorAll('.leadsheet-system');
    const target = systemEls[playheadSystemIdx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [playheadSystemIdx, isPlaying]);

  // Key signature display
  const keyDisplay = useMemo(() => {
    if (rootNote === null) return '';
    const note = displayAccidentals(NOTES[rootNote] ?? '');
    const modeLabel =
      mode === 'ionian' ? 'Major' : mode === 'aeolian' ? 'Minor' : mode;
    return `${note} ${modeLabel}`;
  }, [rootNote, mode]);

  // ── Selection, copy and paste ───────────────────────────────────────────
  // The sheet is laid out in 4/4 throughout (`regionToMeasures` and the
  // playhead maths both assume it), so selection counts bars the same way
  // rather than half-migrating to the project's time signature.
  const measureCount = measures.length;
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const anchorRef = useRef<LeadSheetItem | null>(null);
  const [clipboard, setClipboard] = useState<LeadSheetClipboard | null>(null);
  const [autoEditRegionId, setAutoEditRegionId] = useState<string | null>(null);

  const systemBreaks = useMemo(
    () => breaksFromRowSizes(measureRowSizes, MEASURES_PER_LINE, measureCount),
    [measureRowSizes, MEASURES_PER_LINE, measureCount],
  );

  const rangeContext: RangeContext = useMemo(
    () => ({
      beatsPerMeasure: BEATS_PER_MEASURE,
      chordOrder: [...chordRegions]
        .sort((a, b) => a.startTick - b.startTick)
        .map((r) => r.id),
      noteOrder: [],
    }),
    [chordRegions],
  );

  const handleSelectItem = useCallback(
    (item: LeadSheetItem, event: React.MouseEvent) => {
      const kind = clickKind(event);
      setSelectedKeys((current) =>
        applyItemClick(current, kind, item, anchorRef.current, rangeContext),
      );
      if (kind !== 'range') anchorRef.current = item;
      setAutoEditRegionId(null);
      // Keep the older single-chord/measure state in step for the toolbar.
      setSelectedChordIdx(item.kind === 'chord' ? item.regionId : null);
      if (item.kind === 'measure' || item.kind === 'beat') {
        setSelectedMeasureIdx(item.measureIndex);
      }
    },
    [rangeContext, setSelectedChordIdx],
  );

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    anchorRef.current = null;
    setSelectedChordIdx(null);
    setAutoEditRegionId(null);
  }, [setSelectedChordIdx]);

  const handleSelectChord = useCallback(
    (regionId: string) => {
      setSelectedChordIdx(regionId);
      // Determine which measure this chord is in
      const region = chordRegions.find((r) => r.id === regionId);
      if (region) {
        setSelectedMeasureIdx(Math.floor(region.startTick / TICKS_PER_MEASURE));
      }
    },
    [setSelectedChordIdx, chordRegions],
  );

  const handleRenameChord = useCallback(
    (regionId: string, newNoteName: string) => {
      // Use the spelled name as both name and noteName for simplicity
      // The degree name would need recalculation from the root, which is complex
      renameChordRegion(regionId, newNoteName, newNoteName);
    },
    [renameChordRegion],
  );

  const handleMarkAsMelody = useCallback(
    (regionId: string) => {
      markAsMelody(regionId);
      setSelectedChordIdx(null);
    },
    [markAsMelody, setSelectedChordIdx],
  );

  const handleDeleteChord = useCallback(
    (regionId: string) => {
      deleteChordRegion(regionId);
      setSelectedChordIdx(null);
    },
    [deleteChordRegion, setSelectedChordIdx],
  );

  /**
   * Add a chord at a beat and open its edit box straight away, so it can be
   * typed over instead of being left as a literal "C". Reached by
   * double-clicking a beat, or ⌘K with a beat selected.
   */
  const insertChordAt = useCallback(
    (tick: number) => {
      setSelectedChordIdx(null);
      setSelectedMeasureIdx(Math.floor(tick / TICKS_PER_MEASURE));
      const before = new Set(
        useStore.getState().chordRegions.map((region) => region.id),
      );
      insertChordRegion(tick, 'maj', 'C');
      const added = useStore
        .getState()
        .chordRegions.find(
          (region) => !before.has(region.id) || region.startTick === tick,
        );
      setAutoEditRegionId(added?.id ?? null);
    },
    [setSelectedChordIdx, insertChordRegion],
  );

  const handleClickEmptyBeat = useCallback(
    (tick: number) => insertChordAt(tick),
    [insertChordAt],
  );

  // ── Copy and paste ──────────────────────────────────────────────────────
  // What travels depends on what is selected. A block of bars or beats takes
  // its chords, its melody and the roadmap marks on its barlines and replaces
  // the destination; a loose chord, note or barline mark is dropped in without
  // clearing anything around it.
  const tickOfChord = useCallback(
    (regionId: string) =>
      chordRegions.find((region) => region.id === regionId)?.startTick,
    [chordRegions],
  );

  const handleCopy = useCallback(() => {
    const kind = selectionKind(selectedKeys);
    if (!kind) return;

    const touched = measuresInSelection(
      selectedKeys,
      (regionId) => {
        const tick = tickOfChord(regionId);
        return tick === undefined
          ? undefined
          : Math.floor(tick / TICKS_PER_MEASURE);
      },
      () => undefined,
    );
    if (touched.length === 0) return;

    const blockIsSpan = kind === 'measure' || kind === 'beat';
    let startTick: number;
    let spanTicks: number;
    if (kind === 'beat') {
      const beats = itemsOfKind(selectedKeys, 'beat').map(
        (b) => b.measureIndex * BEATS_PER_MEASURE + b.beat,
      );
      startTick = Math.min(...beats) * PPQ;
      spanTicks = (Math.max(...beats) - Math.min(...beats) + 1) * PPQ;
    } else {
      startTick = touched[0] * TICKS_PER_MEASURE;
      spanTicks =
        (touched[touched.length - 1] - touched[0] + 1) * TICKS_PER_MEASURE;
    }
    const endTick = startTick + spanTicks;

    // Chords: the ones inside the block, or exactly the ones picked out.
    const chords = blockIsSpan
      ? chordRegions.filter(
          (region) =>
            region.startTick >= startTick && region.startTick < endTick,
        )
      : itemsOfKind(selectedKeys, 'chord')
          .map((c) => chordRegions.find((region) => region.id === c.regionId))
          .filter((region): region is NonNullable<typeof region> => !!region);

    // The chart carries chords and the roadmap; a melody is written on the
    // notated sheet, which edits it with the Score's own tools.
    const notes: CopySource['notes'] = [];

    const roadmap = (kind === 'barline' || blockIsSpan ? touched : [])
      .map((measureIndex) =>
        roadmapAt(measureIndex, sections, repeats, systemBreaks),
      )
      .filter((mark) => !isEmptyRoadmap(mark));

    // Loose picks keep their own start so offsets stay relative to them.
    const looseStart = Math.min(
      ...chords.map((c) => c.startTick),
      ...notes.map((n) => n.tick),
      Number.POSITIVE_INFINITY,
    );
    const blockStart = blockIsSpan
      ? startTick
      : Number.isFinite(looseStart)
        ? looseStart
        : startTick;

    setClipboard(
      buildClipboard({
        kind,
        startTick: blockStart,
        startMeasure: touched[0],
        spanTicks: blockIsSpan ? spanTicks : 0,
        spanMeasures: touched[touched.length - 1] - touched[0] + 1,
        replace: blockIsSpan,
        chords,
        notes,
        roadmap,
      }),
    );
  }, [
    selectedKeys,
    chordRegions,
    sections,
    repeats,
    systemBreaks,
    tickOfChord,
  ]);

  const applyRoadmapEdits = useCallback(
    (edits: ReturnType<typeof pasteRoadmap>) => {
      let nextRepeats = repeats;
      const breaks = new Set(systemBreaks);
      for (const edit of edits) {
        nextRepeats = withoutRepeatAt(nextRepeats, edit.measureIndex);
        if (edit.repeatStart) {
          nextRepeats = withRepeatStart(
            nextRepeats,
            edit.measureIndex,
            measureCount,
          );
        }
        if (edit.repeatEnd) {
          nextRepeats = withRepeatEnd(nextRepeats, edit.measureIndex);
        }
        removeSection(edit.measureIndex);
        if (edit.sectionLabel) {
          addSection({
            measureIdx: edit.measureIndex,
            label: edit.sectionLabel,
          });
        }
        if (edit.systemBreak) breaks.add(edit.measureIndex);
        else breaks.delete(edit.measureIndex);
      }
      setRepeats(nextRepeats);
      setMeasureRowSizes(rowSizesFromBreaks(breaks, measureCount));
    },
    [
      repeats,
      systemBreaks,
      measureCount,
      setRepeats,
      addSection,
      removeSection,
      setMeasureRowSizes,
    ],
  );

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const kind = selectionKind(selectedKeys);
    if (!kind) return;

    // Where the block lands: the earliest thing selected.
    let targetTick: number | null = null;
    let targetMeasure: number | null = null;
    if (kind === 'beat') {
      const beats = itemsOfKind(selectedKeys, 'beat').map(
        (b) => b.measureIndex * BEATS_PER_MEASURE + b.beat,
      );
      const first = Math.min(...beats);
      targetTick = first * PPQ;
      targetMeasure = Math.floor(first / BEATS_PER_MEASURE);
    } else if (kind === 'measure' || kind === 'barline') {
      const items = itemsOfKind(
        selectedKeys,
        kind === 'measure' ? 'measure' : 'barline',
      );
      targetMeasure = Math.min(...items.map((i) => i.measureIndex));
      targetTick = targetMeasure * TICKS_PER_MEASURE;
    } else if (kind === 'chord') {
      const ticks = itemsOfKind(selectedKeys, 'chord')
        .map((c) => tickOfChord(c.regionId))
        .filter((tick): tick is number => tick !== undefined);
      if (ticks.length === 0) return;
      targetTick = Math.min(...ticks);
      targetMeasure = Math.floor(targetTick / TICKS_PER_MEASURE);
    }
    if (targetTick === null || targetMeasure === null) return;

    if (clipboard.chords.length > 0 || clipboard.replace) {
      setChordRegions(pasteChords(chordRegions, clipboard, targetTick), true);
    }
    if (clipboard.roadmap.length > 0) {
      applyRoadmapEdits(pasteRoadmap(clipboard, targetMeasure, measureCount));
    }
  }, [
    clipboard,
    selectedKeys,
    chordRegions,
    measureCount,
    setChordRegions,
    applyRoadmapEdits,
    tickOfChord,
  ]);

  // ── Palette ─────────────────────────────────────────────────────────────
  // The Score's palette, applied to the barline opening whatever is selected.
  const targetBarline = useMemo(() => {
    const touched = measuresInSelection(
      selectedKeys,
      (regionId) => {
        const tick = tickOfChord(regionId);
        return tick === undefined
          ? undefined
          : Math.floor(tick / TICKS_PER_MEASURE);
      },
      () => undefined,
    );
    return touched.length > 0 ? touched[0] : null;
  }, [selectedKeys, tickOfChord]);

  const toggleSystemBreak = useCallback(
    (barline: number) => {
      if (barline <= 0 || barline >= measureCount) return;
      const next = new Set(systemBreaks);
      if (next.has(barline)) next.delete(barline);
      else next.add(barline);
      setMeasureRowSizes(rowSizesFromBreaks(next, measureCount));
    },
    [systemBreaks, measureCount, setMeasureRowSizes],
  );

  const applyPalette = useCallback(
    (action: PaletteAction) => {
      const barline = targetBarline;
      if (barline === null) return;
      switch (action) {
        case 'barline.normal':
          setRepeats(withoutRepeatAt(repeats, barline));
          break;
        case 'repeat.start':
          setRepeats(withRepeatStart(repeats, barline, measureCount));
          break;
        case 'repeat.end':
          setRepeats(withRepeatEnd(repeats, barline));
          break;
        case 'layout.systemBreak':
          toggleSystemBreak(barline);
          break;
        case 'text.rehearsalMark': {
          const existing = sections.find((s) => s.measureIdx === barline);
          if (existing) removeSection(barline);
          else
            addSection({
              measureIdx: barline,
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
      setMeasureRowSizes,
    ],
  );

  // ── Keys ────────────────────────────────────────────────────────────────
  // ⌘C / ⌘V always copy and paste, whatever is selected. ⌘K adds a chord
  // symbol at the selection, as it does in MuseScore. Delete clears what is
  // selected; Escape drops the selection; Return breaks the system.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'c') {
          e.preventDefault();
          handleCopy();
        } else if (e.key === 'v') {
          e.preventDefault();
          handlePaste();
        } else if (e.key === 'm') {
          e.preventDefault();
          applyPalette('text.rehearsalMark');
        } else if (e.key === 'k') {
          e.preventDefault();
          const beats = itemsOfKind(selectedKeys, 'beat');
          const measuresPicked = itemsOfKind(selectedKeys, 'measure');
          if (beats.length > 0) {
            const first = beats.sort(
              (a, b) => a.measureIndex - b.measureIndex || a.beat - b.beat,
            )[0];
            insertChordAt(
              first.measureIndex * TICKS_PER_MEASURE + first.beat * PPQ,
            );
          } else if (measuresPicked.length > 0) {
            const first = Math.min(
              ...measuresPicked.map((m) => m.measureIndex),
            );
            insertChordAt(first * TICKS_PER_MEASURE);
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      const kindNow = selectionKind(selectedKeys);
      if (
        e.key === 'Enter' &&
        targetBarline !== null &&
        (kindNow === 'measure' || kindNow === 'beat' || kindNow === 'barline')
      ) {
        e.preventDefault();
        toggleSystemBreak(targetBarline);
        return;
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      e.preventDefault();

      const kind = selectionKind(selectedKeys);
      if (kind === 'chord') {
        for (const chord of itemsOfKind(selectedKeys, 'chord')) {
          useStore.getState().deleteChordRegion(chord.regionId);
        }
        clearSelection();
      } else if (kind === 'measure' || kind === 'beat') {
        // Clearing a span empties it rather than closing the gap.
        const empty: LeadSheetClipboard = {
          kind,
          spanTicks: 0,
          spanMeasures: 0,
          replace: true,
          chords: [],
          notes: [],
          roadmap: [],
        };
        const beats =
          kind === 'beat'
            ? itemsOfKind(selectedKeys, 'beat').map(
                (b) => b.measureIndex * BEATS_PER_MEASURE + b.beat,
              )
            : itemsOfKind(selectedKeys, 'measure').flatMap((m) =>
                Array.from(
                  { length: BEATS_PER_MEASURE },
                  (_, i) => m.measureIndex * BEATS_PER_MEASURE + i,
                ),
              );
        if (beats.length === 0) return;
        const from = Math.min(...beats) * PPQ;
        const span = (Math.max(...beats) - Math.min(...beats) + 1) * PPQ;
        setChordRegions(
          pasteChords(chordRegions, { ...empty, spanTicks: span }, from),
          true,
        );
      } else if (kind === 'barline' && targetBarline !== null) {
        setRepeats(withoutRepeatAt(repeats, targetBarline));
        removeSection(targetBarline);
      } else if (selectedChordIdx !== null) {
        useStore.getState().deleteChordRegion(selectedChordIdx);
        setSelectedChordIdx(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    selectedKeys,
    selectedChordIdx,
    chordRegions,
    repeats,
    targetBarline,
    handleCopy,
    handlePaste,
    insertChordAt,
    clearSelection,
    toggleSystemBreak,
    applyPalette,
    setChordRegions,
    setRepeats,
    removeSection,
    updateMidiClipEvents,
    setSelectedChordIdx,
  ]);

  // Click background to deselect
  const handleBackgroundClick = useCallback(() => {
    if (!chordDragRef.current) clearSelection();
  }, [clearSelection]);

  // ── Chord drag state ──────────────────────────────────────────────────
  const chordDragRef = useRef<{
    regionId: string;
    startClientX: number;
    originTick: number;
    measureWidth: number;
  } | null>(null);
  const [dragVisual, setDragVisual] = useState<{
    regionId: string;
    snappedTick: number;
    measureIdx: number;
    localX: number;
    targetBeat: number;
  } | null>(null);

  const handleChordDragStart = useCallback(
    (
      regionId: string,
      clientX: number,
      measureStartTick: number,
      measureWidth: number,
    ) => {
      const region = chordRegions.find((r) => r.id === regionId);
      if (!region) return;
      chordDragRef.current = {
        regionId,
        startClientX: clientX,
        originTick: region.startTick,
        measureWidth,
      };
      // Show initial tether at current position (centered on slash)
      const mIdx = Math.floor(region.startTick / 1920);
      const localTick = region.startTick % 1920;
      const beat = localTick / PPQ;
      const lx = (beat + 0.5) * (measureWidth / 4);
      setDragVisual({
        regionId,
        snappedTick: region.startTick,
        measureIdx: mIdx,
        localX: lx,
        targetBeat: beat,
      });
    },
    [chordRegions],
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = chordDragRef.current;
      if (!drag) return;
      const deltaPx = e.clientX - drag.startClientX;
      const deltaTicks = (deltaPx / drag.measureWidth) * 4 * PPQ;
      const rawTick = drag.originTick + deltaTicks;
      const snapped = Math.max(0, Math.round(rawTick / PPQ) * PPQ);
      const mIdx = Math.floor(snapped / 1920);
      const localTick = snapped % 1920;
      const beat = localTick / PPQ;
      const lx = (beat + 0.5) * (drag.measureWidth / 4);
      setDragVisual({
        regionId: drag.regionId,
        snappedTick: snapped,
        measureIdx: mIdx,
        localX: lx,
        targetBeat: beat,
      });
    };

    const handlePointerUp = () => {
      const drag = chordDragRef.current;
      if (!drag) return;
      const visual = dragVisual;
      chordDragRef.current = null;
      setDragVisual(null);
      if (visual && visual.snappedTick !== drag.originTick) {
        moveChordRegion(drag.regionId, visual.snappedTick);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragVisual, moveChordRegion]);

  // Convert dragVisual to the ChordDragState format for LeadSheetMeasure
  const chordDragState = dragVisual
    ? {
        regionId: dragVisual.regionId,
        currentX: dragVisual.localX,
        targetBeat: dragVisual.targetBeat,
      }
    : null;

  return (
    <div
      className="leadsheet-container flex flex-1 overflow-hidden"
      data-leadsheet-selection={`${selectedKeys.size} ${selectionKind(selectedKeys) ?? 'none'}`}
    >
      {/* The palette sizes itself from this wrapper, exactly as the Score's
          sidebar does — it has no width of its own. */}
      <div
        className="leadsheet-palette flex w-[216px] shrink-0 flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <ScorePalettes
          hasSelection={targetBarline !== null}
          onApply={applyPalette}
        />
      </div>
      <div
        className="flex flex-1 flex-col overflow-hidden"
        onClick={handleBackgroundClick}
      >
        <LeadSheetToolbar selectedMeasureIdx={selectedMeasureIdx} />

        <div
          ref={contentRef}
          className="leadsheet-scroll flex-1 overflow-y-auto"
          style={{ padding: '32px 48px' }}
        >
          {/* Title */}
          <h1
            className="leadsheet-title mb-1 text-center text-xl font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            {projectName}
          </h1>

          {/* Composer */}
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
              onDoubleClick={handleComposerDoubleClick}
              title="Double-click to edit composer"
            >
              {composerName
                ? `by ${composerName}`
                : 'Double-click to add composer'}
            </div>
          )}

          {/* Subtitle: key, tempo */}
          <div
            className="leadsheet-subtitle mb-6 flex justify-center gap-4 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {keyDisplay && <span>Key: {keyDisplay}</span>}
            <span>Tempo: {bpm} BPM</span>
            <span>Time: 4/4</span>
          </div>

          {/* Staff systems */}
          {systems.map((system, sysIdx) => {
            // Compute playhead x for this system
            let playheadX: number | undefined;
            if (sysIdx === playheadSystemIdx) {
              const measureIdx = Math.floor(position / 1920);
              const measureInSystem = measureIdx - system.startIndex;
              const ticksInMeasure = position % 1920;
              const rowSize = system.rowSize;
              const isFull = system.measures.length === rowSize;
              const defaultW = system.measures.length * 200;
              const svgW =
                isFull && contentWidth && contentWidth > defaultW
                  ? contentWidth
                  : defaultW;
              const mw = svgW / system.measures.length;
              playheadX = measureInSystem * mw + (ticksInMeasure / 1920) * mw;
            }
            return (
              <div key={system.startIndex} className="leadsheet-system mb-6">
                <LeadSheetStaff
                  measures={system.measures}
                  startIndex={system.startIndex}
                  fullSystemCount={system.rowSize}
                  chordFormat={chordFormat}
                  selectedChordId={selectedChordIdx}
                  sections={sections}
                  repeats={repeats}
                  showRepeats={showRepeats}
                  availableWidth={contentWidth || undefined}
                  playheadX={playheadX}
                  chordDrag={chordDragState}
                  chordDragMeasureIdx={dragVisual?.measureIdx}
                  onSelectChord={handleSelectChord}
                  onRenameChord={handleRenameChord}
                  onClickEmptyBeat={handleClickEmptyBeat}
                  onChordDragStart={handleChordDragStart}
                  onMarkAsMelody={handleMarkAsMelody}
                  onDeleteChord={handleDeleteChord}
                  measureRestMap={measureRestMap}
                  measureFermatas={measureFermatas}
                  selectedKeys={selectedKeys}
                  onSelectItem={handleSelectItem}
                  onInsertChordAt={insertChordAt}
                  beatsPerMeasure={BEATS_PER_MEASURE}
                  autoEditRegionId={autoEditRegionId}
                />
              </div>
            );
          })}

          {/* Empty state */}
          {chordRegions.length === 0 && (
            <div
              className="mt-8 text-center text-sm"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No chords recorded yet. Switch to Create view and record some
              chords, or double-click a beat on the staff to add one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
