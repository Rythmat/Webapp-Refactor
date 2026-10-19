# Research brief: one batch of roster artists

You fill empty cells of Music Atlas's Artists table for ~20 artists, using web
sources. Accuracy over coverage: an empty cell is fine, a wrong one is not.

Repo root: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor`.
Work dir: `src/scripts/enrichment/research/_work/`.

## Input

`queue/batch-NN.json`: one entry per artist.

| Field          | What it is                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`, `name` | The artist.                                                                                                                                                                                             |
| `group`        | Whether the act is a group.                                                                                                                                                                             |
| `article`      | Its English Wikipedia article URL, when one was found.                                                                                                                                                  |
| `known`        | Values already stored or filled. Use them for context; never change them.                                                                                                                               |
| `todo`         | The cells to fill.                                                                                                                                                                                      |
| `hints`        | Leads from the Wikipedia pass. Examples: generic instruments to make specific, a missing infobox origin, a conflict with another source, an article under another name whose identity needs confirming. |

## Output

Write `fills/batch-NN.json` (same NN), and nothing else:

```json
{
  "fills": [
    {
      "slug": "…",
      "path": "born.date",
      "value": "1938-10-15",
      "sources": [
        { "url": "https://…", "field": "what in the source says it" }
      ],
      "note": "optional, short"
    }
  ],
  "newPlaces": [],
  "rejectWikipedia": [],
  "unresolved": [{ "slug": "…", "path": "basedInPlaceId", "why": "…" }]
}
```

Give every `todo` cell either a fill or an unresolved entry. The one exception is `activeTo`; see below.

## The cells

**`born.date`**

- Use `YYYY-MM-DD`; `YYYY-MM` or `YYYY` when only that much is known.
- For a person, this is the birth date.
- For a group, it is the year the group formed.
- Never use a circa date.

**`born.placeId`**

- Only for a person: where they were born.
- A group never gets one.

**`basedInPlaceId` (City)** (owner rule, 2026-10-16)

- For a person: their **hometown, where they grew up**. It is not the scene they came up in, and not where they lived later.
  - Example: Miles Davis grew up in East St. Louis, so his City is East St. Louis, not New York. Billie Holiday's is Baltimore; Nina Simone's is Tryon.
  - If no source documents where they grew up, use the birthplace when they were raised there. Otherwise mark the cell unresolved.
  - Wikipedia's infobox `origin` is often the scene, so check the early-life section instead.
- For a group: where it formed.
- A City is always the city, never a borough, county, district or neighbourhood inside one: Queens, the Bronx, Brooklyn and Harlem → `new-york`; Tottenham and Brixton → `london`. A separate municipality next to a city (Compton, Oakland, Hoboken) is its own City.

**Birthplace (`born.placeId`)** follows the same city rule: born in Harlem → `new-york`.

**`activeFrom`**

- The year the act began performing or recording professionally. Wikipedia's years_active is the usual reference.

**`activeTo`**

- Only if the act has ended: disbanded, retired, or died. Fill the year it ended and cite it.
- If the act is still active, leave it out entirely, with no unresolved entry either.

**`genreIds`**

- 1–3 ids, most defining first.
- Use ids only from `src/content/vocabulary/genres.json` and `subgenres.json` (the `records[].id`). Read those files.
- Prefer a fitting subgenre id over its parent where the vocabulary has one.

**`instrumentIds`**

- What they are known for playing.
- Add `lead-vocals` for a lead singer or rapper, and `backing-vocals` only where that is their role.
- Use ids only from `src/content/vocabulary/instruments.json` (59 ids). There are no plain guitar, keyboard, bass or sax ids, so pick the specific one the sources support:
  - `electric-guitar` or `acoustic-guitar`
  - `piano`, `synthesizer`, `hammond-organ`, `electric-piano`, …
  - `electric-bass` or `upright-bass`
  - `alto-sax`, `tenor-sax`, …
- If the sources don't make it specific, take the artist's dominant one only when its article or photos make it clear, for example a rock guitarist on electric. Otherwise leave it out.
- For a group, give the core instrumentation of its classic lineup (for example `lead-vocals`, `electric-guitar`, `electric-bass`, `drum-kit`).
- An instrument the vocabulary lacks (kora, tabla, oboe) is left out. If nothing else fits, mark the cell unresolved, naming the instrument.

**`group`**

- If the entry says `group: false` but the act is a band, duo or ensemble, add a fill with `"path": "group", "value": true` and a source. Then treat it as a group for the other cells.

## Places

Place values are ids.

- First look for the place in `src/components/atlas/data/cities.ts` (field `id`) and `src/content/data/places.json`. Use grep; match by name and country.
- If it isn't in either, set the fill's `value` to `{ "newPlace": { "name": "Ariton", "country": "United States", "lat": 31.6, "lng": -85.7 } }`.
  - Use the town's own name and its country today.
  - Take the coordinates from the town's Wikipedia article.
  - The validator matches it or creates it.
- Use the town or city, never a hospital, a county or a region, unless the region is all the sources give.

## Sources and rules

- Start from the `article` URL (WebFetch it), or find the Wikipedia article. Confirm with a second source where you can: AllMusic, Britannica, an official site, or reputable press.
- Every fill needs at least one source URL.
- If sources disagree, add an unresolved entry naming both, rather than picking one. The exception is when one is clearly authoritative, such as the article itself explaining the discrepancy; then add a `note` saying why.
- Wrong identity is the worst error.
  - If the name is a billing of two acts ("Alicia Keys and Justin Timberlake"), a film or soundtrack, or otherwise not one act, add unresolved entries with why `not a single act: …`.
  - If a hint says the article has another title, confirm it is this act before using it.
- If the `article` (or a value in `known` that came from it) belongs to another act, add the slug to a top-level `"rejectWikipedia": ["slug"]` list in your output. All of that article's values will then be dropped, and you fill the `todo` cells from the right act.
- Never put a URL, or a MusicBrainz/Wikidata/Wikipedia name, inside a `value`.
- Only fill `todo` cells. Don't edit any file other than your output file.

## Credited people (batches 101 and up)

These are writers, producers and session players credited on our songs. They aren't on the globe roster.

- **Identity first.** Names like "David Williams" or "John Robinson" are shared by many people. The hint lists the songs they're credited on, so use a source only if it ties the person to at least one of those songs or to that artist's records. Otherwise mark every cell unresolved with why `identity not confirmed`.
- **Instruments.** `instrumentIds` must include the instruments the hint says they played on record, mapped to our ids. Add others only if sources say they're known for them. A pure songwriter or producer with no instrument in any source → unresolved.
- **Groups.** Choirs, orchestras and horn sections credited as one name are groups.
- **Thin sources.** Many session players have only an AllMusic, Discogs or obituary page. One reliable source that clearly matches the identity is enough.
