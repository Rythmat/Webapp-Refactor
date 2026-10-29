// @vitest-environment jsdom
/**
 * A Promoter's mind map, end to end through the MSP plumbing: the board is
 * handed to the Globe tab, and the map comes back through the inbox the
 * student's live tab drains.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MindMapBoard } from '@/content/graph/mindMapBoard';
import { readMindMapHandoff, writeMindMapHandoff } from './mindMapHandoff';
import { appendMspLaunchParams } from './mspLaunchParams';
import { readMspInboxForUser } from './mspResponseInbox';
import { useMspModuleCompletion } from './useMspModuleCompletion';
import { useMspReport } from './useMspReport';

vi.mock('@/hooks/data', () => ({ useMe: () => ({ data: { id: 'acct-1' } }) }));

const BOARD: MindMapBoard = {
  focus: 'artist:ana-lux',
  goal: 1,
  nodes: [
    {
      id: 'artist:ana-lux',
      kind: 'artist',
      label: 'Ana Lux',
      stop: { artist: 'Ana Lux' },
    },
    {
      id: 'place:motor-city',
      kind: 'place',
      label: 'Motor City',
      stop: { place: 'city:motor-city' },
    },
  ],
  edges: [{ from: 'artist:ana-lux', to: 'place:motor-city', kind: 'born_in' }],
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
afterEach(cleanup);

describe('the mind-map handoff', () => {
  it('hands the board to the Globe tab by interaction id', () => {
    writeMindMapHandoff({
      interactionId: 'ix-1',
      board: BOARD,
      question: { en: 'Find 1 connection.' },
    });
    expect(readMindMapHandoff('ix-1')).toEqual({
      interactionId: 'ix-1',
      board: BOARD,
      question: { en: 'Find 1 connection.' },
    });
    expect(readMindMapHandoff('ix-2')).toBeNull();
  });

  it('ignores a handoff it cannot read', () => {
    window.localStorage.setItem('ma:globe-mindmap:v1:ix-1', '{"board":1}');
    expect(readMindMapHandoff('ix-1')).toBeNull();
  });
});

describe('a submitted mind map', () => {
  it('reaches the live tab through the inbox', () => {
    // The Globe tab, opened from the slide with the launch params.
    window.history.replaceState(
      {},
      '',
      appendMspLaunchParams('/globe?mindmap=1', {
        interactionId: 'ix-1',
        enrollmentId: 'enr-1',
        module: 'globe',
        activityRef: 'globe:mindmap',
        expects: 'artifact',
      }),
    );
    const onResult = vi.fn();
    renderHook(() => useMspReport('ix-1', 'globe', onResult));
    const globe = renderHook(() => useMspModuleCompletion());
    const map = {
      focus: 'artist:ana-lux' as const,
      nodeIds: ['place:motor-city' as const],
      edgeCount: 1,
    };

    act(() => {
      globe.result.current.reportResult({ kind: 'mindMap', map });
      // Idempotent per launch.
      globe.result.current.reportResult({ kind: 'mindMap', map });
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ kind: 'mindMap', map });
    // The live tab consumed it.
    expect(readMspInboxForUser('acct-1').entries).toEqual({});
  });

  it('knows which launch it came from', () => {
    window.history.replaceState(
      {},
      '',
      appendMspLaunchParams('/globe?mindmap=1', {
        interactionId: 'ix-9',
        enrollmentId: 'enr-1',
        module: 'globe',
        activityRef: 'globe:mindmap',
        expects: 'artifact',
      }),
    );
    const { result } = renderHook(() => useMspModuleCompletion());
    expect(result.current.launch()?.interactionId).toBe('ix-9');
  });
});
