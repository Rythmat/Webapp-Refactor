import { useRef, useState, useCallback, useEffect } from 'react';
import { getAudioStream } from '@/daw/midi/AudioInputEnumerator';

// ── Constants ────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQ = 440;
const MIN_FREQ = 60;   // ~B1 — lowest guitar/bass note we care about
const MAX_FREQ = 1200;  // Well above high E4 guitar string

// ── Types ────────────────────────────────────────────────────────────────

export interface TunerResult {
  active: boolean;
  note: string;
  octave: number;
  cents: number;
  frequency: number;
}

// ── Pitch Detection (Autocorrelation) ────────────────────────────────────

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  // Check if there's enough signal (RMS threshold)
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return -1; // Too quiet

  // Trim leading/trailing silence for better correlation
  let r1 = 0;
  let r2 = buf.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < buf.length / 2; i++) {
    if (Math.abs(buf[i]) < threshold) { r1 = i; } else break;
  }
  for (let i = 1; i < buf.length / 2; i++) {
    if (Math.abs(buf[buf.length - i]) < threshold) { r2 = buf.length - i; } else break;
  }

  const trimmed = buf.slice(r1, r2);
  const len = trimmed.length;

  // Autocorrelation
  const corr = new Float32Array(len);
  for (let lag = 0; lag < len; lag++) {
    let sum = 0;
    for (let i = 0; i < len - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    corr[lag] = sum;
  }

  // Find first dip then first peak
  let d = 0;
  while (d < len && corr[d] > corr[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < len; i++) {
    if (corr[i] > maxVal) {
      maxVal = corr[i];
      maxPos = i;
    }
  }

  if (maxPos === -1) return -1;

  // Parabolic interpolation for sub-sample accuracy
  const y1 = maxPos > 0 ? corr[maxPos - 1] : corr[maxPos];
  const y2 = corr[maxPos];
  const y3 = maxPos < len - 1 ? corr[maxPos + 1] : corr[maxPos];
  const shift = (y3 - y1) / (2 * (2 * y2 - y1 - y3));
  const period = maxPos + (Number.isFinite(shift) ? shift : 0);

  const freq = sampleRate / period;
  if (freq < MIN_FREQ || freq > MAX_FREQ) return -1;
  return freq;
}

// ── Frequency → Note conversion ──────────────────────────────────────────

function freqToNote(freq: number): { note: string; octave: number; cents: number } {
  const semitones = 12 * Math.log2(freq / A4_FREQ);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);

  // A4 is MIDI note 69 → note index 9 (A), octave 4
  const midiNote = 69 + rounded;
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;

  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useTuner(deviceId: string | null) {
  const [active, setActive] = useState(false);
  const [note, setNote] = useState('');
  const [octave, setOctave] = useState(0);
  const [cents, setCents] = useState(0);
  const [frequency, setFrequency] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    analyserRef.current = null;
    setActive(false);
    setNote('');
    setOctave(0);
    setCents(0);
    setFrequency(0);
  }, []);

  const start = useCallback(async () => {
    if (!deviceId) return;

    // Stop any previous session
    stop();

    try {
      const stream = await getAudioStream(deviceId);
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setActive(true);

      const buf = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);

        const freq = autoCorrelate(buf, ctx.sampleRate);
        if (freq > 0) {
          const result = freqToNote(freq);
          setNote(result.note);
          setOctave(result.octave);
          setCents(result.cents);
          setFrequency(Math.round(freq * 10) / 10);
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('Tuner: could not start audio stream', err);
      stop();
    }
  }, [deviceId, stop]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { active, note, octave, cents, frequency, start, stop };
}
