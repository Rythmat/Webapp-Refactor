/**
 * MIDI guitar strums → chord events: the 60 ms strum window, ghost notes,
 * on/change/off, and a fresh strumId for every strum.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MidiGuitarChordAggregator,
  type GuitarChordEvent,
} from '../MidiGuitarChordAggregator';

const OPEN_C = [48, 52, 55, 60, 64]; // X-3-2-0-1-0
const OPEN_AM = [45, 52, 57, 60, 64]; // X-0-2-2-1-0

let now = 0;
let events: GuitarChordEvent[] = [];
let agg: MidiGuitarChordAggregator;

/** Move the fake clock (and any due timer) to `ms`. */
function at(ms: number) {
  vi.advanceTimersByTime(ms - now);
  now = ms;
}

function on(midi: number, ms: number, velocity = 90) {
  at(ms);
  agg.noteOn(midi, velocity, ms);
}

function off(midi: number, ms: number) {
  at(ms);
  agg.noteOff(midi, ms);
}

/** One downstroke, a string every 5 ms. */
function strum(midis: number[], ms: number) {
  midis.forEach((midi, i) => on(midi, ms + i * 5));
}

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  events = [];
  agg = new MidiGuitarChordAggregator((e) => events.push(e));
});

afterEach(() => {
  agg.reset();
  vi.useRealTimers();
});

describe('strum window', () => {
  it('collects a strum for 60 ms, then names it from the held notes', () => {
    strum(OPEN_C, 1000);
    at(1059);
    expect(events).toEqual([]);
    at(1060);
    expect(events).toEqual([
      {
        phase: 'on',
        strumId: 1,
        rootPc: 0,
        quality: 'major',
        pcs: [0, 4, 7],
        confidence: 1,
        onsetPerfMs: 1000,
        source: 'midi',
        midis: OPEN_C,
      },
    ]);
  });

  it('roots the name on the lowest held note', () => {
    strum([...OPEN_AM, 67], 1000); // Am7 voicing, A in the bass (not C6)
    at(1100);
    expect(events[0]).toMatchObject({ rootPc: 9, quality: 'minor7' });
  });

  it('sends a change when one added note alters the sounding chord', () => {
    strum(OPEN_AM, 1000);
    on(67, 1300); // hammer-on G
    at(1400);
    expect(events.map((e) => [e.phase, e.strumId, e.quality])).toEqual([
      ['on', 1, 'minor'],
      ['change', 1, 'minor7'],
    ]);
    expect(events[1].onsetPerfMs).toBe(1000);
  });

  it('hears a slow strum that outlasts the window as one strum', () => {
    // Open E minor, a string every 20 ms: G B E land after the window.
    [40, 47, 52, 55, 59, 64].forEach((midi, i) => on(midi, 1000 + i * 20));
    at(1140);
    expect(events.map((e) => [e.phase, e.strumId, e.quality])).toEqual([
      ['on', 1, '5'],
      ['change', 1, 'minor'],
    ]);
    expect(events[1]).toMatchObject({ rootPc: 4, onsetPerfMs: 1000 });

    // An eighth note later at 200 BPM is a new strum.
    strum([40, 47, 52, 55, 59, 64], 1150);
    at(1300);
    expect(events.map((e) => [e.phase, e.strumId])).toEqual([
      ['on', 1],
      ['change', 1],
      ['on', 2],
    ]);
  });

  it('names a set no chord fits exactly by the nearest chord, or the bass', () => {
    strum([...OPEN_C, 66], 1000); // a stray F♯
    at(1100);
    expect(events[0]).toMatchObject({
      rootPc: 0,
      quality: 'major',
      pcs: [0, 4, 6, 7],
    });

    agg.reset();
    events = [];
    strum([50, 51, 52], 2000); // a cluster
    at(2100);
    expect(events[0]).toMatchObject({ rootPc: 2, quality: '', pcs: [2, 3, 4] });
  });
});

describe('ghost notes', () => {
  it('ignores very soft notes', () => {
    strum(OPEN_C, 1000);
    on(61, 1025, 5);
    at(1100);
    expect(events).toHaveLength(1);
    expect(events[0].pcs).toEqual([0, 4, 7]);
  });

  it('drops a note released within 40 ms from the strum', () => {
    on(62, 998);
    strum(OPEN_C, 1000);
    off(62, 1030);
    at(1100);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ pcs: [0, 4, 7], onsetPerfMs: 1000 });
  });

  it('keeps the strum onset when a ghost follows a short real note', () => {
    strum(OPEN_C, 1000);
    on(61, 1030);
    off(48, 1041); // released, but not a ghost
    off(61, 1050); // a ghost
    at(1060);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ pcs: [0, 4, 7], onsetPerfMs: 1000 });
  });

  it('takes a ghost back out of a chord already sent', () => {
    strum(OPEN_C, 1000);
    on(62, 1050); // lands inside the window…
    at(1060);
    expect(events[0].pcs).toEqual([0, 2, 4, 7]);
    off(62, 1080); // …and turns out to be a ghost
    expect(events[1]).toMatchObject({
      phase: 'change',
      strumId: 1,
      pcs: [0, 4, 7],
      quality: 'major',
    });
  });
});

describe('release', () => {
  it('sends off once fewer than two pitch classes are held for 150 ms', () => {
    strum(OPEN_C, 1000);
    OPEN_C.forEach((midi) => off(midi, 2000));
    at(2149);
    expect(events.map((e) => e.phase)).toEqual(['on']);
    at(2150);
    expect(events[1]).toMatchObject({
      phase: 'off',
      strumId: 1,
      onsetPerfMs: 1000,
      offsetPerfMs: 2000,
    });
  });

  it('keeps the chord name while strings stop one by one', () => {
    strum(OPEN_C, 1000);
    off(64, 1500);
    off(55, 1600); // C3 E3 C4 left: still C and E
    at(1700);
    expect(events.map((e) => e.phase)).toEqual(['on']);
    off(52, 1800); // only C left
    at(1950);
    expect(events[1]).toMatchObject({ phase: 'off', offsetPerfMs: 1800 });
  });
});

describe('strumId', () => {
  it('gives a re-strum of the same chord a new strumId', () => {
    strum(OPEN_C, 1000);
    strum(OPEN_C, 1500); // strings retriggered while ringing
    at(1600);
    expect(events.map((e) => [e.phase, e.strumId, e.onsetPerfMs])).toEqual([
      ['on', 1, 1000],
      ['on', 2, 1500],
    ]);
  });

  it('bridges a quick mute-and-restrum without an off', () => {
    strum(OPEN_C, 1000);
    OPEN_C.forEach((midi) => off(midi, 2000));
    strum(OPEN_C, 2100);
    at(2400);
    expect(events.map((e) => [e.phase, e.strumId])).toEqual([
      ['on', 1],
      ['on', 2],
    ]);
  });

  it('keeps counting after reset', () => {
    strum(OPEN_C, 1000);
    at(1100);
    agg.reset();
    strum(OPEN_AM, 2000);
    at(2100);
    expect(events.map((e) => e.strumId)).toEqual([1, 2]);
  });
});

describe('reset', () => {
  it('cancels pending events', () => {
    strum(OPEN_C, 1000);
    agg.reset();
    at(2000);
    expect(events).toEqual([]);
  });
});
