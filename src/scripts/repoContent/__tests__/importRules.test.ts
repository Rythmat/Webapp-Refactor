import { describe, expect, it } from 'vitest';
import { checkSuggestion } from '@/content/suggestions/apply';
import { suggestionId } from '@/content/suggestions/keys';
import type { SuggestionStatus } from '@/content/suggestions/status';
import type { Suggestion, SuggestionSource } from '@/content/suggestions/types';
import {
  addedSourceMentions,
  doubtOf,
  groupOf,
  judge,
  type JudgeInput,
  KNOWN_WRONG,
  knownWrongFor,
  namesakesOf,
  overwrittenPaths,
  parseGroups,
  rankField,
  sourceMentions,
  studentVisibleChanges,
  studentVisibleField,
  type Verdict,
} from '../importRules';

/**
 * The bulk import's rules (design E.2), on made-up rows: which go in, and
 * why each other one does not. The run itself, on a copy of the repo, is
 * importAll.test.ts.
 */

type Body = Record<string, unknown>;

const MB: SuggestionSource = { provider: 'musicbrainz' };
const WD: SuggestionSource = { provider: 'wikidata' };
const APP: SuggestionSource = { provider: 'app', label: 'evt-x tags' };

const row = (
  kind: string,
  slug: string,
  path: string,
  value: unknown,
  extra: Partial<Suggestion> = {},
): Suggestion => {
  const target = { kind, slug };
  const op = path.endsWith('[]') ? 'add' : 'set';
  return {
    id: suggestionId({ target, path, op, value }),
    target,
    path,
    op,
    value,
    display: `${path} ${JSON.stringify(value)}`,
    sources: [MB],
    evidence: [],
    confidence: 0.9,
    tier: 'sure',
    batch: 'mb-test',
    ...extra,
  };
};

/**
 * The bodies a judgement reads: `live` now and `start` as the run found
 * them (the same unless a test says otherwise), statuses read against
 * `live` with no decisions except `decided`.
 */
const judged = (
  suggestions: readonly Suggestion[],
  live: Record<string, Body>,
  {
    start = live,
    decided = {},
    ...rest
  }: Partial<Omit<JudgeInput, 'start' | 'live' | 'status' | 'suggestions'>> & {
    start?: Record<string, Body>;
    decided?: Record<string, SuggestionStatus>;
  } = {},
): Map<string, Verdict> => {
  const bodyOf = (kind: string, slug: string) => live[`${kind}:${slug}`];
  return judge({
    suggestions,
    live: bodyOf,
    start: (kind, slug) => start[`${kind}:${slug}`],
    status: (suggestion) => {
      if (decided[suggestion.id]) return decided[suggestion.id];
      const body = bodyOf(suggestion.target.kind, suggestion.target.slug);
      const check = checkSuggestion(body ?? {}, suggestion);
      if (check.state === 'applied') return 'applied';
      if (check.state === 'conflict') return 'conflict';
      if (check.state === 'unreachable') return 'unreachable';
      return 'open';
    },
    current: (suggestion) =>
      checkSuggestion(
        bodyOf(suggestion.target.kind, suggestion.target.slug) ?? {},
        suggestion,
      ).current,
    holdStudentVisible: false,
    ...rest,
  });
};

const reasonOf = (verdict: Verdict | undefined) =>
  verdict?.state === 'skip' ? verdict.reason : verdict?.state;

const MARVIN: Body = { slug: 'marvin-gaye', name: 'Marvin Gaye' };
const ID = row('artist', 'marvin-gaye', 'externalIds.mbid', 'mbid-1');

describe('groups', () => {
  it('puts each kind a row is about in one group, releases with songs', () => {
    expect(groupOf('artist')).toBe('artists');
    expect(groupOf('song')).toBe('songs');
    expect(groupOf('release')).toBe('songs');
    expect(groupOf('globe_event')).toBe('events');
    expect(groupOf('chord_progression')).toBe('progressions');
    expect(groupOf('studio')).toBeNull();
  });

  it('reads --only, and refuses a group it does not know', () => {
    expect([...parseGroups('artists, songs')]).toEqual(['artists', 'songs']);
    expect(() => parseGroups('artists,places')).toThrow(/places/);
    expect(() => parseGroups(' , ')).toThrow(/at least one/);
  });
});

