import { describe, expect, it } from 'vitest';
import {
  assembleGraph,
  edgesForArtist,
  edgesForLabel,
} from '@/content/graph/deriveGraph';
import type { EntityId, GraphNode } from '@/content/graph/types';
import type { ArtistRecord, LabelRecord } from '@/content/records/types';
import { fixtureGraph } from '../../__tests__/tableFixtures';
import { TABLES, tableDef } from '../../model/categories';
import type { SchemaStep } from '../../model/types';
import {
  alreadyLinked,
  applyLink,
  applyRestore,
  applyUnlink,
  changedSince,
  editPathOf,
  genreTagField,
  guessedAgain,
  guessesFor,
  inverse,
  isOneWordName,
  LINKS,
  type LinkSpec,
  linkFor,
  linkRefusal,
  linksForPart,
  placeAndGenreNames,
  songArtistDefault,
  songArtistWays,
  targetNode,
  unlinkEscalates,
  unlinkedCreditFor,
  unsetPath,
  waitingLinkFor,
  waitsFor,
  WAITING_LINKS,
} from '../links';

/**
 * Link… and Unlink as data: which item and field each derived column
 * writes, what the field becomes either way, what undoes it and what is
 * refused — the dialog's and the cells' answers, without either.
 */

const spec = (table: string, column: string) => {
  const found = linkFor(table as never, column);
  if (!found) throw new Error(`no link for ${table}.${column}`);
  return found;
};

/**
 * The body level each schema step is, in the words the row panel uses for
 * it (`SCHEMA_STEP`): a link waits for exactly what its column does.
 */
const STEP_NEEDS: Partial<Record<SchemaStep, { level: number; what: string }>> =
  {
    'song-v2': { level: 2, what: 'song schema v2' },
    'event-v2': { level: 2, what: 'the event body v2' },
  };

describe('the links the Table offers', () => {
  it('has a link on every one-step owner column, writing the part the owner states', () => {
    let owned = 0;
    let waitingOn = 0;
    for (const def of Object.values(TABLES)) {
      for (const column of def.columns) {
        const { edit, source } = column;
        if (edit.by !== 'owner' || source.type !== 'connections') continue;
        const oneStep = source.parts.some(
          (p) =>
            (p.role === 'fact' || p.role === 'stated') && p.hops.length === 1,
        );
        if (!oneStep) continue;
        owned += 1;
        const at = `${def.id}.${column.id}`;
        const link = linkFor(def.id, column.id);
        const waiting = waitingLinkFor(def.id, column.id);
        expect(
          link ?? waiting,
          `${at} is owned by ${edit.kind}.${edit.path}, and nothing links it: add a spec to LINKS, or a WaitingLink that says why not yet`,
        ).toBeDefined();
        // Its part is a one-step fact the owner states.
        const partId = link?.part ?? waiting?.part;
        const part = source.parts.find((p) => p.id === partId);
        expect(part?.role, `${at} part ${partId}`).toMatch(/^(fact|stated)$/);
        expect(part?.hops, `${at} part ${partId}`).toHaveLength(1);
        if (!link) {
          waitingOn += 1;
          continue;
        }
        // It writes the owner and the field the column names.
        expect(edit, at).toMatchObject({
          kind: link.owner.kind,
          path: editPathOf(link),
        });
        // And waits for the body level the column waits for, no more.
        expect(link.needs, `${at} needs`).toEqual(
          edit.since ? STEP_NEEDS[edit.since] : undefined,
        );
      }
    }
    // One owner column per link, and the other way round (the song's
    // Label, which `picks`, is the row's own column).
    expect(owned).toBe(LINKS.filter((l) => !l.picks).length + waitingOn);
    expect(owned).toBeGreaterThanOrEqual(19);
  });

  it('puts each link on an owner column of its own', () => {
    const seen = new Set<string>();
    for (const link of LINKS) {
      const at = `${link.table}.${link.column}`;
      expect(seen.has(at), `${at} twice`).toBe(false);
      seen.add(at);
      const column = tableDef(link.table).columns.find(
        (c) => c.id === link.column,
      );
      expect(column, at).toBeDefined();
      // The song's Label is its own field until it is on a record, whose
      // label it then is.
      if (link.picks) {
        expect(column!.edit).toMatchObject({ by: 'row' });
        continue;
      }
      expect(column!.edit.by, `${at} is not an owner column`).toBe('owner');
    }
  });

  it('knows each shape’s fields: a key for refs, the text that follows a one', () => {
    for (const link of LINKS) {
      if (link.shape === 'refs') expect(link.key, link.id).toBeTruthy();
      else expect(link.key, link.id).toBeUndefined();
      if (link.text) expect(link.shape, link.id).toBe('one');
      if (link.moves) expect(link.shape, link.id).toBe('one');
      if (link.acyclic) expect(link.owner.node, link.id).toBe(link.target);
    }
    expect(editPathOf(spec('artists', 'memberOf'))).toBe('members[].artistId');
    expect(editPathOf(spec('records', 'songs'))).toBe('releases[]');
    expect(editPathOf(spec('locations', 'songs'))).toBe('session.placeId');
    expect(editPathOf(spec('genres', 'songs'))).toBe('genreTags[]');
  });

  it('has none for a column the row states itself', () => {
    expect(linkFor('artists', 'born')).toBeUndefined();
    expect(linkFor('artists', 'genres')).toBeUndefined();
  });

  it('says why a genre’s subgenres are not linked yet, and never unlinked', () => {
    expect(linkFor('genres', 'subgenres')).toBeUndefined();
    const waiting = waitingLinkFor('genres', 'subgenres');
    expect(waiting).toMatchObject({ id: 'genre-subgenre', owner: 'subgenre' });
    expect(waiting?.waiting).toMatch(/subgenres\.json/);
    expect(waiting?.noUnlink).toMatch(/needs a parent/);
    expect(WAITING_LINKS).toHaveLength(1);
    // It names the column's own one-step part, as a link would.
    for (const link of WAITING_LINKS) {
      const source = tableDef(link.table).columns.find(
        (c) => c.id === link.column,
      )?.source;
      const part =
        source?.type === 'connections'
          ? source.parts.find((p) => p.id === link.part)
          : undefined;
      expect(part?.role, link.id).toBe('fact');
      expect(part?.hops, link.id).toHaveLength(1);
    }
  });

  it('finds the link that writes a part, and none for a part stated elsewhere', () => {
    expect(
      linksForPart('locations', 'artists', 'based').map((l) => l.id),
    ).toEqual(['place-artist']);
    // Birthplaces and song pins are the artist's born and the pin table's.
    expect(linksForPart('locations', 'artists', 'born')).toEqual([]);
    expect(linksForPart('locations', 'artists', 'pins')).toEqual([]);
    expect(linksForPart('songs', 'events', 'arcs')).toEqual([]);
    expect(linksForPart('genres', 'artists', 'songs')).toEqual([]);
    expect(
      linksForPart('genres', 'artists', 'stated').map((l) => l.id),
    ).toEqual(['genre-artist']);
  });
});

