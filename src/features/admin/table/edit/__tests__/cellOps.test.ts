import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { recordBodySchemas } from '@/scripts/apiContract/recordBodySchemas';
import { songBodySchema } from '@/scripts/apiContract/songBodySchema';
import {
  applyOps,
  type CellOp,
  composeOps,
  invertOps,
  POSITIONAL_FIELDS,
  restoreOps,
  useMine,
} from '../cellOps';

/**
 * A cell commit as data: the ops the write queue lays onto the item as the
 * server has it, re-read just before the write. Each test here is a body
 * and a few ops, with what the body becomes, what refuses to be laid on,
 * and what undoes it.
 */

type Body = Record<string, unknown>;

/** The body the ops make, or the test fails saying why not. */
const written = (body: Body, ops: readonly CellOp[]): Body => {
  const result = applyOps(body, ops);
  if (!result.ok) throw new Error(JSON.stringify(result.conflicts));
  return result.body;
};

const conflictsOf = (body: Body, ops: readonly CellOp[]) => {
  const result = applyOps(body, ops);
  if (result.ok) throw new Error('expected a conflict');
  return result.conflicts;
};

/** Undo, then check it put `before` back exactly. */
const roundTrip = (before: Body, ops: readonly CellOp[]) => {
  const after = written(before, ops);
  const undo = invertOps(before, ops);
  expect(written(after, undo)).toEqual(before);
  return { after, undo };
};

const quincy = {
  name: 'Quincy Jones',
  role: 'producer',
  artistGlobeId: 'quincy-jones',
};
const quincyWrote = { ...quincy, role: 'songwriter' };

