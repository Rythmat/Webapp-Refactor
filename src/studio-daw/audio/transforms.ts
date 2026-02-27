import { AudioAnalysis } from './audio-analysis';

export interface TransformSuggestion {
  type: 'pitch_shift' | 'tempo_match' | 'filter' | 'normalize';
  description: string;
  params: Record<string, number>;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Parse a key string like "C minor" into { root: number, mode: 'major' | 'minor' }.
 */
function parseKey(key: string): { root: number; mode: 'major' | 'minor' } | null {
  const match = key.match(/^([A-G]#?)\s*(major|minor)$/i);
  if (!match) return null;
  const rootIdx = PITCH_NAMES.indexOf(match[1]);
  if (rootIdx === -1) return null;
  return { root: rootIdx, mode: match[2].toLowerCase() as 'major' | 'minor' };
}

/**
 * Compute the smallest semitone shift to move fromKey to toKey.
 * Returns a value from -6 to +6.
 */
export function computeSemitoneShift(fromKey: string, toKey: string): number {
  const from = parseKey(fromKey);
  const to = parseKey(toKey);
  if (!from || !to) return 0;

  // If modes differ, use relative major/minor conversion:
  // C minor relative major = Eb major (+3), A major relative minor = F# minor (+0 root)
  let fromRoot = from.root;
  let toRoot = to.root;

  // Normalize to same mode for comparison
  if (from.mode !== to.mode) {
    if (from.mode === 'minor') {
      fromRoot = (fromRoot + 3) % 12; // relative major
    } else {
      fromRoot = (fromRoot + 9) % 12; // relative minor
    }
  }

  let diff = toRoot - fromRoot;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}

/**
 * Circle of Fifths distance between two keys (0-6).
 */
export function circleOfFifthsDistance(key1: string, key2: string): number {
  const k1 = parseKey(key1);
  const k2 = parseKey(key2);
  if (!k1 || !k2) return 0;

  // Normalize to major for comparison
  const root1 = k1.mode === 'minor' ? (k1.root + 3) % 12 : k1.root;
  const root2 = k2.mode === 'minor' ? (k2.root + 3) % 12 : k2.root;

  // Circle of fifths order: C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F
  const fifthsOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  const pos1 = fifthsOrder.indexOf(root1);
  const pos2 = fifthsOrder.indexOf(root2);

  const dist = Math.abs(pos1 - pos2);
  return Math.min(dist, 12 - dist);
}

/**
 * Pitch shift an AudioBuffer by a given number of semitones.
 * Uses OfflineAudioContext with playbackRate.
 */
export async function pitchShift(buffer: AudioBuffer, semitones: number): Promise<AudioBuffer> {
  if (semitones === 0) return buffer;

  const playbackRate = Math.pow(2, semitones / 12);
  const newDuration = buffer.duration / playbackRate;
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.sampleRate * newDuration),
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/**
 * Time-stretch an AudioBuffer to match a target BPM.
 * Simple version using playbackRate (also shifts pitch).
 */
export async function tempoMatch(buffer: AudioBuffer, currentBPM: number, targetBPM: number): Promise<AudioBuffer> {
  if (currentBPM === 0 || targetBPM === 0) return buffer;
  const ratio = targetBPM / currentBPM;
  if (Math.abs(ratio - 1) < 0.02) return buffer; // Within 2%, skip
  const semitones = 12 * Math.log2(ratio);
  return pitchShift(buffer, semitones);
}

/**
 * Apply a frequency filter to shape spectral content.
 */
export async function applyFilter(
  buffer: AudioBuffer,
  type: BiquadFilterType,
  frequency: number,
  Q: number = 1,
  gain: number = 0
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const filter = offlineCtx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = Q;
  filter.gain.value = gain;

  source.connect(filter);
  filter.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/**
 * Suggest transformations to improve compatibility with the arrangement.
 */
export function suggestTransformations(
  clipAnalysis: AudioAnalysis,
  foundationAnalysis: AudioAnalysis | undefined,
  projectBPM: number
): TransformSuggestion[] {
  const suggestions: TransformSuggestion[] = [];

  // Key matching: suggest pitch shift to match foundation
  if (clipAnalysis.key && foundationAnalysis?.key) {
    const semitones = computeSemitoneShift(clipAnalysis.key, foundationAnalysis.key);
    if (semitones !== 0 && Math.abs(semitones) <= 6) {
      const direction = semitones > 0 ? 'up' : 'down';
      suggestions.push({
        type: 'pitch_shift',
        description: `Shift ${direction} ${Math.abs(semitones)} semitones to match ${foundationAnalysis.key}`,
        params: { semitones },
      });
    }
  }

  // BPM matching
  if (clipAnalysis.bpm && projectBPM > 0) {
    const ratio = clipAnalysis.bpm / projectBPM;
    // Only suggest if not already in a harmonic tempo relationship
    const isHarmonic = [0.5, 1, 2, 0.75, 1.5].some(r => Math.abs(ratio - r) < 0.05);
    if (!isHarmonic) {
      suggestions.push({
        type: 'tempo_match',
        description: `Adjust tempo from ${clipAnalysis.bpm} to ${projectBPM} BPM`,
        params: { currentBPM: clipAnalysis.bpm, targetBPM: projectBPM },
      });
    }
  }

  // Brightness adjustment
  if (clipAnalysis.spectralCentroid > 0.75) {
    suggestions.push({
      type: 'filter',
      description: 'Apply low-pass filter to reduce brightness',
      params: { type: 0, frequency: 3000, Q: 0.7 }, // lowpass
    });
  } else if (clipAnalysis.spectralCentroid < 0.15 && foundationAnalysis && clipAnalysis !== foundationAnalysis) {
    suggestions.push({
      type: 'filter',
      description: 'Apply high-pass filter to reduce muddiness',
      params: { type: 1, frequency: 150, Q: 0.7 }, // highpass
    });
  }

  return suggestions;
}