describe('what the field becomes: a link', () => {
  const event = {
    id: 'evt-live-aid',
    title: 'Live Aid',
    tags: ['toto', 'queen'],
  };

  it('writes an id list whole, and never touches the rest of the body', () => {
    const next = applyLink(spec('artists', 'events'), event, {
      as: 'ids',
      ids: ['queen', 'toto', 'toto'],
    });
    expect(next).toStrictEqual({ ...event, artistIds: ['queen', 'toto'] });
    expect(event).not.toHaveProperty('artistIds');
  });

  it('writes one id, and the text that follows it only while it is the record’s own (C20)', () => {
    const studio = spec('studios', 'songs');
    expect(
      applyLink(
        studio,
        { id: 'africa' },
        { as: 'one', id: 'sunset-sound', name: 'Sunset Sound' },
      ),
    ).toStrictEqual({
      id: 'africa',
      session: { studioId: 'sunset-sound', studio: 'Sunset Sound' },
    });
    // Text of its own stays.
    expect(
      applyLink(
        studio,
        { id: 'africa', session: { studio: 'Studio 55', city: 'LA' } },
        { as: 'one', id: 'sunset-sound', name: 'Sunset Sound' },
      ),
    ).toStrictEqual({
      id: 'africa',
      session: { studio: 'Studio 55', city: 'LA', studioId: 'sunset-sound' },
    });
    // The last record's name follows the new record.
    expect(
      applyLink(
        studio,
        { id: 'x', session: { studio: 'Old Room', studioId: 'old-room' } },
        {
          as: 'one',
          id: 'new-room',
          name: 'New Room',
          previousName: 'Old Room',
        },
      ),
    ).toStrictEqual({
      id: 'x',
      session: { studio: 'New Room', studioId: 'new-room' },
    });
    // A song's recording city and label follow the same way.
    expect(
      applyLink(
        spec('locations', 'songs'),
        { id: 'x' },
        { as: 'one', id: 'los-angeles', name: 'Los Angeles' },
      ),
    ).toStrictEqual({
      id: 'x',
      session: { placeId: 'los-angeles', city: 'Los Angeles' },
    });
    expect(
      applyLink(
        spec('labels', 'songs'),
        { id: 'x', session: { label: 'Tamla Records' } },
        { as: 'one', id: 'tamla', name: 'Tamla' },
      ),
    ).toStrictEqual({
      id: 'x',
      session: { label: 'Tamla Records', labelId: 'tamla' },
    });
  });

  it('names a song’s artist as its lead act, or by a credit — linking one that names them', () => {
    const link = spec('artists', 'songs');
    const song = {
      id: 'africa',
      artist: 'Toto',
      credits: [
        { name: 'David Paich', role: 'songwriter' },
        { name: 'TOTO', role: 'producer' },
      ],
    };
    expect(applyLink(link, song, { as: 'lead', id: 'toto' })).toStrictEqual({
      ...song,
      origin: { artistGlobeId: 'toto' },
    });
    expect(
      applyLink(link, song, {
        as: 'credit',
        id: 'toto',
        name: 'Toto',
        credit: { role: 'producer', index: 1 },
      }).credits,
    ).toStrictEqual([
      { name: 'David Paich', role: 'songwriter' },
      { name: 'TOTO', role: 'producer', artistGlobeId: 'toto' },
    ]);
    expect(
      applyLink(link, song, {
        as: 'credit',
        id: 'jeff-porcaro',
        name: 'Jeff Porcaro',
        credit: { role: 'performer' },
      }).credits,
    ).toHaveLength(3);

    // The billing line says lead act; else the credit by that name.
    expect(songArtistDefault(song, ['Toto', 'TOTO'])).toEqual({ as: 'lead' });
    expect(
      songArtistDefault({ ...song, artist: 'Someone' }, ['Toto', 'TOTO']),
    ).toEqual({ as: 'credit', credit: { role: 'producer', index: 1 } });
    expect(unlinkedCreditFor(song, ['David Paich'])).toBe(0);
    expect(unlinkedCreditFor(song, ['Nobody'])).toBeUndefined();
  });

  it('adds a record to a song once', () => {
    const link = spec('records', 'songs');
    const song = {
      id: 'africa',
      releases: [{ releaseId: 'toto-iv', track: 10 }],
    };
    expect(
      applyLink(link, song, { as: 'release', id: 'toto-toto-past-to-present' })
        .releases,
    ).toEqual([
      { releaseId: 'toto-iv', track: 10 },
      { releaseId: 'toto-toto-past-to-present' },
    ]);
    expect(applyLink(link, song, { as: 'release', id: 'toto-iv' })).toEqual(
      song,
    );
    expect(alreadyLinked(link, song, 'toto-iv')).toBe(true);
  });

  it('adds a bare entry to a ref list once, the others as they were', () => {
    const link = spec('artists', 'memberOf');
    const group = {
      slug: 'toto',
      name: 'Toto',
      members: [{ artistId: 'jeff-porcaro', instrumentIds: ['drum-kit'] }],
    };
    const next = applyLink(link, group, { as: 'ref', id: 'david-paich' });
    expect(next.members).toEqual([
      { artistId: 'jeff-porcaro', instrumentIds: ['drum-kit'] },
      { artistId: 'david-paich' },
    ]);
    expect(applyLink(link, group, { as: 'ref', id: 'jeff-porcaro' })).toEqual(
      group,
    );
    expect(alreadyLinked(link, group, 'jeff-porcaro')).toBe(true);
    // An artist with no influences yet gets the list.
    expect(
      applyLink(
        spec('artists', 'influenced'),
        { slug: 'toto', name: 'Toto' },
        { as: 'ref', id: 'steely-dan' },
      ).influencedBy,
    ).toEqual([{ artistId: 'steely-dan' }]);
  });

  it('tags a song with a taught genre, or files it under a subgenre', () => {
    const link = spec('genres', 'songs');
    const song = { id: 'africa', genreTags: ['pop'] };
    expect(
      applyLink(link, song, { as: 'genre', id: 'rock', level: 'genre' }),
    ).toEqual({ id: 'africa', genreTags: ['pop', 'rock'] });
    expect(
      applyLink(link, song, {
        as: 'genre',
        id: 'soft-rock',
        level: 'subgenre',
      }),
    ).toEqual({ ...song, subgenreIds: ['soft-rock'] });
    expect(alreadyLinked(link, song, 'pop')).toBe(true);
    expect(alreadyLinked(link, song, 'pop', 'subgenre')).toBe(false);
    // A genre no tag spells writes nothing (and is refused, below).
    expect(genreTagField('genre', 'classical')).toBeNull();
    expect(
      applyLink(link, song, { as: 'genre', id: 'classical', level: 'genre' }),
    ).toEqual(song);
  });

  it('says when the row is linked already, and an absent list is not', () => {
    const events = spec('artists', 'events');
    expect(alreadyLinked(events, event, 'toto')).toBe(false);
    expect(
      alreadyLinked(events, { ...event, artistIds: ['toto'] }, 'toto'),
    ).toBe(true);
    expect(
      alreadyLinked(spec('labels', 'records'), { labelId: 'tamla' }, 'tamla'),
    ).toBe(true);
  });

  it('names what changed under the dialog, and nothing else', () => {
    const link = spec('artists', 'songs');
    const seen = { id: 'a', title: 'A', credits: [] };
    expect(changedSince(link, seen, { ...seen, title: 'B' })).toEqual([]);
    expect(
      changedSince(link, seen, { ...seen, origin: { artistGlobeId: 'x' } }),
    ).toEqual(['origin.artistGlobeId']);
    expect(
      changedSince(link, seen, {
        ...seen,
        credits: [{ name: 'X', role: 'vocals' }],
      }),
    ).toEqual(['credits']);
    // A song's genres rest on both its tags and its subgenres.
    expect(
      changedSince(spec('genres', 'songs'), seen, {
        ...seen,
        subgenreIds: ['soft-rock'],
      }),
    ).toEqual(['subgenreIds']);
  });
});

