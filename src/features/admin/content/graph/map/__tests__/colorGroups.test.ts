import { describe, expect, it } from 'vitest';
import { KEY_COLORS } from '@/daw/prism-engine/data/keyColors';
import {
  DEFAULT_NODE_COLOR,
  MISSING_NODE_COLOR,
  PRESET_GROUPS,
  colorNodes,
  newGroupColor,
  parseHexColor,
  presetGroups,
  type ColorGroup,
} from '../model/colorGroups';
import { CORTEX_COLORS, cortexColor } from '../model/cortexPalette';
import { graphFacets } from '../model/facets';
import { ATLAS, IDS } from './queryFixture';

const facets = graphFacets(ATLAS);

/** White or close to it: every channel above 0xe6. White is the highlight. */
const isNearWhite = (hex: string) => {
  const rgba = parseHexColor(hex);
  return rgba !== null && rgba.slice(0, 3).every((v) => v > 0xe6);
};

/** The colour of the node with an id, as `#rrggbbaa`. */
const colorOf = (rgba: Uint8Array, id: string) => {
  const i = IDS.indexOf(id);
  return `#${[...rgba.slice(i * 4, i * 4 + 4)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
};

describe('the preset groups', () => {
  it('cover every kind, in first-match order, each in its own colour', () => {
    expect(PRESET_GROUPS.map((g) => g.query)).toEqual([
      'kind:song',
      'is:curriculum',
      'kind:event',
      'kind:year OR kind:decade OR kind:era',
      'kind:place',
      'kind:genre OR kind:subgenre OR kind:scene',
      'kind:instrument',
      'kind:artist',
      'kind:key OR kind:mode OR kind:vibe',
      'kind:release',
      'kind:studio OR kind:label',
      'kind:progression',
    ]);
    for (const { name } of PRESET_GROUPS) expect(name).toBeTruthy();
    const colours = PRESET_GROUPS.map((g) => g.color);
    for (const c of colours) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    // Every group shown by default has a colour of its own; groups hidden
    // by default may share (the palette has fewer colours than groups).
    const shownByDefault = PRESET_GROUPS.filter((g) =>
      /^kind:(song|artist|event|place|release|studio|progression)/.test(
        g.query,
      ),
    ).map((g) => g.color);
    expect(new Set(shownByDefault).size).toBe(shownByDefault.length);
  });

  it("use the owner's Coolors palettes", () => {
    expect(PRESET_GROUPS.map((g) => [g.name, g.color])).toEqual([
      ['Songs', '#ee9b00'],
      ['Curriculum', '#005f73'],
      ['Events', '#94d2bd'],
      ['Year', '#9b2226'],
      ['Location', '#bb3e03'],
      ['Genre', '#ca6702'],
      ['Instruments', '#ae2012'],
      ['Artists', '#0a9396'],
      ['Key', '#a53860'],
      ['Records', '#e9d8a6'],
      ['Studios & Labels', '#ffa5ab'],
      ['Chord Progressions', '#588157'],
    ]);
    expect(cortexColor('Openings')).toBe('#f9dbbd');
    expect(CORTEX_COLORS).toHaveLength(13);
  });

  it("use none of Prism's twelve key colours", () => {
    const hex = (rgb: readonly number[]) =>
      `#${rgb
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
    const keys = new Set(
      Array.from({ length: 12 }, (_, i) =>
        hex(KEY_COLORS[(i + 1) as keyof typeof KEY_COLORS]),
      ),
    );
    expect(keys.size).toBe(12);
    for (const c of CORTEX_COLORS) expect(keys.has(c.hex)).toBe(false);
    for (const { color } of PRESET_GROUPS) expect(keys.has(color)).toBe(false);
  });

  it('come back as a fresh copy to edit', () => {
    const copy = presetGroups();
    expect(copy).toEqual(PRESET_GROUPS);
    copy[0] = { query: 'kind:artist', color: '#000000' };
    expect(PRESET_GROUPS[0].query).toBe('kind:song');
  });

  it('use no white, which is the highlight', () => {
    for (const { color } of PRESET_GROUPS)
      expect(isNearWhite(color)).toBe(false);
    expect(isNearWhite(DEFAULT_NODE_COLOR)).toBe(false);
  });

  it('colour the fixture Atlas by kind', () => {
    const { rgba, counts, defaultCount, missingCount, problems } = colorNodes({
      ids: IDS,
      facets,
      groups: PRESET_GROUPS,
    });
    expect(rgba).toHaveLength(IDS.length * 4);
    expect(problems).toEqual(PRESET_GROUPS.map(() => null));
    expect(colorOf(rgba, 'song:africa')).toBe(`${PRESET_GROUPS[0].color}ff`);
    expect(colorOf(rgba, 'artist:toto')).toBe(`${PRESET_GROUPS[7].color}ff`);
    expect(colorOf(rgba, 'event:evt-motown-founded')).toBe(
      `${PRESET_GROUPS[2].color}ff`,
    );
    expect(colorOf(rgba, 'place:detroit')).toBe(`${PRESET_GROUPS[4].color}ff`);
    // A region is a place first: `kind:place` comes before `is:tag`.
    expect(colorOf(rgba, 'place:region-europe')).toBe(
      `${PRESET_GROUPS[4].color}ff`,
    );
    expect(colorOf(rgba, 'release:toto-iv')).toBe(
      `${PRESET_GROUPS[9].color}ff`,
    );
    expect(colorOf(rgba, 'label:columbia')).toBe(
      `${PRESET_GROUPS[10].color}ff`,
    );
    expect(colorOf(rgba, 'studio:sunset-sound')).toBe(
      `${PRESET_GROUPS[10].color}ff`,
    );
    expect(colorOf(rgba, 'genre:rock')).toBe(`${PRESET_GROUPS[5].color}ff`);
    expect(colorOf(rgba, 'year:1982')).toBe(`${PRESET_GROUPS[3].color}ff`);
    expect(colorOf(rgba, 'teach_day:unit-1-day-1')).toBe(
      `${PRESET_GROUPS[1].color}ff`,
    );
    expect(colorOf(rgba, 'progression:ii-v-i')).toBe(
      `${PRESET_GROUPS[11].color}ff`,
    );
    expect(colorOf(rgba, 'artist:ghost')).toBe('#66666680');
    // One count per preset group, in order; every kind now has a group.
    expect(counts).toEqual([3, 2, 1, 9, 6, 6, 0, 4, 2, 1, 2, 1]);
    expect(defaultCount).toBe(0);
    expect(missingCount).toBe(1);
    expect(
      counts.reduce((a, b) => a + b, 0) + defaultCount + missingCount,
    ).toBe(IDS.length);
  });
});

