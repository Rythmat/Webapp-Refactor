/**
 * ChordChart.tsx — One turn of a Practice Track's progression, the chord
 * sounding now lit.
 *
 * The chart shows the *cycle*, not the loop. A genre Practice Track loops
 * sixteen bars of a four-bar progression, so drawing a box per bar would give
 * sixteen boxes saying the same four things; the playhead wraps within the cycle
 * instead.
 */

import type { ChordRegion } from '@/daw/store/prismSlice';
import { formatChordRegion } from '@/daw/utils/chordRegionNotation';
import {
  displayAccidentals,
  displayDegreeLabel,
} from '@/daw/utils/displayAccidentals';
import { useChordNotation } from '@/lib/chordNotation';

interface ChordChartProps {
  /** One turn of the progression — the loop's regions, cut to the cycle. */
  regions: ChordRegion[];
  /** Ticks in one turn, so the playhead can wrap inside it. */
  cycleTicks: number;
  position: number;
  isPlaying: boolean;
  /** Playing the chords makes the chart the task; improvising makes it context. */
  large: boolean;
  keyRootPc: number;
  mode: string;
}

const ACCENT = '#7ecfcf';

export function ChordChart({
  regions,
  cycleTicks,
  position,
  isPlaying,
  large,
  keyRootPc,
  mode,
}: ChordChartProps) {
  const notation = useChordNotation();
  const withinCycle = cycleTicks > 0 ? position % cycleTicks : position;

  return (
    <div
      className={`grid gap-2 ${large ? 'w-full' : 'w-full max-w-2xl'}`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, Math.min(regions.length, 8))}, minmax(0, 1fr))`,
      }}
    >
      {regions.map((region) => {
        const now =
          isPlaying &&
          withinCycle >= region.startTick &&
          withinCycle < region.endTick;
        const letter = displayAccidentals(region.noteName);
        const symbol = formatChordRegion(
          region,
          notation === 'hybrid' ? 'jazz' : notation,
          { keyRootPc, mode },
          letter,
        );
        return (
          <div
            key={region.id}
            data-now={now || undefined}
            className={`rounded-xl text-center transition-colors duration-100 ${large ? 'px-3 py-5' : 'px-2 py-1.5'}`}
            style={{
              background: now
                ? 'rgba(126,207,207,0.18)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${now ? ACCENT : 'var(--color-border)'}`,
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
              style={{ color: 'var(--color-text-dim)' }}
            >
              {displayDegreeLabel(region.name)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
