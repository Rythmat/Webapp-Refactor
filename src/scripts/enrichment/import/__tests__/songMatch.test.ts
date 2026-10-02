import { describe, expect, it } from 'vitest';
import type { MbRelation } from '../musicbrainz';
import {
  actBands,
  actIds,
  billingNames,
  chooseAlbum,
  chooseRelease,
  firstRelease,
  leadActOf,
  matchSong,
  registryIndex,
  takesOf,
  titleMatch,
  whyNotTheSong,
} from '../songMatch';
import {
  credit,
  id,
  lead,
  MARVIN,
  pick,
  recording,
  release,
  song,
  TAMMI,
} from './songFixtures';

const ours = { ids: new Set([MARVIN]) };

describe('the lead act', () => {
  const registry = registryIndex([
    { slug: 'sly-and-the-family-stone', name: 'Sly and the Family Stone' },
    { slug: 'kenny-loggins', name: 'Kenny Loggins' },
    { slug: 'rihanna', name: 'Rihanna' },
    { slug: 'gladys-knight-and-the-pips', name: 'Gladys Knight and the Pips' },
    {
      slug: 'hall-and-oates',
      name: 'Hall & Oates',
      aliases: ['Daryl Hall and John Oates'],
    },
  ]);
  const picks = new Map(
    [
      'sly-and-the-family-stone',
      'kenny-loggins',
      'rihanna',
      'hall-and-oates',
    ].map((slug) => [slug, pick({ slug, name: slug })] as const),
  );

  it('tries the whole billing, then its first part at the strongest separator', () => {
    expect(billingNames('Sly and the Family Stone / Larry Graham')).toEqual([
      'Sly and the Family Stone / Larry Graham',
      'Sly and the Family Stone',
      'Sly',
    ]);
    expect(billingNames('Rihanna, Kanye West and Paul McCartney')).toEqual([
      'Rihanna, Kanye West and Paul McCartney',
      'Rihanna',
    ]);
    const sly = leadActOf(
      'Sly and the Family Stone / Larry Graham',
      registry,
      picks,
    );
    expect(sly).toMatchObject({
      kind: 'pick',
      lead: {
        slug: 'sly-and-the-family-stone',
        billedAs: 'Sly and the Family Stone',
      },
    });
    expect(
      leadActOf('Kenny Loggins / Nathan East', registry, picks),
    ).toMatchObject({
      kind: 'pick',
      lead: { slug: 'kenny-loggins' },
    });
    // An alias is the act; "&" and "and" are one word.
    expect(leadActOf('Daryl Hall & John Oates', registry, picks)).toMatchObject(
      {
        kind: 'pick',
        lead: { slug: 'hall-and-oates' },
      },
    );
  });

  it('needs a sure or likely identity, and never splits one act into a namesake', () => {
    expect(leadActOf('Gladys Knight and the Pips', registry, picks)).toEqual({
      kind: 'none',
      name: 'Gladys Knight and the Pips',
      slug: 'gladys-knight-and-the-pips',
      reason:
        'gladys-knight-and-the-pips has no sure or likely MusicBrainz identity',
    });
    expect(leadActOf('Traditional', registry, picks)).toMatchObject({
      kind: 'none',
      slug: null,
      reason: 'no artist of ours is billed',
    });
  });
});

