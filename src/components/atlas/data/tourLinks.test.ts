import { describe, expect, it } from 'vitest';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { learnHref, learnTitle, songHref, studioHref } from './tourLinks';

describe('where a tour leads', () => {
  it('opens each Learn genre’s course, by Learn’s name', () => {
    for (const course of GENRE_COURSES) {
      expect(learnHref(course.slug)).toBe(
        `/learn/keyboard/genre/${course.slug}`,
      );
      expect(learnTitle(course.slug)).toBe(course.title);
    }
    expect(learnTitle('maqam')).toBeNull();
  });

  it('opens the Studio on a template, else a seeded idea in the style', () => {
    expect(studioHref('rock', 'blues-to-rock')).toBe(
      '/studio?template=project-rock',
    );
    expect(studioHref('rnb', 'x')).toBe('/studio?template=project-rnb');
    const reggae = studioHref('reggae', 'jamaican-riddim');
    expect(reggae).toMatch(/^\/studio\?prompt=Reggae&promptSeed=\d+$/);
    expect(studioHref('reggae', 'jamaican-riddim')).toBe(reggae);
    expect(studioHref('african', 'x')).toMatch(/prompt=Afrobeat/);
  });

  it('opens a song’s lead sheet', () => {
    expect(songHref('africa')).toBe('/songs/africa');
  });
});
