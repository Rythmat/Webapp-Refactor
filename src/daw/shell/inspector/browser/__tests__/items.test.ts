// @vitest-environment jsdom
/**
 * What the Library lists (milestone 2.14): the live catalog useCatalog
 * gathers, each item named by its kind in its id, the genre and instrument
 * every source's own words map to, the designed groove's tempo, length,
 * metre and kit winning over the catalog's, and the meta line each kind of
 * row says under its name.
 */
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// The SERUM pack's manifest, as fetchPackManifest would fetch it: two
// patches, so the pack's rows are counted too (no network in a test).
vi.mock('@/daw/oracle-synth/store/presets/packLoader', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchPackManifest: async () => ({
    packId: 'serum2',
    displayName: 'SERUM pack',
    version: 1,
    presets: [
      { name: 'BA - Test Bass', file: 'a.json', category: 'Bass' },
      { name: 'KY - Test Keys', file: 'b.json', category: 'Keyboard' },
    ],
    wavetables: [],
  }),
}));

import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { PRESETS } from '@/daw/data/instrumentPresets';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import { shortKeyLabel } from '@/daw/harmony/clipKey';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import type { PresetData } from '@/daw/oracle-synth/store/presets/PresetData';
import {
  GENRES,
  genreLabel,
  grooveItem,
  kitItem,
  metaOf,
  partItem,
  studioPresetItem,
  synthPresetItem,
  templateItem,
  type BrowserItem,
} from '../items';
import { useCatalog } from '../useCatalog';

const FACTORY_DATA: PresetData = FACTORY_PRESETS[0];

let catalog: BrowserItem[] = [];

beforeAll(async () => {
  // One preset of the student's own, and a factory one the store also
  // lists, which the Library leaves to the Oracle section.
  useSynthStore.setState({
    userPresets: [
      { name: 'My Wobble', data: FACTORY_DATA, isFactory: false },
      { name: 'PAD', data: FACTORY_DATA, isFactory: true },
    ],
  });
  const { result, unmount } = renderHook(() => useCatalog());
  // The designed grooves (a lazy chunk) and the pack's manifest fill in.
  await waitFor(() => {
    const latin = result.current.find((i) => i.id === 'groove:groove-latin-2');
    expect(latin?.bpm).toBe(120);
    expect(result.current.some((i) => i.id.startsWith('preset:pack:'))).toBe(
      true,
    );
  });
  catalog = result.current;
  unmount();
});

afterEach(cleanup);

const ofType = (type: BrowserItem['type']) =>
  catalog.filter((i) => i.type === type);
const byId = (id: string) => {
  const item = catalog.find((i) => i.id === id);
  if (!item) throw new Error(`No item ${id}`);
  return item;
};

describe('the live catalog', () => {
  it('lists every source, in type order', () => {
    // Every part published in the console (it grows as parts go live).
    expect(ofType('part').length).toBeGreaterThan(0);
    expect(ofType('part')).toHaveLength(listLiveParts().length);
    expect(ofType('groove')).toHaveLength(29);
    expect(ofType('groove')).toHaveLength(GROOVES.length);
    expect(ofType('kit')).toHaveLength(DRUM_KIT_CONFIGS.length);
    expect(ofType('template')).toHaveLength(4);

    const presets = ofType('preset');
    const source = (s: string) =>
      presets.filter((p) => p.type === 'preset' && p.source === s);
    expect(source('studio')).toHaveLength(23);
    expect(source('studio')).toHaveLength(PRESETS.length);
    // The factory patches but INITIALIZE, with the Music Atlas patches saved
    // for everyone (presets/atlas).
    expect(source('oracle')).toHaveLength(FACTORY_PRESETS.length - 1);
    expect(source('oracle').map((p) => p.name)).not.toContain('INITIALIZE');
    expect(source('pack').map((p) => p.name)).toEqual([
      'BA - Test Bass',
      'KY - Test Keys',
    ]);
    // Only the student's own: a factory patch in the store isn't "mine".
    expect(source('mine').map((p) => p.name)).toEqual(['My Wobble']);
    expect(presets).toHaveLength(
      PRESETS.length + (FACTORY_PRESETS.length - 1) + 2 + 1,
    );

    const order = ['part', 'groove', 'kit', 'preset', 'template'];
    const types = catalog.map((i) => order.indexOf(i.type));
    expect(types).toEqual([...types].sort((a, b) => a - b));
  });

  it('gives every item a unique id that starts with its kind', () => {
    const ids = catalog.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of catalog) {
      const prefix = item.id.slice(0, item.id.indexOf(':'));
      expect(prefix).toBe(item.type);
    }
    expect(byId(`part:${listLiveParts()[0].id}`).type).toBe('part');
    expect(byId('groove:groove-hiphop-1').type).toBe('groove');
    expect(byId('kit:natural').type).toBe('kit');
    expect(byId('preset:studio:Brass Ensemble').type).toBe('preset');
    expect(byId('preset:oracle:PAD').type).toBe('preset');
    expect(byId('preset:pack:BA - Test Bass').type).toBe('preset');
    expect(byId('preset:mine:My Wobble').type).toBe('preset');
    expect(byId('template:project-pop').type).toBe('template');
  });

  it('keeps the ids from one build to the next', () => {
    const again = listLiveParts().map(partItem);
    expect(again.map((i) => i.id)).toEqual(ofType('part').map((i) => i.id));
  });

  it('lowercases every search haystack', () => {
    for (const item of catalog) {
      expect(item.search).toBe(item.search.toLowerCase());
    }
  });
});

