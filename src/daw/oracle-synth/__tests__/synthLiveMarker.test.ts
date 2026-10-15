import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── The live-track marker belongs to its session generation ────────────────
// A load's bump clears the marker (resetSynthTrackCache), and the marker also
// records the generation its panel marked it in. This file takes the bump's
// listeners away, so only that record keeps a track marked live by the
// previous project from reading the store's patch as its own.

const session = vi.hoisted(() => ({ generation: 0 }));
vi.mock('@/daw/session/sessionGeneration', () => ({
  getSessionGeneration: () => session.generation,
  bumpSessionGeneration: () => ++session.generation,
  onSessionGeneration: () => () => {},
}));

import { useSynthStore } from '@/daw/oracle-synth/store';
import {
  getActiveSynthTrack,
  getTrackSynthState,
  setActiveSynthTrack,
  setTrackSynthState,
  synthTrackStateFromPreset,
} from '../synthTrackState';
import { PAD } from '../store/presets/factoryPresets';

beforeEach(() => {
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  session.generation = 0;
  setActiveSynthTrack(null);
});

describe('a track marked live before a load', () => {
  it('is not live after it, even with the marker left in place', () => {
    setActiveSynthTrack('t1');
    useSynthStore.getState().loadPreset('WOBBLE');
    expect(getActiveSynthTrack()).toBe('t1');

    session.generation += 1;
    setTrackSynthState('t1', synthTrackStateFromPreset(PAD, 120));
    expect(getActiveSynthTrack()).toBeNull();
    expect(getTrackSynthState('t1')?.presetName).toBe('PAD');
  });

  it('is live again once a panel marks it in the new generation', () => {
    session.generation += 1;
    setActiveSynthTrack('t1');
    expect(getActiveSynthTrack()).toBe('t1');
  });
});
