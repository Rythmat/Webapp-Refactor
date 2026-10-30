# The Globe's map

The Globe page (`/globe`) draws its map with MapLibre GL 6 in globe
projection, from the Globe's own data alone: Natural Earth's country and
state outlines (public domain) and the app's own places, events and
influence links. There is no basemap, no tile server and no glyph server;
the map asks no other site for anything. Since 2026-10-29 it is a "data
map" after two references the owner chose (Dribbble 25147704, a network
graph on a tile-free map, and 22296468, a map dashboard with floating
chart cards): dark land lit by music, places as dots in halos, the links
between them, chart cards over the stage, and a ring view.

The code is in `src/components/atlas/components/Globe/`. `AtlasGlobe.tsx`
loads the engine lazily; `MapLibreGlobe.tsx` makes the map once
(`useMapInstance`) and wires one hook per concern; `mapStyle.ts` builds the
style from `landLayers.ts`, `placeLayers.ts` and `networkLayers.ts`. Pure
models live outside it: `stats/` (music in the years shown, a stop's
stats), `network/` (the influence links rolled up by place), and
`Ring/ringLayout.ts`.

The engine loads only with the Globe page. `scripts/verifyProdBundle.mjs`
fails the build check if maplibre-gl is in an entry chunk, and if a
Protomaps or OpenStreetMap host appears anywhere in the build.

## Fixed layers and live ones

The rule that keeps the map cheap: **geometry is set once; anything that
follows the years or the pointer goes through feature-state.**

- `setData` runs only when something settles: a window committed, a stop
  chosen, a layer switched.
- The years the era rail shows are followed live, frame by frame, through
  `setFeatureState` (each country's `music`, each place's `w` and `era`),
  written only for values that changed (`useLandLayers`, `usePlaceLayers`).
- No data-driven `setPaintProperty`, ever: MapLibre lays the whole source
  out again for one. The flow (below) changes only a constant opacity.

The era-rail scrub step in `measureGlobe.mjs` checks this: MapLibreGlobe
should not render once while the rail is dragged.

## The land

Countries and states are Natural Earth's 1:110m outlines with hairline
borders; US and Canadian states from zoom 3. Region names in spaced caps
from orbit, country names (three tiers by size) closer in. A hovered or
selected region gets a soft warm-white glow.

Layers → "Colour the land by" picks one of three (`GlobeLayers.landColor`):

- **Music** (the default): dark land that lights up the more music
  happened there in the years shown, on a log scale with a floor for any
  music at all (`stats/musicWeights.ts`, `landLevel`). A country's key is
  `countryKey(NAME)`, the same match its panel uses, so a lit country always
  opens the events that lit it.
- **Continent**: the continent palette.
- **Plain**: one colour.

## Places

Every music city and every town an event made a city is a dot in a halo:
the halo's area follows its events in the years shown (`haloLevel`), its
colour is its busiest era's. The busiest are named on chips (`mapChips.ts`
draws the chip's RGBA image at runtime for `icon-text-fit`, so there is no
sprite sheet). The selected place, or the pinned event's, is a white "sun":
a still bloom and core in the map (`placeLayers.ts`) and a CSS burst and
two slow pulses over it (`SunFx.tsx`), which play once the map has flown
there.

## Connections

The 1,793 hand-written influence links between events
(`data/eventConnections.ts`) are rolled up place to place
(`network/placeNetwork.ts`). A link counts in the year its later event
happened, when the influence arrived, so counts add up across windows and
the cards, ring and map agree.

What the map draws (`useNetworkLayers.ts`, `networkFeatures.ts`):

- **Nothing chosen:** the 24 strongest links between regions, dotted.
- **A place or an artist:** the 40 strongest links on each side. Links
  into the stop run cool (F♯ → D♭ → A♭ → E♭ → white): where its music came
  from. Links out run white → B♭ → F → C → G: where it went. Key A's yellow
  is the brand's and no link takes it (`theme/marks.ts`).
- **An event:** its own influences, in the directions its card has on.

A link carrying two influences or more is solid, with a `line-gradient`
and a soft glow, and the strongest eight carry a count pill. A single
influence is dotted and flows. (Owner, 2026-10-30: most city-to-city links
carry one or two; London's strongest carries nine.) Two links on the same
path running opposite ways sit a little apart (`line-offset`).

**The flow** is six copies of the dotted links, each dashed a sixth of a
period further on (`phaseDash`); every 70 ms one is shown and the last
hidden, with the opacity's transition off. Restyling `line-dasharray`
instead, as the old arcs did, makes MapLibre lay the source out again 16
times a second. The flow stops when the map is hidden or covered
(`useMotionGate`) and under reduced motion.

**Drawing on:** MapLibre has no line trim, so for 850 ms after a new stop
lands, its solid links are cut to how far they have got (`drawOn.ts`,
`sliceLine`) and fed to a source of their own each frame, the nearest
first; links into the stop draw from the stop's end, so all grow out of it.

Hovering a link shows what it carries; clicking it opens the far place.
A card's row (Connections, Strongest connections) brightens its link
through the `linkFocus` signal.

## The rim and the hover card

MapLibre's atmosphere can't be coloured, so the globe's rainbow rim is a 2D
canvas under the map's (`GlobeRim.tsx`), redrawn on `move`: its radius is
MapLibre's globe radius (`worldSize / 2π / cos(lat)`, `globeGeometry.ts`)
and it fades as the globe fills the view.

The hover card (`components/Hover/`) replaces MapLibre's popup: lazy,
`aria-hidden` (the Inspector says the same), fed by the `placeHover`
signal from the map or the ring.

## The cards

A column of chart cards floats at the stage's left (`layout/CardsLayer.tsx`
loads `Cards/StageCards.tsx` lazily): the world's with nothing chosen,
else the stop's, and the Legend at the foot. It narrows, then folds to an
"At a glance" pill as the Inspector takes room (`cardsLayout.ts`), reports
what it covers so flights land beside it, and the bottom rail's Cards pill
hides it for good (`atlas-cards-v1`). On a phone the cards are a strip
above the bottom rail. The chart kit (`Cards/charts/`) has no dependency:
its charts are `role="img"` with a sentence, its lists real text.

