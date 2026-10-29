# The Globe's map engine

The Globe page (`/globe`) draws its map with MapLibre GL 6 in globe
projection, from the Globe's own data alone: Natural Earth's country and
state outlines (public domain) on the sea, and the app's own places,
events and influence links. There is no street basemap and no tile
server, and the map asks no other site for anything. Protomaps' street map
(OpenStreetMap data) was removed on 2026-10-29.

It draws continent-coloured countries, US/Canada state outlines, a mark on
each music city (white when selected), an artist's event points and a pinned
event's influence arcs. The code is in
`src/components/atlas/components/Globe/`: `AtlasGlobe.tsx` loads the engine,
`MapLibreGlobe.tsx` is the engine, and `useGlobeScene.ts` and
`globeLabels.ts` hold what it draws from.

The engine loads only with the Globe page. `scripts/verifyProdBundle.mjs`
fails the build check if maplibre-gl appears in an entry chunk, or if any
Protomaps host appears anywhere in the build.

The earlier three.js globe (react-globe.gl), kept until 2026-10-29 as a
rollback behind `VITE_ATLAS_ENGINE=three`, is retired. Its code is in git:
`git log -- src/components/atlas/components/Globe/BaseGlobe.tsx`.

## What the MapLibre engine draws

- **Countries in their continent colours**, from Natural Earth's 1:110m
  outlines, on the cyan sea.
- **From zoom 3**, the US and Canadian state outlines appear.
- **Cities are their names.** There is no dot: a city's name is drawn
  over everything, and clicking it opens the city. A name turns warm while
  the pointer is on it, and stays warm while the city is selected or holds
  the pinned event. Where names crowd, the selected city's wins, then the
  music cities', then the towns'.
- **Towns events happened in are cities too.** An event placed somewhere no
  music city claims, such as Aspen ("Take Me Home, Country Roads") or
  Colorado Springs ("Counting Stars"), makes that town a city of its own
  (`utils/eventCities.ts`). It gets its name on the map from zoom 5, a card
  listing its events, a stop in the URL (`place=city:aspen-us`) and a place
  in search. Nothing about it is authored: its genres and decades are its
  events', and it appears as soon as published content places an event
  there. US and Canadian events still open their state's card first, as
  before; the town's name highlights while the event is pinned.
- **A selected city is outlined** by its boundary, in the same bright, warm
  line as a selected country or state (see "City outlines" below).
- **Influence arcs** are dashed great circles on the surface with a slowly
  moving dash and a dark edge. With reduced motion turned on, the dash
  holds still and camera flights cut instead of flying.
- **Clicks** on a country or state open it at every zoom. City names,
  artist points and arcs are clickable too, and win over the land under
  them.

## Fonts

The map's labels are in the app's font, Glacial Indifference, drawn by
MapLibre from the files the page already loads (`public/fonts/`). The
style declares them in its `font-faces` (`components/Globe/mapFonts.ts`),
each file with the characters it holds, and names no `glyphs` URL. A file
is downloaded only when a label first needs it.

Glacial holds basic Latin and the Western European accents, but not Latin
Extended-A. A character it lacks is drawn locally in the browser's own sans
instead, at the label's weight: the "ș" and "ă" in Chișinău, for example,
or a name in Japanese. The stacks are named "Atlas Glacial Regular" and
"Atlas Glacial Bold": the weight word is what MapLibre reads that weight
from, and no CSS font has that name, so the fallback is the system's.
`mapFonts.test.ts` checks the declared ranges against the font files.

## Where the camera goes

Navigation says what a flight frames (`FlyTarget.frame`,
`navigation/flyFrames.ts`), and the MapLibre engine places the camera for it
(`components/Globe/mapFraming.ts`):