describe('which recordings are the song', () => {
  it('folds case, accents, punctuation and version suffixes in titles', () => {
    for (const title of [
      'Let’s Get It On',
      "LET'S GET IT ON",
      "Let's Get It On - Single Version",
      "Let's Get It On (Mono)",
      "Let's Get It On [feat. Somebody]",
    ])
      expect(
        whyNotTheSong(recording(1, { title }), "Let's Get It On", ours),
      ).toBeNull();
    expect(
      whyNotTheSong(
        recording(1, { title: "Let's Get It On Again" }),
        "Let's Get It On",
        ours,
      ),
    ).toBe('another title');
  });

  it('passes over live, remixed, karaoke, remastered and re-recorded takes, videos and live-only takes', () => {
    const why = (more: Parameters<typeof recording>[1]) =>
      whyNotTheSong(recording(1, more), "Let's Get It On", ours);
    expect(why({ disambiguation: 'live, 1974-01-04: Oakland' })).toMatch(
      /live/,
    );
    expect(why({ title: "Let's Get It On (Live)" })).toMatch(/live/);
    expect(why({ title: "Let's Get It On (karaoke version)" })).toMatch(
      /karaoke/,
    );
    expect(why({ title: "Let's Get It On (Dimitri remix)" })).toMatch(/remix/);
    expect(why({ disambiguation: '2003 remaster' })).toBe(
      'a remaster or re-recording',
    );
    expect(why({ title: "Let's Get It On (Remastered 2009)" })).toBe(
      'a remaster or re-recording',
    );
    expect(why({ title: "Let's Get It On Again (Extended)" })).toBe(
      'another title',
    );
    expect(why({ disambiguation: 're-recorded version' })).toBe(
      'a remaster or re-recording',
    );
    expect(why({ video: true })).toBe('a video');
    expect(
      why({
        releases: [
          release(1, { secondary: ['Live'] }),
          release(2, { secondary: ['Live'] }),
        ],
      }),
    ).toBe('only on live albums');
    expect(why({ date: '' })).toBe('no release date');
  });

  it('checks the credit by MusicBrainz id, never by name', () => {
    const namesake = recording(1, { credit: [credit(id(99), 'Marvin Gaye')] });
    expect(whyNotTheSong(namesake, "Let's Get It On", ours)).toBe(
      'not credited to our artist',
    );
    const duet = recording(2, {
      credit: [
        credit(MARVIN, 'Marvin Gaye', { joinphrase: ' & ' }),
        credit(TAMMI, 'Tammi Terrell'),
      ],
    });
    expect(
      whyNotTheSong(duet, "Let's Get It On", { ids: new Set([TAMMI]) }),
    ).toBeNull();
  });

  it("puts the act's own records first, then the earliest, then the most issued", () => {
    const compilation = recording(1, {
      date: '1970',
      releases: [release(1, { secondary: ['Compilation'], date: '1970' })],
    });
    const single = recording(2, {
      date: '1973-06-15',
      releases: [release(2, { type: 'Single', date: '1973-06-15' })],
    });
    const album = recording(3, {
      date: '1973-08-28',
      releases: [
        release(3, { date: '1973-08-28' }),
        release(4, { date: '1990' }),
        release(5, { date: '2003' }),
      ],
    });
    const { takes } = takesOf(
      [compilation, single, album],
      "Let's Get It On",
      ours,
    );
    expect(takes.map((t) => t.recording.id)).toEqual([
      album.id,
      single.id,
      compilation.id,
    ]);
  });
});

