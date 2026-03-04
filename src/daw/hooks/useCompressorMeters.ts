import { useEffect, useRef, useState } from 'react';
import type { EffectChain } from '@/daw/audio/EffectChain';

// ── useCompressorMeters ──────────────────────────────────────────────────
// Polls the EffectChain's pre/post compressor analysers and gain reduction
// at ~30fps. Returns levels in 0–100 range for direct use with FxMeter.

interface CompressorMeters {
  gr: number;   // gain reduction (0–100, where 100 = heavy compression)
  inLevel: number;  // pre-compressor level 0–100
  outLevel: number; // post-compressor level 0–100
}

const PEAK_DECAY = 0.9;

export function useCompressorMeters(effectChain: EffectChain | null): CompressorMeters {
  const [meters, setMeters] = useState<CompressorMeters>({ gr: 0, inLevel: 0, outLevel: 0 });
  const peaksRef = useRef({ gr: 0, inLevel: 0, outLevel: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!effectChain) {
      setMeters({ gr: 0, inLevel: 0, outLevel: 0 });
      return;
    }

    const preAnalyser = effectChain.getPreCompAnalyser();
    const postAnalyser = effectChain.getPostCompAnalyser();
    const preBuf = new Uint8Array(preAnalyser.fftSize);
    const postBuf = new Uint8Array(postAnalyser.fftSize);
    let lastUpdate = 0;

    function readPeak(analyser: AnalyserNode, buffer: Uint8Array): number {
      analyser.getByteTimeDomainData(buffer as Uint8Array<ArrayBuffer>);
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i] - 128);
        if (abs > peak) peak = abs;
      }
      return (peak / 128) * 100;
    }

    function tick(now: number) {
      // Throttle to ~30fps
      if (now - lastUpdate >= 33) {
        const inInstant = readPeak(preAnalyser, preBuf);
        const outInstant = readPeak(postAnalyser, postBuf);

        // GR: compressor.reduction is a negative dB value (e.g. -6 means 6dB of compression)
        const grDb = Math.abs(effectChain!.getGainReduction());
        // Map 0–24 dB to 0–100
        const grInstant = Math.min(100, (grDb / 24) * 100);

        const peaks = peaksRef.current;

        peaks.inLevel = inInstant > peaks.inLevel ? inInstant : peaks.inLevel * PEAK_DECAY;
        peaks.outLevel = outInstant > peaks.outLevel ? outInstant : peaks.outLevel * PEAK_DECAY;
        peaks.gr = grInstant > peaks.gr ? grInstant : peaks.gr * PEAK_DECAY;

        setMeters({
          gr: Math.round(peaks.gr),
          inLevel: Math.round(peaks.inLevel),
          outLevel: Math.round(peaks.outLevel),
        });
        lastUpdate = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      peaksRef.current = { gr: 0, inLevel: 0, outLevel: 0 };
      setMeters({ gr: 0, inLevel: 0, outLevel: 0 });
    };
  }, [effectChain]);

  return meters;
}
