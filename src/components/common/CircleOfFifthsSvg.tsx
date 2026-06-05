import { type FC } from 'react';
import { KEY_COLORS, KEYS, type ColorIndex } from '@prism/engine';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Read-only Circle of Fifths SVG, used as a small key-center badge across the
 * app. Mirrors the visual + color logic of the Studio's CircleOfFifths
 * (src/daw/components/Prism/CircleOfFifths.tsx) — including the convention
 * that minor keys take the relative major's color.
 *
 * Kept separate from the Studio component because that one is bound to the
 * DAW useStore. This is a pure presentational SVG with no state.
 */

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/** Circle-of-fifths position (1-12) → semitone (0-11). */
const SEMITONES: Record<number, number> = {
  1: 0,
  2: 7,
  3: 2,
  4: 9,
  5: 4,
  6: 11,
  7: 6,
  8: 1,
  9: 8,
  10: 3,
  11: 10,
  12: 5,
};

/** Reverse: semitone → circle position. */
const SEMI_TO_IDX: Record<number, number> = {};
for (const [idx, semi] of Object.entries(SEMITONES)) {
  SEMI_TO_IDX[semi] = Number(idx);
}

/** Aeolian is position 5 in the diatonic family; ionian[5] = 9 semitones. */
const AEOLIAN_OFFSET = 9;

const DEFAULT_SIZE = 160;
const SLICE = (2 * Math.PI) / 12;
const START = -Math.PI / 2 - SLICE / 2; // C centered at top

// Proportions tuned to the Song Chart reference: donut ring in the middle,
// note-letter labels orbiting OUTSIDE the ring. Ratios relative to size.
const OUTER_R_RATIO = 0.34;
const INNER_R_RATIO = 0.19;
const LABEL_R_RATIO = 0.44;

function arcPath(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  a1: number,
  a2: number,
): string {
  const x1o = cx + r2 * Math.cos(a1);
  const y1o = cy + r2 * Math.sin(a1);
  const x2o = cx + r2 * Math.cos(a2);
  const y2o = cy + r2 * Math.sin(a2);
  const x1i = cx + r1 * Math.cos(a2);
  const y1i = cy + r1 * Math.sin(a2);
  const x2i = cx + r1 * Math.cos(a1);
  const y2i = cy + r1 * Math.sin(a1);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${r2} ${r2} 0 ${lg} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${r1} ${r1} 0 ${lg} 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ');
}

export interface CircleOfFifthsSvgProps {
  /** Highlighted pitch class 0–11, or null for no selection. */
  selectedPitch: number | null;
  /** 'major' uses the key's own color; 'minor' uses the relative major's color. */
  selectedMode: 'major' | 'minor';
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export const CircleOfFifthsSvg: FC<CircleOfFifthsSvgProps> = ({
  selectedPitch,
  selectedMode,
  size = DEFAULT_SIZE,
  className,
  ariaLabel,
}) => {
  const scale = size / DEFAULT_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = OUTER_R_RATIO * size;
  const innerR = INNER_R_RATIO * size;
  const labelR = LABEL_R_RATIO * size;

  const isMinor = selectedMode === 'minor';
  const selectedIdx =
    selectedPitch != null ? (SEMI_TO_IDX[selectedPitch] ?? null) : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`select-none ${className ?? ''}`.trim()}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      {Array.from({ length: 12 }, (_, i) => {
        const idx = (i + 1) as ColorIndex;
        const semitone = SEMITONES[idx];
        const isSelected = idx === selectedIdx;

        // Match Studio logic: in minor mode, use the relative major's color.
        const colorIdx = isMinor
          ? (SEMI_TO_IDX[(semitone - AEOLIAN_OFFSET + 12) % 12] as ColorIndex)
          : idx;
        const [r, g, b] = KEY_COLORS[colorIdx];
        const fill = `rgb(${r}, ${g}, ${b})`;
        const opacity = isSelected ? 1 : 0.65;

        const a1 = START + i * SLICE;
        const a2 = a1 + SLICE;
        const mid = a1 + SLICE / 2;
        const lx = cx + labelR * Math.cos(mid);
        const ly = cy + labelR * Math.sin(mid);

        return (
          <g key={idx}>
            <path
              d={arcPath(cx, cy, innerR, outerR, a1, a2)}
              fill={fill}
              stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.25)'}
              strokeWidth={isSelected ? 2 * scale : 0.5 * scale}
              opacity={opacity}
            />
            {isSelected && (
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={(idx === 7 ? 11 : 12) * scale}
                fontWeight={700}
              >
                {KEYS[idx]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ── Song-aware wrapper ─────────────────────────────────────────────── */

export interface KeyCenterBadgeProps {
  song: Pick<Song, 'key' | 'keyRoot' | 'mode'>;
  size?: number;
  className?: string;
}

export const KeyCenterBadge: FC<KeyCenterBadgeProps> = ({
  song,
  size = DEFAULT_SIZE,
  className,
}) => {
  const pitch = ((song.keyRoot % 12) + 12) % 12;
  // Modes other than aeolian/minor are treated as major-colored for now;
  // KeyPicker / Studio handle the parent-Ionian mapping for full mode support.
  const isMinor = song.mode === 'minor' || song.mode === 'aeolian';
  return (
    <CircleOfFifthsSvg
      selectedPitch={pitch}
      selectedMode={isMinor ? 'minor' : 'major'}
      size={size}
      className={className}
      ariaLabel={`Key: ${song.key}`}
    />
  );
};

/** Display label for a canonical genre slug. */
export const GENRE_DISPLAY_LABELS: Record<string, string> = {
  pop: 'Pop',
  rock: 'Rock',
  'hip hop': 'Hip Hop',
  rnb: 'R&B',
  jazz: 'Jazz',
  blues: 'Blues',
  folk: 'Folk',
  funk: 'Funk',
  'neo-soul': 'Neo Soul',
  electronic: 'Electronic',
  latin: 'Latin',
  reggae: 'Reggae',
  'jam-band': 'Jam Band',
  african: 'African',
};

export function prettyGenre(slug: string | undefined): string {
  if (!slug) return '—';
  return GENRE_DISPLAY_LABELS[slug] ?? slug;
}

// Internal note name list, exported for tests / debug callers if needed.
export { NOTE_NAMES };
