import type { RefPath } from '@/scripts/apiContract/refPaths';
import type { VocabularyKind } from './schemas';

/**
 * The reference-bearing fields of the vocabulary's own records: `REF_PATHS`
 * for the kinds only the repo holds.
 *
 * `REF_PATHS` (src/scripts/apiContract/refPaths.ts) is a contract file the
 * content API copies as it is, and the API serves no vocabulary: its copy of
 * the genres and instruments is `vocabulary.generated.json`. So the fields
 * genres, subgenres and instruments hold are listed here instead, in the
 * same shape, and the contract file is left alone. `refPaths.test.ts` holds
 * the two lists together as one: each path once, every id-shaped field of
 * every body schema (these kinds' schemas included) named in one of them.
 *
 * What names a record is checked by the vocabulary's own rules
 * (`validate.ts`): a subgenre's parent and an instrument's `typicalIn` are
 * INVALID_REFERENCE when they name nothing, and a record anything names is
 * refused a delete (REFERENCED, from `references`).
 *
 * Until the graph reads the vocabulary from the records (plan P5), it still
 * draws a subgenre's parent and an instrument's typical genres as code's
 * (`CODE_OWNERS.subgenres`, `.instrumentGenres`, and the path `typical_in`),
 * which the test allows for by name.
 */

/** A reference-bearing field of a vocabulary record. */
export type RepoRefPath = Omit<RefPath, 'kind'> & { kind: VocabularyKind };

export const REPO_REF_PATHS: readonly RepoRefPath[] = [
  {
    kind: 'subgenre',
    path: 'parent',
    target: 'genre',
    note: 'The genre it sits under. Required: which level a record is at is its kind, so a subgenre always has one.',
  },
  {
    kind: 'instrument',
    path: 'typicalIn[]',
    target: 'genre',
    alsoTargets: ['subgenre'],
    note: 'Bare genre or subgenre ids, the most specific style the instrument defines, as an artist’s genreIds; the level is looked up.',
  },
  {
    kind: 'instrument',
    path: 'worldInstrumentId',
    target: 'world_instrument',
    code: true,
    derive: false,
    note: 'The same instrument in the globe’s Instruments of the World (WORLD_INSTRUMENTS), a list in code; the validator refuses an id it lacks (UNKNOWN_CODE_ID).',
  },
];
