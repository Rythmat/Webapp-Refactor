import { describe, expect, it } from 'vitest';
import { JAZZ_EVENTS } from '@/components/atlas/data/events/jazz';
import { RNBSOULFUNK_EVENTS } from '@/components/atlas/data/events/rnbSoulFunk';
import { SONG_LIBRARY_EVENTS } from '@/components/atlas/data/events/songLibrary';
import { keyCenterColor } from '../../music';
import {
  BACK_LABEL,
  BORROWED,
  CHART,
  INFLUENCES,
  INSIGHT,
  KEY_COLOR,
  LESSON,
  LOOP,
  LOOP_SONG,
  PAYOFF,
  SONG_EVENT,
} from '../scenes/connections/connectionsData';
import {
  ACTION_AT,
  autoFrame,
  BAR_MS,
  HALF_MS,
  LOOP_MS,
  PAYOFF_AT,
  PLAY_AT,
  PREVIEW_AT,
  STEP_MS,
} from '../scenes/connections/connectionsScript';
import { CONNECTED_TOUR } from '../tourSteps';

const E = keyCenterColor(4);
const B = keyCenterColor(11);

describe('Connected demo: the song and its colors', () => {
  it("plays Isn't She Lovely's loop in E: three of E's chords and B's F♯7", () => {
    expect(KEY_COLOR).toBe(E);
    expect(LOOP.map((c) => c.name)).toEqual(['C♯min7', 'F♯7', 'B7sus', 'E']);
    expect(LOOP.map((c) => c.color)).toEqual([E, B, E, E]);
    expect(BORROWED).toBe(1);
  });

  it('charts the loop twice, as the song does', () => {
    expect(CHART.label).toBe('Verse');
    expect(CHART.bars).toHaveLength(8);
    expect(CHART.bars.map((b) => b[0].name)).toEqual([
      ...LOOP.map((c) => c.name),
      ...LOOP.map((c) => c.name),
    ]);
  });

  it('writes the loop into the Studio as half notes, in its chords’ colors', () => {
    expect(LOOP_SONG.regions.map((r) => r.color)).toEqual([E, B, E, E]);
    // Each bar's chord struck twice, on beats 1 and 3, each held a half note.
    // (The engine starts every note one tick in, as its MIDI export does.)
    const bar = 1920;
    const half = bar / 2;
    expect(LOOP_SONG.chordNotes).toHaveLength(
      LOOP.reduce((n, c) => n + c.midis.length * 2, 0),
    );
    for (const n of LOOP_SONG.chordNotes) {
      const start = n.startTick - 1;
      expect(start % half).toBe(0);
      expect(n.durationTicks).toBe(half);
      // The engine voices each chord in its own register: same notes.
      const pcs = LOOP[Math.floor(start / bar)].midis.map((m) => m % 12);
      expect(pcs).toContain(n.note % 12);
    }
  });
});

describe('Connected demo: Insight and the lesson', () => {
  it('links the chords of E to the song’s key, and F♯7 to B', () => {
    expect(INSIGHT.map((c) => c.hybrid)).toEqual([
      '6 min7',
      '2 dom7',
      '5 dom7sus4',
      '1 maj',
    ]);
    const songKey = INSIGHT.map(
      (c) => c.isSessionParent && c.sessionMode === 'ionian',
    );
    expect(songKey).toEqual([true, false, true, true]);
    expect(INSIGHT[BORROWED].parentKeyLetter).toBe('B');
  });

  it('teaches E Ionian, the song’s key', () => {
    expect(LESSON.name).toBe('E Ionian');
    expect(LESSON.color).toBe(E);
    expect(LESSON.notes.map((n) => n.name)).toEqual([
      'E',
      'F♯',
      'G♯',
      'A',
      'B',
      'C♯',
      'D♯',
      'E',
    ]);
    expect(LESSON.chords.filter((c) => c.inLoop).map((c) => c.roman)).toEqual([
      'I',
      'V',
      'vi',
    ]);
    expect(LESSON.chords.every((c) => c.color === E)).toBe(true);
  });

  it('ends on the app’s own payoff lines', () => {
    expect(PAYOFF.headline).toBe(
      "That's E Ionian. The major scale: bright, settled, home.",
    );
    expect(PAYOFF.fromSong).toBe("It's a sound from Isn't She Lovely.");
    expect(BACK_LABEL).toBe("Back to Isn't She Lovely");
  });
});

