/**
 * Cortex's own palette, from the owner's two Coolors palettes (1 October
 * 2026): coolors.co/palette/001219-005f73-0a9396-94d2bd-e9d8a6-ee9b00-ca6702-bb3e03-ae2012-9b2226
 * and coolors.co/palette/f9dbbd-ffa5ab-da627d-a53860-450920.
 *
 * Their two darkest colours (#001219 and #450920) are all but the app's own
 * background, so they are not used; the other thirteen give every group a
 * colour of its own, with peach held back for Openings. Chord progressions
 * are green (#588157) from coolors.co/palette/dad7cd-a3b18a-588157-3a5a40-344e41. The groups shown
 * by default (songs, artists, events, places, records, studios and labels,
 * progressions) take the most distinct of them.
 *
 * None of the colours is one of Prism's key colours, so a dot in Cortex is
 * never mistaken for a key. None is white either: white is the graph's
 * highlight.
 *
 * The colours are listed in the order of the preset groups, with the
 * reserved Openings colour last, and that is the order in which a new
 * group is offered a colour (`newGroupColor` in `colorGroups.ts`).
 *
 * The module is pure: plain values and a small helper.
 */

/** The palette's names, in the preset groups' order, Openings last. */
export const CORTEX_COLOR_NAMES = [
  'Songs',
  'Curriculum',
  'Events',
  'Year',
  'Location',
  'Genre',
  'Instruments',
  'Artists',
  'Key',
  'Records',
  'Studios & Labels',
  'Chord Progressions',
  'Openings',
] as const;

export type CortexColorName = (typeof CORTEX_COLOR_NAMES)[number];

/** One of Cortex's colours. */
export interface CortexColor {
  readonly name: CortexColorName;
  /** The colour, written `#rrggbb` in lower case. */
  readonly hex: string;
}

const HEX: Readonly<Record<CortexColorName, string>> = {
  Songs: '#ee9b00',
  Curriculum: '#005f73',
  Events: '#94d2bd',
  Year: '#9b2226',
  Location: '#bb3e03',
  Genre: '#ca6702',
  Instruments: '#ae2012',
  Artists: '#0a9396',
  Key: '#a53860',
  Records: '#e9d8a6',
  'Studios & Labels': '#ffa5ab',
  'Chord Progressions': '#588157',
  Openings: '#f9dbbd',
};

/** The palette, in order. */
export const CORTEX_COLORS: readonly CortexColor[] = Object.freeze(
  CORTEX_COLOR_NAMES.map((name) => Object.freeze({ name, hex: HEX[name] })),
);

/** A palette colour's `#rrggbb`, by its name. */
export const cortexColor = (name: CortexColorName): string => HEX[name];

/**
 * Where a colour sits in `CORTEX_COLORS`, or -1 when it is none of them.
 * `#rgb` and `#rrggbb` are read in either case; anything else is -1.
 */
export function cortexColorIndex(color: string): number {
  const text = color.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  const hex = short
    ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
    : text;
  return CORTEX_COLORS.findIndex((c) => c.hex === hex);
}
