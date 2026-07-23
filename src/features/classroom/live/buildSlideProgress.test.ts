import { describe, expect, it } from 'vitest';
import type { MspResponseEntry } from '../msp/mspResponseInbox';
import type { Slide } from '../slides/types';
import type { InteractionResponsePayload } from '../types';
import { buildSlideProgress, isAtlasResultComplete } from './buildSlideProgress';

const appRouteSlide = (interactionId: string): Slide => ({
  id: 'slide-1',
  phase: 'creativeProjects',
  title: { en: 'Go', es: 'Ve' },
  kind: 'app-route',
  interactionId,
});

const roster = [{ id: 'en-1' }, { id: 'en-2' }, { id: 'en-3' }];

const atlas = (
  result: Record<string, unknown>,
): InteractionResponsePayload => ({
  kind: 'atlas',
  module: 'learn',
  activityRef: 'learn:ionian:c',
  result,
});

describe('isAtlasResultComplete', () => {
  it('is false for the launch marker and true for completion shapes', () => {
    expect(isAtlasResultComplete({ status: 'launched' })).toBe(false);
    expect(isAtlasResultComplete({ completion: true })).toBe(true);
    expect(isAtlasResultComplete({ completed: true })).toBe(true);
    expect(isAtlasResultComplete({ kind: 'completion', completed: true })).toBe(
      true,
    );
    expect(isAtlasResultComplete({ score: 8 })).toBe(true);
    expect(isAtlasResultComplete({ artifactRef: { module: 'studio' } })).toBe(
      true,
    );
    expect(isAtlasResultComplete(null)).toBe(false);
    expect(isAtlasResultComplete({})).toBe(false);
  });
});

describe('buildSlideProgress', () => {
  const slide = appRouteSlide('ix-1');

  it('derives not_started / in_module / done', () => {
    const responses = {
      'en-1': {},
      'en-2': { 'ix-1': atlas({ status: 'launched' }) },
      'en-3': { 'ix-1': atlas({ completion: true }) },
    };
    const p = buildSlideProgress(roster, responses, [], slide);
    expect(p.perStudent).toEqual({
      'en-1': 'not_started',
      'en-2': 'in_module',
      'en-3': 'done',
    });
    expect(p.counts).toEqual({
      notStarted: 1,
      inModule: 1,
      done: 1,
      total: 3,
    });
  });

  it('treats a completion payload (overwriting the launch marker) as done', () => {
    const responses = {
      'en-1': { 'ix-1': atlas({ completion: true, source: 'module' }) },
    };
    const p = buildSlideProgress([{ id: 'en-1' }], responses, [], slide);
    expect(p.perStudent['en-1']).toBe('done');
  });

  it('marks done from an inbox completion entry even without a response', () => {
    const entries: MspResponseEntry[] = [
      {
        token: 't',
        interactionId: 'ix-1',
        participant: { enrollmentId: 'en-1' },
        payload: { kind: 'completion', completed: true },
        createdAt: 'now',
      },
    ];
    const p = buildSlideProgress([{ id: 'en-1' }], {}, entries, slide);
    expect(p.perStudent['en-1']).toBe('done');
  });

  it('counts a non-atlas response as done (parity with RosterPanel)', () => {
    const responses = {
      'en-1': {
        'ix-1': { kind: 'check-in', value: '🙂' } as InteractionResponsePayload,
      },
    };
    const p = buildSlideProgress([{ id: 'en-1' }], responses, [], slide);
    expect(p.perStudent['en-1']).toBe('done');
  });

  it('ignores non-roster respondents', () => {
    const responses = { ghost: { 'ix-1': atlas({ completion: true }) } };
    const p = buildSlideProgress([{ id: 'en-1' }], responses, [], slide);
    expect(p.counts.total).toBe(1);
    expect(p.perStudent['en-1']).toBe('not_started');
  });

  it('leaves everyone not_started on an interaction-less slide', () => {
    const contentSlide: Slide = {
      id: 's',
      phase: 'connectRegulate',
      title: { en: 'Hi', es: 'Hola' },
      kind: 'content',
    };
    const p = buildSlideProgress(roster, {}, [], contentSlide);
    expect(p.counts.done).toBe(0);
    expect(p.counts.notStarted).toBe(3);
  });
});
