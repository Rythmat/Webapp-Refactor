import { describe, expect, it } from 'vitest';
import type { ActivityFlow } from '@/curriculum/types/activity';
import type { GenreProfile } from '@/curriculum/types/genreProfile';
import { findForbiddenSubstring, publishDay } from '../../publish/publishDay';
import { findDanglingInteractionIds } from '../deck';
import {
  GENRE_LESSON_TEMPLATE_ID,
  buildGenreLessonDay,
} from './genreLesson';

/** Tiny hand-built fixtures — never import the real 42-flow / profile datasets. */
const makeFlow = (
  sectionSteps: Partial<Record<'A' | 'B' | 'C' | 'D', number>> = {
    A: 2,
    B: 3,
    C: 1,
    D: 4,
  },
): ActivityFlow => ({
  genre: 'funk',
  level: 1,
  title: 'Funk Foundations',
  params: {} as ActivityFlow['params'],
  sections: (['A', 'B', 'C', 'D'] as const).map((id) => ({
    id,
    name: id,
    steps: Array.from({ length: sectionSteps[id] ?? 0 }, (_, i) => ({
      stepNumber: i + 1,
    })) as ActivityFlow['sections'][number]['steps'],
  })),
});

const makeProfile = (): GenreProfile =>
  ({
    id: 'funk',
    displayName: 'Funk',
    accentColor: '#f0a',
    tagline: 't',
    history: 'h',
    primaryArtists: [],
    subGenres: [],
    crossoverGenres: [],
    characteristics: [],
    levels: {
      1: {
        keyCenter: 'D minor',
        mode: 'dorian',
        keyMidi: 62,
        scaleIntervals: [],
        scaleNotes: [],
        tempoRange: '96–112 BPM',
        primaryVoicings: [],
        technique: {} as GenreProfile['levels'][1]['technique'],
        entryLabel: 'Start',
        locked: false,
      },
      2: {} as GenreProfile['levels'][2],
      3: {} as GenreProfile['levels'][3],
    },
  }) as GenreProfile;

describe('buildGenreLessonDay', () => {
  it('orders content/checkin/overview → theory → 4 stations → question → exit', () => {
    const day = buildGenreLessonDay({
      gcmKey: 'FUNK:L1',
      profile: makeProfile(),
      flow: makeFlow(),
      theoryMode: 'dorian',
    });
    expect(day.deck?.slides.map((s) => s.kind)).toEqual([
      'content',
      'interaction',
      'content',
      'app-route',
      'app-route',
      'app-route',
      'app-route',
      'app-route',
      'interaction',
      'interaction',
    ]);
  });

  it('carries the genre templateRef and publishes clean (en + es)', () => {
    const day = buildGenreLessonDay({
      gcmKey: 'FUNK:L1',
      profile: makeProfile(),
      flow: makeFlow(),
      theoryMode: 'dorian',
    });
    expect(day.deck?.templateRef).toEqual({
      templateId: GENRE_LESSON_TEMPLATE_ID,
      gcmKey: 'FUNK:L1',
    });
    const snapshot = publishDay(day);
    expect(findForbiddenSubstring(snapshot)).toBeNull();
    expect(findDanglingInteractionIds(snapshot)).toEqual([]);
  });

  it('keeps slide phases non-decreasing', async () => {
    const { PHASES } = await import('../../phases');
    const day = buildGenreLessonDay({
      gcmKey: 'FUNK:L1',
      profile: makeProfile(),
      flow: makeFlow(),
      theoryMode: 'dorian',
    });
    const idx = day.deck!.slides.map((s) => PHASES.indexOf(s.phase));
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i]).toBeGreaterThanOrEqual(idx[i - 1]);
    }
  });

  it('targets each station via curriculum:<GENRE>:<L#>:<section>', () => {
    const snapshot = publishDay(
      buildGenreLessonDay({
        gcmKey: 'FUNK:L1',
        profile: makeProfile(),
        flow: makeFlow(),
        theoryMode: 'dorian',
      }),
    );
    const atlasRefs = Object.values(snapshot.cells)
      .flatMap((c) => c.presentation.interactions ?? [])
      .filter((i) => i.type === 'atlas')
      .map((i) => i.atlas?.activityRef);
    expect(atlasRefs).toContain('curriculum:FUNK:L1:A');
    expect(atlasRefs).toContain('curriculum:FUNK:L1:D');
    expect(atlasRefs).toContain('learn:dorian:D minor');
  });

  it('omits the theory slide when no theoryMode is given', () => {
    const day = buildGenreLessonDay({
      gcmKey: 'BLUES:L2',
      profile: makeProfile(),
      flow: makeFlow(),
    });
    // 3 content/interaction lead-in + 4 stations + question + exit = 9 (no theory)
    expect(
      day.deck?.slides.filter((s) => s.kind === 'app-route'),
    ).toHaveLength(4);
  });

  it('skips a 0-step section (no slide, no interaction)', () => {
    const day = buildGenreLessonDay({
      gcmKey: 'FUNK:L1',
      profile: makeProfile(),
      flow: makeFlow({ A: 2, B: 0, C: 1, D: 4 }),
      theoryMode: 'dorian',
    });
    const appRoutes = day.deck?.slides.filter((s) => s.kind === 'app-route');
    // theory + A + C + D = 4 (B skipped)
    expect(appRoutes).toHaveLength(4);
    const snapshot = publishDay(day);
    const atlasRefs = Object.values(snapshot.cells)
      .flatMap((c) => c.presentation.interactions ?? [])
      .filter((i) => i.type === 'atlas')
      .map((i) => i.atlas?.activityRef);
    expect(atlasRefs).not.toContain('curriculum:FUNK:L1:B');
  });

  it('marks all atlas interactions and both check-ins shareable:false', () => {
    const snapshot = publishDay(
      buildGenreLessonDay({
        gcmKey: 'FUNK:L1',
        profile: makeProfile(),
        flow: makeFlow(),
        theoryMode: 'dorian',
      }),
    );
    const guarded = Object.values(snapshot.cells)
      .flatMap((c) => c.presentation.interactions ?? [])
      .filter((i) => i.type === 'atlas' || i.type === 'check-in');
    expect(guarded.length).toBeGreaterThan(0);
    for (const i of guarded) expect(i.shareable).toBe(false);
  });
});
