import { describe, expect, it } from 'vitest';
import { CHORD_RHYTHMS, GENRE_MAP } from '@prism/engine';
import { DEMO_PROGRESSION } from '../../music';
import {
  autoFrame,
  DEMO_KEY_PC,
  endState,
  INITIAL_STATE,
  LOOP_MS,
  PARK_TICK,
  PLAY_AT_MS,
  RESOLVE_MS,
  spectrumGroups,
  stateAt,
  STEP_CUES,
  STEP_PRESSES,
  type StudioState,
} from '../scenes/studio/studioScript';
import {
  barTokens,
  buildSong,
  eventsInWindow,
  formatPosition,
  keyRootFor,
  optionsFor,
  pickFromColor,
  regionAt,
  rollRange,
  STYLE_NAMES,
  STYLES,
} from '../scenes/studio/studioSong';
import { TOUR_BY_ID } from '../tourSteps';

const inC = (seq: string[]): StudioState => ({
  ...INITIAL_STATE,
  keyPc: 0,
  seq,
});
const inD = (seq: string[]): StudioState => ({ ...inC(seq), keyPc: 2 });
const litColors = (s: StudioState) =>
  [...spectrumGroups(s).keys()].sort((a, b) => a - b);

describe('Studio demo: Prism spectrum', () => {
  it('stays dark until a key is set', () => {
    expect(litColors(INITIAL_STATE)).toEqual([]);
    expect(optionsFor(INITIAL_STATE)).toEqual([]);
  });

  it('lights the first chords, then what can follow C', () => {
    expect(litColors(inC([]))).toEqual([1, 5, 12, 13]);
    expect(litColors(inC(['1 major']))).toEqual([1, 2, 3, 5, 12, 13, 14]);
    expect(spectrumGroups(inC(['1 major'])).get(5)).toEqual(['3 major']);
  });

  it('picks the tour path by color: E (green), F (red), Fm (purple)', () => {
    const seq = ['1 major'];
    const path: [number, string][] = [
      [5, '3 major'],
      [1, '4 major'],
      [10, '4 minor'],
    ];
    for (const [color, expected] of path) {
      const group = spectrumGroups(inC(seq)).get(color);
      expect(group).toBeDefined();
      expect(pickFromColor(group!, seq, seq.length)).toBe(expected);
      seq.push(expected);
    }
    expect(seq).toEqual(DEMO_PROGRESSION);
    // After C–E, red holds vi and IV; the demo still takes IV.
    expect(spectrumGroups(inC(['1 major', '3 major'])).get(1)).toEqual([
      '6 minor',
      '4 major',
    ]);
  });

  it('picks the same path in the tour’s D: F♯ (teal), G (orange), Gm (pink)', () => {
    expect(DEMO_KEY_PC).toBe(2);
    // Teal (F♯'s color) holds only III after D — the tour's callout.
    expect(spectrumGroups(inD(['1 major'])).get(7)).toEqual(['3 major']);
    const seq = ['1 major'];
    const path: [number, string][] = [
      [7, '3 major'],
      [3, '4 major'],
      [12, '4 minor'],
    ];
    for (const [color, expected] of path) {
      const group = spectrumGroups(inD(seq)).get(color);
      expect(group).toBeDefined();
      expect(pickFromColor(group!, seq, seq.length)).toBe(expected);
      seq.push(expected);
    }
    expect(seq).toEqual(DEMO_PROGRESSION);
  });

  it('rotates through a color off the tour path', () => {
    const group = ['6 minor', '4 major'];
    expect(pickFromColor(group, ['2 minor'], 0)).toBe('6 minor');
    expect(pickFromColor(group, ['2 minor'], 3)).toBe('4 major');
  });

  it('has no options once the sequence holds 4 chords', () => {
    expect(optionsFor(inC(DEMO_PROGRESSION))).toEqual([]);
    expect(litColors(inC(DEMO_PROGRESSION))).toEqual([]);
  });

  it('puts every key root near middle C', () => {
    expect(keyRootFor(0)).toBe(60);
    expect(keyRootFor(5)).toBe(65);
    expect(keyRootFor(7)).toBe(55);
  });
});

