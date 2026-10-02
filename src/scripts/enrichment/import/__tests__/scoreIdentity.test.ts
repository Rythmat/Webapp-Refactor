import { describe, expect, it } from 'vitest';
import {
  areaIsCity,
  flagSharedPicks,
  NOT_SURE_CAP,
  releaseTitleIn,
  sameCityName,
  scoreCandidate,
  scoreIdentity,
  WEIGHTS,
} from '../scoreIdentity';
import {
  area,
  candidate,
  evidence,
  mbid,
  songCandidate,
} from './scoreFixtures';

const event = (id: string, title: string, more = {}) => ({
  id,
  title,
  text: title,
  ...more,
});

describe('each signal, on its own', () => {
  it('scores the name: 0.35 exact, 0.25 when only an alias or sort name is ours', () => {
    const artist = evidence();
    expect(scoreCandidate(artist, candidate(1)).score).toBe(WEIGHTS.name);
    const aliased = scoreCandidate(
      artist,
      candidate(2, { name: 'Marvin Gay', aliases: ['Marvin Gaye'] }),
    );
    expect(aliased.score).toBe(WEIGHTS.alias);
    expect(aliased.reasons).toEqual(['alias "Marvin Gaye"']);
    // "The" and case never matter.
    expect(
      scoreCandidate(
        evidence({ name: 'The Beatles' }),
        candidate(3, { name: 'beatles' }),
      ).score,
    ).toBe(WEIGHTS.name);
  });

  it('scores a song credited on its own record 0.40, on compilations only 0.20', () => {
    const strong = evidence({
      songCandidates: [songCandidate(1, ['lets_get_it_on'])],
    });
    const scored = scoreCandidate(strong, candidate(1));
    expect(scored.score).toBeCloseTo(WEIGHTS.name + WEIGHTS.song);
    expect(scored.songEvidence).toBe('strong');
    expect(scored.reasons[1]).toContain('"Let\'s Get It On"');

    const weak = evidence({
      songCandidates: [songCandidate(1, ['lets_get_it_on'], [])],
    });
    const weakly = scoreCandidate(weak, candidate(1));
    expect(weakly.score).toBeCloseTo(WEIGHTS.name + WEIGHTS.weakSong);
    expect(weakly.songEvidence).toBe('weak');
    // Another id's songs are not this one's evidence…
    expect(scoreCandidate(strong, candidate(2)).songEvidence).toBe('none');
    // …unless MusicBrainz has merged that id into this one: the old id's
    // billing on the act's own record is the act's.
    const billedTwice = evidence({
      songCandidates: [
        songCandidate(1, ['lets_get_it_on']),
        songCandidate(2, ['whats_going_on'], []),
      ],
      songTitles: {
        lets_get_it_on: "Let's Get It On",
        whats_going_on: "What's Going On",
      },
    });
    expect(scoreCandidate(billedTwice, candidate(2)).songEvidence).toBe('weak');
    const merged = scoreCandidate(
      billedTwice,
      candidate(2, { askedAs: [mbid(1)] }),
    );
    expect(merged.songEvidence).toBe('strong');
    expect(merged.reasons[1]).toContain('"Let\'s Get It On"');
  });

  it('scores a release title named in an event 0.25', () => {
    const artist = evidence({
      events: [
        event(
          'evt-1',
          'Marvin Gaye releases "What\'s Going On", a protest album',
        ),
      ],
    });
    const scored = scoreCandidate(
      artist,
      candidate(1, { releaseTitles: ["What's Going On", 'Trouble Man'] }),
    );
    expect(scored.score).toBeCloseTo(WEIGHTS.name + WEIGHTS.releaseTitle);
    expect(scored.reasons).toContain(
      'release "What\'s Going On" named in event evt-1',
    );
    // Not browsed yet: no evidence either way.
    expect(
      scoreCandidate(artist, candidate(1, { releaseTitles: null })).score,
    ).toBe(WEIGHTS.name);
  });

  it("never counts our song's own single once the song has counted", () => {
    // Billed on a compilation only (+0.20), with a single named like the
    // song: the single is the song again, not a release in our events.
    const artist = evidence({
      songCandidates: [songCandidate(1, ['africa'], [])],
      songTitles: { africa: 'Africa' },
      events: [
        event('song-africa', 'Africa — Toto', {
          text: "Toto release 'Africa'",
        }),
      ],
      years: [1982],
    });
    const scored = scoreCandidate(
      artist,
      candidate(1, {
        name: 'Toto',
        lifeSpan: { begin: '1977' },
        releaseTitles: ['Africa', 'Toto IV'],
      }),
    );
    expect(scored.reasons.some((r) => r.startsWith('release'))).toBe(false);
    // With no song credited to it, the same single is evidence.
    const unbilled = scoreCandidate(
      { ...artist, songCandidates: [] },
      candidate(1, { name: 'Toto', releaseTitles: ['Africa'] }),
    );
    expect(unbilled.reasons).toContain(
      'release "Africa" named in event song-africa',
    );
  });

  it('scores an area that is the song-pin city or an event city 0.10, never a country', () => {
    const pinned = evidence({
      pin: {
        key: 'marvin gaye',
        city: 'Washington',
        country: 'US',
        coordinates: [38.9, -77.04],
        placeId: null,
      },
    });
    expect(
      scoreCandidate(
        pinned,
        candidate(1, { beginArea: area('Washington, D.C.') }),
      ).score,
    ).toBeCloseTo(WEIGHTS.name + WEIGHTS.area);
    const evented = evidence({
      events: [event('evt-1', 'Motown', { city: 'Detroit' })],
    });
    expect(
      scoreCandidate(evented, candidate(1, { area: area('Detroit') })).reasons,
    ).toContain('area Detroit is the city of event evt-1');
    expect(
      scoreCandidate(
        evented,
        candidate(1, { area: area('Detroit', { isCountry: true }) }),
      ).score,
    ).toBe(WEIGHTS.name);
  });

  it('scores a life-span covering at least half the years 0.10', () => {
    const artist = evidence({ years: [1964, 1971, 1973, 1982] });
    const alive = { begin: '1939-04-02', end: '1984-04-01' };
    expect(
      scoreCandidate(artist, candidate(1, { lifeSpan: alive })).score,
    ).toBeCloseTo(WEIGHTS.name + WEIGHTS.lifeSpan);
    // A namesake formed in 2005 covers none of them.
    expect(
      scoreCandidate(artist, candidate(2, { lifeSpan: { begin: '2005' } }))
        .score,
    ).toBe(WEIGHTS.name);
    // No begin, no signal.
    expect(
      scoreCandidate(artist, candidate(3, { lifeSpan: { end: '1984' } })).score,
    ).toBe(WEIGHTS.name);
  });

  it('scores a shared genre 0.05, as a signal', () => {
    const artist = evidence({ genres: new Set(['funk']) });
    const scored = scoreCandidate(
      artist,
      candidate(1, { genres: ['soul', 'motown'] }),
    );
    expect(scored.score).toBeCloseTo(WEIGHTS.name + WEIGHTS.genre);
    expect(scored.reasons).toContain('MusicBrainz genres share funk');
  });
});

