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
  come no closer than zoom 6, and states no closer than zoom 6.5.
- **A city** is centred with the region around it, at zoom 7. A guided
  tour's city stops use the tour's own zoom, wider where a stop shows the
  region around the city. Navigation asks in street-map zooms (10 for a
  city, 7 to 9.3 for tour stops); `capFrameZoom` compresses those past 5.5
  into what is left below 7, so a closer stop still lands closer.
- **An artist** is fitted to the places their events happened, no closer
  than zoom 6.5.
- **The map stops at zoom 8.** There are no streets to see, and Natural
  Earth's 1:110m coasts turn to blobs much past zoom 7.
- **Anything else** (a tour's overview stop) flies to its centre, at the
  zoom the three.js globe used for it.

Every flight lands in the part of the map the page leaves clear. The layout
measures what its overlays cover (`MapInsets`, `layout/mapInsets.ts`): the
Inspector on the right, and the phone's sheet. The map's padding follows it,
so its centre is always the middle of what you can see. A place has a
32 px margin inside that area. A flight opens a panel that may not be on
the page yet, so it lands as if the Inspector (desktop, at its right, at
the width the viewer last left it) or the half-height sheet (phone) were
already there. When the panel arrives and is measured, nothing moves.

The fit is computed in Web Mercator, which matches MapLibre's globe at the
zooms states and cities are seen from, and gives continent-sized countries
a little extra room. MapLibre's own `cameraForBounds` sized a region's
height a third too small under the globe projection, so it isn't used.

## Data and credit

The country and state outlines are Natural Earth's (public domain), and
everything else the map draws is the app's own: no credit is required, so
the map shows none, and MapLibre's corner control is off. Natural Earth is
the only map data the Globe uses: the city outlines, which came from
OpenStreetMap (ODbL) through Nominatim, were removed with the street map
on 2026-10-29. A selected city is marked by its name, not a boundary.
`scripts/verifyProdBundle.mjs` fails a build that names an OpenStreetMap or
Protomaps host.

## Measuring

`node scripts/measureGlobe.mjs` measures the page (see
[BASELINE.md](BASELINE.md)).
