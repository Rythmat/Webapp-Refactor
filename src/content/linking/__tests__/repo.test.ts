import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import ARTIST_LOCATIONS from '@/scripts/artistLocations.json';
import { mergeSuggestions, planStageOne } from '..';
import { applySuggestion } from '../../suggestions/apply';
import { whyNotBulk } from '../../suggestions/status';

/**
 * Stage 1 on the repo's own data: what the owner will be offered, pinned.
 * A change to the matcher, the city registry or the data moves these, and
 * should — the design promises these numbers (Amendment 5, §5.1), so a
 * change is a decision, not a drift.
 *
 * Where they differ from the design's, it is the data or a rule that moved,
 * not a miscount:
 *  - event artists are 687 events / 815 pairs, not 688 / 816:
 *    evt-folktradition-portland-2000 names Portland, Maine only by the tag
 *    'portland maine', which is the city with its state, not the registry
 *    entry of that name (deriveGraph.test.ts says the same of the graph).
 *    evt-portlandmusic-portland-2012 still matches — its title opens on the
 *    name and the tag confirms it — and is `likely`: the name is a place's;
 *  - of those, 464 lists are sure, not 489: a list naming a place or a
 *    genre ('Portland, Maine', 'Manila Sound'), a name the registry writes
 *    as the end of a sentence ('Congo Square:', 'Phil Collins''), or "The"
 *    and one word ('The Roots', 'The Internet') is `likely`;
 *  - event songs are 41 pairs on 38 events, as the graph draws them;
 *  - event places are 943 sure (933 by name, 10 settled by the pin: the
 *    Portlands, the Charlestons and 'Washington' at Washington D.C.), one
 *    likely whose pin is 182 km from its city, and 139 to make first;
 *  - song pins: 96 entries (not 102) need 85 new places (not 84): the six
 *    'Washington' pins are Washington D.C., and three pins whose name is a
 *    registered city far away (San Jose, Halifax, Athens) need their own.
 *    328 acts are offered a City, not ≈250 plus the joint billings: 10
 *    registry records that are themselves a billing of two acts ('Stevie
 *    Wonder/Chaka Khan') are listed with the joint billings instead;
 *  - the owner's duplicate merge (30 Sep 2026) moved these: 13 pins went
 *    (362 → 349). Twelve were under a removed spelling: eleven in the same
 *    city as the act's own pin, and Joe Legend's Ottawa, dropped for John
 *    Legend's own Springfield. The thirteenth was Remind In Light's, the
 *    album title read as an artist, which repeated Talking Heads' New York.
 *    CCR's and Remind In Light's were the last two to go, so two fewer acts
 *    are offered a City (330 → 328): one in a registered city, and CCR's El
 *    Cerrito, which Creedence Clearwater Revival's own pin still asks for
 *    (97 → 96 entries, still 85 places). Andy Grammer's pin is found by his
 *    slug now that its key is spelt right, no longer through an alias, and
 *    the Lady Marmalade billing lost its stray comma. The Rufus pin is the
 *    band's now rather than a billing's, and the Average White Band's Dundee
 *    event finds "Pick Up The Pieces" because the song and the event now
 *    name one act;
 *  - progression songs are 10 sure and 2 likely, not 5 and 6: sheets that
 *    name several songs are read one song at a time, 'Juice Lizzo' and
 *    'Can't Stop the Feeling- JT' are read, and a title whose sheet names
 *    another artist ('Stay- Rihanna', 'Changes (Tupac)') is not offered;
 *  - 69 songs have no year, not 71 (the library has 638 songs): 49 are
 *    offered, the 20 others hold the placeholder.
 */

