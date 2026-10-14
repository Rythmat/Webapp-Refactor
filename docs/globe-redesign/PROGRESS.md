# Globe "Time River" redesign — progress

The Globe section rebuilt after Dorot (dorot.tali.org.il/en): one immersive
page at `/atlas/globe` where Explore is the map, Eras the timeline ("river"),
and Regions & Cities, Pathways and Instruments are lenses that regroup the
river's lanes. Owner decisions of 2026-10-14: one immersive Atlas; the lanes
are music's family tree, splitting and merging over time (16 lanes, approved
after the P1 checkpoint); YouTube posters now, a curated image field later;
built in phases with screenshot checkpoints.

| Phase | What | State |
| --- | --- | --- |
| P0 | Baseline screens (`docs/globe-ui/screens/tr-p0-*`) and numbers (below) | done |
| P1 | Data, state and URL foundations; no visible change | done |
| P2 | The river in the Eras view | done — look check pending |
| P3 | Era rail, stream chips, window shared with the map | — |
| P4 | Event stage | — |
| P5 | Map bubbles and the place lens | — |
| P6 | Regions, Pathways and Instruments lenses; dashboard links | — |
| P7 | Morph, phone river, accessibility, budgets | — |
| P8 | Curated event image (content contract; needs the backend) | — |

## P0 baseline (2026-10-14)

`node scripts/measureGlobe.mjs --base=http://localhost:5266 --runs=3`, this
checkout (other sessions' work in progress included), MacBook, Metal GPU.

| Measure | Value |
| --- | --- |
| First globe frame | 5,921 ms (dev server, street-map tiles on) |
| City click to card | 182 ms |
| Card open, long tasks (4× CPU) | 1 (176 ms) |
| Drag, fps / long tasks / globe renders | 60 / 0 / 0 |
| Search, long tasks / globe renders | 0 / 0 |
| YouTube thumbnails | 48 requests, 97.9 kB |
| Map tiles / fonts and icons / outlines | 663.5 / 320.6 / 278.5 kB |
| Route chunk | 107.1 kB raw, 35.0 kB gzip |
| Page total | 1,365.4 kB gzip |

The route chunk sits close to its budget (`GLOBE_BUDGET.routeChunk` 102,904 B
+5% = 108,049 B), so the river ships as a lazy chunk and only small shared
pieces join the route.

## P1 foundations

- `data/lineage.ts` (+ `laneIds.ts`): music's family tree, 16 lanes that split
  and merge (Roots → Classical and Blues; Blues → Jazz, R&B, Rock; Rock +
  Classical → Metal…), built on the curriculum courses
  (`utils/genreMapping.ts`). An event older than its lane sits on the nearest
  ancestor flowing then. `lineage-calibration.md` is the owner's sheet,
  rewritten by `lineage.calibration.test.ts`. (P1 first shipped five flat
  streams; at the checkpoint the owner asked for lanes that split and merge.)
- `data/eventImage.ts`: one place for posters (`thumb` / `lane` / `stage`) and,
  later, a curated `image`.
- `data/timelineIndex.ts`: events in year order with stream, region and city.
- `timeline/timeWindow.ts`: the window maths and the era rail's scale.
- `navigation/atlasFrame.ts`, `sections.ts`, `atlasHref.ts`: the frame params
  (`view`, `lens`, `region`, `from`, `to`, `lane`) and the five sections.
- The store's `selectedEra` is now `timeWindow` (`SET_WINDOW`, keeps the pin);
  `navigation/useWindowSync.ts` keeps it and `from`/`to` in step and reads
  `?era=` links as years.
- The trail keeps its forward steps when the URL is replaced.

## P2 the river (Eras view)

- `components/River/`: `TimeRiver` (lazy chunk, 22.3 kB), `riverLayout` (the
  family tree as a delta in year space: lanes grow out of their parents and
  only flowing lanes take room), `riverCamera` (the view, outside React),
  `riverLevels` (√2 zoom levels; clusters per lane per level never overlap),
  `RiverBands` (era-tinted bands, strands, dashed inflows), `RiverMarkers`
  (posters, posters with counts, counts, dots), `useRiverGestures` (wheel,
  pinch, drag with momentum, two-finger pinch), `yearDigits`.
- Header (`AtlasToolbar`): the five section tabs (`AtlasSectionTabs`, the
  dashboard tab bar's look), search, the trail in a popover (`TrailPopover`;
  the thumbnail strip left), Copy link, and the globe / timeline switch
  (`ViewSwitch`). Timeline view hides the map's card, bottom bar, controls
  and credit; the map stays mounted under it with its motion paused.
- Until the event stage (P4), opening an event in the river shows it on the
  map in its card.
- Budget raised and recorded (`docs/globe-ui/BASELINE.md`, Budget changes):
  route chunk 110,237 B, static imports 316,812 B. The timeline is checked to
  stay lazy (`GLOBE_ON_DEMAND`).
- River at 4× CPU (scratch measurement, dev server): drag ~58 fps and zoom out
  ~53 fps with no long tasks, zoom in ~45 fps with 2; 60 fps at 1×. A river
  pass for `scripts/measureGlobe.mjs` is P7.
- Screens: `docs/globe-ui/screens/tr-p2-*`.
