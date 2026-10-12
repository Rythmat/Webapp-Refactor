import { memo, useRef } from 'react';
import { useMeterFill } from '@/daw/hooks/useMeterLevel';

interface LiveLevelFillProps {
  /** The meter bus source to show ('track:<id>', 'master'). Preferred. */
  meterKey?: string | null;
  /** Older callers: an analyser they hold. Ignored when meterKey is set. */
  analyser?: AnalyserNode | null;
  /** A second channel: the fill then shows the mean of the two. */
  analyserR?: AnalyserNode | null;
}

/**
 * The live level fill behind a header's volume slider (visual only, it
 * ignores the slider's value). The meter bus paints its width and colour
 * through a ref, so neither this bar nor the header around it re-renders
 * while the level moves. With a meterKey the bus finds the analyser itself,
 * so the fill keeps working when the track's engine is rebuilt.
 */
export const LiveLevelFill = memo(function LiveLevelFill({
  meterKey = null,
  analyser = null,
  analyserR = null,
}: LiveLevelFillProps) {
  const ref = useRef<HTMLDivElement>(null);
  useMeterFill(ref, meterKey ?? analyser, meterKey ? null : analyserR);
  return (
    <div
      ref={ref}
      className="absolute inset-y-0 left-0 rounded-full transition-none"
      style={{ width: '0%' }}
    />
  );
});
