import { describe, expect, it, vi } from 'vitest';
import { REF_META_HOLDERS } from '@/content/suggestions/apply';
import {
  bodyMarks,
  clearCorrectedMark,
  confirmMarks,
  creditRoleOf,
  entryId,
  isMetaPath,
  MARKED_LISTS,
  MARKED_OBJECTS,
  markedObjectOf,
  marksAt,
  marksForColumn,
  marksOf,
  NO_UNREVIEWED_MARKS,
  reviewedBy,
  type UnreviewedMarks,
} from '../unverified';

/**
 * Where a body says a value is not confirmed yet — on the record, on the
 * objects and list entries that carry their own `unverified`/`source` — and
 * the decision log's marks for the values that cannot say it themselves.
 */

const quincy = {
  name: 'Quincy Jones',
  role: 'producer',
  artistGlobeId: 'quincy-jones',
};

const artist = {
  slug: 'bill-withers',
  name: 'Bill Withers',
  unverified: true,
  source: 'musicbrainz',
  born: {
    date: '1938',
    placeId: 'slab-fork',
    unverified: true,
    source: 'wikidata',
  },
  members: [
    { artistId: 'a', unverified: true, source: 'mb' },
    { artistId: 'b' },
  ],
  influencedBy: [{ artistId: 'c', unverified: true }],
  activeFrom: 1970,
  genreIds: ['soul'],
};

const song = {
  id: 'thriller',
  session: { studioId: 'westlake', unverified: true, source: 'musicbrainz' },
  credits: [
    { ...quincy, unverified: true, source: 'https://musicbrainz.org/x' },
    { name: 'Rod Temperton', role: 'songwriter', unverified: true },
    { name: 'Michael Jackson', role: 'vocals' },
  ],
  releases: [{ releaseId: 'thriller-1982', unverified: true }],
  relatedRecordings: [
    { artist: 'Weird Al', relation: 'cover', year: 1984, unverified: true },
  ],
};

describe('the marks a body carries', () => {
  it('reads the record’s, its objects’ and its entries’, with their sources', () => {
    expect(bodyMarks(artist)).toEqual([
      { place: 'record', path: '', source: 'musicbrainz' },
      { place: 'object', path: 'born', source: 'wikidata' },
      { place: 'entry', path: 'members', id: 'a', source: 'mb' },
      { place: 'entry', path: 'influencedBy', id: 'c' },
    ]);
    expect(bodyMarks(song)).toEqual([
      { place: 'object', path: 'session', source: 'musicbrainz' },
      {
        place: 'entry',
        path: 'credits',
        id: 'producer|quincy-jones',
        source: 'https://musicbrainz.org/x',
      },
      { place: 'entry', path: 'credits', id: 'songwriter|rod-temperton' },
      { place: 'entry', path: 'releases', id: 'thriller-1982' },
      {
        place: 'entry',
        path: 'relatedRecordings',
        id: 'cover|weird-al|1984',
      },
    ]);
  });

  it('reads nothing where nothing is marked, or the mark is not `true`', () => {
    expect(bodyMarks({ slug: 'x', name: 'X' })).toEqual([]);
    expect(
      bodyMarks({ unverified: 'yes', born: { unverified: false } }),
    ).toEqual([]);
  });

  it('keeps to the holders the suggestions write marks into', () => {
    const holders = new Set(
      REF_META_HOLDERS.map((holder) => holder.path.replace(/\[\]$/, '')),
    );
    expect(new Set([...MARKED_OBJECTS, ...MARKED_LISTS])).toEqual(holders);
  });
});