describe('KNOWN_WRONG', () => {
  it('holds back the Hallelujah link, and no other link to that song', () => {
    const hallelujah = row(
      'chord_progression',
      '578',
      'songIds[]',
      'hallelujah_i_love_her_so',
      { sources: [APP], tier: 'likely' },
    );
    expect(knownWrongFor(hallelujah)?.name).toBe('hallelujah-progression');
    expect(
      knownWrongFor({
        ...hallelujah,
        target: { kind: 'chord_progression', slug: '12' },
      }),
    ).toBeNull();
  });

  it('holds back the importer’s rows on sweet_dreams, not the app’s', () => {
    const album = row('song', 'sweet_dreams', 'releases[]', { releaseId: 'x' });
    expect(knownWrongFor(album)?.name).toBe('sweet-dreams-compilation');
    expect(knownWrongFor({ ...album, sources: [APP] })).toBeNull();
  });

  it('holds back every row naming Portland, Maine or Manila Sound', () => {
    const about = row(
      'globe_event',
      'evt-portlandmusic-portland-2012',
      'artistIds',
      ['portland-maine'],
      { sources: [APP] },
    );
    expect(knownWrongFor(about)?.name).toBe('portland-maine');
    expect(
      knownWrongFor(row('artist', 'manila-sound', 'genreIds[]', 'pop'))?.name,
    ).toBe('manila-sound');
    expect(
      knownWrongFor(
        row(
          'song',
          'x',
          'credits[]',
          { name: 'Someone', role: 'producer' },
          {
            requires: [
              { kind: 'artist', slug: 'portland-maine', body: { name: 'P' } },
            ],
          },
        ),
      )?.name,
    ).toBe('portland-maine');
    expect(knownWrongFor(row('artist', 'portland', 'group', true))).toBeNull();
  });

  it('starts with the four entries the design names, then those the import of 30 September found', () => {
    expect(KNOWN_WRONG.map((entry) => entry.name)).toEqual([
      'hallelujah-progression',
      'sweet-dreams-compilation',
      'portland-maine',
      'manila-sound',
      'dock-of-the-bay-film-producers',
      'dock-of-the-bay-film-producers',
      'dock-of-the-bay-1964-album',
      'eric-clapton-still-active',
    ]);
    const producer = row('song', 'sittin_on_the_dock_of_the_bay', 'credits[]', {
      name: 'Jerry Bruckheimer',
      role: 'producer',
      artistGlobeId: 'jerry-bruckheimer',
    });
    expect(knownWrongFor(producer)?.name).toBe(
      'dock-of-the-bay-film-producers',
    );
    expect(
      knownWrongFor(
        row('song', 'sittin_on_the_dock_of_the_bay', 'credits[]', {
          name: 'Steve Cropper',
          role: 'producer',
          artistGlobeId: 'steve-cropper',
        }),
      ),
    ).toBeNull();
  });
});

describe('rows their own evidence doubts', () => {
  const at = (path: string, evidence: string[]) =>
    row('artist', 'kraftwerk', path, 2003, { evidence, tier: 'likely' });

  it('holds an activeTo another source says has not ended', () => {
    const ended = at('activeTo', [
      'Wikidata work period end 2003',
      'MusicBrainz says the group has not ended',
    ]);
    expect(doubtOf(ended)).toBe('another source says the group has not ended');
    expect(doubtOf(at('activeTo', ['Wikidata work period end 2003']))).toBe(
      null,
    );
    expect(reasonOf(judged([ended], {}).get(ended.id))).toBe('doubtful');
  });

  it('holds a song row read from a recording dated otherwise, or an album years later', () => {
    const song = (evidence: string[]) =>
      row('song', 'september', 'releases[]', { releaseId: 'x' }, { evidence });
    expect(doubtOf(song(["our year 1968 and MusicBrainz's 1964 differ"]))).toBe(
      'the recording it was read from is dated other than the song',
    );
    expect(
      doubtOf(
        song(['the album came out in 2013, 35 years after the recording']),
      ),
    ).toBe('the album came out 35 years after the recording');
    // Two years on is still the song's own album (Despacito on Vida).
    expect(
      doubtOf(
        song(['the album came out in 2019, 2 years after the recording']),
      ),
    ).toBeNull();
  });

  it('leaves a decided row as decided', () => {
    const ended = at('activeTo', ['MusicBrainz says the group has not ended']);
    expect(
      reasonOf(
        judged([ended], {}, { decided: { [ended.id]: 'rejected' } }).get(
          ended.id,
        ),
      ),
    ).toBe('decided');
  });
});

