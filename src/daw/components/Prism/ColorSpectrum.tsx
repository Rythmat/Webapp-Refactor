import { useMemo, useCallback } from 'react';
import {
  KEY_COLORS,
  getChordColor,
  getModeOffset,
  type ColorIndex,
} from '@prism/engine';

// ── Constants ────────────────────────────────────────────────────────────

/** Spectrum order: warm → cool matching the circle-of-fifths color wheel */
const SPECTRUM_ORDER: ColorIndex[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
];

// ── Helpers ──────────────────────────────────────────────────────────────

/** Build a reverse lookup: "r,g,b" → KEY_COLORS index */
const RGB_TO_INDEX = new Map<string, number>();
for (const [idx, rgb] of Object.entries(KEY_COLORS)) {
  RGB_TO_INDEX.set(rgb.join(','), Number(idx));
}

/**
 * Compute the KEY_COLORS index for a chord by calling the engine's
 * getChordColor (which handles mode remapping) and reverse-looking up.
 */
function colorIndexForChord(
  chordName: string,
  rootMidi: number,
  mode: string,
): number {
  const parentRoot = rootMidi - getModeOffset(mode);
  const rgb = getChordColor(chordName, parentRoot);
  return RGB_TO_INDEX.get(rgb.join(',')) ?? 0;
}

// ── Props ────────────────────────────────────────────────────────────────

interface ColorSpectrumProps {
  chordOptions: string[];
  rootMidi: number;
  mode: string;
  onSelectChord: (name: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function ColorSpectrum({
  chordOptions,
  rootMidi,
  mode,
  onSelectChord,
}: ColorSpectrumProps) {
  // Group available chords by their rotated color index
  const colorGroups = useMemo(() => {
    const groups = new Map<number, string[]>();
    for (const name of chordOptions) {
      const colorIdx = colorIndexForChord(name, rootMidi, mode);
      // Skip unknown color (0=white) — only accessible via Advanced
      if (colorIdx === 0) continue;
      if (!groups.has(colorIdx)) groups.set(colorIdx, []);
      groups.get(colorIdx)!.push(name);
    }
    return groups;
  }, [chordOptions, rootMidi, mode]);

  // CSS gradient from KEY_COLORS
  const gradient = useMemo(() => {
    const stops = SPECTRUM_ORDER.map((idx, i) => {
      const [r, g, b] = KEY_COLORS[idx];
      const pct = (i / (SPECTRUM_ORDER.length - 1)) * 100;
      return `rgb(${r}, ${g}, ${b}) ${pct}%`;
    });
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, []);

  const handleClick = useCallback(
    (colorIdx: number) => () => {
      const chords = colorGroups.get(colorIdx);
      if (chords && chords.length > 0) {
        onSelectChord(chords[Math.floor(Math.random() * chords.length)]);
      }
    },
    [colorGroups, onSelectChord],
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ background: gradient, height: '100%' }}
    >
      {/* Segment overlays — dim unavailable, clickable available */}
      <div className="absolute inset-0 flex">
        {SPECTRUM_ORDER.map((colorIdx) => {
          const available = colorGroups.has(colorIdx);
          return (
            <div
              key={colorIdx}
              onClick={available ? handleClick(colorIdx) : undefined}
              className={`flex-1 transition-all duration-200${available ? ' cursor-pointer' : ''}`}
              style={{
                backgroundColor: available
                  ? 'transparent'
                  : 'rgba(0, 0, 0, 0.7)',
              }}
              onMouseEnter={
                available
                  ? (e) => {
                      e.currentTarget.style.backgroundColor =
                        'rgba(255,255,255,0.15)';
                    }
                  : undefined
              }
              onMouseLeave={
                available
                  ? (e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
