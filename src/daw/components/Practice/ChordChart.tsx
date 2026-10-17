/**
 * ChordChart.tsx — One turn of a Practice Track's progression, the chord
 * sounding now lit.
 *
 * The chart shows the *cycle*, not the loop. A genre Practice Track loops
 * sixteen bars of a four-bar progression, so drawing a box per bar would give
 * sixteen boxes saying the same four things; the playhead wraps within the cycle
 * instead.
 */

import { formatLessonChord } from '@/curriculum/notation/lessonChordSymbols';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { formatChordRegion } from '@/daw/utils/chordRegionNotation';
import {
  displayAccidentals,
  displayDegreeLabel,
} from '@/daw/utils/displayAccidentals';
import { useChordNotation } from '@/lib/chordNotation';
import { COLOR } from '@/daw/ui/tokens';

interface ChordChartProps {
  /** One turn of the progression — the loop's regions, cut to the cycle. */
  regions: ChordRegion[];
  /**
   * The region the playhead is in, within the cycle (-1 for none); lit while
   * playing.
   */
  nowIndex: number;
  isPlaying: boolean;
  /** Playing the chords makes the chart the task; improvising makes it context. */
  large: boolean;
  keyRootPc: number;
  mode: string;
}

const ACCENT = COLOR.accent.value;

export function ChordChart({
  regions,
  nowIndex,
  isPlaying,
  large,
  keyRootPc,
  mode,
}: ChordChartProps) {
  const notation = useChordNotation();

  return (
    <div
      className={`grid gap-2 ${large ? 'w-full' : 'w-full max-w-2xl'}`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, Math.min(regions.length, 8))}, minmax(0, 1fr))`,
      }}
    >
      {regions.map((region, i) => {
        const now = isPlaying && i === nowIndex;
        const letter = displayAccidentals(region.noteName);
        // The chord by letter, as the lesson names it (A min9 / A−9); its
        // degree underneath.
        const symbol =
          notation === 'hybrid'
            ? formatLessonChord(region.name, 'hybrid', { keyRootPc, mode })
            : formatChordRegion(region, notation, { keyRootPc, mode }, letter);
        return (
          <div
            key={region.id}
            data-now={now || undefined}
            className={`rounded-xl text-center transition-colors duration-100 ${large ? 'px-3 py-5' : 'px-2 py-1.5'}`}
            style={{
              background: now
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${now ? ACCENT : 'var(--daw-hairline)'}`,
            }}
          >
            <div
              className={
                large ? 'text-3xl font-semibold' : 'text-lg font-semibold'
              }
            >
              {symbol}
            </div>
            <div
              className={large ? 'mt-1 text-sm' : 'text-xs'}
              style={{ color: 'var(--daw-text-3)' }}
            >
              {displayDegreeLabel(region.name)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
