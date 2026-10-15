import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { LEAD_SHEET_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { useStore } from '@/daw/store';
import { laneWithChordAt } from '@/daw/store/prismSlice';
import type { TypedChord } from '@/daw/harmony/chordInput';
import { usePlayheadSelector } from '@/daw/engine/playheadClock';
import { regionToMeasures } from '@/daw/midi/leadSheetUtils';
import { ticksPerBar, ticksPerBeatUnit } from '@/daw/utils/timelineScale';
import { barSlots, slotOfBar } from '@/daw/time/timeModel';
import { NOTES } from '@prism/engine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { ScorePalettes, type PaletteAction } from '../Score/ScorePalettes';
import {
  breaksFromRowSizes,
  nextSectionLabel,
  rowSizesFromBreaks,
  withRepeatEnd,
  withRepeatStart,
  withoutRepeatAt,
} from '../Score/roadmap';
import { ComposerLine } from './ComposerLine';
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
import { useLeadSheetPrint } from './useLeadSheetPrint';

/** The chord being typed on a beat: drawn with its box open, not yet stored. */
const PENDING_CHORD = { id: 'pending-chord', name: '', noteName: '' } as const;

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
  useLeadSheetPrint();
  const chordRegions = useStore((s) => s.chordRegions);
  const MEASURES_PER_LINE =
    useStore((s) => s.measuresPerLine) || DEFAULT_MEASURES_PER_LINE;
  const measureRowSizes = useStore((s) => s.measureRowSizes);
  const measureRestMap = useStore((s) => s.measureRestMap);
  const measureFermatas = useStore((s) => s.measureFermatas);
  const leadSheetBars = useStore((s) => s.leadSheetBars);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const bpm = useStore((s) => s.bpm);
  // The chart is drawn in the project's metre, not in 4/4. A beat is the
  // metre's own beat — an eighth in 6/8 — so neither the bar nor the beat can
  // be a constant: a 3/4 song laid out in 1920-tick bars puts its second bar a
  // beat into its first, and every bar after that drifts further.
  const beatsPerMeasure = useStore((s) => s.timeSignatureNumerator);
  const beatUnit = useStore((s) => s.timeSignatureDenominator);
  const ticksPerBeat = ticksPerBeatUnit(beatUnit);
  const ticksPerMeasure = ticksPerBar(beatsPerMeasure, beatUnit);
  const chordFormat = useStore((s) => s.leadSheetChordFormat);
  const selectedChordIdx = useStore((s) => s.leadSheetSelectedChordIdx);
  const setSelectedChordIdx = useStore((s) => s.setLeadSheetSelectedChordIdx);
  const sections = useStore((s) => s.leadSheetSections);
  const repeats = useStore((s) => s.leadSheetRepeats);
  const showRepeats = useStore((s) => s.leadSheetShowRepeats);
  const renameChordRegion = useStore((s) => s.renameChordRegion);
  const insertChordRegion = useStore((s) => s.insertChordRegion);
  const projectName = useStore((s) => s.projectName);
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

  // A chord being typed on a beat that had none: drawn as an empty chord
  // with its edit box open, and written only once it names a chord. The old
  // placeholder stored a C there first, which a cancelled box left behind
  // (leadsheet-17).
  const [pendingChordTick, setPendingChordTick] = useState<number | null>(null);
  const shownRegions = useMemo(
    () =>
      pendingChordTick === null
        ? chordRegions
        : laneWithChordAt(
            chordRegions,
            pendingChordTick,
            { numerator: beatsPerMeasure, denominator: beatUnit },
            (existing) => ({ ...existing, ...PENDING_CHORD }),
            (startTick, endTick) => ({
              ...PENDING_CHORD,
              startTick,
              endTick,
              color: [128, 128, 128],
            }),
          ),
    [chordRegions, pendingChordTick, beatsPerMeasure, beatUnit],
  );

  // Build measures from chord regions: every real bar of the song
  const rawMeasures = useMemo(
    () => regionToMeasures(shownRegions, ticksPerMeasure, leadSheetBars),
    [shownRegions, ticksPerMeasure, leadSheetBars],
  );

  // What the chart draws: a slot per bar, a multi-bar rest one slot for its
  // bars (barSlots). Each measure keeps its real bar as `index`, and that is
  // the bar every mark, selection and tick uses; a slot's position is layout
  // only. Mixing the two drew every label after a rest late (leadsheet-05).
  const slots = useMemo(
    () => barSlots(rawMeasures.length, measureRestMap),
    [rawMeasures.length, measureRestMap],
  );
  const measures = useMemo(
    () => slots.map((slot) => rawMeasures[slot.realIndex]),
    [slots, rawMeasures],
  );

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

  // The system the playhead is in. Read from the playhead clock, so the
  // sheet renders when the playhead moves to another system, not on every
  // frame (leadsheet-12); the line itself is painted by LeadSheetStaff.
  const playheadSystemIdx = usePlayheadSelector((position) => {
    if (!isPlaying && position === 0) return -1;
    if (systems.length === 0) return -1;
    // The real bar under the playhead, then the slot drawing it.
    const slot = slotOfBar(slots, Math.floor(position / ticksPerMeasure));
    if (slot < 0) return systems.length - 1;
    for (let si = 0; si < systems.length; si++) {
      const sys = systems[si];
      if (slot >= sys.startIndex && slot < sys.startIndex + sys.measures.length)
        return si;
    }
    return systems.length - 1;
  });

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
  // Bars and beats here are the project's, the same ones `regionToMeasures`
  // cut the sheet into and the playhead maths below read: real bars, so a
  // bar's index times the bar length is its tick, rests or not.
  const measureCount = rawMeasures.length;
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const anchorRef = useRef<LeadSheetItem | null>(null);
  const [clipboard, setClipboard] = useState<LeadSheetClipboard | null>(null);
  const [autoEditRegionId, setAutoEditRegionId] = useState<string | null>(null);

  // The row sizes count chart slots (a rest is one), as the chart export
  // writes them; the roadmap's system breaks are barlines of real bars.
  const systemBreaks = useMemo(() => {
    const atSlots = breaksFromRowSizes(
      measureRowSizes,
      MEASURES_PER_LINE,
      measures.length,
    );
    return new Set([...atSlots].map((pos) => measures[pos].index));
  }, [measureRowSizes, MEASURES_PER_LINE, measures]);
  /** Row sizes (in slots) for system breaks at real barlines. */
  const rowSizesFor = useCallback(
    (breaks: ReadonlySet<number>) =>
      rowSizesFromBreaks(
        new Set([...breaks].map((bar) => slotOfBar(slots, bar))),
        measures.length,
      ),
    [slots, measures.length],
  );

  const rangeContext: RangeContext = useMemo(
    () => ({
      beatsPerMeasure: beatsPerMeasure,
      chordOrder: [...chordRegions]
        .sort((a, b) => a.startTick - b.startTick)
        .map((r) => r.id),
      noteOrder: [],
    }),
    [chordRegions, beatsPerMeasure],
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
        setSelectedMeasureIdx(Math.floor(region.startTick / ticksPerMeasure));
      }
    },
    [setSelectedChordIdx, chordRegions, ticksPerMeasure],
  );

  /**
   * Write a typed chord, as the lane stores chords: over the region it was
   * typed on, or, for the pending chord, on its beat.
   */
  const handleRenameChord = useCallback(
    (regionId: string, chord: TypedChord) => {
      const { name, noteName, color, degreeKey, identity } = chord;
      if (regionId === PENDING_CHORD.id) {
        if (pendingChordTick !== null) {
          insertChordRegion(pendingChordTick, name, noteName, color, {
            degreeKey,
            identity,
          });
        }
        setPendingChordTick(null);
        setAutoEditRegionId(null);
        return;
      }
      renameChordRegion(regionId, name, noteName, {
        color,
        degreeKey,
        identity,
      });
    },
    [renameChordRegion, insertChordRegion, pendingChordTick],
  );

  /** An edit box closed without a chord: a pending chord goes. */
  const handleCancelChordEdit = useCallback((regionId: string) => {
    if (regionId !== PENDING_CHORD.id) return;
    setPendingChordTick(null);
    setAutoEditRegionId(null);
  }, []);

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
   * Open an edit box for a new chord on a beat. Nothing is written until
   * what is typed names a chord; Escape or an empty box leaves the beat as
   * it was. Reached by double-clicking a beat, or ⌘K with a beat selected.
   */
  const insertChordAt = useCallback(
    (tick: number) => {
      setSelectedChordIdx(null);
      setSelectedMeasureIdx(Math.floor(tick / ticksPerMeasure));
      setPendingChordTick(tick);
      setAutoEditRegionId(PENDING_CHORD.id);
    },
    [setSelectedChordIdx, ticksPerMeasure],
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
          : Math.floor(tick / ticksPerMeasure);
      },
      () => undefined,
    );
    if (touched.length === 0) return;

    const blockIsSpan = kind === 'measure' || kind === 'beat';
    let startTick: number;
    let spanTicks: number;
    if (kind === 'beat') {
      const beats = itemsOfKind(selectedKeys, 'beat').map(
        (b) => b.measureIndex * beatsPerMeasure + b.beat,
      );
      startTick = Math.min(...beats) * ticksPerBeat;
      spanTicks = (Math.max(...beats) - Math.min(...beats) + 1) * ticksPerBeat;
    } else {
      startTick = touched[0] * ticksPerMeasure;
      spanTicks =
        (touched[touched.length - 1] - touched[0] + 1) * ticksPerMeasure;
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
    beatsPerMeasure,
    ticksPerBeat,
    ticksPerMeasure,
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
      setMeasureRowSizes(rowSizesFor(breaks));
    },
    [
      repeats,
      systemBreaks,
      measureCount,
      rowSizesFor,
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
        (b) => b.measureIndex * beatsPerMeasure + b.beat,
      );
      const first = Math.min(...beats);
      targetTick = first * ticksPerBeat;
      targetMeasure = Math.floor(first / beatsPerMeasure);
    } else if (kind === 'measure' || kind === 'barline') {
      const items = itemsOfKind(
        selectedKeys,
        kind === 'measure' ? 'measure' : 'barline',
      );
      targetMeasure = Math.min(...items.map((i) => i.measureIndex));
      targetTick = targetMeasure * ticksPerMeasure;
    } else if (kind === 'chord') {
      const ticks = itemsOfKind(selectedKeys, 'chord')
        .map((c) => tickOfChord(c.regionId))
        .filter((tick): tick is number => tick !== undefined);
      if (ticks.length === 0) return;
      targetTick = Math.min(...ticks);
      targetMeasure = Math.floor(targetTick / ticksPerMeasure);
    }
    if (targetTick === null || targetMeasure === null) return;

    if (clipboard.chords.length > 0 || clipboard.replace) {
      setChordRegions(
        pasteChords(chordRegions, clipboard, targetTick, {
          numerator: beatsPerMeasure,
          denominator: beatUnit,
        }),
        true,
      );
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
    beatsPerMeasure,
    ticksPerBeat,
    ticksPerMeasure,
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
          : Math.floor(tick / ticksPerMeasure);
      },
      () => undefined,
    );
    return touched.length > 0 ? touched[0] : null;
  }, [selectedKeys, tickOfChord, ticksPerMeasure]);

  const toggleSystemBreak = useCallback(
    (barline: number) => {
      if (barline <= 0 || barline >= measureCount) return;
      const next = new Set(systemBreaks);
      if (next.has(barline)) next.delete(barline);
      else next.add(barline);
      setMeasureRowSizes(rowSizesFor(next));
    },
    [systemBreaks, measureCount, rowSizesFor, setMeasureRowSizes],
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

  // ── Keys (the leadsheet scope) ──────────────────────────────────────────
  // ⌘C / ⌘V always copy and paste, whatever is selected. ⌘K adds a chord
  // symbol at the selection, as it does in MuseScore. Delete clears what is
  // selected; Escape drops the selection; Return breaks the system. Delete
  // and Escape are always the chart's here, so neither ever reaches a clip
  // in Create or stops the music.
  useKeymap(LEAD_SHEET_SCOPE.id, {
    'leadsheet.copy': () => handleCopy(),
    'leadsheet.paste': () => handlePaste(),
    'leadsheet.rehearsalMark': () => applyPalette('text.rehearsalMark'),
    'leadsheet.chord': () => {
      const beats = itemsOfKind(selectedKeys, 'beat');
      const measuresPicked = itemsOfKind(selectedKeys, 'measure');
      if (beats.length > 0) {
        const first = beats.sort(
          (a, b) => a.measureIndex - b.measureIndex || a.beat - b.beat,
        )[0];
        insertChordAt(
          first.measureIndex * ticksPerMeasure + first.beat * ticksPerBeat,
        );
      } else if (measuresPicked.length > 0) {
        const first = Math.min(...measuresPicked.map((m) => m.measureIndex));
        insertChordAt(first * ticksPerMeasure);
      }
    },
    'leadsheet.escape': () => clearSelection(),
    'leadsheet.systemBreak': () => {
      const kind = selectionKind(selectedKeys);
      if (
        targetBarline === null ||
        (kind !== 'measure' && kind !== 'beat' && kind !== 'barline')
      ) {
        return false;
      }
      toggleSystemBreak(targetBarline);
    },
    'leadsheet.delete': () => {
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
                (b) => b.measureIndex * beatsPerMeasure + b.beat,
              )
            : itemsOfKind(selectedKeys, 'measure').flatMap((m) =>
                Array.from(
                  { length: beatsPerMeasure },
                  (_, i) => m.measureIndex * beatsPerMeasure + i,
                ),
              );
        if (beats.length === 0) return;
        const from = Math.min(...beats) * ticksPerBeat;
        const span =
          (Math.max(...beats) - Math.min(...beats) + 1) * ticksPerBeat;
        setChordRegions(
          pasteChords(chordRegions, { ...empty, spanTicks: span }, from, {
            numerator: beatsPerMeasure,
            denominator: beatUnit,
          }),
          true,
        );
      } else if (kind === 'barline' && targetBarline !== null) {
        setRepeats(withoutRepeatAt(repeats, targetBarline));
        removeSection(targetBarline);
      } else if (selectedChordIdx !== null) {
        useStore.getState().deleteChordRegion(selectedChordIdx);
        setSelectedChordIdx(null);
      }
    },
  });

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
      const mIdx = Math.floor(region.startTick / ticksPerMeasure);
      const localTick = region.startTick % ticksPerMeasure;
      const beat = localTick / ticksPerBeat;
      const lx = (beat + 0.5) * (measureWidth / beatsPerMeasure);
      setDragVisual({
        regionId,
        snappedTick: region.startTick,
        measureIdx: mIdx,
        localX: lx,
        targetBeat: beat,
      });
    },
    [chordRegions, ticksPerMeasure, ticksPerBeat, beatsPerMeasure],
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = chordDragRef.current;
      if (!drag) return;
      const deltaPx = e.clientX - drag.startClientX;
      const deltaTicks = (deltaPx / drag.measureWidth) * ticksPerMeasure;
      const rawTick = drag.originTick + deltaTicks;
      const snapped = Math.max(
        0,
        Math.round(rawTick / ticksPerBeat) * ticksPerBeat,
      );
      const mIdx = Math.floor(snapped / ticksPerMeasure);
      const localTick = snapped % ticksPerMeasure;
      const beat = localTick / ticksPerBeat;
      const lx = (beat + 0.5) * (drag.measureWidth / beatsPerMeasure);
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
  }, [
    dragVisual,
    moveChordRegion,
    ticksPerMeasure,
    ticksPerBeat,
    beatsPerMeasure,
  ]);

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
        style={{ borderRight: '1px solid var(--daw-hairline)' }}
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
            style={{ color: 'var(--daw-text)' }}
          >
            {projectName}
          </h1>

          {/* Composer */}
          <ComposerLine />

          {/* Subtitle: key, tempo */}
          <div
            className="leadsheet-subtitle mb-6 flex justify-center gap-4 text-xs"
            style={{ color: 'var(--daw-text-3)' }}
          >
            {keyDisplay && <span>Key: {keyDisplay}</span>}
            <span>Tempo: {bpm} BPM</span>
            <span>
              Time: {beatsPerMeasure}/{beatUnit}
            </span>
          </div>

          {/* Staff systems */}
          {systems.map((system, sysIdx) => {
            return (
              <div key={system.startIndex} className="leadsheet-system mb-6">
                <LeadSheetStaff
                  measures={system.measures}
                  fullSystemCount={system.rowSize}
                  chordFormat={chordFormat}
                  selectedChordId={selectedChordIdx}
                  sections={sections}
                  repeats={repeats}
                  showRepeats={showRepeats}
                  availableWidth={contentWidth || undefined}
                  playheadTicksPerMeasure={
                    sysIdx === playheadSystemIdx ? ticksPerMeasure : undefined
                  }
                  chordDrag={chordDragState}
                  chordDragMeasureIdx={dragVisual?.measureIdx}
                  onSelectChord={handleSelectChord}
                  onRenameChord={handleRenameChord}
                  onCancelChordEdit={handleCancelChordEdit}
                  onClickEmptyBeat={handleClickEmptyBeat}
                  onChordDragStart={handleChordDragStart}
                  onMarkAsMelody={handleMarkAsMelody}
                  onDeleteChord={handleDeleteChord}
                  measureRestMap={measureRestMap}
                  measureFermatas={measureFermatas}
                  selectedKeys={selectedKeys}
                  onSelectItem={handleSelectItem}
                  onInsertChordAt={insertChordAt}
                  beatsPerMeasure={beatsPerMeasure}
                  ticksPerBeat={ticksPerBeat}
                  autoEditRegionId={autoEditRegionId}
                  measureCount={measureCount}
                />
              </div>
            );
          })}

          {/* Empty state */}
          {chordRegions.length === 0 && (
            <div
              className="mt-8 text-center text-sm"
              style={{ color: 'var(--daw-text-3)' }}
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
