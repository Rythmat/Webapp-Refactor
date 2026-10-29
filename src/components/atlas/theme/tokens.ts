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
 * What the map draws in a fixed colour: a dark map that the music lights
 * (owner, 2026-10-29). Country colours come from the data
 * (continentColors) and era colours from musicalEras.ts; they are not here.
 */
export const ATLAS_SCENE = {
  /** An artist's event points. */
  highlight: '#ffffff',
  /** The faint halo at the globe's limb (the rainbow rim is the page's). */
  atmosphere: '#c9d2ff',
  /** A city with no country colour. */
  fallback: '#ffffff',
  /** Antarctica and Greenland, as ice, in continent colours. */
  ice: '#ffffff',
  /** The sea: near-black, a touch of blue. */
  ocean: '#090b11',
  /** Space around the planet (the `canvas` token, as WebGL needs it). */
  space: '#000005',
  /** The land with no music in the years shown, and plain land. */
  landPlain: '#171a22',
  /**
   * The land lit by music: at a little (the floor, landLevel 0.12), some,
   * much, and the most (1). Cool, so the halos' era colours and the links'
   * key colours read on it.
   */
  landLit: ['#1c1f2c', '#242a3d', '#2f3754', '#3f4a70'],
  /** Continent colours sit this far over the sea, muted to the dark map. */
  continentOpacity: 0.55,
  /** The dark rim round an artist's point. */
  pointRim: 'rgba(9, 11, 17, 0.85)',
  /** City names on the map, and the halo that keeps them legible. */
  label: '#e8e8f0',
  labelHalo: 'rgba(9, 11, 17, 0.9)',
  /** Names of countries, and of the world's regions from orbit. */
  countryLabel: 'rgba(255, 255, 255, 0.34)',
  regionLabel: 'rgba(255, 255, 255, 0.26)',
  /** The downstream ("influenced") arc, head to tail. */
  arcDownstream: ['#ffffffe6', '#ffffff66'],
  /** Borders: hairlines, brighter hovered, white selected, with a soft glow. */
  strokeCountry: 'rgba(255, 255, 255, 0.16)',
  strokeState: 'rgba(255, 255, 255, 0.08)',
  strokeHover: 'rgba(255, 255, 255, 0.55)',
  strokeSelected: 'rgba(255, 255, 255, 0.95)',
  /** The glow round a hovered or selected place: warm white, not yellow. */
  regionGlow: 'rgba(255, 228, 200, 0.45)',
  /** A city's name while it is hovered, selected or holds the pinned event. */
  labelHot: 'rgba(255, 236, 214, 1)',
  /** A place's second line (its events in the years shown). */
  labelSub: 'rgba(255, 255, 255, 0.62)',
  /** A place: its white dot, its dark rim, its ring when selected. */
  dot: '#ffffff',
  dotRim: 'rgba(9, 11, 17, 0.85)',
  dotRing: 'rgba(255, 255, 255, 0.6)',
  /** The selected place's light: its bloom and its core. */
  sunBloom: 'rgba(255, 236, 214, 0.38)',
  sunCore: '#ffffff',
  /**
   * A place's name chip, as [r, g, b, a] (drawn into an image, mapChips.ts):
   * its fill and border, and brighter for the selected or pinned place.
   */
  chip: [20, 20, 24, 0.92],
  chipBorder: [255, 255, 255, 0.12],
  chipOn: [34, 34, 40, 0.96],
  chipOnBorder: [255, 255, 255, 0.55],
} as const;
