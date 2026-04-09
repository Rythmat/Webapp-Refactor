/**
 * Phase 12 — Vibe Algorithms.
 *
 * 16 vibe algorithms for filtering progressions by musical mood/feeling.
 * Each vibe defines: tempo range, chord quality requirements, forbidden
 * chords, and applicable modes.
 *
 * Source: Algorithms_Scales.md
 */

import type { ChordProgressionEntry } from '../data/chordProgressionLibrary';
import type { VibeTag } from '../types/progression';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VibeAlgorithmDef {
  tag: VibeTag;
  synonyms: string[];
  tempoRange: [number, number];
  /** Chord qualities that should be present */
  requiredQualities: string[][]; // OR groups: any quality in group must be present
  /** Chord qualities that should NOT appear */
  forbiddenQualities: string[];
  /** Applicable modes/scales */
  applicableModes: string[];
}

// ---------------------------------------------------------------------------
// Algorithm definitions
// ---------------------------------------------------------------------------

export const VIBE_ALGORITHMS: Record<VibeTag, VibeAlgorithmDef> = {
  cool: {
    tag: 'cool',
    synonyms: ['chill', 'smooth', 'relaxed'],
    tempoRange: [70, 110],
    requiredQualities: [
      ['major7', 'minor7'],
      ['dominant7sus4', 'dominant7#5'],
    ],
    forbiddenQualities: ['power'],
    applicableModes: [
      'ionian',
      'dorian',
      'aeolian',
      'mixolydian',
      'alteredDominant',
    ],
  },
  sexy: {
    tag: 'sexy',
    synonyms: ['sultry', 'seductive', 'sensual'],
    tempoRange: [65, 100],
    requiredQualities: [
      ['dominant7#5', 'dominant7#9'],
      ['minor7', 'minor9', 'major9'],
    ],
    forbiddenQualities: ['power'],
    applicableModes: ['dorian', 'aeolian', 'mixolydian', 'alteredDominant'],
  },
  intriguing: {
    tag: 'intriguing',
    synonyms: ['mysterious', 'curious', 'enigmatic'],
    tempoRange: [70, 120],
    requiredQualities: [['dominant7b9']],
    forbiddenQualities: [],
    applicableModes: ['aeolian', 'phrygian'],
  },
  dark: {
    tag: 'dark',
    synonyms: ['ominous', 'heavy', 'brooding'],
    tempoRange: [40, 100],
    requiredQualities: [['minor', 'minor7', 'diminished7', 'minor7b5']],
    forbiddenQualities: [],
    applicableModes: ['aeolian', 'phrygian', 'locrian'],
  },
  emotional: {
    tag: 'emotional',
    synonyms: ['moving', 'heartfelt', 'bittersweet'],
    tempoRange: [60, 120],
    requiredQualities: [['major', 'major7', 'minor', 'add2']],
    forbiddenQualities: [],
    applicableModes: ['ionian', 'lydian', 'aeolian', 'dorian', 'phrygian'],
  },
  sophisticated: {
    tag: 'sophisticated',
    synonyms: ['elegant', 'complex', 'refined'],
    tempoRange: [80, 130],
    requiredQualities: [
      ['dominant7', 'major7', 'minor7'],
      ['major9', 'minor9', 'minor11', 'major7#11', 'dominant13'],
    ],
    forbiddenQualities: [],
    applicableModes: ['lydian', 'dorian', 'lydianDominant', 'alteredDominant'],
  },
  fun: {
    tag: 'fun',
    synonyms: ['playful', 'lighthearted', 'bouncy'],
    tempoRange: [100, 140],
    requiredQualities: [['dominant7', 'major']],
    forbiddenQualities: ['diminished7', 'minor7b5'],
    applicableModes: ['ionian', 'lydian', 'mixolydian'],
  },
  happy: {
    tag: 'happy',
    synonyms: ['joyful', 'uplifting', 'bright'],
    tempoRange: [100, 145],
    requiredQualities: [['major', 'major7', 'dominant7sus4']],
    forbiddenQualities: [],
    applicableModes: ['ionian', 'lydian'],
  },
  melancholic: {
    tag: 'melancholic',
    synonyms: ['sad', 'wistful', 'nostalgic'],
    tempoRange: [55, 100],
    requiredQualities: [['minor', 'minor7']],
    forbiddenQualities: [],
    applicableModes: ['aeolian'],
  },
  aggressive: {
    tag: 'aggressive',
    synonyms: ['intense', 'powerful', 'driving'],
    tempoRange: [100, 200],
    requiredQualities: [['power', 'minor', 'dominant7#9']],
    forbiddenQualities: ['major7', 'major9'],
    applicableModes: ['dorian', 'aeolian', 'phrygian', 'alteredDominant'],
  },
  dreamy: {
    tag: 'dreamy',
    synonyms: ['ethereal', 'floating', 'atmospheric'],
    tempoRange: [60, 110],
    requiredQualities: [['major7', 'add2', 'sus2', 'major7#11']],
    forbiddenQualities: ['dominant7'],
    applicableModes: ['lydian', 'ionian', 'dorian', 'aeolian'],
  },
  hypnotic: {
    tag: 'hypnotic',
    synonyms: ['trance-like', 'repetitive', 'meditative'],
    tempoRange: [70, 140],
    requiredQualities: [['major7', 'minor7', 'add2', 'sus2', 'sus4']],
    forbiddenQualities: [],
    applicableModes: ['lydian', 'ionian', 'dorian', 'aeolian'],
  },
  triumphant: {
    tag: 'triumphant',
    synonyms: ['epic', 'victorious', 'anthemic'],
    tempoRange: [110, 150],
    requiredQualities: [['major', 'sus4']],
    forbiddenQualities: [],
    applicableModes: ['lydian', 'ionian', 'aeolian'],
  },
  spiritual: {
    tag: 'spiritual',
    synonyms: ['transcendent', 'sacred', 'devotional'],
    tempoRange: [60, 120],
    requiredQualities: [['major', 'add2', 'add4', 'sus4', 'sus2']],
    forbiddenQualities: [],
    applicableModes: ['lydian', 'ionian', 'aeolian', 'dorian'],
  },
  rebellious: {
    tag: 'rebellious',
    synonyms: ['defiant', 'punk', 'anti-establishment'],
    tempoRange: [130, 200],
    requiredQualities: [['power', 'major', 'minor']],
    forbiddenQualities: [],
    applicableModes: ['aeolian', 'phrygian', 'mixolydian'],
  },
  romantic: {
    tag: 'romantic',
    synonyms: ['tender', 'loving', 'intimate'],
    tempoRange: [55, 95],
    requiredQualities: [['major7', 'minor9', 'minor7']],
    forbiddenQualities: [],
    applicableModes: ['ionian', 'dorian', 'lydian'],
  },
};

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Check if a progression matches a vibe algorithm's chord requirements.
 * A progression matches if at least one quality from each required group
 * appears in the progression's chord qualities.
 */
