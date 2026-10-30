# The Globe's map

The Globe page (`/globe`) draws its map with MapLibre GL 6 in globe
projection, from the Globe's own data alone: Natural Earth's country and
state outlines (public domain) and the app's own places, events and
influence links. There is no basemap, no tile server and no glyph server;
the map asks no other site for anything. Since 2026-10-29 it is a "data
map" after two references the owner chose (Dribbble 25147704, a network
graph on a tile-free map, and 22296468, a map dashboard with floating
chart cards): dark land lit by music, places as dots in halos, the links
between them, and a ring view. Since 2026-10-30 a selected place lifts its
region off the globe (after Dribbble 23013593, the DHCS map), and the stage
keeps two cards: its events and its Connections.

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
  out again for one. The flow (below) changes only a constant opacity, and
  the lift (below) only constant translates.

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

## The lifted region

Selecting a country, a state or a city lifts its region: a city lifts its
state in the US and Canada, else its country (`liftPlaceOf`,
`regionLift.ts`). Tours, pathways and artists don't lift: tours keep their own
camera, and an artist's places have no one region. The code is
`regionLift.ts` (pure), `liftLayers.ts` (the layers) and `useRegionLift.ts`.

- **The height** is a viewport-anchored `*-translate` on every raised layer,
  a constant with a paint transition, so nothing is laid out again: walls
  (seven stacked fills), the lid, the edge, the dots, and the links, pills and
  places that sit on it. Flights to a lifted region land tilted 35°, which
  sells the height; `GlobeRim` fades out with the pitch.
- **The colour** is its events' eras, oldest to newest, each as wide as its
  share. The region is cut into 48 strips across its longer axis
  (`sliceRegion`) whose colours are feature-state (`c`), so the gradient
  follows the era rail live.
- **The edge** carries a comet in the same colours, by rewriting one
  `line-gradient` about 30 times a second. Reduced motion leaves it still and
  bright.
- **The dots** are one per event in the years shown, seated in a sunflower
  round their place and kept inside the region (`eventDots.ts`, stable seats;
  feature-state `on`), and populate in year order after the lid rises. At a
  city, its own are bright and the region's others dim.
- **The rest steps back:** other land dims, places beyond the region fade
  and lose their chips, and those inside hand over to the dots, the busiest
  five keeping their names.

**The pointer.** MapLibre tests a viewport translate in the tile's plane, so
under a tilt a raised layer answers short of where it is drawn (14 to 20 px
for a lift of 22, varying with zoom). So the raised hit layers (`RAISED_HITS`:
dots, links, places) stay on the ground and are asked at the pointer's spot
less the lift. Dots' hit zones overlap at their 8 px spacing, so the nearest to
the pointer wins (`nearestDot`).

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

Two cards, so the region stays the hero (owner, 2026-10-30):

- **Events**, bottom-left, a fixed 24 by 26 rem (`layout/InspectorRegion.tsx`;
  only a lesson's Mind map keeps its own size). Its header has the stop's
  name, its event count and its era bar, the key to the region's gradient. Its
  events are tiles: picture, title, year and place. One opens at a time,
  description first, then its video and influences, scrolling inside the card
  (`UI/DetailsCard.tsx`). Layers, an artist and search use the same card.
- **Connections**, top-right (`Cards/StageCards.tsx`, lazy): the stop's flow
  and strongest links, or the strongest links between regions with nothing
  chosen. The bottom rail's Cards pill hides it for good (`atlas-cards-v1`),
  and it folds to a pill when there is no room (`cardsLayout.ts`). On a phone it
  is one mini card in the strip above the bottom rail.

They report what they cover (`cornerBox`), so flights land clear of them. They
sit in opposite corners, so each reports only a share of its width
(`CORNER_INSET_SHARE`), or the region would shrink for nothing.

## The frame

The Globe has its top and bottom rails, with the app's navigation
(`ClassroomSidebar`) at its left on a desktop. There is no side rail at the
right (owner, 2026-10-30): the panels' icons (Details, Layers, a lesson's
Mind map) sit at the bottom rail's right, beside the Cards pill. Details hides
and returns from its icon without leaving the stop.

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
- **A city** frames the region it lifts (`liftFrame`).
- **A tour's stop** is centred with the region around it, at zoom 7.
  Navigation asks in street-map zooms (7 to 9.3 for tour stops);
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
intro, a new stop's lift, dots, burst and links.

## Motion

- **The intro** (`layout/intro.tsx`), on a bare `/globe` once a visit:
  the map held back until it is ready (1.5 s at most), then the globe
  fades up and its rim draws, the era rail's rim draws left to right, and
  the card lands. Never on a link into the Globe.
- **Selecting a stop:** the cards land at once, so the information doesn't
  wait; the flight and tilt; the lid rises as its colour sweeps along it; the
  comet starts; the dots populate; the burst, and the links drawing on.
  Deselecting settles it in one quick beat and levels the camera.
- **New years:** the land, halos, the lifted region's gradient and its dots
  follow the era rail frame by frame; bars slide to new widths.

**Reduced motion** cuts all of it: no intro, flights cut, no flow, no
draw-on, no burst, the lid and its dots simply there with a still edge, the
ring appears in place.

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
2026-10-30 figures are under "The data map" and "The lifted region" there.

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
- **2026-10-30:** the lifted region; the chart cards and the Legend went,
  leaving the events and Connections cards.
