/**
 * The Atlas Globe page's design tokens: the one place its overlays take
 * colours from (Globe UI plan, prompt 4).
 *
 * Every token is a `--atlas-<name>` custom property, declared on `.atlas-root`
 * in `../index.css` (a test holds that file to this one), and a Tailwind
 * colour `atlas-<name>`: `bg-atlas-panel/95`, `text-atlas-text-2`,
 * `ring-atlas-focus`. The surfaces and text are aliases of the app's `--ui-*`
 * tokens (src/styles/appTheme.css), the same ones the mind map, Cortex and
 * the Studio read, so the Globe follows any re-skin of the app. The four
 * entity kinds take Cortex's colours (src/content/graph/cortexPalette.ts).
 *
 * WebGL cannot read var(), so what the globe itself draws in a fixed colour
 * (not a country's) is in ATLAS_SCENE, as plain values.
 *
 * tailwind.config.ts reads ATLAS_TAILWIND_COLORS from here, so this file has
 * no path aliases and no side effects when it loads.
 */
import { cortexColor } from '../../../content/graph/cortexPalette';

/**
 * A colour token. `channels` tokens hold the colour's channels, so Tailwind's
 * opacity modifier works on them (`bg-atlas-accent/10`); `color` tokens are a
 * whole colour, already translucent, and take no modifier.
 */
export interface AtlasColorToken {
  readonly space: 'hsl' | 'rgb' | 'color';
  /** What `--atlas-<name>` is set to. */
  readonly css: string;
  /** The colour as it resolves, for WebGL, HTML labels and tests. */
  readonly value: string;
}

/** `#rrggbb` as the `r g b` channels `rgb(var(--x) / a)` takes. */
const rgbChannels = (hex: string): string =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

const ui = (name: string, value: string): AtlasColorToken => ({
  space: 'hsl',
  css: `var(--ui-${name})`,
  value,
});
const rgb = (hex: string): AtlasColorToken => ({
  space: 'rgb',
  css: rgbChannels(hex),
  value: hex,
});
const whiteAt = (alpha: number): AtlasColorToken => ({
  space: 'color',
  css: `rgb(255 255 255 / ${alpha})`,
  value: `rgba(255, 255, 255, ${alpha})`,
});

// Keeps each key's literal type while checking every entry is a token.
const tokens = <T extends Record<string, AtlasColorToken>>(t: T): T => t;

export const ATLAS_COLOR = tokens({
  /** The page behind everything. */
  page: ui('background', '#101012'),
  /** Every panel and bar, at 95% (`bg-atlas-panel/95`); popovers opaque. */
  panel: ui('card', '#151518'),
  /** A panel's hairline edge and its inner dividers. */
  'panel-border': whiteAt(0.08),
  /** Body text and headings. */
  text: ui('foreground', '#e8e8f0'),
  /** Secondary text: subtitles, metadata. */
  'text-2': whiteAt(0.55),
  /** Eyebrows (bold, uppercase) and placeholders; not for running text. */
  'text-3': whiteAt(0.45),
  /** The Globe tab's accent: links, the pinned event, progress. */
  accent: rgb('#60a5fa'),
  /** The accent where it has to stand out on the accent: a pinned dot's rim. */
  'accent-strong': rgb('#93c5fd'),
  /** Keyboard focus rings. */
  focus: rgb('#60a5fa'),
  /** Guided tours, so a tour never reads as a pathway. */
  tour: rgb('#7ecfcf'),
  /** Errors. */
  danger: rgb('#f26255'),
  /** The space behind the globe. */
  canvas: rgb('#000005'),
  // The entity kinds, in Cortex's colours.
  artist: rgb(cortexColor('Artists')),
  place: rgb(cortexColor('Location')),
  event: rgb(cortexColor('Events')),
  song: rgb(cortexColor('Songs')),
});

export type AtlasColorName = keyof typeof ATLAS_COLOR;

/** `var(--atlas-<name>)`, for an inline style or an HTML label. */
export const atlasVar = (name: AtlasColorName): string => {
  const token = ATLAS_COLOR[name];
  return token.space === 'color'
    ? `var(--atlas-${name})`
    : `${token.space}(var(--atlas-${name}))`;
};