describe('Connected demo: the Globe', () => {
  const pick = ({ id, year, location, genre, title }: typeof SONG_EVENT) => ({
    id,
    year,
    location,
    genre,
    title,
  });

  it('shows the song’s real Globe event', () => {
    const real = SONG_LIBRARY_EVENTS.find((e) => e.id === SONG_EVENT.id);
    expect(real).toBeDefined();
    expect(pick(SONG_EVENT)).toEqual(pick({ ...real!, description: '' }));
    expect(SONG_EVENT.description).toBe(real!.description);
  });

  it('shows the events the Globe says influenced it', () => {
    for (const copy of INFLUENCES) {
      const real = [...RNBSOULFUNK_EVENTS, ...JAZZ_EVENTS].find(
        (e) => e.id === copy.id,
      );
      expect(real).toBeDefined();
      expect(copy).toEqual({
        id: real!.id,
        year: real!.year,
        location: real!.location,
        genre: real!.genre,
        title: real!.title,
      });
    }
  });
});

describe('Connected demo: script', () => {
  it('matches the tour config', () => {
    const steps = CONNECTED_TOUR.steps;
    expect(steps.map((s) => s.durationMs)).toEqual([...STEP_MS]);
    expect(steps.map((s) => s.target)).toEqual([
      'song',
      'globe',
      'studio',
      'lesson',
    ]);
    steps.forEach((s) => expect(s.callout.length).toBeLessThanOrEqual(80));
  });

  it('moves each target to its next button, with time to click it', () => {
    STEP_MS.forEach((ms, step) => {
      expect(autoFrame(step, ACTION_AT[step] - 1).target).toBe('first');
      expect(autoFrame(step, ACTION_AT[step]).target).toBe('action');
      // The cursor lands ~720 ms after the move; the press ends by 950.
      expect(ACTION_AT[step] + 950).toBeLessThan(ms);
      expect(autoFrame(step, 800).press).toBe('first');
      expect(autoFrame(step, ACTION_AT[step] + 800).press).toBe('action');
    });
  });

  it('previews F♯7 on the chart', () => {
    expect(autoFrame(0, PREVIEW_AT - 1).lit).toBeNull();
    const f = autoFrame(0, PREVIEW_AT);
    expect(f.lit).toBe(BORROWED);
    expect(f.sound?.midis).toEqual(LOOP[BORROWED].midis);
  });

  it('plays the loop once in half notes, then parks on E', () => {
    expect(autoFrame(2, PLAY_AT - 1).playing).toBe(false);
    expect(autoFrame(2, PLAY_AT)).toMatchObject({ playing: true, bar: 0 });
    expect(autoFrame(2, PLAY_AT + BAR_MS).bar).toBe(1);
    expect(autoFrame(2, PLAY_AT + LOOP_MS - 1).bar).toBe(3);
    expect(autoFrame(2, PLAY_AT + LOOP_MS).playing).toBe(false);
    // Two cues per bar (beats 1 and 3), each stable within its half.
    expect(autoFrame(2, PLAY_AT + 10).soundKey).toBe(
      autoFrame(2, PLAY_AT + HALF_MS - 10).soundKey,
    );
    expect(autoFrame(2, PLAY_AT + HALF_MS)).toMatchObject({ bar: 0 });
    expect(autoFrame(2, PLAY_AT + HALF_MS).soundKey).not.toBe(
      autoFrame(2, PLAY_AT).soundKey,
    );
    // The "Song's key" link it clicks is on E's card (bar 4).
    const at = autoFrame(2, ACTION_AT[2]);
    expect(at.bar).toBe(3);
    expect(INSIGHT[at.bar].isSessionParent).toBe(true);
  });

  it('shows the payoff before the Back button is clicked', () => {
    expect(PAYOFF_AT).toBeLessThan(ACTION_AT[3]);
    expect(autoFrame(3, PAYOFF_AT - 1).payoff).toBe(false);
    expect(autoFrame(3, PAYOFF_AT).payoff).toBe(true);
  });

  it('shows each step’s end state at ms = Infinity, silent', () => {
    expect(autoFrame(0, Infinity)).toMatchObject({ lit: null, press: null });
    expect(autoFrame(1, Infinity)).toMatchObject({ story: true, arcs: true });
    expect(autoFrame(2, Infinity)).toMatchObject({ playing: false, bar: 3 });
    expect(autoFrame(3, Infinity)).toMatchObject({
      chords: LOOP.length,
      payoff: true,
    });
    STEP_MS.forEach((_, step) =>
      expect(autoFrame(step, Infinity).sound).toBeNull(),
    );
  });
});