describe('set', () => {
  const song: Body = {
    id: 'africa',
    title: 'Africa',
    year: 1982,
    session: { studio: 'Sunset Sound', studioId: 'sunset-sound' },
    sections: [{ name: 'Verse' }],
  };

  it('writes a field and leaves the rest of the body alone', () => {
    const next = written(song, [
      { op: 'set', path: 'year', value: 1983, seen: 1982 },
    ]);
    expect(next).toEqual({ ...song, year: 1983 });
    // The chart the lean export leaves out is whatever the re-read had.
    expect(next.sections).toBe(song.sections);
  });

  it('takes a field away, and an object it leaves saying nothing', () => {
    expect(
      written(song, [
        { op: 'set', path: 'year', value: undefined, seen: 1982 },
      ]),
    ).not.toHaveProperty('year');
    const bare = written(song, [
      {
        op: 'set',
        path: 'session.studio',
        value: undefined,
        seen: 'Sunset Sound',
      },
      {
        op: 'set',
        path: 'session.studioId',
        value: undefined,
        seen: 'sunset-sound',
      },
    ]);
    expect(bare).not.toHaveProperty('session');
  });

  it('creates the objects on the way', () => {
    expect(
      written({ id: 'x' }, [
        {
          op: 'set',
          path: 'session.labelId',
          value: 'motown',
          seen: undefined,
        },
      ]),
    ).toEqual({ id: 'x', session: { labelId: 'motown' } });
  });

  it('writes nothing when the value is there already, whatever was seen', () => {
    const result = applyOps(song, [
      { op: 'set', path: 'year', value: 1982, seen: 1979 },
    ]);
    expect(result).toMatchObject({ ok: true, changed: false, applied: [] });
    if (result.ok) expect(result.body).toBe(song);
  });

  it('conflicts only when the stored value is neither what was seen nor what is written', () => {
    expect(
      conflictsOf(song, [
        { op: 'set', path: 'title', value: 'Rosanna', seen: 'x' },
        { op: 'set', path: 'year', value: 1984, seen: 1983 },
      ]),
    ).toEqual([
      { index: 0, path: 'title', seen: 'x', now: 'Africa', mine: 'Rosanna' },
      { index: 1, path: 'year', seen: 1983, now: 1982, mine: 1984 },
    ]);
  });

  it('refuses a field under a value that is not an object', () => {
    const [refusal] = conflictsOf({ origin: 'toto' }, [
      {
        op: 'set',
        path: 'origin.artistGlobeId',
        value: 'toto',
        seen: undefined,
      },
    ]);
    expect(refusal.refused).toMatch(/cannot be written/);
  });

  it('throws for a path no single write can address', () => {
    expect(() =>
      applyOps(song, [
        { op: 'set', path: 'credits[0].name', value: 'x', seen: undefined },
      ]),
    ).toThrow(/Not a field path/);
    expect(() =>
      applyOps(song, [
        { op: 'set', path: '__proto__.x', value: 1, seen: undefined },
      ]),
    ).toThrow(/Not a field path/);
  });

  describe('a whole list', () => {
    it('merges into a list someone else changed since', () => {
      const artist = { slug: 'toto', genreIds: ['rock', 'pop', 'jazz'] };
      expect(
        written(artist, [
          {
            op: 'set',
            path: 'genreIds[]',
            value: ['rock', 'soft-rock'],
            seen: ['rock', 'pop'],
          },
        ]).genreIds,
      ).toEqual(['rock', 'jazz', 'soft-rock']);
    });

    it('conflicts where both changed the same entry differently', () => {
      const unlinked = { name: 'Quincy Jones', role: 'producer' };
      const credited = { ...unlinked, instrument: 'piano' };
      // They changed the entry the author took out: that is theirs to keep.
      expect(
        conflictsOf({ credits: [credited] }, [
          { op: 'set', path: 'credits', value: [], seen: [unlinked] },
        ]),
      ).toHaveLength(1);
      // The author changed it in place, and so did they.
      expect(
        conflictsOf({ credits: [credited] }, [
          { op: 'set', path: 'credits', value: [quincy], seen: [unlinked] },
        ]),
      ).toHaveLength(1);
      // Theirs is exactly the author's change: nothing to write.
      expect(
        applyOps({ credits: [quincy] }, [
          { op: 'set', path: 'credits', value: [quincy], seen: [unlinked] },
        ]),
      ).toMatchObject({ ok: true, changed: false });
    });

    it('changes an entry in place when it is still what was seen', () => {
      const unlinked = { name: 'Quincy Jones', role: 'producer' };
      const other = { name: 'Toto', role: 'performer' };
      expect(
        written({ credits: [unlinked, other] }, [
          { op: 'set', path: 'credits', value: [quincy], seen: [unlinked] },
        ]).credits,
      ).toEqual([quincy, other]);
    });
  });

  describe('and the unconfirmed mark', () => {
    const artist: Body = {
      slug: 'bill-withers',
      born: {
        date: '1938',
        placeId: 'slab-fork',
        unverified: true,
        source: 'wikidata',
      },
    };

    it('clears the mark of the object it corrects inside, keeping its source', () => {
      expect(
        written(artist, [
          { op: 'set', path: 'born.date', value: '1938-07-04', seen: '1938' },
        ]).born,
      ).toEqual({
        date: '1938-07-04',
        placeId: 'slab-fork',
        source: 'wikidata',
      });
    });

    it('writes an object set whole as given: the import’s mark and source go', () => {
      expect(
        written(artist, [
          {
            op: 'set',
            path: 'born',
            value: { date: '1938-07-04' },
            seen: artist.born,
          },
        ]).born,
      ).toEqual({ date: '1938-07-04' });
    });

    it('leaves the mark when the set is about the mark itself', () => {
      expect(
        written(artist, [
          {
            op: 'set',
            path: 'born.source',
            value: 'musicbrainz',
            seen: 'wikidata',
          },
        ]).born,
      ).toMatchObject({ unverified: true, source: 'musicbrainz' });
    });

    it('drops an object whose last fact is taken away', () => {
      const once = { slug: 'x', born: { date: '1938', unverified: true } };
      expect(
        written(once, [
          { op: 'set', path: 'born.date', value: undefined, seen: '1938' },
        ]),
      ).toEqual({ slug: 'x' });
    });

    it('never clears a record’s own mark: one field is not the record', () => {
      expect(
        written({ slug: 'x', unverified: true, name: 'X' }, [
          { op: 'set', path: 'name', value: 'Y', seen: 'X' },
        ]),
      ).toEqual({ slug: 'x', unverified: true, name: 'Y' });
    });
  });
});

