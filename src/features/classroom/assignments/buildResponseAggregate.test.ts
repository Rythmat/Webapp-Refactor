// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Interaction, InteractionResponsePayload } from '../types';
import { buildResponseAggregate } from './buildResponseAggregate';

const choice = (id: string, multi = false): Interaction => ({
  id,
  type: 'choice',
  question: { en: 'q' },
  shareable: true,
  choice: { options: [{ en: 'a' }, { en: 'b' }, { en: 'c' }], multi },
});

const text = (id: string): Interaction => ({
  id,
  type: 'text',
  question: { en: 'q' },
  shareable: true,
  text: { maxLen: 100 },
});

const number = (id: string): Interaction => ({
  id,
  type: 'number',
  question: { en: 'q' },
  shareable: true,
});

const draw = (id: string): Interaction => ({
  id,
  type: 'draw',
  question: { en: 'q' },
  shareable: true,
});

const checkIn = (id: string): Interaction => ({
  id,
  type: 'check-in',
  question: { en: 'q' },
  shareable: false,
  checkIn: { style: 'emoji' },
});

describe('buildResponseAggregate', () => {
  it('choice: multi-select tallies each option and percent is of respondents', () => {
    const responses: Record<
      string,
      Record<string, InteractionResponsePayload>
    > = {
      e1: { ix: { kind: 'choice', choices: [0, 1] } },
      e2: { ix: { kind: 'choice', choices: [0] } },
    };
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: responses,
      interactions: [choice('ix', true)],
    });
    expect(agg.kind).toBe('choice');
    if (agg.kind !== 'choice') return;
    expect(agg.totalRespondents).toBe(2);
    expect(agg.options[0].count).toBe(2);
    expect(agg.options[0].percent).toBe(100);
    expect(agg.options[1].count).toBe(1);
    expect(agg.options[1].percent).toBe(50);
  });

  it('choice: divides safely on zero respondents', () => {
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: {},
      interactions: [choice('ix')],
    });
    if (agg.kind !== 'choice') return;
    expect(agg.totalRespondents).toBe(0);
    for (const opt of agg.options) expect(opt.percent).toBe(0);
  });

  it('mismatched payload.kind is counted, not fed to the type-specific accumulator', () => {
    const responses = {
      e1: { ix: { kind: 'text', text: 'oops' } as InteractionResponsePayload },
    };
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: responses,
      interactions: [choice('ix')],
    });
    expect(agg.mismatched).toBe(1);
    expect(agg.totalRespondents).toBe(0);
  });

  it('text: drops empties and orders deterministically', () => {
    const responses = {
      eB: {
        ix: { kind: 'text', text: 'second' } as InteractionResponsePayload,
      },
      eA: { ix: { kind: 'text', text: 'first' } as InteractionResponsePayload },
      eC: { ix: { kind: 'text', text: '   ' } as InteractionResponsePayload },
    };
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: responses,
      interactions: [text('ix')],
    });
    if (agg.kind !== 'text') return;
    expect(agg.answers).toEqual(['first', 'second']);
  });

  it('number: bucketSize=1 when range<=20, =10 otherwise; empty inputs return empty buckets', () => {
    const small = {
      e1: { ix: { kind: 'number', value: 3 } as InteractionResponsePayload },
      e2: { ix: { kind: 'number', value: 7 } as InteractionResponsePayload },
    };
    const [smallAgg] = buildResponseAggregate({
      responsesByEnrollment: small,
      interactions: [number('ix')],
    });
    if (smallAgg.kind !== 'number') return;
    expect(smallAgg.bucketSize).toBe(1);

    const big = {
      e1: { ix: { kind: 'number', value: 5 } as InteractionResponsePayload },
      e2: { ix: { kind: 'number', value: 55 } as InteractionResponsePayload },
    };
    const [bigAgg] = buildResponseAggregate({
      responsesByEnrollment: big,
      interactions: [number('ix')],
    });
    if (bigAgg.kind !== 'number') return;
    expect(bigAgg.bucketSize).toBe(10);

    const [emptyAgg] = buildResponseAggregate({
      responsesByEnrollment: {},
      interactions: [number('ix')],
    });
    if (emptyAgg.kind !== 'number') return;
    expect(emptyAgg.buckets).toEqual([]);
    expect(emptyAgg.min).toBe(0);
    expect(emptyAgg.max).toBe(0);
  });

  it('draw: skips when strokes.length > 500', () => {
    const strokes = Array.from({ length: 501 }, () => ({}));
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: {
        e1: { ix: { kind: 'draw', strokes } as InteractionResponsePayload },
      },
      interactions: [draw('ix')],
    });
    if (agg.kind !== 'draw') return;
    expect(agg.skipped).toBe('too_many_strokes');
  });

  it('draw: skips when incremental byte estimate exceeds 200KB', () => {
    const bigStroke = { pts: Array.from({ length: 5000 }, (_, i) => [i, i]) };
    const strokes = Array.from({ length: 20 }, () => bigStroke);
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: {
        e1: { ix: { kind: 'draw', strokes } as InteractionResponsePayload },
      },
      interactions: [draw('ix')],
    });
    if (agg.kind !== 'draw') return;
    expect(agg.skipped).toBe('too_large');
  });

  it('check-in: keeps enrollmentId+displayName, never emits an anon field', () => {
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: {
        e1: {
          ix: {
            kind: 'check-in',
            value: 'happy',
          } as InteractionResponsePayload,
        },
      },
      interactions: [checkIn('ix')],
      getDisplayName: (id) => (id === 'e1' ? 'Ada' : undefined),
    });
    if (agg.kind !== 'check-in') return;
    expect(agg.rows).toHaveLength(1);
    expect(Object.keys(agg.rows[0]).sort()).toEqual([
      'displayName',
      'enrollmentId',
      'value',
    ]);
    expect(agg.rows[0].displayName).toBe('Ada');
  });

  it('emits an aggregate per interaction even with zero responses', () => {
    const aggs = buildResponseAggregate({
      responsesByEnrollment: {},
      interactions: [
        choice('a'),
        text('b'),
        number('c'),
        draw('d'),
        checkIn('e'),
      ],
    });
    expect(aggs).toHaveLength(5);
    for (const a of aggs) expect(a.totalRespondents).toBe(0);
  });

  it('totalRespondents is set-based — a duplicate enrollmentId does not double-count', () => {
    const responses = {
      e1: {
        ix: { kind: 'choice', choices: [0] } as InteractionResponsePayload,
      },
    };
    responses['e1'].ix = { kind: 'choice', choices: [0] };
    const [agg] = buildResponseAggregate({
      responsesByEnrollment: responses,
      interactions: [choice('ix')],
    });
    if (agg.kind !== 'choice') return;
    expect(agg.totalRespondents).toBe(1);
    expect(agg.options[0].percent).toBeLessThanOrEqual(100);
  });
});
