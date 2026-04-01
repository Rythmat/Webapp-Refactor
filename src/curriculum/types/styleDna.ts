/**
 * Phase 2 — Style DNA types.
 *
 * Models artist references and musical vocabulary per genre×level.
 * Used for browsable reference content and contextual learning.
 */

/** A single artist reference within a genre's Style DNA */
export interface ArtistReference {
  name: string;
  /** Brief description of the artist's style and contribution */
  description: string;
  /** Musical characteristics/techniques associated with this artist */
  characteristics: string[];
  /** Style tags for cross-referencing */
  styleTags: string[];
}

/** Musical vocabulary entry */
export interface MusicalVocabulary {
  term: string;
  definition: string;
  /** Category: 'rhythm', 'harmony', 'melody', 'texture', 'form' */
  category: string;
}

/**
 * Style DNA for a single genre × level combination.
 * Contains artist references and genre-specific musical vocabulary.
 */
export interface StyleDnaEntry {
  genre: string;
  level: number;
  /** Display title (e.g. "Afrobeat Foundations", "Highlife & Soukous") */
  title: string;
  /** Artist references for this level */
  artists: ArtistReference[];
  /** Musical vocabulary introduced at this level */
  vocabulary: MusicalVocabulary[];
  /** Key musical concepts for this level */
  concepts: string[];
}
