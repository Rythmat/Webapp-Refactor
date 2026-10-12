import { useRef, useState, useCallback, useEffect } from 'react';
import { getAudioStream } from '@/daw/midi/AudioInputEnumerator';
import { yinDetectSingle } from '@/audio/pitch/YinCore';
import { midiNameInKey } from '@/daw/prism-engine/data/notes';
import { useStore } from '@/daw/store';
import { addFrameTask } from '@/daw/engine/engineClock';

// ── Constants ────────────────────────────────────────────────────────────

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
  // Spelled for the project key when one is set (Db, not C#, in Ab).
  const { rootNote, mode } = useStore.getState();
  const [, note, octave] = midiNameInKey(
    midiNote,
    rootNote ?? 0,
    rootNote !== null ? mode : undefined,
  ).match(/^([A-G][b#]*)(-?\d+)$/)!;

  return { note, octave: Number(octave), cents };
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
/** What the tuner shows, as it shows it (cents whole, Hz to 0.1). */
interface TunerReading {
  note: string;
  octave: number;
  cents: number;
  frequency: number;
}

const NO_READING: TunerReading = {
  note: '',
  octave: 0,
  cents: 0,
  frequency: 0,
};

function sameReading(a: TunerReading, b: TunerReading): boolean {
  return (
    a.note === b.note &&
    a.octave === b.octave &&
    a.cents === b.cents &&
    a.frequency === b.frequency
  );
}

export function useTuner(
  deviceId: string | null,
  externalAnalyser?: AnalyserNode | null,
) {
  const [active, setActive] = useState(false);
  const [reading, setReading] = useState<TunerReading>(NO_READING);
  const [error, setError] = useState<string | null>(null);
  const { note, octave, cents, frequency } = reading;

  // Audio resources (only used in standalone mode, null when using external analyser)
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The analysis task on the shared frame loop, while the tuner runs.
  const stopTaskRef = useRef<(() => void) | null>(null);
  const readingRef = useRef<TunerReading>(NO_READING);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isExternalRef = useRef(false);

  // Smoothing state
  const freqHistoryRef = useRef<number[]>([]);
  const lastNoteRef = useRef<string>('');
  const lastOctaveRef = useRef<number>(0);
  const noteCountRef = useRef<number>(0);
  const smoothedCentsRef = useRef<number>(0);

  /** Show `next`, rendering only when something shown changed. */
  const publish = useCallback((next: TunerReading) => {
    if (sameReading(readingRef.current, next)) return;
    readingRef.current = next;
    setReading(next);
  }, []);

  const stop = useCallback(() => {
    stopTaskRef.current?.();
    stopTaskRef.current = null;

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
    publish(NO_READING);
    setError(null);
  }, [publish]);

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
        // Unvoiced: the display holds the last note.
        if (freq <= 0) return;

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
        let shown = readingRef.current;

        if (noteKey !== lastKey) {
          noteCountRef.current++;
          if (noteCountRef.current >= NOTE_HOLD_FRAMES) {
            lastNoteRef.current = result.note;
            lastOctaveRef.current = result.octave;
            noteCountRef.current = 0;
            shown = { ...shown, note: result.note, octave: result.octave };
          }
        } else {
          noteCountRef.current = 0;
          shown = { ...shown, note: result.note, octave: result.octave };
        }

        // EMA smoothing on cents
        smoothedCentsRef.current =
          smoothedCentsRef.current * (1 - CENTS_ALPHA) +
          result.cents * CENTS_ALPHA;

        publish({
          ...shown,
          cents: Math.round(smoothedCentsRef.current),
          frequency: Math.round(smoothedFreq * 10) / 10,
        });
      };
      stopTaskRef.current = addFrameTask(tick, { name: 'tuner' });
    } catch (err) {
      console.warn('Tuner: could not start audio stream', err);
      setError('Could not access audio device');
      stop();
    }
  }, [deviceId, externalAnalyser, stop, publish]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { active, note, octave, cents, frequency, error, start, stop };
}
