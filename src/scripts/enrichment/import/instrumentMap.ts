import { normalizeArtistName } from '@/content/graph/slugs';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';

/**
 * An instrument as Wikidata (P1303) or a MusicBrainz "member of band"
 * attribute names it → a `SESSION_INSTRUMENTS` id.
 *
 * Our vocabulary is a session sheet's, not an organologist's: it has Electric
 * Guitar and Acoustic Guitar but no plain Guitar, four saxophones but no plain
 * Saxophone. A source that says only "guitar" or "saxophone" does not say
 * which, so those map to nothing and are reported, rather than guessed — the
 * owner can add a plain id to the vocabulary if they want them.
 */

const key = (text: string): string => normalizeArtistName(text);

/**
 * What the sources call an instrument our vocabulary names otherwise.
 * Exported for the vocabulary's checks: an instrument an alias leads to is
 * not deleted from the console (a `CodeTable` in
 * src/content/vocabulary/validate.ts).
 */
export const ALIASES: Record<string, string> = {
  voice: 'lead-vocals',
  vocals: 'lead-vocals',
  'lead vocals': 'lead-vocals',
  singing: 'lead-vocals',
  'human voice': 'lead-vocals',
  'background vocals': 'backing-vocals',
  'backing vocals': 'backing-vocals',
  'grand piano': 'piano',
  'rhodes piano': 'fender-rhodes',
  rhodes: 'fender-rhodes',
  'wurlitzer electric piano': 'wurlitzer',
  'pipe organ': 'organ',
  'electric organ': 'organ',
  'classical guitar': 'acoustic-guitar',
  'steel guitar': 'pedal-steel',
  'pedal steel guitar': 'pedal-steel',
  'bass guitar': 'electric-bass',
  'electric bass guitar': 'electric-bass',
  'double bass': 'upright-bass',
  contrabass: 'upright-bass',
  'bass synthesizer': 'synth-bass',
  drums: 'drum-kit',
  'drum set': 'drum-kit',
  'drums drum set': 'drum-kit',
  'drum kit': 'drum-kit',
  'percussion instrument': 'percussion',
  conga: 'congas',
  'bongo drum': 'bongos',
  bongo: 'bongos',
  horn: 'french-horn',
  'alto saxophone': 'alto-sax',
  'tenor saxophone': 'tenor-sax',
  'baritone saxophone': 'baritone-sax',
  'soprano saxophone': 'soprano-sax',
  fiddle: 'violin',
  violoncello: 'cello',
  synth: 'synthesizer',
  'moog synthesizer': 'synthesizer',
  keytar: 'synthesizer',
  turntable: 'turntables',
  turntablism: 'turntables',
  whistling: 'whistle',
};

let index: Map<string, string> | null = null;

function built(): Map<string, string> {
  if (index) return index;
  index = new Map();
  for (const instrument of SESSION_INSTRUMENTS) {
    index.set(key(instrument.name), instrument.id);
    index.set(key(instrument.id), instrument.id);
  }
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (!index.has(alias)) index.set(alias, id);
  }
  return index;
}

/** The session instrument a source's name means, or null. */
export const mapInstrument = (name: string): string | null =>
  built().get(key(name)) ?? null;

/**
 * "member of band" attributes that say how someone was a member, not what
 * they played: skipped without being reported as unmapped.
 */
export const MEMBERSHIP_ATTRIBUTES: ReadonlySet<string> = new Set([
  'original',
  'eponymous',
  'principal',
  'founder',
  'additional',
  'minor',
  'guest',
  'solo',
  'emeritus',
  'touring',
]);