describe('ranking one field', () => {
  const at = (value: unknown, extra: Partial<Suggestion>) =>
    row('artist', 'a', 'born.date', value, extra);

  it('takes the surer tier, then the higher confidence, then more providers', () => {
    const likely = at('1939', { tier: 'likely', confidence: 0.95 });
    const sure = at('1940', { tier: 'sure', confidence: 0.85 });
    expect(rankField([likely, sure]).winner).toBe(sure);
    const lower = at('1941', { confidence: 0.8 });
    expect(rankField([lower, sure]).winner).toBe(sure);
    const one = at('1942', { tier: 'sure', confidence: 0.85 });
    const two = at('1943', {
      tier: 'sure',
      confidence: 0.85,
      sources: [MB, WD],
    });
    expect(rankField([one, two])).toEqual({ winner: two, others: [one] });
  });

  it('writes nothing when the top two tie', () => {
    const mb = at('1982', { tier: 'likely', confidence: 0.84 });
    const wd = at('1983', {
      tier: 'likely',
      confidence: 0.84,
      sources: [WD],
    });
    const worse = at('1984', { tier: 'likely', confidence: 0.5 });
    const ranked = rankField([worse, mb, wd]);
    expect(ranked.winner).toBeNull();
    expect(ranked.others).toHaveLength(3);
  });
});