describe('what the field becomes: an unlink', () => {
  it('takes an id out of a stored list, down to an empty one', () => {
    const link = spec('artists', 'events');
    const event = { id: 'evt-x', artistIds: ['toto', 'queen'] };
    expect(applyUnlink(link, event, 'toto')).toStrictEqual({
      id: 'evt-x',
      artistIds: ['queen'],
    });
    // `[]` is "reviewed: none", not "inferred".
    expect(
      applyUnlink(link, { id: 'evt-x', artistIds: ['toto'] }, 'toto'),
    ).toStrictEqual({ id: 'evt-x', artistIds: [] });
    // Not there: the body as it was.
    expect(applyUnlink(link, event, 'abba')).toStrictEqual(event);
    expect(event.artistIds).toEqual(['toto', 'queen']);
    // A progression with no list names no one.
    expect(
      applyUnlink(spec('songs', 'progression'), { id: 1 }, 'africa'),
    ).toStrictEqual({ id: 1 });
    // The same for a label's artists and a genre's, on the artist.
    expect(
      applyUnlink(
        spec('labels', 'artists'),
        { slug: 'x', labelIds: ['motown', 'tamla'] },
        'tamla',
      ).labelIds,
    ).toEqual(['motown']);
    expect(
      applyUnlink(
        spec('genres', 'artists'),
        { slug: 'x', genreIds: ['rock', 'soft-rock'] },
        'soft-rock',
      ).genreIds,
    ).toEqual(['rock']);
  });

  it('will not unlink a guess from an event that stores nothing, unless told which guesses stay', () => {
    const link = spec('artists', 'events');
    const event = { id: 'evt-x', title: 'Toto and Queen live' };
    expect(unlinkEscalates(link, event)).toBe(true);
    expect(unlinkEscalates(link, { ...event, artistIds: [] })).toBe(false);
    expect(unlinkEscalates(spec('songs', 'progression'), { id: 1 })).toBe(
      false,
    );
    expect(() => applyUnlink(link, event, 'toto')).toThrow(
      /stores no artistIds yet/,
    );
    expect(
      applyUnlink(link, event, 'toto', { keep: ['queen', 'toto', 'queen'] }),
    ).toStrictEqual({ ...event, artistIds: ['queen'] });
  });

  it('clears one id, and the text with it while it is still the record’s name (C20)', () => {
    const studio = spec('studios', 'songs');
    // The text the link filled goes, and the session it made.
    expect(
      applyUnlink(
        studio,
        {
          id: 'africa',
          session: { studioId: 'sunset-sound', studio: 'Sunset Sound' },
        },
        'sunset-sound',
        { name: 'Sunset Sound' },
      ),
    ).toStrictEqual({ id: 'africa' });
    // Text of the song's own stays: the page shows it.
    expect(
      applyUnlink(
        studio,
        {
          id: 'africa',
          session: {
            studioId: 'sunset-sound',
            studio: 'Sunset Sound Recorders',
            city: 'LA',
          },
        },
        'sunset-sound',
        { name: 'Sunset Sound' },
      ),
    ).toStrictEqual({
      id: 'africa',
      session: { studio: 'Sunset Sound Recorders', city: 'LA' },
    });
    // Another studio's link is not this row's to clear.
    const other = { id: 'x', session: { studioId: 'abbey-road' } };
    expect(applyUnlink(studio, other, 'sunset-sound')).toStrictEqual(other);
  });

  it('clears a song’s recording city and session label the same way', () => {
    expect(
      applyUnlink(
        spec('locations', 'songs'),
        {
          id: 'x',
          session: {
            placeId: 'los-angeles',
            city: 'Los Angeles',
            studio: 'Sunset Sound',
          },
        },
        'los-angeles',
        { name: 'Los Angeles' },
      ),
    ).toStrictEqual({ id: 'x', session: { studio: 'Sunset Sound' } });
    expect(
      applyUnlink(
        spec('labels', 'songs'),
        { id: 'x', session: { labelId: 'tamla', label: 'Tamla' } },
        'tamla',
        { name: 'Tamla' },
      ),
    ).toStrictEqual({ id: 'x' });
  });

  it('clears a one with no text: a record’s label, a place, an imprint’s parent', () => {
    expect(
      applyUnlink(
        spec('labels', 'records'),
        { slug: 'r', title: 'R', labelId: 'tamla' },
        'tamla',
      ),
    ).toStrictEqual({ slug: 'r', title: 'R' });
    // The song's Label on its record: the picked label is what goes.
    expect(
      applyUnlink(
        spec('songs', 'label'),
        { slug: 'r', labelId: 'motown' },
        'motown',
      ),
    ).toStrictEqual({ slug: 'r' });
    expect(
      applyUnlink(
        spec('locations', 'artists'),
        { slug: 'toto', basedInPlaceId: 'los-angeles' },
        'los-angeles',
      ),
    ).toStrictEqual({ slug: 'toto' });
    expect(
      applyUnlink(
        spec('labels', 'imprints'),
        { slug: 'tamla', parentLabelId: 'motown' },
        'motown',
      ),
    ).toStrictEqual({ slug: 'tamla' });
  });

  it('takes a song’s artist out every way it names them, or only the ways chosen', () => {
    const link = spec('artists', 'songs');
    const song = {
      id: 'africa',
      artist: 'Toto',
      origin: { artistGlobeId: 'toto', lat: 1 },
      credits: [
        { name: 'David Paich', role: 'songwriter', artistGlobeId: 'paich' },
        { name: 'Toto', role: 'producer', artistGlobeId: 'toto' },
        { name: 'Toto', role: 'performer', artistGlobeId: 'toto' },
      ],
    };
    expect(songArtistWays(song, 'toto')).toEqual({
      lead: true,
      credits: [1, 2],
    });
    // Every way: the lead act and both credits.
    expect(applyUnlink(link, song, 'toto')).toStrictEqual({
      ...song,
      origin: { lat: 1 },
      credits: [song.credits[0]],
    });
    // Only the lead act.
    expect(
      applyUnlink(link, song, 'toto', { lead: true, credits: [] }),
    ).toStrictEqual({ ...song, origin: { lat: 1 } });
    // Only one credit; an index that no longer names them is passed over.
    expect(
      applyUnlink(link, song, 'toto', { lead: false, credits: [2, 0] }),
    ).toStrictEqual({ ...song, credits: song.credits.slice(0, 2) });
    // An origin that held only the lead act goes with it.
    expect(
      applyUnlink(link, { id: 'x', origin: { artistGlobeId: 'toto' } }, 'toto'),
    ).toStrictEqual({ id: 'x' });
  });

  it('drops a song’s record, and a group’s member, whole', () => {
    expect(
      applyUnlink(
        spec('records', 'songs'),
        {
          id: 'africa',
          releases: [
            { releaseId: 'toto-iv', track: 10 },
            { releaseId: 'toto-past-to-present', track: 3 },
          ],
        },
        'toto-iv',
      ).releases,
    ).toEqual([{ releaseId: 'toto-past-to-present', track: 3 }]);
    const group = {
      slug: 'toto',
      members: [
        { artistId: 'jeff-porcaro', instrumentIds: ['drum-kit'], from: 1977 },
        { artistId: 'david-paich' },
      ],
    };
    expect(
      applyUnlink(spec('artists', 'memberOf'), group, 'jeff-porcaro'),
    ).toStrictEqual({ slug: 'toto', members: [{ artistId: 'david-paich' }] });
    expect(
      applyUnlink(spec('artists', 'memberOf'), group, 'nobody'),
    ).toStrictEqual(group);
    expect(
      applyUnlink(
        spec('artists', 'influenced'),
        { slug: 'x', influencedBy: [{ artistId: 'toto', unverified: true }] },
        'toto',
      ),
    ).toStrictEqual({ slug: 'x', influencedBy: [] });
  });

  it('untags a song at the row’s level', () => {
    const link = spec('genres', 'songs');
    const song = {
      id: 'x',
      genreTags: ['rock', 'pop'],
      subgenreIds: ['soft-rock'],
    };
    expect(applyUnlink(link, song, 'rock')).toStrictEqual({
      ...song,
      genreTags: ['pop'],
    });
    expect(
      applyUnlink(link, song, 'soft-rock', { level: 'subgenre' }),
    ).toStrictEqual({ ...song, subgenreIds: [] });
    // `soft-rock` is no taught tag.
    expect(applyUnlink(link, song, 'soft-rock')).toStrictEqual(song);
  });

  it('says when a text will guess the row again once it is unlinked', () => {
    // The billing line still says Toto: the map guesses the lead act again.
    const lead = spec('artists', 'songs');
    expect(guessedAgain(lead, { artist: 'TOTO', credits: [] }, ['Toto'])).toBe(
      'artist',
    );
    expect(
      guessedAgain(lead, { artist: 'Toto', origin: { artistGlobeId: 'x' } }, [
        'Toto',
      ]),
    ).toBeNull();
    // An event is placed by its city while it stores no place.
    expect(
      guessedAgain(
        spec('locations', 'events'),
        { location: { city: 'Los Angeles' } },
        ['Los Angeles'],
      ),
    ).toBe('location.city');
    // A text of the song's own that still folds to the record's name.
    expect(
      guessedAgain(
        spec('studios', 'songs'),
        { session: { studio: 'SUNSET SOUND' } },
        ['Sunset Sound'],
      ),
    ).toBe('session.studio');
    expect(
      guessedAgain(spec('studios', 'songs'), { session: {} }, ['Sunset Sound']),
    ).toBeNull();
  });

  it('unsets a path, and an object it leaves empty', () => {
    const body = { a: { b: 1, c: { d: 2 } }, e: 3 };
    expect(unsetPath(body, 'a.c.d')).toStrictEqual({ a: { b: 1 }, e: 3 });
    expect(unsetPath(body, 'e')).toStrictEqual({ a: { b: 1, c: { d: 2 } } });
    expect(unsetPath(body, 'a.x.y')).toBe(body);
    expect(unsetPath({ a: { b: 1 } }, 'a.b')).toStrictEqual({});
  });
});

