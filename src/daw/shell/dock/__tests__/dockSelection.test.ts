// @vitest-environment jsdom
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── The track row's instrument button (milestone 2.15) ─────────────────────
// openTrackInDock selects the track and opens the dock on what plays it:
// Instrument (controls) for a MIDI or drum track, the chain (fx) for an
// audio track, with Master given back and focus put in the dock. A track a
// collaborator holds stays theirs (false, nothing changes); unlike a clip's
// click it works during a lesson too.
//
// Run: npx vitest run src/daw/shell/dock/__tests__/dockSelection.test.ts

const h = vi.hoisted(() => ({ notice: vi.fn() }));
vi.mock('@/daw/shell/notice', () => ({ notice: h.notice }));

import { useStore } from '@/daw/store';
import type { UserPresence } from '@/daw/collab/types';
import { openTrackInDock } from '../dockSelection';

const s = () => useStore.getState();

// The focus move runs a frame later: run it now.
const raf = window.requestAnimationFrame;
beforeAll(() => {
  window.requestAnimationFrame = (cb) => {
    cb(0);
    return 0;
  };
});
afterAll(() => {
  window.requestAnimationFrame = raf;
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ remoteUsers: new Map() });
  h.notice.mockClear();
  document.body.innerHTML = '';
});

describe('openTrackInDock', () => {
  it('opens Instrument for a MIDI track and selects it', () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    s().setSelectedTrackId(null);

    expect(openTrackInDock(keys)).toBe(true);
    expect(s().selectedTrackId).toBe(keys);
    expect(s().channelStripTab).toBe('controls');
  });

  it('opens Instrument for a drum track too', () => {
    const drums = s().addTrack('midi', 'drum-machine', 'Drums');
    s().setChannelStripTab('piano-roll');

    expect(openTrackInDock(drums)).toBe(true);
    expect(s().channelStripTab).toBe('controls');
  });

  it('opens the effects for an audio track', () => {
    const take = s().addTrack('audio', 'none', 'Take');

    expect(openTrackInDock(take)).toBe(true);
    expect(s().channelStripTab).toBe('fx');
  });

  it('gives Master’s slot back to the track', () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    s().setChannelStripTab('controls');
    s().setDockMaster(true);

    openTrackInDock(keys);
    expect(s().dockMaster).toBe(false);
  });

  it('puts focus in the dock', () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    const dock = document.createElement('div');
    dock.tabIndex = -1;
    dock.setAttribute('data-dock-content', '');
    document.body.append(dock);

    openTrackInDock(keys);
    expect(document.activeElement).toBe(dock);
  });

  it('refuses a track a collaborator holds, and changes nothing', () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    const bass = s().addTrack('midi', 'soundfont', 'Bass');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('fx');
    s().setDockMaster(true);
    useStore.setState({
      remoteUsers: new Map([
        [
          2,
          {
            userId: 'u2',
            userName: 'Sam',
            color: '#f0a',
            selectedTrackId: bass,
          } as unknown as UserPresence,
        ],
      ]),
    });

    expect(openTrackInDock(bass)).toBe(false);
    expect(s().selectedTrackId).toBe(keys);
    expect(s().channelStripTab).toBe('fx');
    expect(s().dockMaster).toBe(true);
  });

  it('works during a lesson: it is the student’s own choice', () => {
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    const take = s().addTrack('audio', 'none', 'Take');
    s().setSelectedTrackId(keys);
    s().setChannelStripTab('prism');
    useStore.setState({ activeTutorialId: 'make-first-track' } as never);

    expect(openTrackInDock(take)).toBe(true);
    expect(s().selectedTrackId).toBe(take);
    expect(s().channelStripTab).toBe('fx');
  });

  it('is false for a track that isn’t there', () => {
    expect(openTrackInDock('gone')).toBe(false);
    expect(s().channelStripTab).toBeNull();
  });
});
