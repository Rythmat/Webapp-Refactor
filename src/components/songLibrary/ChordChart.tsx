/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useMemo, useRef, useState, type FC } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import type {
  Song,
  SongSection,
  ChordBar,
  ChordHit,
} from '@/curriculum/types/songLibrary';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import { useUISound } from '@/hooks/useUISound';
import {
  ChordDiagramCard,
  chordRgbFor,
  type ChordRgb,
} from './ChordDiagramCard';

/* ── Types ───────────────────────────────────────────────────────────── */
type DisplayMode = 'hybrid' | 'chordName';

/** Address of one chord within a song, used by the back-office editor. */
export interface ChordChartLoc {
  sectionIdx: number;
  barIdx: number;
  chordIdx: number;
}

/**
 * Back-office editing hooks. When `editable` is provided the chart becomes a
 * direct-manipulation surface: click an empty beat to add a chord, drag a chord
 * to another beat, +/- above each bar, and inline section controls. Entirely
 * absent for students, so their chart is unchanged.
 */
export interface ChordChartEditable {
  onAddChordAtBeat: (sectionIdx: number, barIdx: number, beat: number) => void;
  onMoveChord: (loc: ChordChartLoc, toBeat: number) => void;
  onInsertBar: (sectionIdx: number, atIdx: number) => void;
  onRemoveBar: (sectionIdx: number, barIdx: number) => void;
  onRenameSection: (sectionIdx: number, label: string) => void;
  onSetRepeat: (sectionIdx: number, repeatCount: number) => void;
  onRemoveSection: (sectionIdx: number) => void;
  onMoveSection: (sectionIdx: number, dir: -1 | 1) => void;
  onAddSection: () => void;
  sectionCount: number;
}

interface ChordChartProps {
  song: Song;
  loopSection?: number | null;
  onToggleLoop?: (sectionIdx: number) => void;
  /**
   * Editor hook (back office only). When set, clicking a chord selects it
   * (calling this) instead of opening the read-only diagram popup, and the
   * chord at `selection` is highlighted. Unset in the student-facing chart, so
   * that path is unchanged.
   */
  onSelectChord?: (loc: ChordChartLoc) => void;
  selection?: ChordChartLoc | null;
  editable?: ChordChartEditable;
}

/* ── Staff layout constants (matching LeadSheetMeasure) ──────────────── */
/** Exported: the admin chart editor lays its measures out on the same grid. */
export const MEASURE_WIDTH = 240;
export const STAFF_HEIGHT = 40;
export const CHORD_AREA_HEIGHT = 45;
export const LINE_SPACING = STAFF_HEIGHT / 4;
export const TOTAL_HEIGHT = CHORD_AREA_HEIGHT + STAFF_HEIGHT + 16;
export const MEASURES_PER_ROW = 4;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatChord(hit: ChordHit, mode: DisplayMode): string {
  return mode === 'hybrid' ? hit.degree : hit.chordName;
}

function chordAriaLabel(hit: ChordHit): string {
  return `${hit.degree} chord, beat ${hit.beat}, ${hit.duration} beat${hit.duration !== 1 ? 's' : ''}`;
}

/* ── SVG Staff Measure ───────────────────────────────────────────────── */
/**
 * One measure of the lead sheet. Exported so the content back office renders
 * bars with the identical notation instead of an approximation of it.
 */
