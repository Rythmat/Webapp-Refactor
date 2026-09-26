/**
 * P0 task 5 — "no code path returns a `local-sess-` id while reporting
 * connected". `toTransportStatus` is the chokepoint that makes that
 * unrepresentable rather than merely unlikely, so it is tested exhaustively
 * over the full socket-status union.
 */
import { describe, expect, it } from 'vitest';
import {
  LOCAL_SESSION_PREFIX,
  TRANSPORT_COPY,
  isLocalSessionId,
  toTransportStatus,
  type SessionTransportStatus,
} from './connectionStatus';
import type { ConnectionStatus } from './sessionSocketController';
import { describeLocalSessionReason } from './useStartClassroomSession';

const ALL_SOCKET_STATUSES: ConnectionStatus[] = [
  'connecting',
  'connected',
  'disconnected',
  'error',
];

describe('isLocalSessionId', () => {
  it('matches only the local-mock prefix', () => {
    expect(isLocalSessionId(`${LOCAL_SESSION_PREFIX}abc123`)).toBe(true);
    expect(isLocalSessionId('sess-abc123')).toBe(false);
    expect(isLocalSessionId('')).toBe(false);
    // Not a substring match — a server id that merely contains the prefix
    // later in the string is still a server id.
    expect(isLocalSessionId(`srv-${LOCAL_SESSION_PREFIX}x`)).toBe(false);
  });
});

describe('toTransportStatus', () => {
  it('a local session reports `practice` for EVERY socket status', () => {
    const id = `${LOCAL_SESSION_PREFIX}m1x2y3`;
    for (const socket of ALL_SOCKET_STATUSES) {
      expect(
        toTransportStatus(id, socket),
        `local session reported "${toTransportStatus(id, socket)}" for socket "${socket}"`,
      ).toBe('practice');
    }
  });

  it('never reports `connected` for a local session — the load-bearing claim', () => {
    const results = ALL_SOCKET_STATUSES.map((s) =>
      toTransportStatus(`${LOCAL_SESSION_PREFIX}zz`, s),
    );
    expect(results).not.toContain('connected');
  });

  it('maps a server session straight through', () => {
    const id = 'sess-real-1';
    expect(toTransportStatus(id, 'connecting')).toBe('connecting');
    expect(toTransportStatus(id, 'connected')).toBe('connected');
  });

  it('folds both socket failure modes into `offline`', () => {
    expect(toTransportStatus('sess-real-1', 'disconnected')).toBe('offline');
    expect(toTransportStatus('sess-real-1', 'error')).toBe('offline');
  });
});

describe('TRANSPORT_COPY', () => {
  const statuses: SessionTransportStatus[] = [
    'connecting',
    'connected',
    'offline',
    'practice',
  ];

  it('covers every status with a label and a capability-naming detail', () => {
    for (const s of statuses) {
      expect(TRANSPORT_COPY[s]?.label, `${s} label`).toBeTruthy();
      expect(TRANSPORT_COPY[s]?.detail, `${s} detail`).toBeTruthy();
    }
  });

  it('practice copy says plainly that students cannot join', () => {
    expect(TRANSPORT_COPY.practice.detail.toLowerCase()).toContain(
      'students cannot join',
    );
    expect(TRANSPORT_COPY.practice.label).toBe('Practice');
  });

  it('only the real connected state is labelled Live', () => {
    const live = statuses.filter((s) => TRANSPORT_COPY[s].label === 'Live');
    expect(live).toEqual(['connected']);
  });
});

describe('describeLocalSessionReason', () => {
  it('explains every fallback cause, including templated http codes', () => {
    expect(describeLocalSessionReason('no-token')).toContain('not signed in');
    expect(describeLocalSessionReason('network')).toContain('could not be');
    expect(describeLocalSessionReason('no-session-id')).toContain('no session');
    expect(describeLocalSessionReason('http-503')).toContain('503');
    expect(describeLocalSessionReason('http-401')).toContain('401');
  });

  it('never returns an empty string for an unexpected reason', () => {
    expect(
      describeLocalSessionReason('something-else' as never).length,
    ).toBeGreaterThan(0);
  });
});
