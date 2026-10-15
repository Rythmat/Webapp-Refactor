import { beforeEach, describe, expect, it } from 'vitest';
import type { ModRoute } from '@/daw/oracle-synth/audio/types';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { documentFingerprint } from '@/daw/persistence/saveStatusStore';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import {
  SYNTH_STATE_KEYS,
  captureSynthState,
  defaultSynthTrackState,
  getActiveSynthTrack,
  getTrackSynthState,
  keepLiveSynthState,
  setActiveSynthTrack,
  setTrackSynthState,
  showTrackSynthState,
  writeLivePatchAsSystem,
  type SynthTrackState,
} from '../synthTrackState';

// ── The per-track patch cache across loads (milestone 1.3) ────────────────
// A load or reset bumps the session generation before it seeds the cache.
// The cache and the live-track marker must be empty by then: track ids now
// survive a cloud reopen, and a kept session restored reuses them, so an
// entry or a live patch left from the outgoing project would be read (and
// saved, and played) as the new project's.

const synth = () => useSynthStore.getState();

/** The patch a preset leaves in the store. */
function patchOf(preset: string): SynthTrackState {
  synth().loadPreset(preset);
  return captureSynthState();
}

beforeEach(() => {
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  bumpSessionGeneration('test');
});

describe('a load or reset', () => {
  it('clears every cached patch, and the loader seeds after it', () => {
    setTrackSynthState('t1', patchOf('BASS'));
    setTrackSynthState('t2', patchOf('PAD'));

    bumpSessionGeneration('cloud-open');
    expect(getTrackSynthState('t1')).toBeUndefined();
    expect(getTrackSynthState('t2')).toBeUndefined();

    setTrackSynthState('t1', patchOf('LEAD'));
    expect(getTrackSynthState('t1')?.presetName).toBe('LEAD');
  });

  // The baseline taken right after an open serializes every track's patch.
  // The store still holds the outgoing project's live patch then; read as
  // the reused id's, a project nobody changed would count as edited work.
  it("leaves no track live, so a reused id reads the new project's patch", () => {
    setActiveSynthTrack('t1');
    synth().loadPreset('WOBBLE');
    expect(getTrackSynthState('t1')?.presetName).toBe('WOBBLE');

    bumpSessionGeneration('restore');
    setTrackSynthState('t1', patchOf('PAD'));
    synth().loadPreset('WOBBLE'); // the store moves on; no panel shows t1

    expect(getActiveSynthTrack()).toBeNull();
    expect(getTrackSynthState('t1')?.presetName).toBe('PAD');
  });

  it('makes a track live again once a panel marks it in the new session', () => {
    setActiveSynthTrack('t1');
    bumpSessionGeneration('new');
    expect(getActiveSynthTrack()).toBeNull();

    setActiveSynthTrack('t1');
    expect(getActiveSynthTrack()).toBe('t1');
    synth().loadPreset('STAB');
    expect(getTrackSynthState('t1')?.presetName).toBe('STAB');
  });
});

describe('showing a track in the synth panel', () => {
  it('shows its own cached patch, not what the store held', () => {
    setTrackSynthState('t1', patchOf('PAD'));
    synth().loadPreset('BASS');

    showTrackSynthState('t1');
    expect(synth().presetName).toBe('PAD');
  });

  it('shows the default patch for a track with none of its own', () => {
    synth().loadPreset('WOBBLE');
    showTrackSynthState('fresh');
    expect(captureSynthState()).toEqual(defaultSynthTrackState());
    expect(synth().presetName).toBe('INITIALIZE');
  });

  // Opening a panel is not an edit: the track saves no patch, as before.
  it('saves no patch for a track left on its untouched default', () => {
    showTrackSynthState('fresh');
    setActiveSynthTrack('fresh');
    expect(getTrackSynthState('fresh')).toBeUndefined();

    keepLiveSynthState('fresh');
    setActiveSynthTrack(null);
    expect(getTrackSynthState('fresh')).toBeUndefined();
  });

  it('saves the patch once the default is edited', () => {
    showTrackSynthState('fresh');
    setActiveSynthTrack('fresh');
    synth().setFilterParam(0, 'cutoff', 640);
    expect(getTrackSynthState('fresh')?.filters[0].cutoff).toBe(640);

    keepLiveSynthState('fresh');
    setActiveSynthTrack(null);
    expect(getTrackSynthState('fresh')?.filters[0].cutoff).toBe(640);
  });
});

