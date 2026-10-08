// @vitest-environment jsdom
import { Profiler, useEffect } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── TransportBar (shell-17) ────────────────────────────────────────────────
// The bar subscribed to the whole tracks array for one button, so every
// fader tick or note drag re-rendered it, its File menu and its dialogs; and
// its position readout re-rendered with every playback tick (~30 a second)
// although its text changes once a sixteenth. The readout now writes its
// text itself, only when it changes, and Skip Forward reads the tracks when
// pressed, counting audio clips too.

const h = vi.hoisted(() => ({
  commits: {} as Record<string, number>,
  seekTo: null as unknown as (tick: number) => void,
}));

vi.mock('@/daw/dev/DevProfiler', () => ({
  useDevCommitCount: (id: string) => {
    // As the real hook: once per commit of the calling component.
    useEffect(() => {
      h.commits[id] = (h.commits[id] ?? 0) + 1;
    });
  },
}));
vi.mock('@/daw/hooks/useTransport', () => ({
  seekTo: (tick: number) => h.seekTo(tick),
}));
// The bar's menus and collab dialogs aren't under test.
vi.mock('../FileMenu', () => ({ FileMenu: () => null }));
vi.mock('@/daw/collab/ui/CollabToolbar', () => ({ CollabToolbar: () => null }));
vi.mock('@/daw/collab/ui/LeaveSavePrompt', () => ({
  LeaveSavePrompt: () => null,
}));
vi.mock('@/daw/collab/ui/KickedModal', () => ({ KickedModal: () => null }));
vi.mock('@/daw/collab/ui/WaitingForSessionModal', () => ({
  WaitingForSessionModal: () => null,
}));
vi.mock('@/daw/commands/requestRecord', () => ({ requestRecord: vi.fn() }));

import { useStore } from '@/daw/store';
import { TransportBar } from '../TransportBar';

const s = () => useStore.getState();
const BAR = 1920;

let barCommits = 0;
function renderBar() {
  return render(
    <Profiler id="bar" onRender={() => (barCommits += 1)}>
      <TransportBar onInit={() => {}} isReady />
    </Profiler>,
  );
}

const readout = () => screen.getByTitle('Bar : Beat : Sixteenth');

let keys = '';

beforeEach(() => {
  h.commits = {};
  h.seekTo = vi.fn();
  barCommits = 0;
  useStore.setState({ tracks: [], markers: [], position: 0 });
  s().setTimeSignature(4, 4);
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
});

afterEach(cleanup);

describe('the position readout', () => {
  it('counts bars, beats and sixteenths', () => {
    renderBar();
    expect(readout().textContent).toBe('1:1:1');
    act(() => s().setPosition(BAR + 480 + 120));
    expect(readout().textContent).toBe('2:2:2');
    // A metre change re-counts the same tick: 2520 is bar 2, beat 3 in 3/4.
    act(() => s().setTimeSignature(3, 4));
    expect(readout().textContent).toBe('2:3:2');
  });

  it('commits nothing while playback moves the playhead', () => {
    renderBar();
    const committed = barCommits;
    const self = h.commits.TransportBar;

    // Four bars of playback, written as the transport does (~30 a second).
    for (let tick = 0; tick <= 4 * BAR; tick += 64) {
      act(() => s().setPosition(tick));
    }

    expect(readout().textContent).toBe('5:1:1');
    expect(barCommits).toBe(committed);
    expect(h.commits.TransportBar).toBe(self);
  });

  it('writes only when its text changes', () => {
    renderBar();
    const cells = readout().firstChild;
    act(() => s().setPosition(30));
    act(() => s().setPosition(60));
    // Still 1:1:1: the same cells, untouched.
    expect(readout().firstChild).toBe(cells);
    act(() => s().setPosition(120));
    expect(readout().firstChild).not.toBe(cells);
  });

  it('holds each digit in a fixed cell, as FixedDigits does', () => {
    renderBar();
    const cells = [...readout().children] as HTMLElement[];
    expect(cells.map((c) => c.textContent)).toEqual(['1', ':', '1', ':', '1']);
    expect(cells.map((c) => c.style.width)).toEqual([
      '0.62em',
      '0.32em',
      '0.62em',
      '0.32em',
      '0.62em',
    ]);
    expect(cells.every((c) => c.style.display === 'inline-block')).toBe(true);
  });
});

describe('track edits', () => {
  it('do not re-render the bar', () => {
    renderBar();
    const committed = barCommits;
    for (let i = 1; i <= 20; i++) {
      act(() => s().updateTrack(keys, { volume: i / 20 }));
    }
    expect(barCommits).toBe(committed);
  });
});

describe('Skip Forward', () => {
  const skipForward = () => fireEvent.click(screen.getByTitle('Skip Forward'));

  it('goes to the end of a song made only of audio', () => {
    const vocals = s().addTrack('audio', 'vocal-fx', 'Vocals');
    s().addAudioClip(vocals, {
      id: 'take-1',
      startTick: BAR,
      duration: 2 * BAR,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    });
    renderBar();
    skipForward();
    expect(h.seekTo).toHaveBeenCalledWith(3 * BAR);
  });

  it('still stops at the next marker first', () => {
    s().addMidiClip(keys, {
      id: 'clip-1',
      startTick: 0,
      events: [
        {
          note: 60,
          velocity: 90,
          startTick: 0,
          durationTicks: 4 * BAR,
          channel: 0,
        },
      ],
    });
    useStore.setState({
      markers: [{ id: 'm1', tick: 2 * BAR, name: 'Chorus', color: '#fff' }],
    } as never);
    renderBar();
    skipForward();
    expect(h.seekTo).toHaveBeenLastCalledWith(2 * BAR);

    act(() => s().setPosition(2 * BAR));
    skipForward();
    expect(h.seekTo).toHaveBeenLastCalledWith(4 * BAR);
  });
});