describe('other cuts of the song', () => {
  const why = (more: Parameters<typeof recording>[1]) =>
    whyNotTheSong(recording(1, more), "Let's Get It On", ours);

  it('pass over new mixes, edits by someone, extended, dub and film versions, DJ-mix copies and sessions', () => {
    for (const disambiguation of [
      'Dolby Atmos mix',
      '2018 stereo mix',
      '5.1 mix',
      'extended jam',
      'part of “Ministry of Sound: Legends” DJ‐mix',
      'Film Version',
      'Todd Terje edit',
      'no rap version',
      'First Sessions version',
      'iTunes Session',
      '12″ version',
      'club mix',
    ])
      expect(
        why({ disambiguation }),
        `"${disambiguation}" is another cut`,
      ).toBe('another mix, edit or version');
    expect(why({ title: "Let's Get It On (Dub)" })).toBe(
      'another mix, edit or version',
    );
    expect(why({ title: "Let's Get It On (Extended Version)" })).toBe(
      'another mix, edit or version',
    );
  });

  it('keep the record: its radio or single edit, its mono and stereo, its album and 7″ mixes', () => {
    for (const disambiguation of [
      'radio edit',
      'single version',
      'album version',
      'mono',
      'stereo',
      'original mono studio mix',
      '7″ mix',
      'edit',
      'clean',
    ])
      expect(why({ disambiguation }), `"${disambiguation}"`).toBeNull();
    expect(why({ title: "Let's Get It On (Single Version)" })).toBeNull();
  });

  it('pass over re-recordings however MusicBrainz hyphenates them, and a later "1975 version"', () => {
    expect(why({ disambiguation: 're‐recorded' })).toBe(
      'a remaster or re-recording',
    );
    expect(why({ disambiguation: 'new version' })).toBe(
      'a remaster or re-recording',
    );
    // Papa's Got a Brand New Bag: the 1975 re-do beside the 1965 original.
    const original = recording(1, {
      date: '1965-06',
      releases: [release(1, { type: 'Single', date: '1965-06' })],
    });
    const redo = recording(2, {
      date: '1975',
      disambiguation: '1975 version',
      releases: [release(2, { date: '1975' })],
    });
    const { takes, passedOver } = takesOf(
      [redo, original],
      "Let's Get It On",
      ours,
    );
    expect(takes.map((t) => t.recording.id)).toEqual([original.id]);
    expect(passedOver).toEqual({ 'a later version ("1975 version")': 1 });
    // Alone, a "1975 version" is still a take: nothing earlier says otherwise.
    expect(takesOf([redo], "Let's Get It On", ours).takes).toHaveLength(1);
  });
});

describe("the act's bands", () => {
  const CHUCK = id(70);
  const SOUL_SEARCHERS = id(71);
  const member = (bandId: string, name: string): MbRelation => ({
    type: 'member of band',
    'target-type': 'artist',
    direction: 'forward',
    artist: { id: bandId, name },
  });
  const ourNames = new Set(['willie nelson', 'stan getz']);
  const isOurs = (name: string) => ourNames.has(name);

  it('are the bands it was in that are named after it, never a duo with another of ours', () => {
    const bands = actBands(
      {
        name: 'Chuck Brown',
        relations: [
          member(SOUL_SEARCHERS, 'Chuck Brown & The Soul Searchers'),
          member(id(72), 'Chuck Brown and Willie Nelson'),
          member(id(73), 'Ike & Chuck Brown'),
          member(id(74), 'Team Chuck Brown'),
          member(id(75), 'Chuck Brown – Stan Getz Sextet'),
          member(id(76), 'The Chuck Brown Band'),
          member(id(78), 'Chuck Brown & June Carter'),
          {
            ...member(id(77), 'Chuck Brown Trio'),
            direction: 'backward',
          },
        ],
      },
      'Chuck Brown',
      isOurs,
    );
    expect(bands).toEqual([
      {
        id: SOUL_SEARCHERS,
        name: 'Chuck Brown & The Soul Searchers',
        backing: true,
      },
      { id: id(76), name: 'The Chuck Brown Band', backing: true },
      // A partnership, maybe: searched, but its records only likely.
      { id: id(78), name: 'Chuck Brown & June Carter', backing: false },
    ]);
    expect(actBands(null, 'Chuck Brown', isOurs)).toEqual([]);
  });

  it("match the act's record under its band's name, not its later re-recording", () => {
    // "Bustin' Loose" (1978): the 1979 album by Chuck Brown & The Soul
    // Searchers, and the 2010 re-recording by Chuck Brown alone.
    const chuck = lead({
      slug: 'chuck-brown',
      name: 'Chuck Brown',
      mbid: CHUCK,
      bands: [
        {
          id: SOUL_SEARCHERS,
          name: 'Chuck Brown & The Soul Searchers',
          backing: true,
        },
      ],
    });
    expect(actIds(chuck)).toEqual([CHUCK, SOUL_SEARCHERS]);
    const band = [credit(SOUL_SEARCHERS, 'Chuck Brown & The Soul Searchers')];
    const original = recording(1, {
      title: "Bustin' Loose",
      date: '1979',
      credit: band,
      releases: [release(1, { title: "Bustin' Loose", date: '1979' })],
    });
    const redo = recording(2, {
      title: "Bustin' Loose",
      date: '2010-09-21',
      credit: [credit(CHUCK, 'Chuck Brown')],
      releases: [release(2, { title: 'We Got This', date: '2010-09-21' })],
    });
    const facts = song({
      id: 'bustin_loose',
      title: "Bustin' Loose",
      artist: 'Chuck Brown',
      year: 1978,
    });
    const match = matchSong(facts, [redo, original], { lead: chuck });
    expect(match).toMatchObject({ status: 'matched', tier: 'sure' });
    if (match.status !== 'matched') return;
    expect(match.take.recording.id).toBe(original.id);
    expect(match.reasons).toContain(
      "Chuck Brown & The Soul Searchers is Chuck Brown's band, named after them (MusicBrainz: member of band)",
    );
    // Without the band, the re-recording years after our year is no match.
    const alone = matchSong(facts, [redo, original], {
      lead: { ...chuck, bands: [] },
    });
    expect(alone.status).toBe('ambiguous');
    // A group that may be a partnership: matched, only likely.
    const duo = matchSong(facts, [redo, original], {
      lead: { ...chuck, bands: [{ ...chuck.bands![0], backing: false }] },
    });
    expect(duo).toMatchObject({ status: 'matched', tier: 'likely' });
  });
});

