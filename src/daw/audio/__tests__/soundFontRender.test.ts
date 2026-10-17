import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_FRAMES,
  planSoundFontTrack,
  renderSoundFontTracks,
  type RenderedSegment,
  type SoundFontRenderWindow,
  type SoundFontTrackInput,
} from '../soundFontRender';

// ── SoundFont tracks in a bounce ───────────────────────────────────────────
// The live GM synth is a worklet bound to the live context, out of an
// export's reach, so SoundFont tracks bounced silent. A bounce now renders
// each one's MIDI on spessasynth_core's synth first. The synth here is a
// stand-in: every held note adds 1 to both channels, and a note let go rings
// on for RELEASE frames at 0.5, so the audio shows where each event landed.

const RELEASE = 10;

const core = vi.hoisted(() => ({
  synths: [] as unknown[],
  parses: 0,
  bank: { name: 'GeneralUser GS' },
}));

vi.mock('spessasynth_core', () => ({
  SoundBankLoader: {
    fromArrayBuffer: () => {
      core.parses++;
      return core.bank;
    },
  },
  SpessaSynthProcessor: class {
    calls: unknown[][] = [];
    options: unknown;
    sampleRate: number;
    processorInitialized = Promise.resolve(true);
    voiceCount = 0;
    private held = new Set<number>();
    private releasing = new Map<number, number>();
    soundBankManager = {
      addSoundBank: (...args: unknown[]) => this.calls.push(['bank', ...args]),
    };
    constructor(sampleRate: number, options: unknown) {
      this.sampleRate = sampleRate;
      this.options = options;
      core.synths.push(this);
    }
    programChange(...args: unknown[]) {
      this.calls.push(['program', ...args]);
    }
    controllerChange(...args: unknown[]) {
      this.calls.push(['cc', ...args]);
    }
    noteOn(channel: number, note: number, velocity: number) {
      this.calls.push(['on', channel, note, velocity]);
      this.releasing.delete(note);
      this.held.add(note);
    }
    noteOff(channel: number, note: number) {
      this.calls.push(['off', channel, note]);
      if (this.held.delete(note)) this.releasing.set(note, RELEASE);
    }
    processSplit(
      outputs: Float32Array[][],
      _fxL: Float32Array,
      _fxR: Float32Array,
      start: number,
      count: number,
    ) {
      if (count > 128) throw new Error('more than the worklet quantum');
      const [left, right] = outputs[0];
      for (let i = 0; i < count; i++) {
        let level = this.held.size;
        for (const remaining of this.releasing.values()) {
          if (i < remaining) level += 0.5;
        }
        left[start + i] += level;
        right[start + i] += level;
      }
      this.voiceCount = this.held.size + this.releasing.size;
      for (const [note, remaining] of this.releasing) {
        if (remaining <= count) this.releasing.delete(note);
        else this.releasing.set(note, remaining - count);
      }
    }
  },
}));

const fetchMock = vi.fn();

type Synth = { calls: unknown[][]; options: unknown };
const synthsMade = () => core.synths as Synth[];

/** 120 bpm at 960 Hz: a tick is exactly one frame (60 / 120 / 480 * 960). */
const win = (over: Partial<SoundFontRenderWindow> = {}) => ({
  startTick: 0,
  bpm: 120,
  sampleRate: 960,
  lengthFrames: 4000,
  ...over,
});

const note = (
  n: number,
  startTick: number,
  durationTicks: number,
  velocity = 100,
) => ({ note: n, velocity, startTick, durationTicks, channel: 0 });

const track = (
  events: ReturnType<typeof note>[],
  extra: Partial<SoundFontTrackInput> & {
    clipStart?: number;
    ccEvents?: Array<{ tick: number; controller: number; value: number }>;
  } = {},
): SoundFontTrackInput => ({
  id: extra.id ?? 'sf',
  gmProgram: extra.gmProgram,
  midiClips: [
    {
      startTick: extra.clipStart ?? 0,
      events,
      ccEvents: extra.ccEvents?.map((c) => ({ ...c, channel: 0 })),
    },
  ],
});

/** A segment's left channel as plain numbers. */
const leftOf = (segment: RenderedSegment) =>
  segment.parts.flatMap(([left]) => [...left]);

