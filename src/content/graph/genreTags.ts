/**
 * Globe genre strings → the genre graph.
 *
 * The globe's events carry ~760 distinct free-text genre strings. This table
 * lands each on a GENRE (when the string simply is that genre) or on a
 * SUBGENRE with a parent, so 'Art Rock' and 'Rock' meet without 'Art Rock'
 * being lost.
 *
 * Three things are deliberately NOT genres here:
 *  - INSTRUMENT_TAGS — Marimba, Mbira, Oud Music. The graph has an `instrument`
 *    node kind, and an instrument link says more than a genre guess would.
 *  - IGNORED_GENRE_TAGS — 'World Music', 'Festival', 'Compilation'. They
 *    describe reach or format. Every event using one also carries a real tag.
 *  - UNPLACED_GENRE_TAGS — 129 traditions nobody has placed yet, listed rather
 *    than bucketed. They resolve to null: the Atlas says it does not know.
 *
 * WHERE THE ROWS LIVE
 *
 * In data, since the owner made the vocabulary editable in the console (30
 * Sep 2026): each subgenre, with its parent and the globe strings that are
 * it, is a line of src/content/vocabulary/subgenres.json, each genre's own
 * strings are its `tags` in genres.json, and the three lists are
 * genreTagLists.json. This module re-exports what
 * `src/content/vocabulary/repo.ts` builds from them, under the names and
 * shapes it had as code.
 *
 * One thing reads differently, and changes no answer: `resolveGenreTag`
 * looks a tag up on the genres and subgenres before it consults the lists,
 * and UNPLACED_GENRE_TAGS leaves out whatever a record has placed. So placing
 * a tag in the console is one record's write, with the list's file
 * untouched. No tag was both placed and listed when the rows moved, so every
 * string resolves as it did.
 */

import { REPO_TABLES } from '@/content/vocabulary/repo';

/** A globe genre string resolved into the graph. */
export interface ResolvedGenre {
  genre: string;
  subgenre?: string;
}

/**
 * The tables and the resolver, from the files.
 *
 *  - SUBGENRE_PARENT: subgenre id → parent genre id, in the file's order
 *    (grouped by genre).
 *  - TAG_TO_SUBGENRE: the globe string as authored → its subgenre id.
 *  - TAG_TO_GENRE: globe strings that are a genre outright, in the genres'
 *    order.
 *  - INSTRUMENT_TAGS: instruments wearing a genre tag. Route these to the
 *    instrument graph.
 *  - IGNORED_GENRE_TAGS: reach or format, not music. Always accompanied by a
 *    real tag.
 *  - UNPLACED_GENRE_TAGS: not placed yet — mostly one event each, from
 *    everywhere. Guessing would put Armenian duduk music in the wrong
 *    hemisphere. Most frequent first.
 *  - resolveGenreTag: where a globe genre string lands. Null when the tag
 *    carries no genre signal, names an instrument, or has not been placed —
 *    callers treat that as "unknown", never as a default genre.
 */
export const {
  SUBGENRE_PARENT,
  TAG_TO_SUBGENRE,
  TAG_TO_GENRE,
  INSTRUMENT_TAGS,
  IGNORED_GENRE_TAGS,
  UNPLACED_GENRE_TAGS,
  resolveGenreTag,
} = REPO_TABLES;
