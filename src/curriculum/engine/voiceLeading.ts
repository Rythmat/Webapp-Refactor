/**
 * Phase 9 — Voice Leading Engine.
 *
 * Implements the "choose closest inversion" algorithm from Voice_Leading_System.md:
 *   - Common tones hold (stay on same MIDI note)
 *   - Remaining voices move by smallest interval
 *   - Avoid voice crossing
 *   - Bass independence: LH always root, voice leading applies to RH only
 *
 * Used by progressionPipeline.ts to connect successive chords smoothly.
 */

import type { VoicedChord } from './voicingEngine';

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

/**
 * Calculate total voice movement (sum of absolute semitone distances)
 * between two voicings of the same size.
 */
export function totalVoiceMovement(from: number[], to: number[]): number {
  const len = Math.min(from.length, to.length);
  let total = 0;
  for (let i = 0; i < len; i++) {
    total += Math.abs(from[i] - to[i]);
  }
  // Penalize size mismatch
  if (from.length !== to.length) {
    total += Math.abs(from.length - to.length) * 12;
  }
  return total;
}

/**
 * Check if a voicing has voice crossing (where a lower voice goes above
 * a higher voice relative to the original ordering).
 */
function hasVoiceCrossing(voicing: number[]): boolean {
  for (let i = 1; i < voicing.length; i++) {
    if (voicing[i] < voicing[i - 1]) return true;
  }
  return false;
}

/**
 * Generate all octave transpositions of a set of semitone offsets
 * that keep notes within a reasonable piano range.
 *
 * For each note in the target chord, we can place it in different octaves.
 * This generates candidate voicings by shifting individual notes ±1 octave.
 */
function generateCandidateVoicings(
  offsets: number[],
  chordRoot: number,
): number[][] {
  // Start with the base voicing
  const base = offsets.map((o) => chordRoot + o);
  const candidates: number[][] = [base];

  // Generate inversions by octave-shifting individual notes
  const n = offsets.length;

  // For small chords (≤4 notes), try all combinations of ±12 per note
  if (n <= 4) {
    const shifts = [-12, 0, 12];
    const count = Math.pow(shifts.length, n);
    for (let combo = 0; combo < count; combo++) {
      const voicing: number[] = [];
      let temp = combo;
      for (let i = 0; i < n; i++) {
        const shiftIdx = temp % shifts.length;
        temp = Math.floor(temp / shifts.length);
        voicing.push(chordRoot + offsets[i] + shifts[shiftIdx]);
      }
      // Sort to standard voicing order and check range
      voicing.sort((a, b) => a - b);
      if (isInPlayableRange(voicing)) {
        candidates.push(voicing);
      }
    }
  } else {
    // For larger chords, only try standard inversions (rotate + octave shift)
    for (let rotation = 1; rotation < n; rotation++) {
      const rotated = [
        ...offsets.slice(rotation),
        ...offsets.slice(0, rotation).map((o) => o + 12),
      ];
      const voicing = rotated.map((o) => chordRoot + o).sort((a, b) => a - b);
      if (isInPlayableRange(voicing)) {
        candidates.push(voicing);
      }
    }
  }

  return candidates;
}

/**
 * Check if all notes are within a reasonable RH piano range (C3 to C6).
 */
function isInPlayableRange(voicing: number[]): boolean {
  return voicing.every((n) => n >= 48 && n <= 84);
}

/**
 * Find the voicing of a target chord that minimizes total voice movement
 * from the current voicing. This is the core "choose closest inversion" algorithm.
 *
 * @param currentVoicing - Current RH MIDI notes (sorted)
 * @param targetOffsets - Target chord's semitone offsets from root (e.g., [0, 4, 7])
 * @param targetRoot - MIDI note of the target chord's root
 * @returns The target voicing (MIDI notes) with minimum voice movement
 */
export function findClosestVoicing(
  currentVoicing: number[],
  targetOffsets: number[],
  targetRoot: number,
): number[] {
  const candidates = generateCandidateVoicings(targetOffsets, targetRoot);

  // Guard: if no candidates survive filtering, return target notes at root
  if (candidates.length === 0) {
    return targetOffsets.map((o) => targetRoot + o);
  }

  let bestVoicing = candidates[0];
  let bestMovement = Infinity;

  for (const candidate of candidates) {
    // Skip voicings with voice crossing
    if (hasVoiceCrossing(candidate)) continue;

    const movement = totalVoiceMovement(currentVoicing, candidate);
    if (movement < bestMovement) {
      bestMovement = movement;
      bestVoicing = candidate;
    }
  }

  return bestVoicing;
}

// ---------------------------------------------------------------------------
// Sequence voice leading
// ---------------------------------------------------------------------------

/**
 * Apply voice leading across a sequence of voiced chords.
 *
 * Takes a sequence of VoicedChord objects (each with independently voiced RH)
 * and re-voices them so each chord connects smoothly to the next via
 * minimal voice movement.
 *
 * Rules:
 * - First chord keeps its original voicing as the anchor
 * - Each subsequent chord is re-voiced to minimize movement from the previous
 * - LH (bass) is independent — always the chord root, not voice-led
 * - Common tones are preserved where possible (implicit in proximity algorithm)
 *
 * @param chords - Array of VoicedChord objects from voicingEngine
 * @param offsets - Corresponding semitone offset arrays for each chord
 * @returns New array of VoicedChord objects with voice-led RH notes
 */
export function voiceLeadSequence(
  chords: VoicedChord[],
  offsets: number[][],
): VoicedChord[] {
  if (chords.length === 0) return [];
  if (chords.length === 1) return [...chords];

  const result: VoicedChord[] = [chords[0]]; // First chord anchors the sequence

  for (let i = 1; i < chords.length; i++) {
    const prevRh = result[i - 1].rh;
    const currentChord = chords[i];
    const currentOffsets = offsets[i];

    // Extract the chord root from the current chord's RH and LH
    // The chord root is derived from the LH (if present) or the lowest RH note
    const chordRoot =
      currentChord.lh !== null
        ? currentChord.lh + 12 // LH is root-12, so root = LH+12
        : currentChord.rh[0]; // Fallback: lowest RH note

    // Find closest voicing
    const newRh = findClosestVoicing(prevRh, currentOffsets, chordRoot);

    result.push({
      ...currentChord,
      rh: newRh,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

/**
 * Count common tones between two pitch-class sets.
 * Useful for analysis and debugging.
 */
export function countCommonTones(a: number[], b: number[]): number {
  const pcB = new Set(b.map((n) => n % 12));
  const uniqueA = Array.from(new Set(a.map((n) => n % 12)));
  return uniqueA.filter((pc) => pcB.has(pc)).length;
}
