/**
 * buildVizAggregate tests — tallies/percentages from both constructor paths,
 * plus THE FIREWALL TEST: identified responses run through the REAL
 * `buildProjectorView`, then `fromProjectorView`, and nothing identifying may
 * survive into the viz aggregate. Marker strings are deliberately loud
 * (ENROLL-SECRET-*, Alice SECRETNAME) so a leak is unmistakable.
 */
import { describe, expect, it } from 'vitest';
import { buildResponseAggregate } from '../../assignments/buildResponseAggregate';
import {
  buildProjectorView,
  type ProjectorView,
} from '../../live/buildProjectorView';
import type { Interaction, InteractionResponse } from '../../types';
import {
  fromProjectorView,
  fromResponseAggregate,
  toWordCloud,
} from './buildVizAggregate';

const numberInteraction: Interaction = {
  id: 'ix-number',
  type: 'number',
  question: { en: 'Rate 1-5' },
  shareable: true,
  number: { min: 1, max: 5 },
};

const choiceInteraction: Interaction = {
  id: 'ix-choice',
  type: 'choice',
  question: { en: 'Which instrument leads?', es: '¿Qué instrumento lidera?' },
  shareable: true,
  choice: {
    options: [
      { en: 'Bass', es: 'Bajo' },
      { en: 'Drums', es: 'Batería' },
      { en: 'Keys' }, // no es → must fall back to en
    ],
    multi: false,
  },
};

const textInteraction: Interaction = {
  id: 'ix-text',
  type: 'text',
  question: { en: 'One word for the mood?' },
  shareable: true,
  text: { maxLen: 40 },
};

const checkInInteraction: Interaction = {
  id: 'ix-checkin',
  type: 'check-in',
  question: { en: 'How are you today?' },
  shareable: true, // Deliberately-wrong. The belt must refuse regardless.
  checkIn: { style: 'emoji' },
};

const makeResponse = (
  overrides: Partial<InteractionResponse>,
): InteractionResponse => ({
  id: 'r-' + Math.random().toString(36).slice(2, 8),
  interactionId: 'ix-choice',
  enrollmentId: 'ENROLL-SECRET-0',
  sessionId: 'sess-viz',
  payload: { kind: 'choice', choices: [0] },
  createdAt: '2026-07-22T10:00:00Z',
  ...overrides,
});

/** Identified teacher-side aggregate: 4 respondents → counts 2 / 1 / 1. */
const teacherChoiceAggregate = () =>
  buildResponseAggregate({
    interactions: [choiceInteraction],
    responsesByEnrollment: {
      'ENROLL-SECRET-1': { 'ix-choice': { kind: 'choice', choices: [0] } },
      'ENROLL-SECRET-2': { 'ix-choice': { kind: 'choice', choices: [0] } },
      'ENROLL-SECRET-3': { 'ix-choice': { kind: 'choice', choices: [1] } },
      'ENROLL-SECRET-4': { 'ix-choice': { kind: 'choice', choices: [2] } },
    },
    getDisplayName: (id) => `Alice SECRETNAME (${id})`,
  })[0];

// ============================================================
// fromResponseAggregate — teacher path
// ============================================================

