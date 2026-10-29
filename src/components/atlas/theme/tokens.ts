/**
 * The Atlas Globe page's design tokens: the one place its overlays take
 * colours from (Globe UI plan, prompt 4).
 *
 * Every token is a `--atlas-<name>` custom property, declared on `.atlas-root`
 * in `../index.css` (a test holds that file to this one), and a Tailwind
 * colour `atlas-<name>`: `bg-atlas-panel`, `text-atlas-text-2`,
 * `bg-atlas-pill`. The surfaces and text are aliases of the app's `--ui-*`
 * tokens (src/styles/appTheme.css), and the secondary text, the pills, the
 * menus and the focus ring the Studio's `--daw-*` ones (src/daw/ui/tokens.ts),
 * so the Globe wears the Studio's frame and follows any re-skin of the app
 * (owner, 2026-10-29). There is no accent: selection and actions are white,
 * and colour means something (an era, a kind of thing, a country). The four
 * entity kinds take Cortex's colours (src/content/graph/cortexPalette.ts).
 *
 * WebGL cannot read var(), so what the globe itself draws in a fixed colour
 * (not a country's) is in ATLAS_SCENE, as plain values.
 *
 * tailwind.config.ts reads ATLAS_TAILWIND_COLORS from here, so this file has
 * no path aliases and no side effects when it loads.
 */
import { cortexColor } from '../../../content/graph/cortexPalette';
import { ERA_HEX } from '../data/musicalEras';

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
/** One of the Studio's `--daw-*` colours, resolving to `value`. */
const daw = (name: string, value: string): AtlasColorToken => ({
  space: 'color',
  css: `var(--daw-${name})`,
  value,
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
  /** The stage card and the Inspector's panels; the Studio's surface 1. */
  panel: ui('card', '#151518'),
  /** A panel's hairline edge and its inner dividers. */
  'panel-border': whiteAt(0.08),
  /** Body text and headings. */
  text: ui('foreground', '#e8e8f0'),
  /** Secondary text: subtitles, metadata. */
  'text-2': daw('text-2', 'rgba(255, 255, 255, 0.7)'),
  /** Micro labels (bold, uppercase) and placeholders; not for running text. */
  'text-3': daw('text-3', '#8e8ea3'),
  /** Popovers and menus: the Studio's menu surface. */
  menu: daw('menu', '#252529'),
  /** The rails' pills: a zone of controls on the page (the Studio's pill). */
  pill: daw('pill', '#141417'),
  /** A control's label inside a pill. */
  'pill-text': daw('pill-text', 'rgba(255, 255, 255, 0.5)'),
  /** A pill's control that is on: a view tab, a pressed toggle. */
  'pill-on': daw('pill-on', 'rgba(255, 255, 255, 0.2)'),
  /** Keyboard focus outlines: the Studio's grey. */
  focus: daw('focus', '#9f9fa0'),
  /** Errors. */
  danger: rgb('#f26255'),
  /** The space behind the globe. */
  canvas: rgb('#000005'),
  // The entity kinds, in Cortex's colours.
  artist: rgb(cortexColor('Artists')),
  place: rgb(cortexColor('Location')),
  event: rgb(cortexColor('Events')),
  song: rgb(cortexColor('Songs')),
  // The eras' colours (data/musicalEras.ts). The timeline's bands, the era
  // rail and the event stage tint by them: colour there means "when".
  'era-ancient': rgb(ERA_HEX.ancient),
  'era-renaissance': rgb(ERA_HEX.renaissance),
  'era-classical-romantic': rgb(ERA_HEX['classical-romantic']),
  'era-early-modern': rgb(ERA_HEX['early-modern']),
  'era-postwar': rgb(ERA_HEX.postwar),
  'era-electronic-hiphop': rgb(ERA_HEX['electronic-hiphop']),
  'era-global-digital': rgb(ERA_HEX['global-digital']),
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
  /** An artist's event points. */
  highlight: '#ffffff',
  /** The halo around the globe. */
  atmosphere: '#ffffff',
  /** A city with no country colour. */
  fallback: '#ffffff',
  /** Antarctica and Greenland, painted as ice (the MapLibre engine). */
  ice: '#ffffff',
  /**
   * The sea seen from orbit (the earlier three.js globe's ocean glow), which
   * the map paints until the street basemap takes over.
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
