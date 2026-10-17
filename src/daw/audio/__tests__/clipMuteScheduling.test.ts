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
  stopped: [] as string[],
}));

vi.mock('tone', () => {
  const param = { setValueAtTime() {}, linearRampToValueAtTime() {} };
  const node = () => ({ connect() {}, disconnect() {}, gain: param });
  let n = 0;
  const rawContext = {
    currentTime: 0,
    createGain: node,
    createBufferSource: () => {
      const name = `source-${++n}`;
      return {
        ...node(),
        name,
        start: () => h.started.push(name),
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
    getContext: () => ({ rawContext }),
    getTransport: () => ({
      schedule: (job: (time: number) => void) => h.jobs.push(job),
      clear() {},
    }),
  };
});

import { AudioClipScheduler } from '../AudioClipScheduler';
import { MidiScheduler } from '../MidiScheduler';

const played: string[] = [];
const engine = {
  noteOn: (note: number) => played.push(`on ${note}`),
  noteOff: (note: number) => played.push(`off ${note}`),
  cc() {},
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

/** Fires a part's events in order, as the transport would. */
function playPart(index: number): void {
  const part = h.parts[index];
  for (const [, ev] of part.events) part.callback(0, ev);
}

beforeEach(() => {
  h.parts = [];
  h.jobs = [];
  h.started = [];
  h.stopped = [];
  played.length = 0;
});

describe('MidiScheduler', () => {
  function schedule(scheduler: MidiScheduler, clipId: string) {
    scheduler.scheduleSequence(
      {
        ticksPerQuarterNote: 480,
        trackName: 'Keys',
        events: [note(60, 0), note(64, 480)],
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

  it('skips a muted clip’s start when it comes, and starts it once unmuted', () => {
    const scheduler = new AudioClipScheduler();
    scheduler.setMutedClips(new Set(['take']));
    schedule(scheduler, 0);
    h.jobs[0](0);
    expect(h.started).toEqual([]);

    // Unmuted before its start: the scheduled start plays it.
    expect(scheduler.setMutedClips(new Set())).toEqual(['take']);
    schedule(scheduler, 0);
    h.jobs[1](0);
    expect(h.started).toHaveLength(1);
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
