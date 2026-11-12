import { describe, expect, it } from 'vitest';
import { CHORD_RHYTHMS, GENRE_MAP } from '@prism/engine';
import { DEMO_PROGRESSION } from '../../music';
import {
  autoFrame,
  DEMO_KEY_PC,
  DEMO_PROMPT,
  endState,
  INITIAL_STATE,
  LOOP_MS,
  PARK_TICK,
  PLAY_AT_MS,
  RESOLVE_MS,
  stateAt,
  STEP_CUES,
  STEP_PRESSES,
} from '../scenes/studio/studioScript';
import {
  barTokens,
  bassLine,
  buildSong,
  eventsInWindow,
  formatPosition,
  keyRootFor,
  regionAt,
  rollRange,
  STYLE_NAMES,
  STYLES,
} from '../scenes/studio/studioSong';
import { TOUR_BY_ID } from '../tourSteps';

describe('Studio demo: script', () => {
  it('asks Prism, writes the chords in D, then the bass and drums', () => {
    expect(DEMO_KEY_PC).toBe(2);
    expect(DEMO_PROMPT).toMatch(/ in D$/);
    expect(INITIAL_STATE).toEqual({
      asked: false,
      keyPc: null,
      chords: false,
      band: false,
    });
    expect(endState(0)).toEqual({ ...INITIAL_STATE, asked: true });
    expect(endState(1)).toEqual({
      asked: true,
      keyPc: 2,
      chords: true,
      band: false,
    });
    expect(endState(2)).toEqual({
      asked: true,
      keyPc: 2,
      chords: true,
      band: true,
    });
    expect(endState(3)).toEqual(endState(2));
  });

  it('starts each step from the previous end state, as a fresh object', () => {
    expect(stateAt(0, 0)).toEqual(INITIAL_STATE);
    expect(stateAt(0, 0)).not.toBe(INITIAL_STATE);
    for (const step of [1, 2, 3]) {
      expect(stateAt(step, 0)).toEqual(endState(step - 1));
    }
  });

  it('lands each cue at its ms', () => {
    expect(autoFrame(0, 749).state.asked).toBe(false);
    expect(autoFrame(0, 750).state.asked).toBe(true);
    expect(autoFrame(1, 749).state).toMatchObject({
      keyPc: null,
      chords: false,
    });
    expect(autoFrame(1, 750).state).toMatchObject({ keyPc: 2, chords: true });
    expect(autoFrame(2, 749).state.band).toBe(false);
    expect(autoFrame(2, 750).state.band).toBe(true);
    expect(autoFrame(3, 999).playing).toBe(false);
    expect(autoFrame(3, 1000).playing).toBe(true);
    expect(autoFrame(3, 9399).playing).toBe(true);
  });

  it('presses what the cursor clicks, around each cue', () => {
    expect(autoFrame(0, 700).press).toBe('prompt');
    expect(autoFrame(1, 700).press).toBe('create');
    expect(autoFrame(2, 800).press).toBeNull();
    expect(autoFrame(3, 700).press).toBe('play');
    expect(autoFrame(3, 1000).press).toBeNull();
    expect(autoFrame(0, 649).key).not.toBe(autoFrame(0, 650).key);
  });

  it('shows the end state at ms = Infinity: parked, silent, no press', () => {
    const f = autoFrame(3, Infinity);
    expect(f.playing).toBe(false);
    expect(f.press).toBeNull();
    expect(f.parkTick).toBe(PARK_TICK);
    expect(f.state).toEqual(endState(3));
    expect(autoFrame(2, Infinity).parkTick).toBe(0);
  });

  it('previews the key’s chord once, as the chords land', () => {
    expect(autoFrame(0, 800).sound).toBeNull();
    expect(autoFrame(1, 500).sound).toBeNull();
    expect(autoFrame(1, 800).sound).toEqual([62, 66, 69]); // D
    expect(autoFrame(2, 800).sound).toBeNull();
    expect(autoFrame(1, 800).soundKey).toBe(autoFrame(1, 3000).soundKey);
    expect(autoFrame(1, 749).soundKey).not.toBe(autoFrame(1, 750).soundKey);
  });

  it('keeps every cue and press inside its step', () => {
    STEP_CUES.forEach((cues, step) => {
      const ms = TOUR_BY_ID.studio.steps[step].durationMs;
      expect([...cues].sort((a, b) => a - b)).toEqual(cues);
      cues.forEach((at) => expect(at).toBeLessThan(ms));
      STEP_PRESSES[step].forEach((p) => expect(p.to).toBeLessThan(ms));
    });
  });

  it('puts every key root near middle C', () => {
    expect(keyRootFor(0)).toBe(60);
    expect(keyRootFor(5)).toBe(65);
    expect(keyRootFor(7)).toBe(55);
  });
});

