// ── useLiveUnisonAnalysis ────────────────────────────────────────────────
// Subscribes to the MusicIntelligenceBus liveChordStream and feeds new
// chords into a LiveUnisonAnalyzer instance. Pushes results back to the
// bus (liveAnalysis) and optionally updates the detected key when the
// live analyzer produces a high-confidence key estimate.

import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import {
  LiveUnisonAnalyzer,
  type LiveChordInput,
} from '@/unison/engine/liveAnalyzer';
import type { LiveChordEntry } from '@/daw/store/musicIntelligenceSlice';

/** Minimum confidence from live key detection to propagate to the bus. */
const LIVE_KEY_MIN_CONFIDENCE = 0.6;

/**
 * Drives the LiveUnisonAnalyzer from the MusicIntelligenceBus chord stream.
 *
 * Call this hook once in the DAW shell (or any component that should activate
 * live analysis). It watches `liveChordStream` and re-analyzes on each new
 * chord, storing results in `liveAnalysis` on the bus.
 */
export function useLiveUnisonAnalysis(): void {
  const analyzerRef = useRef<LiveUnisonAnalyzer | null>(null);
  const prevStreamRef = useRef<LiveChordEntry[]>([]);

  // Lazy-init the analyzer
  if (!analyzerRef.current) {
    analyzerRef.current = new LiveUnisonAnalyzer();
  }

  const liveChordStream = useStore((s) => s.liveChordStream);
  const setLiveAnalysis = useStore((s) => s.setLiveAnalysis);
  const setDetectedKey = useStore((s) => s.setDetectedKey);
  const keySource = useStore((s) => s.keySource);

  useEffect(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const prevStream = prevStreamRef.current;

    // Same array reference — nothing changed
    if (liveChordStream === prevStream) return;

    prevStreamRef.current = liveChordStream;

    // Stream was cleared
    if (liveChordStream.length === 0) {
      if (prevStream.length > 0) {
        analyzer.reset();
        setLiveAnalysis(null);
      }
      return;
    }

    // Find new chords by comparing the tail of the new stream against the
    // last entry we processed. The stream is append-only with front-trimming,
    // so new entries are always at the end.
    const lastProcessed =
      prevStream.length > 0 ? prevStream[prevStream.length - 1] : null;

    let startIdx = 0;
    if (lastProcessed) {
      // Find where our last-processed chord appears in the new stream
      for (let i = liveChordStream.length - 1; i >= 0; i--) {
        if (liveChordStream[i] === lastProcessed) {
          startIdx = i + 1;
          break;
        }
      }
    }

    // Nothing new to process
    if (startIdx >= liveChordStream.length) return;

    // Feed new chords to the analyzer
    let result = analyzer.getResult();
    for (let i = startIdx; i < liveChordStream.length; i++) {
      const chord = liveChordStream[i];
      const input: LiveChordInput = {
        rootPc: chord.rootPc,
        quality: chord.quality,
        confidence: chord.confidence,
        timestamp: chord.timestamp,
      };
      result = analyzer.pushChord(input);
    }

    // Push analysis result to bus
    setLiveAnalysis(result);

    // Propagate live key detection if no higher-priority source is set
    if (
      result.key &&
      result.key.confidence >= LIVE_KEY_MIN_CONFIDENCE &&
      keySource !== 'manual' &&
      keySource !== 'unison-offline'
    ) {
      setDetectedKey(
        result.key.rootPc,
        result.key.mode,
        result.key.confidence,
        'unison-live',
      );
    }
  }, [liveChordStream, setLiveAnalysis, setDetectedKey, keySource]);
}