export const StaffMeasure: FC<{
  bar: ChordBar;
  barIndex: number;
  x: number;
  width: number;
  displayMode: DisplayMode;
  isFirst: boolean;
  hasRepeatStart?: boolean;
  hasRepeatEnd?: boolean;
  onChordClick?: (hit: ChordHit) => void;
  sectionIdx: number;
  onSelectChord?: (loc: ChordChartLoc) => void;
  selection?: ChordChartLoc | null;
  editable?: ChordChartEditable;
}> = ({
  bar,
  barIndex,
  x,
  width,
  displayMode,
  isFirst,
  hasRepeatStart,
  hasRepeatEnd,
  onChordClick,
  sectionIdx,
  onSelectChord,
  selection,
  editable,
}) => {
  const staffTop = CHORD_AREA_HEIGHT;
  const beatsPerBar = 4;
  const cellW = width / beatsPerBar;

  const isMultiBarRest = bar.restBars != null && bar.restBars > 0;

  // Which beat (1–4) a pointer is over, from its client x within this bar.
  const drag = useRef<{
    chordIdx: number;
    startX: number;
    moved: boolean;
  } | null>(null);
  const beatFromEvent = (e: React.PointerEvent): number => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return 1;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 1;
    const local = pt.matrixTransform(ctm.inverse()).x - x;
    return Math.max(1, Math.min(beatsPerBar, Math.floor(local / cellW) + 1));
  };

  const occupied = new Set(bar.chords.map((h) => Math.floor(h.beat)));

  return (
    <g transform={`translate(${x}, 0)`}>
      {/* Measure number */}
      <text x={2} y={10} fill="currentColor" fontSize={10} opacity={0.35}>
        {barIndex + 1}
      </text>

      {/* Click-an-empty-beat-to-add targets (editor only) */}
      {editable &&
        !isMultiBarRest &&
        Array.from({ length: beatsPerBar }, (_, c) =>
          occupied.has(c + 1) ? null : (
            <rect
              key={`add-${c}`}
              x={c * cellW}
              y={16}
              width={cellW}
              height={staffTop - 16}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() =>
                editable.onAddChordAtBeat(sectionIdx, barIndex, c + 1)
              }
            >
              <title>Add chord on beat {c + 1}</title>
            </rect>
          ),
        )}

      {/* Chord names above staff (skip for multi-bar rests) */}
      {!isMultiBarRest &&
        bar.chords.map((hit, i) => {
          const beatPos = hit.beat - 1;
          const cx = (beatPos / beatsPerBar) * width + 4;
          const label = formatChord(hit, displayMode);
          const loc = { sectionIdx, barIdx: barIndex, chordIdx: i };
          const isSelected =
            selection != null &&
            selection.sectionIdx === sectionIdx &&
            selection.barIdx === barIndex &&
            selection.chordIdx === i;
          const pointerProps = editable
            ? {
                onPointerDown: (e: React.PointerEvent) => {
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                  drag.current = {
                    chordIdx: i,
                    startX: e.clientX,
                    moved: false,
                  };
                },
                onPointerMove: (e: React.PointerEvent) => {
                  if (
                    drag.current &&
                    Math.abs(e.clientX - drag.current.startX) > 3
                  )
                    drag.current.moved = true;
                },
                onPointerUp: (e: React.PointerEvent) => {
                  const d = drag.current;
                  drag.current = null;
                  if (d?.moved) {
                    const beat = beatFromEvent(e);
                    if (beat !== Math.floor(hit.beat))
                      editable.onMoveChord(loc, beat);
                    else onSelectChord?.(loc);
                  } else {
                    onSelectChord?.(loc);
                  }
                },
              }
            : {
                onClick: () =>
                  onSelectChord ? onSelectChord(loc) : onChordClick?.(hit),
              };
          return (
            <text
              key={`chord-${i}`}
              x={cx}
              y={staffTop - 4}
              fill={isSelected ? '#7ecfcf' : 'currentColor'}
              fontSize={14}
              fontWeight="bold"
              fontFamily="serif"
              opacity={isSelected ? 1 : 0.85}
              tabIndex={0}
              role="button"
              aria-label={chordAriaLabel(hit)}
              style={{ cursor: editable ? 'grab' : 'pointer' }}
              {...pointerProps}
            >
              {label}
            </text>
          );
        })}

      {/* Fermata symbol above the bar */}
      {bar.fermata && (
        <g transform={`translate(${width / 2}, ${staffTop - 8})`}>
          {/* Arc */}
          <path
            d="M -8 0 A 8 6 0 0 1 8 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          {/* Dot */}
          <circle cx={0} cy={-1} r={1.5} fill="currentColor" />
        </g>
      )}

      {/* Staff lines (5) */}
      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={i}
          x1={0}
          y1={staffTop + i * LINE_SPACING}
          x2={width}
          y2={staffTop + i * LINE_SPACING}
          stroke="currentColor"
          strokeWidth={0.8}
          opacity={0.4}
        />
      ))}

      {/* Multi-bar rest notation */}
      {isMultiBarRest ? (
        <g>
          {/* Number above */}
          <text
            x={width / 2}
            y={staffTop + LINE_SPACING * 0.8}
            fill="currentColor"
            fontSize={16}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="serif"
          >
            {bar.restBars}
          </text>
          {/* Thick horizontal block spanning middle two staff lines */}
          <rect
            x={width * 0.15}
            y={staffTop + LINE_SPACING * 1.5}
            width={width * 0.7}
            height={LINE_SPACING}
            fill="currentColor"
            opacity={0.7}
          />
          {/* Left vertical serif */}
          <line
            x1={width * 0.15}
            y1={staffTop + LINE_SPACING}
            x2={width * 0.15}
            y2={staffTop + LINE_SPACING * 3}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.7}
          />
          {/* Right vertical serif */}
          <line
            x1={width * 0.85}
            y1={staffTop + LINE_SPACING}
            x2={width * 0.85}
            y2={staffTop + LINE_SPACING * 3}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.7}
          />
        </g>
      ) : (
        /* Beat slashes (4 per measure) — only for normal bars */
        Array.from({ length: beatsPerBar }, (_, beat) => {
          const bx = (beat + 0.5) * (width / beatsPerBar);
          const cy = staffTop + STAFF_HEIGHT / 2;
          return (
            <line
              key={`slash-${beat}`}
              x1={bx - 5}
              y1={cy + 6}
              x2={bx + 5}
              y2={cy - 6}
              stroke="currentColor"
              strokeWidth={2}
              opacity={0.3}
            />
          );
        })
      )}

      {/* Left bar line (first measure gets thicker) */}
      {(isFirst || hasRepeatStart) && (
        <line
          x1={0}
          y1={staffTop}
          x2={0}
          y2={staffTop + STAFF_HEIGHT}
          stroke="currentColor"
          strokeWidth={hasRepeatStart ? 2.5 : 2}
          opacity={hasRepeatStart ? 0.8 : 0.5}
        />
      )}

      {/* Repeat start sign |: */}
      {hasRepeatStart && (
        <>
          <line
            x1={3}
            y1={staffTop}
            x2={3}
            y2={staffTop + STAFF_HEIGHT}
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle
            cx={10}
            cy={staffTop + LINE_SPACING * 1.5}
            r={2.5}
            fill="currentColor"
          />
          <circle
            cx={10}
            cy={staffTop + LINE_SPACING * 2.5}
            r={2.5}
            fill="currentColor"
          />
        </>
      )}

      {/* Right bar line */}
      <line
        x1={width}
        y1={staffTop}
        x2={width}
        y2={staffTop + STAFF_HEIGHT}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Repeat end sign */}
      {hasRepeatEnd && (
        <>
          <line
            x1={width - 3}
            y1={staffTop}
            x2={width - 3}
            y2={staffTop + STAFF_HEIGHT}
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle
            cx={width - 10}
            cy={staffTop + LINE_SPACING * 1.5}
            r={2.5}
            fill="currentColor"
          />
          <circle
            cx={width - 10}
            cy={staffTop + LINE_SPACING * 2.5}
            r={2.5}
            fill="currentColor"
          />
        </>
      )}

      {/* Add / remove bar controls (editor only) */}
      {editable && (
        <g>
          <circle
            cx={width / 2 - 11}
            cy={9}
            r={7}
            fill="rgba(255,255,255,0.08)"
            stroke="currentColor"
            strokeOpacity={0.25}
            style={{ cursor: 'pointer' }}
            onClick={() => editable.onRemoveBar(sectionIdx, barIndex)}
          >
            <title>Remove this bar</title>
          </circle>
          <line
            x1={width / 2 - 14}
            y1={9}
            x2={width / 2 - 8}
            y2={9}
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.7}
            pointerEvents="none"
          />
          <circle
            cx={width / 2 + 11}
            cy={9}
            r={7}
            fill="rgba(255,255,255,0.08)"
            stroke="currentColor"
            strokeOpacity={0.25}
            style={{ cursor: 'pointer' }}
            onClick={() => editable.onInsertBar(sectionIdx, barIndex + 1)}
          >
            <title>Insert a bar after this one</title>
          </circle>
          <line
            x1={width / 2 + 8}
            y1={9}
            x2={width / 2 + 14}
            y2={9}
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.7}
            pointerEvents="none"
          />
          <line
            x1={width / 2 + 11}
            y1={6}
            x2={width / 2 + 11}
            y2={12}
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.7}
            pointerEvents="none"
          />
        </g>
      )}
    </g>
  );
};

