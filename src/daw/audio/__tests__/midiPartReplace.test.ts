import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackEngine } from '../TrackEngine';

// ── Replacing and removing a clip's part during playback (milestone 1.11) ──
// An edit rebuilds the clip's part: a note it still holds where the
// transport is keeps sounding until the new part ends it, any other ends at
// the edit's time. A deleted clip ends its notes and lifts its pedal; a loop
// seam or a seek forgets every part's notes. Run:
// npx vitest run src/daw/audio/__tests__/midiPartReplace.test.ts

const h = vi.hoisted(() => ({
  parts: [] as Array<{
    callback: (time: number, ev: Record<string, unknown>) => void;
    events: Array<[string, Record<string, unknown>]>;
    stopped: boolean;
    disposed: boolean;
  }>,
}));

vi.mock('tone', () => {
  class Part {
    entry: (typeof h.parts)[number];
    constructor(
      callback: (time: number, ev: Record<string, unknown>) => void,
      events: Array<[string, Record<string, unknown>]>,
    ) {
      this.entry = { callback, events, stopped: false, disposed: false };
      h.parts.push(this.entry);
    }
    start() {}
    stop() {
      this.entry.stopped = true;
    }
    dispose() {
      this.entry.disposed = true;
    }
  }
  return { Part, now: () => 0 };
});

import { MidiScheduler } from '../MidiScheduler';

function fakeEngine(name: string) {
  const log: string[] = [];
  const engine = {
    noteOn: (n: number, _v: number, time: number) =>
      log.push(`${name} on ${n} @${time}`),
    noteOff: (n: number, time: number) => log.push(`${name} off ${n} @${time}`),
    cc: (c: number, v: number, time: number) =>
      log.push(`${name} cc ${c}=${v} @${time}`),
  } as unknown as TrackEngine;
  return { engine, log };
}

const note = (n: number, startTick: number, durationTicks: number) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks,
  channel: 0,
});

const seq = (
  events: ReturnType<typeof note>[],
  ccEvents: Array<{ tick: number; controller: number; value: number }> = [],
) => ({
  ticksPerQuarterNote: 480,
  trackName: 't',
  events,
  ccEvents: ccEvents.map((c) => ({ ...c, channel: 0 })),
});

/** Fire the event of part `index` at `tick` of `type` for `note`. */
function fire(
  index: number,
  type: 'on' | 'off' | 'cc',
  tick: number,
  time: number,
  noteOrController?: number,
): void {
  const part = h.parts[index];
  const found = part.events.find(
    ([t, ev]) =>
      t === `${tick}i` &&
      ev.type === type &&
      (noteOrController === undefined ||
        (type === 'cc'
          ? ev.controller === noteOrController
          : ev.note === noteOrController)),
  );
  if (!found) throw new Error(`no ${type} at ${tick} in part ${index}`);
  part.callback(time, found[1]);
}

beforeEach(() => {
  h.parts = [];
});

describe('replaceClip', () => {
  it('keeps a note the new clip still holds, and its new end ends it once', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(seq([note(60, 0, 960)]), engine, 0, 'c1', 'v1');
    fire(0, 'on', 0, 1, 60);

    // The note now lasts longer; the transport is at tick 480.
    midi.replaceClip('c1', seq([note(60, 0, 1920)]), engine, 0, 'v2', 480, 2);
    expect(h.parts[0].stopped && h.parts[0].disposed).toBe(true);
    expect(log).toEqual(['A on 60 @1']);
    expect(midi.sourceOf('c1')).toBe('v2');
    expect(midi.scheduledClipIds()).toEqual(['c1']);

    fire(1, 'off', 1920, 4, 60);
    expect(log).toEqual(['A on 60 @1', 'A off 60 @4']);
    // A second off for it ends nothing more.
    fire(1, 'off', 1920, 5, 60);
    expect(log).toHaveLength(2);
  });

  it('ends at the edit time a sounding note the new clip no longer holds', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(
      seq([note(60, 0, 960), note(64, 0, 960)]),
      engine,
      0,
      'c1',
    );
    fire(0, 'on', 0, 1, 60);
    fire(0, 'on', 0, 1, 64);

    // 64 removed; 60 kept.
    midi.replaceClip('c1', seq([note(60, 0, 960)]), engine, 0, 'v2', 480, 2);
    expect(log).toEqual(['A on 60 @1', 'A on 64 @1', 'A off 64 @2']);
  });

  it('ends a note the new clip has moved past the transport', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(seq([note(60, 0, 960)]), engine, 0, 'c1');
    fire(0, 'on', 0, 1, 60);
    // Same pitch, now starting after the transport (tick 480).
    midi.replaceClip('c1', seq([note(60, 720, 240)]), engine, 0, 'v2', 480, 2);
    expect(log).toEqual(['A on 60 @1', 'A off 60 @2']);
  });

  it('lifts the old part’s pedal at the edit time', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(
      seq([note(60, 0, 960)], [{ tick: 0, controller: 64, value: 127 }]),
      engine,
      0,
      'c1',
    );
    fire(0, 'cc', 0, 1, 64);
    midi.replaceClip('c1', seq([]), engine, 0, 'v2', 480, 2);
    expect(log).toEqual(['A cc 64=127 @1', 'A cc 64=0 @2']);
  });

  it('adds a part for a clip that had none', () => {
    const { engine } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.replaceClip('new', seq([note(60, 0, 480)]), engine, 0, 'v1', 0, 1);
    expect(midi.scheduledClipIds()).toEqual(['new']);
    expect(midi.sourceOf('new')).toBe('v1');
  });
});

