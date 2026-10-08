// @vitest-environment jsdom
/**
 * Opening a project from the cloud (deserializeCloudProject): tracks keep
 * the ids they were saved with, every reference to a track follows, caches
 * keyed by track id start over first, and the opened project counts as
 * saved (audit state-reload-04, audio-core-08; decisions D4 and D7).
 *
 * Run: npx vitest run src/daw/persistence/__tests__/cloudOpen.test.ts
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertNoteIds, isNoteId } from '@/daw/model/noteIds';
import {
  captureSynthState,
  getTrackSynthState,
  setActiveSynthTrack,
  setTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';
import { useSynthStore } from '@/daw/oracle-synth/store';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { keyColourFor } from '../projectDocument/derived';
import { fieldDefault } from '../projectDocument/fields';
import {
  deserializeCloudProject,
  forgetLiveSession,
  serializeSessionForCloud,
  type CloudProjectDetail,
  type CloudProjectInput,
} from '../SessionSerializer';
import {
  hasWorkToKeep,
  isDocumentDirty,
  useSaveStatusStore,
} from '../saveStatusStore';

const s = () => useStore.getState();
const byName = (name: string) => {
  const found = s().tracks.find((t) => t.name === name);
  if (!found) throw new Error(`No ${name} track`);
  return found;
};

/** What the server hands back for a body: its own row ids added. */
const fromServer = (body: CloudProjectInput): CloudProjectDetail => ({
  ...structuredClone(body),
  id: 'project-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  tracks: structuredClone(body.tracks).map((t, i) => ({
    ...t,
    id: `row-${i}`,
    ordinal: i,
  })),
});

/** Keys, an Oracle lead, Drums the Keys duck under, and a guitar take. */
function buildProject(): void {
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-keys',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
      {
        note: 64,
        velocity: 90,
        startTick: 480,
        durationTicks: 480,
        channel: 0,
      },
    ],
  });
  const lead = s().addTrack('midi', 'oracle-synth', 'Lead');
  const drums = s().addTrack('midi', 'drum-machine', 'Drums');
  s().updateTrackEffects(keys, {
    ducker: {
      ...byName('Keys').effects.ducker,
      enabled: true,
      keyTrackId: drums,
    },
  });
  const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
  s().addAudioClip(guitar, {
    id: 'take-1',
    startTick: 0,
    duration: 1920,
    fadeInTicks: 0,
    fadeOutTicks: 0,
    assetId: 'asset-1',
    offsetSeconds: 0,
    gain: 1,
  });
  useSynthStore.getState().loadPreset('BASS');
  setTrackSynthState(lead, captureSynthState());
  s().setRootNote(9);
}

let stop: () => void = () => {};

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});
afterEach(() => stop());