describe('colorNodes', () => {
  const run = (groups: readonly ColorGroup[], orphans: string[] = []) =>
    colorNodes({
      ids: IDS,
      facets,
      groups,
      isOrphan: (i) => orphans.includes(IDS[i]),
    });

  it('gives a node the first group it matches', () => {
    const groups = [
      { query: 'genre:rock', color: '#ff0000' },
      { query: 'kind:song', color: '#00ff00' },
    ];
    const { rgba, groupOf, counts } = run(groups);
    expect(colorOf(rgba, 'song:africa')).toBe('#ff0000ff');
    expect(colorOf(rgba, 'song:rosanna')).toBe('#ff0000ff');
    expect(colorOf(rgba, 'song:so_what')).toBe('#00ff00ff');
    expect(groupOf[IDS.indexOf('song:africa')]).toBe(0);
    expect(groupOf[IDS.indexOf('song:so_what')]).toBe(1);
    expect(groupOf[IDS.indexOf('artist:toto')]).toBe(-1);
    expect(counts).toEqual([4, 1]);

    // Reordered, songs take their own colour first.
    const swapped = run([groups[1], groups[0]]);
    expect(colorOf(swapped.rgba, 'song:africa')).toBe('#00ff00ff');
    expect(colorOf(swapped.rgba, 'genre:rock')).toBe('#ff0000ff');
    expect(swapped.counts).toEqual([3, 2]);
  });

  it('never recolours a missing node', () => {
    const { rgba, groupOf, counts, missingCount } = run([
      { query: 'is:missing', color: '#ff0000' },
      { query: 'kind:artist', color: '#00ff00' },
      { query: 'ghost', color: '#0000ff' },
    ]);
    expect(colorOf(rgba, 'artist:ghost')).toBe(
      `${MISSING_NODE_COLOR}`.toLowerCase(),
    );
    expect(groupOf[IDS.indexOf('artist:ghost')]).toBe(-1);
    expect(counts).toEqual([0, 4, 0]);
    expect(missingCount).toBe(1);
  });

  it('lets a blank, broken or colourless group fall through', () => {
    const { rgba, problems, counts } = run([
      { query: '', color: '#ff0000' },
      { query: 'kind:song OR', color: '#ff0000' },
      { query: 'kind:song', color: 'not a colour' },
      { query: 'kind:song', color: '#123456' },
    ]);
    expect(colorOf(rgba, 'song:africa')).toBe('#123456ff');
    expect(problems[0]).toBeNull();
    expect(problems[1]?.message).toBe('"OR" needs something after it.');
    expect(problems[2]).toBeNull();
    expect(counts).toEqual([0, 0, 0, 3]);
  });

  it('asks the caller which nodes are orphans', () => {
    const { rgba, counts } = run(
      [{ query: 'is:orphan', color: '#ff0000' }],
      ['artist:loner'],
    );
    expect(colorOf(rgba, 'artist:loner')).toBe('#ff0000ff');
    expect(counts).toEqual([1]);
  });

  it('takes another default and missing colour, and colours unknown ids by default', () => {
    const { rgba, defaultCount } = colorNodes({
      ids: ['artist:nobody', 'artist:ghost', 'song:africa'],
      facets,
      groups: [],
      defaultColor: '#202020',
      missingColor: '#30303040',
    });
    expect([...rgba]).toEqual([
      0x20, 0x20, 0x20, 0xff, 0x30, 0x30, 0x30, 0x40, 0x20, 0x20, 0x20, 0xff,
    ]);
    expect(defaultCount).toBe(2);
  });
});

