// @vitest-environment jsdom
/**
 * Studio Basics 8 · Loop and Repeat, on the course's song. Each step's check
 * is armed as the lesson layer arms it: it doesn't pass then, and it passes
 * once the student's move lands in the store, made with the editor's own
 * commands: the clip menu's Duplicate, Copy and Paste here
 * (shell/canvas/clipMenu/clipActions.ts) and the track menu's Duplicate
 * track (shell/tracklist/duplicateTrack.ts).
 *
 * Run: npx vitest run src/daw/components/Tutorial/studioBasics/__tests__/loopAndRepeat.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  copyClip,
  duplicateClip,
  pasteClipboard,
} from '@/daw/shell/canvas/clipMenu/clipActions';
import { duplicateTrack } from '@/daw/shell/tracklist/duplicateTrack';
import { useStore } from '@/daw/store';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { snapTicks, timelineSnapGrid } from '@/daw/time/timeModel';
import { TICKS_PER_BEAT } from '@/daw/utils/timelineScale';
import { MOST_TRACKS } from '../loopAndRepeatChecks';
import {
  arm,
  describeLessonConventions,
  openDemoSong,
  s,
  stepOf,
  trackNamed,
} from './scoreToSaveTestUtils';

const LOOP = 'studio-basics-loop-and-repeat';

beforeEach(openDemoSong);
afterEach(() => vi.restoreAllMocks());

describe('the course’s song, for looping', () => {
  it('has its loop off, over its four bars', () => {
    expect(s().loopEnabled).toBe(false);
    expect([s().loopStart, s().loopEnd]).toEqual([0, 7680]);
    expect(MOST_TRACKS).toBe(MAX_TOTAL_TRACKS);
  });
});

describe('Loop and Repeat', () => {
  it('loop-on passes once looping is on', () => {
    const { passes } = arm(LOOP, 'loop-on');
    expect(passes()).toBe(false);
    s().toggleLoop();
    expect(passes()).toBe(true);
  });

  it('loop-shorter passes when the loop covers other bars, not none', () => {
    s().toggleLoop();
    const { armed, passes } = arm(LOOP, 'loop-shorter');
    expect([armed.loopStart, armed.loopEnd]).toEqual([0, 7680]);
    expect(passes()).toBe(false);
    // Turning it off and on again moves nothing.
    s().setLoopEnabled(false);
    s().setLoopEnabled(true);
    expect(passes()).toBe(false);
    s().setLoopRange(3840, 3840);
    expect(passes()).toBe(false);
    // The right end dragged two bars left.
    s().setLoopRange(0, 3840);
    expect(passes()).toBe(true);
  });

  it('play-the-loop passes once the music has played and stopped', () => {
    let { passes } = arm(LOOP, 'play-the-loop');
    expect(passes()).toBe(false);
    // Play: still going round, so not yet.
    useStore.setState({ isPlaying: true });
    expect(passes()).toBe(false);
    // Play again (a pause), or Esc: stopped.
    useStore.setState({ isPlaying: false });
    expect(passes()).toBe(true);
    // Armed anew (Show me again), the playing heard before doesn't count.
    ({ passes } = arm(LOOP, 'play-the-loop'));
    expect(passes()).toBe(false);
    // Armed while it plays (Play pressed early): stopping is enough, as the
    // lesson layer checks the step the moment it arms.
    useStore.setState({ isPlaying: true });
    ({ passes } = arm(LOOP, 'play-the-loop'));
    expect(passes()).toBe(false);
    useStore.setState({ isPlaying: false });
    expect(passes()).toBe(true);
  });

  it('duplicate-a-clip passes for a duplicated clip: the drums, eight bars', () => {
    const { passes } = arm(LOOP, 'duplicate-a-clip');
    expect(passes()).toBe(false);
    const drums = trackNamed('Drums');
    // The step points at the bottom track's clip, which a right-click selects.
    s().setSelectedClip(drums.midiClips[0].id, drums.id);
    expect(passes()).toBe(false);
    duplicateClip({ trackId: drums.id, clipId: drums.midiClips[0].id });
    expect(passes()).toBe(true);
    expect(trackNamed('Drums').midiClips.map((c) => c.startTick)).toEqual([
      0, 7680,
    ]);
  });

  it('copy-a-clip passes once a clip is copied, and the song is the same', () => {
    let { passes } = arm(LOOP, 'copy-a-clip');
    expect(passes()).toBe(false);
    const chords = trackNamed('Chords');
    // A duplicate adds a clip but copies nothing.
    duplicateClip({ trackId: chords.id, clipId: chords.midiClips[0].id });
    expect(passes()).toBe(false);
    ({ passes } = arm(LOOP, 'copy-a-clip'));
    const tracks = s().tracks;
    copyClip({ trackId: chords.id, clipId: chords.midiClips[0].id });
    expect(passes()).toBe(true);
    expect(s().tracks).toBe(tracks);
    // The same clip copied again is still a copy made.
    ({ passes } = arm(LOOP, 'copy-a-clip'));
    copyClip({ trackId: chords.id, clipId: chords.midiClips[0].id });
    expect(passes()).toBe(true);
  });

  it('paste-here passes for a pasted clip: the chords, at bar 5', () => {
    const chords = trackNamed('Chords');
    copyClip({ trackId: chords.id, clipId: chords.midiClips[0].id });
    const { passes } = arm(LOOP, 'paste-here');
    expect(passes()).toBe(false);
    // Paste here, on its own row at bar 5 (the lane menu's).
    pasteClipboard({ trackId: chords.id, tick: 7680 });
    expect(passes()).toBe(true);
    expect(trackNamed('Chords').midiClips.map((c) => c.startTick)).toEqual([
      0, 7680,
    ]);
  });

  it('paste-here points just after the clip, where Paste here lands on the bar', () => {
    const step = stepOf(LOOP, 'paste-here');
    expect(step.target?.[0]).toBe('timeline-lane-end-1');
    expect(step.demo?.[0].target?.[0]).toBe('timeline-lane-end-1');
    // The box is half a beat wide from the clip's end: a right-click at its
    // center is a quarter beat in, which the timeline's grid (a beat)
    // snaps back to the bar line.
    const grid = timelineSnapGrid(s());
    expect(snapTicks(7680 + TICKS_PER_BEAT / 4, grid)).toBe(7680);
  });

  it('duplicate-a-track passes for a duplicated track', () => {
    const { passes } = arm(LOOP, 'duplicate-a-track');
    expect(passes()).toBe(false);
    duplicateTrack(trackNamed('Chords').id);
    expect(passes()).toBe(true);
    expect(s().tracks).toHaveLength(5);
  });
});

describeLessonConventions(LOOP);