describe('release titles in events', () => {
  const events = [
    event('evt-1', 'Toto IV sweeps the Grammys'),
    event('song-africa', 'Africa — Toto'),
    event('evt-2', 'Michael Jackson\'s "Thriller" changes MTV'),
    event('evt-3', 'Toto plays with heart and faith'),
    event('evt-4', 'Chicago Transit Authority debuts in New York'),
    event(
      'evt-5',
      'Bill Haley\'s rock and roll reaches "Rock Around the Clock"',
    ),
  ];

  it('finds a quoted title of any length, an unquoted one of three words or more', () => {
    expect(
      releaseTitleIn(['Chicago Transit Authority'], events, ['Chicago']),
    ).toEqual({ title: 'Chicago Transit Authority', eventId: 'evt-4' });
    expect(releaseTitleIn(['Thriller'], events, ['Michael Jackson'])).toEqual({
      title: 'Thriller',
      eventId: 'evt-2',
    });
    // A song event's own title counts as set apart.
    expect(releaseTitleIn(['Africa'], events, ['Toto'])?.eventId).toBe(
      'song-africa',
    );
    // Two words unquoted are only words: "Toto IV", "heart and faith" too.
    expect(releaseTitleIn(['Toto IV'], events, ['Toto'])).toBeNull();
    expect(releaseTitleIn(['Heart', 'Faith'], events, ['Toto'])).toBeNull();
  });

  it('never counts a genre or a place, or a title it is told to leave out', () => {
    expect(
      releaseTitleIn(['Rock and Roll', 'New York'], events, ['Bill Haley']),
    ).toBeNull();
    expect(
      releaseTitleIn(
        ['Rock Around the Clock'],
        events,
        ['Bill Haley'],
        ['Rock Around the Clock'],
      ),
    ).toBeNull();
    expect(
      releaseTitleIn(['Rock Around the Clock'], events, ['Bill Haley'])
        ?.eventId,
    ).toBe('evt-5');
  });

  it('never counts a self-titled release or a generic one', () => {
    expect(
      releaseTitleIn(
        ['Toto', 'Greatest Hits', 'Live'],
        [event('evt-9', 'Toto: "Toto", "Greatest Hits" and "Live"')],
        ['Toto'],
      ),
    ).toBeNull();
  });
});

