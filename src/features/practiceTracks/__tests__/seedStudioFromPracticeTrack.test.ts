// @vitest-environment jsdom
/**
 * A Theory Practice Track opens in two steps (milestone 1.4): prepare builds
 * it and changes nothing; apply writes it into the project openSession has
 * just reset, with no reset, baseline or undo reset of its own.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { isDocumentDirty } from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import {
  applyPracticeModeTrack,
  preparePracticeModeTrack,
} from '../seedStudioFromPracticeTrack';

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
    { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
  ]),
}));

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  resetSessionToEmpty();
  s().setProjectName('My work');
  s().addTrack('midi', 'piano-sampler', 'Mine');
});

describe('preparePracticeModeTrack', () => {
  it('builds the track and changes nothing', async () => {
    const generation = getSessionGeneration();
    const before = s().tracks.map((t) => t.name);
    const track = await preparePracticeModeTrack('dorian', 2, 'melody', 2);

    expect(track.rootNote).toBe(2);
    expect(track.openTrack).toBe('melody');
    expect(track.beatClip.events.length).toBeGreaterThan(0);
    expect(s().projectName).toBe('My work');
    expect(s().tracks.map((t) => t.name)).toEqual(before);
    expect(getSessionGeneration()).toBe(generation);
  });
});

describe('applyPracticeModeTrack', () => {
  it('writes the four tracks and arms the open one, after the opener’s reset', async () => {
    const track = await preparePracticeModeTrack('dorian', 2, 'chords', 3);
    // openSession's switch.
    resetSessionToEmpty('open:practiceMode');
    const generation = getSessionGeneration();
    const openId = applyPracticeModeTrack(track, {
      openTrack: 'chords',
      level: 3,
    });

    const state = s();
    expect(state.projectName).toBe('D Dorian Practice Track — Level 3');
    expect(state.rootNote).toBe(2);
    expect(state.mode).toBe('dorian');
    expect(state.tracks.map((t) => t.name)).toEqual([
      'Bass',
      'Drums',
      'Chords — D Dorian',
      'Melody — D Dorian',
    ]);
    const open = state.tracks.find((t) => t.id === openId)!;
    expect(open.name).toBe('Chords — D Dorian');
    expect(open.midiClips).toHaveLength(0);
    expect(open.recordArmed).toBe(true);
    expect(state.selectedTrackId).toBe(openId);
    expect(state.tracks.filter((t) => t.recordArmed)).toHaveLength(1);
    expect(state.loopEnd).toBe(track.bassClip.durationTicks);
    // No reset, and no baseline: both are the opener's.
    expect(getSessionGeneration()).toBe(generation);
    expect(isDocumentDirty()).toBe(true);
  });

  it('adds to the project it is given (the reset is not its job)', async () => {
    const track = await preparePracticeModeTrack('ionian', 0, 'melody', 1);
    applyPracticeModeTrack(track, { openTrack: 'melody', level: 1 });
    expect(s().tracks[0].name).toBe('Mine');
  });
});
