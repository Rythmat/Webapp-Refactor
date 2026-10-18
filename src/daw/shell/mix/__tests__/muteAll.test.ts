import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  withTransaction,
} from '@/daw/store/history';
import { allMuted, toggleMuteAll } from '../muteAll';

// ── Mute All (milestone 2.10) ──────────────────────────────────────────────
// A real toggle: on, it mutes every playing track and remembers which; off,
// it unmutes exactly those, so a track muted before stays muted.

const s = () => useStore.getState();
const muted = () => s().tracks.map((t) => t.mute);
let ids: string[];
let stopHistory: () => void;

beforeEach(() => {
  useStore.setState({ tracks: [], muteAllSet: null, remoteUsers: new Map() });
  ids = [
    s().addTrack('midi', 'piano-sampler', 'Rhodes'),
    s().addTrack('midi', 'drum-machine', 'Drums'),
    s().addTrack('audio', 'vocal-fx', 'Vox'),
  ];
  resetHistory();
  stopHistory = startHistory();
});

afterEach(() => {
  stopHistory();
  resetHistory();
});

describe('toggleMuteAll', () => {
  it('writes the store once a press, not once a track', () => {
    let writes = 0;
    const stop = useStore.subscribe(() => {
      writes += 1;
    });
    toggleMuteAll();
    expect(writes).toBe(1);
    toggleMuteAll();
    expect(writes).toBe(2);
    stop();
  });

  it('mutes every playing track and remembers which', () => {
    s().toggleMute(ids[1]);
    toggleMuteAll();
    expect(muted()).toEqual([true, true, true]);
    expect(allMuted(s().tracks)).toBe(true);
    expect(s().muteAllSet).toEqual([ids[0], ids[2]]);
  });

  it('unmutes exactly the tracks it muted', () => {
    s().toggleMute(ids[1]);
    toggleMuteAll();
    toggleMuteAll();
    expect(muted()).toEqual([false, true, false]);
    expect(s().muteAllSet).toBeNull();
    expect(allMuted(s().tracks)).toBe(false);
  });

  it('unmutes every track when it remembers none (all muted by hand)', () => {
    for (const id of ids) s().toggleMute(id);
    expect(allMuted(s().tracks)).toBe(true);
    toggleMuteAll();
    expect(muted()).toEqual([false, false, false]);
  });

  it('keeps its tracks when one is unmuted by hand and it is pressed again', () => {
    toggleMuteAll();
    s().toggleMute(ids[2]);
    expect(allMuted(s().tracks)).toBe(false);
    toggleMuteAll();
    expect(s().muteAllSet).toEqual([ids[0], ids[1], ids[2]]);
    toggleMuteAll();
    expect(muted()).toEqual([false, false, false]);
  });

  it('does nothing with no tracks', () => {
    useStore.setState({ tracks: [] });
    toggleMuteAll();
    expect(s().muteAllSet).toBeNull();
    expect(allMuted(s().tracks)).toBe(false);
  });

  it('leaves undo alone: mute is each person’s own and never undone', () => {
    withTransaction('Change volume', () =>
      s().updateTrack(ids[0], { volume: 0.5 }),
    );
    const before = historyLabels();
    toggleMuteAll();
    toggleMuteAll();
    expect(before).toEqual(['Change volume']);
    expect(historyLabels()).toEqual(before);
    expect(historyLabels()).not.toContain('Mute all');
  });
});