describe('a value read by position (a pin’s [lat, lng])', () => {
  const city: Body = { id: 'testville', coordinates: [42.33, -83.05] };
  const seen = [42.33, -83.05];

  it('is written whole when it is still what was seen', () => {
    expect(
      written(city, [
        { op: 'set', path: 'coordinates', value: [42.33, -83.2], seen },
      ]).coordinates,
    ).toEqual([42.33, -83.2]);
  });

  it('conflicts when it moved since, never merging the two into a pin nobody set', () => {
    const moved = { ...city, coordinates: [42.4, -83.05] };
    // The author changed the longitude; someone else, the latitude.
    expect(
      conflictsOf(moved, [
        { op: 'set', path: 'coordinates', value: [42.33, -83.2], seen },
      ]),
    ).toEqual([
      {
        index: 0,
        path: 'coordinates',
        seen,
        now: [42.4, -83.05],
        mine: [42.33, -83.2],
      },
    ]);
    // A wholly new pin: not three numbers.
    expect(
      conflictsOf(moved, [
        { op: 'set', path: 'coordinates', value: [40.71, -74], seen },
      ]),
    ).toHaveLength(1);
    // Its numbers swapped: not taken for the same pin and dropped.
    expect(
      conflictsOf({ ...city, coordinates: [42.33, -83.06] }, [
        { op: 'set', path: 'coordinates', value: [-83.05, 42.33], seen },
      ]),
    ).toHaveLength(1);
  });

  it('writes nothing when it is there already, whoever put it there', () => {
    const result = applyOps({ ...city, coordinates: [42.33, -83.2] }, [
      { op: 'set', path: 'coordinates', value: [42.33, -83.2], seen },
    ]);
    expect(result).toMatchObject({ ok: true, changed: false });
  });

  it('is not undone over a pin someone moved since', () => {
    const undo = invertOps(city, [
      { op: 'set', path: 'coordinates', value: [42.33, -83.5], seen },
    ]);
    expect(undo).toEqual([
      {
        op: 'set',
        path: 'coordinates',
        value: [42.33, -83.05],
        seen: [42.33, -83.5],
      },
    ]);
    expect(
      conflictsOf({ ...city, coordinates: [42.6, -83.5] }, undo),
    ).toHaveLength(1);
    // Still what it wrote: put back.
    expect(
      written({ ...city, coordinates: [42.33, -83.5] }, undo).coordinates,
    ).toEqual([42.33, -83.05]);
  });

  it('is every tuple the body schemas have, and nothing else', () => {
    // Every field whose schema is a tuple, wherever it is in a body.
    const tuples = new Set<string>();
    const walk = (schema: z.ZodTypeAny, name: string, seen: Set<unknown>) => {
      if (seen.has(schema)) return;
      seen.add(schema);
      if (schema instanceof z.ZodTuple) {
        tuples.add(name);
        return;
      }
      if (
        schema instanceof z.ZodOptional ||
        schema instanceof z.ZodNullable ||
        schema instanceof z.ZodDefault
      )
        return walk(schema._def.innerType, name, seen);
      if (schema instanceof z.ZodEffects)
        return walk(schema._def.schema, name, seen);
      if (schema instanceof z.ZodLazy) return walk(schema.schema, name, seen);
      if (schema instanceof z.ZodArray) return walk(schema.element, name, seen);
      if (schema instanceof z.ZodRecord)
        return walk(schema.valueSchema, name, seen);
      if (
        schema instanceof z.ZodUnion ||
        schema instanceof z.ZodDiscriminatedUnion
      ) {
        for (const option of schema.options as z.ZodTypeAny[])
          walk(option, name, seen);
        return;
      }
      if (schema instanceof z.ZodIntersection) {
        walk(schema._def.left, name, seen);
        walk(schema._def.right, name, seen);
        return;
      }
      if (schema instanceof z.ZodObject)
        for (const [field, inner] of Object.entries(
          schema.shape as Record<string, z.ZodTypeAny>,
        ))
          walk(inner, field, seen);
    };
    for (const schema of [...Object.values(recordBodySchemas), songBodySchema])
      walk(schema, '', new Set());
    expect([...tuples].sort()).toEqual([...POSITIONAL_FIELDS].sort());
  });
});

