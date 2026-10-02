// ─────────────────────────────────────────────────────────────────────────
//  GENERATED — do not edit.
//
//  `npx vitest run src/scripts/apiContract/__tests__/suggestionSchema.test.ts`
//  regenerates this from src/content/suggestions/types.ts and fails if what
//  is committed here has drifted from it. Set WRITE_CONTRACT=1 to rewrite it.
//
//  A suggestion is a fact offered for a content body, kept beside it, never
//  in it; a decision is what the owner did with one. These are the rows the
//  importer's artifacts (src/scripts/enrichment/suggestions/*.json) hold,
//  `GET /suggestions` serves, and `POST /suggestions/decisions` takes, and
//  the rows of the committed `decisions.json`. See
//  docs/console-content-api-contract.md.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

/**
 * Who offers a fact. `app` is the repo's own data, read by a planner.
 */
export const suggestionProviderSchema = z.enum([
  'app',
  'musicbrainz',
  'wikidata',
]);

/**
 * Where a suggestion comes from, and where to check it.
 */
export const suggestionSourceSchema = z
  .object({
    provider: suggestionProviderSchema,
    /**
     * The page that states it: https://musicbrainz.org/artist/<mbid>,
     * https://www.wikidata.org/wiki/Q…. Absent for `app`, whose sources are
     * items in the store rather than pages on the web.
     */
    url: z.string().optional(),
    /**
     * What on that page says it, in a few words: 'life-span begin', 'P569',
     * or for `app` the item and field read ('evt-motown-25 tags').
     */
    label: z.string().optional(),
    /** The source's own id for the thing it describes: an MBID, a QID. */
    externalId: z.string().optional(),
  })
  .strict();

/**
 * The content item a suggestion is for.
 */
export const suggestionTargetSchema = z
  .object({
    /** The content kind: 'artist', 'song', 'globe_event', …. */
    kind: z.string(),
    /** The item's identity: `id` for today's kinds, `slug` for the records. */
    slug: z.string(),
  })
  .strict();

/**
 * How the value goes in. `set` puts it at the path, which must be empty (or
 * hold what the owner saw beside the suggestion). `add` puts one element into
 * the array the path names (`artistIds[]`), unless an element with the same
 * identity is already there.
 */
export const suggestionOpSchema = z.enum(['set', 'add']);

/**
 * How far to trust it. `sure` can be accepted in bulk; `likely` needs a
 * person to look; `ambiguous` means the sources point at more than one thing
 * (two MusicBrainz artists called Common) and nothing is suggested until the
 * owner picks one.
 */
export const suggestionTierSchema = z.enum(['sure', 'likely', 'ambiguous']);

/**
 * A record that has to exist before the suggestion can be written: the place
 * a birthplace names, the release an album credit points at. Created first,
 * in the contract's publish order, and looked up before it is created.
 */
export const requiredRecordSchema = z
  .object({
    kind: z.string(),
    slug: z.string(),
    /** Its whole body, in that kind's body shape. */
    body: z.unknown(),
  })
  .strict();

export const suggestionSchema = z
  .object({
    /**
     * Stable across re-imports: a hash of the target, the path and the value's
     * identity (`keys.ts` `suggestionId`), never of the source. So a rejection
     * stays rejected when the importer runs again, and a changed value — a
     * different birth year — arrives as a new suggestion, on purpose.
     */
    id: z.string(),
    target: suggestionTargetSchema,
    /**
     * Where the value goes, spelled as REF_PATHS spells it: 'born',
     * 'basedInPlaceId', 'session.studioId', 'artistIds[]' (with `add`),
     * 'credits[3].artistGlobeId' (one existing element, with `anchor`).
     */
    path: z.string(),
    /**
     * Which element an index in `path` means, by who it is rather than where
     * it sits: the element's key (`keys.ts` `elementAnchor`), such as
     * 'producer|quincy-jones' for a credit. Lists get reordered and edited
     * while suggestions wait, so the element is found by this when the
     * suggestion is applied, and `credits[3]` only says where it was.
     * Required when the path has an index; absent otherwise.
     */
    anchor: z.string().optional(),
    op: suggestionOpSchema,
    /**
     * What is written, in the body's own shape: a slug, a year, a credit. A
     * value that carries `unverified`/`source` (a credit, a release, `born`)
     * gets them from `apply.ts` when it is accepted.
     */
    value: z.unknown(),
    /** One line for the owner: 'Born 2 Apr 1939, Washington, D.C.'. */
    display: z.string(),
    /** Everyone who offers it; two agreeing sources are one suggestion. */
    sources: z.array(suggestionSourceSchema),
    /**
     * Why it is believed, in words the owner reads: 'name exact',
     * 'song "Let's Get It On" credited to this MBID', 'tag "motown"'.
     */
    evidence: z.array(z.string()),
    /** 0 to 1. Bulk accept starts at 0.85 and never goes below 0.7. */
    confidence: z.number(),
    tier: suggestionTierSchema,
    /** Records to create first. Absent when there is nothing to create. */
    requires: z.array(requiredRecordSchema).optional(),
    /**
     * The suggestion this one rests on: every field suggested for an artist
     * depends on the one that says which MusicBrainz artist they are. Not
     * accepted in bulk until that one is accepted.
     */
    dependsOn: z.string().optional(),
    /** The run that produced it: 'mb-2026-10-02', 'app-2026-10-01'. */
    batch: z.string(),
  })
  .strict();

