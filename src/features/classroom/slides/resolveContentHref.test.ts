import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  canonicalLessonKeyParam,
  resolveActivityRefHref,
} from './resolveContentHref';

const songFixture = (over: Partial<Song>): Song =>
  ({
    id: 'test_song',
    title: 'Test',
    artist: 'Tester',
    key: 'C major',
    keyRoot: 0,
    mode: 'major',
    tempo: 100,
    timeSignature: '4/4',
    difficulty: 'beginner',
    genreTags: [],
    techniques: [],
    sections: [],
    audioSources: [],
    artistImageSource: '',
    ...over,
  }) as unknown as Song;

describe('canonicalLessonKeyParam', () => {
  it('canonicalizes full key labels to bare tokens', () => {
    expect(canonicalLessonKeyParam('C major')).toBe('c');
    expect(canonicalLessonKeyParam('B♭ major')).toBe('bflat');
    expect(canonicalLessonKeyParam('F# minor')).toBe('fsharp');
    expect(canonicalLessonKeyParam('D minor')).toBe('d');
  });
  it('is idempotent on already-canonical tokens', () => {
    expect(canonicalLessonKeyParam('fsharp')).toBe('fsharp');
    expect(canonicalLessonKeyParam('bflat')).toBe('bflat');
    expect(canonicalLessonKeyParam('c')).toBe('c');
  });
});

describe('resolveActivityRefHref — learn', () => {
  it('resolves mode/key with canonicalization', () => {
    expect(resolveActivityRefHref('learn', 'learn:ionian:c')).toBe(
      '/learn/keyboard/ionian/c',
    );
    expect(resolveActivityRefHref('learn', 'learn:dorian:D minor')).toBe(
      '/learn/keyboard/dorian/d',
    );
  });
  it('honors an optional section segment', () => {
    expect(resolveActivityRefHref('learn', 'learn:ionian:c:B')).toBe(
      '/learn/keyboard/ionian/c?section=B',
    );
    expect(
      resolveActivityRefHref('learn', 'learn:ionian:c:scale-degrees'),
    ).toBe('/learn/keyboard/ionian/c');
  });
  it('returns null when mode or key is missing', () => {
    expect(resolveActivityRefHref('learn', 'learn:ionian')).toBeNull();
  });
});

describe('resolveActivityRefHref — curriculum', () => {
  it('maps uppercase GCM keys with spaces to route slugs', () => {
    // The key still has a space; the slug does not, so the URL needs no
    // percent-encoding to carry it.
    expect(resolveActivityRefHref('learn', 'curriculum:HIP HOP:L1:B')).toBe(
      '/learn/keyboard/genre/hip-hop/1?section=B',
    );
  });
  it('maps R&B to the rnb slug and accepts bare levels', () => {
    expect(resolveActivityRefHref('learn', 'curriculum:R&B:L2')).toBe(
      '/learn/keyboard/genre/rnb/2',
    );
    expect(resolveActivityRefHref('learn', 'curriculum:jazz:1')).toBe(
      '/learn/keyboard/genre/jazz/1',
    );
  });
  it('drops an invalid section', () => {
    expect(resolveActivityRefHref('learn', 'curriculum:POP:L1:Z')).toBe(
      '/learn/keyboard/genre/pop/1',
    );
  });
});

describe('resolveActivityRefHref — globe', () => {
  it('resolves event and pathway namespaces to /atlas/globe', () => {
    expect(resolveActivityRefHref('globe', 'globe:event:evt-x')).toBe(
      '/atlas/globe?event=evt-x',
    );
    expect(resolveActivityRefHref('globe', 'globe:pathway:p1')).toBe(
      '/atlas/globe?pathway=p1',
    );
  });
  it('resolves region/city to their guided tours and era to the timeline', () => {
    expect(resolveActivityRefHref('globe', 'globe:region:west-africa')).toBe(
      '/atlas/globe?tour=region-west-africa',
    );
    expect(resolveActivityRefHref('globe', 'globe:city:new-orleans')).toBe(
      '/atlas/globe?tour=city-new-orleans',
    );
    expect(resolveActivityRefHref('globe', 'globe:era:postwar')).toBe(
      '/atlas/globe?era=postwar',
    );
  });
  it("opens the Globe's mind map for a Promoter", () => {
    expect(resolveActivityRefHref('globe', 'globe:mindmap')).toBe(
      '/atlas/globe?mindmap=1',
    );
  });
  it('treats a legacy bare globe ref as an event id', () => {
    expect(resolveActivityRefHref('globe', 'evt-funk-la-1975')).toBe(
      '/atlas/globe?event=evt-funk-la-1975',
    );
  });
});

describe('resolveActivityRefHref — studio', () => {
  it('resolves template and song namespaces', () => {
    expect(resolveActivityRefHref('studio', 'studio:template:t1')).toBe(
      '/studio?template=t1',
    );
    expect(resolveActivityRefHref('studio', 'studio:song:s1')).toBe(
      '/studio?song=s1',
    );
  });
  it('opens a tutorial in the editor, and the project library', () => {
    expect(
      resolveActivityRefHref('studio', 'studio:tutorial:house-make-it-pump'),
    ).toBe('/studio?tutorial=house-make-it-pump');
    expect(resolveActivityRefHref('studio', 'studio:library')).toBe(
      '/studio?tab=Library',
    );
  });
});

describe('resolveActivityRefHref — song', () => {
  it('resolves a chart ref without deps', () => {
    expect(resolveActivityRefHref('learn', 'song:test_song:chart')).toBe(
      '/songs/test_song',
    );
  });
  it('resolves a lesson ref via injected getSong, canonicalizing the key', () => {
    const getSong = () => songFixture({ key: 'B♭ major', mode: 'major' });
    expect(
      resolveActivityRefHref('learn', 'song:test_song:lesson', { getSong }),
    ).toBe('/learn/keyboard/ionian/bflat');
  });
  it('returns null for a lesson ref without getSong', () => {
    expect(resolveActivityRefHref('learn', 'song:test_song:lesson')).toBeNull();
  });
});

describe('resolveActivityRefHref — fallbacks', () => {
  it('returns null for an unknown namespace', () => {
    expect(resolveActivityRefHref('learn', 'mystery:foo:bar')).toBeNull();
  });
  it('returns null for a bare ref on a non-globe module', () => {
    expect(resolveActivityRefHref('arcade', 'some-bare-ref')).toBeNull();
  });
  it('returns null for an empty ref', () => {
    expect(resolveActivityRefHref('learn', '')).toBeNull();
    expect(resolveActivityRefHref('learn', undefined)).toBeNull();
  });
});