describe('add and remove', () => {
  it('adds a bare id once, making the list when there is none', () => {
    const artist = { slug: 'toto', genreIds: ['rock'] };
    expect(
      written(artist, [{ op: 'add', path: 'genreIds[]', id: 'pop' }]).genreIds,
    ).toEqual(['rock', 'pop']);
    expect(
      applyOps(artist, [{ op: 'add', path: 'genreIds', id: 'rock' }]),
    ).toMatchObject({ ok: true, changed: false });
    expect(
      written({ slug: 'toto' }, [
        { op: 'add', path: 'labelIds', id: 'columbia' },
      ]),
    ).toEqual({ slug: 'toto', labelIds: ['columbia'] });
  });

  it('removes a bare id, and leaves the emptied list stated', () => {
    const artist = { slug: 'toto', genreIds: ['rock', 'pop'] };
    expect(
      written(artist, [{ op: 'remove', path: 'genreIds', id: 'pop' }]),
    ).toEqual({ slug: 'toto', genreIds: ['rock'] });
    expect(
      written({ genreIds: ['pop'] }, [
        { op: 'remove', path: 'genreIds', id: 'pop' },
      ]),
    ).toEqual({ genreIds: [] });
    expect(
      applyOps(artist, [{ op: 'remove', path: 'genreIds', id: 'jazz' }]),
    ).toMatchObject({ ok: true, changed: false });
    expect(
      applyOps({}, [{ op: 'remove', path: 'genreIds', id: 'jazz' }]),
    ).toMatchObject({ ok: true, changed: false });
  });

  it('commutes with someone else’s entry: never a conflict', () => {
    const now = { genreIds: ['rock', 'jazz'] };
    expect(
      written(now, [
        { op: 'add', path: 'genreIds', id: 'pop' },
        { op: 'remove', path: 'genreIds', id: 'rock' },
      ]).genreIds,
    ).toEqual(['jazz', 'pop']);
  });

  it('adds and removes an object entry by its key', () => {
    const group = { slug: 'toto', members: [{ artistId: 'jeff-porcaro' }] };
    expect(
      written(group, [
        { op: 'add', path: 'members[]', id: 'steve-lukather', key: 'artistId' },
      ]).members,
    ).toEqual([{ artistId: 'jeff-porcaro' }, { artistId: 'steve-lukather' }]);
    expect(
      written(group, [
        {
          op: 'add',
          path: 'members',
          id: 'david-paich',
          key: 'artistId',
          entry: { from: 1977 },
        },
      ]).members,
    ).toEqual([
      { artistId: 'jeff-porcaro' },
      { from: 1977, artistId: 'david-paich' },
    ]);
    expect(
      written(group, [
        { op: 'remove', path: 'members', id: 'jeff-porcaro', key: 'artistId' },
      ]).members,
    ).toEqual([]);
  });

  it('tells a person’s credits apart by role', () => {
    const song = { credits: [quincyWrote, quincy] };
    // The Producer column takes out the production credit, not the writing one.
    expect(
      written(song, [
        { op: 'remove', path: 'credits', id: 'producer|quincy-jones' },
      ]).credits,
    ).toEqual([quincyWrote]);
    // And adding him as a producer when he only wrote it is a new credit.
    expect(
      written({ credits: [quincyWrote] }, [
        {
          op: 'add',
          path: 'credits[]',
          id: 'producer|quincy-jones',
          entry: quincy,
        },
      ]).credits,
    ).toEqual([quincyWrote, quincy]);
  });

  it('links a credit that names the person rather than adding a second', () => {
    const named = { name: 'Quincy Jones', role: 'producer' };
    expect(
      written({ credits: [named] }, [
        {
          op: 'add',
          path: 'credits',
          id: 'producer|quincy-jones',
          entry: quincy,
        },
      ]).credits,
    ).toEqual([quincy]);
  });

  describe('and the unconfirmed mark', () => {
    const imported = { ...quincy, unverified: true, source: 'musicbrainz' };

    it('confirms an entry stated again as it is, keeping its source', () => {
      expect(
        written({ credits: [imported] }, [
          {
            op: 'add',
            path: 'credits',
            id: 'producer|quincy-jones',
            entry: quincy,
          },
        ]).credits,
      ).toEqual([{ ...quincy, source: 'musicbrainz' }]);
    });

    it('replaces an entry stated otherwise, the import’s mark and source gone', () => {
      expect(
        written({ credits: [imported] }, [
          {
            op: 'add',
            path: 'credits',
            id: 'producer|quincy-jones',
            entry: { ...quincy, instrument: 'trumpet' },
          },
        ]).credits,
      ).toEqual([{ ...quincy, instrument: 'trumpet' }]);
    });

    it('confirms a marked entry named by its key alone', () => {
      expect(
        written(
          {
            members: [
              { artistId: 'x', from: 1970, unverified: true, source: 'mb' },
            ],
          },
          [{ op: 'add', path: 'members', id: 'x', key: 'artistId' }],
        ).members,
      ).toEqual([{ artistId: 'x', from: 1970, source: 'mb' }]);
    });
  });

  it('refuses a path that holds something other than a list', () => {
    const [refusal] = conflictsOf({ genreIds: 'rock' }, [
      { op: 'add', path: 'genreIds', id: 'pop' },
    ]);
    expect(refusal).toMatchObject({ index: 0, now: 'rock' });
    expect(refusal.refused).toMatch(/not a list/);
  });
});

