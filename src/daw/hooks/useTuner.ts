import { useRef, useState, useCallback, useEffect } from 'react';
import { getAudioStream } from '@/daw/midi/AudioInputEnumerator';

// ── Constants ────────────────────────────────────────────────────────────

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const A4_FREQ = 440;
const MIN_FREQ = 27; // Phase 2: ~A0 — covers drop-tuned 5-string bass
const MAX_FREQ = 1200; // Well above high E4 guitar string
const FFT_SIZE = 4096; // Phase 1: doubled from 2048 for better low-freq detection
const YIN_THRESHOLD = 0.15; // Phase 5: YIN confidence threshold
const RMS_THRESHOLD = 0.003; // Phase 4: lowered from 0.01 for quiet instruments
const SMOOTHING_SIZE = 5; // Phase 6: median filter window
const NOTE_HOLD_FRAMES = 2; // Phase 6: frames before switching displayed note
const CENTS_ALPHA = 0.3; // Phase 6: EMA smoothing factor for cents

// ── Types ────────────────────────────────────────────────────────────────

export interface TunerResult {
  active: boolean;
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  error: string | null;
}

// ── YIN Pitch Detection (Phase 5) ────────────────────────────────────────
// Ported from PitchAnalyzer.ts — superior to raw autocorrelation for
// fundamental detection, eliminates octave-jumping errors.

function yinDetect(buf: Float32Array, sampleRate: number): number {
  // Phase 4: check RMS
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < RMS_THRESHOLD) return -1;

  const halfLen = Math.floor(buf.length / 2);
  const diff = new Float32Array(halfLen);
  const cmndf = new Float32Array(halfLen);

  // Step 1: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const d = buf[i] - buf[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  // Step 3: Absolute threshold search
  const minPeriod = Math.floor(sampleRate / MAX_FREQ);
  const maxPeriod = Math.min(Math.floor(sampleRate / MIN_FREQ), halfLen);

  let tauEstimate = -1;
  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (cmndf[tau] < YIN_THRESHOLD) {
      // Walk past the dip to find the local minimum
      while (tau + 1 < halfLen && cmndf[tau + 1] < cmndf[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return -1;

  // Step 4: Parabolic interpolation for sub-sample accuracy
  const t = tauEstimate;
  if (t > 0 && t < halfLen - 1) {
    const s0 = cmndf[t - 1];
    const s1 = cmndf[t];
    const s2 = cmndf[t + 1];
    const denom = s0 - 2 * s1 + s2;
    if (denom !== 0) {
      const shift = (s0 - s2) / (2 * denom);
      if (Math.abs(shift) < 1) {
        return sampleRate / (t + shift);
      }
    }
  }

  return sampleRate / t;
}

// ── Frequency → Note conversion ──────────────────────────────────────────

function freqToNote(freq: number): {
  note: string;
  octave: number;
  cents: number;
} {
  const semitones = 12 * Math.log2(freq / A4_FREQ);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);

  // A4 is MIDI note 69 → note index 9 (A), octave 4
  const midiNote = 69 + rounded;
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;

  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

// ── Smoothing helpers (Phase 6) ──────────────────────────────────────────

function medianOfArray(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useTuner(deviceId: string | null) {
  const [active, setActive] = useState(false);
  const [note, setNote] = useState('');
  const [octave, setOctave] = useState(0);
  const [cents, setCents] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Phase 6: smoothing refs
  const freqHistoryRef = useRef<number[]>([]);
  const lastNoteRef = useRef<string>('');
  const lastOctaveRef = useRef<number>(0);
  const noteCountRef = useRef<number>(0);
  const smoothedCentsRef = useRef<number>(0);

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

    // Reset smoothing state
    freqHistoryRef.current = [];
    lastNoteRef.current = '';
    lastOctaveRef.current = 0;
    noteCountRef.current = 0;
    smoothedCentsRef.current = 0;

    setActive(false);
    setNote('');
    setOctave(0);
    setCents(0);
    setFrequency(0);
    setError(null);
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
      analyser.fftSize = FFT_SIZE; // Phase 1: increased buffer
      source.connect(analyser);
      analyserRef.current = analyser;

      // Phase 10: listen for device disconnect
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setError('Device disconnected');
          stop();
        };
      });

      setActive(true);
      setError(null);

      const buf = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);

        const freq = yinDetect(buf, ctx.sampleRate);
        if (freq > 0) {
          // Phase 6: median filter on frequency
          const history = freqHistoryRef.current;
          history.push(freq);
          if (history.length > SMOOTHING_SIZE) history.shift();

          const smoothedFreq =
            history.length >= 3 ? medianOfArray(history) : freq;

          const result = freqToNote(smoothedFreq);

          // Phase 6: note hysteresis — only switch if new note holds for N frames
          const noteKey = `${result.note}${result.octave}`;
          const lastKey = `${lastNoteRef.current}${lastOctaveRef.current}`;

          if (noteKey !== lastKey) {
            noteCountRef.current++;
            if (noteCountRef.current >= NOTE_HOLD_FRAMES) {
              lastNoteRef.current = result.note;
              lastOctaveRef.current = result.octave;
              noteCountRef.current = 0;
              setNote(result.note);
              setOctave(result.octave);
            }
          } else {
            noteCountRef.current = 0;
            setNote(result.note);
            setOctave(result.octave);
          }

          // Phase 6: EMA smoothing on cents
          smoothedCentsRef.current =
            smoothedCentsRef.current * (1 - CENTS_ALPHA) +
            result.cents * CENTS_ALPHA;
          setCents(Math.round(smoothedCentsRef.current));

          setFrequency(Math.round(smoothedFreq * 10) / 10);
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('Tuner: could not start audio stream', err);
      setError('Could not access audio device');
      stop();
    }
  }, [deviceId, stop]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { active, note, octave, cents, frequency, error, start, stop };
}