describe('titles met loosely', () => {
  it('meet a subtitle added or dropped, and count only where no title meets exactly', () => {
    expect(titleMatch('Sweet Dreams (Are Made of This)', 'Sweet Dreams')).toBe(
      'loose',
    );
    expect(titleMatch('Dock of the Bay', 'Dock of the Bay (Sittin On)')).toBe(
      'loose',
    );
    expect(titleMatch("Let's Get It On", 'Let’s get it on')).toBe('exact');
    expect(titleMatch('Sweet Dreams', 'Sweet Thing')).toBeNull();
    const loose = recording(1, { title: "Let's Get It On (Part 1)" });
    const exact = recording(2, { date: '1974' });
    const examined = takesOf([loose, exact], "Let's Get It On", ours);
    expect(examined.takes.map((t) => t.recording.id)).toEqual([exact.id]);
    // Set aside, never chosen — but the album is looked for over it too.
    expect(examined.loose.map((t) => t.recording.id)).toEqual([loose.id]);
    const both = matchSong(song(), [loose, exact], { lead: lead() });
    expect(
      both.status === 'matched' && both.all.map((t) => t.recording.id),
    ).toEqual([exact.id, loose.id]);
    const match = matchSong(song(), [loose], { lead: lead() });
    expect(match).toMatchObject({ status: 'matched', tier: 'likely' });
  });

  it("finds the album on a take titled loosely when the exact one is a single's edit", () => {
    // Isaac Hayes, "Do Your Thing": the single edit is titled exactly; the
    // album take on the Shaft soundtrack is "(vocal)".
    const edit = recording(1, {
      title: 'Do Your Thing',
      date: '1971-07',
      releases: [release(1, { type: 'Single', date: '1971-07' })],
    });
    const soundtrack = recording(2, {
      title: 'Do Your Thing (vocal)',
      date: '1971-07',
      releases: [
        release(2, {
          title: 'Shaft',
          date: '1971-07',
          secondary: ['Soundtrack'],
        }),
      ],
    });
    const match = matchSong(
      song({ title: 'Do Your Thing', year: 1971 }),
      [edit, soundtrack],
      { lead: lead() },
    );
    expect(match).toMatchObject({ status: 'matched', tier: 'sure' });
    if (match.status !== 'matched') return;
    expect(match.take.recording.id).toBe(edit.id);
    expect(
      chooseAlbum(
        match.all.map((t) => t.recording),
        new Set([MARVIN]),
      ),
    ).toMatchObject({ title: 'Shaft', format: 'soundtrack' });
  });
});