describe('undoing a link or an unlink', () => {
  it('puts a one back, and will not over a value someone changed since', () => {
    const link = spec('locations', 'artists');
    const before = { slug: 'toto', basedInPlaceId: 'chicago' };
    const after = applyLink(link, before, { as: 'one', id: 'los-angeles' });
    const undo = inverse(link, before, after);
    expect(undo).toEqual([
      { path: 'basedInPlaceId', value: 'chicago', seen: 'los-angeles' },
    ]);
    expect(applyRestore(after, undo)).toEqual({ body: before });
    expect(applyRestore({ ...after, basedInPlaceId: 'detroit' }, undo)).toEqual(
      { conflicts: ['basedInPlaceId'] },
    );
    // Already back where it was: nothing to do, no conflict.
    expect(applyRestore(before, undo)).toEqual({ body: before });
  });

  it('puts an unlinked id and its text back, the session they made gone again on redo', () => {
    const link = spec('studios', 'songs');
    const before = {
      id: 'africa',
      session: { studioId: 'sunset-sound', studio: 'Sunset Sound' },
    };
    const after = applyUnlink(link, before, 'sunset-sound', {
      name: 'Sunset Sound',
    });
    const undo = inverse(link, before, after);
    expect(undo.map((r) => r.path)).toEqual([
      'session.studioId',
      'session.studio',
    ]);
    expect(applyRestore(after, undo)).toEqual({ body: before });
    // And the redo of the link, from the body linked again.
    const redo = inverse(link, after, before);
    expect(applyRestore(before, redo)).toEqual({ body: { id: 'africa' } });
  });

  it('merges a list someone changed since, keeping their entries', () => {
    const link = spec('artists', 'events');
    const before = { id: 'evt-x', artistIds: ['queen'] };
    const after = applyLink(link, before, {
      as: 'ids',
      ids: ['queen', 'toto'],
    });
    const undo = inverse(link, before, after);
    expect(
      applyRestore({ ...after, artistIds: ['queen', 'toto', 'abba'] }, undo),
    ).toEqual({ body: { id: 'evt-x', artistIds: ['queen', 'abba'] } });

    // An unlink undone after someone added another: the one taken out
    // comes back, theirs stays.
    const removed = applyUnlink(link, after, 'toto');
    const back = inverse(link, after, removed);
    expect(
      applyRestore({ ...removed, artistIds: ['queen', 'abba'] }, back),
    ).toEqual({ body: { id: 'evt-x', artistIds: ['queen', 'abba', 'toto'] } });

    // A member taken out comes back whole, with their years.
    const members = spec('artists', 'memberOf');
    const group = {
      slug: 'toto',
      members: [{ artistId: 'jeff-porcaro', from: 1977 }],
    };
    const left = applyUnlink(members, group, 'jeff-porcaro');
    expect(applyRestore(left, inverse(members, group, left))).toEqual({
      body: group,
    });
  });

  it('takes a stored list away again when the link made it, so the guesses return', () => {
    const link = spec('artists', 'events');
    const before = { id: 'evt-x', title: 'Live' };
    const after = applyLink(link, before, { as: 'ids', ids: ['toto'] });
    expect(applyRestore(after, inverse(link, before, after))).toEqual({
      body: before,
    });
  });

  it('puts a lead act back, and takes one the link set away', () => {
    const link = spec('artists', 'songs');
    const before = { id: 'x', artist: 'Toto', credits: [] };
    const after = applyLink(link, before, { as: 'lead', id: 'toto' });
    expect(applyRestore(after, inverse(link, before, after))).toEqual({
      body: before,
    });
  });
});

