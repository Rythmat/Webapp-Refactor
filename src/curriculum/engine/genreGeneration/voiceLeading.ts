// src/curriculum/engine/genreGeneration/voiceLeading.ts

export interface VoiceLeadingResult {
  valid: boolean;
  totalMovement: number;
  maxSingleVoice: number;
  violations: VoiceLeadingViolation[];
}

export interface VoiceLeadingViolation {
  voiceIndex: number;
  fromMidi: number;
  toMidi: number;
  movement: number;
  message: string;
}

// Maximum single-voice movement by style context
const MAX_BY_STYLE: Record<string, number> = {
  default: 7, // perfect 5th — hard limit for most styles
  jazz_l3: 14, // octave — wide two-hand voicings allowed
  neo_soul_parallel: Infinity, // parallel motion — proximity check skipped
};

/**
 * Check voice leading between two voicings.
 * fromVoicing and toVoicing must have the same number of voices.
 * All values are absolute MIDI note numbers.
 */
export function checkVoiceLeading(
  fromVoicing: number[],
  toVoicing: number[],
  styleContext: keyof typeof MAX_BY_STYLE = 'default',
): VoiceLeadingResult {
  if (styleContext === 'neo_soul_parallel') {
    return {
      valid: true,
      totalMovement: 0,
      maxSingleVoice: 0,
      violations: [],
    };
  }

  const maxAllowed = MAX_BY_STYLE[styleContext] ?? MAX_BY_STYLE.default;
  const violations: VoiceLeadingViolation[] = [];
  let totalMovement = 0;
  let maxSingleVoice = 0;

  fromVoicing.forEach((fromNote, i) => {
    const toNote = toVoicing[i];
    const movement = Math.abs(fromNote - toNote);
    totalMovement += movement;
    maxSingleVoice = Math.max(maxSingleVoice, movement);

    if (movement > maxAllowed) {
      violations.push({
        voiceIndex: i,
        fromMidi: fromNote,
        toMidi: toNote,
        movement,
        message: `Voice ${i}: MIDI ${fromNote}→${toNote} = ${movement} semitones (max ${maxAllowed})`,
      });
    }
  });

  return {
    valid: violations.length === 0,
    totalMovement,
    maxSingleVoice,
    violations,
  };
}

/**
 * Given a current voicing and multiple candidate inversions of the next chord,
 * return the inversion with minimum total voice movement.
 * Each inversion is an array of absolute MIDI notes.
 */
export function resolveClosestInversion(
  currentVoicing: number[],
  candidateVoicings: number[][],
): number[] {
  let bestVoicing = candidateVoicings[0];
  let bestDistance = Infinity;

  for (const candidate of candidateVoicings) {
    const totalDistance = currentVoicing.reduce(
      (sum, note, i) => sum + Math.abs(note - candidate[i]),
      0,
    );
    if (totalDistance < bestDistance) {
      bestDistance = totalDistance;
      bestVoicing = candidate;
    }
  }

  return bestVoicing;
}

/**
 * Quick single-line register check.
 * Returns true if any voice moves more than a perfect 5th (7 semitones).
 * Use this as a fast pre-check before full validation.
 */
export function hasWideLeap(
  fromVoicing: number[],
  toVoicing: number[],
): boolean {
  return fromVoicing.some((note, i) => Math.abs(note - toVoicing[i]) > 7);
}
