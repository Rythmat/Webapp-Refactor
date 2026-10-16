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

// ── The transport (shell-17; the TransportBar until milestone 2.5) ─────────
// The bar subscribed to the whole tracks array for one button, so every
// fader tick or note drag re-rendered it, its File menu and its dialogs; and
// its position readout re-rendered with every playback tick (~30 a second)
// although its text changes once a sixteenth. The readout now writes its
// text itself, only when it changes, and Forward reads the tracks when
// pressed, counting audio clips too. The readout's second mode (m:ss.t) is
// the student's pref.

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
vi.mock('@/daw/commands/requestRecord', () => ({ requestRecord: vi.fn() }));

import { useStore } from '@/daw/store';
import {
  endPlayheadRun,
  setPlayheadSourceForTests,
  startPlayheadRun,
} from '@/daw/engine/playheadClock';
import { TransportControls } from '../TransportControls';

const s = () => useStore.getState();
const BAR = 1920;

let barCommits = 0;
function renderBar() {
  return render(
    <Profiler id="bar" onRender={() => (barCommits += 1)}>
      <TransportControls onInit={() => {}} isReady />
    </Profiler>,
  );
}

const readout = () => screen.getByTestId('position-readout-text');

let keys = '';

beforeEach(() => {
  h.commits = {};
  h.seekTo = vi.fn();
  barCommits = 0;
  useStore.setState({
    tracks: [],
    markers: [],
    position: 0,
    readoutMode: 'bars',
    isCountingIn: false,
  });
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
    const self = h.commits.TransportControls;

    // Four bars of playback, written as the transport does (~30 a second).
    for (let tick = 0; tick <= 4 * BAR; tick += 64) {
      act(() => s().setPosition(tick));
    }

    expect(readout().textContent).toBe('5:1:1');
    expect(barCommits).toBe(committed);
    expect(h.commits.TransportControls).toBe(self);
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

describe('the readout while playing', () => {
  // 120 bpm: 960 ticks a second, the transport started at 0 from tick 0.
  const now = { t: 0 };
  let frames: FrameRequestCallback[] = [];
  const runFrame = () => {
    const due = frames;
    frames = [];
    for (const cb of due) act(() => cb(performance.now()));
  };

  beforeEach(() => {
    now.t = 0;
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
    setPlayheadSourceForTests({
      currentTime: () => now.t,
      outputLatency: () => 0,
      ticksAtTime: (time) => time * 960,
      scheduleTime: () => now.t + 0.1,
    });
  });
  afterEach(() => {
    endPlayheadRun();
    setPlayheadSourceForTests();
    vi.unstubAllGlobals();
  });

  it('counts from the playhead clock, with no store write and no commit', () => {
    renderBar();
    const committed = barCommits;
    let writes = 0;
    const off = useStore.subscribe(() => (writes += 1));
    startPlayheadRun(0, 0);
    // Four seconds at 30 frames a second: bar 3.
    for (let i = 1; i <= 120; i++) {
      now.t = i / 30;
      runFrame();
    }
    off();
    expect(readout().textContent).toBe('3:1:1');
    expect(writes).toBe(0);
    expect(barCommits).toBe(committed);
  });

  it('skips to the marker after where the student hears the playhead, and back', () => {
    useStore.setState({
      markers: [
        { id: 'm1', tick: BAR, name: 'Verse', color: '#fff' },
        { id: 'm2', tick: 3 * BAR, name: 'Chorus', color: '#fff' },
      ],
    } as never);
    renderBar();
    startPlayheadRun(0, 0);
    now.t = 3; // 2880, past the verse
    fireEvent.click(screen.getByRole('button', { name: /^Forward/ }));
    expect(h.seekTo).toHaveBeenLastCalledWith(3 * BAR);
    fireEvent.click(
      screen.getByRole('button', { name: /^Back to the previous marker/ }),
    );
    expect(h.seekTo).toHaveBeenLastCalledWith(BAR);
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

describe('Forward', () => {
  const skipForward = () =>
    fireEvent.click(screen.getByRole('button', { name: /^Forward/ }));

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

describe('the readout in minutes and seconds', () => {
  it('switches on a click, and keeps the student’s choice', () => {
    useStore.setState({ bpm: 120 });
    renderBar();
    act(() => s().setPosition(960 * 75 + 96));
    expect(readout().textContent).toBe('38:3:1');
    fireEvent.click(screen.getByTestId('position-readout'));
    expect(s().readoutMode).toBe('time');
    // 72,096 ticks at 120 bpm (960 a second): 75.1 s.
    expect(readout().textContent).toBe('1:15.1');
    fireEvent.click(screen.getByTestId('position-readout'));
    expect(s().readoutMode).toBe('bars');
  });

  it('says Count-in while a count-in runs', () => {
    renderBar();
    act(() => useStore.setState({ isCountingIn: true }));
    expect(screen.getByTestId('position-readout').textContent).toContain(
      'Count-in',
    );
  });
});
