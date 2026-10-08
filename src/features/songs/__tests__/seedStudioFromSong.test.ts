// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { ChordBar, Song, SongMode } from '@/curriculum/types/songLibrary';
import { regionToMeasures } from '@/daw/midi/leadSheetUtils';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import {
  hasWorkToKeep,
  isDocumentDirty,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { canUndo } from '@/daw/store/undoMiddleware';
import { ticksPerBar } from '@/daw/utils/timelineScale';
import { seedStudioFromSong } from '../seedStudioFromSong';

/**
 * What the Studio has to agree with the Songs page about: the key, the mode,
 * the tempo, the metre, and which bar each chord is in.
 */

const bar = (chordName: string, degree = '1 maj'): ChordBar => ({
  chords: [{ degree, chordName, beat: 1, duration: 4 }],
});

const song = (over: Partial<Song> = {}): Song =>
  ({
    id: 't',
    title: 'Test Song',
    artist: 'Test Artist',
    key: 'C major',
    keyRoot: 60,
    mode: 'major' as SongMode,
    tempo: 132,
    timeSignature: [4, 4],
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [
      {
        id: 's0',
        label: 'Verse',
        bars: [bar('C'), bar('F'), bar('G'), bar('C')],
      },
    ],
    audioSources: [],
    artistImageSource: 'none',
    ...over,
  }) as Song;

const seed = (s: Song) => {
  resetSessionToEmpty();
  seedStudioFromSong(s);
  return useStore.getState();
};

/** The bar each chord lands in, as the lead sheet cuts the timeline up. */
const barOfEachChord = (state: ReturnType<typeof useStore.getState>) => {
  const perBar = ticksPerBar(
    state.timeSignatureNumerator,
    state.timeSignatureDenominator,
  );
  return regionToMeasures(state.chordRegions, perBar)
    .flatMap((m) => m.chords.map((c) => ({ m: m.index, name: c.noteName })))
    .filter((c) => c.name);
};

describe('seedStudioFromSong', () => {
  it('carries the title, tempo and key across', () => {
    const state = seed(song());
    expect(state.projectName).toBe('Test Song');
    expect(state.bpm).toBe(132);
    expect(state.rootNote).toBe(0); // C
  });

  it('names the mode the way the Studio names modes', () => {
    // The library writes 'major'/'minor'; 'minor' is not one of the Studio's
    // MODES, so leaving it unmapped puts an unknown mode into the key line and
    // every degree computed from it.
    expect(seed(song({ mode: 'major' as SongMode })).mode).toBe('ionian');
    expect(seed(song({ mode: 'minor' as SongMode })).mode).toBe('aeolian');
    expect(seed(song({ mode: 'dorian' as SongMode })).mode).toBe('dorian');
    expect(seed(song({ mode: 'mixolydian' as SongMode })).mode).toBe(
      'mixolydian',
    );
  });

  it('keeps one chord per bar in 4/4', () => {
    expect(barOfEachChord(seed(song()))).toEqual([
      { m: 0, name: 'C' },
      { m: 1, name: 'F' },
      { m: 2, name: 'G' },
      { m: 3, name: 'C' },
    ]);
  });

  it('keeps one chord per bar in 3/4', () => {
    // 3/4 bars are 1440 ticks. Cut at the 4/4 default of 1920 the second chord
    // lands inside bar 1 and the chart drifts a beat further out every bar.
    const waltz = song({
      timeSignature: [3, 4],
      sections: [
        {
          id: 's0',
          label: 'Verse',
          bars: [
            {
              chords: [
                { degree: '1 maj', chordName: 'C', beat: 1, duration: 3 },
              ],
            },
            {
              chords: [
                { degree: '4 maj', chordName: 'F', beat: 1, duration: 3 },
              ],
            },
            {
              chords: [
                { degree: '5 maj', chordName: 'G', beat: 1, duration: 3 },
              ],
            },
          ],
        },
      ],
    });
    const state = seed(waltz);
    expect(state.timeSignatureNumerator).toBe(3);
    expect(state.timeSignatureDenominator).toBe(4);
    expect(barOfEachChord(state)).toEqual([
      { m: 0, name: 'C' },
      { m: 1, name: 'F' },
      { m: 2, name: 'G' },
    ]);
  });

  it('keeps one chord per bar in 6/8', () => {
    // A 6/8 bar is six eighths — three quarters, 1440 ticks — not six quarters.
    const jig = song({
      timeSignature: [6, 8],
      sections: [
        {
          id: 's0',
          label: 'Verse',
          bars: [
            {
              chords: [
                { degree: '1 maj', chordName: 'C', beat: 1, duration: 6 },
              ],
            },
            {
              chords: [
                { degree: '4 maj', chordName: 'F', beat: 1, duration: 6 },
              ],
            },
          ],
        },
      ],
    });
    expect(barOfEachChord(seed(jig))).toEqual([
      { m: 0, name: 'C' },
      { m: 1, name: 'F' },
    ]);
  });

  it('leaves nothing on the undo stack and nothing unsaved, so an untouched song reads as untouched', () => {
    // Opening a song is not an edit the player made. The song as it opened is
    // also the save status's baseline, so the next link has no work in it to
    // keep.
    seed(song());
    expect(canUndo()).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('opens each song as a new project, never stacked on the one before', () => {
    resetSessionToEmpty();
    seedStudioFromSong(song());
    seedStudioFromSong(
      song({ id: 'u', title: 'Other Song', tempo: 90, keyRoot: 67 }),
    );
    const state = useStore.getState();
    // The seed starts a new project itself, so even a caller that skips the
    // reset gets only the second song.
    expect(state.projectName).toBe('Other Song');
    expect(state.tracks.map((t) => t.name)).toEqual(['Other Song — Chords']);
    expect([state.bpm, state.rootNote]).toEqual([90, 7]);
  });

  it('opens in its own key after the last project locked one (state-reload-15)', () => {
    resetSessionToEmpty();
    useStore.getState().setRootNote(2);
    // The transport's key popover locks the key as it closes.
    useStore.getState().toggleRootLock();
    seedStudioFromSong(song({ keyRoot: 67 }));
    expect(useStore.getState().rootNote).toBe(7);
  });
});