// The follow-project-key mirror writes the detected key into the live patch.
// That is the app's write: a track on its untouched default must still have
// no patch of its own after it, or opening a panel would edit the project.
describe("the app's own writes to the live patch", () => {
  const followKey = (rootPc: number) =>
    writeLivePatchAsSystem(() => synth().setKeyScale({ rootPc }));

  it('leave a track on its untouched default without a patch', () => {
    showTrackSynthState('fresh');
    setActiveSynthTrack('fresh');
    followKey(9);
    expect(synth().keyScale.rootPc).toBe(9);
    expect(getTrackSynthState('fresh')).toBeUndefined();

    keepLiveSynthState('fresh');
    setActiveSynthTrack(null);
    expect(getTrackSynthState('fresh')).toBeUndefined();
  });

  it("don't hide the student's edit that follows them", () => {
    showTrackSynthState('fresh');
    setActiveSynthTrack('fresh');
    followKey(9);
    synth().setFilterParam(0, 'cutoff', 640);
    expect(getTrackSynthState('fresh')?.filters[0].cutoff).toBe(640);
    expect(getTrackSynthState('fresh')?.keyScale.rootPc).toBe(9);
  });

  it("go into a track's own patch like any change", () => {
    setTrackSynthState('lead', patchOf('LEAD'));
    showTrackSynthState('lead');
    setActiveSynthTrack('lead');
    followKey(4);
    expect(getTrackSynthState('lead')?.keyScale.rootPc).toBe(4);
  });

  it('leave an edited default edited', () => {
    showTrackSynthState('fresh');
    setActiveSynthTrack('fresh');
    synth().setFilterParam(0, 'cutoff', 640);
    followKey(9);
    expect(getTrackSynthState('fresh')?.filters[0].cutoff).toBe(640);
  });
});

// The save status reads each Oracle track's patch through the reader this
// module registers, as a save would write it.
describe("the save status's view of the patches", () => {
  let synthTrack = '';
  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true);
    synthTrack = useStore.getState().addTrack('midi', 'oracle-synth', 'Synth');
  });

  it("doesn't change when a panel shows a track's untouched default", () => {
    const before = documentFingerprint();
    showTrackSynthState(synthTrack);
    setActiveSynthTrack(synthTrack);
    expect(documentFingerprint()).toBe(before);

    writeLivePatchAsSystem(() => synth().setKeyScale({ rootPc: 7 }));
    expect(documentFingerprint()).toBe(before);
  });

  it('changes with an edit to the live patch, and back with its undo', () => {
    setTrackSynthState(synthTrack, patchOf('PAD'));
    const before = documentFingerprint();
    showTrackSynthState(synthTrack);
    setActiveSynthTrack(synthTrack);
    expect(documentFingerprint()).toBe(before);

    const cutoff = synth().filters[0].cutoff;
    synth().setFilterParam(0, 'cutoff', cutoff + 100);
    expect(documentFingerprint()).not.toBe(before);
    synth().setFilterParam(0, 'cutoff', cutoff);
    expect(documentFingerprint()).toBe(before);
  });

  // A patch saved before Oracle v2 has no macros or key scale, and v1 mod
  // routes. Its panel shows it normalised, and opening the panel is no edit,
  // so the save status reads the cached patch normalised too.
  it("doesn't change when a panel shows a patch saved before Oracle v2", () => {
    const v1Route = {
      id: 'route-1',
      lfoIndex: 0,
      target: { source: 'flt1', param: 'cutoff' },
      depthMin: 0,
      depthMax: 0.6,
      enabled: true,
    } as unknown as ModRoute;
    const old: Partial<SynthTrackState> = {
      ...patchOf('PAD'),
      modRoutes: [v1Route],
    };
    delete old.macros;
    delete old.keyScale;
    setTrackSynthState(synthTrack, old as SynthTrackState);
    const before = documentFingerprint();
    // Read as it was saved, it differs, so the checks below mean something.
    expect(
      documentFingerprint(useStore.getState(), { [synthTrack]: old }),
    ).not.toBe(before);

    showTrackSynthState(synthTrack);
    setActiveSynthTrack(synthTrack);
    expect(documentFingerprint()).toBe(before);

    keepLiveSynthState(synthTrack);
    setActiveSynthTrack(null);
    expect(documentFingerprint()).toBe(before);
  });
});

describe('the patch keys', () => {
  it('are what a captured patch holds, and the default patch too', () => {
    expect(Object.keys(captureSynthState()).sort()).toEqual(
      [...SYNTH_STATE_KEYS].sort(),
    );
    expect(Object.keys(defaultSynthTrackState()).sort()).toEqual(
      [...SYNTH_STATE_KEYS].sort(),
    );
  });

  it("default to the synth store's initial patch, a fresh copy each time", () => {
    const initial = useSynthStore.getInitialState();
    const first = defaultSynthTrackState();
    expect(first.presetName).toBe('INITIALIZE');
    expect(first.oscillators).toEqual(initial.oscillators);
    expect(first.oscillators).not.toBe(initial.oscillators);
    expect(defaultSynthTrackState().oscillators).not.toBe(first.oscillators);
  });
});
