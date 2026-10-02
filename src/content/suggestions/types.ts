/**
 * Suggested facts, and what the owner decided about each.
 *
 * A suggestion is a fact someone other than the owner offers for a content
 * body: the app's own data read a second way (an event's artists from its
 * tags, an artist's city from where their songs are pinned), or MusicBrainz
 * and Wikidata. It lives beside the content, never in it — no body has a
 * "suggested" field — so an item says only what the owner has accepted.
 * Accepting one is a normal save through `apply.ts`: a proposal when an
 * editor accepts it, a direct save when an admin does, with a revision note
 * that names the suggestion and its sources (Amendment 5, decisions 9–10).
 *
 * Accepted means confirmed. Every accept, replace, reject, drop and review is
 * also kept as a decision, in the store and in the committed
 * `src/scripts/enrichment/suggestions/decisions.json`, because stored
 * patches go stale when the seed changes and the backend's import needs the
 * owner's answers, not only the bodies they produced (C11).
 *
 * Import-free on purpose: the importer (a Node script) writes these shapes,
 * and `src/scripts/apiContract/suggestionSchema.ts` is generated from this
 * file. Use only what that generator understands — named interfaces, string
 * unions, arrays, optional fields and `unknown`.
 */

/** Who offers a fact. `app` is the repo's own data, read by a planner. */
export type SuggestionProvider = 'app' | 'musicbrainz' | 'wikidata';

/** Where a suggestion comes from, and where to check it. */
export interface SuggestionSource {
  provider: SuggestionProvider;
  /**
   * The page that states it: https://musicbrainz.org/artist/<mbid>,
   * https://www.wikidata.org/wiki/Q…. Absent for `app`, whose sources are
   * items in the store rather than pages on the web.
   */
  url?: string;
  /**
   * What on that page says it, in a few words: 'life-span begin', 'P569',
   * or for `app` the item and field read ('evt-motown-25 tags').
   */
  label?: string;
  /** The source's own id for the thing it describes: an MBID, a QID. */
  externalId?: string;
}

/** The content item a suggestion is for. */
export interface SuggestionTarget {
  /** The content kind: 'artist', 'song', 'globe_event', …. */
  kind: string;
  /** The item's identity: `id` for today's kinds, `slug` for the records. */
  slug: string;
}

/**
 * How the value goes in. `set` puts it at the path, which must be empty (or
 * hold what the owner saw beside the suggestion). `add` puts one element into
 * the array the path names (`artistIds[]`), unless an element with the same
 * identity is already there.
 */
export type SuggestionOp = 'set' | 'add';

/**
 * How far to trust it. `sure` can be accepted in bulk; `likely` needs a
 * person to look; `ambiguous` means the sources point at more than one thing
 * (two MusicBrainz artists called Common) and nothing is suggested until the
 * owner picks one.
 */
export type SuggestionTier = 'sure' | 'likely' | 'ambiguous';

/**
 * A record that has to exist before the suggestion can be written: the place
 * a birthplace names, the release an album credit points at. Created first,
 * in the contract's publish order, and looked up before it is created.
 */
export interface RequiredRecord {
  kind: string;
  slug: string;
  /** Its whole body, in that kind's body shape. */
  body: unknown;
}

export interface Suggestion {
  /**
   * Stable across re-imports: a hash of the target, the path and the value's
   * identity (`keys.ts` `suggestionId`), never of the source. So a rejection
   * stays rejected when the importer runs again, and a changed value — a
   * different birth year — arrives as a new suggestion, on purpose.
   */
  id: string;
  target: SuggestionTarget;
  /**
   * Where the value goes, spelled as REF_PATHS spells it: 'born',
   * 'basedInPlaceId', 'session.studioId', 'artistIds[]' (with `add`),
   * 'credits[3].artistGlobeId' (one existing element, with `anchor`).
   */
  path: string;
  /**
   * Which element an index in `path` means, by who it is rather than where
   * it sits: the element's key (`keys.ts` `elementAnchor`), such as
   * 'producer|quincy-jones' for a credit. Lists get reordered and edited
   * while suggestions wait, so the element is found by this when the
   * suggestion is applied, and `credits[3]` only says where it was.
   * Required when the path has an index; absent otherwise.
   */
  anchor?: string;
  op: SuggestionOp;
  /**
   * What is written, in the body's own shape: a slug, a year, a credit. A
   * value that carries `unverified`/`source` (a credit, a release, `born`)
   * gets them from `apply.ts` when it is accepted.
   */
  value: unknown;
  /** One line for the owner: 'Born 2 Apr 1939, Washington, D.C.'. */
  display: string;
  /** Everyone who offers it; two agreeing sources are one suggestion. */
  sources: SuggestionSource[];
  /**
   * Why it is believed, in words the owner reads: 'name exact',
   * 'song "Let's Get It On" credited to this MBID', 'tag "motown"'.
   */
  evidence: string[];
  /** 0 to 1. Bulk accept starts at 0.85 and never goes below 0.7. */
  confidence: number;
  tier: SuggestionTier;
  /** Records to create first. Absent when there is nothing to create. */
  requires?: RequiredRecord[];
  /**
   * The suggestion this one rests on: every field suggested for an artist
   * depends on the one that says which MusicBrainz artist they are. Not
   * accepted in bulk until that one is accepted.
   */
  dependsOn?: string;
  /** The run that produced it: 'mb-2026-10-02', 'app-2026-10-01'. */
  batch: string;
}

/**
 * What the owner did with a suggestion.
 *
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
export type DecisionOp =
  | 'accept'
  | 'replace'
  | 'reject'
  | 'drop'
  | 'review'
  | 'reopen';

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
export type DecisionMethod = 'single' | 'bulk' | 'import';

export interface SuggestionDecision {
  suggestionId: string;
  op: DecisionOp;
  target: SuggestionTarget;
  path: string;
  /** The suggestion's `anchor`, when its path has an index. */
  anchor?: string;
  /**
   * The value accepted, for `accept` and `replace`: enough to write it again
   * after the mock is reset, or on the backend, without the suggestion (a
   * path ending in `[]` is an `add`, any other a `set`).
   */
  value?: unknown;
  /**
   * The suggestion's value as the owner saw it (`keys.ts` `valueHash`). A
   * decision about a value that has since changed decides nothing.
   */
  valueHash: string;
  /**
   * For `replace`: the `valueHash` of what the owner wrote over (for an
   * `add`, the element with the same identity). A reset store holds that old
   * value again, and a replay may write over it only while it still hashes
   * to this — never over something newer.
   */
  seenHash?: string;
  /**
   * For `accept` and `replace`: the records the value needed made first —
   * the `pin: false` place a City names, the artist a credit links — as the
   * suggestion carried them, less any the owner's own value no longer
   * names. The decision alone can then make them again: the app's
   * suggestions are in no committed artifact, and a replay, or the
   * backend's import, must not depend on a planner planning the same place
   * the same way. Absent when nothing had to be made.
   */
  requires?: RequiredRecord[];
  method: DecisionMethod;
  /** Who decided: the user's id. */
  by: string;
  /** When, as an ISO timestamp. */
  at: string;
}