describe('link and unlink', () => {
  const song: Body = {
    id: 'africa',
    title: 'Africa',
    sections: [{ name: 'Verse' }],
  };
  const toSunset: CellOp = {
    op: 'link',
    spec: 'studio-song',
    choice: { as: 'one', id: 'sunset-sound', name: 'Sunset Sound' },
    seen: song,
  };

  it('writes the owner’s field through its link, the text following', () => {
    expect(written(song, [toSunset])).toEqual({
      ...song,
      session: { studioId: 'sunset-sound', studio: 'Sunset Sound' },
    });
  });

  it('refuses when a path it rests on changed since it was seen', () => {
    const moved = { ...song, session: { studioId: 'record-plant' } };
    expect(conflictsOf(moved, [toSunset])).toEqual([
      {
        index: 0,
        path: 'session.studioId',
        seen: undefined,
        now: 'record-plant',
        mine: 'sunset-sound',
      },
    ]);
  });

  it('writes nothing for a link that is there already', () => {
    const linked = written(song, [toSunset]);
    expect(
      applyOps(linked, [{ ...toSunset, seen: linked } as CellOp]),
    ).toMatchObject({ ok: true, changed: false });
  });

  it('unlinks, and takes the text with it while it is the record’s name', () => {
    const linked = written(song, [toSunset]);
    expect(
      written(linked, [
        {
          op: 'unlink',
          spec: 'studio-song',
          id: 'sunset-sound',
          how: { name: 'Sunset Sound' },
          seen: linked,
        },
      ]),
    ).toEqual(song);
  });

  it('refuses an unlink only the dialog can make', () => {
    const event = { id: 'evt-live-aid', title: 'Live Aid' };
    const [refusal] = conflictsOf(event, [
      {
        op: 'unlink',
        spec: 'artist-event',
        id: 'queen',
        seen: event,
      },
    ]);
    expect(refusal.refused).toMatch(/stores no artistIds yet/);
  });
});

