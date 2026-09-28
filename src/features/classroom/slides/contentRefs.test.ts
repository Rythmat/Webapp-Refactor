import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  curriculumRef,
  globePathwayRef,
  learnRef,
  moduleForKind,
  refFirewallCollision,
  songChartRef,
  songLessonRef,
} from './contentRefs';
import { resolveActivityRefHref } from './resolveContentHref';

// Minimal Song stub — songLessonRoute only reads `mode` + `key`.
const fakeSong = (id: string): Song =>
  ({ id, mode: 'dorian', key: 'C' }) as unknown as Song;
const getSong = (id: string): Song | null =>
  id === 'africa' ? fakeSong(id) : null;

describe('contentRefs — every builder round-trips through the resolver', () => {
  it('songChartRef → the song detail page (no deps needed)', () => {
    expect(resolveActivityRefHref('learn', songChartRef('africa'))).toBe(
      '/songs/africa',
    );
  });

  it('songLessonRef → the song Theory lesson (needs getSong)', () => {
    const href = resolveActivityRefHref('learn', songLessonRef('africa'), {
      getSong,
    });
    expect(href).not.toBeNull();
    expect(href).toBe('/learn/dorian/c');
  });

  it('learnRef canonicalizes the key and resolves', () => {
    expect(learnRef('dorian', 'B♭ minor')).toBe('learn:dorian:bflat');
    expect(learnRef('lydian', 'F#')).toBe('learn:lydian:fsharp');
    expect(resolveActivityRefHref('learn', learnRef('dorian', 'bflat'))).toBe(
      '/learn/dorian/bflat',
    );
  });

  it('curriculumRef resolves, incl. spaced/ampersand genre ids', () => {
    expect(
      resolveActivityRefHref('learn', curriculumRef('JAZZ', 2, 'B')),
    ).not.toBeNull();
    // R&B → slug 'rnb', 'HIP HOP' → slug 'hip hop'
    expect(
      resolveActivityRefHref('learn', curriculumRef('R&B', 1)),
    ).not.toBeNull();
    expect(
      resolveActivityRefHref('learn', curriculumRef('HIP HOP', 3, 'D')),
    ).not.toBeNull();
  });

  it('globePathwayRef → /atlas/globe?pathway=<id>', () => {
    expect(
      resolveActivityRefHref('globe', globePathwayRef('blues-to-rock')),
    ).toBe('/atlas/globe?pathway=blues-to-rock');
  });

  it('moduleForKind maps kinds to a valid LaunchTile module', () => {
    expect(moduleForKind('songChart')).toBe('learn');
    expect(moduleForKind('curriculumActivity')).toBe('learn');
    expect(moduleForKind('globePathway')).toBe('globe');
  });
});

describe('refFirewallCollision — a KEY-name gate, never a text gate', () => {
  it('no longer blocks real songs whose id contains a former forbidden substring', () => {
    // Regression: both are real entries in the 642-song library and were
    // unpickable under the old substring matcher because "clown"/"close"
    // contain "clo". Content VALUES are student-safe by definition.
    expect(
      refFirewallCollision({ ref: songChartRef('tears_of_a_clown') }),
    ).toBeNull();
    expect(
      refFirewallCollision({
        ref: songLessonRef('they_long_to_be_close_to_you'),
        title: 'They Long to Be Close to You',
      }),
    ).toBeNull();
  });

  it('no longer blocks a label that merely mentions a teacher-only word', () => {
    expect(
      refFirewallCollision({
        ref: 'globe:pathway:blues-to-rock',
        title: 'My notes',
      }),
    ).toBeNull();
  });

  it('flags a candidate that structurally carries a teacher-only field', () => {
    // The real leak this exists to catch: a content-bank Activity handed to the
    // deck whole instead of projected down to {module, activityRef, label}.
    expect(
      refFirewallCollision({
        ref: songChartRef('africa'),
        title: 'Africa',
        cloIds: ['clo-learn-act-1'],
      }),
    ).toBe('cloIds');
  });

  it('finds a teacher-only field nested at any depth', () => {
    expect(
      refFirewallCollision({
        ref: globePathwayRef('jazz-chain'),
        meta: { extras: [{ rationale: { notes: 'teacher only' } }] },
      }),
    ).toBe('rationale');
  });

  it('returns null for an ordinary picker row', () => {
    expect(
      refFirewallCollision({ ref: songChartRef('africa'), title: 'Africa' }),
    ).toBeNull();
    expect(
      refFirewallCollision({ ref: globePathwayRef('jazz-chain') }),
    ).toBeNull();
  });
});
