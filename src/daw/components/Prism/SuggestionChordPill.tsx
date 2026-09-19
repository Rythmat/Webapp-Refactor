/**
 * SuggestionChordPill — Phase 10, 14, 17
 *
 * Individual color-coded chord pill for the suggestion modal.
 * Shows chord name with Prism color, click to preview.
 */

import { memo } from 'react';
import type { SuggestionChord } from '@/daw/prism-engine/engine/suggestionEngine';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { formatChord, parseChord, useChordNotation } from '@/lib/chordNotation';

interface SuggestionChordPillProps {
  chord: SuggestionChord;
  isPlaying: boolean;
  onClick: () => void;
}

export const SuggestionChordPill = memo(function SuggestionChordPill({
  chord,
  isPlaying,
  onClick,
}: SuggestionChordPillProps) {
  const [r, g, b] = chord.color;
  const bgAlpha = isPlaying ? 0.4 : 0.15;
  const borderAlpha = isPlaying ? 0.8 : 0.4;
  const notation = useChordNotation();
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);

  // Name the chord from its spelled root (what's shown and played), not
  // chord.degree: in non-Ionian modes the suggestion engine voices degrees
  // from the mode tonic, so the degree alone would misname it.
  const root = parseChord(chord.noteName)?.root;
  const label =
    notation === 'hybrid' || root === undefined
      ? displayAccidentals(chord.noteName)
      : formatChord({ root, quality: chord.quality }, notation, {
          keyRootPc: rootNote ?? 0,
          mode,
        });

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 transition-all"
      style={{
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgAlpha})`,
        border: `1px solid rgba(${r}, ${g}, ${b}, ${borderAlpha})`,
        boxShadow: isPlaying ? `0 0 12px rgba(${r}, ${g}, ${b}, 0.3)` : 'none',
        minWidth: 56,
      }}
    >
      {/* Color dot */}
      <div
        className="shrink-0 rounded-full"
        style={{
          width: 8,
          height: 8,
          backgroundColor: `rgb(${r}, ${g}, ${b})`,
        }}
      />
      {/* Chord name */}
      <span
        className="whitespace-nowrap text-[11px] font-medium"
        style={{ color: 'var(--color-text)' }}
      >
        {label}
      </span>
    </button>
  );
});