describe('judging rows', () => {
  it('takes an open row resting on an identity it trusts, and never writes the identity', () => {
    const born = row('artist', 'marvin-gaye', 'born.date', '1939-04-02', {
      dependsOn: ID.id,
    });
    const verdicts = judged([ID, born], { 'artist:marvin-gaye': MARVIN });
    expect(reasonOf(verdicts.get(ID.id))).toBe('identity');
    expect(verdicts.get(born.id)).toEqual({ state: 'take' });
  });

  it('leaves out an ambiguous row, and every row resting on it', () => {
    const unsure = { ...ID, tier: 'ambiguous' as const };
    const born = row('artist', 'marvin-gaye', 'born.date', '1939', {
      dependsOn: unsure.id,
    });
    const genre = row('artist', 'marvin-gaye', 'activeFrom', 1961, {
      tier: 'ambiguous',
    });
    const verdicts = judged([unsure, born, genre], {
      'artist:marvin-gaye': MARVIN,
    });
    expect(reasonOf(verdicts.get(unsure.id))).toBe('ambiguous');
    expect(verdicts.get(born.id)).toMatchObject({
      state: 'skip',
      reason: 'rests-on-skipped',
      rows: [unsure.id],
    });
    expect(reasonOf(verdicts.get(genre.id))).toBe('ambiguous');
  });

  it('leaves out the rows resting on an identity someone rejected', () => {
    const born = row('artist', 'marvin-gaye', 'born.date', '1939', {
      dependsOn: ID.id,
    });
    const verdicts = judged(
      [ID, born],
      { 'artist:marvin-gaye': MARVIN },
      { decided: { [ID.id]: 'rejected' } },
    );
    expect(reasonOf(verdicts.get(ID.id))).toBe('decided');
    expect(reasonOf(verdicts.get(born.id))).toBe('rests-on-skipped');
  });

  it('goes in waves: a Label row waits for the Album row its release comes from', () => {
    const album = row(
      'song',
      'whats_going_on',
      'releases[]',
      { releaseId: 'wgo' },
      { dependsOn: ID.id },
    );
    const label = row('release', 'wgo', 'labelId', 'tamla', {
      dependsOn: album.id,
    });
    const song: Body = { id: 'whats_going_on', title: 'What’s Going On' };
    const first = judged([ID, album, label], {
      'artist:marvin-gaye': MARVIN,
      'song:whats_going_on': song,
    });
    expect(first.get(album.id)).toEqual({ state: 'take' });
    expect(first.get(label.id)).toEqual({ state: 'wait', on: album.id });
    // The next wave: the album row went in, and made the release.
    const second = judged([ID, album, label], {
      'artist:marvin-gaye': MARVIN,
      'song:whats_going_on': { ...song, releases: [{ releaseId: 'wgo' }] },
      'release:wgo': { slug: 'wgo', title: 'What’s Going On' },
    });
    expect(reasonOf(second.get(album.id))).toBe('already');
    expect(second.get(label.id)).toEqual({ state: 'take' });
  });

  it('leaves out a row resting on one a save refused, and does not offer that one again', () => {
    const album = row('song', 's', 'releases[]', { releaseId: 'bad--slug' });
    const label = row('release', 'bad--slug', 'labelId', 'x', {
      dependsOn: album.id,
    });
    const verdicts = judged(
      [album, label],
      { 'song:s': { id: 's' } },
      {
        refused: new Set([album.id]),
      },
    );
    expect(reasonOf(verdicts.get(album.id))).toBe('refused');
    expect(reasonOf(verdicts.get(label.id))).toBe('rests-on-skipped');
  });

  it('writes one value per field: a strict winner, and nothing on a tie', () => {
    const live = { 'artist:a': { slug: 'a', name: 'A' } };
    const winner = row('artist', 'a', 'activeFrom', 1961);
    const loser = row('artist', 'a', 'activeFrom', 1960, {
      tier: 'likely',
      confidence: 0.8,
    });
    const mb = row('artist', 'a', 'born.date', '1982', {
      tier: 'likely',
      confidence: 0.84,
    });
    const wd = row('artist', 'a', 'born.date', '1983', {
      tier: 'likely',
      confidence: 0.84,
      sources: [WD],
    });
    const resting = row('artist', 'a', 'born.placeId', 'oslo', {
      dependsOn: loser.id,
    });
    const verdicts = judged([winner, loser, mb, wd, resting], live);
    expect(verdicts.get(winner.id)).toEqual({ state: 'take' });
    expect(verdicts.get(loser.id)).toMatchObject({
      state: 'skip',
      reason: 'lost',
      rows: [winner.id],
    });
    expect(reasonOf(verdicts.get(mb.id))).toBe('sources-disagree');
    expect(reasonOf(verdicts.get(wd.id))).toBe('sources-disagree');
    expect(reasonOf(verdicts.get(resting.id))).toBe('rests-on-skipped');
  });

  it('takes every row adding to a list', () => {
    const live = { 'artist:a': { slug: 'a', name: 'A' } };
    const soul = row('artist', 'a', 'genreIds[]', 'soul');
    const funk = row('artist', 'a', 'genreIds[]', 'funk', { tier: 'likely' });
    const verdicts = judged([soul, funk], live);
    expect(verdicts.get(soul.id)).toEqual({ state: 'take' });
    expect(verdicts.get(funk.id)).toEqual({ state: 'take' });
  });

  it('never writes over a stated value, and says what is there', () => {
    const live = { 'artist:a': { slug: 'a', name: 'A', activeFrom: 1964 } };
    const later = row('artist', 'a', 'activeFrom', 1965);
    const same = row('artist', 'a', 'activeFrom', 1964, { tier: 'likely' });
    const verdicts = judged([later, same], live);
    expect(verdicts.get(later.id)).toMatchObject({
      reason: 'conflict',
      current: 1964,
    });
    expect(reasonOf(verdicts.get(same.id))).toBe('already');
  });

  it('fills a song’s credits only when it had none, and its year only when it has none', () => {
    const bare: Body = { id: 'bare', title: 'Bare' };
    const credited: Body = {
      id: 'credited',
      title: 'Credited',
      year: 1971,
      credits: [{ name: 'Someone', role: 'songwriter' }],
    };
    const credit = (slug: string) =>
      row('song', slug, 'credits[]', { name: 'Else', role: 'producer' });
    const year = (slug: string) => row('song', slug, 'year', 1970);
    const all = [
      credit('bare'),
      year('bare'),
      credit('credited'),
      year('credited'),
    ];
    const live = { 'song:bare': bare, 'song:credited': credited };
    const verdicts = judged(all, live);
    expect(verdicts.get(all[0].id)).toEqual({ state: 'take' });
    expect(verdicts.get(all[1].id)).toEqual({ state: 'take' });
    expect(reasonOf(verdicts.get(all[2].id))).toBe('student-visible-filled');
    expect(reasonOf(verdicts.get(all[3].id))).toBe('conflict');

    // Credits count as the run found them, not as the waves left them.
    const afterWave = judged(
      [credit('bare')],
      { 'song:bare': { ...bare, credits: [{ name: 'X', role: 'engineer' }] } },
      { start: live },
    );
    expect(afterWave.get(credit('bare').id)).toEqual({ state: 'take' });

    // --hold-student-visible holds both back.
    const held = judged(all, live, { holdStudentVisible: true });
    expect(reasonOf(held.get(all[0].id))).toBe('held');
    expect(reasonOf(held.get(all[1].id))).toBe('held');
  });

  it('keeps a row resting on one outside the groups asked for out of scope with it, to be judged in its turn', () => {
    const album = row('song', 's', 'releases[]', { releaseId: 'r' });
    const label = row('release', 'r', 'labelId', 'tamla', {
      dependsOn: album.id,
    });
    const verdicts = judged(
      [album, label],
      { 'song:s': { id: 's' } },
      {
        inScope: (kind) => kind === 'release',
      },
    );
    expect(reasonOf(verdicts.get(album.id))).toBe('out-of-scope');
    expect(verdicts.get(label.id)).toMatchObject({
      state: 'skip',
      reason: 'out-of-scope',
      rows: [album.id],
    });
  });

  it('leaves out what KNOWN_WRONG lists, and what is out of scope', () => {
    const wrong = row(
      'globe_event',
      'evt-opm-manila-1978',
      'artistIds',
      ['manila-sound'],
      { sources: [APP], tier: 'likely' },
    );
    const event = row('globe_event', 'evt-b', 'placeId', 'lagos', {
      sources: [APP],
    });
    const genre = row('artist', 'a', 'genreIds[]', 'soul');
    const live = {
      'globe_event:evt-opm-manila-1978': { id: 'evt-opm-manila-1978' },
      'globe_event:evt-b': { id: 'evt-b' },
      'artist:a': { slug: 'a', name: 'A' },
    };
    const verdicts = judged([wrong, event, genre], live, {
      inScope: (kind) => groupOf(kind) === 'artists',
    });
    expect(reasonOf(verdicts.get(wrong.id))).toBe('out-of-scope');
    expect(reasonOf(verdicts.get(event.id))).toBe('out-of-scope');
    expect(verdicts.get(genre.id)).toEqual({ state: 'take' });
    const all = judged([wrong, event, genre], live);
    expect(reasonOf(all.get(wrong.id))).toBe('known-wrong');
    expect(all.get(event.id)).toEqual({ state: 'take' });
  });
});

