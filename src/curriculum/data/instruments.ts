/**
 * Session instruments — the vocabulary for who played what on a recording.
 *
 * Deliberately NOT the globe's Instruments of the World
 * (`src/components/ClassroomLayout/globe/data/instruments.ts`), which is an
 * ethnomusicological showcase grouped by Hornbostel–Sachs: Sitar, Oud, Kora,
 * Djembe, Taiko. That list answers "what does the world play"; this one answers
 * "who played what on this record", so it needs drum kit, Fender Rhodes and a
 * horn section instead — none of which that list has, and most of which
 * Hornbostel–Sachs classifies in ways no session credit would recognise.
 *
 * Where the same instrument appears in both, `worldInstrumentId` links them, so
 * the constellation can walk from a song credit out to the world entry without
 * either list having to absorb the other.
 *
 * `section` is a practical grouping for ordering and colouring pills, not a
 * taxonomy. Add instruments freely as the corpus needs them; the guard test
 * checks that every `Credit.instrument` in the song library resolves here.
 */

export type InstrumentSection =
  | 'voice'
  | 'keys'
  | 'guitar'
  | 'bass'
  | 'drums'
  | 'percussion'
  | 'brass'
  | 'woodwind'
  | 'strings'
  | 'electronic'
  | 'other';

export interface SessionInstrument {
  /** Stable id used by `Credit.instrument`. */
  id: string;
  /** Display name for the pill. */
  name: string;
  section: InstrumentSection;
  /** The Instruments of the World entry, when this is the same instrument. */
  worldInstrumentId?: string;
}

/** Section → one-line definition, in display order. */
export const INSTRUMENT_SECTIONS: {
  section: InstrumentSection;
  blurb: string;
}[] = [
  { section: 'voice', blurb: 'Sung and spoken parts' },
  { section: 'keys', blurb: 'Pianos, organs and electric keyboards' },
  { section: 'guitar', blurb: 'Fretted instruments carrying chords or lines' },
  { section: 'bass', blurb: 'The bottom voice' },
  { section: 'drums', blurb: 'The kit' },
  {
    section: 'percussion',
    blurb: 'Everything struck or shaken beside the kit',
  },
  { section: 'brass', blurb: 'Lip-buzzed horns' },
  { section: 'woodwind', blurb: 'Reeds and flutes' },
  { section: 'strings', blurb: 'Bowed strings and sections' },
  { section: 'electronic', blurb: 'Synthesis, sampling and turntables' },
  { section: 'other', blurb: 'Everything else a credit might name' },
];

