// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The set-list offer listens to saves of the open project only ───────────
// Every save path fires 'ma-studio-project-saved' with {projectId,
// generation}. A save still in flight when another project opened finishes
// in the new session, and a Save As copy the session let go of names another
// project: neither may ask about the open project's set lists.

const h = vi.hoisted(() => {
  /** The set's copy: six bars of C, one section, in C major. */
  const storedChart = {
    title: 'Set title',
    key: 'C major',
    keyRoot: 0,
    mode: 'major',
    tempo: 120,
    timeSignature: [4, 4],
    sections: [
      {
        id: 's1',
        label: 'A',
        bars: Array.from({ length: 6 }, () => ({
          chords: [{ degree: '1', chordName: 'C', beat: 1, duration: 4 }],
        })),
      },
    ],
  };
  const carried = {
    setListId: 'set-1',
    setListTitle: 'Friday gig',
    entry: { id: 'entry-1', chart: storedChart },
  };
  return {
    carried,
    staleFor: vi.fn(() => [carried]),
    replaceProjectChart: vi.fn(),
  };
});
const { staleFor } = h;

vi.mock('@/components/utils/toast', () => ({ showSuccess: vi.fn() }));
vi.mock('@/features/setlists/useSetLists', () => ({
  useSetLists: () => ({ lists: [], status: 'ready', actions: {} }),
  useProjectSetListEntries: () => ({
    carrying: [h.carried],
    canSend: true,
    staleFor: h.staleFor,
    actions: {
      unlinkProject: vi.fn(),
      replaceProjectChart: h.replaceProjectChart,
    },
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

/** `count` bars of chords, one to a bar: what the project holds now. */
const bars = (count = 8) =>
  Array.from({ length: count }, (_, bar) => ({
    id: `c${bar}`,
    startTick: bar * 1920,
    endTick: (bar + 1) * 1920,
    name: '1 maj',
    noteName: 'C maj',
    color: [1, 2, 3] as [number, number, number],
  }));

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.getState().setProjectId('p1');
  useStore.setState({ chordRegions: bars(), rootNote: 0 });
  staleFor.mockClear();
  h.replaceProjectChart.mockClear();
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

// ── An update that would lose the set's chart isn't offered (leadsheet-04) ──
// A project reopened without its chord lane, or refreshed without its
// sections, used to be offered as "the new version" over the set's page,
// the one place the chart survived. Keeping the old page is the main
// action, and an update keeps each entry's own title.

describe('the update offer', () => {
  const offer = () =>
    saved({ projectId: 'p1', generation: getSessionGeneration() });

  it('says what each copy holds, and makes keeping the old one the main action', () => {
    render(<SetListUpdatePrompt />);
    offer();
    expect(
      screen.getByText(/On the set list: 6 bars · 1 section · C major/),
    ).not.toBeNull();
    expect(screen.getByText(/^8 bars · 1 section · C major/)).not.toBeNull();
    const keep = screen.getByRole('button', { name: 'Keep the old one' });
    expect(document.activeElement).toBe(keep);
    fireEvent.click(keep);
    expect(asked()).toBeNull();
    expect(h.replaceProjectChart).not.toHaveBeenCalled();
  });

  it("updates the chart and leaves the entry's title as the set has it", () => {
    render(<SetListUpdatePrompt />);
    offer();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(h.replaceProjectChart).toHaveBeenCalledWith(
      'set-1',
      'entry-1',
      expect.objectContaining({ key: 'C major' }),
      undefined,
    );
  });

  it('is not made for a chart with no chords', () => {
    useStore.setState({ chordRegions: [] });
    render(<SetListUpdatePrompt />);
    offer();
    expect(asked()).toBeNull();
  });

  it('is not made for a chart with fewer bars than the set holds', () => {
    useStore.setState({ chordRegions: bars(4) });
    render(<SetListUpdatePrompt />);
    offer();
    expect(asked()).toBeNull();
  });
});