beforeEach(() => {
  core.synths.length = 0;
  core.parses = 0;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('planSoundFontTrack', () => {
  it('times notes and CCs by the tempo, from the clip and window starts', () => {
    const plan = planSoundFontTrack(
      track([note(60, 100, 200)], {
        clipStart: 1000,
        gmProgram: 48,
        ccEvents: [{ tick: 150, controller: 64, value: 127 }],
      }),
      win({ startTick: 500 }),
    );
    expect(plan).toEqual({
      program: 48,
      chase: [],
      fromFrame: 0,
      events: [
        { frame: 600, kind: 'on', note: 60, velocity: 100 },
        { frame: 650, kind: 'cc', controller: 64, value: 127 },
        { frame: 800, kind: 'off', note: 60 },
      ],
    });
  });

  it('lets a note go before one is struck on the same frame, and CCs after', () => {
    const plan = planSoundFontTrack(
      track([note(60, 0, 100), note(60, 100, 100)], {
        ccEvents: [{ tick: 100, controller: 7, value: 90 }],
      }),
      win(),
    )!;
    expect(plan.events.filter((e) => e.frame === 100)).toEqual([
      { frame: 100, kind: 'off', note: 60 },
      { frame: 100, kind: 'on', note: 60, velocity: 100 },
      { frame: 100, kind: 'cc', controller: 7, value: 90 },
    ]);
  });

  it('keeps values to 7 bits and drops a controller the synth refuses', () => {
    const plan = planSoundFontTrack(
      track([note(130, 0, 0)], {
        ccEvents: [
          { tick: 0, controller: 200, value: 1 },
          { tick: 0, controller: 1, value: 130 },
        ],
      }),
      win(),
    )!;
    expect(plan.events).toEqual([
      { frame: 0, kind: 'on', note: 2, velocity: 100 },
      { frame: 0, kind: 'cc', controller: 1, value: 2 },
      // A zero-length note still sounds: its note-off comes a frame later.
      { frame: 1, kind: 'off', note: 2 },
    ]);
  });

  it('starts early for a note that is still held when the window opens', () => {
    const plan = planSoundFontTrack(
      track([note(48, 0, 3000), note(60, 0, 100)], {
        ccEvents: [{ tick: 0, controller: 7, value: 80 }],
      }),
      win({ startTick: 1000 }),
    )!;
    expect(plan.fromFrame).toBe(-1000);
    expect(plan.events).toContainEqual({
      frame: -1000,
      kind: 'on',
      note: 48,
      velocity: 100,
    });
    expect(plan.events).toContainEqual({ frame: 2000, kind: 'off', note: 48 });
  });

  it("leaves out notes that are over well before the window, but chases the CCs they're under", () => {
    // 4 s of release lead at 960 Hz: 3840 frames.
    const plan = planSoundFontTrack(
      track([note(60, 0, 100), note(62, 5000, 100)], {
        ccEvents: [{ tick: 50, controller: 11, value: 70 }],
      }),
      win({ startTick: 5000 }),
    )!;
    expect(plan.fromFrame).toBe(0);
    expect(plan.chase).toEqual([{ controller: 11, value: 70 }]);
    expect(plan.events.map((e) => e.kind)).toEqual(['on', 'off']);
  });

  it('keeps a note the sustain pedal still holds', () => {
    const plan = planSoundFontTrack(
      track([note(60, 0, 100)], {
        ccEvents: [
          { tick: 0, controller: 64, value: 127 },
          { tick: 9000, controller: 64, value: 0 },
        ],
      }),
      win({ startTick: 5000 }),
    )!;
    expect(plan.fromFrame).toBe(-5000);
    // The pedal went down with the note, so it's applied in order, not chased.
    expect(plan.chase).toEqual([]);
  });

  it('is null when nothing of the track sounds in the window', () => {
    expect(planSoundFontTrack(track([]), win())).toBeNull();
    expect(planSoundFontTrack(track([note(60, 5000, 100)]), win())).toBeNull();
  });
});

describe('renderSoundFontTracks', () => {
  it('renders each track from the live sound bank, on its GM program', async () => {
    const audio = await renderSoundFontTracks(
      [
        track([note(60, 0, 100)], { id: 'a', gmProgram: 48 }),
        track([note(62, 0, 100)], { id: 'b' }),
      ],
      win(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/daw-assets/GeneralUser_GS.sf2',
      expect.anything(),
    );
    // One parse, shared by every track's synth.
    expect(core.parses).toBe(1);
    const [a, b] = synthsMade();
    expect(a.options).toMatchObject({
      effectsEnabled: false,
      maxBufferSize: 128,
    });
    expect(a.calls.slice(0, 2)).toEqual([
      ['bank', core.bank, 'gm'],
      ['program', 0, 48],
    ]);
    expect(b.calls[1]).toEqual(['program', 0, 0]);
    expect([...audio.keys()]).toEqual(['a', 'b']);
  });

  it('puts each note on its frame and keeps its release', async () => {
    const audio = await renderSoundFontTracks(
      [track([note(60, 300, 200)])],
      win(),
    );
    const [segment] = audio.get('sf')!;
    expect(segment.startFrame).toBe(300);
    const left = leftOf(segment);
    expect(left.slice(0, 200).every((v) => v === 1)).toBe(true);
    expect(left.slice(200, 200 + RELEASE).every((v) => v === 0.5)).toBe(true);
    // Rendering stops once the voice is gone (a block on, to see it go).
    expect(segment.length).toBeLessThanOrEqual(200 + 2 * 128);
    expect(left.slice(200 + RELEASE).every((v) => v === 0)).toBe(true);
  });

  it('rings a held note in from the start of the window', async () => {
    const audio = await renderSoundFontTracks(
      [track([note(48, 0, 3000)])],
      win({ startTick: 1000, lengthFrames: 3000 }),
    );
    const [segment] = audio.get('sf')!;
    expect(segment.startFrame).toBe(0);
    const left = leftOf(segment);
    expect(left.slice(0, 2000).every((v) => v === 1)).toBe(true);
    expect(left[2000]).toBe(0.5);
  });

  it('applies the CCs from before the render before any note', async () => {
    await renderSoundFontTracks(
      [
        track([note(62, 5000, 100)], {
          ccEvents: [{ tick: 50, controller: 11, value: 70 }],
        }),
      ],
      win({ startTick: 5000 }),
    );
    const [synth] = synthsMade();
    expect(synth.calls.slice(2, 4)).toEqual([
      ['cc', 0, 11, 70],
      ['on', 0, 62, 100],
    ]);
  });

  it('leaves silence out: a long gap splits the audio into segments', async () => {
    const gapStart = 2 * CHUNK_FRAMES;
    const audio = await renderSoundFontTracks(
      [track([note(60, 0, 100), note(64, gapStart, 100)])],
      win({ lengthFrames: gapStart + 1000 }),
    );
    const segments = audio.get('sf')!;
    expect(segments.map((s) => s.startFrame)).toEqual([0, gapStart]);
    for (const s of segments) {
      expect(s.length).toBeLessThan(1000);
      expect(
        leftOf(s)
          .slice(0, 100)
          .every((v) => v === 1),
      ).toBe(true);
    }
  });

  it('stops at the end of the bounce', async () => {
    const audio = await renderSoundFontTracks(
      [track([note(60, 0, 10_000)])],
      win({ lengthFrames: 1500 }),
    );
    const [segment] = audio.get('sf')!;
    expect(segment.startFrame + segment.length).toBe(1500);
  });

  it('reports its progress from 0 to 1', async () => {
    const progress: number[] = [];
    await renderSoundFontTracks(
      [track([note(60, 0, 100)], { id: 'a' }), track([], { id: 'b' })],
      win(),
      (pct) => progress.push(pct),
    );
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
    expect([...progress].sort((x, y) => x - y)).toEqual(progress);
  });

  it("doesn't load the sound bank when no track has anything to play", async () => {
    const audio = await renderSoundFontTracks([track([])], win());
    expect(audio.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails when the sound bank cannot be fetched', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(
      renderSoundFontTracks([track([note(60, 0, 100)])], win()),
    ).rejects.toThrow('SoundFont fetch failed: 404');
  });
});
