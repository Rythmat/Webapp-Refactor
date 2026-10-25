/**
 * The Learn tab pages' prompt bars suggest only what their page shows, on
 * its instrument (owner, 2026-10-25).
 */
import { describe, expect, it } from 'vitest';
import { learnSuggestionsFor } from '@/components/ClassroomLayout/home/promptSuggestions';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { techniqueDataFor } from '@/components/learn/techniqueCatalog';
import { isGuitarTheorySlug } from '@/curriculum/data/guitar/theoryCatalog';
import { getAllSongs } from '@/curriculum/data/songs';
import { genreReadinessFrom, isSectionBuilt } from '../genreReadiness';
import { learnPageSuggestions } from '../learnPromptSuggestions';

const routes = (list: readonly { route: string }[]) => list.map((s) => s.route);

describe('learnPageSuggestions', () => {
  it.each(['piano', 'guitar'] as const)(
    'Songs on %s: every song in the library, and only songs',
    (instrument) => {
      const list = learnPageSuggestions(instrument, 'Songs');
      expect(new Set(routes(list))).toEqual(
        new Set(getAllSongs().map((song) => `/songs/${song.id}`)),
      );
      const named = instrument === 'piano' ? / on piano$/ : / on guitar$/;
      expect(list.filter((s) => !named.test(s.text))).toEqual([]);
    },
  );

  it('Songs under the page’s filters: only the songs they leave', () => {
    const funk = getAllSongs().filter((song) =>
      song.genreTags.includes('funk'),
    );
    expect(
      routes(learnPageSuggestions('piano', 'Songs', { songs: funk })),
    ).toEqual(funk.map((song) => `/songs/${song.id}`));
    expect(learnPageSuggestions('piano', 'Songs', { songs: [] })).toEqual([]);
  });

  // Funk built at every level; Pop's Bass at Level 2 only; nothing else.
  const ready = genreReadinessFrom(
    new Set([
      ...['A', 'B', 'C', 'D'].flatMap((id) =>
        [1, 2, 3].map((level) => `funk:${level}:${id}`),
      ),
      'pop:2:C',
    ]),
  );

  it.each(['piano', 'guitar'] as const)(
    'Genre on %s, no pill: the built courses, then every built section’s lessons; none before it is known',
    (instrument) => {
      const list = routes(
        learnPageSuggestions(instrument, 'Genre', { genreReady: ready }),
      );
      expect(list.slice(0, 2)).toEqual(['/curriculum/pop', '/curriculum/funk']);
      // Funk's 12 lessons (4 sections × 3 levels) and Pop's one.
      expect(list.slice(2)).toHaveLength(13);
      expect(list).toContain('/curriculum/pop/2?section=C');
      expect(list).toContain('/curriculum/funk/3?section=D');
      expect(learnPageSuggestions(instrument, 'Genre')).toEqual([]);
    },
  );

  it('Genre, one section: its built lessons, the level named beginner to advanced', () => {
    for (const [id, word] of [
      ['A', 'melodies'],
      ['B', 'chords'],
      ['C', 'bass lines'],
      ['D', 'to perform'],
    ] as const) {
      const list = learnPageSuggestions('piano', 'Genre', {
        genreSection: id,
        genreReady: ready,
      });
      const expected = [
        ...(id === 'C' ? ['/curriculum/pop/2?section=C'] : []),
        ...[1, 2, 3].map((level) => `/curriculum/funk/${level}?section=${id}`),
      ];
      expect(routes(list)).toEqual(expected);
      expect(list.filter((s) => !s.text.includes(word))).toEqual([]);
      expect(list.filter((s) => /level/i.test(s.text))).toEqual([]);
    }
    expect(
      learnPageSuggestions('piano', 'Genre', {
        genreSection: 'A',
        genreReady: ready,
      }).map((s) => s.text),
    ).toEqual([
      'Teach me beginner Funk melodies',
      'Teach me intermediate Funk melodies',
      'Teach me advanced Funk melodies',
    ]);
  });

  it('calls a section built only when it has a step that isn’t a placeholder', () => {
    const soon = {
      subsection: 'A1: Melody — Coming Soon',
      activity: 'A1.1: Coming Soon',
    };
    expect(isSectionBuilt({ id: 'A', steps: [soon] })).toBe(false);
    expect(isSectionBuilt({ id: 'A', steps: [] })).toBe(false);
    expect(
      isSectionBuilt({
        id: 'A',
        steps: [soon, { subsection: 'A1: Listen', activity: 'A1.1: Hear it' }],
      }),
    ).toBe(true);
  });

  it('Theory: the instrument’s Theory lessons alone', () => {
    const piano = routes(learnPageSuggestions('piano', 'Theory'));
    const guitar = routes(learnPageSuggestions('guitar', 'Theory'));
    expect(piano.length).toBeGreaterThan(10);
    expect(piano.filter((r) => !/^\/learn\/keyboard\/[^?]/.test(r))).toEqual(
      [],
    );
    expect(guitar.length).toBeGreaterThan(10);
    expect(
      guitar.filter((r) => {
        const slug = r.match(/^\/learn\/guitar\/([^/]+)/)?.[1];
        return !slug || !isGuitarTheorySlug(slug);
      }),
    ).toEqual([]);
  });

  it('Technique: its tiles on keyboard, nothing on guitar yet', () => {
    expect(routes(learnPageSuggestions('piano', 'Technique'))).toEqual(
      techniqueDataFor('piano').map((item) => item.route),
    );
    expect(learnPageSuggestions('guitar', 'Technique')).toEqual([]);
  });

  it.each(['piano', 'guitar'] as const)(
    'Learn’s own page on %s: everything the tab pages suggest and the rest of the instrument’s list, the kinds taking turns',
    (instrument) => {
      const list = learnPageSuggestions(instrument, undefined, {
        genreReady: ready,
      });
      const all = new Set(routes(list));
      // No suggestion twice (two can open one place: two games' prompts).
      expect(new Set(list.map((s) => s.text)).size).toBe(list.length);
      // Every page's: songs, built genre lessons, Theory, Technique.
      for (const tab of ['Songs', 'Theory', 'Technique'] as const) {
        for (const r of routes(learnPageSuggestions(instrument, tab))) {
          expect(all.has(r), r).toBe(true);
        }
      }
      for (const r of routes(
        learnPageSuggestions(instrument, 'Genre', { genreReady: ready }),
      )) {
        expect(all.has(r), r).toBe(true);
      }
      // The instrument's own extras, but no genre course that isn't built.
      for (const s of learnSuggestionsFor(instrument)) {
        const slug = s.route.match(/^\/curriculum\/([^/?]+)$/)?.[1];
        const course = GENRE_COURSES.find((c) => c.slug === slug);
        const built = course ? ready.course(course.slug) : true;
        expect(all.has(s.route), s.route).toBe(built);
      }
      // The songs don't crowd the rest out: the first few are of each kind.
      const firstFive = routes(list.slice(0, 5));
      expect(firstFive.filter((r) => r.startsWith('/songs/')).length).toBe(1);
    },
  );
});