describe('removeClip', () => {
  it('ends its sounding notes and its pedal at the time given', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(
      seq(
        [note(60, 0, 960), note(67, 0, 960)],
        [{ tick: 0, controller: 64, value: 100 }],
      ),
      engine,
      0,
      'c1',
    );
    midi.scheduleSequence(seq([note(72, 0, 960)]), engine, 0, 'c2');
    fire(0, 'on', 0, 1, 60);
    fire(0, 'on', 0, 1, 67);
    fire(0, 'cc', 0, 1, 64);
    log.length = 0;

    midi.removeClip('c1', 3);
    expect(log).toEqual(['A off 60 @3', 'A off 67 @3', 'A cc 64=0 @3']);
    expect(h.parts[0].stopped && h.parts[0].disposed).toBe(true);
    expect(midi.scheduledClipIds()).toEqual(['c2']);
    expect(midi.sourceOf('c1')).toBeUndefined();
  });

  it('does nothing for a clip that isn’t scheduled', () => {
    const midi = new MidiScheduler();
    expect(() => midi.removeClip('nope', 1)).not.toThrow();
  });
});

describe('releaseAll', () => {
  it('forgets sounding notes and lifts a down pedal at the time given', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(
      seq([note(60, 0, 960)], [{ tick: 0, controller: 64, value: 127 }]),
      engine,
      0,
      'c1',
    );
    fire(0, 'on', 0, 1, 60);
    fire(0, 'cc', 0, 1, 64);
    log.length = 0;

    midi.releaseAll(5);
    expect(log).toEqual(['A cc 64=0 @5']);

    // The off for the note started before the seam does nothing.
    fire(0, 'off', 960, 6, 60);
    expect(log).toEqual(['A cc 64=0 @5']);

    // The pedal is up now: a second release sends nothing.
    midi.releaseAll(7);
    expect(log).toHaveLength(1);
  });
});

describe('EngineRef', () => {
  it('looks a function ref up when each event fires', () => {
    const a = fakeEngine('A');
    const b = fakeEngine('B');
    let current: TrackEngine | undefined = a.engine;
    const midi = new MidiScheduler();
    midi.scheduleSequence(
      seq([note(60, 0, 480), note(62, 480, 480)]),
      () => current,
      0,
      'c1',
    );
    fire(0, 'on', 0, 1, 60);
    current = b.engine;
    fire(0, 'off', 480, 2, 60);
    fire(0, 'on', 480, 2, 62);
    current = undefined;
    // No engine (the track mid-rebuild): nothing throws.
    expect(() => fire(0, 'off', 960, 3, 62)).not.toThrow();

    expect(a.log).toEqual(['A on 60 @1']);
    expect(b.log).toEqual(['B off 60 @2', 'B on 62 @2']);
  });
});

describe('after a seek or a seam', () => {
  it('drops the old position’s events the transport still fires before the jump', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    midi.scheduleSequence(
      seq([note(60, 0, 480), note(62, 480, 480)]),
      engine,
      0,
      'c1',
    );
    // A seek at time 10: Tone moves the transport on its next tick, so a
    // note of the old position booked for 9.98 can still come after it.
    midi.releaseAll(10);
    fire(0, 'on', 0, 9.98, 60);
    fire(0, 'on', 480, 10, 62);
    expect(log).toEqual(['A on 62 @10']);
  });

  it('keeps the pedal down across an edit that still holds it', () => {
    const { engine, log } = fakeEngine('A');
    const midi = new MidiScheduler();
    const pedal = [{ tick: 0, controller: 64, value: 127 }];
    midi.scheduleSequence(seq([note(60, 0, 960)], pedal), engine, 0, 'c1');
    fire(0, 'cc', 0, 1, 64);
    midi.replaceClip(
      'c1',
      seq([note(60, 0, 960), note(64, 960, 480)], pedal),
      engine,
      0,
      'v2',
      480,
      2,
    );
    expect(log).toEqual(['A cc 64=127 @1']);
    // Removing it later lifts the pedal the new part carried.
    midi.removeClip('c1', 3);
    expect(log).toContain('A cc 64=0 @3');
  });
});
