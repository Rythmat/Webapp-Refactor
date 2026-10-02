/**
 * Which genres an instrument is typical in: the `typical_in` edges,
 * instrument → genre or subgenre.
 *
 * No content item says this: the vocabulary does. Each session instrument's
 * `typicalIn` (src/content/vocabulary/instruments.json, bare genre or
 * subgenre ids) is the row, and this module re-exports the table
 * `src/content/vocabulary/repo.ts` builds from it, as graph ids, in the
 * instruments' order. The table became data when the owner made the
 * vocabulary editable (30 Sep 2026); until the console edits it, every edge
 * it states still carries `via.code` naming this file (`CODE_OWNERS.
 * instrumentGenres`). It says what a style is built on, never that one
 * artist or one song used an instrument; credits say that
 * (`plays_instrument`).
 *
 * WHAT GOES IN
 *
 * Only the associations a music-history textbook would state without
 * hedging: the banjo in bluegrass, the clavinet in funk, the sitar in
 * Hindustani classical music. Three rules keep it conservative:
 *
 *  - An instrument every style uses (lead vocals, the drum kit, general
 *    percussion, handclaps) has no row. "Typical in everything" says nothing,
 *    and would make every genre look alike.
 *  - A row names the most specific style the instrument defines, and the
 *    graph walks a subgenre up to its genre (`SUBGENRE_PARENT`), so the
 *    banjo reaches Folk through Bluegrass without a second row. A genre is
 *    named outright only when the instrument is at home across the whole of
 *    it (the vibraphone in Jazz, the viola in Classical); the electric
 *    guitar is not, in a Blues that began acoustic, so it names Chicago
 *    blues instead.
 *  - A genre named outright may still sit beside a subgenre of its own that
 *    the instrument defines (the piano across Jazz, and ragtime). That row
 *    is not a repeat: the map stops at a genre, so the subgenre's own map
 *    reaches the instrument only through it.
 *  - When in doubt, leave it out. A missing row is an empty cell the owner
 *    can fill; a wrong one is a connection the map draws as fact.
 *
 * Where a subgenre walks up is the subgenre table's call, not this one's:
 * `mariachi` sits under Classical and `gospel` under Funk there today, so the
 * trumpet, the violin, the piano and the organs reach those genres through
 * them. Both are on the owner's review list.
 *
 * WHY SOME ROWS SAY WHAT THEY SAY
 *
 *  - piano: Blues through boogie-woogie only, since the country blues is a
 *    guitar music; salsa for the piano montuno, the repeated figure salsa is
 *    built over.
 *  - organ: the church and concert organ; the Hammond has its own row.
 *  - accordion: norteño's button accordion, and the Paris musette behind
 *    chanson.
 *  - banjo: the tenor banjo of the early New Orleans bands (Dixieland), too.
 *  - electric bass: slap bass in funk; in reggae the bass carries the tune.
 *  - drum machine: the 808 in hip hop, the 909 in house and techno.
 *  - tuba: the bass line of the early jazz and street bands.
 *  - tenor sax: the honking tenor solo of early rock and roll.
 *  - flute: charanga is the flute-and-violins band of Cuban dance music.
 *  - harmonica: the blues harp, country and Chicago alike; in Folk only the
 *    American revival's, which is too narrow a claim for the whole genre.
 *  - violin: as the fiddle, too; the globe's 'Fiddle' events are these
 *    styles.
 *  - theremin: the sound of the 1940s and 50s film score.
 *
 * Every id is checked against the vocabularies (deriveGraph.test.ts), so a
 * renamed instrument or subgenre fails a test rather than minting a missing
 * node.
 */

import { REPO_TABLES } from '@/content/vocabulary/repo';

/** A genre or subgenre, as the graph names it: `genre:jazz`, `subgenre:bebop`. */
export type TypicalGenre = `genre:${string}` | `subgenre:${string}`;

/**
 * The `via.path` of a `typical_in` edge. The row is code's, filed under its
 * instrument, so this names the list rather than a field anyone can edit.
 */
export const TYPICAL_IN_PATH = 'typical_in';

/**
 * `SESSION_INSTRUMENTS` id → the genres and subgenres it is typical in, for
 * the instruments that have any. An id in `typicalIn` is a subgenre when
 * the subgenres have it and the genres do not, and otherwise a genre, so an
 * id in neither surfaces as a missing node.
 */
export const INSTRUMENT_GENRES: Readonly<
  Record<string, readonly TypicalGenre[]>
> = REPO_TABLES.INSTRUMENT_GENRES;
