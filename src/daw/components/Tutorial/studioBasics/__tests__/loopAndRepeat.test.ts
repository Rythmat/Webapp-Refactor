// @vitest-environment jsdom
/**
 * Studio Basics 8 · Loop and Repeat, on the course's song. Each step's check
 * is armed as the lesson layer arms it: it doesn't pass then, and it passes
 * once the student's move lands in the store, made with the editor's own
 * commands (Duplicate, Copy and Paste Here, Duplicate Track).
 *
 * Run: npx vitest run src/daw/components/Tutorial/studioBasics/__tests__/loopAndRepeat.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  copySelectedClip,
  duplicateSelectedClip,
  pasteClipsAt,
} from '@/daw/commands/clipCommands';
import { duplicateTrack } from '@/daw/commands/trackCommands';
import { useStore } from '@/daw/store';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { MOST_TRACKS } from '../loopAndRepeatChecks';
import {
  arm,
  describeLessonConventions,
  openDemoSong,
  s,
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

  it('play-the-loop passes once the music plays', () => {
    const { passes } = arm(LOOP, 'play-the-loop');
    expect(passes()).toBe(false);
    useStore.setState({ isPlaying: true });
    expect(passes()).toBe(true);
    useStore.setState({ isPlaying: false });
  });

  it('duplicate-a-clip passes for a duplicated clip: the drums, eight bars', () => {
    const { passes } = arm(LOOP, 'duplicate-a-clip');
    expect(passes()).toBe(false);
    const drums = trackNamed('Drums');
    // The step points at the bottom track's clip, which a right-click selects.
    s().setSelectedClip(drums.midiClips[0].id, drums.id);
    expect(passes()).toBe(false);
    duplicateSelectedClip();
    expect(passes()).toBe(true);
    expect(trackNamed('Drums').midiClips.map((c) => c.startTick)).toEqual([
      0, 7680,
    ]);
  });

  it('copy-and-paste passes for a pasted clip, and not for the copy alone', () => {
    const { passes } = arm(LOOP, 'copy-and-paste');
    const chords = trackNamed('Chords');
    s().setSelectedClip(chords.midiClips[0].id, chords.id);
    copySelectedClip();
    expect(passes()).toBe(false);
    // Paste Here, on its own row at bar 5.
    pasteClipsAt(chords.id, 7680);
    expect(passes()).toBe(true);
    expect(trackNamed('Chords').midiClips.map((c) => c.startTick)).toEqual([
      0, 7680,
    ]);
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