describe('matching a song', () => {
  it('is sure on a sure act, its own record and a year that agrees', () => {
    const match = matchSong(song({ year: 1973 }), [recording(1)], {
      lead: lead(),
    });
    expect(match).toMatchObject({
      status: 'matched',
      tier: 'sure',
      confidence: 1,
      takes: 1,
    });
    if (match.status === 'matched')
      expect(match.reasons).toContain('its year agrees with ours (1973)');
  });

  it('finds nothing without a take, and says what it passed over', () => {
    const match = matchSong(
      song(),
      [recording(1, { disambiguation: 'live' })],
      { lead: lead() },
    );
    expect(match.status).toBe('none');
    expect(match.reasons[0]).toMatch(/passed over: 1 a live/);
  });

  it('is ambiguous when our own year matches a later take, not the earliest', () => {
    const takes = [
      recording(1, { date: '1973-06-15' }),
      recording(2, { date: '1985', releases: [release(2, { date: '1985' })] }),
    ];
    expect(
      matchSong(song({ year: 1985 }), takes, { lead: lead() }).status,
    ).toBe('ambiguous');
    // A year copied from MusicBrainz proves nothing either way: matched, only likely.
    const copied = matchSong(
      song({ year: 1985, yearFromMusicBrainz: true }),
      takes,
      { lead: lead() },
    );
    expect(copied).toMatchObject({ status: 'matched', tier: 'likely' });
  });

  it('is only likely on a likely act, a guest credit or compilations only', () => {
    expect(
      matchSong(song(), [recording(1)], {
        lead: lead({ tier: 'likely', confidence: 0.7 }),
      }),
    ).toMatchObject({
      tier: 'likely',
      confidence: 0.7,
    });
    const guest = recording(1, {
      credit: [
        credit(TAMMI, 'Tammi Terrell', { joinphrase: ' feat. ' }),
        credit(MARVIN, 'Marvin Gaye'),
      ],
      releases: [
        release(1, {
          credit: [
            credit(TAMMI, 'Tammi Terrell'),
            credit(MARVIN, 'Marvin Gaye'),
          ],
        }),
      ],
    });
    expect(matchSong(song(), [guest], { lead: lead() })).toMatchObject({
      tier: 'likely',
      confidence: 0.84,
    });
    const reissue = recording(1, {
      releases: [release(1, { secondary: ['Compilation'] })],
    });
    const match = matchSong(song(), [reissue], { lead: lead() });
    expect(match).toMatchObject({ status: 'matched', tier: 'likely' });
  });

  it("is ambiguous when the act's own record came out years after a take found only on compilations", () => {
    const early = recording(1, {
      date: '1965',
      releases: [release(1, { secondary: ['Compilation'], date: '1965' })],
    });
    const later = recording(2, {
      date: '1975',
      releases: [release(2, { date: '1975' })],
    });
    const match = matchSong(song({ year: 1965 }), [early, later], {
      lead: lead(),
    });
    expect(match.status).toBe('ambiguous');
    expect(match.reasons.at(-1)).toMatch(/may be a re-recording/);
    // Unless our year, typed by hand, is the later one's.
    expect(
      matchSong(song({ year: 1975 }), [early, later], { lead: lead() }),
    ).toMatchObject({ status: 'matched', tier: 'sure' });
    expect(
      matchSong(
        song({ year: 1975, yearFromMusicBrainz: true }),
        [early, later],
        {
          lead: lead(),
        },
      ).status,
    ).toBe('ambiguous');
  });

  it('is ambiguous when no take is from our year and the one found is a compilation’s or years later', () => {
    const hits = recording(1, {
      date: '1992',
      releases: [release(1, { secondary: ['Compilation'], date: '1992' })],
    });
    expect(
      matchSong(song({ year: 1980 }), [hits], { lead: lead() }).status,
    ).toBe('ambiguous');
    const later = recording(2, {
      date: '1986',
      releases: [release(2, { date: '1986' })],
    });
    const match = matchSong(song({ year: 1978 }), [later], { lead: lead() });
    expect(match.status).toBe('ambiguous');
    expect(match.reasons.at(-1)).toMatch(/earliest take .* is from 1986/);
    // Years earlier than ours is our year being a reissue's: worth a look.
    expect(
      matchSong(song({ year: 1990 }), [later], { lead: lead() }),
    ).toMatchObject({ status: 'matched', tier: 'likely' });
  });

  it('is only likely when the search was cut short', () => {
    const match = matchSong(
      song({ year: 1973 }),
      [recording(1)],
      {
        lead: lead(),
      },
      { cutOff: { count: 412, read: 300 } },
    );
    expect(match).toMatchObject({ status: 'matched', tier: 'likely' });
    if (match.status === 'matched')
      expect(match.notes).toContain(
        'MusicBrainz has 412 recordings of this title by the act and only the first 300 were read: the original may be among the rest',
      );
  });

  it('by name: ambiguous when the name is two MusicBrainz artists, else likely at 0.6', () => {
    const one = recording(1, {
      credit: [credit(id(50), 'Eurythmics')],
      title: 'Sweet Dreams',
    });
    const other = recording(2, {
      credit: [credit(id(51), 'Eurythmics')],
      title: 'Sweet Dreams',
    });
    const facts = song({
      id: 'sweet_dreams',
      title: 'Sweet Dreams',
      artist: 'Eurythmics',
    });
    expect(
      matchSong(facts, [one, other], { byName: 'Eurythmics' }).status,
    ).toBe('ambiguous');
    expect(matchSong(facts, [one], { byName: 'Eurythmics' })).toMatchObject({
      status: 'matched',
      tier: 'likely',
      confidence: 0.6,
    });
  });
});

