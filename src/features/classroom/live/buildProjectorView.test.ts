/**
 * Rule 2 — Response-privacy firewall tests.
 *
 * Two invariants:
 *   (a) Student A's client state must never contain student B's response
 *       payloads. Enforced by `buildParticipantView`.
 *   (b) Projector-view payloads must contain no participant identifiers, and
 *       `check-in` interactions must NEVER surface on the projector.
 *       Enforced by `buildProjectorView`.
 *
 * See docs/classroom-v2/ws-protocol.md "Projector sockets" for the
 * server-side half of Rule 2.
 */
import { describe, expect, it } from 'vitest';
import type { Interaction, InteractionResponse } from '../types';
import { buildParticipantView } from './buildParticipantView';
import { buildProjectorView } from './buildProjectorView';

const IDENTIFIER_MARKERS = ['enrollmentid', 'displayname'];

const choiceInteraction: Interaction = {
  id: 'ix-choice',
  type: 'choice',
  question: { en: 'Which chord is it?' },
  shareable: true,
  choice: {
    options: [{ en: 'C major' }, { en: 'G major' }, { en: 'D minor' }],
    multi: false,
  },
};

const textInteraction: Interaction = {
  id: 'ix-text',
  type: 'text',
  question: { en: 'Describe the feeling in one word.' },
  shareable: true,
  text: { maxLen: 40 },
};

const nonShareableInteraction: Interaction = {
  id: 'ix-private-text',
  type: 'text',
  question: { en: 'A private prompt the teacher opted out of sharing.' },
  shareable: false,
  text: { maxLen: 100 },
};

const checkInInteraction: Interaction = {
  id: 'ix-checkin',
  type: 'check-in',
  question: { en: 'How are you today?' },
  shareable: true, // Deliberately-wrong. The selector must refuse regardless.
  checkIn: { style: 'emoji' },
};

const makeResponse = (
  overrides: Partial<InteractionResponse>,
): InteractionResponse => ({
  id: 'r-' + Math.random().toString(36).slice(2, 8),
  interactionId: 'ix-choice',
  enrollmentId: 'en-secret-student-name-123',
  sessionId: 'sess-abc',
  payload: { kind: 'text', text: 'placeholder' },
  createdAt: '2026-07-15T14:23:00Z',
  ...overrides,
});

// ============================================================
// Rule 2a — buildParticipantView
// ============================================================

describe('buildParticipantView firewall (Rule 2a)', () => {
  it("never includes another participant's response payload", () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'en-alice',
        payload: { kind: 'text', text: 'alice-answer' },
      }),
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'en-bob',
        payload: { kind: 'text', text: 'bob-answer' },
      }),
    ];

    const aliceView = buildParticipantView(responses, 'en-alice');
    const serialized = JSON.stringify(aliceView);

    expect(serialized).toContain('alice-answer');
    expect(serialized).not.toContain('bob-answer');
    expect(serialized).not.toContain('en-bob');
  });

  it('scopes to a single interaction when interactionId is provided', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'en-alice',
        payload: { kind: 'text', text: 'alice-text' },
      }),
      makeResponse({
        interactionId: 'ix-choice',
        enrollmentId: 'en-alice',
        payload: { kind: 'choice', choices: [0] },
      }),
    ];

    const view = buildParticipantView(responses, 'en-alice', 'ix-text');
    expect(view.responses).toHaveLength(1);
    expect(view.responses[0].payload).toEqual({
      kind: 'text',
      text: 'alice-text',
    });
  });

  it('emits only the whitelisted response fields', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'en-alice',
        payload: { kind: 'text', text: 'alice' },
      }),
    ];

    const view = buildParticipantView(responses, 'en-alice');
    const keys = Object.keys(view.responses[0]).sort();
    expect(keys).toEqual(['createdAt', 'id', 'interactionId', 'payload']);
  });
});

// ============================================================
// Rule 2b — buildProjectorView
// ============================================================

describe('buildProjectorView firewall (Rule 2b)', () => {
  it('emits no participant identifiers on the projector payload', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'en-alice',
        payload: { kind: 'text', text: 'Curious' },
      }),
      makeResponse({
        interactionId: 'ix-text',
        enrollmentId: 'en-bob',
        payload: { kind: 'text', text: 'Focused' },
      }),
    ];

    const view = buildProjectorView(textInteraction, responses, 'sess-abc');
    expect(view.emit).toBe(true);
    expect(view.responses).toHaveLength(2);

    const serialized = JSON.stringify(view).toLowerCase();
    // The identifier field names themselves must not appear on the wire.
    for (const marker of IDENTIFIER_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
    // The identifier VALUES must not appear either.
    expect(serialized).not.toContain('en-alice');
    expect(serialized).not.toContain('en-bob');
  });

  it('refuses to emit a check-in interaction on the projector at all', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-checkin',
        payload: { kind: 'check-in', value: 'tired' },
      }),
    ];

    const view = buildProjectorView(checkInInteraction, responses, 'sess-abc');
    expect(view.emit).toBe(false);
    expect(view.reason).toBe('check_in');
    expect(view.responses).toEqual([]);
  });

  it('respects the `shareable === false` flag on non-check-in interactions', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-private-text',
        payload: { kind: 'text', text: 'do not project this' },
      }),
    ];

    const view = buildProjectorView(
      nonShareableInteraction,
      responses,
      'sess-abc',
    );
    expect(view.emit).toBe(false);
    expect(view.reason).toBe('not_shareable');
    expect(view.responses).toEqual([]);
  });

  it('anonymizes identifiers deterministically within a session', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-choice',
        enrollmentId: 'en-alice',
        payload: { kind: 'choice', choices: [0] },
      }),
      makeResponse({
        interactionId: 'ix-choice',
        enrollmentId: 'en-alice',
        payload: { kind: 'choice', choices: [1] },
      }),
      makeResponse({
        interactionId: 'ix-choice',
        enrollmentId: 'en-bob',
        payload: { kind: 'choice', choices: [2] },
      }),
    ];

    const view = buildProjectorView(choiceInteraction, responses, 'sess-abc');
    const anons = view.responses.map((r) => r.anon);

    expect(anons[0]).toBe(anons[1]); // Same enrollment → same anon within session
    expect(anons[0]).not.toBe(anons[2]);
    for (const anon of anons) {
      expect(anon.startsWith('anon-')).toBe(true);
    }
  });

  it('anonymizes differently across sessions (session-scoped anons)', () => {
    const response = makeResponse({
      interactionId: 'ix-choice',
      enrollmentId: 'en-alice',
      payload: { kind: 'choice', choices: [0] },
    });

    const viewA = buildProjectorView(choiceInteraction, [response], 'sess-a');
    const viewB = buildProjectorView(choiceInteraction, [response], 'sess-b');

    expect(viewA.responses[0].anon).not.toBe(viewB.responses[0].anon);
  });

  it('emits only the whitelisted response fields on the projector shape', () => {
    const responses = [
      makeResponse({
        interactionId: 'ix-text',
        payload: { kind: 'text', text: 'answer' },
      }),
    ];

    const view = buildProjectorView(textInteraction, responses, 'sess-abc');
    const keys = Object.keys(view.responses[0]).sort();
    expect(keys).toEqual(['anon', 'createdAt', 'payload']);
  });
});