const input = {
  songs: Object.values(BUNDLED_SONGS),
  progressions: LIB,
  artists: ARTIST_REGISTRY,
  places: CITIES,
  events: BUNDLED_MUSIC_HISTORY,
  artistLocations: Object.entries(ARTIST_LOCATIONS).map(([id, pin]) => ({
    id,
    ...pin,
  })),
};
const plan = planStageOne(input);
const tiers = (planned: typeof plan.planned) =>
  planned.reduce<Record<string, number>>((counts, { suggestion }) => {
    counts[suggestion.tier] = (counts[suggestion.tier] ?? 0) + 1;
    return counts;
  }, {});

describe('Stage 1 on the repo data', () => {
  it('offers each hand-authored event its artists: sure only with no one-word name', () => {
    expect(plan.eventArtists.report).toMatchObject({
      events: 1083,
      matched: 687,
      pairs: 815,
      sure: { events: 464, pairs: 536 },
      likely: { events: 223, pairs: 279 },
      unmatched: 396,
      doubtfulArtists: [
        { slug: 'congo-square', why: 'spelling' },
        { slug: 'lil-hardin-armstrong', why: 'spelling' },
        { slug: 'manila-sound', why: 'genre' },
        { slug: 'melba-liston', why: 'spelling' },
        { slug: 'phil-collins', why: 'spelling' },
        { slug: 'portland-maine', why: 'place' },
      ],
    });
    expect(plan.eventArtists.report.oneWordArtists).toHaveLength(169);
    expect(tiers(plan.eventArtists.planned)).toEqual({
      sure: 464,
      likely: 223,
    });
    const tierOf = (id: string) =>
      plan.eventArtists.planned.find((p) => p.suggestion.target.slug === id)
        ?.suggestion.tier;
    // A city, and a tag on Louis Armstrong's visit to Accra: never in bulk.
    expect(tierOf('evt-portlandmusic-portland-2012')).toBe('likely');
    expect(tierOf('evt-diaspora-accra-armstrong-1956')).toBe('likely');
    expect(tierOf('evt-folktradition-portland-2000')).toBeUndefined();
  });

  it('offers the songs those events name, all sure', () => {
    expect(plan.eventSongs.report).toMatchObject({ matched: 38, pairs: 41 });
    expect(tiers(plan.eventSongs.planned)).toEqual({ sure: 38 });
  });

  it('places every hand-authored event, and makes the cities that are none of ours', () => {
    const { report } = plan.eventPlaces;
    expect(report).toMatchObject({
      events: 1083,
      noCity: 0,
      byName: 933,
      byCoordinates: 10,
      toCreate: { events: 139, places: 104 },
      sure: 943,
      likely: 140,
    });
    expect(report.far).toEqual([
      {
        event: 'evt-blues-mississippi-1936',
        city: 'Clarksdale',
        placeId: 'clarksdale-ms',
        km: 182,
      },
    ]);
    expect(report.unresolved).toHaveLength(139);
    expect(report.unresolved.every((u) => u.placeId)).toBe(true);
  });

  it('offers the song-pin cities as likely Cities, and lists every pin it cannot', () => {
    const { report } = plan.hometowns;
    expect(report).toMatchObject({
      entries: 349,
      artists: { bySlug: 339, byName: 0 },
      basedIn: 328,
      born: 0,
      existingPlace: 233,
      newPlace: { entries: 96, places: 85 },
      unplaceable: [],
      repeated: [
        {
          slug: 'earth-wind-and-fire',
          keys: ['earth, wind and fire', 'earth, wind, and fire'],
        },
      ],
    });
    expect(tiers(plan.hometowns.planned)).toEqual({ likely: 328 });
    expect(report.jointBillings.map((j) => [j.key, j.record])).toEqual([
      ['a great big world and christina aguilera', undefined],
      [
        'alicia keys and justin timberlake',
        'alicia-keys-and-justin-timberlake',
      ],
      ['blackstreet and dr. dre', undefined],
      [
        "christina aguilera, lil' kim, mya, pink",
        'christina-aguilera-lil-kim-mya-pink',
      ],
      [
        'darius rucker/old crow medicine show',
        'darius-rucker-old-crow-medicine-show',
      ],
      ['drake/scary pockets', 'drake-scary-pockets'],
      ['frankie valli and the four seasons', undefined],
      [
        'justin timberlake, chris stapleton',
        'justin-timberlake-chris-stapleton',
      ],
      ['lou donaldson/soulive', 'lou-donaldson-soulive'],
      [
        'michael jackson and justin timberlake',
        'michael-jackson-and-justin-timberlake',
      ],
      [
        'rihanna, kanye west and paul mccartney',
        'rihanna-kanye-west-and-paul-mccartney',
      ],
      ['stevie wonder/chaka khan', 'stevie-wonder-chaka-khan'],
      ['the beatles/isley brothers', 'the-beatles-isley-brothers'],
    ]);
    // None is a letter from another act any more: the six that were
    // (Marivn Gaye and the like) were merged into the act they misspelt.
    expect(report.nearDuplicates).toEqual([]);
    expect(report.dropped.map((d) => d.key)).toEqual([
      'es una historia – i am singing – stevie wonder',
      'traditional',
    ]);
    expect(
      report.missingArtists.map((m) => [m.slug, m.placeId, m.collision]),
    ).toEqual([
      ['chicago', 'chicago', 'place'],
      ['jamie-lidell', 'london', undefined],
      ['kenny-loggins', 'seattle', undefined],
      ['patti-labelle', 'philadelphia', undefined],
      ['roberta-flack', 'washington-dc', undefined],
    ]);
  });

  it('offers the songs the progression sheets name', () => {
    // Twelve offers (10 sure, 2 likely) on twelve sheets already linked,
    // until the bulk import of 30 September 2026 linked eleven songs on nine
    // more sheets: 198, 199, 276, 384, 445, 452 (three songs), 644, 680 and
    // 688. Only sheet 578's Hallelujah is still offered: it is a different
    // song (the import's known-wrong list), for a person to reject.
    expect(plan.progressionSongs.report).toMatchObject({
      withText: 76,
      named: 80,
      linked: 21,
      sure: 0,
      likely: 1,
    });
    expect(plan.progressionSongs.report.unmatched).toHaveLength(55);
    expect(plan.progressionSongs.report.disagree).toEqual([
      expect.objectContaining({ progression: 528, songId: 'changes' }),
    ]);
    expect(
      plan.progressionSongs.planned.map((p) => [
        p.suggestion.target.slug,
        p.suggestion.value,
        p.suggestion.tier,
      ]),
    ).toEqual([['578', 'hallelujah_i_love_her_so', 'likely']]);
  });

  it('offers a year to no undated song: the eleven left hold the placeholder', () => {
    // 69 songs had no year, and 49 of them were offered their event's,
    // until the bulk import of 30 September 2026 dated 58: those 49 and nine
    // of the twenty on the placeholder, from the catalogue. The eleven left
    // hold the placeholder, so nothing is offered.
    expect(plan.songYears.report).toMatchObject({
      undated: 11,
      noEvent: 0,
      placeholder: 11,
      offered: 0,
    });
    expect(plan.songYears.planned).toEqual([]);
  });

  it('bulk-accepts only the sure tier, and never a City or a year', () => {
    const bulk = plan.planned.filter(
      ({ suggestion }) => whyNotBulk(suggestion, 'open') === null,
    );
    // 464 event artist lists, 38 song lists, 943 places. (And 10 progression
    // songs, 1,455 in all, until the bulk import of 30 September 2026 linked
    // them.)
    expect(bulk).toHaveLength(1445);
    expect(
      bulk.some(({ suggestion }) =>
        ['basedInPlaceId', 'born.placeId', 'year'].includes(suggestion.path),
      ),
    ).toBe(false);
  });

  it('makes each new place once, before anything that needs it', () => {
    // 104 for events, 85 for song pins; 20 are asked for by both.
    expect(plan.requires).toHaveLength(169);
    expect(plan.requires.every((r) => r.kind === 'globe_city')).toBe(true);
    const bodies = new Map(plan.requires.map((r) => [r.slug, r.body]));
    for (const { suggestion } of plan.planned)
      for (const record of suggestion.requires ?? [])
        expect(record.body).toEqual(bodies.get(record.slug));
  });

  it('writes every suggestion onto the body it was planned from', () => {
    const bodies = new Map<string, Record<string, unknown>>();
    for (const e of input.events) bodies.set(`globe_event:${e.id}`, { ...e });
    for (const a of input.artists) bodies.set(`artist:${a.slug}`, { ...a });
    for (const s of input.songs) bodies.set(`song:${s.id}`, { ...s });
    for (const p of input.progressions)
      bodies.set(`chord_progression:${p.id}`, { ...p });
    // Every one was open on an empty field until the bulk import of 30
    // September 2026 wrote them. Now a suggestion the files hold reads as
    // applied and writes nothing more; one still open writes; and one whose
    // field the import filled from the store as it stood (the roster with
    // the artists and places it made, which these lists leave out) reads as
    // a conflict and writes nothing: 54 event artist lists that also name,
    // say, Kurt Cobain beside Nirvana, and 3 event places it made.
    const ids = new Set<string>();
    const states: Record<string, number> = {};
    for (const { suggestion, precondition } of plan.planned) {
      states[precondition.state] = (states[precondition.state] ?? 0) + 1;
      const body = bodies.get(
        `${suggestion.target.kind}:${suggestion.target.slug}`,
      );
      expect(body, suggestion.id).toBeDefined();
      const written = applySuggestion(body!, suggestion, { schemaLevel: 2 });
      if (precondition.state === 'empty')
        expect(written.ok && written.changed, suggestion.id).toBe(true);
      else if (precondition.state === 'applied')
        expect(written.ok && !written.changed, suggestion.id).toBe(true);
      else expect(written.ok, suggestion.id).toBe(false);
      ids.add(suggestion.id);
    }
    expect(ids.size).toBe(plan.planned.length);
    // Open: 3 event artist lists (the namesakes the import left alone), the
    // 328 Cities from song pins (the import wrote its Cities into the
    // console's artist records, which these lists leave out) and the
    // Hallelujah progression it knows is wrong.
    expect(states).toEqual({ applied: 1748, conflict: 57, empty: 332 });
    // The progression songs and the years it wrote are planned no more.
    expect(plan.planned).toHaveLength(687 + 38 + 1083 + 328 + 1 + 0);
  });

  it('plans the same suggestions, with the same ids, every time', () => {
    const again = planStageOne({
      ...input,
      // Another order of the same data.
      events: [...input.events].reverse(),
      artistLocations: [...input.artistLocations].reverse(),
    });
    const key = (p: (typeof plan.planned)[number]) =>
      JSON.stringify(p.suggestion);
    expect(again.planned.map(key).sort()).toEqual(plan.planned.map(key).sort());
  });

  it('is one suggestion where the importer offers the same fact', () => {
    const [city] = plan.hometowns.planned;
    const imported = {
      ...city.suggestion,
      sources: [{ provider: 'musicbrainz' as const, label: 'area' }],
      evidence: ['area'],
      tier: 'sure' as const,
      confidence: 0.92,
      batch: 'mb-test',
    };
    const merged = mergeSuggestions([city.suggestion], [imported]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: city.suggestion.id,
      tier: 'sure',
      confidence: 0.92,
      sources: [...city.suggestion.sources, ...imported.sources],
      // The importer's run, whichever is read first: its calibration
      // decides whether the row can go in a bulk accept.
      batch: 'mb-test',
    });
    expect(mergeSuggestions([imported], [city.suggestion])[0].batch).toBe(
      'mb-test',
    );
  });
});