describe('tiers', () => {
  const songs = [songCandidate(1, ['lets_get_it_on'])];

  it('is sure at 0.85, likely from 0.6, weak below', () => {
    const sure = scoreIdentity(
      evidence({
        songCandidates: songs,
        years: [1971],
        candidates: [candidate(1, { lifeSpan: { begin: '1939' } })],
      }),
    );
    expect(sure).toMatchObject({ tier: 'sure', confidence: 0.85 });

    const likely = scoreIdentity(
      evidence({
        songCandidates: [songCandidate(1, ['lets_get_it_on'], [])],
        candidates: [candidate(1)],
        years: [1971],
      }),
    );
    // 0.35 + 0.20 = 0.55: weak. Add the life-span: 0.65, likely.
    expect(likely.tier).toBe('weak');
    const withLife = scoreIdentity(
      evidence({
        songCandidates: [songCandidate(1, ['lets_get_it_on'], [])],
        years: [1971],
        candidates: [candidate(1, { lifeSpan: { begin: '1939' } })],
      }),
    );
    expect(withLife).toMatchObject({ tier: 'likely', confidence: 0.65 });
  });

  it('has nothing to say without a candidate', () => {
    expect(scoreIdentity(evidence())).toMatchObject({
      tier: 'none',
      pick: null,
    });
  });

  it('calls it ambiguous when the runner-up is within 0.15, capped at 0.5', () => {
    const result = scoreIdentity(
      evidence({
        name: 'Common',
        oneWord: true,
        years: [2000],
        candidates: [
          candidate(1, { name: 'Common', lifeSpan: { begin: '1972' } }),
          candidate(2, { name: 'Common', disambiguation: 'Finnish band' }),
        ],
      }),
    );
    expect(result.tier).toBe('ambiguous');
    expect(result.confidence).toBe(0.45);
    expect(result.pick?.mbid).toBe(mbid(1));
    expect(result.notes[0]).toMatch(/runner-up Common \(Finnish band\)/);

    const clear = scoreIdentity(
      evidence({
        songCandidates: songs,
        candidates: [candidate(1), candidate(2)],
      }),
    );
    // 0.75 against 0.35: 0.40 apart, not ambiguous.
    expect(clear.tier).toBe('likely');
    const capped = scoreIdentity(
      evidence({
        songCandidates: [
          songCandidate(1, ['lets_get_it_on']),
          songCandidate(2, ['lets_get_it_on']),
        ],
        candidates: [candidate(1), candidate(2)],
      }),
    );
    expect(capped).toMatchObject({ tier: 'ambiguous', confidence: 0.5 });
  });

  it('never makes a one-word name sure without a song on its own record', () => {
    const chicago = (songCandidates = songs) =>
      scoreIdentity(
        evidence({
          name: 'Chicago',
          oneWord: true,
          years: [1970],
          events: [event('evt-1', 'Chicago Transit Authority debuts')],
          songCandidates,
          candidates: [
            candidate(1, {
              name: 'Chicago',
              type: 'Group',
              lifeSpan: { begin: '1967' },
              releaseTitles: ['Chicago Transit Authority'],
              genres: ['rock'],
            }),
          ],
          genres: new Set(['rock']),
        }),
      );
    // 0.35 + 0.25 + 0.10 + 0.05 = 0.75 without songs; the same with a
    // compilation credit on top is 0.95, but still not sure.
    const weakSong = chicago([songCandidate(1, ['saturday'], [])]);
    expect(weakSong.pick?.score).toBe(0.95);
    expect(weakSong.tier).toBe('likely');
    expect(weakSong.confidence).toBe(NOT_SURE_CAP);
    expect(weakSong.notes[0]).toMatch(/one-word name/);
    // With a song on the band's own record it is.
    expect(chicago().tier).toBe('sure');
  });

  it('never trusts a candidate it has not looked up', () => {
    const result = scoreIdentity(
      evidence({
        songCandidates: songs,
        candidates: [candidate(1, { lookedUp: false, releaseTitles: null })],
      }),
    );
    expect(result.tier).toBe('weak');
    expect(result.notes).toContain('the best candidate was never looked up');
  });
});