/**
 * What the owner did with a suggestion.
 *  - `accept`  — written where the path was empty;
 *  - `replace` — written over a different value the owner saw beside it;
 *  - `reject`  — wrong: never offered again (until the value changes);
 *  - `drop`    — not wrong, but not to be carried over: a song-pin city the
 *    owner decides no artist should get (the mapping table for the backend
 *    needs these as much as the accepts);
 *  - `review`  — an earlier bulk accept, looked at since and kept;
 *  - `reopen`  — a reject or a drop taken back: the suggestion is open
 *    again, offered as before. It undoes nothing else — an accept is taken
 *    back by editing the item — and the reject it undoes stays in the log.
 */
export const decisionOpSchema = z.enum([
  'accept',
  'replace',
  'reject',
  'drop',
  'review',
  'reopen',
]);

/**
 * How a decision was made. `single`: one at a time, from a row. `bulk`:
 * many at once, from the Table's bulk accept; it counts as unreviewed until
 * someone marks it reviewed. `import`: by the bulk import
 * (`src/scripts/repoContent/importAll.ts`), which takes every sure and
 * likely suggestion and writes each value as plain data, with no
 * `unverified` and no source, exactly as a value typed in by hand. So an
 * import counts as reviewed. Only the import writes `import`:
 * `POST /suggestions/decisions` refuses it.
 */
export const decisionMethodSchema = z.enum(['single', 'bulk', 'import']);

export const suggestionDecisionSchema = z
  .object({
    suggestionId: z.string(),
    op: decisionOpSchema,
    target: suggestionTargetSchema,
    path: z.string(),
    /** The suggestion's `anchor`, when its path has an index. */
    anchor: z.string().optional(),
    /**
     * The value accepted, for `accept` and `replace`: enough to write it again
     * after the mock is reset, or on the backend, without the suggestion (a
     * path ending in `[]` is an `add`, any other a `set`).
     */
    value: z.unknown().optional(),
    /**
     * The suggestion's value as the owner saw it (`keys.ts` `valueHash`). A
     * decision about a value that has since changed decides nothing.
     */
    valueHash: z.string(),
    /**
     * For `replace`: the `valueHash` of what the owner wrote over (for an
     * `add`, the element with the same identity). A reset store holds that old
     * value again, and a replay may write over it only while it still hashes
     * to this — never over something newer.
     */
    seenHash: z.string().optional(),
    /**
     * For `accept` and `replace`: the records the value needed made first —
     * the `pin: false` place a City names, the artist a credit links — as the
     * suggestion carried them, less any the owner's own value no longer
     * names. The decision alone can then make them again: the app's
     * suggestions are in no committed artifact, and a replay, or the
     * backend's import, must not depend on a planner planning the same place
     * the same way. Absent when nothing had to be made.
     */
    requires: z.array(requiredRecordSchema).optional(),
    method: decisionMethodSchema,
    /** Who decided: the user's id. */
    by: z.string(),
    /** When, as an ISO timestamp. */
    at: z.string(),
  })
  .strict();

/** The suggestion contract's two rows, by what they are. */
export const suggestionSchemas = {
  suggestion: suggestionSchema,
  decision: suggestionDecisionSchema,
} as const;

export type SuggestionRow = z.infer<typeof suggestionSchema>;
export type SuggestionDecisionRow = z.infer<typeof suggestionDecisionSchema>;