export function progressionMatchesVibe(
  progression: ChordProgressionEntry,
  vibe: VibeAlgorithmDef,
): boolean {
  const chordQualities = extractQualities(progression);

  // Check forbidden qualities
  for (const forbidden of vibe.forbiddenQualities) {
    if (chordQualities.has(forbidden)) return false;
  }

  // Check required quality groups (each group is OR — at least one must be present)
  for (const group of vibe.requiredQualities) {
    const hasAny = group.some((q) => chordQualities.has(q));
    if (!hasAny) return false;
  }

  return true;
}

/**
 * Filter progressions by vibe tag.
 * Returns progressions that:
 * 1. Have the vibe tag in their vibes array, OR
 * 2. Match the vibe algorithm's chord requirements
 */
export function filterProgressionsByVibe(
  progressions: ChordProgressionEntry[],
  vibeTag: VibeTag,
): ChordProgressionEntry[] {
  const vibe = VIBE_ALGORITHMS[vibeTag];
  return progressions.filter(
    (p) => p.vibes.includes(vibeTag) || progressionMatchesVibe(p, vibe),
  );
}

/**
 * Get applicable modes for a vibe.
 */
export function getModesForVibe(vibeTag: VibeTag): string[] {
  return VIBE_ALGORITHMS[vibeTag].applicableModes;
}

/**
 * Get tempo range for a vibe.
 */
export function getTempoRangeForVibe(vibeTag: VibeTag): [number, number] {
  return VIBE_ALGORITHMS[vibeTag].tempoRange;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract chord quality names from a progression's chord strings.
 * e.g., "1 major7" → "major7", "b3 minor" → "minor"
 */
function extractQualities(progression: ChordProgressionEntry): Set<string> {
  const qualities = new Set<string>();
  for (const chord of progression.chords) {
    const spaceIdx = chord.indexOf(' ');
    if (spaceIdx !== -1) {
      qualities.add(
        chord
          .slice(spaceIdx + 1)
          .trim()
          .toLowerCase(),
      );
    } else {
      // No space — treat entire string as quality (e.g., bare "maj")
      const trimmed = chord.trim().toLowerCase();
      if (trimmed.length > 0) {
        qualities.add(trimmed);
      }
    }
  }
  return qualities;
}
