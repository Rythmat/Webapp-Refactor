/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useMemo, useState, useEffect, useRef, type FC } from 'react';
import { BookOpen, ExternalLink, Globe2, Music, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router';
import type {
  Song,
  SongSection,
  ChordBar,
  ChordHit,
  ContentRef,
} from '@/curriculum/types/songLibrary';
import {
  resolveContentRefs,
  splitContentRefs,
} from '@/curriculum/songLibrary/contentRefResolver';
import {
  exportSongToChordRegions,
  type StudioExportOptions,
} from '@/curriculum/songLibrary/exportToStudio';
import { useStore } from '@/daw/store';
import { useUISound } from '@/hooks/useUISound';
import { AtlasRoutes, StudioRoutes } from '@/constants/routes';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';

/* ── Types ───────────────────────────────────────────────────────────── */
type DisplayMode = 'hybrid' | 'chordName';
interface ChordChartProps {
  song: Song;
  currentTimeSec?: number;
}

/* ── Staff layout constants (matching LeadSheetMeasure) ──────────────── */
const MEASURE_WIDTH = 240;
const STAFF_HEIGHT = 40;
const CHORD_AREA_HEIGHT = 45;
const LINE_SPACING = STAFF_HEIGHT / 4;
const TOTAL_HEIGHT = CHORD_AREA_HEIGHT + STAFF_HEIGHT + 16;
const MEASURES_PER_ROW = 4;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getActiveBarIndex(
  song: Song,
  timeSec: number,
): { sectionIdx: number; barIdx: number } | null {
  const secPerBar = (song.timeSignature[0] * 60) / song.tempo;
  let elapsed = 0;
  for (let si = 0; si < song.sections.length; si++) {
    const section = song.sections[si];
    for (let rep = 0; rep < (section.repeatCount ?? 1); rep++) {
      for (let bi = 0; bi < section.bars.length; bi++) {
        if (timeSec >= elapsed && timeSec < elapsed + secPerBar)
          return { sectionIdx: si, barIdx: bi };
        elapsed += secPerBar;
      }
    }
  }
  return null;
}

function formatChord(hit: ChordHit, mode: DisplayMode): string {
  return mode === 'hybrid' ? hit.degree : hit.chordName;
}

function chordAriaLabel(hit: ChordHit): string {
  return `${hit.degree} chord, beat ${hit.beat}, ${hit.duration} beat${hit.duration !== 1 ? 's' : ''}`;
}

const PROVIDER_LABEL: Record<string, string> = {
  spotify: '♪ Spotify',
  youtube: '▶ YouTube',
  apple_music: '♪ Apple Music',
  tidal: '♪ Tidal',
};

function refToRoute(ref: ContentRef): string {
  switch (ref.module) {
    case 'theory':
      return `/learn?tab=Theory`;
    case 'genre':
      return `/learn?tab=Courses${ref.genre ? `&genre=${ref.genre}` : ''}`;
    case 'globe':
      return AtlasRoutes.root.definition;
    case 'studio':
      return StudioRoutes.root.definition;
    default:
      return '/';
  }
}

/* ── Chord name → MIDI resolution ────────────────────────────────────── */
const NOTE_TO_MIDI: Record<string, number> = {
  C: 60,
  'C♯': 61,
  'D♭': 61,
  D: 62,
  'D♯': 63,
  'E♭': 63,
  E: 64,
  F: 65,
  'F♯': 66,
  'G♭': 66,
  G: 67,
  'G♯': 68,
  'A♭': 68,
  A: 69,
  'A♯': 70,
  'B♭': 70,
  B: 71,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  sus: [0, 5, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus': [0, 5, 7, 10],
  alt7: [0, 4, 6, 10],
  '9': [0, 4, 7, 10, 14],
  min9: [0, 3, 7, 10, 14],
  add9: [0, 4, 7, 14],
  '6': [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  power: [0, 7],
};

function chordNameToMidi(chordName: string): number[] {
  if (!chordName) return [];
  // Extract root note: "G♭maj7(♯11)" → "G♭", "Fmin/G" → "F"
  const rootMatch = chordName.match(/^([A-G][♭♯]?)/);
  if (!rootMatch) return [];
  const rootNote = rootMatch[1];
  const rootMidi = NOTE_TO_MIDI[rootNote];
  if (rootMidi == null) return [];

  // Extract quality from remainder
  const remainder = chordName
    .slice(rootNote.length)
    .replace(/\(.*\)/, '')
    .replace(/\/[A-G][♭♯]?$/, '')
    .trim();
  const quality = remainder || 'maj';

  // Find matching intervals
  const intervals = QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS['maj'];
  return intervals.map((i) => rootMidi + i);
}

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

const CHIP_COLORS: Partial<Record<string, string>> = {
  key: 'rgba(168,85,247,0.15)',
  mode: 'rgba(168,85,247,0.15)',
  technique: 'rgba(96,165,250,0.15)',
  progression: 'rgba(96,165,250,0.15)',
  genre_overview: 'rgba(255,204,51,0.12)',
  studio_jam: 'rgba(255,204,51,0.12)',
  globe_artist: 'rgba(52,211,153,0.15)',
  globe_scene: 'rgba(52,211,153,0.12)',
  globe_region: 'rgba(52,211,153,0.1)',
  globe_era: 'rgba(52,211,153,0.08)',
};

/* ── SVG Staff Measure ───────────────────────────────────────────────── */
const StaffMeasure: FC<{
  bar: ChordBar;
  barIndex: number;
  x: number;
  width: number;
  displayMode: DisplayMode;
  isActive: boolean;
  isFirst: boolean;
  hasRepeatEnd?: boolean;
  onChordClick?: (hit: ChordHit) => void;
}> = ({
  bar,
  barIndex,
  x,
  width,
  displayMode,
  isActive,
  isFirst,
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
              fill={isActive ? '#7ecfcf' : 'currentColor'}
              fontSize={14}
              fontWeight="bold"
              fontFamily="serif"
              opacity={isActive ? 1 : 0.85}
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
      {isFirst && (
        <line
          x1={0}
          y1={staffTop}
          x2={0}
          y2={staffTop + STAFF_HEIGHT}
          stroke="currentColor"
          strokeWidth={2}
          opacity={0.5}
        />
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

      {/* Active bar highlight — playhead accent */}
      {isActive && (
        <rect
          x={0}
          y={staffTop}
          width={width}
          height={STAFF_HEIGHT}
          fill="rgba(126, 207, 207, 0.06)"
          rx={2}
        />
      )}
    </g>
  );
};

/* ── Section Staff System ────────────────────────────────────────────── */
const SectionStaff: FC<{
  section: SongSection;
  sectionIdx: number;
  song: Song;
  displayMode: DisplayMode;
  activeSectionIdx: number | null;
  activeBarIdx: number | null;
  activeBarRef: React.RefObject<HTMLDivElement | null>;
  onChordClick?: (hit: ChordHit) => void;
}> = ({
  section,
  sectionIdx,
  song: _song,
  displayMode,
  activeSectionIdx,
  activeBarIdx,
  activeBarRef,
  onChordClick,
}) => {
  const bars = section.bars;
  const perRow = section.measuresPerRow ?? MEASURES_PER_ROW;
  const rows: ChordBar[][] = [];
  for (let i = 0; i < bars.length; i += perRow) {
    rows.push(bars.slice(i, i + perRow));
  }

  const isActiveSection = activeSectionIdx === sectionIdx;
  const hasRepeat = (section.repeatCount ?? 1) > 1;

  return (
    <div style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
      {/* Section label (hidden when empty) */}
      {section.label ? (
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: 'clamp(0.3rem, 0.5vw, 0.4rem)' }}
        >
          <span
            className={`font-bold inline-block ${isActiveSection ? 'text-[#7ecfcf]' : 'text-white/60'}`}
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
              padding: '2px 8px',
              border: '1px solid currentColor',
              borderRadius: 2,
            }}
          >
            {section.label}
          </span>
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
          <div
            key={ri}
            ref={
              isActiveSection &&
              activeBarIdx != null &&
              activeBarIdx >= globalBarOffset &&
              activeBarIdx < globalBarOffset + row.length
                ? activeBarRef
                : undefined
            }
            style={{ marginBottom: 4 }}
          >
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
                    isActive={isActiveSection && activeBarIdx === globalBi}
                    isFirst={bi === 0 && ri === 0}
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

/* ── RefChip ─────────────────────────────────────────────────────────── */
const RefChip: FC<{ ref_: ContentRef; onClick: () => void }> = ({
  ref_,
  onClick,
}) => (
  <button
    onClick={onClick}
    aria-label={`Open: ${ref_.displayLabel}`}
    className="rounded-full text-white/70 hover:text-white transition-colors flex items-center gap-1"
    style={{
      padding: 'clamp(0.2rem, 0.35vw, 0.3rem) clamp(0.5rem, 0.8vw, 0.7rem)',
      fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)',
      background: CHIP_COLORS[ref_.refType] ?? 'rgba(255,255,255,0.06)',
    }}
  >
    {ref_.displayLabel}
  </button>
);

/* ── Main Component ─────────────────────────────────────────────────── */
export const ChordChart: FC<ChordChartProps> = ({ song, currentTimeSec }) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('chordName');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedChord, setSelectedChord] = useState<{
    hit: ChordHit;
    midi: number[];
  } | null>(null);

  const handleChordClick = (hit: ChordHit) => {
    play('click');
    const midi = chordNameToMidi(hit.chordName);
    setSelectedChord(midi.length > 0 ? { hit, midi } : null);
  };
  const activeBarRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { play } = useUISound();

  const allRefs = useMemo(() => resolveContentRefs(song), [song]);
  const { learnRefs, globeRefs } = useMemo(
    () => splitContentRefs(allRefs),
    [allRefs],
  );

  const { activeSectionIdx, activeBarIdx } = useMemo(() => {
    if (currentTimeSec == null)
      return { activeSectionIdx: null, activeBarIdx: null };
    const active = getActiveBarIndex(song, currentTimeSec);
    return {
      activeSectionIdx: active?.sectionIdx ?? null,
      activeBarIdx: active?.barIdx ?? null,
    };
  }, [song, currentTimeSec]);

  useEffect(() => {
    activeBarRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeSectionIdx, activeBarIdx]);

  const handleExportToStudio = (opts: StudioExportOptions) => {
    play('select');
    const { regions, restMap, fermatas, rowSizes } = exportSongToChordRegions(
      song,
      opts,
    );
    const store = useStore.getState();
    store.setRootNote(song.keyRoot % 12);
    store.setMode(song.mode === 'major' ? 'ionian' : song.mode);
    store.setBpm(song.tempo);
    // Set row layout, rest map, and fermatas to match chord chart exactly
    useStore.setState({
      measuresPerLine: 4,
      measureRowSizes: rowSizes.length > 0 ? rowSizes : null,
      measureRestMap: Object.keys(restMap).length > 0 ? restMap : null,
      measureFermatas: fermatas.length > 0 ? fermatas : null,
    });
    // Set chord regions directly with correct beat/measure timing
    if (regions.length > 0) {
      store.setChordRegions(regions, true);
    }
    navigate(StudioRoutes.root.definition);
    setShowExportModal(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div
        className="flex items-start gap-4 flex-shrink-0"
        style={{ marginBottom: 'clamp(0.5rem, 1vw, 0.75rem)' }}
      >
        <div className="flex-1 min-w-0">
          <h2
            className="font-bold text-white truncate"
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.5rem)',
              fontFamily: 'serif',
            }}
          >
            {song.title}
          </h2>
          <p
            className="text-white/50"
            style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}
          >
            {song.artist}
            {song.year ? ` · ${song.year}` : ''}
            {song.origin?.region ? ` · ${song.origin.region}` : ''}
          </p>
          <p
            className="text-white/30"
            style={{ fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)' }}
          >
            {song.key} · {song.tempo} BPM · {song.timeSignature[0]}/
            {song.timeSignature[1]} · Difficulty {song.difficulty}
          </p>
        </div>
      </div>

      {/* ── Links ── */}
      <div
        className="flex flex-wrap gap-2 flex-shrink-0"
        style={{ marginBottom: 'clamp(0.4rem, 0.8vw, 0.6rem)' }}
      >
        {song.audioSources.map((src) => (
          <a
            key={src.provider}
            href={src.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full text-white/50 hover:text-white transition-colors"
            style={{
              padding:
                'clamp(0.2rem, 0.4vw, 0.35rem) clamp(0.5rem, 0.8vw, 0.75rem)',
              fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <ExternalLink size={10} />
            {PROVIDER_LABEL[src.provider] ?? src.provider}
          </a>
        ))}
        <button
          onClick={() => {
            play('click');
            setShowExportModal(true);
          }}
          className="flex items-center gap-1.5 rounded-full transition-colors"
          style={{
            padding:
              'clamp(0.2rem, 0.4vw, 0.35rem) clamp(0.5rem, 0.8vw, 0.75rem)',
            fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)',
            background: 'rgba(126,207,207,0.1)',
            color: '#7ecfcf',
          }}
        >
          <Music size={10} /> Open in Studio
        </button>
      </div>

      {/* ── Content Ref Rails ── */}
      {learnRefs.length > 0 && (
        <div
          className="flex-shrink-0"
          role="region"
          aria-label="Learning resources"
          style={{ marginBottom: 'clamp(0.3rem, 0.6vw, 0.5rem)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen size={11} className="text-white/30" />
            <span
              className="text-white/30"
              style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.55rem)' }}
            >
              Learn the concepts
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {learnRefs.slice(0, 6).map((ref) => (
              <RefChip
                key={`${ref.refType}-${ref.displayLabel}`}
                ref_={ref}
                onClick={() => {
                  play('click');
                  navigate(refToRoute(ref));
                }}
              />
            ))}
          </div>
        </div>
      )}
      {globeRefs.length > 0 && (
        <div
          className="flex-shrink-0"
          role="region"
          aria-label="Globe context"
          style={{ marginBottom: 'clamp(0.4rem, 0.8vw, 0.6rem)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Globe2 size={11} className="text-white/30" />
            <span
              className="text-white/30"
              style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.55rem)' }}
            >
              Explore the context
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {globeRefs.slice(0, 6).map((ref) => (
              <RefChip
                key={`${ref.refType}-${ref.displayLabel}`}
                ref_={ref}
                onClick={() => {
                  play('click');
                  navigate(refToRoute(ref));
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Display toggle ── */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        style={{ marginBottom: 'clamp(0.5rem, 1vw, 0.75rem)' }}
      >
        {(['hybrid', 'chordName'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setDisplayMode(mode)}
            className="rounded-full font-medium transition-all"
            style={{
              padding:
                'clamp(0.2rem, 0.35vw, 0.3rem) clamp(0.5rem, 0.9vw, 0.75rem)',
              fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)',
              background:
                displayMode === mode
                  ? 'var(--color-accent, #7ecfcf)'
                  : 'rgba(255,255,255,0.06)',
              color: displayMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          >
            {mode === 'hybrid' ? 'Hybrid System' : 'Chord Names'}
          </button>
        ))}
      </div>

      {/* ── Lead Sheet Staff ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {song.sections.map((section, si) => (
          <SectionStaff
            key={section.id}
            section={section}
            sectionIdx={si}
            song={song}
            displayMode={displayMode}
            activeSectionIdx={activeSectionIdx}
            activeBarIdx={activeBarIdx}
            activeBarRef={activeBarRef}
            onChordClick={handleChordClick}
          />
        ))}
      </div>

      {/* ── Practice controls ── */}
      <div
        className="flex items-center gap-2 flex-shrink-0 pt-2 border-t"
        style={{
          borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
          marginTop: 'clamp(0.5rem, 1vw, 0.75rem)',
        }}
      >
        <span
          className="text-white/30"
          style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}
        >
          Practice this section
        </span>
        {['Loop', 'Slow', 'Transpose'].map((action) => (
          <button
            key={action}
            className="rounded-full text-white/40 hover:text-white hover:brightness-125 transition-all"
            style={{
              padding:
                'clamp(0.15rem, 0.3vw, 0.25rem) clamp(0.4rem, 0.7vw, 0.6rem)',
              fontSize: 'clamp(0.45rem, 0.65vw, 0.55rem)',
              background: 'var(--color-surface-2, #1e1e1e)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            }}
          >
            {action}
          </button>
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
            {/* Header */}
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
            {/* Piano Keyboard */}
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
            {/* Note names */}
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

      {/* ── Export Modal ── */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full"
            style={{
              background: 'var(--color-surface, #1a1a1a)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-white font-bold text-lg mb-4"
              style={{ fontFamily: 'serif' }}
            >
              Open in Studio
            </h3>
            <div className="flex flex-col gap-3 mb-4">
              {['Auto', 'Block Chord', 'Arpeggiated'].map((mode) => (
                <button
                  key={mode}
                  onClick={() =>
                    handleExportToStudio({
                      voicingMode: mode
                        .toLowerCase()
                        .replace(
                          ' ',
                          '_',
                        ) as StudioExportOptions['voicingMode'],
                      bassLine: true,
                    })
                  }
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white hover:brightness-125 transition-all"
                  style={{
                    background: 'var(--color-surface-2, #1e1e1e)',
                    border:
                      '1px solid var(--color-border, rgba(255,255,255,0.08))',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full py-2 rounded-xl text-sm text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