## The frame

The Globe has its top and bottom rails, with the app's navigation
(`ClassroomSidebar`) at its left on a desktop. There is no side rail at the
right (owner, 2026-10-30): the panels' icons (Details, Layers, a lesson's
Mind map) sit at the bottom rail's right, beside the Cards pill. The
Inspector is a floating card over the map's right edge, and a stop's events
are tiles in it: picture, title, year and place, the open one showing its
video instead (`UI/DetailsCard.tsx`). Details hides and returns from its icon
without leaving the stop.

## The ring

`?view=ring`, the Connections tab: the busiest places in the years shown
round a circle (by continent, region and longitude, so each keeps its seat),
the links among them as chords (`Ring/`). The places grow out of where the
map draws them: the map's handle (`mapHandle.tsx`, no MapLibre import)
projects them, and CSS transitions move them to their seats and back.
Each place is a button with roving focus (arrows, Page Up/Down by region,
Home/End).

## Where the camera goes

Navigation says what a flight frames (`FlyTarget.frame`,
`navigation/flyFrames.ts`), and the engine places the camera for it
(`mapFraming.ts`):

- **A country or a state** is fitted to its own outline: the main landmass
  (the part holding most of its music cities) plus every part within 3° of
  what is framed so far, so nearby islands join and far territories don't.
  Countries come no closer than zoom 6, states 6.5.
- **A city** is centred with the region around it, at zoom 7. Navigation
  asks in street-map zooms (10 for a city, 7 to 9.3 for tour stops);
  `capFrameZoom` compresses those past 5.5 into what is left below 7, so a
  closer stop still lands closer.
- **An artist** is fitted to the places their events happened, no closer
  than zoom 6.5.
- **The map stops at zoom 8.** Natural Earth's 1:110m coasts turn to blobs
  much past 7.

Every flight lands in the part of the map the page leaves clear: the
layout measures what its overlays cover (`SET_ZONE_INSETS`, one zone each
for the Inspector, the cards and the phone's sheet or strip, the deepest
inset per edge winning), and the map's padding follows. A flight lands as
if the panel it opens were already there. Fits are computed in Web
Mercator; MapLibre's own `cameraForBounds` sizes regions a third too small
under the globe projection.

The page's flights carry `FLIGHT_EVENT` on their events, so the map's
phase (`useMapPhase`: ready, flying, settled) tells them from the spin and
from a reader's dragging. What should wait for the map waits on it: the
intro, a new stop's burst and links, the cards' count-ups.

## Motion

- **The intro** (`layout/intro.tsx`), on a bare `/globe` once a visit:
  the map held back until it is ready (1.5 s at most), then the globe
  fades up and its rim draws, the era rail's rim draws left to right, and
  the cards land one after another. Never on a link into the Globe.
- **Selecting a stop:** the flight, then the burst and the links drawing
  on; the stop's cards land afresh, their counts waiting for the map.
- **New years:** the land and halos follow the era rail frame by frame;
  the chart's line tweens to the new counts, bars slide to new widths.

**Reduced motion** cuts all of it: no intro, flights cut, no flow, no
draw-on, no burst, the ring appears in place, charts and counts show
finished.

## Fonts

The map's labels are in the app's font, Glacial Indifference, drawn by
MapLibre from `public/fonts/` through the style's `font-faces`
(`mapFonts.ts`), each file with the characters it holds. Glacial has basic
Latin and the Western European accents; a character it lacks (the "ș" and
"ă" in Chișinău, a name in Japanese) is drawn in the browser's own sans at
the label's weight. The stacks are named "Atlas Glacial Regular" and
"Atlas Glacial Bold": MapLibre reads the weight from the name, and no CSS
font has that name. `mapFonts.test.ts` checks the ranges against the files.

## Data and credit

Natural Earth (public domain) is the only map data; everything else is the
app's own. No credit is required, so the map shows none and MapLibre's
corner control is off.

## Performance

See [BASELINE.md](BASELINE.md) and `node scripts/measureGlobe.mjs`. The
2026-10-30 figures are under "The data map" there.

## History

- **2026-10-13:** MapLibre became the default engine, with Protomaps'
  street map (OpenStreetMap data) when a tile source was set.
- **2026-10-29:** Protomaps, the OpenStreetMap city outlines (Nominatim,
  ODbL) and the three.js globe (react-globe.gl, the rollback behind
  `VITE_ATLAS_ENGINE=three`) were removed. Roll back from git:
  `git log -- src/components/atlas/components/Globe/BaseGlobe.tsx` and
  `git log -- src/components/atlas/components/Globe/basemapConfig.ts`.
- **2026-10-29 to 30:** the data map: dark land lit by music, places and
  halos, connections, floating cards, the ring, the motion.