describe('confirm', () => {
  const artist: Body = {
    slug: 'bill-withers',
    unverified: true,
    source: 'musicbrainz',
    born: { date: '1938', unverified: true, source: 'wikidata' },
    members: [
      { artistId: 'a', unverified: true, source: 'mb' },
      { artistId: 'b', unverified: true },
    ],
    activeFrom: 1970,
  };

  it('takes the mark off and keeps the source, wherever the mark is', () => {
    expect(written(artist, [{ op: 'confirm', path: '' }])).toMatchObject({
      source: 'musicbrainz',
    });
    expect(written(artist, [{ op: 'confirm', path: '' }])).not.toHaveProperty(
      'unverified',
    );
    expect(
      written(artist, [{ op: 'confirm', path: 'born.date' }]).born,
    ).toEqual({ date: '1938', source: 'wikidata' });
    expect(
      written(artist, [{ op: 'confirm', path: 'members[]', id: 'a' }]).members,
    ).toEqual([
      { artistId: 'a', source: 'mb' },
      { artistId: 'b', unverified: true },
    ]);
    expect(
      written(artist, [{ op: 'confirm', path: 'members' }]).members,
    ).toEqual([{ artistId: 'a', source: 'mb' }, { artistId: 'b' }]);
  });

  it('writes nothing for a value the body cannot mark: its decision is reviewed instead', () => {
    const result = applyOps(artist, [{ op: 'confirm', path: 'activeFrom' }]);
    expect(result).toMatchObject({ ok: true, changed: false });
  });

  it('refuses when the value confirmed is no longer the one seen', () => {
    expect(
      conflictsOf(artist, [
        { op: 'confirm', path: 'born', seen: { date: '1939' } },
      ]),
    ).toHaveLength(1);
    // Its mark is not what was seen: only its facts are compared.
    expect(
      written(artist, [
        {
          op: 'confirm',
          path: 'born',
          seen: { date: '1938', unverified: true },
        },
      ]).born,
    ).toEqual({ date: '1938', source: 'wikidata' });
  });
});

describe('a batch', () => {
  it('lays each op onto what the ones before it left', () => {
    const result = applyOps({ year: 1982 }, [
      { op: 'set', path: 'year', value: 1983, seen: 1982 },
      { op: 'set', path: 'year', value: 1984, seen: 1983 },
      { op: 'set', path: 'year', value: 1984, seen: 1983 },
    ]);
    expect(result).toMatchObject({ ok: true, body: { year: 1984 } });
    // The third changed nothing, so it is not among what was applied.
    if (result.ok) expect(result.applied).toHaveLength(2);
  });

  it('never mutates the body it is handed', () => {
    const body = { year: 1982, genreIds: ['rock'], born: { date: '1938' } };
    const copy = structuredClone(body);
    applyOps(body, [
      { op: 'set', path: 'year', value: 1, seen: 1982 },
      { op: 'add', path: 'genreIds', id: 'pop' },
      { op: 'set', path: 'born.date', value: '1939', seen: '1938' },
    ]);
    expect(body).toEqual(copy);
  });
});

