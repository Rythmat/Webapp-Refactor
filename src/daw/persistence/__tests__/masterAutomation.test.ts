// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import {
  serializeSession,
  deserializeSession,
  serializeSessionForCloud,
  deserializeCloudProject,
  type CloudProjectDetail,
} from '../SessionSerializer';

const s = () => useStore.getState();

describe('Master volume automation', () => {
  beforeEach(() => {
    useStore.setState({ tracks: [], masterAutomation: {} });
  });

  it('adds, replaces and removes points on the Master lane', () => {
    s().upsertMasterAutomationPoint('volume', { tick: 960, value: 0.2 });
    s().upsertMasterAutomationPoint('volume', { tick: 0, value: 0.8 });
    s().upsertMasterAutomationPoint('volume', { tick: 960, value: 0.4 });
    expect(s().masterAutomation.volume).toEqual([
      { tick: 0, value: 0.8 },
      { tick: 960, value: 0.4 },
    ]);

    s().removeMasterAutomationPoint('volume', 0);
    s().removeMasterAutomationPoint('volume', 960);
    expect(s().masterAutomation.volume).toBeUndefined();
  });

  it('round-trips through the local autosave', () => {
    s().upsertMasterAutomationPoint('volume', { tick: 0, value: 0.5 });
    const session = serializeSession();
    useStore.setState({ masterAutomation: {} });

    deserializeSession(session);
    expect(s().masterAutomation.volume).toEqual([{ tick: 0, value: 0.5 }]);
  });

  it('round-trips through a cloud save on a track settings blob', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addTrack('midi', 'piano-sampler', 'Pad');
    s().upsertMasterAutomationPoint('volume', { tick: 480, value: 0.3 });

    const input = serializeSessionForCloud();
    // The server hands tracks back with ids/ordinals, possibly reordered.
    const detail = {
      ...input,
      id: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
      tracks: input.tracks
        .map((t, i) => ({ ...t, id: `t${i}`, ordinal: i }))
        .reverse(),
    } as CloudProjectDetail;

    useStore.setState({ masterAutomation: {} });
    deserializeCloudProject(detail);
    expect(s().masterAutomation.volume).toEqual([{ tick: 480, value: 0.3 }]);
    // …and it doesn't leak onto the track itself.
    expect(s().tracks.some((t) => 'masterAutomation' in (t as object))).toBe(
      false,
    );
  });

  it('a cloud project saved before this feature opens with no Master lanes', () => {
    s().upsertMasterAutomationPoint('volume', { tick: 0, value: 0.1 });
    deserializeCloudProject({
      name: 'Old',
      bpm: 120,
      prism: { rootNote: null, rhythmName: 'Quarters', genre: 'Pop', swing: 0 },
      tracks: [],
      id: 'p2',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(s().masterAutomation).toEqual({});
  });
});
