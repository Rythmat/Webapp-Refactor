import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import {
  PROGRESSION_STYLE_TO_GENRE,
  SONG_TAG_TO_GENRE,
} from '@/content/graph/genres';
import { REPO_VOCABULARY } from '@/content/vocabulary/repo';
import type { VocabularyRecords } from '@/content/vocabulary/schemas';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import { VIBE_ALGORITHMS } from '@/curriculum/engine/vibeAlgorithms';
import { regionIdSchema } from './recordBodySchemas';
import { songModeSchema } from './songBodySchema';

/**
 * The vocabularies a content body may use, as data the API can check against.
 *
 * Vocabularies stay in the repo (decided in the Phase 2 handoff): genres,
 * instruments, modes, vibes, regions and eras are small, slow-moving lists.
 * The API has no copy of them, so a body field that must name one
 * (`REF_PATHS` entries marked `vocab`) is checked against this generated file
 * instead. `vocabulary.test.ts` regenerates it and fails if the committed
 * copy has drifted; when it changes, it joins the next version's draft in
 * manifest.json (`draftVersion`), so the API knows its copy is older once
 * that draft is handed over.
 *
 * Genres, subgenres and instruments are data since the owner made them
 * editable in the console (30 Sep 2026): they come in as `records`, the
 * repo's files (src/content/vocabulary/) unless a caller passes others. So a
 * console save regenerates this file from the records it is about to write,
 * before they are the repo's (`writeVocabulary.ts`). What maps other
 * vocabularies onto them, and the rest of the lists, stay code.
 *
 * Only a genre's id, name or `taught`, a subgenre's id or parent, or an
 * instrument's id, name or section changes the output; tags, `typicalIn`, a
 * genre's note and an instrument's world entry do not.
 *
 * The progression styles come from the library (`progressions`), the
 * repo's chordProgressionLibrary.ts unless a caller passes the entries it
 * holds: the dev repo content server passes the library as its store has
 * it, which is the file on disk even after a save this process's module
 * copy has not seen.
 */
export function buildVocabulary(
  records: Pick<
    VocabularyRecords,
    'genres' | 'subgenres' | 'instruments'
  > = REPO_VOCABULARY,
  progressions: readonly { styles: readonly string[] }[] = LIB,
) {
  const sortById = <T extends { id: string }>(items: T[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));
  return {
    /** Graph genres: `artist.genreIds`, `song.subgenreIds` parents. */
    genres: sortById(
      records.genres.map((g) => ({ id: g.id, name: g.name, taught: g.taught })),
    ),
    /** Graph subgenres, each with its parent genre. */
    subgenres: sortById(
      records.subgenres.map((s) => ({ id: s.id, parent: s.parent })),
    ),
    /** The only values `song.genreTags` may hold (the student filter's list). */
    songGenreTags: Object.keys(SONG_TAG_TO_GENRE).sort(),
    /** `chord_progression.styles`: the library's own spellings. */
    progressionStyles: [
      ...new Set([
        ...Object.keys(PROGRESSION_STYLE_TO_GENRE),
        ...progressions.flatMap((p) => p.styles),
      ]),
    ].sort(),
    /** Session instruments: `credits[].instrument`, `artist.instrumentIds`. */
    instruments: sortById(
      records.instruments.map((i) => ({
        id: i.id,
        name: i.name,
        section: i.section,
      })),
    ),
    /** `chord_progression.vibes`. */
    vibes: Object.keys(VIBE_ALGORITHMS).sort(),
    /** `song.mode`. */
    modes: [...songModeSchema.options].sort(),
    /** Globe regions: a place's `region`. */
    regions: [...regionIdSchema.options].sort(),
    /** Musical eras, with the years each covers. */
    eras: MUSICAL_ERAS.map((e) => ({
      id: e.id,
      label: e.label,
      yearStart: e.yearStart,
      yearEnd: e.yearEnd,
    })),
  };
}

export type Vocabulary = ReturnType<typeof buildVocabulary>;
