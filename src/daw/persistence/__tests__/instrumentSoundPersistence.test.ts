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
import type { OrganState } from '@/daw/instruments/TonewheelOrganEngine';

const s = () => useStore.getState();
const AGOGO = 113;

const ORGAN: OrganState = {
  drawbars: [8, 8, 8, 0, 0, 0, 0, 0, 0],
  clickLevel: 0.4,
  percEnabled: true,
  percHarmonic: '3rd',
  percVolume: 'soft',
  percDecay: 'fast',
  vibratoMode: 'C3',
  overdrive: 0.25,
  leslieSpeed: 'fast',
  leslieEnabled: true,
  swellLevel: 0.7,
};

function lastTrackId(): string {
  return s().tracks[s().tracks.length - 1].id;
}

// A track's chosen sound must come back when the project does — locally and
// from the cloud — whatever the instrument.
describe('saved instrument sounds reload', () => {
  beforeEach(() => {
    useStore.setState({ tracks: [] });
  });

  function setUp() {
    s().addTrack('midi', 'soundfont', 'Agogo');
    s().updateTrack(lastTrackId(), { gmProgram: AGOGO });
    s().addTrack('midi', 'tonewheel-organ', 'B3');
    s().updateTrack(lastTrackId(), { organState: ORGAN });
    s().addTrack('midi', 'electric-piano', 'Keys');
    s().updateTrack(lastTrackId(), { presetName: 'Wurlitzer' });
  }

  function expectSounds() {
    const byName = (n: string) => s().tracks.find((t) => t.name === n);
    expect(byName('Agogo')?.gmProgram).toBe(AGOGO);
    expect(byName('B3')?.organState).toEqual(ORGAN);
    expect(byName('Keys')?.presetName).toBe('Wurlitzer');
  }

  it('through the local autosave', () => {
    setUp();
    const session = serializeSession();
    useStore.setState({ tracks: [] });
    deserializeSession(session);
    expectSounds();
  });

  it('through a cloud save', () => {
    setUp();
    const input = serializeSessionForCloud();
    useStore.setState({ tracks: [] });
    deserializeCloudProject({
      ...input,
      id: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
      tracks: input.tracks.map((t, i) => ({ ...t, id: `t${i}`, ordinal: i })),
    } as CloudProjectDetail);
    expectSounds();
  });
});
