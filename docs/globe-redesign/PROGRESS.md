# Globe "Time River" redesign — progress

The Globe section rebuilt after Dorot (dorot.tali.org.il/en): one immersive
page at `/atlas/globe` where Explore is the map, Eras the timeline ("river"),
and Regions & Cities, Pathways and Instruments are lenses that regroup the
river's lanes. Owner decisions of 2026-10-14: one immersive Atlas; YouTube
posters now, a curated image field later; built in phases with screenshot
checkpoints. The lanes went through two rounds: music's family tree (16
genre lanes, P1b–P2), then — after the P2 look check, "lanes that are not
genres, thicker like Dorot's, colours that change at splits and over time" —
the world's four great regions, which split into regions and cities (P2b).
Genres became Dorot-style filter chips; the family tree waits for the
Pathways lens. The canvas stays dark.

| Phase | What                                                                   | State                     |
| ----- | ---------------------------------------------------------------------- | ------------------------- |
| P0    | Baseline screens (`docs/globe-ui/screens/tr-p0-*`) and numbers (below) | done                      |
| P1    | Data, state and URL foundations; no visible change                     | done                      |
| P2    | The river in the Eras view (genre lanes)                               | done, then redone as P2b  |
| P2b   | Dorot pass: place lanes that split, era rail, corner globe, motion     | done                      |
| P2c   | Polish: vivid two-tone bands, richer fan, fuller bands, tighter layout | done — look check pending |
| P3    | Era rail, stream chips, window shared with the map                     | done in P2b               |
| P4    | Event stage                                                            | done                      |
| P5    | Map bubbles and the place lens                                         | —                         |
| P6    | Regions, Pathways and Instruments lenses; dashboard links              | —                         |
| P7    | Morph, phone river, accessibility, budgets                             | —                         |
| P8    | Curated event image (content contract; needs the backend)              | —                         |

## P0 baseline (2026-10-14)

