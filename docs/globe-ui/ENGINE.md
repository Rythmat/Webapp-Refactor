# The Globe's map engine

The Atlas Globe page (`/atlas/globe`) can draw its map with either of two
engines, chosen when the app is built:

| `VITE_ATLAS_ENGINE`  | Engine                                                                     | Zooms to                                            |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| `maplibre` (default) | MapLibre GL 6 in globe projection, over a Protomaps vector basemap         | street level, with real place, road and park labels |
| `three`              | the earlier three.js globe (react-globe.gl), with raised arcs and lighting | country outlines only (Natural Earth, 1:110m)       |

Both draw the same things from the same state: continent-coloured countries,
US/Canada state outlines, a mark on each music city (white when selected),
an artist's event points and a pinned event's influence arcs. The MapLibre
engine marks a city with a dot; the three.js engine raises a column. Both
answer clicks the same way and keep every URL and deep link. The code is in
`src/components/atlas/components/Globe/`: `engine.ts` reads the flag,
`AtlasGlobe.tsx` loads the engine, `MapLibreGlobe.tsx` and `BaseGlobe.tsx`
are the two engines, and `useGlobeScene.ts` and `globeLabels.ts` hold what
they share.

Either engine loads only with the Globe page. `scripts/verifyProdBundle.mjs`
fails the build check if maplibre-gl, pmtiles, @protomaps/basemaps, three.js
or react-globe.gl appear in an entry chunk.

## What the MapLibre engine draws

The map is Protomaps' street map, tinted with the Globe's colours at every
zoom (the Atlas theme):

- **Countries keep their continent colours all the way down.** Protomaps'
  tiles don't record which country a piece of land is in, so a flavor (one
  colour per layer) can't shade by country on its own. The Globe's Natural
  Earth country outlines are therefore drawn as a tint just above the
  basemap's land and land use, and under its sea, roads, buildings and
  labels. The basemap's detailed coastline trims the coarse outlines at the
  shore. The tint is strong from orbit and lighter among the streets, so
  parks, roads and buildings read through (`COUNTRY_TINT` in
  `mapGeometry.ts`).
- **The sea, lakes and rivers** are the globe's cyan at every zoom.
- **Labels** for countries, places, roads and points of interest show at
  every zoom, light with dark halos, so they read on any country's colour.