describe('a cloud project opens', () => {
  it('with every track under the id it was saved with', () => {
    buildProject();
    const ids = s().tracks.map((t) => t.id);
    deserializeCloudProject(fromServer(serializeSessionForCloud()));
    expect(s().tracks.map((t) => t.id)).toEqual(ids);
  });

  it('with new ids once for a save from before ids travelled', () => {
    buildProject();
    const before = s().tracks.map((t) => t.id);
    const body = serializeSessionForCloud();
    for (const track of body.tracks) delete track.settings?.sourceTrackId;
    deserializeCloudProject(fromServer(body));
    const after = s().tracks.map((t) => t.id);
    expect(after.some((id) => before.includes(id))).toBe(false);
    expect(new Set(after).size).toBe(after.length);
    // Nothing says which track the ducker keyed from, so it stops ducking
    // and shows None, as every cloud open did before ids travelled.
    expect(byName('Keys').effects.ducker.keyTrackId).toBeNull();
  });

  it('with a fresh id for a saved one no track may have, references following', () => {
    buildProject();
    const body = serializeSessionForCloud();
    const drums = body.tracks.findIndex((t) => t.name === 'Drums');
    body.tracks[drums].settings = {
      ...body.tracks[drums].settings,
      sourceTrackId: 'drums:1',
    };
    const keys = body.tracks.find((t) => t.name === 'Keys');
    if (!keys?.settings?.effects) throw new Error('no Keys effects');
    keys.settings.effects.ducker.keyTrackId = 'drums:1';
    deserializeCloudProject(fromServer(body));
    expect(byName('Drums').id).not.toBe('drums:1');
    expect(byName('Keys').effects.ducker.keyTrackId).toBe(byName('Drums').id);
  });

  it('with the first of two tracks saved under one id keeping it', () => {
    buildProject();
    const body = serializeSessionForCloud();
    const shared = body.tracks[0].settings?.sourceTrackId;
    body.tracks[1].settings = {
      ...body.tracks[1].settings,
      sourceTrackId: shared,
    };
    deserializeCloudProject(fromServer(body));
    const [first, second] = s().tracks;
    expect(first.id).toBe(shared);
    expect(second.id).not.toBe(shared);
  });

  it('with new audio clip ids, as decoded audio is still keyed by clip', () => {
    buildProject();
    deserializeCloudProject(fromServer(serializeSessionForCloud()));
    const take = byName('Guitar').audioClips[0];
    expect(take.id).not.toBe('take-1');
    expect(take.assetId).toBe('asset-1');
  });

  it('with the same note ids every time it opens', () => {
    buildProject();
    const body = serializeSessionForCloud();
    deserializeCloudProject(fromServer(body));
    const first = byName('Keys').midiClips[0].events.map((e) => e.id);
    deserializeCloudProject(fromServer(body));
    const second = byName('Keys').midiClips[0].events.map((e) => e.id);
    expect(first.every(isNoteId)).toBe(true);
    expect(second).toEqual(first);
  });

  it('with notes of their own when two clips were saved under one id', () => {
    buildProject();
    const body = serializeSessionForCloud();
    const keys = body.tracks.find((t) => t.name === 'Keys');
    if (!keys) throw new Error('no Keys');
    keys.midiClips.push({ ...structuredClone(keys.midiClips[0]) });
    deserializeCloudProject(fromServer(body));
    const first = s().tracks.map((t) => t.midiClips);
    expect(assertNoteIds(s().tracks)).toEqual([]);
    deserializeCloudProject(fromServer(body));
    expect(s().tracks.map((t) => t.midiClips)).toEqual(first);
  });

  it('with values of the wrong type at their defaults', () => {
    buildProject();
    const body = serializeSessionForCloud();
    const project = {
      ...fromServer(body),
      name: 7,
      bpm: null,
      prism: { ...body.prism, rootNote: 14, swing: 'lots' },
      returns: {},
    } as unknown as CloudProjectDetail;
    deserializeCloudProject(project);
    expect(s()).toMatchObject({
      projectName: fieldDefault('projectName'),
      bpm: fieldDefault('bpm'),
      rootNote: null,
      rootTrackColor: null,
      swing: fieldDefault('swing'),
      returns: fieldDefault('returns'),
    });
  });

  it('with its key colour, its first MIDI track selected and armed', () => {
    buildProject();
    deserializeCloudProject(fromServer(serializeSessionForCloud()));
    expect(s().rootTrackColor).toBe(keyColourFor(9, 'ionian'));
    expect(s().selectedTrackId).toBe(byName('Keys').id);
    expect(byName('Keys')).toMatchObject({
      monitoring: true,
      recordArmed: true,
    });
    expect(s().nextColorIndex).toBe(4);
  });

  it('with nothing of the previous project left over', () => {
    buildProject();
    const body = serializeSessionForCloud();
    s().addMarker(1920, 'Verse');
    s().setTimeSignature(6, 8);
    s().addMasteringFx('compressor');
    deserializeCloudProject(fromServer(body));
    expect([
      s().markers,
      s().timeSignatureNumerator,
      s().masteringFxChain,
    ]).toEqual([[], 4, []]);
  });

  it('counting as saved: complete, clean, and no work for a link to keep', () => {
    buildProject();
    deserializeCloudProject(fromServer(serializeSessionForCloud()));
    expect(useSaveStatusStore.getState().savedComplete).toBe(true);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(false);
    s().updateTrack(byName('Keys').id, { volume: 0.3 });
    expect(isDocumentDirty()).toBe(true);
    expect(hasWorkToKeep()).toBe(true);
  });
});

describe('a cloud project that can’t be opened', () => {
  it('changes nothing, the open project’s patches included', () => {
    buildProject();
    const lead = byName('Lead').id;
    const body = serializeSessionForCloud();
    const keys = body.tracks.find((t) => t.name === 'Keys');
    if (!keys) throw new Error('no Keys');
    keys.midiClips[0].events = null as never;
    s().setProjectName('Still Open');
    const patch = getTrackSynthState(lead);
    const generation = getSessionGeneration();
    expect(() => deserializeCloudProject(fromServer(body))).toThrow();
    expect(getSessionGeneration()).toBe(generation);
    expect(getTrackSynthState(lead)).toBe(patch);
    expect(s().projectName).toBe('Still Open');
  });
});

describe('reopening a project under the same ids', () => {
  it('lets go of the open patch before seeding the reopened one', () => {
    buildProject();
    const lead = byName('Lead').id;
    const body = serializeSessionForCloud();
    // The project is open with its synth panel showing an edited patch.
    useSynthStore.getState().loadPreset('INITIALIZE');
    setActiveSynthTrack(lead);
    const seen: unknown[] = [];
    stop = onSessionGeneration(() => {
      seen.push(getTrackSynthState(lead));
    });
    const generation = getSessionGeneration();
    deserializeCloudProject(fromServer(body));
    expect(getSessionGeneration()).toBe(generation + 1);
    expect(seen).toEqual([undefined]);
    expect(byName('Lead').id).toBe(lead);
    expect(getTrackSynthState(lead)).toMatchObject({ presetName: 'BASS' });
  });
});
