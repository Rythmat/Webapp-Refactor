import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioClip } from '@/daw/store/tracksSlice';
import type { TrackEngine } from '../TrackEngine';

// ── Muted clips on the schedulers (milestone 2.12) ─────────────────────────
// A muted clip stays scheduled and starts nothing, so a mute or an unmute
// during playback counts at once, as a track's mute does: a clip just muted
// lets go of what it has sounding, and only notes a clip started are ended
// by it. Run:
// npx vitest run src/daw/audio/__tests__/clipMuteScheduling.test.ts

const h = vi.hoisted(() => ({
  parts: [] as Array<{
    callback: (time: number, ev: Record<string, unknown>) => void;
    events: Array<[string, Record<string, unknown>]>;
  }>,
  jobs: [] as Array<(time: number) => void>,
  started: [] as string[],
  /** When each source was started, in the order they started. */
  startTimes: [] as number[],
  stopped: [] as string[],
  /** Tone.now(): where the transport is scheduling, a look-ahead early. */
  now: 0,
  /** The audio clock (the context's currentTime). */
  clock: 0,
}));

vi.mock('tone', () => {
  const param = { setValueAtTime() {}, linearRampToValueAtTime() {} };
  const node = () => ({ connect() {}, disconnect() {}, gain: param });
  let n = 0;
  const rawContext = {
    get currentTime() {
      return h.clock;
    },
    createGain: node,
    createBufferSource: () => {
      const name = `source-${++n}`;
      return {
        ...node(),
        name,
        start: (time: number) => {
          h.started.push(name);
          h.startTimes.push(time);
        },
        stop: () => h.stopped.push(name),
        onended: null,
      };
    },
  };
  class Part {
    constructor(
      callback: (time: number, ev: Record<string, unknown>) => void,
      events: Array<[string, Record<string, unknown>]>,
    ) {
      h.parts.push({ callback, events });
    }
    start() {}
    stop() {}
    dispose() {}
  }
  return {
    Part,
    now: () => h.now,
    getContext: () => ({
      rawContext,
      get currentTime() {
        return h.clock;
      },
    }),
    getTransport: () => ({
      schedule: (job: (time: number) => void) => h.jobs.push(job),
      clear() {},
    }),
  };
});

import { AudioClipScheduler } from '../AudioClipScheduler';
import { MidiScheduler } from '../MidiScheduler';

const played: string[] = [];
/** Each note end and controller change, with the time it was sent for. */
const timed: Array<[string, number]> = [];
const engine = {
  noteOn: (note: number) => played.push(`on ${note}`),
  noteOff: (note: number, time: number) => {
    played.push(`off ${note}`);
    timed.push([`off ${note}`, time]);
  },
  cc: (controller: number, value: number, time: number) => {
    played.push(`cc ${controller}=${value}`);
    timed.push([`cc ${controller}=${value}`, time]);
  },
  getNativeInputNode: () => ({}),
  getInputNode: () => ({
    context: {
      createConstantSource: () => ({
        offset: { value: 0 },
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      }),
    },
  }),
} as unknown as TrackEngine;

const note = (n: number, startTick: number) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks: 240,
  channel: 0,
});

const cc = (controller: number, value: number, tick: number) => ({
  tick,
  controller,
  value,
  channel: 0,
});

/** Fires a part's events in order, as the transport would. */
function playPart(index: number): void {
  const part = h.parts[index];
  for (const [, ev] of part.events) part.callback(0, ev);
}

beforeEach(() => {
  h.parts = [];
  h.jobs = [];
  h.started = [];
  h.startTimes = [];
  h.stopped = [];
  h.now = 0;
  h.clock = 0;
  played.length = 0;
  timed.length = 0;
});

