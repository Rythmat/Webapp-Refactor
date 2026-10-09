// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The set-list offer listens to saves of the open project only ───────────
// Every save path fires 'ma-studio-project-saved' with {projectId,
// generation}. A save still in flight when another project opened finishes
// in the new session, and a Save As copy the session let go of names another
// project: neither may ask about the open project's set lists.

const staleFor = vi.fn(() => [
  {
    setListId: 'set-1',
    setListTitle: 'Friday gig',
    entry: { id: 'entry-1' },
  },
]);

vi.mock('@/features/setlists/useSetLists', () => ({
  useSetLists: () => ({ lists: [], status: 'ready', actions: {} }),
  useProjectSetListEntries: () => ({
    carrying: [],
    canSend: true,
    staleFor,
    actions: { unlinkProject: vi.fn(), replaceProjectChart: vi.fn() },
    flush: vi.fn(),
  }),
}));

import {
  bumpSessionGeneration,
  getSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { PROJECT_SAVED_EVENT, SetListUpdatePrompt } from '../SendToSetList';

function saved(detail: unknown): void {
  act(() => {
    window.dispatchEvent(new CustomEvent(PROJECT_SAVED_EVENT, { detail }));
  });
}

const asked = () => screen.queryByText('Update the Set List chart?');

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.getState().setProjectId('p1');
  staleFor.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('SetListUpdatePrompt', () => {
  it('asks after a save of the open project in this session', () => {
    render(<SetListUpdatePrompt />);
    saved({ projectId: 'p1', generation: getSessionGeneration() });
    expect(asked()).not.toBeNull();
  });

  it("ignores another project's save", () => {
    render(<SetListUpdatePrompt />);
    saved({ projectId: 'p2', generation: getSessionGeneration() });
    expect(asked()).toBeNull();
    expect(staleFor).not.toHaveBeenCalled();
  });

  it('ignores a save from a session that has gone', () => {
    render(<SetListUpdatePrompt />);
    const before = getSessionGeneration();
    bumpSessionGeneration('test');
    saved({ projectId: 'p1', generation: before });
    expect(asked()).toBeNull();
  });

  it('ignores a save event with nothing to say which project', () => {
    render(<SetListUpdatePrompt />);
    saved(undefined);
    expect(asked()).toBeNull();
  });
});