/** The declarations `.atlas-root` carries in index.css, one per line. */
export const atlasTokensCss = (): string =>
  Object.entries(ATLAS_COLOR)
    .map(([name, token]) => `--atlas-${name}: ${token.css};`)
    .join('\n');

/** The tokens as Tailwind colours: `bg-atlas-panel/95`, `text-atlas-text-2`. */
export const ATLAS_TAILWIND_COLORS = Object.fromEntries(
  Object.entries(ATLAS_COLOR).map(([name, token]) => [
    name,
    token.space === 'color'
      ? `var(--atlas-${name})`
      : `${token.space}(var(--atlas-${name}) / <alpha-value>)`,
  ]),
) as Readonly<Record<AtlasColorName, string>>;

/**
 * What the globe draws in a fixed colour. Country colours come from the data
 * (flagColors, continentColors) and are not here.
 */
export const ATLAS_SCENE = {
  /** The selected city's column and an artist's event points. */
  highlight: '#ffffff',
  /** The selected city's column sides. */
  highlightSide: 'rgba(255, 255, 255, 0.8)',
  /** The halo around the globe. */
  atmosphere: '#ffffff',
  /** A city with no country colour. */
  fallback: '#ffffff',
  /** Antarctica and Greenland, painted as ice (the MapLibre engine). */
  ice: '#ffffff',
  /**
   * The sea seen from orbit: the three.js globe's ocean glow (globeVisuals),
   * which the MapLibre engine paints until the street basemap takes over.
   */
  ocean: '#33d6ff',
  /** Space around the planet (the `canvas` token, as WebGL needs it). */
  space: '#000005',
  /** The dark rim round a city's circle or an artist's point on the map. */
  pointRim: 'rgba(10, 10, 14, 0.85)',
  /** City names on the map, and the halo that keeps them legible. */
  label: '#e8e8f0',
  labelHalo: 'rgba(16, 16, 18, 0.9)',
  /** The land with country colours switched off in Layers. */
  landPlain: '#6b6b74',
  /** The downstream ("influenced") arc, head to tail. */
  arcDownstream: ['#ffffffe6', '#ffffff66'],
  /** Country and state outlines; the selected region's is warm and bright. */
  strokeSelected: 'rgba(255, 210, 140, 0.95)',
  strokeState: 'rgba(130, 110, 80, 0.6)',
  strokeCountry: 'rgba(90, 78, 58, 0.85)',
} as const;

/**
 * The Atlas flavor: the street basemap's colours where they differ from
 * Protomaps' `dark` flavor (the MapLibre engine, components/Globe/mapStyle.ts).
 * The country colours tint its land at every zoom, so its own land is the
 * plain grey they are drawn over (and that shows with them off in Layers);
 * its sea is the globe's cyan; and its labels are light with dark halos, so
 * they read on any country's colour. Keys are @protomaps/basemaps Flavor keys.
 */
const LABEL_HALO = 'rgba(16, 16, 18, 0.85)';
export const ATLAS_BASEMAP = {
  background: ATLAS_SCENE.ocean,
  earth: ATLAS_SCENE.landPlain,
  water: ATLAS_SCENE.ocean,
  ocean_label: '#0b4f5f',
  country_label: '#f2f2f6',
  state_label: '#e2e2ea',
  state_label_halo: LABEL_HALO,
  city_label: '#f2f2f6',
  city_label_halo: LABEL_HALO,
  subplace_label: '#d6d6de',
  subplace_label_halo: LABEL_HALO,
  roads_label_major: '#e2e2ea',
  roads_label_major_halo: LABEL_HALO,
  roads_label_minor: '#d0d0d8',
  roads_label_minor_halo: LABEL_HALO,
  address_label: '#d0d0d8',
  address_label_halo: LABEL_HALO,
  // Places of interest, in light versions of Protomaps' hues so they read
  // on tinted land.
  pois: {
    blue: '#a9d8ec',
    green: '#a8ecc6',
    lapis: '#b9c8ff',
    pink: '#ffc4ea',
    red: '#ffbccb',
    slategray: '#d6d6de',
    tangerine: '#ffd2bb',
    turquoise: '#a6f0f6',
  },
} as const;