describe('MidiScheduler', () => {
  function schedule(
    scheduler: MidiScheduler,
    clipId: string,
    ccEvents?: ReturnType<typeof cc>[],
  ) {
    scheduler.scheduleSequence(
      {
        ticksPerQuarterNote: 480,
        trackName: 'Keys',
        events: [note(60, 0), note(64, 480)],
        ccEvents,
      },
      engine,
      0,
      clipId,
    );
  }

  it('plays a clip that isn’t muted', () => {
    const scheduler = new MidiScheduler();
    schedule(scheduler, 'a');
    playPart(0);
    expect(played).toEqual(['on 60', 'off 60', 'on 64', 'off 64']);
  });

  it('starts nothing for a muted clip, and ends nothing for it', () => {
    const scheduler = new MidiScheduler();
    scheduler.setMutedClips(new Set(['a']));
    schedule(scheduler, 'a');
    playPart(0);
    expect(played).toEqual([]);
  });

  it('lets go of a clip’s sounding notes when it is muted mid-note', () => {
    const scheduler = new MidiScheduler();
    schedule(scheduler, 'a');
    const { callback, events } = h.parts[0];
    callback(0, events[0][1]); // note 60 on
    scheduler.setMutedClips(new Set(['a']));
    expect(played).toEqual(['on 60', 'off 60']);
    // Its own end, later, cuts nothing; its next note doesn't start.
    for (const [, ev] of events.slice(1)) callback(0, ev);
    expect(played).toEqual(['on 60', 'off 60']);
  });

  it('lets go where the transport is scheduling, after any attack it has booked', () => {
    const scheduler = new MidiScheduler();
    schedule(scheduler, 'a');
    const { callback, events } = h.parts[0];
    callback(4.9, events[0][1]); // note 60 booked to start at 4.9
    h.clock = 4.8;
    h.now = 4.9;
    scheduler.setMutedClips(new Set(['a']));
    // At Tone.now(), not the audio clock: an end before the booked start
    // would leave the note ringing.
    expect(timed).toEqual([['off 60', 4.9]]);
  });

  it('plays an unmuted clip from its next note', () => {
    const scheduler = new MidiScheduler();
    scheduler.setMutedClips(new Set(['a']));
    schedule(scheduler, 'a');
    const { callback, events } = h.parts[0];
    callback(0, events[0][1]);
    scheduler.setMutedClips(new Set());
    for (const [, ev] of events.slice(1)) callback(0, ev);
    expect(played).toEqual(['on 64', 'off 64']);
  });

  it('sends a muted clip’s controllers nowhere, its pedal included', () => {
    const scheduler = new MidiScheduler();
    scheduler.setMutedClips(new Set(['a']));
    schedule(scheduler, 'a', [cc(64, 127, 0), cc(1, 90, 0), cc(64, 0, 900)]);
    playPart(0);
    expect(played).toEqual([]);
  });

  it('lifts a clip’s sustain pedal when it is muted with the pedal down', () => {
    const scheduler = new MidiScheduler();
    schedule(scheduler, 'a', [cc(64, 127, 0)]);
    const { callback, events } = h.parts[0];
    const pedalDown = events.find(([, ev]) => ev.type === 'cc')![1];
    callback(0, pedalDown);
    h.now = 2.5;
    scheduler.setMutedClips(new Set(['a']));
    expect(timed).toEqual([
      ['cc 64=127', 0],
      ['cc 64=0', 2.5],
    ]);
  });

  it('leaves the pedal alone when the clip lifted it, or never pressed it', () => {
    const scheduler = new MidiScheduler();
    schedule(scheduler, 'a', [cc(64, 127, 0), cc(64, 0, 200), cc(1, 90, 0)]);
    schedule(scheduler, 'b', [cc(1, 90, 0)]);
    for (const [, ev] of h.parts[0].events) {
      if (ev.type === 'cc') h.parts[0].callback(0, ev);
    }
    for (const [, ev] of h.parts[1].events) {
      if (ev.type === 'cc') h.parts[1].callback(0, ev);
    }
    played.length = 0;
    scheduler.setMutedClips(new Set(['a', 'b']));
    expect(played).toEqual([]);
  });
});

describe('AudioClipScheduler', () => {
  const buffer = { duration: 10, numberOfChannels: 2 } as AudioBuffer;
  const clip: AudioClip = {
    id: 'take',
    startTick: 960,
    duration: 1920,
    fadeInTicks: 0,
    fadeOutTicks: 0,
  };
  const schedule = (scheduler: AudioClipScheduler, fromTick: number) =>
    scheduler.scheduleClip({
      buffer,
      clip,
      trackEngine: engine,
      fromTick,
      bpm: 120,
      clipId: clip.id,
    });

  it('skips a muted clip’s start when it comes', () => {
    const scheduler = new AudioClipScheduler();
    scheduler.setMutedClips(new Set(['take']));
    schedule(scheduler, 0);
    h.jobs[0](1);
    expect(h.started).toEqual([]);
  });

  it('makes a skipped start on its beat when the clip is unmuted before it is due', () => {
    const scheduler = new AudioClipScheduler();
    scheduler.setMutedClips(new Set(['take']));
    schedule(scheduler, 0);
    // The transport books the start a look-ahead before it is due.
    h.clock = 0.9;
    h.jobs[0](1);
    expect(h.started).toEqual([]);

    h.clock = 0.95;
    expect(scheduler.setMutedClips(new Set())).toEqual([]);
    expect(h.started).toHaveLength(1);
    expect(h.startTimes).toEqual([1]);
  });

  it('hands a clip unmuted after its start back to the caller to start', () => {
    const scheduler = new AudioClipScheduler();
    scheduler.setMutedClips(new Set(['take']));
    schedule(scheduler, 0);
    h.clock = 0.9;
    h.jobs[0](1);

    h.clock = 1.4;
    expect(scheduler.setMutedClips(new Set())).toEqual(['take']);
    // The skipped start is not made late: the caller starts the clip under
    // the playhead.
    expect(h.started).toEqual([]);
  });

  it('forgets skipped starts when playback stops', () => {
    const scheduler = new AudioClipScheduler();
    scheduler.setMutedClips(new Set(['take']));
    schedule(scheduler, 0);
    h.clock = 0.9;
    h.jobs[0](1);
    scheduler.cancelAll();

    h.clock = 0.95;
    scheduler.setMutedClips(new Set());
    expect(h.started).toEqual([]);
  });

  it('never starts a muted clip under the playhead', () => {
    const scheduler = new AudioClipScheduler();
    scheduler.setMutedClips(new Set(['take']));
    schedule(scheduler, 1200);
    expect(h.started).toEqual([]);
  });

  it('stops what a clip has sounding when it is muted', () => {
    const scheduler = new AudioClipScheduler();
    schedule(scheduler, 1200);
    expect(h.started).toHaveLength(1);
    scheduler.setMutedClips(new Set(['take']));
    expect(h.stopped).toEqual(h.started);
  });
});
