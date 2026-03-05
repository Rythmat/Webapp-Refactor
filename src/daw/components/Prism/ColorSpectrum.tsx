import { useMemo, useCallback } from 'react';
import {
  CHORD_COLORS,
  KEY_COLORS,
  KEYS,
  noteNameLetter,
  type ColorIndex,
} from '@prism/engine';

// ── Constants ────────────────────────────────────────────────────────────

/** Spectrum order: warm → cool matching the circle-of-fifths color wheel */
const SPECTRUM_ORDER: ColorIndex[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
];

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Compute the rotated color index for a chord given the progression root.
 * Mirrors the rotation logic in getChordColor() from the engine.
 */
function rotatedColorIndex(chordName: string, rootMidi: number): number {
  const stepFrom = CHORD_COLORS[chordName] ?? 13;
  if (stepFrom === 0 || stepFrom === 13) return stepFrom;

  const letter = noteNameLetter(rootMidi);
  let rootPos = -1;
  for (let i = 1; i < KEYS.length; i++) {
    if (KEYS[i] === letter) {
      rootPos = i;
      break;
    }
  }
  if (rootPos < 1) return 0;

  let keyInd = rootPos + stepFrom - 1;
  if (keyInd > 13) keyInd = (keyInd % 13) + 1;
  return keyInd as ColorIndex;
}

// ── Props ────────────────────────────────────────────────────────────────

interface ColorSpectrumProps {
  chordOptions: string[];
  rootMidi: number;
  onSelectChord: (name: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function ColorSpectrum({
  chordOptions,
  rootMidi,
  onSelectChord,
}: ColorSpectrumProps) {
  // Group available chords by their rotated color index
  const colorGroups = useMemo(() => {
    const groups = new Map<number, string[]>();
    for (const name of chordOptions) {
      const colorIdx = rotatedColorIndex(name, rootMidi);
      // Skip "other" colors (0=white, 13=chromatic) — only accessible via Advanced
      if (colorIdx === 0) continue;
      if (!groups.has(colorIdx)) groups.set(colorIdx, []);
      groups.get(colorIdx)!.push(name);
    }
    return groups;
  }, [chordOptions, rootMidi]);

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