- **From zoom 3**, the US and Canadian state outlines appear.
- **Cities** are dots in a shade of their country's colour. The selected
  city (or the pinned event's) is white, larger and drawn on top. Names
  show from zoom 6.
- **Influence arcs** are dashed great circles on the surface with a slowly
  moving dash and a dark edge. With reduced motion turned on, the dash
  holds still and camera flights cut instead of flying.
- **Clicks** on a country or state open it below zoom 6. Further in, a
  click among the streets doesn't open the country it lands in. City dots,
  artist points and arcs stay clickable at every zoom.

The theme is Protomaps' `dark` flavor with our colours on top:
`ATLAS_BASEMAP` in `src/components/atlas/theme/tokens.ts`. Its land is the
plain grey that also shows when country colours are switched off in
Layers. The community flavors in
[protomaps/basemaps-flavors](https://github.com/protomaps/basemaps-flavors)
are marked work in progress and have no licence, so none are copied in. A
flavor is just an object of colours, so the Atlas theme can be changed in
that one place.

## Tiles

Without a tile source, the MapLibre engine still works: it draws the Globe's
own country outlines on the cyan sea at every zoom, like the three.js globe,
with no streets or labels. To get the street map, set **one** of these at build time. Neither is
a secret. A self-hosted file wins if both are set.

### Option A: a self-hosted `.pmtiles` file (`VITE_BASEMAP_PMTILES_URL`)

A PMTiles archive is a single file that the browser reads with HTTP range
requests. No tile server is needed.

1. **Get a file.** Protomaps publishes a daily build of the whole planet at
   <https://maps.protomaps.com/builds/> (about 130 GB). Each build is kept
   only for a few days. For a smaller file, cut out a region or a maximum
   zoom with the [`pmtiles` CLI](https://docs.protomaps.com/pmtiles/cli):
   `pmtiles extract https://build.protomaps.com/20261013.pmtiles world-z12.pmtiles --maxzoom=12`.
   The whole planet to zoom 15 is what street-level labels need.
2. **Host it** on Cloudflare R2, which charges nothing for egress, or on S3.
   The bucket needs CORS that allows `GET` and `HEAD` from the app's origins
   (`https://app.musicatlas.io`, the preview domains, `http://localhost:*`),
   allows the `Range` and `If-Match` request headers, and exposes `ETag`,
   `Content-Range` and `Content-Length`. Put a CDN in front of it, for
   example the [Protomaps Cloudflare Worker](https://docs.protomaps.com/deploy/cloudflare).
   Range requests to a bare bucket work, but they are slower from far away.
3. **Point the app at it.** Set
   `VITE_BASEMAP_PMTILES_URL=https://tiles.example.com/planet.pmtiles` in
   Vercel and rebuild.

Don't point production at `build.protomaps.com` itself. It sends no CORS
headers, so a browser can't read it, and its files are deleted after a few
days.

### Option B: Protomaps' hosted API (`VITE_PROTOMAPS_API_KEY`)

Create a key at <https://protomaps.com/account> and add each origin the app
is served from (production, previews, localhost) to the key's allowed list.
Then set `VITE_PROTOMAPS_API_KEY` and rebuild. The app reads
`https://api.protomaps.com/tiles/v4.json?key=…`. Check Protomaps' current
terms and limits for commercial use before relying on it in production.

### Fonts and icons (`VITE_BASEMAP_ASSETS_URL`)

The basemap's labels need glyph files (Noto Sans) and its points of interest
need a sprite sheet. By default both come from Protomaps' GitHub Pages
(`https://protomaps.github.io/basemaps-assets`). To serve them from the app
instead, copy `fonts/` and `sprites/v4/` from
[protomaps/basemaps-assets](https://github.com/protomaps/basemaps-assets)
into, for example, `public/basemaps-assets/`, and set
`VITE_BASEMAP_ASSETS_URL=/basemaps-assets`. Only the fonts the style names
are needed: Noto Sans Regular, Medium and Italic. Each is 256 small files.

The map's labels are drawn by WebGL from these glyphs, so they are in Noto
Sans, not Glacial Indifference. This is the same exception as the music
notation glyphs. Making Glacial labels would mean generating glyph PBFs for
it (with `font-maker`, for example).

## Attribution

The basemap's data is © OpenStreetMap contributors under the ODbL, which
requires the credit to be visible on the map. The MapLibre engine shows
"Protomaps © OpenStreetMap" in a small pill in the bottom-right corner. On
phones, the pill sits above the bottom sheet. Keep it visible. Hiding it, or
covering it with another control, breaks the licence. Without a tile source
there is no OpenStreetMap data and no pill. The country outlines are Natural
Earth, which is public domain.

## Language

The basemap labels places in Spanish when the page's `<html lang>` starts
with `es`, and in English otherwise. The app has no global language setting
yet, only per-classroom teacher settings. When it gets one, pass it to
`basemapLang` in `MapLibreGlobe.tsx`.

## Switching back to the three.js globe

Set `VITE_ATLAS_ENGINE=three` in Vercel's environment variables and
redeploy. That is the whole rollback: the build then carries the three.js
engine instead, with no code change and no change to URLs. Unset it, or set
it to `maplibre`, to switch back. Locally:

```sh
VITE_ATLAS_ENGINE=three VITE_DEV_AUTH_BYPASS=1 npx vite
```

To measure either engine, run `node scripts/measureGlobe.mjs --engine=three`
or `--engine=maplibre`. Set a tile variable in the environment to include
the basemap. See [BASELINE.md](BASELINE.md).

## Testing without a tile host

Protomaps' daily build can't be read from a browser directly because it has
no CORS headers. For local testing only, a small proxy that forwards `Range`
requests to `https://build.protomaps.com` and adds
`Access-Control-Allow-Origin: *` works. Point `VITE_BASEMAP_PMTILES_URL` at
it, for example `http://localhost:5268/20261013.pmtiles`. That proxy is how
the screenshots in [screens/](screens/) (`p8-*`) were made.
