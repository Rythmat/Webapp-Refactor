import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { regionToMeasures, PPQ } from '@/daw/midi/leadSheetUtils';
import { NOTES } from '@prism/engine';
import { useMe } from '@/hooks/data/auth/useMe';
import { LeadSheetStaff } from './LeadSheetStaff';
import { LeadSheetToolbar } from './LeadSheetToolbar';
import './leadsheet-print.css';

/** Default number of measures per system (row) */
const DEFAULT_MEASURES_PER_LINE = 4;

export function LeadSheetView() {
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
    const note = NOTES[rootNote] ?? '';
    const modeLabel =
      mode === 'ionian' ? 'Major' : mode === 'aeolian' ? 'Minor' : mode;
    return `${note} ${modeLabel}`;
  }, [rootNote, mode]);

  const handleSelectChord = useCallback(
    (regionId: string) => {
      setSelectedChordIdx(regionId);
      // Determine which measure this chord is in
      const region = chordRegions.find((r) => r.id === regionId);
      if (region) {
        setSelectedMeasureIdx(Math.floor(region.startTick / 1920));
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

  const handleClickEmptyBeat = useCallback(
    (tick: number) => {
      // Deselect any chord
      setSelectedChordIdx(null);
      // Set the measure as selected
      setSelectedMeasureIdx(Math.floor(tick / 1920));
      // Insert a new chord at this beat
      insertChordRegion(tick, 'maj', 'C maj');
    },
    [setSelectedChordIdx, insertChordRegion],
  );

  // Handle Delete key to remove selected chord
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        selectedChordIdx !== null &&
        (e.key === 'Delete' || e.key === 'Backspace')
      ) {
        // Don't delete if an input is focused
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
        )
          return;
        e.preventDefault();
        useStore.getState().deleteChordRegion(selectedChordIdx);
        setSelectedChordIdx(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedChordIdx, setSelectedChordIdx]);

  // Click background to deselect
  const handleBackgroundClick = useCallback(() => {
    if (!chordDragRef.current) setSelectedChordIdx(null);
  }, [setSelectedChordIdx]);

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
      className="leadsheet-container flex flex-1 flex-col overflow-hidden"
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
                borderColor: 'var(--color-accent, #8b5cf6)',
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
            chords, or click on the staff to add chords manually.
          </div>
        )}
      </div>
    </div>
  );
}
