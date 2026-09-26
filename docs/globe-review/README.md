# Globe data review, September 2026

Every event, influence link, city and pathway behind the globe was read and
checked: 1,722 events (1,083 curated + 639 derived from the song library),
2,687 influence links, 302 cities, 20 pathways, 30 guided tours and 7 eras.
Curated-event and song findings were then put to two independent verifiers, and
only those both agreed on were applied.

## What was applied

| Change                                 | Count | Where                                                       |
| -------------------------------------- | ----- | ----------------------------------------------------------- |
| Event years corrected                  | 67    | `data/events/*.ts`                                          |
| Song years corrected                   | 143   | `data/events/songLibrary.ts` + `curriculum/data/songs/*.ts` |
| Events re-pinned to the right city     | 20    | `data/events/*.ts`                                          |
| City subdivisions un-shifted           | 151   | `data/cities.ts`                                            |
| Duplicate city entries resolved        | 4     | `data/cities.ts`                                            |
| Influence links removed                | 950   | `data/eventConnections.ts`                                  |
| Influence links flipped or re-sourced  | 19    | `data/eventConnections.ts`                                  |
| Pathway / featured references repaired | 9     | `data/historicalModules.ts`, `dashboard/GlobeSection.tsx`   |
| Country-click aliases added            | 9     | `utils/country.ts`                                          |

The scripts that applied them are in `src/scripts/globe-corrections/`, each with
its input patch file. They are idempotent and guarded on the value they expect
to replace, so re-running one reports rather than corrupts.

### The three defects worth knowing about

**Song years were mostly reissue dates.** They had been filled automatically
from MusicBrainz "earliest release by artist", which happily returned a 2008
chart return for a 1975 record. "December 1963 (Oh What A Night)" was stored as
2008, "Here Comes the Sun" as 2015, "Cisco Kid" as 1997. This mattered beyond
the dates on screen: the influence-link generator used those years to decide
what influenced what.

**Most song influence links were not real.** `buildSongConnections.mjs` paired a
song with any historical event sharing a genre _family_, within 30 years, in the
same country. Reviewed one at a time, 905 of its 1,123 links were rejected — a
Phish side project "influencing" a Britney Spears single, a Spice Girls event
"influencing" Hava Nagila. The 217 that survived are now ordinary curated data
and the generator is retired.

**Every city from Conakry to Paramaribo wore the previous city's subdivision.**
An off-by-one across the array: Bissau read "Conakry", Athens read "Chișinău",
Kyiv read "Ljubljana". 151 entries.

## What is not applied

`event-corrections.md` holds everything that still needs a person: 220 factual
errors inside event descriptions (the fix is a rewrite, not a value), 20 events
whose correct location the reviewers gave as alternatives, 174 song years seen
by only one reviewer, 74 items the two verifiers disagreed on, and 23 notes on
city copy.

`removed-connections.md` lists every influence link that was taken out, so a
curator can re-add any where the real relationship can be sourced.

## Getting this into production

Production serves globe events from the content CDN, published from the admin
console's Postgres drafts — the TypeScript in this repo is the local, test and
rollback copy. `globe-event-patch.json` is the same corrections keyed by event
id (207 events, 190 year changes, 20 location changes) for whoever applies them
to the drafts. Ids are the join key and none were renamed, even where the year
embedded in an id is now wrong, because connections, pathways and the featured
list all reference them.

Note that no env file in this repo sets `VITE_CONTENT_CDN_URL`. Confirm it is
set in the Vercel environments before assuming production reads the CDN at all;
if it is unset, production is already serving this bundled data and a deploy is
the whole job.

## Keeping it correct

`src/components/atlas/data/globeData.test.ts` now fails the build on: an
influence link that runs backwards in time, a duplicate or mutually-pointing
edge, a cycle, a pathway step that does not resolve or goes back in time, a
guided-tour stop pointing at a missing city, an era gap, a duplicate city id,
and the subdivision shift recurring.
