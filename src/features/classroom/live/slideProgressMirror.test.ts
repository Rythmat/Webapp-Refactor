import { describe, expect, it } from 'vitest';
import type { Interaction, InteractionResponsePayload } from '../types';
import {
  buildSlideProgressPatch,
  slidesLessonId,
} from './slideProgressMirror';

const atlasIx: Interaction = {
  id: 'ix-1',
  type: 'atlas',
  question: { en: 'q', es: 'q' },
  shareable: false,
  atlas: { module: 'learn', activityRef: 'learn:ionian:c', expects: 'completion' },
};

const atlasPayload = (
  result: Record<string, unknown>,
): InteractionResponsePayload => ({
  kind: 'atlas',
  module: 'learn',
  activityRef: 'learn:ionian:c',
  result,
});

describe('buildSlideProgressPatch', () => {
  it('returns null for the launch marker (prevents false COMPLETED)', () => {
    expect(
      buildSlideProgressPatch('deck-1', atlasIx, atlasPayload({ status: 'launched' })),
    ).toBeNull();
  });

  it('returns null for non-atlas payloads', () => {
    expect(
      buildSlideProgressPatch('deck-1', atlasIx, {
        kind: 'check-in',
        value: '🙂',
      }),
    ).toBeNull();
  });

  it('returns null when the interaction is not atlas-typed', () => {
    const nonAtlas: Interaction = {
      id: 'ix-2',
      type: 'text',
      question: { en: 'q', es: 'q' },
      shareable: true,
    };
    expect(
      buildSlideProgressPatch('deck-1', nonAtlas, atlasPayload({ completion: true })),
    ).toBeNull();
  });

  it('synthesizes a COMPLETED patch on completion', () => {
    expect(
      buildSlideProgressPatch(
        'deck-1',
        atlasIx,
        atlasPayload({ completion: true, source: 'module' }),
      ),
    ).toEqual({
      activityInstanceId: 'ix-1',
      lessonId: slidesLessonId('deck-1'),
      lessonVersion: 1,
      activityDefId: 'learn:ionian:c',
      mode: '',
      root: '',
      status: 'COMPLETED',
      attemptsDelta: 1,
      score: null,
    });
  });

  it('passes a numeric score through', () => {
    const patch = buildSlideProgressPatch(
      'deck-1',
      atlasIx,
      atlasPayload({ kind: 'score', score: 8, max: 10 }),
    );
    expect(patch?.score).toBe(8);
  });
});