describe('Studio demo: the clip Create writes', () => {
  it('spreads 1–4 chords over four bars', () => {
    expect(barTokens([])).toEqual([]);
    expect(barTokens(['a'])).toEqual(['a', 'a', 'a', 'a']);
    expect(barTokens(['a', 'b'])).toEqual(['a', 'b', 'a', 'b']);
    expect(barTokens(['a', 'b', 'c'])).toEqual(['a', 'b', 'c', 'a']);
    expect(barTokens(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('generates chords and drums with the real engine', () => {
    const song = buildSong({
      clip: DEMO_PROGRESSION,
      keyRoot: 60,
      style: 'Pop',
    });
    expect(song.chordNotes).toHaveLength(12);
    const chordHits = song.events.filter((e) => e.track === 'chords');
    expect(chordHits).toHaveLength(4);
    const drums = song.events.flatMap((e) =>
      e.track === 'drums' ? [e.drum] : [],
    );
    expect(drums).toHaveLength(48);
    expect(drums.filter((d) => d === 'kick')).toHaveLength(8);
    expect(drums.filter((d) => d === 'snare')).toHaveLength(8);
    expect(drums.filter((d) => d === 'hat')).toHaveLength(32);
    const ticks = song.events.map((e) => e.tick);
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
  });

  it('labels and colors the chord-ruler regions', () => {
    const { regions } = buildSong({
      clip: DEMO_PROGRESSION,
      keyRoot: 60,
      style: 'Pop',
    });
    expect(regions.map((r) => r.label)).toEqual([
      'C maj',
      'E maj',
      'F maj',
      'F min',
    ]);
    expect(regions.map((r) => r.color)).toEqual([
      'rgb(210, 64, 74)',
      'rgb(174, 213, 128)',
      'rgb(210, 64, 74)',
      'rgb(157, 127, 206)',
    ]);
    expect(regions[0].midis).toEqual([60, 64, 67]);
    expect(regionAt(regions, PARK_TICK)?.label).toBe('F min');
  });

  it('writes the bass on each chord’s root, two octaves down, every beat', () => {
    const { regions } = buildSong({
      clip: DEMO_PROGRESSION,
      keyRoot: keyRootFor(DEMO_KEY_PC),
      style: 'Pop',
    });
    const { notes, events } = bassLine(regions);
    expect(notes).toHaveLength(16);
    // D, F♯, G, G (Gm's root).
    expect(notes.filter((_, i) => i % 4 === 0).map((n) => n.note)).toEqual([
      38, 42, 43, 43,
    ]);
    expect(notes.map((n) => n.startTick)).toEqual(
      Array.from({ length: 16 }, (_, i) => i * 480),
    );
    expect(events.every((e) => e.track === 'bass')).toBe(true);
    expect(events.map((e) => e.tick)).toEqual(notes.map((n) => n.startTick));
    expect(bassLine([])).toEqual({ notes: [], events: [] });
  });

  it('merges repeated bars into one region', () => {
    const { regions } = buildSong({
      clip: ['1 major'],
      keyRoot: 60,
      style: 'Pop',
    });
    expect(regions).toHaveLength(1);
    expect([regions[0].startTick, regions[0].endTick]).toEqual([0, 7680]);
  });

  it('keeps the drum groove without a clip', () => {
    const song = buildSong({ clip: null, keyRoot: 60, style: 'Pop' });
    expect(song.chordNotes).toEqual([]);
    expect(song.regions).toEqual([]);
    expect(song.events.every((e) => e.track === 'drums')).toBe(true);
    expect(song.events).toHaveLength(48);
  });

  it('builds every STYLE with a groove matching its rhythm', () => {
    for (const style of STYLE_NAMES) {
      const { rhythm, drums = rhythm, genre } = STYLES[style];
      expect(CHORD_RHYTHMS[rhythm]).toBeDefined();
      expect(GENRE_MAP[drums]).toBe(genre);
      const song = buildSong({ clip: DEMO_PROGRESSION, keyRoot: 60, style });
      expect(song.chordNotes.length).toBeGreaterThan(0);
      expect(song.drumNotes.length).toBeGreaterThan(0);
    }
  });

  it('holds each chord for a whole note in Pop, the default style', () => {
    const { chordNotes } = buildSong({
      clip: DEMO_PROGRESSION,
      keyRoot: 60,
      style: 'Pop',
    });
    // One hit per bar (the engine starts each hit a tick in), a bar long.
    const bars = chordNotes.map((n) => Math.floor(n.startTick / 1920));
    expect([...new Set(bars)]).toEqual([0, 1, 2, 3]);
    expect(chordNotes.every((n) => n.durationTicks === 1920)).toBe(true);
  });

  it('fits the demo in a 22-row piano roll (58–79)', () => {
    const { chordNotes } = buildSong({
      clip: DEMO_PROGRESSION,
      keyRoot: 60,
      style: 'Pop',
    });
    expect(rollRange(chordNotes)).toEqual({ lo: 58, hi: 79 });
    expect(rollRange([])).toEqual({ lo: 58, hi: 79 });
  });
});

describe('Studio demo: transport math', () => {
  it('formats bar:beat:sixteenth like the Studio', () => {
    expect(formatPosition(0)).toBe('1:1:1');
    expect(formatPosition(5760)).toBe('4:1:1');
    expect(formatPosition(7679)).toBe('4:4:4');
  });

  it('finds events across the loop point', () => {
    const events = [{ tick: 0 }, { tick: 3840 }, { tick: 7600 }];
    expect(
      eventsInWindow(events, 7500, 7780).map((e) => [e.event.tick, e.abs]),
    ).toEqual([
      [7600, 7600],
      [0, 7680],
    ]);
    expect(eventsInWindow(events, 0, 1)).toHaveLength(1);
    expect(eventsInWindow(events, 1, 1)).toEqual([]);
  });
});

describe('Studio demo: tour config', () => {
  it('targets the scene’s controls, with Play long enough for one pass', () => {
    const steps = TOUR_BY_ID.studio.steps;
    expect(steps.map((s) => s.target)).toEqual([
      'prompt',
      'create',
      'tracks',
      'play',
    ]);
    expect(steps.map((s) => s.durationMs)).toEqual([
      3600,
      3600,
      3600,
      PLAY_AT_MS + LOOP_MS + RESOLVE_MS,
    ]);
    steps.forEach((s) => expect(s.callout.length).toBeLessThanOrEqual(80));
  });
});
