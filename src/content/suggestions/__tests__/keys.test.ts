import { describe, expect, it } from 'vitest';
import {
  elementKeys,
  hashText,
  sameElement,
  stableJson,
  suggestionId,
  valueHash,
} from '../keys';

const target = { kind: 'artist', slug: 'marvin-gaye' };

describe('a suggestion’s id', () => {
  it('is the same every run, and never depends on the source', () => {
    const born = {
      target,
      path: 'born',
      op: 'set' as const,
      value: { date: '1939-04-02', placeId: 'washington' },
    };
    const id = suggestionId(born);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(
      suggestionId({
        ...born,
        // Another key order, and a source: the same suggestion.
        value: {
          placeId: 'washington',
          date: '1939-04-02',
          source: 'wikidata',
        },
      }),
    ).toBe(id);
  });

  it('changes when the value does, so a rejection does not carry over', () => {
    const at = (date: string) =>
      suggestionId({ target, path: 'born', op: 'set', value: { date } });
    expect(at('1939-04-02')).not.toBe(at('1939'));
  });

  it('keys an added element by who it is, not every detail', () => {
    const credit = (extra: object) =>
      suggestionId({
        target: { kind: 'song', slug: 'thriller' },
        path: 'credits[]',
        op: 'add',
        value: { name: 'Quincy Jones', role: 'producer', ...extra },
      });
    expect(credit({})).toBe(credit({ unverified: true }));
    // A record id arriving later, or a namesake's renamed one, is not a
    // different credit: rejections stick across linking.
    expect(credit({})).toBe(credit({ artistGlobeId: 'quincy-jones' }));
    expect(credit({})).toBe(credit({ artistGlobeId: 'quincy-jones-2' }));
    // …and the decision's valueHash is what notices a detail changing.
    expect(valueHash({ a: 1 })).not.toBe(valueHash({ a: 2 }));
  });

  it('keeps a performer’s instrument in who the credit is', () => {
    const player = (instrument: string) =>
      suggestionId({
        target: { kind: 'song', slug: 'whats_going_on' },
        path: 'credits[]',
        op: 'add',
        value: { name: 'James Jamerson', role: 'performer', instrument },
      });
    expect(player('bass')).not.toBe(player('double_bass'));
  });

  it('reads an element by its anchor, not its index', () => {
    const link = (path: string, anchor?: string) =>
      suggestionId({
        target: { kind: 'song', slug: 'africa' },
        path,
        anchor,
        op: 'set',
        value: 'toto',
      });
    expect(link('credits[0].artistGlobeId', 'primary|toto')).toBe(
      link('credits[4].artistGlobeId', 'primary|toto'),
    );
    expect(link('credits[0].artistGlobeId', 'primary|toto')).not.toBe(
      link('credits[0].artistGlobeId', 'performer:drums|jeff-porcaro'),
    );
  });
});

describe('list elements', () => {
  it('meet across a record id and a bare name', () => {
    expect(
      sameElement(
        'credits[]',
        { name: 'Quincy Jones', role: 'producer' },
        { name: 'Q', role: 'producer', artistGlobeId: 'quincy-jones' },
      ),
    ).toBe(true);
    expect(
      sameElement(
        'credits[]',
        { name: 'Quincy Jones', role: 'producer' },
        { name: 'Quincy Jones', role: 'arranger' },
      ),
    ).toBe(false);
  });

  it('tell two recordings of one artist apart', () => {
    const sample = (extra: object) => ({
      relation: 'sample',
      artist: 'James Brown',
      ...extra,
    });
    // A song charted here is that song, whoever else it shares an artist with.
    expect(
      sameElement(
        'relatedRecordings[]',
        sample({ songId: 'funky-drummer', artistGlobeId: 'james-brown' }),
        sample({ songId: 'give-it-up', artistGlobeId: 'james-brown' }),
      ),
    ).toBe(false);
    expect(
      sameElement(
        'relatedRecordings[]',
        sample({ year: 1970 }),
        sample({ year: 1971 }),
      ),
    ).toBe(false);
    expect(
      sameElement(
        'relatedRecordings[]',
        sample({ year: 1970 }),
        sample({ year: 1970, artistGlobeId: 'james-brown' }),
      ),
    ).toBe(true);
  });

  it('are keyed by their record where the list has one', () => {
    expect(elementKeys('releases[]', { releaseId: 'x', track: 3 })).toEqual([
      'x',
    ]);
    expect(elementKeys('members[]', { artistId: 'a', from: 1961 })).toEqual([
      'a',
    ]);
    expect(elementKeys('artistIds[]', 'toto')).toEqual(['"toto"']);
    // A list with no rule: everything the element says, RefMeta aside.
    expect(elementKeys('things[]', { b: 1, a: 2, source: 'x' })).toEqual([
      '{"a":2,"b":1}',
    ]);
  });
});

describe('the hashing', () => {
  it('sorts keys and follows JSON otherwise', () => {
    expect(stableJson({ b: [1, undefined], a: { d: undefined, c: 'x' } })).toBe(
      '{"a":{"c":"x"},"b":[1,null]}',
    );
    expect(stableJson(undefined)).toBe('undefined');
    expect(hashText('a')).not.toBe(hashText('b'));
  });
});