/* ── Refusals over a graph ───────────────────────────────────────────── */

const node = (id: EntityId, label: string): GraphNode => ({
  id,
  kind: id.slice(0, id.indexOf(':')) as GraphNode['kind'],
  label,
  status: 'published',
  origin: 'api',
});

const artist = (slug: string, members: string[] = []): ArtistRecord => ({
  slug,
  name: slug,
  ...(members.length
    ? { group: true, members: members.map((artistId) => ({ artistId })) }
    : {}),
});

const label = (slug: string, parentLabelId?: string): LabelRecord => ({
  slug,
  name: slug,
  ...(parentLabelId ? { parentLabelId } : {}),
});

/**
 * A supergroup of bands (Traveling Wilburys → Jeff Lynne's band → Jeff
 * Lynne), and Tamla an imprint of Motown, an imprint of a holding label.
 */
const ARTISTS = [
  artist('wilburys', ['elo']),
  artist('elo', ['jeff-lynne']),
  artist('jeff-lynne'),
  artist('tom-petty'),
];
const LABELS = [
  label('tamla', 'motown'),
  label('motown', 'universal'),
  label('universal'),
  label('stax'),
];
const refusalGraph = assembleGraph(
  [
    ...ARTISTS.map((a) => node(`artist:${a.slug}`, a.name)),
    ...LABELS.map((l) => node(`label:${l.slug}`, l.name)),
  ],
  [
    ...ARTISTS.flatMap((a) => edgesForArtist(a)),
    ...LABELS.flatMap(edgesForLabel),
  ],
);

