import { describe, expect, it } from 'vitest';
import { describeRef } from '../describeRef';
import { resolveActivityRefHref } from '../resolveContentHref';

describe('describeRef: one name for every link', () => {
  it('names each module by what it is, never its raw ref', () => {
    expect(describeRef('globe:mindmap')).toEqual({
      module: 'globe',
      title: 'Mind map on the Globe',
    });
    expect(describeRef('globe:tour:artist-michael-jackson').title).toBe(
      'Michael Jackson on the Globe',
    );
    expect(describeRef('globe:tour:city-new-orleans').title).toBe(
      'New Orleans tour',
    );
    expect(describeRef('globe:city:new-orleans').title).toBe('New Orleans');
    expect(describeRef('curriculum:FUNK:L1')).toMatchObject({
      module: 'learn',
      title: 'Funk — Level 1',
    });
    expect(describeRef('learn:dorian:d').title).toBe('Dorian in D');
    expect(describeRef('arcade:chroma')).toEqual({
      module: 'arcade',
      title: 'Chroma',
    });
    expect(describeRef('studio:library').title).toBe('Your Studio projects');
  });

  it('names a song by its title and wears its artist', () => {
    const d = describeRef('song:thriller:lesson', {
      getSong: () =>
        ({
          title: 'Thriller',
          artistImageRef: '/img/mj.jpg',
          artistImageSource: 'licensed',
        }) as never,
    });
    expect(d).toEqual({
      module: 'learn',
      title: '“Thriller” lesson',
      imageUrl: '/img/mj.jpg',
    });
  });
});

describe('the new links resolve', () => {
  it('opens an Arcade game by its route', () => {
    expect(resolveActivityRefHref('arcade', 'arcade:chroma')).toBe(
      '/arcade/chroma',
    );
    expect(resolveActivityRefHref('arcade', 'arcade:no-such-game')).toBeNull();
  });

  it('opens any guided tour by its full id', () => {
    expect(
      resolveActivityRefHref('globe', 'globe:tour:artist-michael-jackson'),
    ).toBe('/globe?tour=artist-michael-jackson');
  });
});