/* ── Section Staff System ────────────────────────────────────────────── */
const SectionStaff: FC<{
  section: SongSection;
  sectionIdx: number;
  displayMode: DisplayMode;
  isLooping?: boolean;
  onChordClick?: (hit: ChordHit) => void;
  onToggleLoop?: (sectionIdx: number) => void;
  onSelectChord?: (loc: ChordChartLoc) => void;
  selection?: ChordChartLoc | null;
  editable?: ChordChartEditable;
}> = ({
  section,
  sectionIdx,
  displayMode,
  isLooping,
  onChordClick,
  onToggleLoop,
  onSelectChord,
  selection,
  editable,
}) => {
  const bars = section.bars;
  const perRow = section.measuresPerRow ?? MEASURES_PER_ROW;
  const rows: ChordBar[][] = [];
  for (let i = 0; i < bars.length; i += perRow) {
    rows.push(bars.slice(i, i + perRow));
  }

  const hasRepeat = (section.repeatCount ?? 1) > 1;

  return (
    <div style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
      {/* Section header — inline-editable controls in the editor */}
      {editable ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          style={{ marginBottom: 'clamp(0.3rem, 0.5vw, 0.4rem)' }}
        >
          <input
            value={section.label}
            onChange={(e) =>
              editable.onRenameSection(sectionIdx, e.target.value)
            }
            placeholder="Section label"
            className="rounded border border-white/10 bg-transparent px-2 py-0.5 font-bold text-white/70 outline-none placeholder:text-white/25"
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
            }}
          />
          <div className="flex items-center gap-1 text-xs text-white/40">
            <button
              type="button"
              aria-label="Fewer repeats"
              className="rounded px-1 hover:bg-white/10"
              onClick={() =>
                editable.onSetRepeat(
                  sectionIdx,
                  Math.max(1, (section.repeatCount ?? 1) - 1),
                )
              }
            >
              <Minus size={12} />
            </button>
            <span className="inline-flex items-center gap-0.5">
              <Repeat size={10} />×{section.repeatCount ?? 1}
            </span>
            <button
              type="button"
              aria-label="More repeats"
              className="rounded px-1 hover:bg-white/10"
              onClick={() =>
                editable.onSetRepeat(sectionIdx, (section.repeatCount ?? 1) + 1)
              }
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            type="button"
            aria-label="Move section up"
            disabled={sectionIdx === 0}
            className="rounded px-1 text-white/40 hover:bg-white/10 disabled:opacity-30"
            onClick={() => editable.onMoveSection(sectionIdx, -1)}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Move section down"
            disabled={sectionIdx === editable.sectionCount - 1}
            className="rounded px-1 text-white/40 hover:bg-white/10 disabled:opacity-30"
            onClick={() => editable.onMoveSection(sectionIdx, 1)}
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Delete section"
            className="rounded px-1 text-red-400/70 hover:bg-white/10 hover:text-red-400"
            onClick={() => editable.onRemoveSection(sectionIdx)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : section.label ? (
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: 'clamp(0.3rem, 0.5vw, 0.4rem)' }}
        >
          <button
            onClick={() => onToggleLoop?.(sectionIdx)}
            className={`font-bold inline-block cursor-pointer transition-colors ${
              isLooping ? 'text-[#7ecfcf] border-[#7ecfcf]' : 'text-white/60'
            } hover:text-[#7ecfcf]`}
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
              padding: '2px 8px',
              border: '1px solid currentColor',
              borderRadius: 2,
              background: isLooping ? 'rgba(126,207,207,0.1)' : 'transparent',
            }}
            title={
              isLooping ? 'Click to stop looping' : 'Click to loop this section'
            }
          >
            {section.label}
          </button>
          {isLooping && (
            <span
              className="flex items-center gap-1 text-[#7ecfcf]"
              style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}
            >
              <Repeat size={10} /> Loop
            </span>
          )}
          {hasRepeat && (
            <span
              className="flex items-center gap-1 text-white/30"
              style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}
            >
              <Repeat size={10} /> ×{section.repeatCount}
            </span>
          )}
        </div>
      ) : null}

      {/* Staff rows — each row stretches full width */}
      {rows.map((row, ri) => {
        const measuresInRow = row.length;
        const viewW = measuresInRow * MEASURE_WIDTH;
        const globalBarOffset = ri * perRow;
        return (
          <div key={ri} style={{ marginBottom: 4 }}>
            <svg
              width="100%"
              viewBox={`0 0 ${viewW} ${TOTAL_HEIGHT}`}
              preserveAspectRatio="xMinYMid meet"
              style={{ color: 'var(--color-text, #e8e8f0)', display: 'block' }}
            >
              {row.map((bar, bi) => {
                const globalBi = globalBarOffset + bi;
                const isLast = bi === row.length - 1 && ri === rows.length - 1;
                return (
                  <StaffMeasure
                    key={bi}
                    bar={bar}
                    barIndex={globalBi}
                    x={bi * MEASURE_WIDTH}
                    width={MEASURE_WIDTH}
                    displayMode={displayMode}
                    isFirst={bi === 0 && ri === 0}
                    hasRepeatStart={bi === 0 && ri === 0 && hasRepeat}
                    hasRepeatEnd={isLast && hasRepeat}
                    onChordClick={onChordClick}
                    sectionIdx={sectionIdx}
                    onSelectChord={onSelectChord}
                    selection={selection}
                    editable={editable}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}

      {/* Pedagogical note */}
      {section.notes && (
        <p
          className="text-white/25 italic"
          style={{ fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)' }}
        >
          {section.notes}
        </p>
      )}
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────────────── */
export const ChordChart: FC<ChordChartProps> = ({
  song,
  loopSection,
  onToggleLoop,
  onSelectChord,
  selection,
  editable,
}) => {
  const displayMode: DisplayMode = 'chordName';
  const [selectedChord, setSelectedChord] = useState<{
    hit: ChordHit;
    midi: number[];
    rgb: ChordRgb | null;
  } | null>(null);
  const { play } = useUISound();

  // Map each unique chord name → its Studio key-color RGB tuple. Routed
  // through MIDI (via chordNameToMidi) so we don't have to translate the
  // song's degree strings (`'1 maj'`, `'♭7 maj'`) into Studio's format.
  const chordColorCache = useMemo(() => {
    const cache = new Map<string, ChordRgb>();
    for (const section of song.sections) {
      for (const bar of section.bars) {
        for (const hit of bar.chords) {
          if (cache.has(hit.chordName)) continue;
          const rgb = chordRgbFor(hit.chordName, song.keyRoot, song.mode);
          if (rgb) cache.set(hit.chordName, rgb);
        }
      }
    }
    return cache;
  }, [song]);

  const handleChordClick = (hit: ChordHit) => {
    play('click');
    const midi = chordNameToMidi(hit.chordName);
    if (midi.length === 0) return;
    const rgb = chordColorCache.get(hit.chordName) ?? null;
    setSelectedChord({ hit, midi, rgb });
  };

  return (
    <div className="flex flex-col h-full min-w-0 max-w-full overflow-x-hidden">
      {/* ── Lead Sheet Staff ── */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {song.sections.map((section, si) => (
          <SectionStaff
            key={section.id + '_' + si}
            section={section}
            sectionIdx={si}
            displayMode={displayMode}
            isLooping={loopSection === si}
            onChordClick={handleChordClick}
            onToggleLoop={onToggleLoop}
            onSelectChord={onSelectChord}
            selection={selection}
            editable={editable}
          />
        ))}

        {editable && (
          <button
            type="button"
            onClick={editable.onAddSection}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2 text-sm text-white/50 transition-colors hover:border-white/30 hover:text-white"
          >
            <Plus size={16} /> Add section
          </button>
        )}
      </div>

      {/* ── Chord Diagram Popup (student view only; editor suppresses it) ── */}
      {!onSelectChord && selectedChord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedChord(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <ChordDiagramCard
              midi={selectedChord.midi}
              rgb={selectedChord.rgb}
              header={
                <>
                  <h3
                    className="text-white font-bold text-xl"
                    style={{ fontFamily: 'serif' }}
                  >
                    {selectedChord.hit.chordName}
                  </h3>
                  <p
                    className="text-white/40 text-sm"
                    style={{ fontFamily: 'serif' }}
                  >
                    {selectedChord.hit.degree}
                  </p>
                </>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
