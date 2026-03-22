/**
 * Voice Leading Analyzer
 *
 * Compares consecutive chord voicings and produces per-transition metrics
 * (smoothness, common tones, contrary motion, parallel fifths) plus an
 * aggregate summary.
 */

import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type {
  UnisonChordRegion,
  VoiceLeadingTransition,
  VoiceLeadingSummary,
} from '../types/schema';

/**
 * Analyze voice leading across a chord timeline.
 *
 * @param chords    The enriched chord timeline (from analyzeHarmony)
 * @param allEvents All MIDI note events (used to extract voicing per region)
 */
export function analyzeVoiceLeading(
  chords: UnisonChordRegion[],
  allEvents: MidiNoteEvent[],
): VoiceLeadingSummary | null {
  if (chords.length < 2) return null;

  const transitions: VoiceLeadingTransition[] = [];

  for (let i = 0; i < chords.length - 1; i++) {
    const voicingA = getVoicing(chords[i], allEvents);
    const voicingB = getVoicing(chords[i + 1], allEvents);

    if (voicingA.length === 0 || voicingB.length === 0) continue;

    transitions.push(
      computeTransition(chords[i].id, chords[i + 1].id, voicingA, voicingB),
    );
  }

  if (transitions.length === 0) return null;

  const avgSmoothness =
    transitions.reduce((sum, t) => sum + t.smoothness, 0) / transitions.length;
  const commonToneCount = transitions.filter((t) => t.commonTones > 0).length;
  const parallelFifthCount = transitions.filter((t) => t.parallelFifths).length;

  return {
    transitions,
    avgSmoothness: Math.round(avgSmoothness * 100) / 100,
    commonTonePercentage:
      Math.round((commonToneCount / transitions.length) * 100) / 100,
    parallelFifthCount,
  };
}

/**
 * Extract unique sorted MIDI pitches for a chord region from events.
 */
function getVoicing(
  chord: UnisonChordRegion,
  allEvents: MidiNoteEvent[],
): number[] {
  const notes = allEvents
    .filter(
      (e) => e.startTick >= chord.startTick && e.startTick < chord.endTick,
    )
    .map((e) => e.note);

  // Deduplicate and sort ascending
  return [...new Set(notes)].sort((a, b) => a - b);
}

/**
 * Compute voice leading metrics between two voicings.
 * Uses greedy nearest-neighbor matching for voice pairing.
 */
function computeTransition(
  fromId: string,
  toId: string,
  voicingA: number[],
  voicingB: number[],
): VoiceLeadingTransition {
  // Match voices by minimal motion (greedy nearest-neighbor)
  const pairs = matchVoices(voicingA, voicingB);

  let totalMotion = 0;
  let maxMovement = 0;
  let commonTones = 0;

  for (const [a, b] of pairs) {
    const motion = Math.abs(b - a);
    totalMotion += motion;
    if (motion > maxMovement) maxMovement = motion;
    if (motion === 0) commonTones++;
  }

  // Contrary motion: outer voices move in opposite directions
  const contraryMotion = detectContraryMotion(pairs);

  // Parallel fifths: two voices both maintain a perfect fifth apart
  const parallelFifths = detectParallelFifths(pairs);

  // Smoothness: 1 = all common tones, 0 = large jumps
  const voiceCount = pairs.length;
  const smoothness =
    voiceCount > 0
      ? Math.max(0, Math.min(1, 1 - totalMotion / (voiceCount * 12)))
      : 0;

  return {
    fromChordId: fromId,
    toChordId: toId,
    totalSemitoneMotion: totalMotion,
    maxVoiceMovement: maxMovement,
    commonTones,
    contraryMotion,
    parallelFifths,
    smoothness: Math.round(smoothness * 100) / 100,
  };
}

/**
 * Greedy nearest-neighbor voice matching.
 * Pairs each voice in A with the closest unmatched voice in B.
 */
function matchVoices(
  voicingA: number[],
  voicingB: number[],
): Array<[number, number]> {
  const shorter = voicingA.length <= voicingB.length ? voicingA : voicingB;
  const longer = voicingA.length <= voicingB.length ? voicingB : voicingA;
  const isAFirst = voicingA.length <= voicingB.length;

  const used = new Set<number>();
  const pairs: Array<[number, number]> = [];

  for (const note of shorter) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let j = 0; j < longer.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(note - longer[j]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      used.add(bestIdx);
      pairs.push(isAFirst ? [note, longer[bestIdx]] : [longer[bestIdx], note]);
    }
  }

  return pairs;
}

/**
 * Detect contrary motion: outer voices (lowest and highest) move
 * in opposite directions.
 */
function detectContraryMotion(pairs: Array<[number, number]>): boolean {
  if (pairs.length < 2) return false;

  // Find lowest and highest pairs by the "from" note
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  const lowestMotion = lowest[1] - lowest[0];
  const highestMotion = highest[1] - highest[0];

  // Contrary = one goes up, the other goes down
  return (
    (lowestMotion > 0 && highestMotion < 0) ||
    (lowestMotion < 0 && highestMotion > 0)
  );
}

/**
 * Detect parallel fifths: two voice pairs that are a perfect fifth
 * apart in both chords A and B, and both voices move in the same direction.
 */
function detectParallelFifths(pairs: Array<[number, number]>): boolean {
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const intervalA = Math.abs(pairs[i][0] - pairs[j][0]) % 12;
      const intervalB = Math.abs(pairs[i][1] - pairs[j][1]) % 12;

      // Both intervals are a perfect fifth (7 semitones)
      if (intervalA === 7 && intervalB === 7) {
        // Both voices must have moved (not static) and in the same direction
        const motionI = pairs[i][1] - pairs[i][0];
        const motionJ = pairs[j][1] - pairs[j][0];
        if (
          motionI !== 0 &&
          motionJ !== 0 &&
          Math.sign(motionI) === Math.sign(motionJ)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}