describe('undo', () => {
  it('puts every kind of op back exactly', () => {
    const artist: Body = {
      slug: 'toto',
      name: 'Toto',
      genreIds: ['rock'],
      born: { date: '1977', unverified: true, source: 'wikidata' },
      members: [{ artistId: 'a', unverified: true, source: 'mb' }],
      unverified: true,
    };
    roundTrip(artist, [
      { op: 'set', path: 'name', value: 'TOTO', seen: 'Toto' },
    ]);
    roundTrip(artist, [{ op: 'add', path: 'genreIds', id: 'pop' }]);
    roundTrip(artist, [{ op: 'remove', path: 'genreIds', id: 'rock' }]);
    roundTrip(artist, [{ op: 'add', path: 'labelIds', id: 'columbia' }]);
    roundTrip(artist, [{ op: 'confirm', path: '' }]);
    roundTrip(artist, [{ op: 'confirm', path: 'members', id: 'a' }]);
    // The correction cleared born's mark; the undo brings mark and source back.
    const { undo } = roundTrip(artist, [
      { op: 'set', path: 'born.date', value: '1978', seen: '1977' },
    ]);
    expect(undo).toEqual([
      {
        op: 'set',
        path: 'born',
        value: artist.born,
        seen: { date: '1978', source: 'wikidata' },
      },
    ]);
    // An object the op dropped comes back whole.
    roundTrip({ session: { studioId: 's', source: 'mb' } }, [
      { op: 'set', path: 'session.studioId', value: undefined, seen: 's' },
    ]);
  });

  it('puts back a link and an unlink', () => {
    const song: Body = { id: 'africa', session: { studio: 'Sunset Sound' } };
    const { after } = roundTrip(song, [
      {
        op: 'link',
        spec: 'studio-song',
        choice: { as: 'one', id: 'sunset-sound', name: 'Sunset Sound' },
        seen: song,
      },
    ]);
    roundTrip(after, [
      {
        op: 'unlink',
        spec: 'studio-song',
        id: 'sunset-sound',
        how: { name: 'Sunset Sound' },
        seen: after,
      },
    ]);
  });

  it('takes out only what was added when the list changed since', () => {
    const before = { genreIds: ['rock'] };
    const undo = invertOps(before, [
      { op: 'add', path: 'genreIds', id: 'pop' },
    ]);
    // Someone added jazz after the edit: the undo keeps it.
    expect(written({ genreIds: ['rock', 'pop', 'jazz'] }, undo)).toEqual({
      genreIds: ['rock', 'jazz'],
    });
    // A list the edit created goes again while it is still just that.
    const created = invertOps({}, [{ op: 'add', path: 'genreIds', id: 'pop' }]);
    expect(written({ genreIds: ['pop'] }, created)).toEqual({});
  });

  it('is refused when the value changed since it was written', () => {
    const undo = invertOps({ year: 1982 }, [
      { op: 'set', path: 'year', value: 1983, seen: 1982 },
    ]);
    expect(conflictsOf({ year: 1990 }, undo)).toEqual([
      { index: 0, path: 'year', seen: 1983, now: 1990, mine: 1982 },
    ]);
  });

  it('has nothing to undo for ops that changed nothing', () => {
    expect(
      invertOps({ year: 1982 }, [
        { op: 'set', path: 'year', value: 1982, seen: 1982 },
      ]),
    ).toEqual([]);
    expect(restoreOps({ a: 1 }, { a: 1 })).toEqual([]);
  });
});

