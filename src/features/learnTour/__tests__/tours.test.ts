import { describe, expect, it } from 'vitest';
import { emptyBlob, roleList } from '@/features/setlists/setListsStore';
import { atReturnLesson, isLessonPath, TOUR_SONG_ID } from '../places';
import { lessonTour } from '../tours/lessonTour';
import {
  genreTour,
  navigateTour,
  songsTour,
  startHereTour,
  theoryTour,
} from '../tours/navigateTour';
import type { TourContext, TourDefinition } from '../types';

const ctx: TourContext = {
  returnTo: '/learn/keyboard/genre/hip-hop/1',
  premium: true,
};

const placeOf = (href: string) => {
  const [pathname, query = ''] = href.split('?');
  return { pathname, search: query ? `?${query}` : '' };
};

/** Each chapter once, in the order the tour first reaches it. */
const chapters = (def: TourDefinition) =>
  def.steps.reduce<string[]>(
    (seen, s) => (seen.includes(s.chapter) ? seen : [...seen, s.chapter]),
    [],
  );

const range = (def: TourDefinition, first: string, last: string) => {
  const from = def.steps.findIndex((s) => s.id === first);
  const to = def.steps.findIndex((s) => s.id === last);
  return def.steps.slice(from, to + 1);
};

const ALL = [
  lessonTour,
  navigateTour,
  startHereTour,
  songsTour,
  genreTour,
  theoryTour,
];

describe.each(ALL)('the $id tour', (def) => {
  it('names each step once, with a part of Learn and words', () => {
    const ids = def.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of def.steps) {
      expect(step.chapter).toBeTruthy();
      expect(step.text).toBeTruthy();
      expect(typeof step.at).toBe('function');
    }
  });

  it('takes a step that knows the way there to a place it counts as there', () => {
    for (const step of def.steps) {
      if (!step.href) continue;
      expect(step.at(placeOf(step.href(ctx)), ctx), step.id).toBe(true);
    }
  });

  it('picks up only at an earlier step of its own', () => {
    def.steps.forEach((step, i) => {
      if (!step.resumeFrom) return;
      const from = def.steps.findIndex((s) => s.id === step.resumeFrom);
      if (from < 0) return; // a page's part that starts after it
      expect(from, step.id).toBeLessThanOrEqual(i);
    });
  });

  it('writes American English', () => {
    const words = def.steps
      .map((s) => (typeof s.text === 'string' ? s.text : ''))
      .join(' ');
    expect(words).not.toMatch(/colour|favourite|practise\b|centre/i);
  });
});

describe('How to Navigate', () => {
  it('goes through Learn in Peter’s order', () => {
    expect(chapters(navigateTour)).toEqual([
      'Dashboard',
      'Start Here',
      'Songs',
      'Set Lists',
      'Genre',
      'Theory',
    ]);
  });

  it('walks the dashboard, the five stops of Start Here, and the song Peter chose', () => {
    const ids = navigateTour.steps.map((s) => s.id);
    expect(ids.slice(1, 6)).toEqual([
      'continue',
      'streak',
      'xp',
      'recent',
      'saved',
    ]);
    expect(ids.filter((id) => id.startsWith('stop-'))).toHaveLength(5);
    expect(ids).toEqual(
      expect.arrayContaining([
        'key',
        'globe',
        'save-version',
        'open-set-lists',
      ]),
    );
    expect(TOUR_SONG_ID).toBe('they_long_to_be_close_to_you');
  });

  it('keeps the set lists on the practice copy from Save Version to leaving Set Lists', () => {
    const copied = range(navigateTour, 'save-version', 'back-from-set-lists');
    expect(copied.every((s) => s.sandbox)).toBe(true);
    expect(navigateTour.steps.filter((s) => s.sandbox)).toHaveLength(
      copied.length,
    );
  });

  it('opens the genre course for a free player for the Genre part only', () => {
    const previewed = range(navigateTour, 'open-genre', 'courses');
    expect(previewed.every((s) => s.preview)).toBe(true);
    expect(navigateTour.steps.filter((s) => s.preview)).toHaveLength(
      previewed.length,
    );
  });

  it('readies the practice copy with Close To You in My Lead Sheets, once', () => {
    const prepare = navigateTour.prepareSandbox!;
    const once = prepare(emptyBlob());
    const twice = prepare(once);
    const songsIn = (blob: typeof once) =>
      roleList(blob, 'inbox')!.entries.filter(
        (e) => e.kind === 'song' && e.songId === TOUR_SONG_ID,
      ).length;
    expect(songsIn(once)).toBe(1);
    expect(songsIn(twice)).toBe(1);
  });

  it('tells a free player the course comes with Premium, and a member nothing', () => {
    const courses = navigateTour.steps.find((s) => s.id === 'courses')!;
    const say = (premium: boolean) =>
      typeof courses.text === 'function'
        ? courses.text({ ctx: { ...ctx, premium } } as never)
        : courses.text;
    expect(say(false)).toMatch(/Premium/);
    expect(say(true)).not.toMatch(/Premium/);
  });
});