describe('fromResponseAggregate', () => {
  it('tallies choice counts with integer percents and en labels', () => {
    const viz = fromResponseAggregate(teacherChoiceAggregate(), 'en');
    expect(viz).toEqual({
      kind: 'choice',
      total: 4,
      options: [
        { label: 'Bass', count: 2, percent: 50 },
        { label: 'Drums', count: 1, percent: 25 },
        { label: 'Keys', count: 1, percent: 25 },
      ],
    });
  });

  it('resolves es labels with en fallback for untranslated options', () => {
    const viz = fromResponseAggregate(teacherChoiceAggregate(), 'es');
    if (viz?.kind !== 'choice') throw new Error('expected choice viz');
    expect(viz.options.map((o) => o.label)).toEqual([
      'Bajo',
      'Batería',
      'Keys',
    ]);
  });

  it('collects text answers', () => {
    const aggregate = buildResponseAggregate({
      interactions: [textInteraction],
      responsesByEnrollment: {
        'ENROLL-SECRET-1': { 'ix-text': { kind: 'text', text: 'Dreamy' } },
        'ENROLL-SECRET-2': { 'ix-text': { kind: 'text', text: 'Bouncy' } },
      },
    })[0];

    const viz = fromResponseAggregate(aggregate, 'en');
    expect(viz).toEqual({
      kind: 'text',
      answers: ['Dreamy', 'Bouncy'],
      total: 2,
    });
  });

  it('returns null for kinds we do not visualize (check-in)', () => {
    const aggregate = buildResponseAggregate({
      interactions: [checkInInteraction],
      responsesByEnrollment: {
        'ENROLL-SECRET-1': { 'ix-checkin': { kind: 'check-in', value: 'ok' } },
      },
    })[0];
    expect(fromResponseAggregate(aggregate, 'en')).toBeNull();
  });

  it('emits percent 0 (not NaN) when nobody has responded', () => {
    const aggregate = buildResponseAggregate({
      interactions: [choiceInteraction],
      responsesByEnrollment: {},
    })[0];
    const viz = fromResponseAggregate(aggregate, 'en');
    if (viz?.kind !== 'choice') throw new Error('expected choice viz');
    expect(viz.total).toBe(0);
    expect(viz.options.every((o) => o.percent === 0)).toBe(true);
  });

  it('carries no identities even on the identified teacher path', () => {
    const serialized = JSON.stringify(
      fromResponseAggregate(teacherChoiceAggregate(), 'en'),
    );
    expect(serialized).not.toContain('ENROLL-SECRET');
    expect(serialized).not.toContain('SECRETNAME');
    expect(serialized).not.toContain('Alice');
  });
});

// ============================================================
// fromProjectorView — projector path
// ============================================================

