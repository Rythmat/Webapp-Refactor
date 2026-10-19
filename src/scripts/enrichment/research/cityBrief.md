# City recheck: hometown rule

The owner's rule (2026-10-16): **a person's City is their hometown, where they grew up**. It is not the scene they came up in, and not where they lived later.

- Miles Davis → East St. Louis (not New York).
- Billie Holiday → Baltimore.
- Nina Simone → Tryon.

A City is always the city, never a borough or neighbourhood: Queens, the Bronx, Brooklyn and Harlem → `new-york`; Tottenham → `london`. A separate municipality next to a city (Compton, Oakland, Hoboken) is its own City.

Repo root: `/Users/marfizo/Documents/Full App Code/Webapp-Refactor`. Work dir: `src/scripts/enrichment/research/_work/`.

## Input

`cityq/city-NN.json`: one entry per artist, each with `{ slug, name, currentCity }`. `currentCity` was written by an earlier pass that sometimes used the scene.

## Output

Write `cityfix/city-NN.json` (same NN), and nothing else:

```json
{
  "fills": [
    {
      "slug": "…",
      "path": "basedInPlaceId",
      "value": "east-st-louis",
      "sources": [
        { "url": "https://…", "field": "early life: raised in East St. Louis" }
      ],
      "note": "was new-york (scene)"
    }
  ],
  "unresolved": [{ "slug": "…", "path": "basedInPlaceId", "why": "…" }]
}
```

- Give every artist either a fill or an unresolved entry.
- If `currentCity` already is the hometown, still add a fill with the same value and a source. That confirms it.
- If where they grew up isn't documented, use the birthplace only when sources say they were raised there. Otherwise mark the cell unresolved.
- Mark it unresolved if they grew up in several places with no clear one.

## Places

Values are place ids.

- First look the place up in `src/components/atlas/data/cities.ts` (field `id`) and `src/content/data/places.json`. Use grep; match by name and country.
- If it isn't in either, set `value` to `{ "newPlace": { "name": "East St. Louis", "country": "United States", "lat": 38.62, "lng": -90.15 } }`. Use the town's own name, its country today, and the coordinates from the town's Wikipedia article.

## Sources

- Start from the artist's English Wikipedia article: the early life section. Confirm with a second source where you can.
- Never put a URL or a source name inside a `value`.
