import { useEffect, useRef, useState } from 'react';
import { YinDetector } from '@/audio/pitch/YinCore';

// ── Harmonic pitch ─────────────────────────────────────────────────────────
// YIN on the guitar input's clean tuner tap, about 25 times a second, up to
// 2.1 kHz: the 6th partial of the high E string (1.98 kHz) is past the
// tuner's own 1.2 kHz ceiling. Each frame is handed on as a reading (Hz,
// time) or as silence; the live pitch is also kept in state, for the meter.

const FRAME = 2048;
const INTERVAL_MS = 40;
const MIN_HZ = 70;
const MAX_HZ = 2100;
/** Below this RMS the string has stopped (or wasn't plucked). */
const SILENCE_RMS = 0.006;
/** Frames in a row without a pitch before it counts as silence. */
const SILENT_FRAMES = 4;

export interface HarmonicPitchHandlers {
  onReading: (hz: number, t: number) => void;
  onSilence: () => void;
}

export function useHarmonicPitch(
  analyser: AnalyserNode | null,
  handlers: HarmonicPitchHandlers,
): { hz: number | null } {
  const [hz, setHz] = useState<number | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!analyser) return;
    const size = Math.max(FRAME, analyser.fftSize);
    const buffer = new Float32Array(analyser.fftSize);
    const frameLength = Math.min(FRAME, size);
    const yin = new YinDetector({
      frameLength,
      sampleRate: analyser.context.sampleRate,
      minFreq: MIN_HZ,
      maxFreq: MAX_HZ,
      threshold: 0.15,
    });
    let quiet = 0;
    let last = 0;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < INTERVAL_MS) return;
      last = now;
      analyser.getFloatTimeDomainData(buffer);
      const offset = buffer.length - frameLength;
      let sum = 0;
      for (let i = offset; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / frameLength);
      const pitch = rms >= SILENCE_RMS ? yin.detect(buffer, offset) : 0;
      if (pitch > 0) {
        quiet = 0;
        setHz(pitch);
        handlersRef.current.onReading(pitch, now);
      } else if (++quiet === SILENT_FRAMES) {
        setHz(null);
        handlersRef.current.onSilence();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return { hz };
}