describe('names two records share', () => {
  const people = [
    {
      kind: 'artist',
      slug: 'mick-jones-the-clash',
      body: { name: 'Mick Jones' },
    },
    {
      kind: 'artist',
      slug: 'mick-jones-foreigner',
      body: { name: 'mick  jones' },
    },
    { kind: 'artist', slug: 'the-clash', body: { name: 'The Clash' } },
  ];
  const namesakes = namesakesOf(people);

  it('finds the others of a kind with the same name, case and spacing aside', () => {
    expect(namesakes('artist', 'mick-jones-the-clash')).toEqual([
      'mick-jones-foreigner',
    ]);
    expect(namesakes('artist', 'the-clash')).toEqual([]);
    expect(namesakes('artist', 'nobody')).toEqual([]);
  });

  it('holds back an app link found by a name two artists share, and nothing the importer links by id', () => {
    const live = {
      'globe_event:evt-clash': { id: 'evt-clash' },
      'song:s': { id: 's' },
    };
    const byName = row(
      'globe_event',
      'evt-clash',
      'artistIds',
      ['the-clash', 'mick-jones-foreigner'],
      { sources: [APP] },
    );
    const clear = row('globe_event', 'evt-clash', 'placeId', 'london', {
      sources: [APP],
    });
    const credit = row('song', 's', 'credits[]', {
      name: 'Mick Jones',
      role: 'songwriter',
      artistGlobeId: 'mick-jones-the-clash',
    });
    const verdicts = judged([byName, clear, credit], live, { namesakes });
    expect(verdicts.get(byName.id)).toMatchObject({
      state: 'skip',
      reason: 'ambiguous',
    });
    expect(verdicts.get(clear.id)).toEqual({ state: 'take' });
    expect(verdicts.get(credit.id)).toEqual({ state: 'take' });
  });
});

