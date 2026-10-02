import { describe, expect, it } from 'vitest';
import { parseArgs } from '../args';
import {
  artistLookupUrl,
  artistSearchUrl,
  isMbid,
  MB_USER_AGENT,
  MUSICBRAINZ_HTTP,
  wikidataIdOf,
  wikidataIdsOf,
} from '../musicbrainz';

const TOTO = 'aab5c954-cabe-432e-899e-1c4f99757327';

describe('MusicBrainz requests', () => {
  it('identify the app by name and site, with no email address', () => {
    expect(MB_USER_AGENT).toBe('MusicAtlas/1.0 ( https://musicatlas.io )');
    expect(MB_USER_AGENT).not.toMatch(/@/);
    expect(MUSICBRAINZ_HTTP.minIntervalMs).toBeGreaterThanOrEqual(1100);
  });

  it('search by phrase, escaping what Lucene would read as syntax', () => {
    expect(artistSearchUrl('AC/DC')).toBe(
      'https://musicbrainz.org/ws/2/artist/?query=%22AC%2FDC%22&limit=10&fmt=json',
    );
    const query = new URL(
      artistSearchUrl(' Say "Hi" \\ Bye '),
    ).searchParams.get('query');
    expect(query).toBe('"Say \\"Hi\\" \\\\ Bye"');
  });

  it('look up with everything the artist fields need', () => {
    expect(artistLookupUrl(TOTO)).toBe(
      `https://musicbrainz.org/ws/2/artist/${TOTO}?inc=aliases+genres+tags+url-rels+artist-rels&fmt=json`,
    );
    expect(() => artistLookupUrl('toto')).toThrow(/not a MusicBrainz id/);
    expect(isMbid(TOTO)).toBe(true);
    expect(isMbid(TOTO.toUpperCase())).toBe(false);
  });

  it('read the Wikidata item off the url-rels', () => {
    expect(wikidataIdOf('https://www.wikidata.org/wiki/Q193636')).toBe(
      'Q193636',
    );
    expect(
      wikidataIdOf('https://www.wikidata.org/wiki/Special:Search'),
    ).toBeNull();
    expect(
      wikidataIdsOf({
        id: TOTO,
        name: 'Toto',
        relations: [
          {
            type: 'wikidata',
            url: { id: '1', resource: 'https://www.wikidata.org/wiki/Q193636' },
          },
          {
            type: 'wikidata',
            url: { id: '2', resource: 'https://www.wikidata.org/wiki/Q193636' },
          },
          {
            type: 'discogs',
            url: { id: '3', resource: 'https://www.discogs.com/artist/1' },
          },
        ],
      }),
    ).toEqual(['Q193636']);
  });
});

describe('the command line', () => {
  it('takes a stage and its flags, either spelling', () => {
    expect(
      parseArgs(['fetch', '--only', 'artists', '--limit=3', '--dry-run']),
    ).toEqual({
      stage: 'fetch',
      only: 'artists',
      limit: 3,
      dryRun: true,
      out: null,
      partial: false,
      maxRequests: null,
    });
    expect(parseArgs(['cache'])).toEqual({
      stage: 'cache',
      only: null,
      limit: null,
      dryRun: false,
      out: null,
      partial: false,
      maxRequests: null,
    });
    expect(
      parseArgs(['fetch', '--only', 'songs', '--max-requests', '10']),
    ).toMatchObject({ only: 'songs', maxRequests: 10 });
    expect(parseArgs(['emit', '--out', '/tmp/x']).out).toBe('/tmp/x');
    expect(parseArgs(['emit', '--partial']).partial).toBe(true);
    expect(parseArgs(['calibrate'])).toMatchObject({ stage: 'calibrate' });
  });

  it('says what is wrong', () => {
    expect(() => parseArgs([])).toThrow('which stage?');
    expect(() => parseArgs(['fetsh'])).toThrow('unknown stage "fetsh"');
    expect(() => parseArgs(['fetch', 'score'])).toThrow(/one stage at a time/);
    expect(() => parseArgs(['fetch', '--max-requests', '-1'])).toThrow(
      /--max-requests takes a whole number/,
    );
    expect(() => parseArgs(['fetch', '--limit', '0'])).toThrow(
      /whole number above 0/,
    );
    expect(() => parseArgs(['fetch', '--limit'])).toThrow(
      '--limit needs a value',
    );
    expect(() => parseArgs(['fetch', '--only', 'labels'])).toThrow(
      /artists or songs/,
    );
    expect(() => parseArgs(['fetch', '--force'])).toThrow(
      'unknown flag --force',
    );
  });
});