describe('Studio demo: script', () => {
  it('reaches each step’s end state', () => {
    expect(endState(0)).toMatchObject({
      keyPc: 2,
      seq: ['1 major'],
      clip: null,
      dock: 'prism',
    });
    expect(endState(1)).toMatchObject({ seq: DEMO_PROGRESSION, clip: null });
    expect(endState(2)).toMatchObject({
      seq: DEMO_PROGRESSION,
      clip: DEMO_PROGRESSION,
      dock: 'prism',
    });
    expect(endState(3)).toMatchObject({
      keyPc: 2,
      clip: DEMO_PROGRESSION,
      dock: 'roll',
      style: 'Pop',
      muted: [],
      soloed: [],
    });
  });

  it('starts each step from the previous end state, with fresh arrays', () => {
    expect(stateAt(0, 0)).toEqual(INITIAL_STATE);
    for (const step of [1, 2, 3]) {
      expect(stateAt(step, 0)).toEqual(endState(step - 1));
    }
    expect(stateAt(3, 2).seq).not.toBe(stateAt(3, 2).seq);
    expect(stateAt(3, 2).seq).not.toBe(DEMO_PROGRESSION);
  });

  it('lands each cue at its ms', () => {
    expect(autoFrame(0, 749).state.keyPc).toBeNull();
    expect(autoFrame(0, 750).state.keyPc).toBe(2);
    expect(autoFrame(1, 749).state.seq).toHaveLength(1);
    expect(autoFrame(1, 750).state.seq).toHaveLength(2);
    expect(autoFrame(1, 2600).state.seq).toHaveLength(4);
    expect(autoFrame(2, 749).state.clip).toBeNull();
    expect(autoFrame(2, 750).state.clip).toEqual(DEMO_PROGRESSION);
    expect(autoFrame(3, 749).state.dock).toBe('prism');
    expect(autoFrame(3, 750).state.dock).toBe('roll');
    expect(autoFrame(3, 999).playing).toBe(false);
    expect(autoFrame(3, 1000).playing).toBe(true);
    expect(autoFrame(3, 9399).playing).toBe(true);
  });

  it('presses what the cursor clicks, around each cue', () => {
    expect(autoFrame(0, 1600).press).toEqual({ segment: 3 });
    expect(autoFrame(1, 700).press).toEqual({ segment: 7 });
    expect(autoFrame(1, 2500).press).toEqual({ segment: 12 });
    expect(autoFrame(2, 700).press).toBe('create');
    expect(autoFrame(3, 700).press).toBe('roll');
    expect(autoFrame(3, 1000).press).toBe('play');
    expect(autoFrame(3, 1300).press).toBeNull();
  });

  it('sends the cursor to each later spectrum press before it lands', () => {
    expect(autoFrame(0, 999).cursor).toBeNull();
    expect(autoFrame(0, 1000).cursor).toBe(3);
    expect(autoFrame(1, 100).cursor).toBeNull();
    expect(autoFrame(1, 150).cursor).toBe(7);
    expect(autoFrame(1, 1000).cursor).toBe(3);
    expect(autoFrame(1, 1900).cursor).toBe(12);
    expect(autoFrame(2, 700).cursor).toBeNull();
    expect(autoFrame(1, Infinity).cursor).toBeNull();
    expect(autoFrame(0, 999).key).not.toBe(autoFrame(0, 1000).key);
  });

  it('reads out the pressed color from the state before the click', () => {
    expect(autoFrame(1, 800).hover).toEqual({
      segment: 7,
      tokens: ['3 major'],
      pick: '3 major',
    });
    const orange = autoFrame(0, 1800).hover;
    expect(orange?.pick).toBe('1 major');
    expect(orange?.tokens).toContain('4 major');
  });

  it('shows the end state at ms = Infinity: parked, silent, no press', () => {
    const f = autoFrame(3, Infinity);
    expect(f.playing).toBe(false);
    expect(f.press).toBeNull();
    expect(f.parkTick).toBe(PARK_TICK);
    expect(f.state).toEqual(endState(3));
    expect(autoFrame(2, Infinity).parkTick).toBe(0);
  });

  it('previews each cue’s chord once per cue', () => {
    expect(autoFrame(0, 500).sound).toBeNull();
    expect(autoFrame(0, 800).sound).toEqual([62, 66, 69]); // D
    expect(autoFrame(1, 800).sound).toEqual([66, 70, 73]); // F♯
    expect(autoFrame(1, 2700).sound).toEqual([67, 70, 74]); // Gm
    expect(autoFrame(1, 800).soundKey).toBe(autoFrame(1, 1600).soundKey);
    expect(autoFrame(1, 800).soundKey).not.toBe(autoFrame(1, 1700).soundKey);
  });

  it('keeps every cue and press inside its step', () => {
    STEP_CUES.forEach((cues, step) => {
      const ms = TOUR_BY_ID.studio.steps[step].durationMs;
      expect([...cues].sort((a, b) => a - b)).toEqual(cues);
      cues.forEach((at) => expect(at).toBeLessThan(ms));
      STEP_PRESSES[step].forEach((p) => expect(p.to).toBeLessThan(ms));
    });
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
      'key',
      'pick',
      'create',
      'roll',
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