describe('the gate', () => {
  it('lets the import add, and catches anything it would write over', () => {
    const before = {
      born: { date: '1939' },
      credits: [{ name: 'A', role: 'producer' }],
    };
    expect(
      overwrittenPaths(before, {
        born: { date: '1939', placeId: 'dc' },
        credits: [
          { name: 'A', role: 'producer' },
          { name: 'B', role: 'engineer' },
        ],
        year: 1971,
      }),
    ).toEqual([]);
    expect(
      overwrittenPaths(before, {
        born: { date: '1940' },
        credits: [],
      }),
    ).toEqual(['born.date', 'credits (shortened)']);
    expect(overwrittenPaths(before, { credits: before.credits })).toEqual([
      'born (taken out)',
    ]);
  });

  it('allows only what the rules say students may see change', () => {
    const song = {
      id: 's',
      title: 'S',
      session: { studio: 'Hitsville' },
    };
    const hold = { hold: false };
    expect(
      studentVisibleChanges(
        'song',
        song,
        {
          ...song,
          year: 1971,
          credits: [{ name: 'A', role: 'producer' }],
          releases: [{ releaseId: 'r' }],
          session: { studio: 'Hitsville', studioId: 'hitsville' },
        },
        hold,
      ),
    ).toEqual([]);
    expect(
      studentVisibleChanges(
        'song',
        song,
        { ...song, title: 'T', session: { studio: 'Other' } },
        hold,
      ),
    ).toEqual([
      'title (not a field the import writes on a song)',
      'session.studio (students read it)',
    ]);
    expect(
      studentVisibleChanges(
        'song',
        { ...song, year: 1970 },
        { ...song, year: 1971 },
        hold,
      ),
    ).toEqual(['year (students read it, and it was filled)']);
    expect(
      studentVisibleChanges(
        'song',
        song,
        { ...song, year: 1971 },
        {
          hold: true,
        },
      ),
    ).toEqual(['year (held back, and changed)']);
  });

  it('keeps every pin where it is', () => {
    const event = { id: 'e', location: { lat: 1, lng: 2 } };
    expect(
      studentVisibleChanges(
        'globe_event',
        event,
        { ...event, artistIds: ['a'], placeId: 'p' },
        { hold: false },
      ),
    ).toEqual([]);
    expect(
      studentVisibleChanges(
        'globe_event',
        event,
        { ...event, location: { lat: 3, lng: 2 } },
        { hold: false },
      ),
    ).toEqual(['location (not a field the import writes on a globe event)']);
    expect(
      studentVisibleChanges(
        'globe_city',
        { id: 'c', name: 'C' },
        { id: 'c', name: 'C', description: 'd' },
        { hold: false },
      ),
    ).toHaveLength(1);
    expect(
      studentVisibleChanges(
        'globe_city',
        undefined,
        { id: 'n', pin: false },
        { hold: false },
      ),
    ).toEqual([]);
    expect(
      studentVisibleChanges(
        'globe_city',
        undefined,
        { id: 'n' },
        {
          hold: false,
        },
      ),
    ).toEqual(['a new place the globe would pin (pin is not false)']);
    expect(
      studentVisibleChanges(
        'artist',
        { slug: 'a', name: 'A' },
        { slug: 'a', name: 'B', genreIds: ['soul'] },
        { hold: false },
      ),
    ).toEqual(['name (a roster field the globe reads)']);
  });

  it('finds a text naming an outside catalogue, and not a name that only looks like an id', () => {
    expect(
      sourceMentions(
        "source: 'https://musicbrainz.org/artist/afdb7919-059d-43c1-b668-ba1d265e7e42', see Wikidata; MetaBrainz; mbid; externalIds; unverified: true",
      ),
    ).toEqual([
      'musicbrainz',
      'afdb7919-059d-43c1-b668-ba1d265e7e42',
      'Wikidata',
      'MetaBrainz',
      'mbid',
      'externalIds',
      'unverified',
    ]);
    // Band and song names are not ids: Q65, the word "brainz" alone.
    expect(sourceMentions("{ name: 'Q65', title: 'Brainz' }")).toEqual([]);
    expect(sourceMentions(null)).toEqual([]);
  });

  it('counts only the mentions a write adds', () => {
    const comment = '// ties broken by MusicBrainz\n';
    expect(addedSourceMentions(comment, `${comment}x = 1;\n`)).toEqual([]);
    expect(
      addedSourceMentions(comment, `${comment}// and musicbrainz again\n`),
    ).toEqual(['musicbrainz']);
    expect(addedSourceMentions(null, 'from wikidata')).toEqual(['wikidata']);
  });

  it('names the two student-visible fields', () => {
    expect(
      studentVisibleField({ target: { kind: 'song', slug: 's' }, path: 'year' })
        ?.name,
    ).toBe('song-year');
    expect(
      studentVisibleField({
        target: { kind: 'song', slug: 's' },
        path: 'credits[2].artistGlobeId',
      })?.name,
    ).toBe('song-credits');
    expect(
      studentVisibleField({
        target: { kind: 'song', slug: 's' },
        path: 'releases[]',
      }),
    ).toBeNull();
  });
});