describe('genres and instruments', () => {
  it('maps every source’s way of writing a genre to one label', () => {
    expect(genreLabel('hip-hop')).toBe('Hip hop');
    expect(genreLabel('Hip Hop')).toBe('Hip hop');
    expect(genreLabel('Neo Soul')).toBe('Neo soul');
    expect(genreLabel('rnb')).toBe('R&B');
    expect(genreLabel('R&B')).toBe('R&B');
    expect(genreLabel('funk')).toBe('Funk');
    expect(genreLabel('polka')).toBeNull();
    expect(genreLabel(undefined)).toBeNull();
    // Every part, groove and template lands on one of the filter's genres.
    for (const item of catalog) {
      if (item.type === 'part' || item.type === 'groove') {
        expect(GENRES).toContain(item.genre);
      }
      if (item.type === 'template') expect(GENRES).toContain(item.genre);
    }
    expect(byId('groove:groove-latin-2').genre).toBe('Latin');
    expect(byId('template:project-rnb').genre).toBe('R&B');
  });

  it('maps a part’s instrument and role', () => {
    const parts = listLiveParts();
    const want = { piano: 'keys', bass: 'bass', guitar: 'guitar' } as const;
    for (const part of parts) {
      const item = byId(`part:${part.id}`);
      if (item.type !== 'part') throw new Error('not a part');
      if (part.instrument !== 'drums') {
        expect(item.instrument).toBe(want[part.instrument]);
      }
      if (part.role === 'bassline') {
        expect(item.role).toBe('bass');
        expect(item.trackRole).toBe('bass');
      }
      if (part.role === 'comping' || part.role === 'two-hand') {
        expect(item.role).toBe('chords');
        expect(item.trackRole).toBe('chords');
      }
    }
  });

  it('puts grooves and kits on drums, and presets on their instrument', () => {
    for (const item of [...ofType('groove'), ...ofType('kit')]) {
      expect(item.instrument).toBe('drums');
      expect(item.role).toBe('drums');
    }
    expect(byId('preset:studio:Brass Ensemble').instrument).toBe('brass');
    const studio = (category: string) =>
      PRESETS.filter((p) => p.category === category).map(
        (p) => studioPresetItem(p).instrument,
      );
    expect(new Set(studio('Electric Basses'))).toEqual(new Set(['bass']));
    expect(new Set(studio('Guitars'))).toEqual(new Set(['guitar']));
    expect(new Set(studio('Keyboards'))).toEqual(new Set(['keys']));
    expect(new Set(studio('Organs'))).toEqual(new Set(['keys']));
    expect(new Set(studio('Strings'))).toEqual(new Set(['strings']));

    const oracle = (name: string) => {
      const item = byId(`preset:oracle:${name}`);
      if (item.type !== 'preset') throw new Error('not a preset');
      return item;
    };
    expect(oracle('BASS')).toMatchObject({
      instrument: 'bass',
      category: 'Bass',
      trackRole: 'bass',
      instrumentType: 'oracle-synth',
    });
    expect(oracle('WOBBLE').instrument).toBe('bass');
    expect(oracle('PAD')).toMatchObject({
      instrument: 'synth',
      category: 'Pad',
      trackRole: 'chords',
    });
    expect(oracle('LEAD').trackRole).toBe('melody');
    expect(oracle('PLUCK').trackRole).toBe('auto');
    expect(byId('preset:pack:KY - Test Keys')).toMatchObject({
      instrument: 'keys',
      category: 'Keys',
    });
    expect(byId('preset:mine:My Wobble')).toMatchObject({
      instrument: 'synth',
      category: 'Mine',
    });
    expect(byId('template:project-pop').instrument).toBeNull();
  });
});

