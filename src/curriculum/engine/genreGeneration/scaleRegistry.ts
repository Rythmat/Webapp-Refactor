/**
 * scaleRegistry.ts
 * Central scale/mode registry for the Music Atlas genre generation engine.
 * Maps scale names to interval arrays (semitones from root).
 * Single source of truth — replaces all hardcoded [0,2,3,5,7,9,10] arrays.
 *
 * Usage:
 *   import { SCALES, getScaleIntervals } from './scaleRegistry'
 *   const intervals = getScaleIntervals('dorian')  // [0,2,3,5,7,9,10]
 */

// ─── Scale interval arrays (semitones from root, PPQ-independent) ─────────────

export const SCALES: Record<string, number[]> = {
  // ── 7-note diatonic modes ──────────────────────────────────────────────────
  'ionian':           [0, 2, 4, 5, 7, 9, 11],  // major
  'major':            [0, 2, 4, 5, 7, 9, 11],  // alias
  'dorian':           [0, 2, 3, 5, 7, 9, 10],  // minor + nat.6 (funk/jazz primary)
  'phrygian':         [0, 1, 3, 5, 7, 8, 10],
  'lydian':           [0, 2, 4, 6, 7, 9, 11],  // raised 4th
  'mixolydian':       [0, 2, 4, 5, 7, 9, 10],  // dominant (dominant chords)
  'aeolian':          [0, 2, 3, 5, 7, 8, 10],  // natural minor
  'natural_minor':    [0, 2, 3, 5, 7, 8, 10],  // alias
  'locrian':          [0, 1, 3, 5, 6, 8, 10],

  // ── Pentatonic scales ──────────────────────────────────────────────────────
  'major_pentatonic':       [0, 2, 4, 7, 9],
  'minor_pentatonic':       [0, 3, 5, 7, 10],   // funk/blues L1 melody
  'dorian_pentatonic':      [0, 2, 3, 7, 10],   // Dorian without 5th+6th... 
  // Actually the standard "minor pentatonic" works over Dorian context

  // ── Blues scales ──────────────────────────────────────────────────────────
  'minor_blues':      [0, 3, 5, 6, 7, 10],      // minor pent + b5 blue note
  'major_blues':      [0, 2, 3, 4, 7, 9],       // major pent + b3 blue note

  // ── Melodic minor modes ───────────────────────────────────────────────────
  'melodic_minor':    [0, 2, 3, 5, 7, 9, 11],   // ascending melodic minor
  'lydian_dominant':  [0, 2, 4, 6, 7, 9, 10],   // mode 4 of melodic minor
  'altered':          [0, 1, 3, 4, 6, 8, 10],   // mode 7 — super Locrian

  // ── Harmonic minor ────────────────────────────────────────────────────────
  'harmonic_minor':   [0, 2, 3, 5, 7, 8, 11],
  'phrygian_dominant':[0, 1, 4, 5, 7, 8, 10],  // mode 5 of harmonic minor

  // ── Symmetric scales ──────────────────────────────────────────────────────
  'whole_tone':       [0, 2, 4, 6, 8, 10],
  'half_whole_dim':   [0, 1, 3, 4, 6, 7, 9, 10],  // dominant diminished
  'whole_half_dim':   [0, 2, 3, 5, 6, 8, 9, 11],  // diminished

  // ── Bebop scales ──────────────────────────────────────────────────────────
  'bebop_dominant':   [0, 2, 4, 5, 7, 9, 10, 11], // Mixolydian + maj7
  'bebop_major':      [0, 2, 4, 5, 7, 8, 9, 11],  // Ionian + b6
  'bebop_dorian':     [0, 2, 3, 4, 5, 7, 9, 10],  // Dorian + maj3

  // ── Chord tone sets (for arpeggio generation) ─────────────────────────────
  'major_triad':      [0, 4, 7],
  'minor_triad':      [0, 3, 7],
  'diminished_triad': [0, 3, 6],
  'augmented_triad':  [0, 4, 8],

  'major7':           [0, 4, 7, 11],
  'dominant7':        [0, 4, 7, 10],
  'minor7':           [0, 3, 7, 10],   // ii chord / minor tonic
  'minor7b5':         [0, 3, 6, 10],   // half-diminished
  'diminished7':      [0, 3, 6, 9],    // fully diminished
  'major7s5':         [0, 4, 8, 11],   // augmented major7

  'dominant9':        [0, 4, 7, 10, 14],   // dom9 (full voicing)
  'minor9':           [0, 3, 7, 10, 14],   // min9 (full voicing)
  'major9':           [0, 4, 7, 11, 14],

  'dominant13':       [0, 4, 7, 10, 14, 21],  // dom13 full
  'minor13':          [0, 3, 7, 10, 14, 21],

  // ── Funk-specific chord tone sets ─────────────────────────────────────────
  'funk9_voicing':    [10, 14, 7],    // b7-9-5 (omit root+3rd) — relative to root
  'min7_rootless':    [3, 7, 10],     // b3-5-b7 rootless shell
  'dom7_rootless':    [10, 4, 7],     // b7-3-5 rootless
  'min9_rootless':    [3, 10, 14],    // b3-b7-9 rootless (L2 Cm9)
  'dom13_rootless':   [10, 4, 21],    // b7-3-13 rootless [-2,4,9] pattern

  // ── Jazz-specific chord tone sets ─────────────────────────────────────────
  'shell_major7':     [0, 4, 11],     // root-3-7
  'shell_minor7':     [0, 3, 10],     // root-b3-b7
  'shell_dom7':       [0, 4, 10],     // root-3-b7
  '7_3_5':            [10, 4, 7],     // b7-3-5 rootless (jazz primary)
  '3_7_9':            [4, 10, 14],    // 3-b7-9 rootless (jazz partner voicing)
}

