/**
 * Phase 5 — Genre Curriculum Map v7 (source of truth).
 *
 * All 42 genre×level entries (14 genres × 3 levels) transcribed from
 * Genre_Curriculum_Map_v7.md.  Each entry is fully denormalized —
 * "All L1 plus …" references are resolved into complete data.
 */

import { parseScaleString } from '../bridge/scaleBridge';
import type { GenreCurriculumEntry, GCMKey } from '../types/curriculum';

// ---------------------------------------------------------------------------
// Helper: build a ScaleDefinition from a "name = [intervals]" string
// ---------------------------------------------------------------------------
const s = parseScaleString;

// ---------------------------------------------------------------------------
// 1. POP
// ---------------------------------------------------------------------------

const POP_L1: GenreCurriculumEntry = {
  genre: 'POP',
  level: 'L1',
  melody: {
    scale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'pop',
    phraseRhythmBars: 1,
    tags: ['scale:major_pentatonic', 'pop.L1.melody'],
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7]',
    voicings: 'root position only',
    progressions: [
      '1 maj - 4 maj | 1 maj - 2 min',
      '1 maj - 4 maj - 5 maj | 4 maj - 5 maj - 6 min',
      '1 maj - 5 maj - 6 min - 4 maj | 6 min - 4 maj - 1 maj - 5 maj | 1 maj - 5 maj - 2 min - 4 maj',
    ],
    compingPatterns: ['comp_pop_01', 'comp_pop_02', 'comp_pop_05'],
  },
  bass: {
    bassScale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    bassContours: ['bass_c_r_01', 'bass_c_r5_01'],
    bassRhythms: ['bass_r_pop_01', 'bass_r_pop_02', 'bass_r_pop_03'],
  },
  global: {
    defaultKey: 'C major',
    keyUnlockOrder: 'C → G, F → D, Bb → Eb, A, Ab',
    tempoRange: [70, 110],
    swing: 0,
    grooves: ['groove_pop_01', 'groove_pop_02', 'groove_ballad_01'],
  },
};

