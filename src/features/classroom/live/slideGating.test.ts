import { describe, expect, it } from 'vitest';
import type { Slide } from '../slides/types';
import type { InteractionResponsePayload } from '../types';
import { isSlideComplete, slideRequiresCompletion } from './slideGating';

const base = { phase: 'groupPractice' as const, title: { en: 't', es: 't' } };
const content: Slide = { ...base, id: 'c', kind: 'content' };
const media: Slide = {
  ...base,
  id: 'm',
  kind: 'media',
  media: { type: 'youtube', videoId: 'x' },
};
const studio: Slide = {
  ...base,
  id: 's',
  kind: 'studio-collab',
  grouping: 'pairs',
};
const showcase: Slide = {
  ...base,
  id: 'sh',
  kind: 'showcase',
  interactionId: 'ix-sh',
};
const question: Slide = {
  ...base,
  id: 'q',
  kind: 'interaction',
  interactionIds: ['ix-q'],
};
const appRoute: Slide = {
  ...base,
  id: 'ar',
  kind: 'app-route',
  interactionId: 'ix-ar',
};

describe('slideRequiresCompletion', () => {
  it('is false for interaction-less + showcase slides, true for interaction/app-route', () => {
    expect(slideRequiresCompletion(content)).toBe(false);
    expect(slideRequiresCompletion(media)).toBe(false);
    expect(slideRequiresCompletion(studio)).toBe(false);
    expect(slideRequiresCompletion(showcase)).toBe(false);
    expect(slideRequiresCompletion(question)).toBe(true);
    expect(slideRequiresCompletion(appRoute)).toBe(true);
  });
});

describe('isSlideComplete', () => {
  it('free slides are always complete', () => {
    expect(isSlideComplete(content, {})).toBe(true);
    expect(isSlideComplete(showcase, {})).toBe(true);
  });

  it('an interaction slide needs its interaction answered', () => {
    expect(isSlideComplete(question, {})).toBe(false);
    expect(
      isSlideComplete(question, {
        'ix-q': { kind: 'text', text: 'answer' } as InteractionResponsePayload,
      }),
    ).toBe(true);
  });

  it('an app-route slide needs a genuine completion, not the launch marker', () => {
    const launched: InteractionResponsePayload = {
      kind: 'atlas',
      module: 'learn',
      activityRef: 'learn:ionian:c',
      result: { status: 'launched' },
    };
    const done: InteractionResponsePayload = {
      kind: 'atlas',
      module: 'learn',
      activityRef: 'learn:ionian:c',
      result: { completion: true },
    };
    expect(isSlideComplete(appRoute, { 'ix-ar': launched })).toBe(false);
    expect(isSlideComplete(appRoute, { 'ix-ar': done })).toBe(true);
  });
});