const refusal = (
  link: LinkSpec,
  owner: string,
  row: string,
  ownerBody?: Record<string, unknown>,
) =>
  linkRefusal(link, {
    graph: refusalGraph,
    owner,
    ownerBody,
    row: { key: row, node: `${link.target}:${row}` as EntityId },
  });

describe('what a link refuses', () => {
  it('will not make a group its own member, or loop membership', () => {
    const link = spec('artists', 'memberOf');
    // Row: the member; owner: the group that gains them.
    expect(refusal(link, 'elo', 'elo')).toBe(
      'A group cannot be its own member.',
    );
    // The Wilburys have ELO among their members (through ELO, Jeff Lynne):
    // ELO cannot take the Wilburys on, nor can Jeff Lynne.
    expect(refusal(link, 'elo', 'wilburys')).toMatch(/it would loop/);
    expect(refusal(link, 'jeff-lynne', 'wilburys')).toMatch(/it would loop/);
    expect(refusal(link, 'wilburys', 'tom-petty')).toBeNull();
    expect(refusal(link, 'elo', 'tom-petty')).toBeNull();
  });

  it('will not make a label an imprint of itself, or of its own imprint', () => {
    const link = spec('labels', 'imprints');
    // Row: the parent; owner: the imprint whose parent it becomes.
    expect(refusal(link, 'stax', 'stax')).toBe(
      'A label cannot be an imprint of itself.',
    );
    // Universal is above Motown and Tamla: it cannot go under either.
    expect(refusal(link, 'universal', 'tamla')).toMatch(/it would loop/);
    expect(refusal(link, 'universal', 'motown')).toMatch(/it would loop/);
    expect(refusal(link, 'stax', 'universal')).toBeNull();
    expect(refusal(link, 'tamla', 'stax')).toBeNull();
  });

  it('will not name an artist as their own influence', () => {
    const link = spec('artists', 'influenced');
    expect(refusal(link, 'tom-petty', 'tom-petty')).toBe(
      'An artist cannot influence themselves.',
    );
    expect(refusal(link, 'tom-petty', 'jeff-lynne')).toBeNull();
  });

  it('will not set a session label the song’s record overrides', () => {
    const link = spec('labels', 'songs');
    expect(
      refusal(link, 'africa', 'tamla', {
        releases: [{ releaseId: 'toto-iv' }],
      }),
    ).toMatch(/record names its own label/);
    expect(refusal(link, 'africa', 'tamla', { releases: [] })).toBeNull();
  });

  it('will not tag a song with a genre no tag spells', () => {
    const link = spec('genres', 'songs');
    expect(refusal(link, 'africa', 'classical')).toMatch(/No song tag/);
    expect(refusal(link, 'africa', 'rock')).toBeNull();
    expect(
      linkRefusal(link, {
        graph: refusalGraph,
        owner: 'africa',
        row: { key: 'soft-rock', node: 'subgenre:soft-rock' },
      }),
    ).toBeNull();
  });

  it('says only what the row decides before an owner is picked', () => {
    const row = { key: 'classical', node: 'genre:classical' as EntityId };
    expect(
      linkRefusal(spec('genres', 'songs'), { graph: refusalGraph, row }),
    ).toMatch(/No song tag/);
    expect(
      linkRefusal(spec('artists', 'memberOf'), {
        graph: refusalGraph,
        row: { key: 'elo', node: 'artist:elo' },
      }),
    ).toBeNull();
  });

  it('refuses nothing for a link with nothing to check', () => {
    expect(refusal(spec('studios', 'songs'), 'africa', 'sunset-sound')).toBe(
      null,
    );
  });
});

