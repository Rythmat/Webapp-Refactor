// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import type {
  ArtistRecord,
  LabelRecord,
  PlaceRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import CHORD_PROGRESSION_LIBRARY, {
  type ChordProgressionEntry,
} from '@/curriculum/data/chordProgressionLibrary';
import { recordBodySchemas } from '@/scripts/apiContract/recordBodySchemas';
import {
  ARTIST_KEYS,
  fieldSelector,
  LABEL_KEYS,
  PLACE_KEYS,
  PROGRESSION_KEYS,
  PROGRESSION_READ_ONLY_KEYS,
  RECORD_EDITORS,
  recordEditorFor,
  RELEASE_KEYS,
  STUDIO_KEYS,
} from '..';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import { type Body, renderEditor } from './harness';

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: () => false,
    isAuthoritative: () => false,
    feature: () => false,
    identityOf: () => 'slug',
    // A server that takes an artist's Born (artist body level 2).
    schemaVersionOf: () => 2,
  }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
});

type EditorKind = keyof typeof RECORD_EDITORS;

/** One body per kind with every field showing (members need a group). */
const FIXTURES: Record<EditorKind, Body> = {
  artist: {
    slug: 'the-temptations',
    name: 'The Temptations',
    group: true,
    members: [{ artistId: 'david-ruffin', from: 1964 }],
    influencedBy: [{ artistId: 'the-drifters' }],
    genreIds: ['rnb'],
  },
  release: {
    slug: 'marvin-gaye-whats-going-on',
    title: "What's Going On",
    artistIds: ['marvin-gaye'],
    format: 'album',
  },
  studio: {
    slug: 'hitsville-usa',
    name: 'Hitsville U.S.A.',
    placeId: 'detroit',
  },
  label: { slug: 'tamla', name: 'Tamla', placeId: 'detroit' },
  globe_city: {
    id: 'detroit',
    name: 'Detroit',
    country: 'US',
    subdivision: 'Michigan',
    region: 'north-america',
    coordinates: [42.3314, -83.0458],
    genres: ['Motown'],
    description: '',
    activeDecades: [1960],
    aliases: ['Motor City'],
  },
  chord_progression: {
    id: 212,
    progression: '6 minor - 5 major',
    chords: ['6 minor', '5 major'],
    chordCount: 2,
    startingChord: '6 minor',
    startingDegree: '6',
    complexity: 'triad',
    vibes: ['dreamy'],
    styles: ['pop'],
    artist: 'Fleetwood Mac',
    song: 'Dreams- Fleetwood Mac',
    songIds: ['dreams'],
  },
};

const KINDS = Object.keys(RECORD_EDITORS) as EditorKind[];

describe('the keys each editor writes', () => {
  const IDENTITY = {
    artist: 'slug',
    release: 'slug',
    studio: 'slug',
    label: 'slug',
    globe_city: 'id',
  } as const;
  it.each(Object.entries(IDENTITY))(
    '%s: every stored key but its identity (%s), as the API schema has it',
    (kind, identity) => {
      const stored = Object.keys(
        recordBodySchemas[kind as keyof typeof IDENTITY].shape,
      ).filter((k) => k !== identity);
      expect([...RECORD_EDITORS[kind as EditorKind].keys].sort()).toStrictEqual(
        stored.sort(),
      );
    },
  );

  it('match the record types', () => {
    expectTypeOf<(typeof ARTIST_KEYS)[number]>().toEqualTypeOf<
      Exclude<keyof ArtistRecord, 'slug'>
    >();
    expectTypeOf<(typeof RELEASE_KEYS)[number]>().toEqualTypeOf<
      Exclude<keyof ReleaseRecord, 'slug'>
    >();
    expectTypeOf<(typeof STUDIO_KEYS)[number]>().toEqualTypeOf<
      Exclude<keyof StudioRecord, 'slug'>
    >();
    expectTypeOf<(typeof LABEL_KEYS)[number]>().toEqualTypeOf<
      Exclude<keyof LabelRecord, 'slug'>
    >();
    expectTypeOf<(typeof PLACE_KEYS)[number]>().toEqualTypeOf<
      Exclude<keyof PlaceRecord, 'id'>
    >();
    expectTypeOf<
      | (typeof PROGRESSION_KEYS)[number]
      | (typeof PROGRESSION_READ_ONLY_KEYS)[number]
    >().toEqualTypeOf<keyof ChordProgressionEntry>();
  });

  it('chord_progression: written or shown, every key the library holds', () => {
    const known = new Set<string>([
      ...PROGRESSION_KEYS,
      ...PROGRESSION_READ_ONLY_KEYS,
    ]);
    const unknown = new Set(
      CHORD_PROGRESSION_LIBRARY.flatMap((entry) =>
        Object.keys(entry).filter((k) => !known.has(k)),
      ),
    );
    expect([...unknown]).toStrictEqual([]);
  });

  it('are found by content kind, and nothing else is', () => {
    expect(recordEditorFor('label')).toBe(RECORD_EDITORS.label);
    expect(recordEditorFor('song')).toBeUndefined();
    expect(recordEditorFor('toString' as never)).toBeUndefined();
  });
});

describe.each(KINDS)('%s', (kind) => {
  const { Editor, keys } = RECORD_EDITORS[kind];

  it('anchors every key it writes with data-field', () => {
    const { container, onChange } = renderEditor(Editor, FIXTURES[kind]);
    // `externalIds` is owned (kept out of the raw JSON) but has no field:
    // the site names no outside catalogue (owner decision of 30 September
    // 2026), so a stored one passes through untouched.
    const missing = keys.filter(
      (key) =>
        key !== 'externalIds' && !container.querySelector(fieldSelector(key)),
    );
    expect(missing).toStrictEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('read-only, offers no control that works', () => {
    const { container, onChange } = renderEditor(Editor, FIXTURES[kind], {
      readOnly: true,
    });
    const controls = [
      ...container.querySelectorAll<HTMLElement>(
        'input, select, textarea, button',
      ),
    ];
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.filter((c) => !c.matches(':disabled'))).toStrictEqual([]);
    // The adders and removers are not drawn at all.
    expect(screen.queryAllByRole('button', { name: /^(Add|Remove)/ })).toEqual(
      [],
    );
    expect(screen.queryAllByLabelText(/^Add /)).toEqual([]);
    for (const box of container.querySelectorAll<HTMLElement>(
      'input[type="checkbox"]',
    )) {
      fireEvent.click(box);
    }
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe.each(['artist', 'release', 'studio', 'label'] as const)(
  '%s: the record’s own flags',
  (kind) => {
    it('are written one key at a time', () => {
      const { last } = renderEditor(
        RECORD_EDITORS[kind].Editor,
        FIXTURES[kind],
      );
      const own = within(screen.getByRole('group', { name: 'This record' }));
      fireEvent.click(own.getByLabelText('Unconfirmed'));
      expect(last()).toStrictEqual({ ...FIXTURES[kind], unverified: true });
      fireEvent.change(own.getByLabelText('Source'), {
        target: { value: 'discogs' },
      });
      expect(last()).toStrictEqual({
        ...FIXTURES[kind],
        unverified: true,
        source: 'discogs',
      });
    });
  },
);
