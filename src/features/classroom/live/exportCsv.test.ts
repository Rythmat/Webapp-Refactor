// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Interaction, InteractionResponsePayload } from '../types';
import { buildSessionCsv } from './exportCsv';
import type { SessionState } from './sessionsStore';

const sessionFixture: Pick<
  SessionState,
  'sessionId' | 'classroomId' | 'startedAt' | 'endedAt'
> = {
  sessionId: 'sess-1',
  classroomId: 'classroom-1',
  startedAt: '2026-07-08T10:00:00.000Z',
  endedAt: '2026-07-08T10:30:00.000Z',
};

const interaction = (id: string, type: Interaction['type']): Interaction => ({
  id,
  type,
  question: { en: `Q ${id}` },
  shareable: true,
  ...(type === 'choice'
    ? { choice: { options: [{ en: 'a' }, { en: 'b' }], multi: false } }
    : {}),
  ...(type === 'atlas'
    ? { atlas: { module: 'learn', activityRef: 'act-1', expects: 'score' } }
    : {}),
});

const payload = <T extends InteractionResponsePayload>(p: T): T => p;

describe('buildSessionCsv', () => {
  it('emits a header row plus one row per response', () => {
    const csv = buildSessionCsv({
      session: sessionFixture,
      publishedDayTitle: 'Day 1',
      interactions: [interaction('ix-choice', 'choice')],
      responsesByEnrollment: {
        'enr-1': {
          'ix-choice': payload({ kind: 'choice', choices: [0] }),
        },
      },
    });
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('sessionId');
    expect(lines[1]).toContain('ix-choice');
  });

  it('serializes each of the six payload kinds correctly', () => {
    const csv = buildSessionCsv({
      session: sessionFixture,
      publishedDayTitle: 'Day 1',
      interactions: [
        interaction('ix-choice', 'choice'),
        interaction('ix-text', 'text'),
        interaction('ix-number', 'number'),
        interaction('ix-draw', 'draw'),
        interaction('ix-check', 'check-in'),
        interaction('ix-atlas', 'atlas'),
      ],
      responsesByEnrollment: {
        'enr-1': {
          'ix-choice': payload({ kind: 'choice', choices: [0, 2] }),
          'ix-text': payload({ kind: 'text', text: 'hi' }),
          'ix-number': payload({ kind: 'number', value: 7 }),
          'ix-draw': payload({
            kind: 'draw',
            strokes: [{}, {}, {}],
          }),
          'ix-check': payload({ kind: 'check-in', value: '🙂' }),
          'ix-atlas': payload({
            kind: 'atlas',
            module: 'learn',
            activityRef: 'act-1',
            result: { score: 8, max: 10 },
          }),
        },
      },
    });
    expect(csv).toContain(',choice,0|2,');
    expect(csv).toContain(',text,hi,');
    expect(csv).toContain(',number,7,');
    expect(csv).toContain(',draw,[3 strokes],');
    expect(csv).toContain(',check-in,TEACHER_ONLY:🙂,');
    expect(csv).toContain(',atlas,"act-1|{""score"":8,""max"":10}",');
  });

  it('RFC-4180 escapes commas, quotes, and newlines', () => {
    const csv = buildSessionCsv({
      session: sessionFixture,
      publishedDayTitle: 'Day, with comma',
      interactions: [interaction('ix-text', 'text')],
      responsesByEnrollment: {
        'enr-1': {
          'ix-text': payload({
            kind: 'text',
            text: 'hello, "world"\nline two',
          }),
        },
      },
    });
    expect(csv).toContain('"Day, with comma"');
    expect(csv).toContain('"hello, ""world""\nline two"');
    const lines = csv.split(/\r?\n/);
    // header + 1 escaped-single-row (note the embedded newline is INSIDE a quoted field)
    expect(lines.length).toBe(3);
  });

  it('returns just the header when there are no responses', () => {
    const csv = buildSessionCsv({
      session: sessionFixture,
      publishedDayTitle: 'Empty Day',
      interactions: [],
      responsesByEnrollment: {},
    });
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('uses getDisplayName when provided', () => {
    const csv = buildSessionCsv({
      session: sessionFixture,
      publishedDayTitle: 'Day 1',
      interactions: [interaction('ix-text', 'text')],
      responsesByEnrollment: {
        'enr-1': { 'ix-text': payload({ kind: 'text', text: 'ok' }) },
      },
      getDisplayName: (id) => (id === 'enr-1' ? 'Ada' : undefined),
    });
    expect(csv).toContain(',Ada,');
  });

  it('falls back to startedAt when endedAt is missing', () => {
    const csv = buildSessionCsv({
      session: { ...sessionFixture, endedAt: undefined },
      publishedDayTitle: 'Day 1',
      interactions: [interaction('ix-text', 'text')],
      responsesByEnrollment: {
        'enr-1': { 'ix-text': payload({ kind: 'text', text: 'ok' }) },
      },
    });
    expect(csv).toContain(sessionFixture.startedAt);
  });
});
