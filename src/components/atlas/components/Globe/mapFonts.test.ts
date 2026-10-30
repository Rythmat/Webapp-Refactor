/**
 * The map's labels come from the app's own font files: each weight's file
 * on the page's origin, declared with exactly the characters it holds, so a
 * character it lacks falls to the browser's own font instead of a blank.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLACIAL_RANGES, MAP_FONT, mapFontFaces } from './mapFonts';

const ORIGIN = 'https://app.example';

type Range = readonly [number, number];

/** A `unicode-range` entry as a range of code points. */
function parseRange(entry: string): Range | null {
  const m = /^U\+([0-9A-F]{1,6})(?:-([0-9A-F]{1,6}))?$/.exec(entry);
  if (!m) return null;
  const from = parseInt(m[1], 16);
  return [from, m[2] ? parseInt(m[2], 16) : from];
}

/**
 * The code points an OpenType file has a glyph for: its cmap table's
 * Windows Unicode subtable (format 12, else format 4).
 */
function coveredCodePoints(file: string): Set<number> {
  const font = readFileSync(join(process.cwd(), 'public/fonts', file));
  const tables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const record = 12 + i * 16;
    if (font.toString('latin1', record, record + 4) === 'cmap') {
      cmap = font.readUInt32BE(record + 8);
    }
  }
  if (cmap < 0) throw new Error(`${file} has no cmap`);
  const subtables = new Map<string, number>();
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const record = cmap + 4 + i * 8;
    const key = `${font.readUInt16BE(record)},${font.readUInt16BE(record + 2)}`;
    subtables.set(key, cmap + font.readUInt32BE(record + 4));
  }
  const out = new Set<number>();
  const full = subtables.get('3,10');
  if (full !== undefined && font.readUInt16BE(full) === 12) {
    for (let g = 0; g < font.readUInt32BE(full + 12); g++) {
      const group = full + 16 + g * 12;
      const end = font.readUInt32BE(group + 4);
      for (let c = font.readUInt32BE(group); c <= end; c++) out.add(c);
    }
    return out;
  }
  const bmp = subtables.get('3,1');
  if (bmp === undefined || font.readUInt16BE(bmp) !== 4) {
    throw new Error(`${file} has no Unicode cmap`);
  }
  const segments = font.readUInt16BE(bmp + 6) / 2;
  const ends = bmp + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const offsets = deltas + segments * 2;
  for (let s = 0; s < segments; s++) {
    const start = font.readUInt16BE(starts + s * 2);
    const end = font.readUInt16BE(ends + s * 2);
    const delta = font.readInt16BE(deltas + s * 2);
    const offsetAt = offsets + s * 2;
    const offset = font.readUInt16BE(offsetAt);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph: number;
      if (offset === 0) glyph = (c + delta) & 0xffff;
      else {
        glyph = font.readUInt16BE(offsetAt + offset + (c - start) * 2);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) out.add(c);
    }
  }
  return out;
}

/** Code points as the shortest list of ranges, in order. */
function toRanges(points: Iterable<number>): Range[] {
  const sorted = [...points].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const c of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && c === last[1] + 1) last[1] = c;
    else ranges.push([c, c]);
  }
  return ranges;
}

describe('the map’s fonts', () => {
  it('declares every range in the CSS unicode-range grammar, in order', () => {
    for (const ranges of Object.values(GLACIAL_RANGES)) {
      let last = -1;
      for (const entry of ranges) {
        const range = parseRange(entry);
        expect(range, entry).not.toBeNull();
        expect(range![0]).toBeGreaterThan(last);
        expect(range![1]).toBeGreaterThanOrEqual(range![0]);
        last = range![1];
      }
    }
  });

  it('declares exactly what each file holds (control and private use aside)', () => {
    const files = {
      regular: 'GlacialIndifference-Regular.otf',
      bold: 'GlacialIndifference-Bold.otf',
    } as const;
    for (const weight of ['regular', 'bold'] as const) {
      const held = [...coveredCodePoints(files[weight])].filter(
        (c) =>
          c >= 0x20 && (c < 0x7f || c > 0x9f) && (c < 0xe000 || c > 0xf8ff),
      );
      expect(GLACIAL_RANGES[weight].map(parseRange), weight).toEqual(
        toRanges(held),
      );
    }
  });

  it('takes each weight’s file from the page’s own origin', () => {
    const faces = mapFontFaces(ORIGIN);
    expect(faces[MAP_FONT.regular]).toEqual([
      {
        url: `${ORIGIN}/fonts/GlacialIndifference-Regular.otf`,
        'unicode-range': [...GLACIAL_RANGES.regular],
      },
    ]);
    expect(faces[MAP_FONT.bold]).toEqual([
      {
        url: `${ORIGIN}/fonts/GlacialIndifference-Bold.otf`,
        'unicode-range': [...GLACIAL_RANGES.bold],
      },
    ]);
  });

  it('names each stack by its weight, and never as a real font', () => {
    // MapLibre reads the weight of a fallback character from the name, and
    // draws it in the browser's own sans because no font has that name.
    expect(MAP_FONT.regular).toMatch(/\bRegular\b/);
    expect(MAP_FONT.bold).toMatch(/\bBold\b/);
    for (const name of Object.values(MAP_FONT)) {
      expect(name.startsWith('Glacial')).toBe(false);
    }
  });
});