describe('an entry’s id', () => {
  it('is a bare id itself, and an object’s anchor by its list’s rule', () => {
    expect(entryId('genreIds', 'rock')).toBe('rock');
    expect(entryId('members[]', { artistId: 'a', from: 1970 })).toBe('a');
    expect(entryId('releases', { releaseId: 'r', track: 2 })).toBe('r');
    expect(entryId('credits', quincy)).toBe('producer|quincy-jones');
    expect(
      entryId('credits', {
        name: 'James Jamerson',
        role: 'performer',
        instrument: 'electric-bass',
      }),
    ).toBe('performer:electric-bass|james-jamerson');
    expect(entryId('credits', null)).toBeUndefined();
  });

  it('gives a credit’s role back', () => {
    expect(creditRoleOf('producer|quincy-jones')).toBe('producer');
    expect(creditRoleOf('performer:electric-bass|james-jamerson')).toBe(
      'performer',
    );
  });
});

describe('the decision log’s marks', () => {
  const log: UnreviewedMarks = ({ kind }) =>
    kind === 'artist'
      ? [
          { path: 'activeFrom', source: 'wikidata', suggestionId: 's1' },
          {
            path: 'genreIds[]',
            id: 'soul',
            source: 'musicbrainz',
            suggestionId: 's2',
          },
          { path: 'born.date', source: 'wikidata', suggestionId: 's3' },
          {
            path: 'members[]',
            id: 'a',
            source: 'musicbrainz',
            suggestionId: 's4',
          },
        ]
      : [];

  it('join the body’s, once each: a decision the body marks joins that mark', () => {
    const marks = marksOf(artist, { kind: 'artist', slug: artist.slug }, log);
    expect(marks.filter((m) => m.place === 'decision')).toEqual([
      {
        place: 'decision',
        path: 'activeFrom',
        source: 'wikidata',
        suggestionIds: ['s1'],
      },
      {
        place: 'decision',
        path: 'genreIds',
        id: 'soul',
        source: 'musicbrainz',
        suggestionIds: ['s2'],
      },
    ]);
    expect(marks.find((m) => m.path === 'born')?.suggestionIds).toEqual(['s3']);
    expect(
      marks.find((m) => m.path === 'members' && m.id === 'a')?.suggestionIds,
    ).toEqual(['s4']);
    expect(reviewedBy(marks)).toEqual(['s3', 's4', 's1', 's2']);
  });

  it('are asked of the item and its body, and there are none by default', () => {
    const provider = vi.fn(NO_UNREVIEWED_MARKS);
    marksOf(song, { kind: 'song', slug: song.id }, provider);
    expect(provider).toHaveBeenCalledWith({
      kind: 'song',
      slug: 'thriller',
      body: song,
    });
    expect(marksOf(song, { kind: 'song', slug: song.id })).toEqual(
      bodyMarks(song),
    );
    // Without an item there is no log to ask.
    expect(marksOf(artist, undefined, log)).toEqual(bodyMarks(artist));
  });

  it('stand alone inside an object the body does not mark', () => {
    const plain = { slug: 'x', born: { date: '1938' } };
    const marks = marksOf(plain, { kind: 'artist', slug: 'x' }, log);
    expect(marksAt(marks, 'born')).toEqual([
      {
        place: 'decision',
        path: 'born.date',
        source: 'wikidata',
        suggestionIds: ['s3'],
      },
    ]);
  });
});

