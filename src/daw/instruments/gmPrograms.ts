// Full General MIDI Level 1 program catalog — 128 melodic instruments
// Reference: https://www.midi.org/specifications-old/item/gm-level-1-sound-set

export interface GMProgram {
  number: number;
  name: string;
  category: string;
}

export const GM_CATEGORIES = [
  'Piano',
  'Chromatic Perc',
  'Organ',
  'Guitar',
  'Bass',
  'Strings',
  'Ensemble',
  'Brass',
  'Reed',
  'Pipe',
  'Synth Lead',
  'Synth Pad',
  'Synth FX',
  'Ethnic',
  'Percussive',
  'Sound FX',
] as const;

export type GMCategory = (typeof GM_CATEGORIES)[number];

export const GM_PROGRAMS: GMProgram[] = [
  // ── Piano (0-7) ──────────────────────────────────────────────────────
  { number: 0, name: 'Acoustic Grand Piano', category: 'Piano' },
  { number: 1, name: 'Bright Acoustic Piano', category: 'Piano' },
  { number: 2, name: 'Electric Grand Piano', category: 'Piano' },
  { number: 3, name: 'Honky-tonk Piano', category: 'Piano' },
  { number: 4, name: 'Electric Piano 1', category: 'Piano' },
  { number: 5, name: 'Electric Piano 2', category: 'Piano' },
  { number: 6, name: 'Harpsichord', category: 'Piano' },
  { number: 7, name: 'Clavinet', category: 'Piano' },

  // ── Chromatic Percussion (8-15) ──────────────────────────────────────
  { number: 8, name: 'Celesta', category: 'Chromatic Perc' },
  { number: 9, name: 'Glockenspiel', category: 'Chromatic Perc' },
  { number: 10, name: 'Music Box', category: 'Chromatic Perc' },
  { number: 11, name: 'Vibraphone', category: 'Chromatic Perc' },
  { number: 12, name: 'Marimba', category: 'Chromatic Perc' },
  { number: 13, name: 'Xylophone', category: 'Chromatic Perc' },
  { number: 14, name: 'Tubular Bells', category: 'Chromatic Perc' },
  { number: 15, name: 'Dulcimer', category: 'Chromatic Perc' },

  // ── Organ (16-23) ───────────────────────────────────────────────────
  { number: 16, name: 'Drawbar Organ', category: 'Organ' },
  { number: 17, name: 'Percussive Organ', category: 'Organ' },
  { number: 18, name: 'Rock Organ', category: 'Organ' },
  { number: 19, name: 'Church Organ', category: 'Organ' },
  { number: 20, name: 'Reed Organ', category: 'Organ' },
  { number: 21, name: 'Accordion', category: 'Organ' },
  { number: 22, name: 'Harmonica', category: 'Organ' },
  { number: 23, name: 'Tango Accordion', category: 'Organ' },

  // ── Guitar (24-31) ──────────────────────────────────────────────────
  { number: 24, name: 'Acoustic Guitar (nylon)', category: 'Guitar' },
  { number: 25, name: 'Acoustic Guitar (steel)', category: 'Guitar' },
  { number: 26, name: 'Electric Guitar (jazz)', category: 'Guitar' },
  { number: 27, name: 'Electric Guitar (clean)', category: 'Guitar' },
  { number: 28, name: 'Electric Guitar (muted)', category: 'Guitar' },
  { number: 29, name: 'Overdriven Guitar', category: 'Guitar' },
  { number: 30, name: 'Distortion Guitar', category: 'Guitar' },
  { number: 31, name: 'Guitar Harmonics', category: 'Guitar' },

  // ── Bass (32-39) ────────────────────────────────────────────────────
  { number: 32, name: 'Acoustic Bass', category: 'Bass' },
  { number: 33, name: 'Electric Bass (finger)', category: 'Bass' },
  { number: 34, name: 'Electric Bass (pick)', category: 'Bass' },
  { number: 35, name: 'Fretless Bass', category: 'Bass' },
  { number: 36, name: 'Slap Bass 1', category: 'Bass' },
  { number: 37, name: 'Slap Bass 2', category: 'Bass' },
  { number: 38, name: 'Synth Bass 1', category: 'Bass' },
  { number: 39, name: 'Synth Bass 2', category: 'Bass' },

  // ── Strings (40-47) ─────────────────────────────────────────────────
  { number: 40, name: 'Violin', category: 'Strings' },
  { number: 41, name: 'Viola', category: 'Strings' },
  { number: 42, name: 'Cello', category: 'Strings' },
  { number: 43, name: 'Contrabass', category: 'Strings' },
  { number: 44, name: 'Tremolo Strings', category: 'Strings' },
  { number: 45, name: 'Pizzicato Strings', category: 'Strings' },
  { number: 46, name: 'Orchestral Harp', category: 'Strings' },
  { number: 47, name: 'Timpani', category: 'Strings' },

  // ── Ensemble (48-55) ────────────────────────────────────────────────
  { number: 48, name: 'String Ensemble 1', category: 'Ensemble' },
  { number: 49, name: 'String Ensemble 2', category: 'Ensemble' },
  { number: 50, name: 'Synth Strings 1', category: 'Ensemble' },
  { number: 51, name: 'Synth Strings 2', category: 'Ensemble' },
  { number: 52, name: 'Choir Aahs', category: 'Ensemble' },
  { number: 53, name: 'Voice Oohs', category: 'Ensemble' },
  { number: 54, name: 'Synth Choir', category: 'Ensemble' },
  { number: 55, name: 'Orchestra Hit', category: 'Ensemble' },

  // ── Brass (56-63) ───────────────────────────────────────────────────
  { number: 56, name: 'Trumpet', category: 'Brass' },
  { number: 57, name: 'Trombone', category: 'Brass' },
  { number: 58, name: 'Tuba', category: 'Brass' },
  { number: 59, name: 'Muted Trumpet', category: 'Brass' },
  { number: 60, name: 'French Horn', category: 'Brass' },
  { number: 61, name: 'Brass Section', category: 'Brass' },
  { number: 62, name: 'Synth Brass 1', category: 'Brass' },
  { number: 63, name: 'Synth Brass 2', category: 'Brass' },

  // ── Reed (64-71) ────────────────────────────────────────────────────
  { number: 64, name: 'Soprano Sax', category: 'Reed' },
  { number: 65, name: 'Alto Sax', category: 'Reed' },
  { number: 66, name: 'Tenor Sax', category: 'Reed' },
  { number: 67, name: 'Baritone Sax', category: 'Reed' },
  { number: 68, name: 'Oboe', category: 'Reed' },
  { number: 69, name: 'English Horn', category: 'Reed' },
  { number: 70, name: 'Bassoon', category: 'Reed' },
  { number: 71, name: 'Clarinet', category: 'Reed' },

  // ── Pipe (72-79) ────────────────────────────────────────────────────
  { number: 72, name: 'Piccolo', category: 'Pipe' },
  { number: 73, name: 'Flute', category: 'Pipe' },
  { number: 74, name: 'Recorder', category: 'Pipe' },
  { number: 75, name: 'Pan Flute', category: 'Pipe' },
  { number: 76, name: 'Blown Bottle', category: 'Pipe' },
  { number: 77, name: 'Shakuhachi', category: 'Pipe' },
  { number: 78, name: 'Whistle', category: 'Pipe' },
  { number: 79, name: 'Ocarina', category: 'Pipe' },

  // ── Synth Lead (80-87) ──────────────────────────────────────────────
  { number: 80, name: 'Lead 1 (square)', category: 'Synth Lead' },
  { number: 81, name: 'Lead 2 (sawtooth)', category: 'Synth Lead' },
  { number: 82, name: 'Lead 3 (calliope)', category: 'Synth Lead' },
  { number: 83, name: 'Lead 4 (chiff)', category: 'Synth Lead' },
  { number: 84, name: 'Lead 5 (charang)', category: 'Synth Lead' },
  { number: 85, name: 'Lead 6 (voice)', category: 'Synth Lead' },
  { number: 86, name: 'Lead 7 (fifths)', category: 'Synth Lead' },
  { number: 87, name: 'Lead 8 (bass + lead)', category: 'Synth Lead' },

  // ── Synth Pad (88-95) ───────────────────────────────────────────────
  { number: 88, name: 'Pad 1 (new age)', category: 'Synth Pad' },
  { number: 89, name: 'Pad 2 (warm)', category: 'Synth Pad' },
  { number: 90, name: 'Pad 3 (polysynth)', category: 'Synth Pad' },
  { number: 91, name: 'Pad 4 (choir)', category: 'Synth Pad' },
  { number: 92, name: 'Pad 5 (bowed)', category: 'Synth Pad' },
  { number: 93, name: 'Pad 6 (metallic)', category: 'Synth Pad' },
  { number: 94, name: 'Pad 7 (halo)', category: 'Synth Pad' },
  { number: 95, name: 'Pad 8 (sweep)', category: 'Synth Pad' },

  // ── Synth Effects (96-103) ──────────────────────────────────────────
  { number: 96, name: 'FX 1 (rain)', category: 'Synth FX' },
  { number: 97, name: 'FX 2 (soundtrack)', category: 'Synth FX' },
  { number: 98, name: 'FX 3 (crystal)', category: 'Synth FX' },
  { number: 99, name: 'FX 4 (atmosphere)', category: 'Synth FX' },
  { number: 100, name: 'FX 5 (brightness)', category: 'Synth FX' },
  { number: 101, name: 'FX 6 (goblins)', category: 'Synth FX' },
  { number: 102, name: 'FX 7 (echoes)', category: 'Synth FX' },
  { number: 103, name: 'FX 8 (sci-fi)', category: 'Synth FX' },

  // ── Ethnic (104-111) ────────────────────────────────────────────────
  { number: 104, name: 'Sitar', category: 'Ethnic' },
  { number: 105, name: 'Banjo', category: 'Ethnic' },
  { number: 106, name: 'Shamisen', category: 'Ethnic' },
  { number: 107, name: 'Koto', category: 'Ethnic' },
  { number: 108, name: 'Kalimba', category: 'Ethnic' },
  { number: 109, name: 'Bagpipe', category: 'Ethnic' },
  { number: 110, name: 'Fiddle', category: 'Ethnic' },
  { number: 111, name: 'Shanai', category: 'Ethnic' },

  // ── Percussive (112-119) ────────────────────────────────────────────
  { number: 112, name: 'Tinkle Bell', category: 'Percussive' },
  { number: 113, name: 'Agogo', category: 'Percussive' },
  { number: 114, name: 'Steel Drums', category: 'Percussive' },
  { number: 115, name: 'Woodblock', category: 'Percussive' },
  { number: 116, name: 'Taiko Drum', category: 'Percussive' },
  { number: 117, name: 'Melodic Tom', category: 'Percussive' },
  { number: 118, name: 'Synth Drum', category: 'Percussive' },
  { number: 119, name: 'Reverse Cymbal', category: 'Percussive' },

  // ── Sound Effects (120-127) ─────────────────────────────────────────
  { number: 120, name: 'Guitar Fret Noise', category: 'Sound FX' },
  { number: 121, name: 'Breath Noise', category: 'Sound FX' },
  { number: 122, name: 'Seashore', category: 'Sound FX' },
  { number: 123, name: 'Bird Tweet', category: 'Sound FX' },
  { number: 124, name: 'Telephone Ring', category: 'Sound FX' },
  { number: 125, name: 'Helicopter', category: 'Sound FX' },
  { number: 126, name: 'Applause', category: 'Sound FX' },
  { number: 127, name: 'Gunshot', category: 'Sound FX' },
];

/** Look up a GM program by number */
export function getGMProgram(number: number): GMProgram | undefined {
  return GM_PROGRAMS.find((p) => p.number === number);
}

/** Get all programs in a category */
export function getGMProgramsByCategory(category: string): GMProgram[] {
  return GM_PROGRAMS.filter((p) => p.category === category);
}
