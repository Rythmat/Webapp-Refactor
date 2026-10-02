import { describe, expect, it } from 'vitest';
import type {
  EntityId,
  EntityKind,
  GraphEdge,
  GraphNode,
} from '@/content/graph/types';
import {
  appPageFor,
  editorFor,
  isEditedHere,
  KIND_LABEL,
  kindColor,
  kindLabel,
} from '../graphVocabulary';
import {
  colorNodes,
  DEFAULT_NODE_COLOR,
  PRESET_GROUPS,
  presetGroups,
} from '../map/model/colorGroups';
import { graphFacets } from '../map/model/facets';

/**
 * Cortex's words and kind colours. The Record types already make a new kind
 * fail to compile until it has a label; these pin what the types cannot:
 * that a kind's colour is the one the graph's own preset groups give it,
 * and where the calendar's nodes lead.
 */

const KINDS = Object.keys(KIND_LABEL) as EntityKind[];

/** `#rrggbb` from the first three of a node's colour bytes. */
const hexAt = (rgba: Uint8Array, i: number) =>
  `#${[...rgba.slice(i * 4, i * 4 + 3)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;

describe('a kind’s colour', () => {
  it('is what the preset groups paint a node of that kind, for every kind', () => {
    // One node of each kind (a city for places, not a region), coloured the
    // way the graph colours its dots.
    const nodes: GraphNode[] = KINDS.map((kind) => ({
      id: `${kind}:sample` as EntityId,
      kind,
      label: `A ${kind}`,
      status: 'published',
      origin: 'code',
    }));
    const graph = {
      nodes: new Map(nodes.map((n) => [n.id, n])),
      adjacency: new Map<EntityId, readonly GraphEdge[]>(),
    };
    const coloring = colorNodes({
      ids: nodes.map((n) => n.id),
      facets: graphFacets(graph),
      groups: presetGroups(),
    });
    expect(KINDS.map((kind) => [kind, kindColor(kind)])).toEqual(
      KINDS.map((kind, i) => [kind, hexAt(coloring.rgba, i)]),
    );
  });

  it('comes from the presets alone: no kind is left the default grey', () => {
    const preset = new Set(PRESET_GROUPS.map((g) => g.color.toLowerCase()));
    for (const kind of KINDS) {
      expect(preset.has(kindColor(kind).toLowerCase()), kind).toBe(true);
    }
  });

  it('is the default grey for what is not a kind', () => {
    expect(kindColor('nonsense')).toBe(DEFAULT_NODE_COLOR);
    expect(kindColor('')).toBe(DEFAULT_NODE_COLOR);
  });
});

describe('years and decades in Cortex', () => {
  it('are named and coloured like the eras they sit in', () => {
    expect(kindLabel('year')).toBe('Year');
    expect(kindLabel('decade')).toBe('Decade');
    expect(kindColor('year')).toBe(kindColor('era'));
    expect(kindColor('decade')).toBe(kindColor('era'));
  });

  it('have no page in the app to open', () => {
    expect(
      appPageFor({ id: 'year:1982', kind: 'year', label: '1982' }),
    ).toBeNull();
    expect(
      appPageFor({ id: 'decade:1980s', kind: 'decade', label: '1980s' }),
    ).toBeNull();
  });
});

describe('where the item behind a connection is edited', () => {
  it('is its row in the Table, for every kind a content item defines', () => {
    expect(
      [
        'song:africa',
        'event:evt-woodstock',
        'artist:toto',
        'release:toto-toto-iv',
        'studio:hitsville',
        'label:motown',
        'place:detroit',
        'progression:12',
      ].map(editorFor),
    ).toEqual([
      '/console/table/songs/africa',
      '/console/table/events/evt-woodstock',
      '/console/table/artists/toto',
      '/console/table/records/toto-toto-iv',
      '/console/table/studios/hitsville',
      '/console/table/labels/motown',
      '/console/table/locations/detroit',
      '/console/table/progressions/12',
    ]);
  });

  it("is the song's row for a song's own globe event", () => {
    expect(editorFor('event:song-africa')).toBe('/console/table/songs/africa');
  });

  it('is nowhere for what code states', () => {
    for (const id of [
      'genre:rock',
      'subgenre:yacht-rock',
      'year:1982',
      'instrument:piano',
      'teach_day:aug-day-1',
      'pathway:blues-to-rock',
      'toto',
    ]) {
      expect(editorFor(id), id).toBeNull();
    }
  });
});

describe('what the console edits today', () => {
  it('is every kind an item stores, in its row', () => {
    for (const id of [
      'song:africa',
      'event:evt-woodstock',
      'event:song-africa',
      'place:detroit',
      'artist:toto',
      'release:toto-toto-iv',
      'studio:hitsville',
      'label:motown',
      'progression:12',
    ]) {
      expect(isEditedHere(id), id).toBe(true);
    }
  });

  it('is not what code states', () => {
    for (const id of ['genre:rock', 'year:1982', 'constructor:x']) {
      expect(isEditedHere(id), id).toBe(false);
    }
  });
});