describe('the album', () => {
  const credited = (n: number, more: Parameters<typeof release>[1]) =>
    release(n, more);

  it('is the earliest official album of the act that carries the recording', () => {
    const take = recording(1, {
      releases: [
        credited(1, {
          title: 'Greatest Hits',
          date: '1970',
          secondary: ['Compilation'],
        }),
        credited(2, {
          title: 'Motown Gold',
          date: '1971',
          credit: [credit(id(80), 'Various Artists')],
        }),
        credited(3, { title: 'Live!', date: '1972', secondary: ['Live'] }),
        credited(4, { title: 'Bootleg', date: '1972', status: 'Bootleg' }),
        credited(5, {
          title: "Let's Get It On",
          date: '1973-08-28',
          track: '1',
        }),
        credited(6, {
          title: "Let's Get It On",
          date: '1973-09-01',
          group: 5,
          country: 'GB',
        }),
        credited(7, { title: 'Later Album', date: '1980' }),
        credited(8, {
          title: "Let's Get It On",
          type: 'Single',
          date: '1973-06-15',
        }),
      ],
    });
    const album = chooseAlbum([take], new Set([MARVIN]));
    expect(album).toMatchObject({
      groupId: id(2005),
      title: "Let's Get It On",
      format: 'album',
      date: '1973-08-28',
    });
    expect(album?.releases.map((r) => r.id)).toEqual([id(1005), id(1006)]);
    expect(album?.releases[0].track).toBe(1);
  });

  it('may be a soundtrack of the act, and is none when only compilations carry it', () => {
    const purpleRain = recording(1, {
      releases: [
        release(1, { title: 'Purple Rain', secondary: ['Soundtrack'] }),
      ],
    });
    expect(chooseAlbum([purpleRain], new Set([MARVIN]))?.format).toBe(
      'soundtrack',
    );
    const hits = recording(2, {
      releases: [release(2, { secondary: ['Compilation'] })],
    });
    expect(chooseAlbum([hits], new Set([MARVIN]))).toBeNull();
  });

  it('is looked for over every take: the edit on a deluxe reissue, the album take on the original', () => {
    const edit = recording(1, {
      title: '1999 (single edit)',
      releases: [release(20, { title: '1999', group: 30, date: '2019-11-29' })],
    });
    const albumTake = recording(2, {
      releases: [release(21, { title: '1999', group: 30, date: '1982-10-27' })],
    });
    const album = chooseAlbum([edit, albumTake], new Set([MARVIN]));
    expect(album).toMatchObject({ groupId: id(2030), date: '1982-10-27' });
    expect(album?.releases.map((r) => r.date)).toEqual([
      '1982-10-27',
      '2019-11-29',
    ]);
  });

  it("reads the label from the album's first year: the home country's, another's, a worldwide one last", () => {
    const releases = [
      { id: 'fr', title: 'x', date: '2007-09-17', country: 'FR' },
      { id: 'us', title: 'x', date: '2007-10-02', country: 'US' },
      { id: 'xw', title: 'x', date: '2007-09-20', country: 'XW' },
    ];
    expect(chooseRelease(releases, 'US')).toMatchObject({
      id: 'us',
      firstIssue: true,
    });
    expect(chooseRelease(releases, 'JP')?.id).toBe('fr');
    expect(chooseRelease(releases.slice(2), 'US')).toMatchObject({
      id: 'xw',
      firstIssue: true,
    });
  });

  it('never reads it from a reissue while the first year has a release, and says when it must', () => {
    // Ziggy Stardust: the 1972 UK original, a 1990 UK reissue, a 2012
    // worldwide digital release, and an undated one.
    const releases = [
      { id: 'reissue', title: 'x', date: '1990', country: 'GB' },
      { id: 'digital', title: 'x', date: '2012-06-04', country: 'XW' },
      { id: 'undated', title: 'x', country: 'GB' },
      { id: 'original', title: 'x', date: '1972-06-16', country: 'US' },
    ];
    expect(chooseRelease(releases, 'GB')).toMatchObject({
      id: 'original',
      firstIssue: true,
    });
    // No first-year release: an undated one before a dated reissue — and
    // neither is the first issue.
    expect(chooseRelease(releases.slice(0, 3), 'GB', 1972)).toMatchObject({
      id: 'undated',
      firstIssue: false,
    });
    expect(chooseRelease(releases.slice(0, 2), 'GB', 1972)).toMatchObject({
      id: 'reissue',
      firstIssue: false,
    });
  });
});

describe('the year', () => {
  it("is the earliest of the act's own records, beside the recording's own date", () => {
    const [take] = takesOf(
      [
        recording(1, {
          date: '1972',
          releases: [
            release(1, { date: '1972', status: 'Promotion' }),
            release(2, { date: '1973-06-15', type: 'Single' }),
            release(3, { date: '1970', secondary: ['Compilation'] }),
          ],
        }),
      ],
      "Let's Get It On",
      ours,
    ).takes;
    expect(firstRelease(take)).toEqual({
      year: 1973,
      date: '1973-06-15',
      title: 'Release 2',
      type: 'Single',
      agrees: false,
    });
  });

  it('is nothing when none of its own records is dated', () => {
    const [take] = takesOf(
      [
        recording(1, {
          releases: [release(1, { secondary: ['Compilation'], date: '1990' })],
        }),
      ],
      "Let's Get It On",
      ours,
    ).takes;
    expect(firstRelease(take)).toBeNull();
  });
});
