# Globe Event YouTube Link Audit — Report

**Scope:** all 1,719 Globe events (`src/components/atlas/data/events/*.ts`).
**Goal:** verify existing YouTube links for accuracy, and add validated links to as many events as possible.

## Headline

|                                | Before        | After             |
| ------------------------------ | ------------- | ----------------- |
| Events with a video link       | 1,285 (74.7%) | **1,629 (94.8%)** |
| Dead / removed / private links | 14            | **0**             |

Every link that was written or kept was validated **live** via the YouTube oEmbed API, and every added link was chosen from an oEmbed-confirmed candidate (0 hallucinated IDs — verified each picked ID existed in its event's real candidate list).

## Method

The accuracy backbone is YouTube's keyless **oEmbed** endpoint (`/oembed?url=…watch?v=<id>`): HTTP 200 → live (returns real title + channel); 401/403/404 → dead. On top of that:

1. **Verify** — oEmbed every existing link; token-match the real video title/channel against the event's song/artist (or, for historical events, the artist/work `tags`).
2. **Adjudicate** (LLM) — for links the heuristic couldn't clear, judge keep vs replace from the real video metadata.
3. **Search + validate** — for events needing a link, search candidates and oEmbed-validate each.
4. **Select** (LLM) — pick the best _confident_ candidate per event, or none.
5. **Apply** — write validated IDs (genre files in place; songs via `_youtube_links.json` + `songLibrary.ts`).

Tooling added: `src/scripts/auditVideoLinks.mjs` (`--verify`, `--search-missing`, `--dump-flagged`, `--build-assignments`, `--apply`).

## What the audit found in the existing 1,285 links

The pre-existing links were never validated (they came from scripts that took the _first_ search hit). The audit found **306 of them (23.8%) were wrong or broken**:

- **979 confirmed correct** (626 auto-verified high-confidence + 353 LLM-confirmed).
- **292 wrong video** — e.g. _Footloose_ → a "how it was recorded" documentary; _Nothing Compares 2 U_ → an "Unknown Artist" upload; _One Dance_ → the wrong song ("Summer Sixteen"); many historical events → DJ mixes, reaction videos, travel vlogs, or the wrong artist entirely.
- **14 dead** (removed/private).

## What was changed

| Action                                                       | Count          |
| ------------------------------------------------------------ | -------------- |
| Wrong/dead links **replaced** with a validated correct video | 243            |
| Missing events **newly linked** (validated)                  | 347            |
| Dead links **removed** (no good replacement found)           | 3              |
| **Net coverage change**                                      | **+344 links** |

All 9 song-side fixes verified spot-on (e.g. _Footloose_ → Kenny Loggins VEVO, _Proud Mary_ → Tina Turner, _Get Up (Sex Machine)_ → James Brown Topic, and `dont_stop_believin` finally linked to the official Journey video).

## Left for you (honestly flagged, nothing guessed)

- **`src/scripts/_unresolved.json` — 87 events** still have no link: no candidate was a _confident_ match (per your "confident matches only" choice). Mostly ambiguous historical events ("band forms", "scene emerges") with no single canonical video.
- **`src/scripts/_review.json` — 60 events** whose current link is likely wrong but where no confident replacement was found, so the existing link was **left in place** for you to review. Includes 7 well-known songs (Jack & Diane, On & On, Suit & Tie, Funk #49) — see the data-quality note below.

## Data-quality findings

- **`&amp;` HTML entities + duplicate song events — FIXED (follow-up pass).** 6 song titles contained a literal `&amp;`, and 3 of them were **duplicate song events** with `_amp_` slugs (`song-jack_amp_diane` + `song-jack_diane`, etc.). Resolved: removed the 3 orphaned `_amp_` source files + their `songLibrary`/`_youtube_links`/`_generated_index` entries; repointed/cleaned their `eventConnections` edges (avoiding an influence-graph cycle); decoded `&amp;`→`&` across `songLibrary.ts`; and hardened `buildGlobeData.mjs` to decode HTML entities so it can't recur. Event count is now **1,716** (1,719 − 3 dupes). The three clean twins (`jack_diane`, `on_on`, `suit_tie`) remain but still carry a likely-wrong video (see `_review.json`) — the `&amp;` garbling is gone but the scraper still couldn't surface a clean candidate for those famous tracks.

## Caveats

- Candidate discovery uses the unofficial `youtube-search-api` scraper, which is unreliable and sometimes returns SEO/trending pollution (phonk playlists, unrelated TV clips). oEmbed + the LLM selector reject those, but it's the main reason the unresolved/review tail exists — not a data problem.
- oEmbed matches at the title/artist level; it can't distinguish an official studio cut from a legit live/remaster cut. The LLM only rejected clearly-wrong videos (wrong song/artist/cover/doc), not version nuances.

## Re-run / verify

```bash
nvm use 20
node src/scripts/auditVideoLinks.mjs --verify   # re-checks every link; expect 0 dead
```

Artifacts: `_video_audit.json` (per-link verdicts), `_final_assignments.json` (exactly what changed), `_review.json`, `_unresolved.json`.
Data changed: 15 event `*.ts` files + `src/curriculum/data/songs/_youtube_links.json`.