`node scripts/measureGlobe.mjs --base=http://localhost:5266 --runs=3`, this
checkout (other sessions' work in progress included), MacBook, Metal GPU.

| Measure                                | Value                                      |
| -------------------------------------- | ------------------------------------------ |
| First globe frame                      | 5,921 ms (dev server, street-map tiles on) |
| City click to card                     | 182 ms                                     |
| Card open, long tasks (4× CPU)         | 1 (176 ms)                                 |
| Drag, fps / long tasks / globe renders | 60 / 0 / 0                                 |
| Search, long tasks / globe renders     | 0 / 0                                      |
| YouTube thumbnails                     | 48 requests, 97.9 kB                       |
| Map tiles / fonts and icons / outlines | 663.5 / 320.6 / 278.5 kB                   |
| Route chunk                            | 107.1 kB raw, 35.0 kB gzip                 |
| Page total                             | 1,365.4 kB gzip                            |

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

## P2b the Dorot pass (place lanes)

Owner feedback on P2: lanes must not be genres; thicker, Dorot-like lanes;
colours that change at splits and over time; Dorot's bottom timeline and a
globe in the bottom-left corner; smooth animations. Picked: lanes = world
regions that split; stay dark.

- `data/placeTree.ts`: Americas, Europe, Africa & Middle East, Asia & Pacific
  (each a hue); an opened continent splits into its regions, an opened region
  into its five busiest cities and "Elsewhere"; each split shades its
  parent's hue. Genres are chips (`data/genreChips.ts`, `genres=` on the URL).
- `components/River/placeLayout.ts` + `PlaceBands.tsx`: Dorot's fan in screen
  space — every lane leaves one bright source at the left; siblings travel
  together (blending brighter, `mix-blend-mode: screen`) to their split, then
  part into their own colours; the straight runs carry an era tint that slides
  with the years. Bands grow in from the left with round heads, draw back for
  the globe, and split / merge with a tween; markers slide with their lane.
- `timeline/TimeCamera.tsx`: one time camera for the page (the river, the era
  rail and the map's filter share it).
- `components/UI/EraRail.tsx` (lazy): Dorot's range bar — a strip of era
  colours, the years in view lit between two handles, era names on hover;
  drag, pan, click an era, arrow keys; "Show all years" on the globe.
- `components/UI/GlobeCornerButton.tsx`: a small turning cobe globe, bottom
  left of the timeline, opens the map.
- Motion follows the `animate` skill: `--ease-out` / `--ease-in-out` on
  `.atlas-root` (`theme/motion.ts` for frame-written tweens); markers move by
  the individual `translate` property; a pan moves the marker layer with one
  transform; wheel zoom glides.
- Budget: route chunk 111,359 B, static imports 321,042 B — inside the P2
  budget. Lazy: TimeRiver 33.8 kB, EraRail 5.3 kB, cobe 13.4 kB.
- Screens: `docs/globe-ui/screens/tr-p2-*` (eras, regions, cities, splitting,
  morph to globe, era rail hover, genres, phone).

## P2c polish

Owner asked for all four: colours had turned muddy, the bands looked empty,
space was wasted, and the fan wanted to be richer.

- Colours: no era tint over the bands any more (it mixed them toward olive
  and grey). Each continent runs between two colours of its own, Dorot's
  way — Americas coral → peach, Europe violet → blue, Africa & Middle East
  orange → red, Asia & Pacific green → cyan — and its regions and cities are
  shades of both. Eras keep their colours on the era rail.
- Fan: a soft glow at the source; strand nodes and restyled chips at each
  split; up to five faint dots along each lane's fan for its events from
  before the years shown. Fans are lighter than runs, so overlapping
  siblings brighten without blowing out.
- Bands: bigger posters; clusters show up to three overlapping pictures
  with a count (Dorot's stacks); a band 96 px or thicker carries two rows of
  markers. YouTube's grey "video unavailable" placeholder counts as a failed
  picture.
- Layout: the lanes start right under the years and chips; many lanes close
  their gaps, then thin, rather than spill; names wrap on thick bands and
  are cut short on thin ones.
- River at 4× CPU (dev): drag ~59 fps, zoom out ~48 fps, zoom in ~33 fps
  (stacks mount more pictures as levels change; a perf pass is P7).

## P4 event stage

Dorot's stage: clicking a moment on the river grows its lane to fill the
canvas and opens the moment on a card, with the moments before and after it
one arrow away.

- `components/River/EventStage.tsx` (in the lazy river chunk): the lane's
  band grows from where it ran (ease-in-out, 450 ms) while the rest of the
  river fades; the card fades in after it. A stadium card on desktop, a
  rounded card on phones: a round picture, "Lane · Era · 22 of 105", the
  title at display size, "1962, Apia", the story (faded at its foot), genre
  badges, Play and "Show on the globe", and an ⓘ popover with the picture's
  credit and a YouTube link.
- Play morphs the round picture into the 16:9 video (framer `layout`) and
  starts it (`AtlasVideo` has a new `autoplay` prop).
- Stepping: 56 px arrows either side, or ← / →, walk the lane by year; the
  content slides the way you went. Hovering an arrow names the moment it
  leads to, under the arrow and clear of the card's text. On a phone the
  arrows sit beside Close. Each step is a stop, so Back walks back.
- Closing: Close, Escape or Back draws the band back into its lane and
  returns focus to the marker. The river is `inert` and its gestures off
  while the stage is open; its pointer line hides (and never shows after a
  tap).
- The stage stays in the timeline (`?view=timeline&event=…`); "Show on the
  globe" switches to the map with the same moment pinned.
- Budget: route chunk 112,956 B, static imports 322,841 B — inside the P2
  budget. TimeRiver 46.7 kB lazy (was 33.8 kB).
- Screens: `docs/globe-ui/screens/tr-p4-*` (open, hover next, stepped,
  closing, phone open, phone stepped).