- **A country or a state** is fitted to its own outline. That means the
  main landmass, plus every part within 3° of what is framed so far, so
  nearby islands join (Sicily and Sardinia, Hokkaido, Tasmania, a whole
  archipelago like Indonesia) and far territories don't (Alaska, Hawaii,
  Svalbard, the Canaries, the Galápagos). The main landmass is the part
  holding the most of the place's music cities, so Malaysia frames the
  peninsula with Kuala Lumpur, not the larger Malaysian Borneo. Countries
  come no closer than zoom 7, and states no closer than zoom 8.
- **A city** is fitted to its outline, no closer than zoom 12, so the
  whole city shows. A city with no outline is centred at zoom 10. A city
  flight waits up to 0.8 s for the city's outline file before it sets off
  anyway. A guided tour's city stops use the tour's own zoom, wider where a
  stop shows the region around the city.
- **An artist** is fitted to the places their events happened, no closer
  than zoom 9.
- **Anything else** (a tour's overview stop) flies to its centre, at the
  zoom the three.js globe used for it.

Every flight lands in the part of the map the page leaves clear. The layout
measures what its overlays cover (`MapInsets`, `layout/mapInsets.ts`): the
left panel, the map controls, the timeline row, the mind map or an open
legend on the right, and the phone's sheet. The map's padding follows it,
so its centre is always the middle of what you can see. A place has a
32 px margin inside that area. A flight opens a panel that may not be on
the page yet, so it lands as if the card (desktop) or the half-height
sheet (phone) were already there. When the panel arrives and is measured,
nothing moves.

The fit is computed in Web Mercator, which matches MapLibre's globe at the
zooms states and cities are seen from, and gives continent-sized countries
a little extra room. MapLibre's own `cameraForBounds` sized a region's
height a third too small under the globe projection, so it isn't used.

## Attribution

The country and state outlines are Natural Earth's, which is public
domain. The city outlines are OpenStreetMap's data (© OpenStreetMap
contributors, ODbL), which requires a visible credit. The page draws it
itself (`components/UI/MapCredit.tsx`), at the right of the bottom rail:

- when the map first appears, it reads "© OpenStreetMap", linked;
- at the viewer's first press, scroll or key on the map itself, it folds up
  behind an ⓘ button. Camera flights and Spin don't count; the map reports
  the touch as `mapTouched` in the store;
- the ⓘ opens and closes it after that, and the viewer's choice stands.

MapLibre's own corner control is switched off, because it sat under the
timeline and the phone's sheet.

## City outlines

Each city's boundary, music city or town, comes from OpenStreetMap through
Nominatim's search, and is built once by `scripts/buildCityOutlines.mjs`.
It runs under `tsx`, which reads the app's TypeScript, so it can work out
the towns from the bundled events:

```sh
npx tsx scripts/buildCityOutlines.mjs                    # build from the cache
npx tsx scripts/buildCityOutlines.mjs --refresh          # ask OpenStreetMap again
npx tsx scripts/buildCityOutlines.mjs --only=aspen-us    # try a few, write nothing
```

The script follows Nominatim's usage policy: one request a second, an
identifying user agent, and every answer cached in
`node_modules/.cache/build-city-outlines`, so nothing is asked twice. A
boundary is kept only if it contains the city's own coordinates
(`cities.ts`), and the part containing them is city-sized (under
20,000 km²), so a search that answers with a whole state is refused. Far
parts of a city (Tokyo's Pacific islands) are dropped. A city that
OpenStreetMap maps only as a point, or whose coordinates sit outside its
boundary (Kingston, Jamaica), gets no outline and keeps just its dot.

It writes one small GeoJSON file per city to `public/geo/cities/`, with a
content hash in the name, and the list of them to
`src/components/atlas/data/cityOutlineFiles.ts`. Commit both. The page
fetches a city's file only when that city is selected or flown to
(`data/cityOutlines.ts`). Re-run the script after adding cities to
`cities.ts`, or when the bundled events place events in new towns. A town
only the published content places has no outline until then; selecting it
still works, at zoom 10.

## Measuring

`node scripts/measureGlobe.mjs` measures the page (see
[BASELINE.md](BASELINE.md)).