export const SESSION_INSTRUMENTS: readonly SessionInstrument[] = [
  // ── Voice ──
  { id: 'lead-vocals', name: 'Lead Vocals', section: 'voice' },
  { id: 'backing-vocals', name: 'Backing Vocals', section: 'voice' },

  // ── Keys ──
  { id: 'piano', name: 'Piano', section: 'keys' },
  { id: 'electric-piano', name: 'Electric Piano', section: 'keys' },
  { id: 'fender-rhodes', name: 'Fender Rhodes', section: 'keys' },
  { id: 'wurlitzer', name: 'Wurlitzer', section: 'keys' },
  { id: 'clavinet', name: 'Clavinet', section: 'keys' },
  { id: 'hammond-organ', name: 'Hammond Organ', section: 'keys' },
  { id: 'organ', name: 'Organ', section: 'keys' },
  { id: 'harpsichord', name: 'Harpsichord', section: 'keys' },
  { id: 'accordion', name: 'Accordion', section: 'keys' },
  { id: 'celesta', name: 'Celesta', section: 'keys' },

  // ── Guitar ──
  {
    id: 'electric-guitar',
    name: 'Electric Guitar',
    section: 'guitar',
    worldInstrumentId: 'electric-guitar',
  },
  { id: 'acoustic-guitar', name: 'Acoustic Guitar', section: 'guitar' },
  { id: 'slide-guitar', name: 'Slide Guitar', section: 'guitar' },
  { id: 'pedal-steel', name: 'Pedal Steel Guitar', section: 'guitar' },
  { id: 'banjo', name: 'Banjo', section: 'guitar' },
  { id: 'mandolin', name: 'Mandolin', section: 'guitar' },
  { id: 'ukulele', name: 'Ukulele', section: 'guitar' },
  { id: 'sitar', name: 'Sitar', section: 'guitar', worldInstrumentId: 'sitar' },

  // ── Bass ──
  { id: 'electric-bass', name: 'Electric Bass', section: 'bass' },
  { id: 'upright-bass', name: 'Upright Bass', section: 'bass' },
  { id: 'synth-bass', name: 'Synth Bass', section: 'bass' },

  // ── Drums ──
  { id: 'drum-kit', name: 'Drum Kit', section: 'drums' },
  { id: 'drum-machine', name: 'Drum Machine', section: 'drums' },

  // ── Percussion ──
  { id: 'percussion', name: 'Percussion', section: 'percussion' },
  { id: 'tambourine', name: 'Tambourine', section: 'percussion' },
  {
    id: 'congas',
    name: 'Congas',
    section: 'percussion',
    worldInstrumentId: 'conga',
  },
  { id: 'bongos', name: 'Bongos', section: 'percussion' },
  { id: 'timbales', name: 'Timbales', section: 'percussion' },
  { id: 'vibraphone', name: 'Vibraphone', section: 'percussion' },
  {
    id: 'marimba',
    name: 'Marimba',
    section: 'percussion',
    worldInstrumentId: 'marimba',
  },
  { id: 'handclaps', name: 'Handclaps', section: 'percussion' },
  { id: 'cowbell', name: 'Cowbell', section: 'percussion' },
  { id: 'gong', name: 'Gong', section: 'percussion' },

  // ── Brass ──
  { id: 'trumpet', name: 'Trumpet', section: 'brass' },
  { id: 'trombone', name: 'Trombone', section: 'brass' },
  { id: 'french-horn', name: 'French Horn', section: 'brass' },
  { id: 'tuba', name: 'Tuba', section: 'brass' },
  { id: 'horn-section', name: 'Horn Section', section: 'brass' },

  // ── Woodwind ──
  { id: 'alto-sax', name: 'Alto Saxophone', section: 'woodwind' },
  { id: 'tenor-sax', name: 'Tenor Saxophone', section: 'woodwind' },
  { id: 'baritone-sax', name: 'Baritone Saxophone', section: 'woodwind' },
  { id: 'soprano-sax', name: 'Soprano Saxophone', section: 'woodwind' },
  { id: 'flute', name: 'Flute', section: 'woodwind' },
  { id: 'clarinet', name: 'Clarinet', section: 'woodwind' },
  { id: 'harmonica', name: 'Harmonica', section: 'woodwind' },

  // ── Strings ──
  { id: 'violin', name: 'Violin', section: 'strings' },
  { id: 'viola', name: 'Viola', section: 'strings' },
  { id: 'cello', name: 'Cello', section: 'strings' },
  { id: 'harp', name: 'Harp', section: 'strings' },
  { id: 'string-section', name: 'String Section', section: 'strings' },

  // ── Electronic ──
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    section: 'electronic',
    worldInstrumentId: 'synthesizer',
  },
  { id: 'sampler', name: 'Sampler', section: 'electronic' },
  {
    id: 'turntables',
    name: 'Turntables',
    section: 'electronic',
    worldInstrumentId: 'turntable',
  },
  { id: 'vocoder', name: 'Vocoder', section: 'electronic' },
  {
    id: 'theremin',
    name: 'Theremin',
    section: 'electronic',
    worldInstrumentId: 'theremin',
  },

  // ── Other ──
  { id: 'whistle', name: 'Whistle', section: 'other' },
  { id: 'strings-and-horns', name: 'Strings and Horns', section: 'other' },
];

const BY_ID = new Map(SESSION_INSTRUMENTS.map((i) => [i.id, i]));

/** The instrument for a `Credit.instrument` id, or undefined if unknown. */
export const getInstrument = (id: string): SessionInstrument | undefined =>
  BY_ID.get(id);

/** Every id, for the guard test and the editor's picker. */
export const INSTRUMENT_IDS: readonly string[] = SESSION_INSTRUMENTS.map(
  (i) => i.id,
);