const POP_L2: GenreCurriculumEntry = {
  genre: 'POP',
  level: 'L2',
  melody: {
    scale: s('ionian = [0, 2, 4, 5, 7, 9, 11]'),
    scaleAlts: [s('aeolian = [0, 2, 3, 5, 7, 8, 10]')],
    contourNotes: [3, 4],
    contourTiers: [1, 2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'pop',
    phraseRhythmBars: [1, 2],
    tags: ['scale:ionian', 'scale:aeolian', 'pop.L2.melody'],
  },
  chords: {
    chordTypes:
      'maj [0,4,7], min [0,3,7], sus2 [0,2,7], sus4 [0,5,7], add2 [0,2,4,7], power [0,7]',
    voicings:
      'root position + 1st inversion + 2nd inversion. Voice-led (closest inversion).',
    progressions: [
      // L1 progressions
      '1 maj - 4 maj | 1 maj - 2 min',
      '1 maj - 4 maj - 5 maj | 4 maj - 5 maj - 6 min',
      '1 maj - 5 maj - 6 min - 4 maj | 6 min - 4 maj - 1 maj - 5 maj | 1 maj - 5 maj - 2 min - 4 maj',
      // L2 additions
      '1 maj - 2 min - 3 min - 4 maj - 5 maj - 6 min - 5 maj/3',
      'b7 maj - 4 maj - 1 maj | b6 maj - b7 maj - 1 maj',
      '5 maj/3 - 1 maj',
    ],
    compingPatterns: [
      'comp_pop_01',
      'comp_pop_02',
      'comp_pop_05',
      'comp_pop_06',
      'comp_pop_07',
      'comp_pop_08',
      'comp_pop_09',
      'comp_pop_10',
      'comp_rock_01',
      'comp_rock_02',
      'comp_rock_03',
    ],
    newTechniques:
      'Broken chords with inversions, descending arpeggio, syncopated chunking, voicing the melody (top note = melody)',
  },
  bass: {
    bassScale: s('ionian = [0, 2, 4, 5, 7, 9, 11]'),
    bassContours: [
      'bass_c_r_01',
      'bass_c_r5_01',
      'bass_c_alt_01',
      'bass_c_158_01',
      'bass_c_1585_01',
    ],
    bassRhythms: [
      'bass_r_pop_01',
      'bass_r_pop_02',
      'bass_r_pop_03',
      'bass_r_pop_04',
      'bass_r_pop_05',
      'bass_r_pop_06',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [80, 130],
    swing: 0,
    grooves: [
      'groove_pop_01',
      'groove_pop_02',
      'groove_pop_03',
      'groove_rock_01',
      'groove_rock_02',
      'groove_ballad_01',
    ],
  },
};

const POP_L3: GenreCurriculumEntry = {
  genre: 'POP',
  level: 'L3',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    scaleAlts: [
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
      s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
    ],
    chromaticPassing: true,
    contourNotes: [4, 5],
    contourTiers: [2, 3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'pop',
    phraseRhythmBars: 2,
    tags: [
      'scale:mixolydian',
      'scale:dorian',
      'scale:aeolian',
      'pop.L3.melody',
    ],
  },
  chords: {
    chordTypes:
      'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10], dim [0,3,6], aug [0,4,8], 6 [0,4,7,9], min6 [0,3,7,9]',
    voicings:
      '7-3-5 "area code": maj7=[-1,4,7], dom7=[-2,4,7], min7=[-2,3,7]. LH plays root. RH plays 7-3-5.',
    progressions: [
      // All L2 progressions
      '1 maj - 4 maj | 1 maj - 2 min',
      '1 maj - 4 maj - 5 maj | 4 maj - 5 maj - 6 min',
      '1 maj - 5 maj - 6 min - 4 maj | 6 min - 4 maj - 1 maj - 5 maj | 1 maj - 5 maj - 2 min - 4 maj',
      '1 maj - 2 min - 3 min - 4 maj - 5 maj - 6 min - 5 maj/3',
      'b7 maj - 4 maj - 1 maj | b6 maj - b7 maj - 1 maj',
      '5 maj/3 - 1 maj',
      // L3 additions
      '1 maj7 - 2 min7 - 3 min7 - 4 maj7 - 5 dom7 - 6 min7',
      '2 min7 - 5 dom7 - 1 maj7',
      '4 maj - 4 min | 1 maj - b7 maj - 4 maj | b6 maj - b7 maj - 1 maj',
      '3 maj - 6 min | 6 maj - 2 min',
      '#5 dim - 6 min | 5 maj/3 - 1 maj',
      '6 min - 2 maj - 4 maj/5 - 1 maj',
    ],
    compingPatterns: [
      'comp_pop_01',
      'comp_pop_02',
      'comp_pop_05',
      'comp_pop_06',
      'comp_pop_07',
      'comp_pop_08',
      'comp_pop_09',
      'comp_pop_10',
      'comp_rock_01',
      'comp_rock_02',
      'comp_rock_03',
      'comp_rnb_01',
      'comp_rnb_02',
      'comp_rnb_03',
      'comp_neosoul_01',
    ],
    newTechniques:
      '7-3-5 voicings, "drop the sizzle" ii-V formula, voicing the melody with 7th chord inversions, walking bass comping',
  },
  bass: {
    bassScale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    bassContours: [
      'bass_c_r_01',
      'bass_c_r5_01',
      'bass_c_alt_01',
      'bass_c_158_01',
      'bass_c_1585_01',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_pop_01',
      'bass_r_pop_02',
      'bass_r_pop_03',
      'bass_r_pop_04',
      'bass_r_pop_05',
      'bass_r_pop_06',
      'bass_r_pop_07',
      'bass_r_pop_08',
      'bass_r_pop_09',
      'bass_r_pop_10',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [70, 130],
    swing: [0, 2],
    grooves: [
      'groove_pop_01',
      'groove_pop_02',
      'groove_pop_03',
      'groove_rock_01',
      'groove_rnb_01',
      'groove_rnb_02',
      'groove_neosoul_01',
      'groove_ballad_01',
    ],
  },
};

// ---------------------------------------------------------------------------
// 2. JAZZ
// ---------------------------------------------------------------------------

const JAZZ_L1: GenreCurriculumEntry = {
  genre: 'JAZZ',
  level: 'L1',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
      s('blues = [0, 3, 5, 6, 7, 10]'),
    ],
    contourNotes: [3, 4],
    contourTiers: [1, 2],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'jazz',
    phraseRhythmBars: 1,
    tags: [
      'scale:dorian',
      'scale:mixolydian',
      'scale:minor_blues',
      'jazz.L1.melody',
    ],
  },
  chords: {
    chordTypes: 'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10]',
    voicings:
      '7-3-5: maj7=[-1,4,7], dom7=[-2,4,7], min7=[-2,3,7]. Shell 1-7: maj7=[0,11], dom7=[0,10], min7=[0,10]. Shell 1-3-7: maj7=[0,4,11], dom7=[0,4,10], min7=[0,3,10].',
    progressions: [
      '2 min7 - 5 dom7 - 1 maj7',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (1) - 2 min7 - 5 dom7 (1)',
    ],
    compingPatterns: ['comp_jazz_01', 'comp_jazz_02', 'comp_jazz_03'],
  },
  bass: {
    bassScale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    bassContours: [
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_r5_01',
    ],
    bassRhythms: ['bass_r_jazz_01', 'bass_r_jazz_02'],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [100, 140],
    swing: [5, 7],
    grooves: ['groove_jazz_01', 'groove_jazz_02'],
  },
};

const JAZZ_L2: GenreCurriculumEntry = {
  genre: 'JAZZ',
  level: 'L2',
  melody: {
    scale: s('ionian = [0, 2, 4, 5, 7, 9, 11]'),
    scaleAlts: [
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
      s('lydian = [0, 2, 4, 6, 7, 9, 11]'),
    ],
    approachNotes: true,
    contourNotes: [4, 5],
    contourTiers: [2, 3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'jazz',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes:
      'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10], min7b5 [0,3,6,10], dim7 [0,3,6,9]',
    voicings:
      '7-3-5: maj7=[-1,4,7], dom7=[-2,4,7], min7=[-2,3,7]. 3-7-9: min7=[3,10,14], dom7=[4,10,14], maj7=[4,11,14]. Spread: LH 1-7 + RH 3-5-8 | LH 1-7 + RH 3-5-9 | LH 1-3 + RH 5-7-9.',
    progressions: [
      // L1
      '2 min7 - 5 dom7 - 1 maj7',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (1) - 2 min7 - 5 dom7 (1)',
      // L2 additions
      '1 maj7 - 6 min7 - 2 min7 - 5 dom7',
    ],
    compingPatterns: ['comp_jazz_01', 'comp_jazz_02', 'comp_jazz_03'],
  },
  bass: {
    bassContours: [
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_r5_01',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_jazz_01',
      'bass_r_jazz_02',
      'bass_r_jazz_03',
      'bass_r_jazz_04',
      'bass_r_jazz_05',
      'bass_r_jazz_06',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [80, 180],
    swing: [5, 8],
    grooves: [
      'groove_jazz_01',
      'groove_jazz_02',
      'groove_jazz_03',
      'groove_bossa_01',
    ],
  },
};

const JAZZ_L3: GenreCurriculumEntry = {
  genre: 'JAZZ',
  level: 'L3',
  melody: {
    scale: s('bebop_dominant = [0, 2, 4, 5, 7, 9, 10, 11]'),
    scaleAlts: [
      s('melodic_minor = [0, 2, 3, 5, 7, 9, 11]'),
      s('half_whole_dim = [0, 1, 3, 4, 6, 7, 9, 10]'),
      s('whole_tone = [0, 2, 4, 6, 8, 10]'),
      s('lydian = [0, 2, 4, 6, 7, 9, 11]'),
    ],
    approachNotes: true,
    digitalPatterns: true,
    pentatonicSuperimposition: true,
    motivicDevelopment: true,
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [3, 4],
    zeroPointOptions: [0, 1, 2, 3, 4, 5, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'jazz',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10], min7b5 [0,3,6,10], dim7 [0,3,6,9], dom7b9 [0,4,7,10,13], dom7#9 [0,4,7,10,15], dom7b5 [0,4,6,10], dom7#5 [0,4,8,10], dom13 [0,4,7,10,21]',
    voicings:
      'All L2 voicings plus altered voicings, quartal voicings, upper structure triads.',
    progressions: [
      // L1-L2
      '2 min7 - 5 dom7 - 1 maj7',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (1) - 2 min7 - 5 dom7 (1)',
      '1 maj7 - 6 min7 - 2 min7 - 5 dom7',
      // L3
      '2 min7 - b2 dom7 - 1 maj7',
    ],
  },
  bass: {
    bassContours: [
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_r5_01',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_jazz_01',
      'bass_r_jazz_02',
      'bass_r_jazz_03',
      'bass_r_jazz_04',
      'bass_r_jazz_05',
      'bass_r_jazz_06',
    ],
    bassAlt: 'tumbao',
  },
  global: {
    defaultKey: 'All keys',
    tempoRange: [60, 220],
    swing: [5, 10],
    grooves: [
      'groove_jazz_01',
      'groove_jazz_02',
      'groove_jazz_03',
      'groove_bossa_01',
      'groove_afrobeat_01',
    ],
  },
};

// ---------------------------------------------------------------------------
// 3. BLUES
// ---------------------------------------------------------------------------

const BLUES_L1: GenreCurriculumEntry = {
  genre: 'BLUES',
  level: 'L1',
  melody: {
    scale: s('minor_blues = [0, 3, 5, 6, 7, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'blues',
    phraseRhythmBars: 1,
    tags: ['scale:minor_blues', 'blues.L1.melody'],
  },
  chords: {
    chordTypes: 'maj [0,4,7], dom7 [0,4,7,10]',
    voicings: 'root position triads, or 7-3-5 dom7: [-2, 4, 7]',
    progressions: [
      '1 maj (4) - 4 maj (2) - 1 maj (2) - 5 maj (1) - 4 maj (1) - 1 maj (2)',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (2)',
    ],
    compingPatterns: ['comp_blues_01', 'comp_blues_02'],
    newTechniques:
      'Broken chords + swing eighths, grace note (b3 to 3 "crush"), boogie LH',
  },
  bass: {
    bassScale: s('minor_blues = [0, 3, 5, 6, 7, 10]'),
    bassContours: ['bass_c_boogie_01', 'bass_c_r5_01'],
    bassRhythms: [
      'bass_r_blues_01',
      'bass_r_blues_02',
      'bass_r_blues_03',
      'bass_r_blues_04',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [80, 120],
    swing: [6, 8],
    grooves: ['groove_blues_shuffle_01', 'groove_blues_slow_01'],
  },
};

const BLUES_L2: GenreCurriculumEntry = {
  genre: 'BLUES',
  level: 'L2',
  melody: {
    scale: s('minor_blues = [0, 3, 5, 6, 7, 10]'),
    scaleAlts: [s('minor_pentatonic = [0, 3, 5, 7, 10]')],
    chromaticPassing: true,
    contourNotes: [3, 4],
    contourTiers: [1, 2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'blues',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: 'dom7 [0,4,7,10], min7 [0,3,7,10]',
    voicings: '7-3-5 dom7=[-2,4,7] throughout 12-bar form. LH root, RH 7-3-5.',
    progressions: [
      // L1
      '1 maj (4) - 4 maj (2) - 1 maj (2) - 5 maj (1) - 4 maj (1) - 1 maj (2)',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (2)',
      // L2
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (1) - 2 min7 - 5 dom7 (1)',
    ],
    newTechniques: 'Walking bass LH + RH 7-3-5 voicings, bluesy broken chords',
  },
  bass: {
    bassContours: [
      'bass_c_boogie_01',
      'bass_c_r5_01',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_boogie_02',
    ],
    bassRhythms: [
      'bass_r_blues_01',
      'bass_r_blues_02',
      'bass_r_blues_03',
      'bass_r_blues_04',
      'bass_r_blues_05',
      'bass_r_blues_06',
    ],
  },
  global: {
    defaultKey: 'F major',
    tempoRange: [70, 130],
    swing: [5, 8],
    grooves: ['groove_blues_shuffle_01', 'groove_jazz_01'],
  },
};

const BLUES_L3: GenreCurriculumEntry = {
  genre: 'BLUES',
  level: 'L3',
  melody: {
    scale: s('minor_blues = [0, 3, 5, 6, 7, 10]'),
    scaleAlts: [s('major_blues = [0, 2, 3, 4, 7, 9]')],
    contourNotes: [4, 5],
    contourTiers: [2, 3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'blues',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes: 'dom7, min7, dom7b9, dom7#9',
    voicings:
      '7-3-5 (DEFAULT): dom7=[-2,4,7], min7=[-2,3,7]. Plus altered dominants, 6th chords (4 maj6, 4 min6).',
    progressions: [
      // All L2
      '1 maj (4) - 4 maj (2) - 1 maj (2) - 5 maj (1) - 4 maj (1) - 1 maj (2)',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (2)',
      '1 dom7 (4) - 4 dom7 (2) - 1 dom7 (2) - 5 dom7 (1) - 4 dom7 (1) - 1 dom7 (1) - 2 min7 - 5 dom7 (1)',
    ],
    newTechniques: 'Blues improvisation with motivic development',
  },
  bass: {
    bassContours: [
      'bass_c_boogie_01',
      'bass_c_boogie_02',
      'bass_c_r5_01',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_blues_01',
      'bass_r_blues_02',
      'bass_r_blues_03',
      'bass_r_blues_04',
      'bass_r_blues_05',
      'bass_r_blues_06',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [60, 140],
    swing: [5, 9],
    grooves: [
      'groove_blues_shuffle_01',
      'groove_blues_slow_01',
      'groove_jazz_01',
      'groove_jazz_02',
    ],
  },
};

// ---------------------------------------------------------------------------
// 4. ROCK
// ---------------------------------------------------------------------------

const ROCK_L1: GenreCurriculumEntry = {
  genre: 'ROCK',
  level: 'L1',
  melody: {
    scale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'rock',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7], power [0,7]',
    voicings: 'root position triads, power chords',
    progressions: [
      '1 maj - 4 maj - 5 maj',
      '1 maj - 5 maj - 6 min - 4 maj',
      '1 maj (4) - 4 maj (2) - 1 maj (2) - 5 maj (1) - 4 maj (1) - 1 maj (2)',
    ],
    compingPatterns: ['comp_rock_01', 'comp_rock_02'],
  },
  bass: {
    bassScale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    bassContours: ['bass_c_r_01', 'bass_c_r5_01', 'bass_c_boogie_01'],
    bassRhythms: ['bass_r_rock_01', 'bass_r_rock_02'],
  },
  global: {
    defaultKey: 'E major',
    keyUnlockOrder: 'E → A, B → G, D → C',
    tempoRange: [110, 140],
    swing: 0,
    grooves: ['groove_rock_01', 'groove_rock_02'],
  },
};

const ROCK_L2: GenreCurriculumEntry = {
  genre: 'ROCK',
  level: 'L2',
  melody: {
    scale: s('minor_blues = [0, 3, 5, 6, 7, 10]'),
    scaleAlts: [
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'rock',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7], power [0,7], sus4 [0,5,7]',
    voicings: 'root position + inversions',
    progressions: [
      // L1
      '1 maj - 4 maj - 5 maj',
      '1 maj - 5 maj - 6 min - 4 maj',
      '1 maj (4) - 4 maj (2) - 1 maj (2) - 5 maj (1) - 4 maj (1) - 1 maj (2)',
      // L2
      'b7 maj - 4 maj - 1 maj | b6 maj - b7 maj - 1 maj | 1 maj - b2 maj',
    ],
    newTechniques: 'Arpeggiated builds, octave riffs, dynamic extremes',
  },
  bass: {
    bassContours: [
      'bass_c_riff_01',
      'bass_c_riff_02',
      'bass_c_riff_03',
      'bass_c_octave_01',
    ],
    bassRhythms: [
      'bass_r_rock_01',
      'bass_r_rock_02',
      'bass_r_rock_03',
      'bass_r_rock_04',
      'bass_r_rock_05',
      'bass_r_rock_06',
    ],
  },
  global: {
    defaultKey: 'G major',
    tempoRange: [90, 160],
    swing: 0,
    grooves: ['groove_rock_01', 'groove_rock_02', 'groove_rock_03'],
  },
};

const ROCK_L3: GenreCurriculumEntry = {
  genre: 'ROCK',
  level: 'L3',
  melody: {
    scale: s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
    scaleAlts: [
      s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    ],
    chromaticPassing: true,
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'rock',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'maj [0,4,7], min [0,3,7], power [0,7], sus4 [0,5,7], dom7 [0,4,7,10], min7 [0,3,7,10]',
    voicings:
      '7-3-5 (DEFAULT): dom7=[-2,4,7], min7=[-2,3,7]. Plus power chords [0,7] + extensions.',
    progressions: [
      // All L2
      '1 maj - 4 maj - 5 maj',
      '1 maj - 5 maj - 6 min - 4 maj',
      '1 maj (4) - 4 maj (2) - 1 maj (2) - 5 maj (1) - 4 maj (1) - 1 maj (2)',
      'b7 maj - 4 maj - 1 maj | b6 maj - b7 maj - 1 maj | 1 maj - b2 maj',
    ],
  },
  bass: {
    bassContours: [
      'bass_c_ostinato_01',
      'bass_c_ostinato_02',
      'bass_c_ostinato_03',
      'bass_c_pedal_01',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_rock_01',
      'bass_r_rock_02',
      'bass_r_rock_03',
      'bass_r_rock_04',
      'bass_r_rock_05',
      'bass_r_rock_06',
      'bass_r_rock_07',
      'bass_r_rock_08',
    ],
  },
  global: {
    defaultKey: 'D major',
    tempoRange: [60, 180],
    swing: [0, 3],
    grooves: [
      'groove_rock_01',
      'groove_rock_02',
      'groove_rock_03',
      'groove_pop_03',
    ],
  },
};

// ---------------------------------------------------------------------------
// 5. FOLK
// ---------------------------------------------------------------------------

const FOLK_L1: GenreCurriculumEntry = {
  genre: 'FOLK',
  level: 'L1',
  melody: {
    scale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    scaleAlts: [s('ionian = [0, 2, 4, 5, 7, 9, 11]')],
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'folk',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7]',
    voicings: 'root position + 1st inversion',
    progressions: [
      '1 maj - 4 maj - 5 maj',
      '1 maj - 5 maj - 6 min - 4 maj',
      '1 maj - 6 min - 4 maj - 5 maj',
    ],
    compingPatterns: ['comp_pop_01'],
  },
  bass: {
    bassScale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    bassContours: ['bass_c_r_01', 'bass_c_r5_01'],
    bassRhythms: ['bass_r_folk_01', 'bass_r_folk_02'],
  },
  global: {
    defaultKey: 'G major',
    keyUnlockOrder: 'G → C, D → A, E → F',
    tempoRange: [80, 120],
    swing: 0,
    grooves: ['groove_folk_01', 'groove_folk_02'],
  },
};

const FOLK_L2: GenreCurriculumEntry = {
  genre: 'FOLK',
  level: 'L2',
  melody: {
    scale: s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
    scaleAlts: [s('dorian = [0, 2, 3, 5, 7, 9, 10]')],
    contourNotes: [3, 4],
    contourTiers: [1, 2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'folk',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes:
      'maj [0,4,7], min [0,3,7], sus2 [0,2,7], sus4 [0,5,7], add9 [0,2,4,7]',
    voicings: 'All inversions, voice-led',
    progressions: [
      // L1
      '1 maj - 4 maj - 5 maj',
      '1 maj - 5 maj - 6 min - 4 maj',
      '1 maj - 6 min - 4 maj - 5 maj',
      // L2
      '1 maj - 2 min - 3 min - 4 maj - 5 maj - 6 min',
      '4 maj - 4 min',
      '1 maj - 5 min',
    ],
    newTechniques:
      'Alberti bass (1-5-3-5 in LH eighth notes), Travis-pick (LH alternating + RH arpeggio)',
  },
  bass: {
    bassContours: [
      'bass_c_r5_01',
      'bass_c_r5_02',
      'bass_c_r5_03',
      'bass_c_alberti_01',
    ],
    bassRhythms: [
      'bass_r_folk_01',
      'bass_r_folk_02',
      'bass_r_folk_03',
      'bass_r_folk_04',
      'bass_r_folk_05',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [70, 120],
    swing: 0,
    grooves: ['groove_folk_01', 'groove_folk_02', 'groove_ballad_01'],
  },
};

const FOLK_L3: GenreCurriculumEntry = {
  genre: 'FOLK',
  level: 'L3',
  melody: {
    scale: s('lydian = [0, 2, 4, 6, 7, 9, 11]'),
    scaleAlts: [
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
      s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [2, 3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'folk',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'maj [0,4,7], min [0,3,7], sus2 [0,2,7], sus4 [0,5,7], add9 [0,2,4,7], maj7 [0,4,7,11], min7 [0,3,7,10]',
    voicings:
      '7-3-5 (DEFAULT): maj7=[-1,4,7], min7=[-2,3,7]. Plus open voicings (wide intervals with sustain pedal).',
    progressions: [
      // All L2
      '1 maj - 4 maj - 5 maj',
      '1 maj - 5 maj - 6 min - 4 maj',
      '1 maj - 6 min - 4 maj - 5 maj',
      '1 maj - 2 min - 3 min - 4 maj - 5 maj - 6 min',
      '4 maj - 4 min',
      '1 maj - 5 min',
      // L3
      '1 maj7 - 2 min7 - 3 min7 - 4 maj7 - 5 dom7 - 6 min7',
    ],
    newTechniques:
      'Open voicings with sustain pedal, compound time (3/4, 6/8), dynamic narrative',
  },
  bass: {
    bassContours: [
      'bass_c_pedal_01',
      'bass_c_ostinato_01',
      'bass_c_ostinato_02',
      'bass_c_ostinato_03',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
    ],
    bassRhythms: [
      'bass_r_folk_01',
      'bass_r_folk_02',
      'bass_r_folk_03',
      'bass_r_folk_04',
      'bass_r_folk_05',
      'bass_r_folk_06',
      'bass_r_folk_07',
    ],
  },
  global: {
    defaultKey: 'D major',
    tempoRange: [60, 120],
    swing: 0,
    grooves: ['groove_folk_01', 'groove_folk_02', 'groove_ballad_01'],
  },
};

// ---------------------------------------------------------------------------
// 6. FUNK
// ---------------------------------------------------------------------------

const FUNK_L1: GenreCurriculumEntry = {
  genre: 'FUNK',
  level: 'L1',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [s('minor_pentatonic = [0, 3, 5, 7, 10]')],
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'funk',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'min7 [0,3,7,10], dom7 [0,4,7,10], power [0,7]',
    voicings: 'min7 basic: 7-3-5 = [-2, 3, 7]. dom7 basic: 7-3-5 = [-2, 4, 7].',
    progressions: ['1 min7', '1 min7 - 4 dom7'],
    compingPatterns: [
      'comp_funk_01',
      'comp_funk_02',
      'comp_funk_03',
      'comp_funk_04',
    ],
    compingRhythms: 'Staccato — short durations (120 ticks max per hit)',
  },
  bass: {
    bassScale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    bassContours: [
      'bass_c_r8_01',
      'bass_c_funk_01',
      'bass_c_funk_02',
      'bass_c_funk_03',
    ],
    bassRhythms: [
      'bass_r_funk_01',
      'bass_r_funk_02',
      'bass_r_funk_03',
      'bass_r_funk_04',
    ],
  },
  global: {
    defaultKey: 'E minor',
    keyUnlockOrder: 'E → A → D → G',
    tempoRange: [95, 120],
    swing: 0,
    grooves: ['groove_funk_01', 'groove_funk_02'],
  },
};

const FUNK_L2: GenreCurriculumEntry = {
  genre: 'FUNK',
  level: 'L2',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    scaleAlts: [s('minor_blues = [0, 3, 5, 6, 7, 10]')],
    chromaticPassing: true,
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'funk',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes:
      'min7 [0,3,7,10], dom7 [0,4,7,10], min9 [0,3,7,10,14], dom9 [0,4,7,10,14], 7sus4 [0,5,7,10], min6 [0,3,7,9]',
    voicings:
      'dom9 "funk voicing": [-2, 2, 7] (b7-9-5, omit 3). min6: [0, 3, 7, 9]. min7 stack: [0, 3, 10] (1-b3-b7). 7sus4: [-2, 5, 7] (b7-4-5).',
    progressions: [
      // L1
      '1 min7',
      '1 min7 - 4 dom7',
      // L2
      '1 min7 - b7 dom7',
      '1 dom9',
    ],
    compingPatterns: [
      'comp_funk_01',
      'comp_funk_02',
      'comp_funk_03',
      'comp_funk_04',
      'comp_funk_05',
      'comp_funk_06',
      'comp_funk_07',
    ],
  },
  bass: {
    bassContours: [
      'bass_c_r8_01',
      'bass_c_funk_01',
      'bass_c_funk_02',
      'bass_c_funk_03',
      'bass_c_funk_04',
      'bass_c_funk_05',
      'bass_c_funk_06',
    ],
    bassRhythms: [
      'bass_r_funk_01',
      'bass_r_funk_02',
      'bass_r_funk_03',
      'bass_r_funk_04',
      'bass_r_funk_05',
      'bass_r_funk_06',
      'bass_r_funk_07',
    ],
  },
  global: {
    defaultKey: 'A minor',
    tempoRange: [90, 130],
    swing: 0,
    grooves: ['groove_funk_01', 'groove_funk_02', 'groove_funk_03'],
  },
};

const FUNK_L3: GenreCurriculumEntry = {
  genre: 'FUNK',
  level: 'L3',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [s('mixolydian = [0, 2, 4, 5, 7, 9, 10]')],
    chromaticPassing: true,
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [3, 4],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'funk',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'min7 [0,3,7,10], dom7 [0,4,7,10], min9 [0,3,7,10,14], dom9 [0,4,7,10,14], 7sus4 [0,5,7,10], min6 [0,3,7,9], dom7#9 [0,4,7,10,15], dom13 [0,4,7,10,21], min11 [0,3,7,10,17]',
    voicings:
      'dom9 "funk voicing": [-2, 2, 7] (b7-9-5, omit 3) — PRIMARY. dom7#9 "Hendrix chord": [4, -2, 15] (3-b7-#9). min6: [0, 3, 9] (1-b3-6). min7 two-note: [0, 3, 10] (1-b3-b7). gospel organ: stacked thirds. dom13: [-2, 4, 9] (b7-3-13).',
    progressions: [
      // All L2
      '1 min7',
      '1 min7 - 4 dom7',
      '1 min7 - b7 dom7',
      '1 dom9',
    ],
    newTechniques:
      'Behind-the-beat feel, minimalist pocket, groove construction, interlocking patterns, jazz-funk crossover comping (Headhunters, Herbie Hancock)',
  },
  bass: {
    bassContours: [
      'bass_c_r8_01',
      'bass_c_funk_01',
      'bass_c_funk_02',
      'bass_c_funk_03',
      'bass_c_funk_04',
      'bass_c_funk_05',
      'bass_c_funk_06',
    ],
    bassRhythms: [
      'bass_r_funk_01',
      'bass_r_funk_02',
      'bass_r_funk_03',
      'bass_r_funk_04',
      'bass_r_funk_05',
      'bass_r_funk_06',
      'bass_r_funk_07',
      'bass_r_funk_08',
    ],
  },
  global: {
    defaultKey: 'D minor',
    tempoRange: [85, 130],
    swing: 0,
    grooves: [
      'groove_funk_01',
      'groove_funk_02',
      'groove_funk_03',
      'groove_hiphop_01',
    ],
  },
};

// ---------------------------------------------------------------------------
// 7. R&B
// ---------------------------------------------------------------------------

const RNB_L1: GenreCurriculumEntry = {
  genre: 'R&B',
  level: 'L1',
  melody: {
    scale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'rnb',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7], maj7 [0,4,7,11], min7 [0,3,7,10]',
    voicings:
      'root position triads, basic 7-3-5 for ballads: maj7=[-1,4,7], min7=[-2,3,7]',
    progressions: [
      '1 maj - 6 min - 4 maj - 5 maj',
      '1 maj7 - 4 maj7',
      '6 min - 4 maj - 1 maj - 5 maj',
    ],
    compingPatterns: ['comp_rnb_01', 'comp_rnb_02'],
  },
  bass: {
    bassScale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    bassContours: ['bass_c_r_01', 'bass_c_r5_01'],
    bassRhythms: ['bass_r_rnb_01', 'bass_r_rnb_02'],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [70, 100],
    swing: 0,
    grooves: ['groove_rnb_01', 'groove_rnb_02'],
  },
};

const RNB_L2: GenreCurriculumEntry = {
  genre: 'R&B',
  level: 'L2',
  melody: {
    scale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    scaleAlts: [s('dorian = [0, 2, 3, 5, 7, 9, 10]')],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'rnb',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: 'maj7, min7, dom7 in 7-3-5, min9, gospel voicings',
    voicings:
      '7-3-5 (DEFAULT): maj7=[-1,4,7], dom7=[-2,4,7], min7=[-2,3,7]. Gospel stacked thirds.',
    progressions: [
      // L1
      '1 maj - 6 min - 4 maj - 5 maj',
      '1 maj7 - 4 maj7',
      '6 min - 4 maj - 1 maj - 5 maj',
      // L2
      '2 min7 - 5 dom7 - 1 maj7',
      '1 min7 - 4 dom7',
    ],
  },
  bass: {
    bassContours: ['bass_c_158_01', 'bass_c_scalar_01'],
    bassRhythms: [
      'bass_r_rnb_01',
      'bass_r_rnb_02',
      'bass_r_rnb_03',
      'bass_r_rnb_04',
      'bass_r_rnb_05',
      'bass_r_rnb_06',
    ],
  },
  global: {
    defaultKey: 'Ab major',
    tempoRange: [65, 110],
    swing: [0, 2],
    grooves: ['groove_rnb_01', 'groove_rnb_02', 'groove_neosoul_01'],
  },
};

const RNB_L3: GenreCurriculumEntry = {
  genre: 'R&B',
  level: 'L3',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    scaleAlts: [
      s('minor_blues = [0, 3, 5, 6, 7, 10]'),
      s('harmonic_minor = [0, 2, 3, 5, 7, 8, 11]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'rnb',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes: 'min9, dom9, altered dominants, extended voicings',
    voicings: 'All L2 voicings plus extended voicings.',
    progressions: [
      // All L2
      '1 maj - 6 min - 4 maj - 5 maj',
      '1 maj7 - 4 maj7',
      '6 min - 4 maj - 1 maj - 5 maj',
      '2 min7 - 5 dom7 - 1 maj7',
      '1 min7 - 4 dom7',
    ],
  },
  bass: {
    bassContours: [
      'bass_c_158_01',
      'bass_c_scalar_01',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_rnb_01',
      'bass_r_rnb_02',
      'bass_r_rnb_03',
      'bass_r_rnb_04',
      'bass_r_rnb_05',
      'bass_r_rnb_06',
      'bass_r_rnb_07',
      'bass_r_rnb_08',
    ],
  },
  global: {
    defaultKey: 'Db major',
    tempoRange: [60, 115],
    swing: [0, 3],
    grooves: [
      'groove_rnb_01',
      'groove_rnb_02',
      'groove_neosoul_01',
      'groove_neosoul_02',
    ],
  },
};

// ---------------------------------------------------------------------------
// 8. NEO SOUL
// ---------------------------------------------------------------------------

const NEOSOUL_L1: GenreCurriculumEntry = {
  genre: 'NEO SOUL',
  level: 'L1',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'neo_soul',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'min7 [0,3,7,10], dom7 [0,4,7,10]',
    voicings:
      '7-3-5 (DEFAULT): dom7=[-2,4,7], min7=[-2,3,7]. LH root, RH 7-3-5.',
    progressions: ['1 min7', '1 min7 - 4 dom7'],
  },
  bass: {
    bassScale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    bassContours: [],
    bassRhythms: [
      'bass_r_neo_01',
      'bass_r_neo_02',
      'bass_r_neo_03',
      'bass_r_neo_04',
    ],
  },
  global: {
    defaultKey: 'D minor',
    tempoRange: [75, 105],
    swing: [0, 2],
    grooves: ['groove_neosoul_01', 'groove_neosoul_02'],
  },
};

const NEOSOUL_L2: GenreCurriculumEntry = {
  genre: 'NEO SOUL',
  level: 'L2',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    scaleAlts: [s('lydian = [0, 2, 4, 6, 7, 9, 11]')],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'neo_soul',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: 'min9, dom9, rootless voicings, Lydian color chords',
    voicings: 'All L1 voicings plus rootless voicings and Lydian colors.',
    progressions: ['1 min7', '1 min7 - 4 dom7'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_neo_01',
      'bass_r_neo_02',
      'bass_r_neo_03',
      'bass_r_neo_04',
    ],
  },
  global: {
    defaultKey: 'Ab minor',
    tempoRange: [70, 110],
    swing: [0, 3],
    grooves: ['groove_neosoul_01', 'groove_neosoul_02', 'groove_neosoul_03'],
  },
};

const NEOSOUL_L3: GenreCurriculumEntry = {
  genre: 'NEO SOUL',
  level: 'L3',
  melody: {
    scale: s('melodic_minor = [0, 2, 3, 5, 7, 9, 11]'),
    scaleAlts: [
      s('altered_dominant = [0, 1, 3, 4, 6, 8, 10]'),
      s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [3, 4],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'neo_soul',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes: 'Advanced altered, quartal, cluster voicings',
    voicings: 'All L2 voicings plus altered, quartal, and cluster voicings.',
    progressions: ['1 min7', '1 min7 - 4 dom7'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_neo_01',
      'bass_r_neo_02',
      'bass_r_neo_03',
      'bass_r_neo_04',
    ],
  },
  global: {
    defaultKey: 'F# minor',
    tempoRange: [65, 110],
    swing: [0, 3],
    grooves: ['groove_neosoul_01', 'groove_neosoul_02', 'groove_neosoul_03'],
  },
};

// ---------------------------------------------------------------------------
// 9. JAM BAND
// ---------------------------------------------------------------------------

const JAMBAND_L1: GenreCurriculumEntry = {
  genre: 'JAM BAND',
  level: 'L1',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'jam_band',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7], dom7 [0,4,7,10]',
    voicings: 'root position triads',
    progressions: ['1 maj - 4 maj - 5 maj'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_jam_01',
      'bass_r_jam_02',
      'bass_r_jam_03',
      'bass_r_jam_04',
    ],
  },
  global: {
    defaultKey: 'G major',
    tempoRange: [100, 140],
    swing: [0, 3],
    grooves: ['groove_jam_01', 'groove_jam_02'],
  },
};

const JAMBAND_L2: GenreCurriculumEntry = {
  genre: 'JAM BAND',
  level: 'L2',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [
      s('major_pentatonic = [0, 2, 4, 7, 9]'),
      s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'jam_band',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: 'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10]',
    voicings:
      '7-3-5 (DEFAULT): maj7=[-1,4,7], dom7=[-2,4,7], min7=[-2,3,7]. LH root, RH 7-3-5.',
    progressions: ['1 maj - 4 maj - 5 maj', '1 maj7 - 4 maj7'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_jam_01',
      'bass_r_jam_02',
      'bass_r_jam_03',
      'bass_r_jam_04',
    ],
  },
  global: {
    defaultKey: 'A major',
    tempoRange: [90, 160],
    swing: [0, 4],
    grooves: ['groove_jam_01', 'groove_jam_02'],
  },
};

const JAMBAND_L3: GenreCurriculumEntry = {
  genre: 'JAM BAND',
  level: 'L3',
  melody: {
    scale: s('lydian = [0, 2, 4, 6, 7, 9, 11]'),
    scaleAlts: [
      s('minor_blues = [0, 3, 5, 6, 7, 10]'),
      s('whole_tone = [0, 2, 4, 6, 8, 10]'),
      s('melodic_minor = [0, 2, 3, 5, 7, 9, 11]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'jam_band',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes: 'maj7, min7, dom7, extended voicings',
    voicings: 'All L2 voicings plus extended voicings.',
    progressions: ['1 maj - 4 maj - 5 maj', '1 maj7 - 4 maj7'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_jam_01',
      'bass_r_jam_02',
      'bass_r_jam_03',
      'bass_r_jam_04',
    ],
  },
  global: {
    defaultKey: 'D major',
    tempoRange: [80, 180],
    swing: [0, 5],
    grooves: ['groove_jam_01', 'groove_jam_02'],
  },
};

// ---------------------------------------------------------------------------
// 10. HIP HOP
// ---------------------------------------------------------------------------

const HIPHOP_L1: GenreCurriculumEntry = {
  genre: 'HIP HOP',
  level: 'L1',
  melody: {
    scale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'hip_hop',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'min [0,3,7], min7 [0,3,7,10]',
    voicings: 'root position triads, basic min7 7-3-5',
    progressions: ['6 min - 4 maj - 1 maj - 5 maj', '1 min - b7 maj'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_hh_01',
      'bass_r_hh_02',
      'bass_r_hh_03',
      'bass_r_hh_04',
    ],
  },
  global: {
    defaultKey: 'C minor',
    tempoRange: [80, 100],
    swing: 0,
    grooves: ['groove_hiphop_01', 'groove_hiphop_02'],
  },
};

const HIPHOP_L2: GenreCurriculumEntry = {
  genre: 'HIP HOP',
  level: 'L2',
  melody: {
    scale: s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
    scaleAlts: [
      s('minor_blues = [0, 3, 5, 6, 7, 10]'),
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'hip_hop',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes:
      'min7 [0,3,7,10], dom7 [0,4,7,10], min9 [0,3,7,10,14], maj7 [0,4,7,11]',
    voicings:
      'min7 7-3-5: [-2, 3, 7]. min9 "soul sample" voicing: [-2, 2, 3, 7]. maj7 7-3-5: [-1, 4, 7] — for jazz-sampled hip-hop.',
    progressions: [
      // L1
      '6 min - 4 maj - 1 maj - 5 maj',
      '1 min - b7 maj',
      // L2
      '2 min7 - 5 dom7',
      '1 min9',
      'b6 maj - b7 maj - 1 min',
    ],
    newTechniques:
      'Jazz-sampled aesthetic (warm Rhodes voicings), lo-fi chord stacking, Dorian warmth',
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_hh_01',
      'bass_r_hh_02',
      'bass_r_hh_03',
      'bass_r_hh_04',
      'bass_r_hh_05',
      'bass_r_hh_06',
    ],
  },
  global: {
    defaultKey: 'A minor',
    tempoRange: [70, 95],
    swing: 0,
    grooves: ['groove_hiphop_01', 'groove_hiphop_02', 'groove_neosoul_01'],
  },
};

const HIPHOP_L3: GenreCurriculumEntry = {
  genre: 'HIP HOP',
  level: 'L3',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [
      s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
      s('harmonic_minor = [0, 2, 3, 5, 7, 8, 11]'),
      s('phrygian_dominant = [0, 1, 4, 5, 7, 8, 10]'),
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'hip_hop',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'min7 [0,3,7,10], dom7 [0,4,7,10], min9 [0,3,7,10,14], maj7 [0,4,7,11], dom9 [0,4,7,10,14], dom7#9 [0,4,7,10,15]',
    voicings:
      'dom9: [-2, 2, 7] (b7-9-5, omit 3). dom7#9: [4, -2, 15] — "dirty" hip-hop jazz. Rootless LH voicings (7-3-5 and 3-7-9). Phrygian chord voicings: 1 min - b2 maj.',
    progressions: [
      // All L2
      '6 min - 4 maj - 1 maj - 5 maj',
      '1 min - b7 maj',
      '2 min7 - 5 dom7',
      '1 min9',
      'b6 maj - b7 maj - 1 min',
    ],
    newTechniques:
      'Jazz-hop crossover comping, rootless voicings over boom-bap, Glasper-style genre-fluid playing, Madlib-inspired harmonic minor darkness',
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_hh_01',
      'bass_r_hh_02',
      'bass_r_hh_03',
      'bass_r_hh_04',
      'bass_r_hh_05',
      'bass_r_hh_06',
      'bass_r_hh_07',
      'bass_r_hh_08',
    ],
  },
  global: {
    defaultKey: 'E minor',
    tempoRange: [65, 100],
    swing: [0, 2],
    grooves: [
      'groove_hiphop_01',
      'groove_hiphop_02',
      'groove_neosoul_01',
      'groove_jazz_01',
    ],
  },
};

// ---------------------------------------------------------------------------
// 11. ELECTRONIC
// ---------------------------------------------------------------------------

const ELECTRONIC_L1: GenreCurriculumEntry = {
  genre: 'ELECTRONIC',
  level: 'L1',
  melody: {
    scale: s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'electronic',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'min [0,3,7], maj [0,4,7]',
    voicings: 'root position triads',
    progressions: ['6 min - 4 maj - 1 maj - 5 maj'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_elec_01',
      'bass_r_elec_02',
      'bass_r_elec_03',
      'bass_r_elec_04',
    ],
  },
  global: {
    defaultKey: 'A minor',
    tempoRange: [120, 135],
    swing: 0,
    grooves: ['groove_electronic_house_01', 'groove_electronic_techno_01'],
  },
};

const ELECTRONIC_L2: GenreCurriculumEntry = {
  genre: 'ELECTRONIC',
  level: 'L2',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [s('ionian = [0, 2, 4, 5, 7, 9, 11]')],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'electronic',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: 'min7, maj7 in 7-3-5, sustained pads',
    voicings:
      '7-3-5 (DEFAULT): maj7=[-1,4,7], min7=[-2,3,7]. Sustained with pedal.',
    progressions: ['6 min - 4 maj - 1 maj - 5 maj'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_elec_01',
      'bass_r_elec_02',
      'bass_r_elec_03',
      'bass_r_elec_04',
    ],
  },
  global: {
    defaultKey: 'D minor',
    tempoRange: [110, 140],
    swing: 0,
    grooves: ['groove_electronic_house_01', 'groove_electronic_techno_01'],
  },
};

const ELECTRONIC_L3: GenreCurriculumEntry = {
  genre: 'ELECTRONIC',
  level: 'L3',
  melody: {
    scale: s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
    scaleAlts: [
      s('lydian = [0, 2, 4, 6, 7, 9, 11]'),
      s('whole_tone = [0, 2, 4, 6, 8, 10]'),
      s('harmonic_minor = [0, 2, 3, 5, 7, 8, 11]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'electronic',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes: 'Advanced: min7, maj7, altered, modal',
    voicings: 'All L2 voicings plus modal and altered voicings.',
    progressions: ['6 min - 4 maj - 1 maj - 5 maj'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_elec_01',
      'bass_r_elec_02',
      'bass_r_elec_03',
      'bass_r_elec_04',
    ],
  },
  global: {
    defaultKey: 'F# minor',
    tempoRange: [90, 150],
    swing: 0,
    grooves: ['groove_electronic_house_01', 'groove_electronic_techno_01'],
  },
};

// ---------------------------------------------------------------------------
// 12. LATIN
// ---------------------------------------------------------------------------

const LATIN_L1: GenreCurriculumEntry = {
  genre: 'LATIN',
  level: 'L1',
  melody: {
    scale: s('ionian = [0, 2, 4, 5, 7, 9, 11]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'latin',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7]',
    voicings: 'root position triads',
    progressions: ['1 maj - 4 maj', '1 maj - 5 maj'],
    compingPatterns: ['comp_latin_01'],
  },
  bass: {
    bassScale: s('ionian = [0, 2, 4, 5, 7, 9, 11]'),
    bassContours: ['bass_c_tumbao_01'],
    bassRhythms: [
      'bass_r_latin_01',
      'bass_r_latin_02',
      'bass_r_latin_03',
      'bass_r_latin_04',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [100, 130],
    swing: 0,
    grooves: ['groove_latin_01'],
  },
};

const LATIN_L2: GenreCurriculumEntry = {
  genre: 'LATIN',
  level: 'L2',
  melody: {
    scale: s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
    scaleAlts: [s('mixolydian = [0, 2, 4, 5, 7, 9, 10]')],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'latin',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes:
      'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10], dim7 [0,3,6,9]',
    voicings:
      '7-3-5 (DEFAULT): maj7=[-1,4,7], dom7=[-2,4,7], min7=[-2,3,7]. Bossa nova voicings: spread with LH shell (1-7 or 1-3) + RH color tones. Montuno with 7th chords.',
    progressions: [
      // L1
      '1 maj - 4 maj',
      '1 maj - 5 maj',
      // L2
      '2 min7 - 5 dom7 - 1 maj7',
      '1 maj7 - 2 min7 - 5 dom7 - 1 maj7',
      '1 dom7 - 4 dom7 - 5 dom7 - 4 dom7',
      '2 min7b5 - 5 dom7 - 1 min7',
    ],
    compingPatterns: ['comp_latin_01', 'comp_latin_02', 'comp_latin_03'],
    newTechniques:
      '"Drop the sizzle" ii-V in Latin context, bossa voicings with LH shells',
  },
  bass: {
    bassContours: ['bass_c_tumbao_01', 'bass_c_tumbao_02', 'bass_c_bossa_01'],
    bassRhythms: [
      'bass_r_latin_01',
      'bass_r_latin_02',
      'bass_r_latin_03',
      'bass_r_latin_04',
      'bass_r_latin_05',
      'bass_r_latin_06',
      'bass_r_latin_07',
    ],
  },
  global: {
    defaultKey: 'F major',
    tempoRange: [90, 140],
    swing: 0,
    grooves: ['groove_latin_01', 'groove_bossa_01'],
  },
};

const LATIN_L3: GenreCurriculumEntry = {
  genre: 'LATIN',
  level: 'L3',
  melody: {
    scale: s('harmonic_minor = [0, 2, 3, 5, 7, 8, 11]'),
    scaleAlts: [
      s('phrygian_dominant = [0, 1, 4, 5, 7, 8, 10]'),
      s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
      s('lydian = [0, 2, 4, 6, 7, 9, 11]'),
      s('melodic_minor = [0, 2, 3, 5, 7, 9, 11]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [3, 4],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'latin',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'maj7 [0,4,7,11], min7 [0,3,7,10], dom7 [0,4,7,10], dim7 [0,3,6,9], dom7b9 [0,4,7,10,13], dom7#9 [0,4,7,10,15], dom7b5 [0,4,6,10], min7b5 [0,3,6,10]',
    voicings:
      'All L2 voicings plus altered voicings. Spread voicings (Bill Evans in Latin context): LH shell + RH extensions. Quartal voicings for modal Latin (Chucho Valdés).',
    progressions: [
      // All L2
      '1 maj - 4 maj',
      '1 maj - 5 maj',
      '2 min7 - 5 dom7 - 1 maj7',
      '1 maj7 - 2 min7 - 5 dom7 - 1 maj7',
      '1 dom7 - 4 dom7 - 5 dom7 - 4 dom7',
      '2 min7b5 - 5 dom7 - 1 min7',
      // L3
      '4 min - b3 maj - b2 maj - 1 maj',
    ],
    newTechniques:
      'Full jazz voicing vocabulary applied to Latin rhythms, Afro-Cuban jazz comping, modal Latin (Valdés/Corea), flamenco keyboard',
  },
  bass: {
    bassContours: [
      'bass_c_tumbao_01',
      'bass_c_tumbao_02',
      'bass_c_bossa_01',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
      'bass_c_chrom_01',
      'bass_c_chrom_02',
      'bass_c_chrom_03',
    ],
    bassRhythms: [
      'bass_r_latin_01',
      'bass_r_latin_02',
      'bass_r_latin_03',
      'bass_r_latin_04',
      'bass_r_latin_05',
      'bass_r_latin_06',
      'bass_r_latin_07',
      'bass_r_latin_08',
    ],
    bassAlt: 'Advanced tumbao with chromatic approach',
  },
  global: {
    defaultKey: 'E major',
    tempoRange: [80, 160],
    swing: 0,
    grooves: ['groove_latin_01', 'groove_bossa_01', 'groove_samba_01'],
  },
};

// ---------------------------------------------------------------------------
// 13. AFRICAN
// ---------------------------------------------------------------------------

const AFRICAN_L1: GenreCurriculumEntry = {
  genre: 'AFRICAN',
  level: 'L1',
  melody: {
    scale: s('major_pentatonic = [0, 2, 4, 7, 9]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'african',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'maj [0,4,7], min [0,3,7]',
    voicings: 'root position triads',
    progressions: ['1 maj', '1 maj - 4 maj'],
  },
  bass: {
    bassContours: [],
    bassRhythms: [
      'bass_r_afr_01',
      'bass_r_afr_02',
      'bass_r_afr_03',
      'bass_r_afr_04',
    ],
  },
  global: {
    defaultKey: 'F major',
    tempoRange: [105, 130],
    swing: 0,
    grooves: ['groove_afrobeat_01', 'groove_highlife_01'],
  },
};

const AFRICAN_L2: GenreCurriculumEntry = {
  genre: 'AFRICAN',
  level: 'L2',
  melody: {
    scale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    scaleAlts: [
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
      s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'african',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes:
      'maj [0,4,7], min [0,3,7], min6 [0,3,7,9], dom7 [0,4,7,10], min7 [0,3,7,10]',
    voicings:
      'Triads: root position + inversions. min6: [0, 3, 7, 9] — Fela Kuti keyboard sound. dom7 7-3-5: [-2, 4, 7]. min7 7-3-5: [-2, 3, 7].',
    progressions: [
      // L1
      '1 maj',
      '1 maj - 4 maj',
      // L2 — descriptive (queried from progression library by style)
    ],
    compingPatterns: ['comp_afr_01', 'comp_afr_02'],
    newTechniques:
      'min6 as primary Afrobeat color chord, interlocking patterns with drums, highlife arpeggio technique',
  },
  bass: {
    bassContours: [
      'bass_c_afr_01',
      'bass_c_afr_02',
      'bass_c_afr_03',
      'bass_c_afr_04',
      'bass_c_highlife_01',
    ],
    bassRhythms: [
      'bass_r_afr_01',
      'bass_r_afr_02',
      'bass_r_afr_03',
      'bass_r_afr_04',
      'bass_r_afr_05',
      'bass_r_afr_06',
    ],
  },
  global: {
    defaultKey: 'Bb major',
    tempoRange: [100, 140],
    swing: 0,
    grooves: ['groove_afrobeat_01', 'groove_highlife_01'],
  },
};

const AFRICAN_L3: GenreCurriculumEntry = {
  genre: 'AFRICAN',
  level: 'L3',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    scaleAlts: [
      s('dorian = [0, 2, 3, 5, 7, 9, 10]'),
      s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
      s('phrygian_dominant = [0, 1, 4, 5, 7, 8, 10]'),
      // Ethiopian scales (tizita_major, tizita_minor, bati, ambassel, anchihoye) — intervals TBD
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'african',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes:
      'maj [0,4,7], min [0,3,7], min6 [0,3,7,9], dom7 [0,4,7,10], min7 [0,3,7,10], maj7 [0,4,7,11], dom9 [0,4,7,10,14], min9 [0,3,7,10,14], dim7 [0,3,6,9]',
    voicings:
      'All L2 voicings plus 7-3-5 for all 7th types. Ethio-jazz voicings: jazz voicings (7-3-5, spread) applied over Ethiopian modes. min6 extended: [0, 3, 7, 9, 14] (min6/9). dom9 Afrobeat: [-2, 2, 4, 7].',
    progressions: [
      // All L2
      '1 maj',
      '1 maj - 4 maj',
      // L3
      '2 min7 - 5 dom7 - 1 maj7',
    ],
    newTechniques:
      'Ethio-jazz keyboard (jazz voicings + Ethiopian scales), Afrobeat extended vamps with harmonic movement, pan-African fusion comping',
  },
  bass: {
    bassContours: [
      'bass_c_afr_01',
      'bass_c_afr_02',
      'bass_c_afr_03',
      'bass_c_afr_04',
      'bass_c_highlife_01',
      'bass_c_walk_01',
      'bass_c_walk_02',
      'bass_c_walk_03',
      'bass_c_walk_04',
    ],
    bassRhythms: [
      'bass_r_afr_01',
      'bass_r_afr_02',
      'bass_r_afr_03',
      'bass_r_afr_04',
      'bass_r_afr_05',
      'bass_r_afr_06',
      'bass_r_afr_07',
      'bass_r_afr_08',
    ],
  },
  global: {
    defaultKey: 'C major',
    tempoRange: [90, 140],
    swing: [0, 3],
    grooves: ['groove_afrobeat_01', 'groove_highlife_01', 'groove_jazz_01'],
  },
};

// ---------------------------------------------------------------------------
// 14. REGGAE
// ---------------------------------------------------------------------------

const REGGAE_L1: GenreCurriculumEntry = {
  genre: 'REGGAE',
  level: 'L1',
  melody: {
    scale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    contourNotes: [3],
    contourTiers: [1, 2],
    rhythmTiers: [1],
    zeroPointOptions: [0],
    contourConcat: 2,
    phraseRhythmGenre: 'reggae',
    phraseRhythmBars: 1,
  },
  chords: {
    chordTypes: 'min [0,3,7], maj [0,4,7]',
    voicings:
      'root position triads — OFFBEAT SKANK (chords ONLY on beats 2 and 4 or all offbeat eighths)',
    progressions: ['1 min - 4 maj', '1 min - b7 maj'],
  },
  bass: {
    bassScale: s('minor_pentatonic = [0, 3, 5, 7, 10]'),
    bassContours: ['bass_c_onedrop_01', 'bass_c_r5_01'],
    bassRhythms: [
      'bass_r_reg_01',
      'bass_r_reg_02',
      'bass_r_reg_03',
      'bass_r_reg_04',
    ],
  },
  global: {
    defaultKey: 'G minor',
    tempoRange: [70, 90],
    swing: 0,
    grooves: ['groove_reggae_onedrop_01', 'groove_reggae_steppers_01'],
  },
};

const REGGAE_L2: GenreCurriculumEntry = {
  genre: 'REGGAE',
  level: 'L2',
  melody: {
    scale: s('mixolydian = [0, 2, 4, 5, 7, 9, 10]'),
    scaleAlts: [s('dorian = [0, 2, 3, 5, 7, 9, 10]')],
    contourNotes: [4, 5],
    contourTiers: [2, 3],
    rhythmTiers: [1, 2],
    zeroPointOptions: [0, 2, 4],
    contourConcat: 2,
    phraseRhythmGenre: 'reggae',
    phraseRhythmBars: [1, 2],
  },
  chords: {
    chordTypes: '7th chords with offbeat skank, bubble organ pattern',
    voicings: 'Offbeat skank with 7th chords, bubble organ.',
    progressions: ['1 min - 4 maj', '1 min - b7 maj'],
  },
  bass: {
    bassContours: ['bass_c_onedrop_01', 'bass_c_r5_01'],
    bassRhythms: [
      'bass_r_reg_01',
      'bass_r_reg_02',
      'bass_r_reg_03',
      'bass_r_reg_04',
    ],
  },
  global: {
    defaultKey: 'A minor',
    tempoRange: [65, 95],
    swing: 0,
    grooves: ['groove_reggae_onedrop_01', 'groove_reggae_steppers_01'],
  },
};

const REGGAE_L3: GenreCurriculumEntry = {
  genre: 'REGGAE',
  level: 'L3',
  melody: {
    scale: s('aeolian = [0, 2, 3, 5, 7, 8, 10]'),
    scaleAlts: [
      s('minor_blues = [0, 3, 5, 6, 7, 10]'),
      s('phrygian = [0, 1, 3, 5, 7, 8, 10]'),
      s('harmonic_minor = [0, 2, 3, 5, 7, 8, 11]'),
    ],
    contourNotes: [4, 5],
    contourTiers: [3, 4],
    rhythmTiers: [2, 3],
    zeroPointOptions: [0, 2, 4, 6],
    contourConcat: 2,
    phraseRhythmGenre: 'reggae',
    phraseRhythmBars: 2,
  },
  chords: {
    chordTypes: 'Advanced: min7, dom7, altered, modal',
    voicings: 'All L2 voicings plus advanced reggae voicings.',
    progressions: ['1 min - 4 maj', '1 min - b7 maj'],
  },
  bass: {
    bassContours: ['bass_c_onedrop_01', 'bass_c_r5_01'],
    bassRhythms: [
      'bass_r_reg_01',
      'bass_r_reg_02',
      'bass_r_reg_03',
      'bass_r_reg_04',
    ],
  },
  global: {
    defaultKey: 'E minor',
    tempoRange: [75, 105],
    swing: 0,
    grooves: [
      'groove_reggae_onedrop_01',
      'groove_reggae_steppers_01',
      'groove_reggae_rockers_01',
    ],
  },
};

// ---------------------------------------------------------------------------
// Master map — all 42 entries keyed by GCMKey
// ---------------------------------------------------------------------------

export const GENRE_CURRICULUM_MAP: Record<GCMKey, GenreCurriculumEntry> = {
  'POP:L1': POP_L1,
  'POP:L2': POP_L2,
  'POP:L3': POP_L3,
  'JAZZ:L1': JAZZ_L1,
  'JAZZ:L2': JAZZ_L2,
  'JAZZ:L3': JAZZ_L3,
  'BLUES:L1': BLUES_L1,
  'BLUES:L2': BLUES_L2,
  'BLUES:L3': BLUES_L3,
  'ROCK:L1': ROCK_L1,
  'ROCK:L2': ROCK_L2,
  'ROCK:L3': ROCK_L3,
  'FOLK:L1': FOLK_L1,
  'FOLK:L2': FOLK_L2,
  'FOLK:L3': FOLK_L3,
  'FUNK:L1': FUNK_L1,
  'FUNK:L2': FUNK_L2,
  'FUNK:L3': FUNK_L3,
  'R&B:L1': RNB_L1,
  'R&B:L2': RNB_L2,
  'R&B:L3': RNB_L3,
  'NEO SOUL:L1': NEOSOUL_L1,
  'NEO SOUL:L2': NEOSOUL_L2,
  'NEO SOUL:L3': NEOSOUL_L3,
  'JAM BAND:L1': JAMBAND_L1,
  'JAM BAND:L2': JAMBAND_L2,
  'JAM BAND:L3': JAMBAND_L3,
  'HIP HOP:L1': HIPHOP_L1,
  'HIP HOP:L2': HIPHOP_L2,
  'HIP HOP:L3': HIPHOP_L3,
  'ELECTRONIC:L1': ELECTRONIC_L1,
  'ELECTRONIC:L2': ELECTRONIC_L2,
  'ELECTRONIC:L3': ELECTRONIC_L3,
  'LATIN:L1': LATIN_L1,
  'LATIN:L2': LATIN_L2,
  'LATIN:L3': LATIN_L3,
  'AFRICAN:L1': AFRICAN_L1,
  'AFRICAN:L2': AFRICAN_L2,
  'AFRICAN:L3': AFRICAN_L3,
  'REGGAE:L1': REGGAE_L1,
  'REGGAE:L2': REGGAE_L2,
  'REGGAE:L3': REGGAE_L3,
};

/**
 * Special rules that apply across all genres.
 * Enforced by the content generation pipeline.
 */
export const SPECIAL_RULES = {
  /** Pop and Folk: NEVER use 7 dim. ALWAYS substitute 5 maj/3 or 3 min/5. */
  noDimRule: ['POP', 'FOLK'] as const,
  /** Blues shuffle feel: Triplet-based, use triplet grid rhythms. NOT dotted-eighth-sixteenth. */
  bluesShuffleTripletsOnly: true,
  /** Funk: NEVER swing. Straight sixteenths only (swing = 0). */
  funkNeverSwing: true,
  /** Jazz: Always apply swing unless marked "Latin" or "bossa." */
  jazzAlwaysSwing: true,
} as const;
