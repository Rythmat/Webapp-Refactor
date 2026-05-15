/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useState, type FC } from 'react';
import { Repeat } from 'lucide-react';
import type {
  Song,
  SongSection,
  ChordBar,
  ChordHit,
} from '@/curriculum/types/songLibrary';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import { useUISound } from '@/hooks/useUISound';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';

/* ── Types ───────────────────────────────────────────────────────────── */
type DisplayMode = 'hybrid' | 'chordName';
interface ChordChartProps {
  song: Song;
  loopSection?: number | null;
  onToggleLoop?: (sectionIdx: number) => void;
}

/* ── Staff layout constants (matching LeadSheetMeasure) ──────────────── */
const MEASURE_WIDTH = 240;
const STAFF_HEIGHT = 40;
const CHORD_AREA_HEIGHT = 45;
const LINE_SPACING = STAFF_HEIGHT / 4;
const TOTAL_HEIGHT = CHORD_AREA_HEIGHT + STAFF_HEIGHT + 16;
const MEASURES_PER_ROW = 4;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatChord(hit: ChordHit, mode: DisplayMode): string {
  return mode === 'hybrid' ? hit.degree : hit.chordName;
}

function chordAriaLabel(hit: ChordHit): string {
  return `${hit.degree} chord, beat ${hit.beat}, ${hit.duration} beat${hit.duration !== 1 ? 's' : ''}`;
}

/* ── Chord name → MIDI resolution ────────────────────────────────────── */
function midiToPlaybackEvents(midis: number[]): PlaybackEvent[] {
  return midis.map((midi, i) => ({
    id: `chord-${midi}-${i}`,
    type: 'note' as const,
    midi,
    time: 0,
    duration: 1,
    velocity: 0.8,
  }));
}

/* ── SVG Staff Measure ───────────────────────────────────────────────── */
const StaffMeasure: FC<{
  bar: ChordBar;
  barIndex: number;
  x: number;
  width: number;
  displayMode: DisplayMode;
  isFirst: boolean;
  hasRepeatStart?: boolean;
  hasRepeatEnd?: boolean;
  onChordClick?: (hit: ChordHit) => void;
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
}) => {
  const staffTop = CHORD_AREA_HEIGHT;
  const beatsPerBar = 4;

  const isMultiBarRest = bar.restBars != null && bar.restBars > 0;

  return (
    <g transform={`translate(${x}, 0)`}>
      {/* Measure number */}
      <text x={2} y={10} fill="currentColor" fontSize={10} opacity={0.35}>
        {barIndex + 1}
      </text>

      {/* Chord names above staff (skip for multi-bar rests) */}
      {!isMultiBarRest &&
        bar.chords.map((hit, i) => {
          const beatPos = hit.beat - 1;
          const cx = (beatPos / beatsPerBar) * width + 4;
          const label = formatChord(hit, displayMode);
          return (
            <text
              key={`chord-${i}`}
              x={cx}
              y={staffTop - 4}
              fill="currentColor"
              fontSize={14}
              fontWeight="bold"
              fontFamily="serif"
              opacity={0.85}
              tabIndex={0}
              role="button"
              aria-label={chordAriaLabel(hit)}
              style={{ cursor: 'pointer' }}
              onClick={() => onChordClick?.(hit)}
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
}> = ({
  section,
  sectionIdx,
  displayMode,
  isLooping,
  onChordClick,
  onToggleLoop,
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
      {/* Section label — clickable for looping */}
      {section.label ? (
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
}) => {
  const displayMode: DisplayMode = 'chordName';
  const [selectedChord, setSelectedChord] = useState<{
    hit: ChordHit;
    midi: number[];
  } | null>(null);
  const { play } = useUISound();

  const handleChordClick = (hit: ChordHit) => {
    play('click');
    const midi = chordNameToMidi(hit.chordName);
    setSelectedChord(midi.length > 0 ? { hit, midi } : null);
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
          />
        ))}
      </div>

      {/* ── Chord Diagram Popup ── */}
      {selectedChord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedChord(null)}
        >
          <div
            className="rounded-2xl max-w-md w-full overflow-hidden"
            style={{
              background: 'var(--color-surface, #1a1a1a)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
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
            </div>
            <div className="px-3 pb-5" style={{ height: 120 }}>
              <PianoKeyboard
                startC={4}
                endC={6}
                playingNotes={midiToPlaybackEvents(selectedChord.midi)}
                activeWhiteKeyColor="#7ecfcf"
                activeBlackKeyColor="#7ecfcf"
                enableClick={false}
              />
            </div>
            <div className="px-5 pb-4 flex gap-2 flex-wrap">
              {selectedChord.midi.map((m) => {
                const noteNames = [
                  'C',
                  'C♯',
                  'D',
                  'E♭',
                  'E',
                  'F',
                  'F♯',
                  'G',
                  'A♭',
                  'A',
                  'B♭',
                  'B',
                ];
                return (
                  <span
                    key={m}
                    className="rounded-full text-xs text-white/70 px-2 py-0.5"
                    style={{ background: 'rgba(126,207,207,0.15)' }}
                  >
                    {noteNames[m % 12]}
                    {Math.floor(m / 12) - 1}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
