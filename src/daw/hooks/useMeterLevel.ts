import { useEffect, useRef, useState } from 'react';

const PEAK_DECAY = 0.9; // multiplier per frame (~60fps → falls to ~0 in ~35 frames)

/**
 * Reads peak amplitude from an AnalyserNode via requestAnimationFrame.
 * Returns a level in the range 0–100 for direct use with MeterSegments.
 *
 * Pass null when no analyser is available; the hook returns 0 and skips the RAF loop.
 */
export function useMeterLevel(analyser: AnalyserNode | null): number {
  const [level, setLevel] = useState(0);
  const peakRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser) {
      setLevel(0);
      return;
    }

    const buffer = new Uint8Array(analyser.fftSize);

    function tick() {
      analyser!.getByteTimeDomainData(buffer);

      // Peak absolute deviation from 128 (the zero-signal midpoint)
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i] - 128);
        if (abs > peak) peak = abs;
      }

      // Map 0–128 deviation to 0–100
      const instantLevel = (peak / 128) * 100;

      // Peak hold with exponential decay
      if (instantLevel > peakRef.current) {
        peakRef.current = instantLevel;
      } else {
        peakRef.current *= PEAK_DECAY;
      }

      setLevel(Math.round(peakRef.current));
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      peakRef.current = 0;
      setLevel(0);
    };
  }, [analyser]);

  return level;
}
