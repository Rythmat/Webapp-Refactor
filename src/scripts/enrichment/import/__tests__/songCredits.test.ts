import { describe, expect, it } from 'vitest';
import { titleKey } from '../cacheStage';
import {
  assignPersonSlugs,
  creditDisplay,
  creditKey,
  creditOffers,
  makesRecord,
  mapCreditInstrument,
  songWorks,
} from '../songCredits';
import type { MbReleaseFull, MbWork } from '../songSources';
import {
  artistRel,
  credit,
  fullRecording,
  id,
  MARVIN,
  TAMMI,
} from './songFixtures';

const work = (n: number, relations: MbWork['relations']): MbWork => ({
  id: id(4000 + n),
  title: "Let's Get It On",
  relations,
});

const albumRelease = (
  relations: MbReleaseFull['relations'],
): MbReleaseFull => ({
  id: id(1005),
  title: "Let's Get It On",
  relations,
});

const brief = (offers: ReturnType<typeof creditOffers>['offers']) =>
  offers.map((o) => ({
    who: o.name,
    role: o.role,
    ...(o.instrument ? { instrument: o.instrument } : {}),
    ...(o.instrumentNames ? { instrumentNames: o.instrumentNames } : {}),
    ...(o.primary ? { primary: true } : {}),
    ...(o.ensemble ? { ensemble: true } : {}),
    level: o.level,
  }));

