import type { StyleSpecification } from 'maplibre-gl';

/**
 * The map's labels, in the app's own font: Glacial Indifference, drawn by
 * MapLibre from the files the page already loads (public/fonts) through the
 * style's `font-faces`. There is no glyph server, so the map asks no other
 * site for anything.
 *
 * MapLibre looks a `text-font` name up in `font-faces` one character at a
 * time. A character the name's file covers (its `unicode-range`) is drawn
 * from that file. Any other is drawn locally with the CSS font
 * `<weight> 48px "<name>", sans-serif`, the weight read from a word in the
 * name ("Bold" is 700). No CSS family is called "Atlas Glacial …", so that
 * falls to the browser's own sans: the "ș" and "ă" of Chișinău, or a name
 * in Japanese. So each name carries its weight word, and must never be the
 * name of a real CSS family.
 */
export const MAP_FONT = {
  regular: 'Atlas Glacial Regular',
  bold: 'Atlas Glacial Bold',
} as const;

/**
 * The characters each file holds, in the CSS `unicode-range` grammar
 * (fc-query on public/fonts, 29 Oct 2026; the private-use Apple logo left
 * out). Basic Latin and the Western European accents, a few quotes and
 * dashes: no Latin Extended-A, no "·".
 */
export const GLACIAL_RANGES = {
  regular: [
    'U+20-7E',
    'U+A0',
    'U+A8-A9',
    'U+AE',
    'U+B0',
    'U+B4',
    'U+B6',
    'U+B8',
    'U+C0-FF',
    'U+131',
    'U+152-153',
    'U+2C6-2C7',
    'U+2DA',
    'U+2DC',
    'U+2013-2014',
    'U+2018-2019',
    'U+201C-201D',
    'U+2022',
    'U+2026',
    'U+2044',
    'U+2122',
    'U+2212',
  ],
  bold: [
    'U+20-7E',
    'U+A0',
    'U+A5',
    'U+A8-A9',
    'U+AE',
    'U+B0',
    'U+B4',
    'U+B6',
    'U+B8',
    'U+BA',
    'U+C0-F6',
    'U+F8-FF',
    'U+131',
    'U+152-153',
    'U+178',
    'U+2C6-2C7',
    'U+2DC',
    'U+2013-2014',
    'U+2018-2019',
    'U+201C-201D',
    'U+2022',
    'U+2026',
    'U+2044',
    'U+2122',
    'U+2212',
  ],
} as const;

type FontFaces = NonNullable<StyleSpecification['font-faces']>;

/**
 * The style's `font-faces`: each weight's file, on the page's own origin,
 * with the characters it holds. MapLibre downloads a file only when a label
 * first needs a character from it.
 */
export function mapFontFaces(origin: string): FontFaces {
  return {
    [MAP_FONT.regular]: [
      {
        url: `${origin}/fonts/GlacialIndifference-Regular.otf`,
        'unicode-range': [...GLACIAL_RANGES.regular],
      },
    ],
    [MAP_FONT.bold]: [
      {
        url: `${origin}/fonts/GlacialIndifference-Bold.otf`,
        'unicode-range': [...GLACIAL_RANGES.bold],
      },
    ],
  };
}
