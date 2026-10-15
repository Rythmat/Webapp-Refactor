// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

// ── The dock keeps the tab a project was left on ───────────────────────────
// Which dock tab is open (channelStripTab) is per-project view state, kept
// in the draft and restored with it (decision D5). The strip opened Controls
// whenever it saw a project's first track arrive. It mounts empty, before the
// editor's boot restores the draft, so that fired on every refresh and
// replaced the restored tab; and since the strip remounts on every return to
// Create from another view, it fired there too. Now only a closed strip, or a
// value that isn't one of its tabs, opens on Controls; a tab that doesn't
// apply to the selected track still falls back to it.
//
// A project opened in place of another (a template, a cloud project, kept
// work restored) goes from some tracks straight to others, so the strip
// tells it apart by the session generation every load moves on. The load
// resets the tab with the rest of the project (initialProjectState), and the
// new project opens on Controls; a restored tab stays.

// The tabs' contents and their engines aren't under test.
vi.mock('@/daw/components/PianoRoll/PianoRoll', () => ({
  PianoRoll: () => null,
}));
vi.mock('@/daw/components/Controls/TrackControlsPanel', () => ({
  TrackControlsPanel: () => null,
}));
vi.mock('@/daw/components/Effects/EffectsPanel', () => ({
  EffectsPanel: () => null,
}));
vi.mock('@/daw/components/Prism/PrismPanel', () => ({
  PrismPanel: () => null,
}));
vi.mock('@/daw/components/Controls/GroovesBrowser', () => ({
  GroovesBrowser: () => null,
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true }),
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import {
  initialProjectState,
  resetProjectState,
} from '@/daw/persistence/projectDocument/initialState';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import { ChannelStrip } from '../ChannelStrip';

const s = () => useStore.getState();

/**
 * A project of melodic tracks (the first selected) as a load puts it in the
 * store, built off screen and cleared from the store again.
 */
function project(names: string[]) {
  const ids = names.map((name) => s().addTrack('midi', 'piano-sampler', name));
  const built = { tracks: s().tracks, selectedTrackId: ids[0] };
  useStore.setState({ tracks: [], selectedTrackId: null });
  return built;
}

/** A one-track project (Keys, selected). */
const keysProject = () => project(['Keys']);

/**
 * Open `next` in place of the project, as a loader does once the load is
 * certain: a new session generation, then what it decoded over a new
 * project's state, in one write (sessionGeneration.ts).
 */
function openInPlace(next: object, reason: string) {
  bumpSessionGeneration(reason);
  useStore.setState({ ...initialProjectState(), ...next });
}

beforeEach(() => {
  useStore.setState({
    tracks: [],
    remoteUsers: new Map(),
    selectedTrackId: null,
    channelStripTab: null,
  });
  s().setSelectedClip(null, null);
});

afterEach(cleanup);

describe('ChannelStrip keeps a restored tab', () => {
  it('keeps the tab a refreshed project restores into the empty strip', () => {
    const restored = keysProject();
    render(<ChannelStrip />);

    // The boot restores the draft in one write, after the strip has mounted.
    act(() => useStore.setState({ ...restored, channelStripTab: 'fx' }));

    expect(s().channelStripTab).toBe('fx');
  });

  it('keeps a restored piano roll on a melodic track', () => {
    const restored = keysProject();
    render(<ChannelStrip />);

    act(() =>
      useStore.setState({ ...restored, channelStripTab: 'piano-roll' }),
    );

    expect(s().channelStripTab).toBe('piano-roll');
  });

  it('keeps the tab when it mounts over an open project', () => {
    // Back in Create from another view, or back in the editor: the strip
    // mounts again over the same project.
    useStore.setState({ ...keysProject(), channelStripTab: 'fx' });
    render(<ChannelStrip />);
    expect(s().channelStripTab).toBe('fx');

    cleanup();
    render(<ChannelStrip />);
    expect(s().channelStripTab).toBe('fx');
  });

  it('opens on Controls when the first track arrives with the strip closed', () => {
    render(<ChannelStrip />);
    expect(s().channelStripTab).toBeNull();

    act(() => {
      s().addTrack('midi', 'piano-sampler', 'Keys');
    });

    expect(s().channelStripTab).toBe('controls');
  });

  it('opens on Controls when it mounts closed over a project', () => {
    useStore.setState(keysProject());
    render(<ChannelStrip />);

    expect(s().channelStripTab).toBe('controls');
  });

  it('falls back to Controls when the restored tab doesn’t apply to the selected track', () => {
    const restored = keysProject();
    render(<ChannelStrip />);

    // Grooves is a drum machine's tab; Keys is a melodic track.
    act(() => useStore.setState({ ...restored, channelStripTab: 'grooves' }));

    expect(s().channelStripTab).toBe('controls');
  });

  it('falls back to Controls for a value that isn’t one of its tabs', () => {
    const restored = keysProject();
    render(<ChannelStrip />);

    act(() =>
      useStore.setState({
        ...restored,
        // As a hand-edited draft could hold.
        channelStripTab: 'mixer' as ChannelStripTabId,
      }),
    );
    expect(s().channelStripTab).toBe('controls');

    // And when one arrives while the project is already open.
    act(() =>
      useStore.setState({ channelStripTab: 'mixer' as ChannelStripTabId }),
    );
    expect(s().channelStripTab).toBe('controls');
  });
});

describe('ChannelStrip on a project opened in place of another', () => {
  it('opens a template on Controls, not on the last project’s tab', () => {
    const template = project(['Drums', 'Bass']);
    useStore.setState({
      ...project(['A', 'B', 'C']),
      channelStripTab: 'fx',
    });
    render(<ChannelStrip />);

    // From three tracks straight to two: no first track to see.
    act(() => openInPlace(template, 'template'));

    expect(s().tracks.map((t) => t.name)).toEqual(['Drums', 'Bass']);
    expect(s().channelStripTab).toBe('controls');
  });

  it('keeps the tab of kept work restored in place of the project', () => {
    const kept = project(['Keys', 'Pad']);
    useStore.setState({ ...project(['A', 'B', 'C']), channelStripTab: 'fx' });
    render(<ChannelStrip />);

    act(() =>
      openInPlace({ ...kept, channelStripTab: 'piano-roll' }, 'restore'),
    );

    expect(s().channelStripTab).toBe('piano-roll');
  });

  it('opens on Controls when a restored value isn’t one of its tabs', () => {
    const kept = keysProject();
    useStore.setState({ ...project(['A', 'B']), channelStripTab: 'fx' });
    render(<ChannelStrip />);

    act(() =>
      openInPlace(
        { ...kept, channelStripTab: 'mixer' as ChannelStripTabId },
        'restore',
      ),
    );

    expect(s().channelStripTab).toBe('controls');
  });

  it('opens on Controls after New when the student adds the first track', () => {
    useStore.setState({ ...keysProject(), channelStripTab: 'fx' });
    render(<ChannelStrip />);

    act(() => resetProjectState('new'));
    expect(s().channelStripTab).toBeNull();

    act(() => {
      s().addTrack('midi', 'piano-sampler', 'Keys');
    });
    expect(s().channelStripTab).toBe('controls');
  });

  it('leaves a strip the student closed closed while they edit', () => {
    useStore.setState({ ...keysProject(), channelStripTab: 'fx' });
    render(<ChannelStrip />);

    act(() => s().setChannelStripTab(null));
    act(() => {
      s().addTrack('midi', 'piano-sampler', 'Pad');
    });

    expect(s().channelStripTab).toBeNull();
  });

  it('opens a loaded project once: closing the strip after it holds', () => {
    const template = project(['Drums', 'Bass']);
    useStore.setState({ ...keysProject(), channelStripTab: 'fx' });
    render(<ChannelStrip />);
    act(() => openInPlace(template, 'template'));
    expect(s().channelStripTab).toBe('controls');

    act(() => s().setChannelStripTab(null));
    act(() => {
      s().addTrack('midi', 'piano-sampler', 'Pad');
    });

    expect(s().channelStripTab).toBeNull();
  });
});