describe('credits from relationships', () => {
  it('maps each relationship to its role, one credit per person, role and instrument', () => {
    const { offers, report } = creditOffers({
      recording: fullRecording(1, [
        artistRel('producer', MARVIN, 'Marvin Gaye'),
        artistRel('producer', id(10), 'Berry Gordy', ['executive']),
        artistRel('engineer', id(11), 'Cal Harris'),
        artistRel('mix', id(11), 'Cal Harris'),
        artistRel('recording', id(12), 'Art Stewart'),
        artistRel('mastering', id(13), 'Bob Ludwig'),
        artistRel('instrument', id(14), 'James Jamerson', [
          'electric bass guitar',
        ]),
        artistRel('instrument', id(15), 'Robert White', ['guest', 'guitar']),
        artistRel('instrument', id(16), 'Earl Van Dyke', [
          'Hammond organ',
          'piano',
        ]),
        artistRel('vocal', MARVIN, 'Marvin Gaye', ['lead vocals']),
        artistRel('vocal', id(17), 'The Andantes', ['background vocals'], {
          type: 'Group',
        }),
        artistRel(
          'performing orchestra',
          id(18),
          'Detroit Symphony Orchestra',
          [],
          { type: 'Orchestra' },
        ),
        artistRel('arranger', id(19), 'Rene Hall'),
        artistRel('conductor', id(20), 'Paul Riser'),
      ]),
      works: [
        work(1, [
          artistRel('composer', MARVIN, 'Marvin Gaye'),
          artistRel('lyricist', MARVIN, 'Marvin Gaye'),
          artistRel('writer', id(21), 'Ed Townsend'),
        ]),
      ],
      release: null,
    });
    expect(brief(offers)).toEqual([
      { who: 'Marvin Gaye', role: 'vocals', level: 'recording' },
      {
        who: 'Detroit Symphony Orchestra',
        role: 'performer',
        ensemble: true,
        level: 'recording',
      },
      {
        who: 'Robert White',
        role: 'performer',
        instrumentNames: ['guitar'],
        level: 'recording',
      },
      {
        who: 'The Andantes',
        role: 'performer',
        instrument: 'backing-vocals',
        ensemble: true,
        level: 'recording',
      },
      {
        who: 'James Jamerson',
        role: 'performer',
        instrument: 'electric-bass',
        level: 'recording',
      },
      {
        who: 'Earl Van Dyke',
        role: 'performer',
        instrument: 'hammond-organ',
        level: 'recording',
      },
      {
        who: 'Earl Van Dyke',
        role: 'performer',
        instrument: 'piano',
        level: 'recording',
      },
      { who: 'Ed Townsend', role: 'songwriter', level: 'work' },
      { who: 'Marvin Gaye', role: 'songwriter', level: 'work' },
      { who: 'Marvin Gaye', role: 'producer', level: 'recording' },
      { who: 'Rene Hall', role: 'arranger', level: 'recording' },
      { who: 'Paul Riser', role: 'conductor', level: 'recording' },
      { who: 'Art Stewart', role: 'engineer', level: 'recording' },
      { who: 'Cal Harris', role: 'engineer', level: 'recording' },
    ]);
    expect(report.roles.sort()).toEqual([
      'recording: mastering',
      'recording: producer (executive)',
    ]);
    expect(report.instruments).toEqual(['guitar']);
  });

  it("takes the album's producer only when the recording names none", () => {
    const release = albumRelease([
      artistRel('producer', id(30), 'Norman Whitfield'),
    ]);
    const none = creditOffers({
      recording: fullRecording(1, []),
      works: [],
      release,
    });
    expect(brief(none.offers)).toEqual([
      { who: 'Norman Whitfield', role: 'producer', level: 'release' },
    ]);
    const own = creditOffers({
      recording: fullRecording(1, [
        artistRel('producer', MARVIN, 'Marvin Gaye'),
      ]),
      works: [],
      release,
    });
    expect(own.offers.map((o) => o.name)).toEqual(['Marvin Gaye']);
  });

  it('bills everyone a duet credits, singing lead or not', () => {
    const { offers } = creditOffers({
      recording: fullRecording(
        1,
        [artistRel('vocal', MARVIN, 'Marvin Gaye', ['lead vocals'])],
        [
          credit(MARVIN, 'Marvin Gaye', { joinphrase: ' & ' }),
          credit(TAMMI, 'Tammi Terrell', { type: 'Person' }),
        ],
      ),
      works: [],
      release: null,
    });
    expect(brief(offers)).toEqual([
      { who: 'Marvin Gaye', role: 'vocals', primary: true, level: 'recording' },
      {
        who: 'Tammi Terrell',
        role: 'performer',
        primary: true,
        level: 'billing',
      },
    ]);
  });

  it('maps MusicBrainz instrument names, and reports the ones our vocabulary has no id for', () => {
    expect(mapCreditInstrument('drums (drum set)')).toBe('drum-kit');
    expect(mapCreditInstrument('strings')).toBe('string-section');
    expect(mapCreditInstrument('brass')).toBe('horn-section');
    expect(mapCreditInstrument('Wurlitzer electric piano')).toBe('wurlitzer');
    expect(mapCreditInstrument('guitar')).toBeNull();
  });

  it('keeps every instrument we have no id for, in one credit a person reads as such', () => {
    // Prince on "1999": cymbal and electronic drum set, neither in our list.
    const { offers, report } = creditOffers({
      recording: fullRecording(1, [
        artistRel('instrument', id(30), 'Prince', ['cymbal']),
        artistRel('instrument', id(30), 'Prince', ['electronic drum set']),
        artistRel('instrument', id(30), 'Prince', ['piano']),
      ]),
      works: [],
      release: null,
    });
    expect(brief(offers)).toEqual([
      {
        who: 'Prince',
        role: 'performer',
        instrumentNames: ['cymbal', 'electronic drum set'],
        level: 'recording',
      },
      {
        who: 'Prince',
        role: 'performer',
        instrument: 'piano',
        level: 'recording',
      },
    ]);
    expect(report.instruments.sort()).toEqual([
      'cymbal',
      'electronic drum set',
    ]);
    expect(creditDisplay(offers[0], null)).toBe(
      'Performer (cymbal, electronic drum set, not in our list): Prince',
    );
    expect(creditDisplay(offers[1], 'Piano')).toBe('Piano: Prince');
  });

  it('keys a credit by role, instrument and who, as the song list does', () => {
    expect(
      creditKey({
        role: 'performer',
        instrument: 'piano',
        name: 'Earl Van Dyke',
      }),
    ).toBe('performer:piano|earl-van-dyke');
    expect(creditKey({ role: 'producer', name: 'Quincy Jones' })).toBe(
      'producer|quincy-jones',
    );
  });
});

describe('the works that are the song', () => {
  const performs = (...titles: string[]) =>
    fullRecording(
      1,
      titles.map((title, n) => ({
        type: 'performance',
        'target-type': 'work',
        direction: 'forward',
        work: { id: id(4000 + n), title },
      })),
    );
  const wanted = titleKey("Let's Get It On");

  it('are those titled like it, or the only one; a medley of others is nobody’s', () => {
    expect(
      songWorks(performs("Let's Get It On"), titleKey, wanted).ids,
    ).toEqual([id(4000)]);
    expect(songWorks(performs('Get It On'), titleKey, wanted).ids).toEqual([
      id(4000),
    ]);
    expect(songWorks(performs('A', 'B'), titleKey, wanted)).toEqual({
      ids: [],
      reason: 'the recording performs 2 works, none titled like the song',
    });
    expect(songWorks(performs(), titleKey, wanted)).toEqual({
      ids: [],
      reason: 'the recording links no work',
    });
  });
});