describe('newGroupColor', () => {
  it('takes the first palette colour no group uses yet', () => {
    const used = PRESET_GROUPS.slice(1);
    expect(newGroupColor(used)).toBe(PRESET_GROUPS[0].color);
  });

  it('offers the reserved Openings peach once the presets are all in use', () => {
    expect(newGroupColor(PRESET_GROUPS)).toBe('#f9dbbd');
  });

  it('takes the least used colour once every one is taken, never white', () => {
    const all = CORTEX_COLORS.map((c) => ({ color: c.hex }));
    const next = newGroupColor(all);
    expect(next).toBe(PRESET_GROUPS[0].color);
    expect(newGroupColor([...all, { color: next }])).toBe(
      PRESET_GROUPS[1].color,
    );
    for (const c of CORTEX_COLORS) expect(isNearWhite(c.hex)).toBe(false);
    expect(newGroupColor([])).toBe(PRESET_GROUPS[0].color);
  });
});

describe('colour helpers', () => {
  it('read hex colours', () => {
    expect(parseHexColor('#abc')).toEqual([0xaa, 0xbb, 0xcc, 255]);
    expect(parseHexColor('#3987E5')).toEqual([0x39, 0x87, 0xe5, 255]);
    expect(parseHexColor('#66666680')).toEqual([0x66, 0x66, 0x66, 0x80]);
    expect(parseHexColor('red')).toBeNull();
    expect(parseHexColor('#12345')).toBeNull();
    expect(parseHexColor('#ggg')).toBeNull();
  });
});
