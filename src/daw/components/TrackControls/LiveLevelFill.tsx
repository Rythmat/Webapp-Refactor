import { memo, useRef } from 'react';
import { useMeterFill } from '@/daw/hooks/useMeterLevel';

interface LiveLevelFillProps {
  analyser: AnalyserNode | null;
  /** A second channel: the fill then shows the mean of the two. */
  analyserR?: AnalyserNode | null;
}

/**
 * The live level fill behind a header's volume slider (visual only, it
 * ignores the slider's value). The meter loop paints its width and colour
 * through a ref, so neither this bar nor the header around it re-renders
 * while the level moves.
 */
export const LiveLevelFill = memo(function LiveLevelFill({
  analyser,
  analyserR = null,
}: LiveLevelFillProps) {
  const ref = useRef<HTMLDivElement>(null);
  useMeterFill(ref, analyser, analyserR);
  return (
    <div
      ref={ref}
      className="absolute inset-y-0 left-0 rounded-full transition-none"
      style={{ width: '0%' }}
    />
  );
});
