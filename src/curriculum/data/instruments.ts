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
 *
 * The instruments are data, one per line in
 * src/content/vocabulary/instruments.json, which the console edits (the
 * owner's call, 30 Sep 2026). This module reads that file and nothing else
 * of the vocabulary: the song page's pills load it, and the genre data
 * (src/content/vocabulary/repo.ts) must never ride along into a student's
 * download. So it maps the records here itself, leaving out `typicalIn`,
 * which only the graph reads (instrumentGenres.ts). The section names and
 * their blurbs stay code.
 */

import INSTRUMENT_FILE from '@/content/vocabulary/instruments.json';

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

/**
 * Every session instrument, in the file's order: by section, as the
 * Vocabulary page and the pickers list them. `section` is cast from the
 * file's plain string; the file's schema holds it to the sections above
 * (src/content/vocabulary/schemas.ts, checked by files.test.ts).
 */
export const SESSION_INSTRUMENTS: readonly SessionInstrument[] =
  INSTRUMENT_FILE.records.map(({ id, name, section, worldInstrumentId }) =>
    worldInstrumentId === undefined
      ? { id, name, section: section as InstrumentSection }
      : { id, name, section: section as InstrumentSection, worldInstrumentId },
  );

const BY_ID = new Map(SESSION_INSTRUMENTS.map((i) => [i.id, i]));

/** The instrument for a `Credit.instrument` id, or undefined if unknown. */
export const getInstrument = (id: string): SessionInstrument | undefined =>
  BY_ID.get(id);

/** Every id, for the guard test and the editor's picker. */
export const INSTRUMENT_IDS: readonly string[] = SESSION_INSTRUMENTS.map(
  (i) => i.id,
);