describe('a designed groove', () => {
  it('wins over the catalog: Latin 2 plays 3/4 at 120 on its own kit', () => {
    const entry = GROOVES.find((g) => g.id === 'groove-latin-2')!;
    expect(entry.bpm).toBe(90);
    const item = byId('groove:groove-latin-2');
    if (item.type !== 'groove') throw new Error('not a groove');
    expect(item.bpm).toBe(120);
    expect(item.timeSignature).toEqual([3, 4]);
    expect(item.bars).toBe(2);
    expect(item.kit).toBe('go_go_kit');
    expect(item.tags).toContain('3/4');
  });

  it('falls back to the catalog until it has loaded', () => {
    const entry = GROOVES.find((g) => g.id === 'groove-latin-2')!;
    const item = grooveItem(entry);
    expect(item).toMatchObject({
      bpm: 90,
      bars: null,
      timeSignature: null,
      kit: 'natural',
    });
    expect(item.tags).not.toContain('3/4');
  });
});

describe('the meta line', () => {
  it('says a part’s key, tempo, length and chords', () => {
    const part = listLiveParts().find(
      (p) => p.id === 'funk-l1-d1-1-lh-root-pattern-rh-funk-stab-1',
    )!;
    const item = partItem(part);
    expect(metaOf(item)).toBe('D Dorian · 92 BPM · 3 bars · i7');
    // The key it lands in, when moved.
    expect(metaOf(item, { tonic: 9, mode: 'dorian' })).toBe(
      `${shortKeyLabel(9, 'dorian')} · 92 BPM · 3 bars · i7`,
    );
    // A part with no chords leaves them out (chordFunction is cached per
    // part id, so the copy has its own).
    const plain = partItem({
      ...part,
      id: 'test-no-chords',
      chordSymbols: undefined,
      bars: 1,
    });
    expect(metaOf(plain)).toBe('D Dorian · 92 BPM · 1 bar');
  });

  it('says a groove’s tempo, length, metre and genre', () => {
    expect(metaOf(byId('groove:groove-latin-2'))).toBe(
      '120 BPM · 2 bars · 3/4 · Latin',
    );
    const entry = GROOVES.find((g) => g.id === 'groove-latin-2')!;
    expect(metaOf(grooveItem(entry))).toBe('90 BPM · Latin');
  });

  it('says what a kit and a sound are', () => {
    const natural = DRUM_KIT_CONFIGS.find((k) => k.id === 'natural')!;
    const kit = kitItem(natural);
    expect(metaOf(kit)).toBe(
      `Drum kit · ${Object.keys(natural.samples).length} pads`,
    );
    expect(kit.tags).toEqual(['Acoustic']);
    expect(metaOf(byId('preset:studio:Brass Ensemble'))).toBe(
      'Brass · Studio sound',
    );
    expect(metaOf(synthPresetItem('oracle', 'PAD'))).toBe('Pad · Oracle Synth');
    expect(metaOf(byId('preset:pack:BA - Test Bass'))).toBe(
      'Bass · SERUM pack',
    );
    expect(metaOf(byId('preset:mine:My Wobble'))).toBe('Mine · My preset');
  });

  it('says a template’s tempo and tracks', () => {
    for (const template of PROJECT_TEMPLATES) {
      const item = templateItem(template);
      expect(metaOf(item)).toBe(
        `${template.bpm} BPM · ${template.tracks.length} tracks`,
      );
      expect(item.name).toBe(template.label);
    }
    expect(metaOf(byId('template:project-rock'))).toBe('120 BPM · 4 tracks');
  });
});