describe('one MusicBrainz artist picked twice', () => {
  it('keeps both below sure, each naming the other', () => {
    const beatles = (slug: string, name: string) =>
      scoreIdentity(
        evidence({
          slug,
          name,
          songCandidates: [songCandidate(7, ['yesterday'])],
          years: [1965],
          candidates: [
            candidate(7, {
              name: 'The Beatles',
              type: 'Group',
              lifeSpan: { begin: '1960' },
            }),
          ],
        }),
      );
    const results = [
      beatles('beatles', 'Beatles'),
      beatles('the-beatles', 'The Beatles'),
    ];
    expect(results.map((r) => r.tier)).toEqual(['sure', 'sure']);
    expect(flagSharedPicks(results)).toEqual([mbid(7)]);
    expect(results.map((r) => r.tier)).toEqual(['likely', 'likely']);
    expect(results[0].confidence).toBe(NOT_SURE_CAP);
    expect(results[0].notes.at(-1)).toMatch(/best match for the-beatles/);
  });
});

describe('city names', () => {
  it('reads "New York" as "New York City", and "Washington" as "Washington, D.C."', () => {
    expect(sameCityName('New York', 'New York City')).toBe(true);
    expect(sameCityName('Washington', 'Washington, D.C.')).toBe(true);
    expect(sameCityName('Washington', 'Washington D.C.')).toBe(true);
    expect(sameCityName('Newark', 'New York City')).toBe(false);
    // A longer name is another place — unless the two are known to be close.
    expect(sameCityName('Washington', 'Washington Heights')).toBe(false);
    expect(sameCityName('Abingdon', 'Abingdon-on-Thames')).toBe(false);
    expect(sameCityName('Abingdon', 'Abingdon-on-Thames', { near: true })).toBe(
      true,
    );
  });

  it('takes an area for a city only in the same country, and near it when both say where', () => {
    const portland = area('Portland', {
      countryCode: 'US',
      coordinates: [43.66, -70.26],
    });
    const oregon = {
      name: 'Portland',
      country: 'US',
      coordinates: [45.52, -122.68] as [number, number],
    };
    expect(areaIsCity(portland, oregon)).toBe(false);
    expect(
      areaIsCity(portland, { ...oregon, coordinates: [43.65, -70.25] }),
    ).toBe(true);
    // Without coordinates, the country decides.
    const birmingham = area('Birmingham', { countryCode: 'GB' });
    expect(areaIsCity(birmingham, { name: 'Birmingham', country: 'UK' })).toBe(
      true,
    );
    expect(areaIsCity(birmingham, { name: 'Birmingham', country: 'US' })).toBe(
      false,
    );
    // Near each other, a name that begins the other is the same city.
    expect(
      areaIsCity(
        area('Abingdon-on-Thames', {
          countryCode: 'GB',
          coordinates: [51.67, -1.28],
        }),
        { name: 'Abingdon', country: 'UK', coordinates: [51.67, -1.28] },
      ),
    ).toBe(true);
    // ISO codes and the globe's spellings are one country.
    expect(
      areaIsCity(area('Kinshasa', { countryCode: 'CD' }), {
        name: 'Kinshasa',
        country: 'DR Congo',
      }),
    ).toBe(true);
    // Neither known: the name alone, as before.
    expect(
      areaIsCity(area('Detroit', { countryCode: null }), { name: 'Detroit' }),
    ).toBe(true);
  });
});
