// @vitest-environment jsdom
import { Fragment, useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { useStoreBridge } from '../useStoreBridge';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { BASS, PAD } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  captureSynthState,
  cacheSynthState,
  defaultSynthTrackState,
  getActiveSynthTrack,
  getTrackSynthState,
  setTrackSynthState,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';

const synth = () => useSynthStore.getState();

// No detected key unless a test sets one: the follow-key mirror would
// otherwise write it into every patch a panel shows.
beforeEach(() => {
  useStore.setState({
    detectedKeyRootPc: null,
    detectedMode: null,
    selectedTrackId: null,
  });
});

afterEach(cleanup);

// The inline synth strip stays mounted under the full-screen pop-out, so two
// bridges end up on the same track at once.
describe('useStoreBridge with two panels on one track', () => {
  beforeEach(() => {
    useSynthStore.getState().loadPreset('INITIALIZE');
    cacheSynthState('t1', captureSynthState());
  });

  it('opening a second panel keeps the sound picked since the last cache', () => {
    const inline = renderHook(() => useStoreBridge(null, 't1'));
    useSynthStore.getState().loadPreset('BASS');

    const popOut = renderHook(() => useStoreBridge(null, 't1'));
    expect(useSynthStore.getState().presetName).toBe('BASS');

    popOut.unmount();
    inline.unmount();
  });

  it('closing the second panel leaves the track live for saving', () => {
    const inline = renderHook(() => useStoreBridge(null, 't1'));
    const popOut = renderHook(() => useStoreBridge(null, 't1'));
    popOut.unmount();

    expect(getActiveSynthTrack()).toBe('t1');
    useSynthStore.getState().loadPreset('PAD');
    expect(getTrackSynthState('t1')?.presetName).toBe('PAD');

    inline.unmount();
    expect(getActiveSynthTrack()).toBeNull();
  });
});

/** The panel on one track, then on another (selecting a track re-renders it). */
function openPanel(trackId: string) {
  return renderHook(({ id }) => useStoreBridge(null, id), {
    initialProps: { id: trackId },
  });
}

/** The panel on the track selected in the main store, as in the app. */
function SelectedPanel() {
  const id = useStore((s) => s.selectedTrackId);
  useStoreBridge(null, id);
  return null;
}

/** The channel strip, remounted for each selected track (TrackControlsPanel). */
function KeyedStrip() {
  const id = useStore((s) => s.selectedTrackId);
  return id ? (
    <Fragment key={id}>
      <SelectedPanel />
    </Fragment>
  ) : null;
}

// synth-store-05, engine-hooks-28, state-reload-32, synth-ui-17: a track with
// no patch of its own kept whatever the previous track left in the shared
// store. Its sound changed when its panel opened, and that patch was saved as
// its own.
describe('useStoreBridge on a track with no patch of its own', () => {
  beforeEach(() => {
    useSynthStore.setState(useSynthStore.getInitialState(), true);
    bumpSessionGeneration('test');
    setTrackSynthState('bass', synthTrackStateFromPreset(BASS, 120));
  });

  it("opens on the default patch, never the previous track's", () => {
    const panel = openPanel('bass');
    synth().setFilterParam(0, 'cutoff', 321);

    panel.rerender({ id: 'pad' });
    expect(captureSynthState()).toEqual(defaultSynthTrackState());
    expect(synth().presetName).toBe('INITIALIZE');
    // The bass keeps its own patch, edit included.
    expect(getTrackSynthState('bass')?.presetName).toBe('BASS');
    expect(getTrackSynthState('bass')?.filters[0].cutoff).toBe(321);
  });

  it('saves no patch for it until it is edited', () => {
    const panel = openPanel('bass');
    panel.rerender({ id: 'pad' });
    expect(getTrackSynthState('pad')).toBeUndefined();

    panel.rerender({ id: 'bass' });
    expect(getTrackSynthState('pad')).toBeUndefined();
  });

  it('keeps each track its own patch once edited', () => {
    const panel = openPanel('bass');
    panel.rerender({ id: 'pad' });
    synth().loadPreset('PAD');

    panel.rerender({ id: 'bass' });
    expect(synth().presetName).toBe('BASS');
    panel.rerender({ id: 'pad' });
    expect(synth().presetName).toBe('PAD');
  });
});

// A load or reset bumps the session generation, clears the patch cache and
// seeds the new project's patches. A panel left open over a track id the new
// project reuses (kept work restored, a project reopened) must show the new
// project's patch, and the patch it was showing must not be cached under that
// id: it belongs to the outgoing project.
describe('useStoreBridge across a load that reuses the track id', () => {
  const pad = () => synthTrackStateFromPreset(PAD, 120);

  beforeEach(() => {
    useSynthStore.setState(useSynthStore.getInitialState(), true);
    bumpSessionGeneration('test');
    setTrackSynthState('t1', synthTrackStateFromPreset(BASS, 120));
  });

  it("shows the new project's patch, not the one it was showing", () => {
    const panel = openPanel('t1');
    synth().setFilterParam(0, 'cutoff', 777); // unsaved in the old project

    act(() => {
      bumpSessionGeneration('reopen');
      setTrackSynthState('t1', pad());
    });
    expect(synth().presetName).toBe('PAD');
    expect(getTrackSynthState('t1')).toEqual(captureSynthState());
    expect(getTrackSynthState('t1')?.filters[0].cutoff).toBe(
      pad().filters[0].cutoff,
    );

    panel.unmount();
    expect(getTrackSynthState('t1')?.presetName).toBe('PAD');
  });

  it('shows the default patch when the new project has none for it', () => {
    openPanel('t1');
    act(() => {
      bumpSessionGeneration('restore');
    });
    expect(captureSynthState()).toEqual(defaultSynthTrackState());
    expect(getTrackSynthState('t1')).toBeUndefined();
  });

  it('caches nothing of the old project when it closes as the load lands', () => {
    let setOpen: (open: boolean) => void = () => {};
    function Panel() {
      useStoreBridge(null, 't1');
      return null;
    }
    function Strip() {
      const [open, set] = useState(true);
      setOpen = set;
      return open ? <Panel /> : null;
    }
    render(<Strip />);
    synth().setFilterParam(0, 'cutoff', 777);

    act(() => {
      bumpSessionGeneration('restore');
      setTrackSynthState('t1', pad());
      setOpen(false);
    });
    expect(getActiveSynthTrack()).toBeNull();
    expect(getTrackSynthState('t1')?.presetName).toBe('PAD');
    expect(getTrackSynthState('t1')?.filters[0].cutoff).not.toBe(777);
  });

  it('shows the new patch once with two panels open, and keeps it live', () => {
    const inline = openPanel('t1');
    const popOut = openPanel('t1');

    act(() => {
      bumpSessionGeneration('reopen');
      setTrackSynthState('t1', pad());
    });
    expect(synth().presetName).toBe('PAD');

    popOut.unmount();
    expect(getActiveSynthTrack()).toBe('t1');
    synth().setFilterParam(0, 'cutoff', 900);
    expect(getTrackSynthState('t1')?.filters[0].cutoff).toBe(900);
    inline.unmount();
  });
});

// In the app the panel follows the selected track in the main store
// (useOracleSynthInstance), and the channel strip is keyed by track id
// (TrackControlsPanel), so a new selection remounts the panel. A load resets
// the selection in the same store write that lands its tracks, so the bump
// and the selection change reach the panel in one render: the panel leaves
// the old track (unmount or switch) in the new generation, while the store
// still holds the outgoing project's patch. Caching that patch under the
// reused id would replace the reopened project's own.
describe('useStoreBridge when the load also changes the selection', () => {
  beforeEach(() => {
    useSynthStore.setState(useSynthStore.getInitialState(), true);
    bumpSessionGeneration('test');
    setTrackSynthState('A', synthTrackStateFromPreset(BASS, 120));
    useStore.setState({ selectedTrackId: 'A' });
  });

  it('caches nothing of the old project as the strip closes on it', () => {
    render(<KeyedStrip />);
    synth().setFilterParam(0, 'cutoff', 777);

    act(() => {
      bumpSessionGeneration('restore');
      setTrackSynthState('A', synthTrackStateFromPreset(PAD, 120));
      useStore.setState({ selectedTrackId: 'B' });
    });
    expect(getTrackSynthState('A')?.presetName).toBe('PAD');
    expect(getTrackSynthState('A')?.filters[0].cutoff).not.toBe(777);
    // The new selection shows its own (default) patch.
    expect(getActiveSynthTrack()).toBe('B');
    expect(captureSynthState()).toEqual(defaultSynthTrackState());
  });

  it('caches nothing of the old project as one panel moves to another track', () => {
    render(<SelectedPanel />);
    synth().setFilterParam(0, 'cutoff', 555);

    act(() => {
      bumpSessionGeneration('reopen');
      setTrackSynthState('A', synthTrackStateFromPreset(PAD, 120));
      useStore.setState({ selectedTrackId: 'B' });
    });
    expect(getTrackSynthState('A')?.presetName).toBe('PAD');
    expect(getTrackSynthState('A')?.filters[0].cutoff).not.toBe(555);
  });

  it('still caches the patch on a selection change within a session', () => {
    render(<KeyedStrip />);
    synth().setFilterParam(0, 'cutoff', 444);

    act(() => {
      useStore.setState({ selectedTrackId: 'B' });
    });
    expect(getTrackSynthState('A')?.filters[0].cutoff).toBe(444);
  });
});

// The follow-project-key mirror copies the detected key into a following
// patch's Key/Scale, only when it differs (an equal write would still replace
// keyScale, which every patch watcher reads as an edit).
describe('useStoreBridge following the project key', () => {
  beforeEach(() => {
    useSynthStore.setState(useSynthStore.getInitialState(), true);
    bumpSessionGeneration('test');
    const patch = defaultSynthTrackState();
    patch.keyScale = {
      ...patch.keyScale,
      followProjectKey: true,
      rootPc: 2,
      mode: 'dorian',
    };
    setTrackSynthState('t1', patch);
  });

  /** Count the mirror's writes from here on. */
  function spyOnKeyScale() {
    const setKeyScale = vi.fn(synth().setKeyScale);
    useSynthStore.setState({ setKeyScale });
    return setKeyScale;
  }

  it('writes nothing when the patch already has the detected key', () => {
    openPanel('t1');
    const setKeyScale = spyOnKeyScale();

    act(() => {
      useStore.setState({ detectedKeyRootPc: 2, detectedMode: 'dorian' });
    });
    expect(setKeyScale).not.toHaveBeenCalled();
  });

  it('writes once when the detected key differs, and leaves no dirty preset', () => {
    openPanel('t1');
    const setKeyScale = spyOnKeyScale();

    act(() => {
      useStore.setState({ detectedKeyRootPc: 7, detectedMode: 'mixolydian' });
    });
    expect(setKeyScale).toHaveBeenCalledTimes(1);
    expect(synth().keyScale).toMatchObject({ rootPc: 7, mode: 'mixolydian' });
    expect(synth().isDirty).toBe(false);
  });
});

// The mirror is the app's write, not the student's. On a track still showing
// its untouched default patch it must leave the track without a patch of its
// own: otherwise opening a synth panel in any project with a detected key
// other than C major edited the project (it saved a patch, changed the save
// status and counted as work to keep).
describe('the follow-key mirror on a track with no patch of its own', () => {
  beforeEach(() => {
    useSynthStore.setState(useSynthStore.getInitialState(), true);
    bumpSessionGeneration('test');
    useStore.setState({ detectedKeyRootPc: 9, detectedMode: 'aeolian' });
  });

  it('shows the detected key, and the track still saves no patch', () => {
    const panel = openPanel('fresh');
    expect(synth().keyScale).toMatchObject({ rootPc: 9, mode: 'aeolian' });
    expect(getTrackSynthState('fresh')).toBeUndefined();

    panel.unmount();
    expect(getTrackSynthState('fresh')).toBeUndefined();
  });

  it('saves no patch on a first open from another track (keyed remount)', () => {
    setTrackSynthState('bass', synthTrackStateFromPreset(BASS, 120));
    useStore.setState({ selectedTrackId: 'bass' });
    render(<KeyedStrip />);

    act(() => {
      useStore.setState({ selectedTrackId: 'fresh' });
    });
    expect(getTrackSynthState('fresh')).toBeUndefined();
    expect(getTrackSynthState('bass')?.presetName).toBe('BASS');
  });

  it('saves no patch when the key is detected while the panel is open', () => {
    useStore.setState({ detectedKeyRootPc: null, detectedMode: null });
    openPanel('fresh');

    act(() => {
      useStore.setState({ detectedKeyRootPc: 2, detectedMode: 'dorian' });
    });
    expect(synth().keyScale).toMatchObject({ rootPc: 2, mode: 'dorian' });
    expect(getTrackSynthState('fresh')).toBeUndefined();
  });

  it("makes the patch the track's own once the student edits it", () => {
    openPanel('fresh');
    synth().setFilterParam(0, 'cutoff', 640);

    const patch = getTrackSynthState('fresh');
    expect(patch?.filters[0].cutoff).toBe(640);
    expect(patch?.keyScale).toMatchObject({ rootPc: 9, mode: 'aeolian' });
  });
});
