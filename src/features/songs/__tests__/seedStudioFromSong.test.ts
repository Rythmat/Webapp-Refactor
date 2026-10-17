// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { hey_ya } from '@/curriculum/data/songs/hey_ya';
import type { ChordBar, Song, SongMode } from '@/curriculum/types/songLibrary';
import { regionToMeasures } from '@/daw/midi/leadSheetUtils';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { isDocumentDirty } from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { leadSheetSectionsOf, useStore } from '@/daw/store';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
} from '@/daw/store/undoMiddleware';
import { ticksPerBar } from '@/daw/utils/timelineScale';
import { applySong } from '../seedStudioFromSong';

/**
 * What the Studio has to agree with the Songs page about: the key, the mode,
 * the tempo, the metre, which bar each chord is in, and the song's form.
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

/** Open a song the way openSession does: reset, then apply. */
const seed = (s: Song) => {
  resetSessionToEmpty();
  resetProjectState('open:song');
  applySong(s);
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

describe('applySong', () => {
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

  describe("the song's form", () => {
    /** The project's sections, without their ids. */
    const formOf = (state: ReturnType<typeof useStore.getState>) =>
      state.sections.map(({ type, label, startTick, endTick }) => ({
        type,
        label,
        startTick,
        endTick,
      }));

    it('opens with its sections, named and typed as the chart names them', () => {
      const BAR = 1920;
      const state = seed(
        song({
          sections: [
            { id: 's0', label: 'Intro', bars: [bar('C')] },
            {
              id: 's1',
              label: 'Verse',
              repeatCount: 2,
              bars: [bar('C'), bar('F')],
            },
            { id: 's2', label: 'Pre-Chorus', bars: [bar('G')] },
            {
              id: 's3',
              label: 'Chorus',
              instrumental: true,
              bars: [bar('C'), bar('G')],
            },
          ],
        }),
      );
      expect(formOf(state)).toEqual([
        { type: 'intro', label: 'Intro', startTick: 0, endTick: BAR },
        // Played twice, so each pass is numbered.
        { type: 'verse', label: 'Verse 1', startTick: BAR, endTick: 3 * BAR },
        {
          type: 'verse',
          label: 'Verse 2',
          startTick: 3 * BAR,
          endTick: 5 * BAR,
        },
        {
          type: 'pre-chorus',
          label: 'Pre-Chorus',
          startTick: 5 * BAR,
          endTick: 6 * BAR,
        },
        // Played, not sung, and still a chorus.
        {
          type: 'chorus',
          label: 'Chorus',
          startTick: 6 * BAR,
          endTick: 8 * BAR,
        },
      ]);
      expect(new Set(state.sections.map((s) => s.id)).size).toBe(5);
      // The Lead Sheet marks each on the bar it starts at.
      expect(leadSheetSectionsOf(state)).toEqual([
        { measureIdx: 0, label: 'Intro' },
        { measureIdx: 1, label: 'Verse 1' },
        { measureIdx: 3, label: 'Verse 2' },
        { measureIdx: 5, label: 'Pre-Chorus' },
        { measureIdx: 6, label: 'Chorus' },
      ]);
    });

    it('lays them on the bars of its metre: 6/8', () => {
      // A 6/8 bar is 1440 ticks. Counted in 1920s, the chorus would start
      // half a bar into the verse's second bar.
      const BAR_68 = 1440;
      const jig = (chordName: string): ChordBar => ({
        chords: [{ degree: '1 maj', chordName, beat: 1, duration: 6 }],
      });
      const state = seed(
        song({
          timeSignature: [6, 8],
          sections: [
            { id: 's0', label: 'Verse', bars: [jig('C'), jig('F')] },
            { id: 's1', label: 'Chorus', bars: [jig('G'), jig('C')] },
          ],
        }),
      );
      expect(formOf(state)).toEqual([
        { type: 'verse', label: 'Verse', startTick: 0, endTick: 2 * BAR_68 },
        {
          type: 'chorus',
          label: 'Chorus',
          startTick: 2 * BAR_68,
          endTick: 4 * BAR_68,
        },
      ]);
      expect(leadSheetSectionsOf(state)).toEqual([
        { measureIdx: 0, label: 'Verse' },
        { measureIdx: 2, label: 'Chorus' },
      ]);
    });

    it("follows each bar's own metre, as Hey Ya!'s 2/4 bar does", () => {
      // Every pass of every section is three 4/4 bars, a 2/4 bar and two more
      // 4/4 bars: 10,560 ticks, not the 11,520 six bars of 4/4 would take.
      // Each section is played twice, and each pass is numbered.
      const PASS = 5 * 1920 + 960;
      const state = seed(hey_ya);
      const form = formOf(state);
      expect(form.map((s) => s.label)).toEqual([
        'Verse 1',
        'Verse 2',
        'Chorus 1',
        'Chorus 2',
        'Verse 3',
        'Verse 4',
        'Chorus 3',
        'Chorus 4',
        'Bridge 1',
        'Bridge 2',
        'Chorus 5',
        'Chorus 6',
      ]);
      expect(form.map((s) => s.type)).toEqual([
        'verse',
        'verse',
        'chorus',
        'chorus',
        'verse',
        'verse',
        'chorus',
        'chorus',
        'bridge',
        'bridge',
        'chorus',
        'chorus',
      ]);
      expect(form.map((s) => [s.startTick, s.endTick])).toEqual(
        form.map((_, i) => [i * PASS, (i + 1) * PASS]),
      );
      // The last one ends where the chords do.
      expect(form[form.length - 1].endTick).toBe(
        Math.max(...state.chordRegions.map((r) => r.endTick)),
      );
    });
  });

  describe('applySong, the apply step openSession runs', () => {
    beforeAll(() => initUndoTracking());
    afterEach(() => vi.useRealTimers());

    it('does no reset, baseline or undo reset of its own', () => {
      // Those are the opener's (openSession switching, then baselining):
      // the apply never bumps the session generation inside the open, never
      // takes a baseline with the wrong savedComplete, and never clears a
      // history it doesn't own.
      vi.useFakeTimers();
      resetSessionToEmpty();
      resetUndoHistory();
      useStore.getState().addTrack('midi', 'piano-sampler', 'Before');
      vi.advanceTimersByTime(1000);
      expect(canUndo()).toBe(true);

      const generation = getSessionGeneration();
      applySong(song());
      vi.advanceTimersByTime(1000);
      expect(getSessionGeneration()).toBe(generation);
      expect(canUndo()).toBe(true);
      expect(isDocumentDirty()).toBe(true);
      // The 'Before' track is still there: the apply did not reset.
      expect(useStore.getState().tracks.map((t) => t.name)).toContain('Before');
    });
  });

  it('opens each song as a new project, never stacked on the one before', () => {
    seed(song());
    // The opener resets before each apply: only the second song is left.
    const state = seed(
      song({ id: 'u', title: 'Other Song', tempo: 90, keyRoot: 67 }),
    );
    expect(state.projectName).toBe('Other Song');
    expect(state.tracks.map((t) => t.name)).toEqual(['Other Song — Chords']);
    expect([state.bpm, state.rootNote]).toEqual([90, 7]);
    expect(state.sections.map((s) => s.label)).toEqual(['Verse']);
  });

  it('opens in its own key after the last project locked one (state-reload-15)', () => {
    resetSessionToEmpty();
    useStore.getState().setRootNote(2);
    // The transport's key popover locks the key as it closes.
    useStore.getState().toggleRootLock();
    resetProjectState('open:song');
    applySong(song({ keyRoot: 67 }));
    expect(useStore.getState().rootNote).toBe(7);
  });
});
