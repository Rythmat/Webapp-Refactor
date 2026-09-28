/**
 * Rule 2 and the Capstone's "Present and the projector agree zone for zone",
 * pinned at the one place both surfaces now share.
 *
 * The failure this guards against is specific: Present is what the class sees
 * in a single-screen room, so if its reveal were built from the teacher's
 * identified view, every student's name would go up on the wall.
 */
import { describe, expect, it } from 'vitest';
import { resolveElements } from '../../slides/migrateDeckV1';
import { revealBandRect } from '../../slides/slideGrid';
import type { Interaction, InteractionResponse } from '../../types';
import { buildProjectorView } from '../buildProjectorView';
import { buildRevealNode } from './revealNode';

const textInteraction: Interaction = {
  id: 'ix-text',
  type: 'text',
  question: { en: 'What did you notice?' },
  shareable: true,
  text: { maxLen: 200 },
};

const checkIn: Interaction = {
  id: 'ix-checkin',
  type: 'check-in',
  question: { en: 'How are you?' },
  shareable: true,
  checkIn: { style: 'emoji' },
};

const responses: Record<string, Record<string, unknown>> = {
  'enr-1': { 'ix-text': { kind: 'text', text: 'the bassline' } },
  'enr-2': { 'ix-text': { kind: 'text', text: 'the horns' } },
  'enr-3': { 'ix-checkin': { kind: 'check-in', value: '🙂' } },
};

const base = {
  responsesByEnrollment: responses as never,
  sessionId: 'sess-1',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('the share gate', () => {
  it('renders nothing until the teacher shares that exact interaction', () => {
    expect(
      buildRevealNode({
        ...base,
        interaction: textInteraction,
        sharedInteractionIds: [],
      }),
    ).toBeNull();
    expect(
      buildRevealNode({
        ...base,
        interaction: textInteraction,
        sharedInteractionIds: ['some-other-id'],
      }),
    ).toBeNull();
  });

  it('renders once it IS shared', () => {
    expect(
      buildRevealNode({
        ...base,
        interaction: textInteraction,
        sharedInteractionIds: ['ix-text'],
      }),
    ).not.toBeNull();
  });
});

describe('Rule 2 — check-ins never reveal, even when shared', () => {
  it('returns null for a check-in the teacher explicitly shared', () => {
    expect(
      buildRevealNode({
        ...base,
        interaction: checkIn,
        sharedInteractionIds: ['ix-checkin'],
      }),
    ).toBeNull();
  });

  it('and the underlying projector view refuses it too', () => {
    const view = buildProjectorView(checkIn, [], 'sess-1');
    expect(view.emit).toBe(false);
    expect(view.reason).toBe('check_in');
  });

  it('refuses a non-shareable interaction', () => {
    const view = buildProjectorView(
      { ...textInteraction, shareable: false },
      [],
      'sess-1',
    );
    expect(view.emit).toBe(false);
    expect(view.reason).toBe('not_shareable');
  });
});

describe('no participant identifier survives into the reveal', () => {
  it('buildProjectorView strips enrollment ids and substitutes an anon', () => {
    const rows: InteractionResponse[] = Object.entries(responses).flatMap(
      ([enrollmentId, bag]) =>
        bag['ix-text']
          ? [
              {
                id: `r-${enrollmentId}`,
                interactionId: 'ix-text',
                enrollmentId,
                sessionId: 'sess-1',
                payload: bag['ix-text'],
                createdAt: '2026-01-01T00:00:00.000Z',
              } as InteractionResponse,
            ]
          : [],
    );
    const view = buildProjectorView(textInteraction, rows, 'sess-1');
    expect(view.emit).toBe(true);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('enr-1');
    expect(serialized).not.toContain('enr-2');
    for (const r of view.responses) expect(r.anon).toMatch(/^anon-/);
  });
});

describe('Present and the projector derive the SAME band', () => {
  // Both call revealBandRect(resolveElements(slide)); this pins that the shared
  // derivation really is slide-determined and surface-independent.
  const slides = [
    { id: 'a', kind: 'content', phase: 'connectRegulate', title: { en: 'T' } },
    {
      id: 'b',
      kind: 'content',
      phase: 'connectRegulate',
      title: { en: 'T' },
      body: { en: 'B' },
      media: { type: 'youtube', videoId: 'v' },
    },
    {
      id: 'c',
      kind: 'interaction',
      phase: 'respondReflectReset',
      title: { en: 'T' },
      interactionIds: ['ix-a', 'ix-b'],
    },
  ] as never[];

  it.each(slides.map((s, i) => [`slide ${i}`, s] as const))(
    '%s yields one rect regardless of who asks',
    (_label, slide) => {
      const a = revealBandRect(resolveElements(slide));
      const b = revealBandRect(resolveElements(slide));
      expect(a).toEqual(b);
      // And it is always a legal band.
      expect(a.y + a.h).toBeLessThanOrEqual(620);
      expect(a.w).toBeGreaterThanOrEqual(1152);
    },
  );
});
