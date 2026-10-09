// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INITIAL_CLOUD_SAVE_STATE,
  useCloudSaveStore,
  type LastSaved,
} from '@/daw/commands/cloudSaveStore';
import {
  INITIAL_DRAFT_STATUS,
  INITIAL_PENDING_MEDIA_STATUS,
  useDraftStatusStore,
} from '@/daw/persistence/drafts/draftStatusStore';
import {
  documentFingerprint,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import type { SaveChipState } from '../saveChipModel';
import {
  AUDIO_GRACE_MS,
  FINGERPRINT_QUIET_MS,
  useSaveChipState,
} from '../useSaveChipState';

// The controller outside React: it derives the chip from the stores, checks
// the fingerprint lazily (quiet time after the last documentVersion move),
// holds in-memory audio back a second, and re-renders only on a flip.

let version = 0;

function bump(n = 1): void {
  for (let i = 0; i < n; i++) {
    version += 1;
    useSaveStatusStore.setState({ documentVersion: version });
  }
}

function savedNow(over: Partial<LastSaved> = {}): LastSaved {
  return {
    projectId: 'p1',
    fingerprint: hashFingerprint(documentFingerprint()),
    version,
    complete: true,
    updatedAt: null,
    at: 1,
    generation: 0,
    ...over,
  };
}

const states: SaveChipState[] = [];
let renders = 0;

function Probe() {
  const chip = useSaveChipState();
  renders += 1;
  states.push(chip.state);
  return (
    <span
      data-testid="probe"
      data-state={chip.state}
      data-reason={chip.reason ?? 'none'}
      data-tip={chip.tooltip}
    />
  );
}

function mount() {
  let commits = 0;
  const view = render(
    <Profiler id="chip" onRender={() => (commits += 1)}>
      <Probe />
    </Profiler>,
  );
  const state = () =>
    view.getByTestId('probe').getAttribute('data-state') as SaveChipState;
  const attr = (name: string) => view.getByTestId('probe').getAttribute(name);
  return { state, attr, commits: () => commits };
}

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ projectId: 'p1' });
  version = 5;
  useSaveStatusStore.setState({ documentVersion: version });
  useCloudSaveStore.setState({ ...INITIAL_CLOUD_SAVE_STATE });
  useDraftStatusStore.setState({
    ...INITIAL_DRAFT_STATUS,
    draftId: 'd1',
    media: { ...INITIAL_PENDING_MEDIA_STATUS },
  });
  useSessionStore.setState({ ...INITIAL_SESSION_STATE, phase: 'ready' });
  states.length = 0;
  renders = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSaveChipState', () => {
  it('reads saved after a save and local before any', () => {
    const chip = mount();
    expect(chip.state()).toBe('local');
    act(() => useCloudSaveStore.setState({ lastSaved: savedNow() }));
    expect(chip.state()).toBe('saved');
  });

  it('reads saved again after undo back to the snapshot, via the throttled check', () => {
    useCloudSaveStore.setState({ lastSaved: savedNow() });
    const chip = mount();
    expect(chip.state()).toBe('saved');
    const bpm = useStore.getState().bpm;

    // An edit: another version and another document.
    act(() => {
      useStore.getState().setBpm(97);
      bump();
    });
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(FINGERPRINT_QUIET_MS));
    expect(chip.state()).toBe('local');

    // Undo: the version moves on, the document is the saved one again.
    act(() => {
      useStore.getState().setBpm(bpm);
      bump();
    });
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(FINGERPRINT_QUIET_MS - 1));
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(1));
    expect(chip.state()).toBe('saved');
  });

  it('checks a draft-restored record (version -1) without waiting for an edit', () => {
    const chip = mount();
    act(() =>
      useCloudSaveStore.setState({ lastSaved: savedNow({ version: -1 }) }),
    );
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(0));
    expect(chip.state()).toBe('saved');
  });

  it('reads partial after an incomplete save, once checked', () => {
    useStore.setState({
      markers: [{ id: 'm1', tick: 0, name: 'Verse', color: 'white' }],
    });
    version = useSaveStatusStore.getState().documentVersion;
    useCloudSaveStore.setState({ lastSaved: savedNow({ complete: false }) });
    const chip = mount();
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(0));
    expect(chip.state()).toBe('local');
    expect(chip.attr('data-reason')).toBe('partial');
    expect(chip.attr('data-tip')).toBe(
      'Saved to your account. Markers stay on this device until an update.',
    );
  });

  it('re-renders no more than its state flips during a documentVersion storm', () => {
    useCloudSaveStore.setState({ lastSaved: savedNow() });
    const chip = mount();
    const before = chip.commits();
    // A drag: 60 moves a second for two seconds, nothing in the document
    // changing for good (the drag ends where it started).
    for (let i = 0; i < 120; i++) {
      act(() => {
        bump();
        vi.advanceTimersByTime(16);
      });
    }
    act(() => vi.advanceTimersByTime(FINGERPRINT_QUIET_MS));
    expect(chip.state()).toBe('saved');
    const flips = states.filter((s, i) => i > 0 && s !== states[i - 1]).length;
    expect(flips).toBe(2); // saved → local → saved
    expect(chip.commits() - before).toBeLessThanOrEqual(flips);
    expect(renders).toBeLessThanOrEqual(1 + flips + 1);
  });

  it('runs at most one fingerprint check per quiet period', () => {
    useCloudSaveStore.setState({ lastSaved: savedNow() });
    mount();
    // Moves 100 ms apart for a second: the check waits for quiet.
    for (let i = 0; i < 10; i++) {
      act(() => {
        bump();
        vi.advanceTimersByTime(100);
      });
    }
    // No check ran while the moves kept coming: the chip still says local.
    expect(states.at(-1)).toBe('local');
    act(() => vi.advanceTimersByTime(FINGERPRINT_QUIET_MS));
    expect(states.at(-1)).toBe('saved');
  });

  it('holds in-memory audio back for a second', () => {
    const chip = mount();
    act(() =>
      useDraftStatusStore.setState({
        media: { ...INITIAL_PENDING_MEDIA_STATUS, pendingInMemory: 1 },
      }),
    );
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(AUDIO_GRACE_MS - 1));
    expect(chip.state()).toBe('local');
    act(() => vi.advanceTimersByTime(1));
    expect(chip.state()).toBe('audio-pending');
    act(() =>
      useDraftStatusStore.setState({
        media: { ...INITIAL_PENDING_MEDIA_STATUS, stored: 1 },
      }),
    );
    expect(chip.state()).toBe('local');
  });

  it('shows missing audio at once', () => {
    const chip = mount();
    act(() =>
      useDraftStatusStore.setState({
        media: { ...INITIAL_PENDING_MEDIA_STATUS, missing: 1 },
      }),
    );
    expect(chip.state()).toBe('audio-pending');
  });

  it('freezes while a session opens', () => {
    useCloudSaveStore.setState({ lastSaved: savedNow() });
    const chip = mount();
    expect(chip.state()).toBe('saved');
    act(() => useSessionStore.setState({ phase: 'preparing' }));
    act(() => {
      useCloudSaveStore.setState({ lastSaved: null });
      useDraftStatusStore.setState({ pendingSeq: 9 });
    });
    expect(chip.state()).toBe('saved');
    act(() => useSessionStore.setState({ phase: 'ready' }));
    expect(chip.state()).toBe('unsaved');
  });

  it('never reads local before a draft record exists', () => {
    useDraftStatusStore.setState({
      ...INITIAL_DRAFT_STATUS,
      media: { ...INITIAL_PENDING_MEDIA_STATUS },
    });
    const chip = mount();
    expect(chip.state()).not.toBe('local');
    expect(chip.state()).toBe('unsaved');
  });

  it('reads a reopened saved draft as saved at ready, with no local in between', () => {
    const chip = mount();
    act(() => useSessionStore.setState({ phase: 'loading' }));
    // The open's load moves the version many times, then openSession sets
    // the draft's record (version -1) before ready.
    act(() => {
      bump(30);
      useCloudSaveStore.setState({ lastSaved: savedNow({ version: -1 }) });
    });
    states.length = 0;
    act(() => useSessionStore.setState({ phase: 'ready' }));
    expect(chip.state()).toBe('saved');
    expect(states).not.toContain('local');
  });

  it('names audio the save left out in the partial tooltip', () => {
    const vox = useStore.getState().addTrack('audio', 'vocal-fx', 'Vox');
    useStore.getState().addAudioClip(vox, {
      id: 'take',
      startTick: 0,
      duration: 960,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null, // the upload failed
    });
    version = useSaveStatusStore.getState().documentVersion;
    useCloudSaveStore.setState({ lastSaved: savedNow({ complete: false }) });
    const chip = mount();
    act(() => vi.advanceTimersByTime(0));
    expect(chip.attr('data-reason')).toBe('partial');
    expect(chip.attr('data-tip')).toMatch(
      /^Saved to your account except some audio\. Press .+ to upload it\./,
    );
  });

  it('waits for playback to stop before checking', () => {
    useCloudSaveStore.setState({ lastSaved: savedNow() });
    const chip = mount();
    act(() => useStore.setState({ isPlaying: true }));
    act(() => bump());
    act(() => vi.advanceTimersByTime(FINGERPRINT_QUIET_MS * 4));
    expect(chip.state()).toBe('local');
    act(() => useStore.setState({ isPlaying: false }));
    act(() => vi.advanceTimersByTime(FINGERPRINT_QUIET_MS));
    expect(chip.state()).toBe('saved');
  });

  it('follows the cloud link', () => {
    useCloudSaveStore.setState({ lastSaved: savedNow() });
    const chip = mount();
    act(() => useStore.setState({ projectId: 'p2' }));
    expect(chip.state()).toBe('local');
  });
});
