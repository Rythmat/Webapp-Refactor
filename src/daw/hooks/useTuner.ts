import { useRef, useState, useCallback, useEffect } from 'react';
import { getAudioStream } from '@/daw/midi/AudioInputEnumerator';
import { yinDetectSingle } from '@/audio/pitch/YinCore';

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
const FFT_SIZE = 4096;
const RMS_THRESHOLD = 0.003;
const SMOOTHING_SIZE = 5;
const NOTE_HOLD_FRAMES = 2;
const CENTS_ALPHA = 0.3;

// ── Types ────────────────────────────────────────────────────────────────

export interface TunerResult {
  active: boolean;
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  error: string | null;
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

  const midiNote = 69 + rounded;
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;

  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

// ── Smoothing helpers ────────────────────────────────────────────────────

function medianOfArray(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Real-time chromatic tuner hook.
 *
 * @param deviceId - Audio input device ID (required for standalone mode)
 * @param externalAnalyser - Optional AnalyserNode from the DAW audio graph.
 *   When provided, reuses the existing AudioContext instead of creating a new one.
 *   This eliminates redundant AudioContext creation and enables data sharing
 *   with the chord detector (which uses the same AnalyserNode).
 */
export function useTuner(
  deviceId: string | null,
  externalAnalyser?: AnalyserNode | null,
) {
  const [active, setActive] = useState(false);
  const [note, setNote] = useState('');
  const [octave, setOctave] = useState(0);
  const [cents, setCents] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Audio resources (only used in standalone mode, null when using external analyser)
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isExternalRef = useRef(false);

  // Smoothing state
  const freqHistoryRef = useRef<number[]>([]);
  const lastNoteRef = useRef<string>('');
  const lastOctaveRef = useRef<number>(0);
  const noteCountRef = useRef<number>(0);
  const smoothedCentsRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    // Only release audio resources in standalone mode
    if (!isExternalRef.current) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
    }
    analyserRef.current = null;
    isExternalRef.current = false;

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
    // Stop any previous session
    stop();

    try {
      let analyser: AnalyserNode;
      let sampleRate: number;

      if (externalAnalyser) {
        // Integrated mode: reuse DAW's audio graph
        analyser = externalAnalyser;
        sampleRate = analyser.context.sampleRate;
        isExternalRef.current = true;
      } else {
        // Standalone mode: create our own AudioContext
        if (!deviceId) return;

        const stream = await getAudioStream(deviceId);
        streamRef.current = stream;

        const ctx = new AudioContext();
        ctxRef.current = ctx;
        sampleRate = ctx.sampleRate;

        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        source.connect(analyser);

        // Listen for device disconnect
        stream.getTracks().forEach((track) => {
          track.onended = () => {
            setError('Device disconnected');
            stop();
          };
        });
      }

      analyserRef.current = analyser;
      setActive(true);
      setError(null);

      const buf = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);

        // Use shared YinCore for pitch detection
        const freq = yinDetectSingle(buf, sampleRate, {
          minFreq: 27,
          maxFreq: 1200,
          rmsThreshold: RMS_THRESHOLD,
        });

        if (freq > 0) {
          // Median filter on frequency
          const history = freqHistoryRef.current;
          history.push(freq);
          if (history.length > SMOOTHING_SIZE) history.shift();

          const smoothedFreq =
            history.length >= 3 ? medianOfArray(history) : freq;

          const result = freqToNote(smoothedFreq);

          // Note hysteresis — only switch if new note holds for N frames
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

          // EMA smoothing on cents
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
  }, [deviceId, externalAnalyser, stop]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { active, note, octave, cents, frequency, error, start, stop };
}