// ─── Genre-to-scale mappings (per level) ──────────────────────────────────────
// Matches GCM v8 scale field per genre+level

export const GENRE_LEVEL_SCALES: Record<string, Record<number, string[]>> = {
  funk: {
    1: ['minor_pentatonic', 'dorian', 'minor_blues'],
    2: ['dorian', 'minor_pentatonic', 'minor_blues'],
    3: ['dorian', 'minor_blues', 'altered'],
  },
  jazz: {
    1: ['ionian', 'dorian', 'mixolydian', 'minor_blues'],
    2: ['ionian', 'dorian', 'mixolydian', 'lydian'],
    3: ['bebop_dominant', 'melodic_minor', 'half_whole_dim', 'whole_tone', 'lydian'],
  },
  blues: {
    1: ['minor_blues', 'minor_pentatonic'],
    2: ['minor_blues', 'major_blues', 'dorian'],
    3: ['minor_blues', 'major_blues', 'dorian', 'mixolydian'],
  },
  rnb: {
    1: ['minor_pentatonic', 'dorian'],
    2: ['dorian', 'minor_pentatonic', 'mixolydian'],
    3: ['dorian', 'mixolydian', 'minor_blues'],
  },
}

// ─── Default scale per genre+section ──────────────────────────────────────────
// Used when step has no explicit scaleIntervals and no scaleId

export const DEFAULT_SCALE_BY_GENRE_SECTION: Record<
  string,
  Record<string, string>
> = {
  funk: {
    A: 'minor_pentatonic',  // melody: pentatonic first
    B: 'minor7',            // chords: minor7 chord tones
    C: 'dorian',            // bass: full Dorian
    D: 'dorian',            // performance: full vocabulary
  },
  jazz: {
    A: 'ionian',
    B: 'major7',
    C: 'ionian',
    D: 'ionian',
  },
}

// ─── Lookup functions ─────────────────────────────────────────────────────────

/**
 * Get scale intervals by name.
 * Falls back to minor_pentatonic if scale not found.
 */
export function getScaleIntervals(scaleName: string): number[] {
  const intervals = SCALES[scaleName]
  if (!intervals) {
    console.warn(`[scaleRegistry] Unknown scale: "${scaleName}" — falling back to minor_pentatonic`)
    return SCALES['minor_pentatonic']
  }
  return intervals
}

/**
 * Get the default scale for a genre+section+level combination.
 * Used by resolveStepContent when step has no explicit scaleIntervals.
 */
export function getDefaultScale(
  genre: string,
  section: string,
  level: number
): number[] {
  // Try genre+section default first
  const sectionDefault = DEFAULT_SCALE_BY_GENRE_SECTION[genre]?.[section]
  if (sectionDefault) return getScaleIntervals(sectionDefault)

  // Fall back to genre+level primary scale
  const levelScales = GENRE_LEVEL_SCALES[genre]?.[level]
  if (levelScales?.length) return getScaleIntervals(levelScales[0])

  // Last resort
  return SCALES['minor_pentatonic']
}

/**
 * Get primary scales for a genre at a given level.
 * Returns array of interval arrays in priority order.
 */
export function getGenreScales(genre: string, level: number): number[][] {
  const scaleNames = GENRE_LEVEL_SCALES[genre]?.[level] ?? ['minor_pentatonic']
  return scaleNames.map(name => getScaleIntervals(name))
}

/**
 * Get scale name from intervals (reverse lookup).
 * Useful for display and debugging.
 */
export function getScaleName(intervals: number[]): string | null {
  const key = intervals.join(',')
  for (const [name, ints] of Object.entries(SCALES)) {
    if (ints.join(',') === key) return name
  }
  return null
}

/**
 * Validate that a set of scale intervals conforms to known scales.
 * Returns the scale name if known, null if custom.
 */
export function validateScaleIntervals(intervals: number[]): string | null {
  return getScaleName(intervals)
}
