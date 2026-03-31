import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

interface AnalyserData {
  waveform: Float32Array;
  fft: Float32Array;
}

/**
 * Wraps Tone.Analyser to provide real-time waveform and FFT data.
 * Connects to the given Tone source node (or Tone.getDestination() by default).
 *
 * Returns refs that update every animation frame — read in canvas draw calls.
 */
export function useAnalyser(
  source?: Tone.ToneAudioNode | null,
  fftSize = 256,
) {
  const waveformAnalyser = useRef<Tone.Analyser | null>(null);
  const fftAnalyser = useRef<Tone.Analyser | null>(null);
  const dataRef = useRef<AnalyserData>({
    waveform: new Float32Array(fftSize),
    fft: new Float32Array(fftSize / 2),
  });
  const rafRef = useRef<number>();

  useEffect(() => {
    const waveA = new Tone.Analyser('waveform', fftSize);
    const fftA = new Tone.Analyser('fft', fftSize / 2);
    waveformAnalyser.current = waveA;
    fftAnalyser.current = fftA;

    const src = source ?? Tone.getDestination();
    src.connect(waveA);
    src.connect(fftA);

    const update = () => {
      const waveValues = waveA.getValue();
      const fftValues = fftA.getValue();

      if (waveValues instanceof Float32Array) {
        dataRef.current.waveform = waveValues;
      }
      if (fftValues instanceof Float32Array) {
        dataRef.current.fft = fftValues;
      }

      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      src.disconnect(waveA);
      src.disconnect(fftA);
      waveA.dispose();
      fftA.dispose();
    };
  }, [source, fftSize]);

  const getData = useCallback(() => dataRef.current, []);

  return { getData, dataRef };
}