describe('the marks a cell shows', () => {
  const log: UnreviewedMarks = () => [
    { path: 'session.labelId', source: 'musicbrainz', suggestionId: 'l1' },
    { path: 'year', source: 'musicbrainz', suggestionId: 'y1' },
  ];
  const marks = marksOf(song, { kind: 'song', slug: song.id }, log);

  it('are the record’s on the title, and a field’s own elsewhere', () => {
    expect(marksAt(bodyMarks(artist), '')).toEqual([
      { place: 'record', path: '', source: 'musicbrainz' },
    ]);
    expect(marksAt(marks, 'year').map((m) => m.suggestionIds)).toEqual([
      ['y1'],
    ]);
    expect(marksAt(marks, 'title')).toEqual([]);
  });

  it('include the mark of the object a field lies inside', () => {
    // The session is marked as a whole: its Studio shows it, and the log's
    // label decision joined that mark rather than showing twice.
    expect(marksAt(marks, 'session.studioId')).toEqual([
      {
        place: 'object',
        path: 'session',
        source: 'musicbrainz',
        suggestionIds: ['l1'],
      },
    ]);
  });

  it('are a list’s entries’, or the one entry an id names', () => {
    expect(marksAt(marks, 'credits[]')).toHaveLength(2);
    expect(marksAt(marks, 'credits', 'producer|quincy-jones')).toEqual([
      {
        place: 'entry',
        path: 'credits',
        id: 'producer|quincy-jones',
        source: 'https://musicbrainz.org/x',
      },
    ]);
    expect(marksAt(marks, 'credits', 'vocals|michael-jackson')).toEqual([]);
  });

  it('split a list several columns edit by its entries’ roles', () => {
    const composers = marksForColumn(marks, {
      path: 'credits[]',
      also: ['composer'],
      roles: ['songwriter'],
    });
    expect(composers.map((m) => m.id)).toEqual(['songwriter|rod-temperton']);
    const producer = marksForColumn(marks, {
      path: 'credits[]',
      roles: ['producer'],
    });
    expect(producer.map((m) => m.id)).toEqual(['producer|quincy-jones']);
    // The column with no roles shows them all.
    expect(marksForColumn(marks, { path: 'credits[]' })).toHaveLength(2);
  });

  it('count each mark once across a column’s fields', () => {
    expect(
      marksForColumn(marks, {
        path: 'session.studioId',
        also: ['session.studio'],
      }),
    ).toHaveLength(1);
  });
});

describe('confirming', () => {
  it('takes the mark off and keeps the source', () => {
    expect(confirmMarks(artist, '')).toMatchObject({ source: 'musicbrainz' });
    expect(confirmMarks(artist, '')).not.toHaveProperty('unverified');
    expect(confirmMarks(artist, 'born').born).toEqual({
      date: '1938',
      placeId: 'slab-fork',
      source: 'wikidata',
    });
    // A field inside a marked object confirms the object.
    expect(confirmMarks(artist, 'born.placeId').born).not.toHaveProperty(
      'unverified',
    );
    expect(
      confirmMarks(song, 'credits[]', 'producer|quincy-jones').credits,
    ).toEqual([
      { ...quincy, source: 'https://musicbrainz.org/x' },
      song.credits[1],
      song.credits[2],
    ]);
    const all = confirmMarks(song, 'credits').credits as Record<
      string,
      unknown
    >[];
    expect(all.map((credit) => credit.unverified)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('gives the same body back where nothing is marked there', () => {
    expect(confirmMarks(artist, 'activeFrom')).toBe(artist);
    expect(confirmMarks(artist, 'genreIds', 'soul')).toBe(artist);
    expect(confirmMarks(artist, 'members', 'b')).toBe(artist);
    const plain = { slug: 'x', born: { date: '1938' } };
    expect(confirmMarks(plain, 'born')).toBe(plain);
    expect(confirmMarks(plain, '')).toBe(plain);
  });
});

describe('correcting', () => {
  it('clears the mark of the object the corrected field is inside, keeping its source', () => {
    expect(clearCorrectedMark(artist, 'born.date').born).toEqual({
      date: '1938',
      placeId: 'slab-fork',
      source: 'wikidata',
    });
  });

  it('leaves everything else as it was', () => {
    expect(clearCorrectedMark(artist, 'born')).toBe(artist);
    expect(clearCorrectedMark(artist, 'born.source')).toBe(artist);
    expect(clearCorrectedMark(artist, 'name')).toBe(artist);
    expect(clearCorrectedMark({ born: { date: '1' } }, 'born.date')).toEqual({
      born: { date: '1' },
    });
  });

  it('knows a path about the mark from a path about a value', () => {
    expect(isMetaPath('unverified')).toBe(true);
    expect(isMetaPath('born.source')).toBe(true);
    expect(isMetaPath('born.date')).toBe(false);
    expect(markedObjectOf('session.studioId')).toBe('session');
    expect(markedObjectOf('session')).toBeUndefined();
    expect(markedObjectOf('origin.artistGlobeId')).toBeUndefined();
  });
});
