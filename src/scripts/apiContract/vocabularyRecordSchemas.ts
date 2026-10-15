// ─────────────────────────────────────────────────────────────────────────
//  The vocabulary kinds' bodies, for the content API to validate with:
//  `genre`, `subgenre` and `instrument`, keyed by kind in
//  `vocabularyRecordSchemas` below.
//
//  A copy of the record schemas in src/content/vocabulary/schemas.ts, the
//  shape of the repo's src/content/vocabulary/*.json files. That file
//  imports the slug grammar and the instrument sections from the app, so the
//  API cannot copy it; this one imports only zod, with both written in.
//  `vocabularyRecordSchemas.test.ts` fails when the two part ways, and runs
//  every vocabulary record through both.
//
//  A vocabulary id never changes, and neither does a genre's `taught` (only
//  code changes what the curriculum covers). See
//  docs/console-backend-integration.md. manifest.json records this file's
//  hash.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

/** A vocabulary id: kebab-case, as `slugPatterns.generated.json` gives it. */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Text a person reads: never blank, never padded. */
const text = z
  .string()
  .refine((value) => value !== '' && value.trim() === value, {
    message: 'Must not be blank or start or end with a space',
  });

/** A globe genre string, exactly as the globe writes it. */
const tag = text;

export const instrumentSectionSchema = z.enum([
  'voice',
  'keys',
  'guitar',
  'bass',
  'drums',
  'percussion',
  'brass',
  'woodwind',
  'strings',
  'electronic',
  'other',
]);

export const genreRecordSchema = z
  .object({
    id: z.string().regex(KEBAB, 'Not a genre id (kebab-case)'),
    name: text,
    /** The curriculum covers it. Immutable: a new genre is never taught. */
    taught: z.boolean(),
    /** Why it exists without being taught. */
    note: text.optional(),
    /** The globe's own spellings that simply are this genre. */
    tags: z.array(tag),
  })
  .strict();

export const subgenreRecordSchema = z
  .object({
    id: z.string().regex(KEBAB, 'Not a subgenre id (kebab-case)'),
    name: text,
    /** A genre id. */
    parent: z.string().regex(KEBAB, 'Not a genre id (kebab-case)'),
    tags: z.array(tag),
  })
  .strict();

export const instrumentRecordSchema = z
  .object({
    id: z.string().regex(KEBAB, 'Not an instrument id (kebab-case)'),
    /** Shown to students on song pages. */
    name: text,
    /** Shown to students on song pages. */
    section: instrumentSectionSchema,
    /** The globe's Instruments of the World entry, when it is the same instrument. */
    worldInstrumentId: text.optional(),
    /** Genre or subgenre ids, the most specific style the instrument defines. */
    typicalIn: z.array(
      z.string().regex(KEBAB, 'Not a genre or subgenre id (kebab-case)'),
    ),
  })
  .strict();

/** What each vocabulary kind's body must satisfy, keyed by content kind. */
export const vocabularyRecordSchemas = {
  genre: genreRecordSchema,
  subgenre: subgenreRecordSchema,
  instrument: instrumentRecordSchema,
} as const;

export type VocabularyRecordKind = keyof typeof vocabularyRecordSchemas;