describe('who gets a record (C30) and under which slug (C33)', () => {
  it('makes records for billed performers, songwriters, producers and members of the group', () => {
    const members = new Set([id(40)]);
    expect(
      makesRecord({ primary: true, role: 'performer', mbid: id(1) }, members),
    ).toBe(true);
    expect(makesRecord({ role: 'songwriter', mbid: id(1) }, members)).toBe(
      true,
    );
    expect(makesRecord({ role: 'producer', mbid: id(1) }, members)).toBe(true);
    expect(makesRecord({ role: 'performer', mbid: id(40) }, members)).toBe(
      true,
    );
    expect(makesRecord({ role: 'engineer', mbid: id(1) }, members)).toBe(false);
    expect(makesRecord({ role: 'performer', mbid: id(41) }, members)).toBe(
      false,
    );
    expect(makesRecord({ role: 'vocals', mbid: id(41) }, members)).toBe(false);
  });

  it("takes the plain slug, disambiguates a namesake of ours or another's, and blocks one of an unsettled artist", () => {
    const registry = [
      { slug: 'bill-evans', mbid: id(90) },
      { slug: 'common', mbid: null },
    ];
    const people = [
      { mbid: id(1), name: 'Norman Whitfield', ensemble: false },
      {
        mbid: id(2),
        name: 'Bill Evans',
        disambiguation: 'saxophonist',
        ensemble: false,
      },
      { mbid: id(3), name: 'Common', ensemble: false },
      {
        mbid: id(4),
        name: 'John Smith',
        disambiguation: 'engineer',
        ensemble: false,
      },
      { mbid: id(5), name: 'John Smith', ensemble: false },
    ];
    const slugs = assignPersonSlugs(people, registry);
    expect(Object.fromEntries(slugs)).toEqual({
      [id(1)]: { kind: 'slug', slug: 'norman-whitfield', disambiguated: false },
      [id(2)]: {
        kind: 'slug',
        slug: 'bill-evans-saxophonist',
        disambiguated: true,
      },
      [id(3)]: { kind: 'blocked', registrySlug: 'common' },
      [id(4)]: {
        kind: 'slug',
        slug: 'john-smith-engineer',
        disambiguated: true,
      },
      [id(5)]: {
        kind: 'slug',
        slug: `john-smith-${id(5).slice(0, 8)}`,
        disambiguated: true,
      },
    });
    // The same whatever order the people come in.
    expect(assignPersonSlugs([...people].reverse(), registry)).toEqual(slugs);
  });

  it('keeps the slug an earlier emit gave, whoever turns up later', () => {
    const registry = [{ slug: 'bill-evans', mbid: id(90) }];
    const first = assignPersonSlugs(
      [{ mbid: id(5), name: 'John Smith', ensemble: false }],
      registry,
    );
    expect(first.get(id(5))).toEqual({
      kind: 'slug',
      slug: 'john-smith',
      disambiguated: false,
    });
    // A namesake met by a later import: the first keeps "john-smith".
    const later = assignPersonSlugs(
      [
        { mbid: id(5), name: 'John Smith', ensemble: false },
        {
          mbid: id(4),
          name: 'John Smith',
          disambiguation: 'engineer',
          ensemble: false,
        },
      ],
      registry,
      { [id(5)]: 'john-smith' },
    );
    expect(Object.fromEntries(later)).toEqual({
      [id(5)]: { kind: 'slug', slug: 'john-smith', disambiguated: false },
      [id(4)]: {
        kind: 'slug',
        slug: 'john-smith-engineer',
        disambiguated: true,
      },
    });
    // A slug in the ledger is never handed to anyone else, even unmet.
    expect(
      assignPersonSlugs(
        [{ mbid: id(6), name: 'John Smith', ensemble: false }],
        registry,
        { [id(5)]: 'john-smith' },
      ).get(id(6)),
    ).toEqual({
      kind: 'slug',
      slug: `john-smith-${id(6).slice(0, 8)}`,
      disambiguated: true,
    });
    // The registry taking the slug since wins: the person is given another.
    expect(
      assignPersonSlugs(
        [{ mbid: id(7), name: 'Bill Evans', ensemble: false }],
        registry,
        { [id(7)]: 'bill-evans' },
      ).get(id(7)),
    ).toMatchObject({ kind: 'slug', disambiguated: true });
  });
});
