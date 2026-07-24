import { describe, expect, it } from 'vitest';
import type { SlideDeck } from '../slides/types';
import type { Interaction, InteractionResponsePayload } from '../types';
import { buildSessionCoverage } from './buildSessionCoverage';

const atlasIx = (id: string, activityRef: string): Interaction => ({
  id,
  type: 'atlas',
  question: { en: 'q', es: 'q' },
  shareable: false,
  atlas: { module: 'learn', activityRef, expects: 'completion' },
});

const appRouteSlide = (id: string, interactionId: string) => ({
  id,
  kind: 'app-route' as const,
  phase: 'groupPractice' as const,
  title: { en: 't', es: 't' },
  interactionId,
});

const deckOf = (
  slides: SlideDeck['slides'],
  unitSlug?: string,
): SlideDeck => ({
  id: 'deck',
  title: { en: 'd', es: 'd' },
  slides,
  templateRef: unitSlug
    ? { templateId: 'genre-lesson-v1', unitSlug }
    : { templateId: 'genre-lesson-v1' },
});

const done = (activityRef: string): InteractionResponsePayload => ({
  kind: 'atlas',
  module: 'learn',
  activityRef,
  result: { completion: true },
});
const launched = (activityRef: string): InteractionResponsePayload => ({
  kind: 'atlas',
  module: 'learn',
  activityRef,
  result: { status: 'launched' },
});

describe('buildSessionCoverage', () => {
  it('derives unit / gcm-section / theory items with completion counts and summary', () => {
    const theory = atlasIx('ix-theory', 'learn:dorian:g');
    const secA = atlasIx('ix-a', 'curriculum:JAZZ:L1:A');
    const interactions = [theory, secA];
    const deck = deckOf(
      [appRouteSlide('s-theory', 'ix-theory'), appRouteSlide('s-a', 'ix-a')],
      'nov-jazz',
    );
    const responses = {
      'en-1': { 'ix-theory': done('learn:dorian:g'), 'ix-a': done('curriculum:JAZZ:L1:A') },
      'en-2': { 'ix-theory': done('learn:dorian:g'), 'ix-a': launched('curriculum:JAZZ:L1:A') },
      'en-3': { 'ix-a': done('curriculum:JAZZ:L1:A') },
    };
    const coverage = buildSessionCoverage({
      deck,
      interactions,
      responsesByEnrollment: responses,
      participantCount: 3,
    });
    expect(coverage.items.map((i) => i.kind)).toEqual([
      'unit',
      'theory',
      'gcm-section',
    ]);
    expect(coverage.summary).toBe(
      'Covered: Unit nov-jazz · Theory dorian / g (2/3) · JAZZ:L1 §A Melody (2/3)',
    );
  });

  it('maps song-lesson refs', () => {
    const ix = atlasIx('ix-1', 'song:the_song:lesson');
    const coverage = buildSessionCoverage({
      deck: deckOf([appRouteSlide('s', 'ix-1')]),
      interactions: [ix],
      responsesByEnrollment: {},
      participantCount: 0,
    });
    expect(coverage.items[0]).toMatchObject({
      kind: 'song-lesson',
      label: 'Song theory lesson',
    });
  });

  it('returns empty for a deck with no app-route slides and no unitSlug', () => {
    const coverage = buildSessionCoverage({
      deck: deckOf([]),
      interactions: [],
      responsesByEnrollment: {},
      participantCount: 0,
    });
    expect(coverage.items).toEqual([]);
    expect(coverage.summary).toBe('');
  });

  it('returns empty when there is no deck', () => {
    const coverage = buildSessionCoverage({
      deck: null,
      interactions: [],
      responsesByEnrollment: {},
      participantCount: 3,
    });
    expect(coverage.items).toEqual([]);
  });

  it('skips an app-route slide whose interaction is missing', () => {
    const coverage = buildSessionCoverage({
      deck: deckOf([appRouteSlide('s', 'ix-missing')]),
      interactions: [],
      responsesByEnrollment: {},
      participantCount: 0,
    });
    expect(coverage.items).toEqual([]);
  });
});