describe('composing a pending batch with the edits since', () => {
  /** The composed batch writes what the two would, one after the other. */
  const same = (body: Body, first: CellOp[], then: CellOp[]) =>
    expect(written(body, composeOps(first, then))).toEqual(
      written(written(body, first), then),
    );

  it('sets a value once, from what was first seen', () => {
    const composed = composeOps(
      [{ op: 'set', path: 'year', value: 1983, seen: 1982 }],
      [{ op: 'set', path: 'year', value: 1984, seen: 1983 }],
    );
    expect(composed).toEqual([
      { op: 'set', path: 'year', value: 1984, seen: 1982 },
    ]);
    same(
      { year: 1982 },
      [{ op: 'set', path: 'year', value: 1983, seen: 1982 }],
      [{ op: 'set', path: 'year', value: 1984, seen: 1983 }],
    );
  });

  it('drops a value set back to where it started', () => {
    expect(
      composeOps(
        [{ op: 'set', path: 'year', value: 1983, seen: 1982 }],
        [{ op: 'set', path: 'year', value: 1982, seen: 1983 }],
      ),
    ).toEqual([]);
  });

  it('folds an add and a remove of one entry into the last', () => {
    const add: CellOp = { op: 'add', path: 'genreIds', id: 'pop' };
    const remove: CellOp = { op: 'remove', path: 'genreIds[]', id: 'pop' };
    expect(composeOps([add], [remove])).toEqual([remove]);
    expect(composeOps([remove], [add])).toEqual([add]);
    expect(composeOps([add], [add])).toEqual([add]);
    same({ genreIds: ['rock'] }, [add], [remove]);
    same({ genreIds: ['rock', 'pop'] }, [remove], [add]);
    // A list that was not there stays not there, rather than empty.
    expect(written({}, composeOps([add], [remove]))).toEqual({});
  });

  it('keeps an object entry taken out and put back as two ops', () => {
    const remove: CellOp = {
      op: 'remove',
      path: 'members',
      id: 'a',
      key: 'artistId',
    };
    const add: CellOp = {
      op: 'add',
      path: 'members',
      id: 'a',
      key: 'artistId',
    };
    expect(composeOps([remove], [add])).toEqual([remove, add]);
  });

  it('never folds across an op that touches the same thing', () => {
    const first: CellOp = {
      op: 'set',
      path: 'born.date',
      value: '1',
      seen: '0',
    };
    const between: CellOp = {
      op: 'set',
      path: 'born',
      value: { date: '5' },
      seen: { date: '1' },
    };
    const then: CellOp = {
      op: 'set',
      path: 'born.date',
      value: '2',
      seen: '5',
    };
    expect(composeOps([first, between], [then])).toEqual([
      first,
      between,
      then,
    ]);
    // A link may reach any field of its owner.
    const link: CellOp = {
      op: 'link',
      spec: 'label-record',
      choice: { as: 'one', id: 'motown' },
      seen: {},
    };
    const year: CellOp = { op: 'set', path: 'year', value: 2, seen: 1 };
    expect(
      composeOps(
        [year, link],
        [{ op: 'set', path: 'year', value: 3, seen: 2 }],
      ),
    ).toHaveLength(3);
    // Fields apart from each other fold past one another.
    const title: CellOp = { op: 'set', path: 'title', value: 'b', seen: 'a' };
    expect(
      composeOps(
        [year, title],
        [{ op: 'set', path: 'year', value: 3, seen: 2 }],
      ),
    ).toEqual([{ op: 'set', path: 'year', value: 3, seen: 1 }, title]);
  });
});

describe('use mine', () => {
  it('rests each op on what is there now, so it writes over the other change', () => {
    const now = { year: 1990, session: { studioId: 'record-plant' } };
    const ops: CellOp[] = [
      { op: 'set', path: 'year', value: 1983, seen: 1982 },
      { op: 'set', path: 'year', value: 1984, seen: 1983 },
      {
        op: 'link',
        spec: 'studio-song',
        choice: { as: 'one', id: 'sunset-sound' },
        seen: {},
      },
      { op: 'confirm', path: 'born', seen: { date: '1' } },
    ];
    expect(applyOps(now, ops).ok).toBe(false);
    const mine = useMine(now, ops);
    expect(mine[0]).toMatchObject({ seen: 1990 });
    // The second rests on what the first wrote.
    expect(mine[1]).toMatchObject({ seen: 1983 });
    expect(mine[3]).not.toHaveProperty('seen');
    expect(written(now, mine)).toEqual({
      year: 1984,
      session: { studioId: 'sunset-sound' },
    });
  });
});