describe('what a link waits for', () => {
  it('holds a field until the owner’s body level takes it', () => {
    const recorded = spec('locations', 'songs');
    expect(waitsFor(recorded, 1)).toEqual({
      level: 2,
      what: 'song schema v2',
    });
    expect(waitsFor(recorded, 2)).toBeUndefined();
    expect(waitsFor(spec('locations', 'events'), 1)?.what).toBe(
      'the event body v2',
    );
    // Records, studios and labels store their places from the start.
    expect(waitsFor(spec('locations', 'studios'), 1)).toBeUndefined();
    expect(waitsFor(spec('labels', 'imprints'), 1)).toBeUndefined();
  });

  it('holds a subgenre on a song for song v2, and a taught tag for nothing', () => {
    const link = spec('genres', 'songs');
    expect(waitsFor(link, 1)).toBeUndefined();
    expect(waitsFor(link, 1, 'genre')).toBeUndefined();
    expect(waitsFor(link, 1, 'subgenre')?.what).toBe('song schema v2');
    expect(waitsFor(link, 2, 'subgenre')).toBeUndefined();
  });
});

describe('what the graph guesses for an owner', () => {
  const graph = fixtureGraph();
  const doubtful = placeAndGenreNames(graph);

  it('lists an event’s matched artists and songs, never its stored ones', () => {
    expect(
      guessesFor(
        spec('artists', 'events'),
        graph,
        'event:evt-live-aid',
        doubtful,
      ),
    ).toEqual([{ id: 'toto', label: 'Toto', sure: false }]);
    // Grammys stores Toto; its song is still a guess.
    expect(
      guessesFor(
        spec('artists', 'events'),
        graph,
        'event:evt-grammys-1983',
        doubtful,
      ),
    ).toEqual([]);
    expect(
      guessesFor(
        spec('songs', 'events'),
        graph,
        'event:evt-grammys-1983',
        doubtful,
      ),
    ).toEqual([{ id: 'rosanna', label: 'Rosanna', sure: true }]);
    // A progression's songs are never guessed.
    expect(
      guessesFor(
        spec('songs', 'progression'),
        graph,
        'progression:1',
        doubtful,
      ),
    ).toEqual([]);
  });

  it('keeps one-word names and names of places and genres unticked', () => {
    expect(isOneWordName('Toto')).toBe(true);
    expect(isOneWordName('The Roots')).toBe(true);
    expect(isOneWordName('Hall & Oates')).toBe(false);
    expect(doubtful.has('los angeles')).toBe(true);
    expect(doubtful.has('rock')).toBe(true);
  });

  it('labels an id at whichever level of the vocabulary the graph has it', () => {
    const genres = spec('genres', 'artists');
    expect(targetNode(genres, graph, 'rock')).toBe('genre:rock');
    expect(targetNode(genres, graph, 'acid-rock')).toBe('subgenre:acid-rock');
    expect(targetNode(genres, graph, 'nowhere')).toBe('genre:nowhere');
  });
});