describe('the lesson tour', () => {
  it('goes from the lesson to its Practice Track and back, in Peter’s order', () => {
    expect(lessonTour.steps.map((s) => s.id)).toEqual([
      'to-melody',
      'demo',
      'practice',
      'play-now',
      'views',
      'hands',
      'parts',
      'arrows',
      'count',
      'list',
      'settings',
      'settings-sheet',
      'open-practice-track',
      'play-loop',
      'labels',
      'scales-chords',
      'things-to-try',
      'record',
      'to-studio',
      'back',
      'again',
    ]);
  });

  it('comes back to the lesson it started in, whatever the case of its key', () => {
    const lesson = {
      returnTo: '/learn/keyboard/ionian/C?section=A',
      premium: false,
    };
    expect(
      atReturnLesson(
        { pathname: '/learn/keyboard/ionian/c', search: '' },
        lesson,
      ),
    ).toBe(true);
    expect(
      atReturnLesson(
        { pathname: '/learn/keyboard/dorian/c', search: '' },
        lesson,
      ),
    ).toBe(false);
  });
});

describe('where the lesson tour is offered', () => {
  it.each([
    ['/learn/keyboard/genre/hip-hop/1', true],
    ['/learn/keyboard/genre/funk/3', true],
    ['/learn/keyboard/ionian/c', true],
    ['/learn/guitar/ionian/C', true],
    ['/learn/keyboard/genre/hip-hop', false],
    ['/curriculum/piano-fundamentals/6', false],
    ['/curriculum/music-literacy/music-literacy-part-1', false],
    ['/learn/keyboard/ionian', false],
    ['/learn/guitar/ionian', false],
    ['/learn/keyboard/relative/c', false],
    ['/learn', false],
  ])('%s: %s', (path, offered) => {
    expect(isLessonPath(path)).toBe(offered);
  });
});

describe('a Learn page’s own part of the tour', () => {
  it.each([
    [startHereTour, 'StartHere', ['stop-1', 'stop-5']],
    [songsTour, 'Songs', ['songs-difficulty', 'back-from-set-lists']],
    [genreTour, 'Genre', ['genres', 'courses']],
    [theoryTour, 'Theory', ['modes', 'exit-theory']],
  ] as const)(
    '%s starts on its tab and is the full tour’s steps',
    (def, tab, [first, last]) => {
      const ids = navigateTour.steps.map((s) => s.id);
      expect(def.steps).toEqual(
        navigateTour.steps.slice(ids.indexOf(first), ids.indexOf(last) + 1),
      );
      expect(
        def.steps[0].at({ pathname: '/learn', search: `?tab=${tab}` }, ctx),
      ).toBe(true);
      expect(def.finale.heading).toBe(`That’s ${def.title}!`);
    },
  );

  it('keeps the practice copy and the preview with Songs and Genre', () => {
    expect(songsTour.steps.some((s) => s.sandbox)).toBe(true);
    expect(songsTour.prepareSandbox).toBe(navigateTour.prepareSandbox);
    expect(genreTour.steps.every((s) => s.preview)).toBe(true);
  });
});
