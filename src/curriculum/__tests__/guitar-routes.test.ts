import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CurriculumRoutes } from '@/constants/routes';
import { curriculumPages } from '@/curriculum/routes';

function matchedPath(pathname: string): string | undefined {
  const matches = matchRoutes([curriculumPages()], pathname);
  return matches?.[matches.length - 1]?.route.path;
}

describe('curriculum routes: guitar', () => {
  it('sends the guitar picker and lessons to their own routes', () => {
    expect(matchedPath('/curriculum/guitar/applied-theory-fundamentals')).toBe(
      CurriculumRoutes.guitarAppliedTheoryFundamentals.definition,
    );
    expect(
      matchedPath('/curriculum/guitar/applied-theory-fundamentals/fsharp'),
    ).toBe(CurriculumRoutes.guitarAppliedTheoryFundamentalsLesson.definition);
  });

  it('leaves the piano and genre routes where they were', () => {
    expect(matchedPath('/curriculum/applied-theory-fundamentals/c')).toBe(
      CurriculumRoutes.appliedTheoryFundamentalsLesson.definition,
    );
    expect(matchedPath('/curriculum/funk/1')).toBe(
      CurriculumRoutes.genreLevel.definition,
    );
    expect(matchedPath('/curriculum/piano-fundamentals')).toBe(
      CurriculumRoutes.genre.definition,
    );
  });

  it('builds guitar paths from key params', () => {
    expect(
      CurriculumRoutes.guitarAppliedTheoryFundamentalsLesson({ key: 'bflat' }),
    ).toBe('/curriculum/guitar/applied-theory-fundamentals/bflat');
  });
});