describe('fromProjectorView', () => {
  it('tallies choice counts/percents from a real ProjectorView', () => {
    const responses = [
      makeResponse({ enrollmentId: 'ENROLL-SECRET-1' }),
      makeResponse({ enrollmentId: 'ENROLL-SECRET-2' }),
      makeResponse({
        enrollmentId: 'ENROLL-SECRET-3',
        payload: { kind: 'choice', choices: [1] },
      }),
      makeResponse({
        enrollmentId: 'ENROLL-SECRET-4',
        payload: { kind: 'choice', choices: [2] },
      }),
    ];

    const view = buildProjectorView(choiceInteraction, responses, 'sess-viz');
    const viz = fromProjectorView(choiceInteraction, view, 'en');
    expect(viz).toEqual({
      kind: 'choice',
      total: 4,
      options: [
        { label: 'Bass', count: 2, percent: 50 },
        { label: 'Drums', count: 1, percent: 25 },
        { label: 'Keys', count: 1, percent: 25 },
      ],
    });
  });

  it('dedupes to the latest response per anonymous respondent', () => {
    const responses = [
      makeResponse({
        enrollmentId: 'ENROLL-SECRET-1',
        payload: { kind: 'choice', choices: [0] },
        createdAt: '2026-07-22T10:00:00Z',
      }),
      makeResponse({
        enrollmentId: 'ENROLL-SECRET-1',
        payload: { kind: 'choice', choices: [1] },
        createdAt: '2026-07-22T10:05:00Z',
      }),
    ];

    const view = buildProjectorView(choiceInteraction, responses, 'sess-viz');
    const viz = fromProjectorView(choiceInteraction, view, 'en');
    if (viz?.kind !== 'choice') throw new Error('expected choice viz');
    expect(viz.total).toBe(1);
    expect(viz.options.map((o) => o.count)).toEqual([0, 1, 0]);
  });

  it('collects trimmed text answers in arrival order', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'ENROLL-SECRET-1',
        payload: { kind: 'text', text: '  Dreamy  ' },
        createdAt: '2026-07-22T10:00:00Z',
      }),
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'ENROLL-SECRET-2',
        payload: { kind: 'text', text: 'Bouncy' },
        createdAt: '2026-07-22T10:01:00Z',
      }),
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'ENROLL-SECRET-3',
        payload: { kind: 'text', text: '   ' }, // blank → counted, not shown
        createdAt: '2026-07-22T10:02:00Z',
      }),
    ];

    const view = buildProjectorView(textInteraction, responses, 'sess-viz');
    const viz = fromProjectorView(textInteraction, view, 'en');
    expect(viz).toEqual({
      kind: 'text',
      answers: ['Dreamy', 'Bouncy'],
      total: 3,
    });
  });

  it('THE FIREWALL TEST: no enrollment ids or display names survive', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'ENROLL-SECRET-1',
        payload: { kind: 'text', text: 'Curious' },
      }),
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'ENROLL-SECRET-2',
        payload: { kind: 'text', text: 'Focused' },
      }),
    ];

    const view = buildProjectorView(textInteraction, responses, 'sess-viz');
    const viz = fromProjectorView(textInteraction, view, 'en');

    const serialized = JSON.stringify(viz);
    expect(serialized).toContain('Curious'); // the payloads themselves flow
    expect(serialized).not.toContain('ENROLL-SECRET-1');
    expect(serialized).not.toContain('ENROLL-SECRET-2');
    expect(serialized).not.toContain('Alice SECRETNAME');
    expect(serialized.toLowerCase()).not.toContain('enrollmentid');
    expect(serialized.toLowerCase()).not.toContain('displayname');
  });

  it('returns null for a check-in interaction even when handed a forged emitting view (belt)', () => {
    const forged: ProjectorView = {
      emit: true, // buildProjectorView would never emit this
      interactionId: 'ix-checkin',
      responses: [
        {
          anon: 'anon-aaaaaa',
          createdAt: '2026-07-22T10:00:00Z',
          payload: { kind: 'check-in', value: 'tired' },
        },
      ],
    };
    expect(fromProjectorView(checkInInteraction, forged, 'en')).toBeNull();
  });

  it('returns null when the view does not emit', () => {
    const view = buildProjectorView(
      { ...textInteraction, shareable: false },
      [],
      'sess-viz',
    );
    expect(fromProjectorView(textInteraction, view, 'en')).toBeNull();
  });

  it('returns null when the view belongs to a different interaction', () => {
    const view = buildProjectorView(textInteraction, [], 'sess-viz');
    expect(fromProjectorView(choiceInteraction, view, 'en')).toBeNull();
  });

  it('tallies a scale (number) distribution over the interaction range', () => {
    const responses = [1, 4, 4, 5].map((v, i) =>
      makeResponse({
        interactionId: 'ix-number',
        enrollmentId: `ENROLL-SECRET-${i}`,
        payload: { kind: 'number', value: v },
      }),
    );
    const view = buildProjectorView(numberInteraction, responses, 'sess-viz');
    const viz = fromProjectorView(numberInteraction, view, 'en');
    if (viz?.kind !== 'scale') throw new Error('expected scale viz');
    expect(viz.min).toBe(1);
    expect(viz.max).toBe(5);
    expect(viz.total).toBe(4);
    expect(viz.points.map((p) => p.count)).toEqual([1, 0, 0, 2, 1]);
    // No identity survives the scale path either.
    const s = JSON.stringify(viz);
    expect(s).not.toContain('ENROLL-SECRET');
    expect(s.toLowerCase()).not.toContain('enrollmentid');
  });
});

// ============================================================
// toWordCloud — pure text frequency
// ============================================================

describe('toWordCloud', () => {
  it('tallies word frequency, strips stop-words + punctuation, sorts desc', () => {
    const words = toWordCloud([
      'the groove is funky',
      'Funky! Groove.',
      'funky',
    ]);
    expect(words[0]).toEqual({ text: 'funky', count: 3 });
    expect(words.map((w) => w.text)).toContain('groove');
    expect(words.map((w) => w.text)).not.toContain('the'); // stop word
    expect(words.map((w) => w.text)).not.toContain('is'); // stop word
  });

  it('returns [] for empty input', () => {
    expect(toWordCloud([])).toEqual([]);
  });
});
