// ── instrumentPitchProfiles ────────────────────────────────────────────────
// Per-instrument tuning for the Guitar/Bass-to-MIDI detection pipeline.
//
// The v2 detection engine (ProbabilisticOrchestrator) is instrument-agnostic
// but defaults to a piano range. These profiles retune the YIN search range,
// analyser FFT sizes, and mono/poly default for guitar and bass.
//
// Physical constraints that drive the FFT sizes:
//   - Guitar low-E = 82.4 Hz. FFT 2048 @ 48 kHz resolves down to ~47 Hz, so the
//     piano-default fast/hi-res sizes (2048/8192) cover guitar comfortably.
//   - Bass low-E = 41.2 Hz, low-B = 30.9 Hz (5-string). FFT 2048 can't resolve
//     below ~47 Hz, so bass must use larger analysers (4096 fast / 16384 hi-res)
//     to see its lowest notes — at the cost of higher latency (~150 ms). Bass is
//     monophonic, so this is an acceptable trade.

import type { DetectionMode } from '@/learn/audio/v2/types';

export interface PitchDetectProfile {
  /** Lowest fundamental to search for (Hz). */
  minFreq: number;
  /** Highest fundamental to search for (Hz). */
  maxFreq: number;
  /** Default detection mode for this instrument. */
  defaultMode: DetectionMode;
  /** Onset analyser FFT size (sub-frame onset precision). */
  onsetFftSize: number;
  /** Fast-path YIN analyser FFT size (low latency). */
  fastFftSize: number;
  /** Hi-res YIN + NMF analyser FFT size (frequency resolution). */
  hiResFftSize: number;
  /** Whether polyphonic mode is offered for this instrument. */
  allowPolyphonic: boolean;
}

/** Guitar: E2 (82 Hz) → ~E6; polyphonic (chords) with a mono lead option. */
export const GUITAR_PITCH_PROFILE: PitchDetectProfile = {
  minFreq: 75, // a little below E2 for detuned/flat strings
  maxFreq: 1320, // ~E6, above the 24th fret on the high E string
  defaultMode: 'polyphonic',
  onsetFftSize: 512,
  fastFftSize: 2048,
  hiResFftSize: 8192,
  allowPolyphonic: true,
};

/** Bass: low-B (31 Hz) → ~G4; monophonic, larger FFTs to resolve low notes. */
export const BASS_PITCH_PROFILE: PitchDetectProfile = {
  minFreq: 28, // below low-B (30.9 Hz) for detuned 5-strings
  maxFreq: 400, // ~G4, comfortably above a bass's usable range
  defaultMode: 'monophonic',
  onsetFftSize: 512,
  fastFftSize: 4096,
  // 8192 = 171ms window. YIN is time-domain autocorrelation whose search range
  // is bounded by minFreq (period ≤ 48000/28 ≈ 1714 samples), NOT by FFT size —
  // so the 4096 fast path already resolves low-B (28Hz) and 8192 keeps ~2.4 low-B
  // periods for the hi-res correction. A 16384 window would only add a 341ms
  // latency floor + ~4× YIN cost for zero extra pitch reach.
  hiResFftSize: 8192,
  allowPolyphonic: false,
};

/** Resolve a profile from a track's instrument type. */
export function pitchProfileForInstrument(
  instrument: string,
): PitchDetectProfile {
  return instrument === 'bass-fx' ? BASS_PITCH_PROFILE : GUITAR_PITCH_PROFILE;
}
