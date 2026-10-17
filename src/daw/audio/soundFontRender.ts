// ── soundFontRender ───────────────────────────────────────────────────────
// SoundFont/GM tracks in a bounce. Live, every SoundFont track plays on one
// SpessaSynth AudioWorklet bound to the live AudioContext (SoundFontAdapter),
// which an export's OfflineAudioContext can't reach. So before the offline
// mixdown, each audible SoundFont track's MIDI is rendered here on
// spessasynth_core's pure-JS synth (the engine that runs inside that
// worklet), from the same sound bank with the same settings, at the export
// rate. renderProject plays the result into the track's input, where the
// live synth's channel output arrives, so the track's FX, fader, pan, sends,
// automation and mute/solo apply as they do in playback.
//
// Each track renders on a synth of its own, on one channel, the way the live
// synth gives each track a channel of its own (never 9, the GM drum channel):
// the track's GM program, its note velocities and its CCs (the sustain pedal
// among them), timed by the project's tempo as the transport times them.
// Notes that start before the render window and still sound in it (held, or
// let go a moment before it and still releasing) are rendered from their
// start and cut at the window, so they ring in rather than vanish; the CCs
// before that are applied first, so the pedal and controllers stand as they
// would at that point in playback. After the last note the synth runs on
// until its voices have released, or the bounce's tail ends.
//
// Rendering is time-sliced on the main thread so the export dialog keeps
// painting its progress. Stretches where the track is silent are skipped
// rather than rendered, and kept out of the result: a track's audio comes
// back as the segments that sound, in chunks of a fixed size.

import type { MIDIController, SpessaSynthProcessor } from 'spessasynth_core';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { SOUNDFONT_URL } from '@/daw/instruments/SoundFontAdapter';

const PPQ = 480;
/** The live worklet's render quantum; the synth renders at most this per call. */
const BLOCK = 128;
/** The track's one channel on its own synth (live: any but 9, the drums). */
const CHANNEL = 0;
/** A stretch of a track's audio is kept in chunks of this many frames. */
export const CHUNK_FRAMES = 1 << 16;
/** How long before the window a note let go can still ring into it. */
const RELEASE_LEAD_SECONDS = 4;
/** Main-thread time a render takes before it lets the page paint. */
const SLICE_MS = 12;
const SUSTAIN_PEDAL = 64;
const SOUND_BANK_TIMEOUT_MS = 30_000;

/** The parts of a Studio track a SoundFont render reads. */
export interface SoundFontTrackInput {
  id: string;
  gmProgram?: number;
  midiClips: ReadonlyArray<Pick<MidiClip, 'startTick' | 'events' | 'ccEvents'>>;
}

/** The bounce's timeline: tick `startTick` is frame 0, and it ends at
 *  `lengthFrames` (the window plus its tail). */
export interface SoundFontRenderWindow {
  startTick: number;
  bpm: number;
  sampleRate: number;
  lengthFrames: number;
}

/** A stretch of a track's audio that sounds: `length` frames from frame
 *  `startFrame` of the bounce, as consecutive stereo parts. */
export interface RenderedSegment {
  startFrame: number;
  length: number;
  parts: Array<[Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>]>;
}

export type SoundFontEvent =
  | { frame: number; kind: 'off'; note: number }
  | { frame: number; kind: 'on'; note: number; velocity: number }
  | { frame: number; kind: 'cc'; controller: number; value: number };

/** What one track's synth plays, in frames of the bounce. */
export interface SoundFontTrackPlan {
  program: number;
  /** CCs from before the render starts, applied first, in order. */
  chase: Array<{ controller: number; value: number }>;
  /** Where the synth starts rendering (≤ 0: earlier frames are cut). */
  fromFrame: number;
  /** In playing order. */
  events: SoundFontEvent[];
}

// At one frame: notes before CCs, as the transport runs them (MidiScheduler
// queues a clip's notes ahead of its CCs), and a note let go before one
// struck, so a repeated note isn't cut by its predecessor's note-off.
const ORDER: Record<SoundFontEvent['kind'], number> = { off: 0, on: 1, cc: 2 };

/**
 * Plan one track's render: its notes and CCs as synth events at bounce
 * frames, the CC state to start from, and where to start. Null when nothing
 * of the track sounds in the window.
 */
export function planSoundFontTrack(
  track: SoundFontTrackInput,
  win: SoundFontRenderWindow,
): SoundFontTrackPlan | null {
  const secPerTick = 60 / win.bpm / PPQ;
  const frameOf = (tick: number) =>
    Math.round((tick - win.startTick) * secPerTick * win.sampleRate);
  const leadTick = win.startTick - RELEASE_LEAD_SECONDS / secPerTick;

  // Notes and CCs as the live adapter hands them to its synth
  // (spessasynth_lib keeps note, velocity and controller values to 7 bits,
  // and refuses a controller outside 0–127).
  const notes: Array<{ on: number; off: number; note: number; vel: number }> =
    [];
  const ccs: Array<{ tick: number; controller: number; value: number }> = [];
  for (const clip of track.midiClips) {
    const base = clip.startTick ?? 0;
    for (const e of clip.events) {
      const on = base + e.startTick;
      notes.push({
        on,
        off: on + e.durationTicks,
        note: e.note % 128,
        vel: e.velocity % 128,
      });
    }
    for (const cc of clip.ccEvents ?? []) {
      if (!(cc.controller >= 0 && cc.controller <= 127)) continue;
      ccs.push({
        tick: base + cc.tick,
        controller: Math.floor(cc.controller),
        value: Math.floor(cc.value) % 128,
      });
    }
  }
  ccs.sort((a, b) => a.tick - b.tick);
  const pedal = ccs.filter((c) => c.controller === SUSTAIN_PEDAL);

  // Every note struck in the bounce, and each one from before the window
  // that is still held or releasing when it starts.
  const heard = notes.filter(
    (n) =>
      frameOf(n.on) < win.lengthFrames &&
      (n.on >= win.startTick || heldUntil(pedal, n.off) > leadTick),
  );
  if (heard.length === 0) return null;

  let fromFrame = 0;
  const events: SoundFontEvent[] = [];
  for (const n of heard) {
    const on = frameOf(n.on);
    fromFrame = Math.min(fromFrame, on);
    events.push({ frame: on, kind: 'on', note: n.note, velocity: n.vel });
    // A zero-length note still sounds its attack, as it does live.
    const off = Math.max(frameOf(n.off), on + 1);
    if (off < win.lengthFrames) {
      events.push({ frame: off, kind: 'off', note: n.note });
    }
  }
  const chase: SoundFontTrackPlan['chase'] = [];
  for (const c of ccs) {
    const frame = frameOf(c.tick);
    if (frame < fromFrame) {
      chase.push({ controller: c.controller, value: c.value });
    } else if (frame < win.lengthFrames) {
      events.push({
        frame,
        kind: 'cc',
        controller: c.controller,
        value: c.value,
      });
    }
  }
  events.sort((a, b) => a.frame - b.frame || ORDER[a.kind] - ORDER[b.kind]);
  return { program: track.gmProgram ?? 0, chase, fromFrame, events };
}

/**
 * The tick a note let go at `offTick` stops being held: then, or with the
 * sustain pedal down, at the pedal's next release (never, if it isn't).
 * A pedal move on the note-off's own tick comes after it (notes first).
 */
function heldUntil(
  pedal: ReadonlyArray<{ tick: number; value: number }>,
  offTick: number,
): number {
  let down = false;
  let i = 0;
  for (; i < pedal.length && pedal[i].tick < offTick; i++) {
    down = pedal[i].value >= 64;
  }
  if (!down) return offTick;
  for (; i < pedal.length; i++) {
    if (pedal[i].value < 64) return pedal[i].tick;
  }
  return Infinity;
}

/**
 * Render each audible SoundFont track's MIDI to audio for the bounce:
 * its sounding segments by track id (a track with nothing to play in the
 * window is absent). `onProgress` gets 0–1 as the render goes.
 */
export async function renderSoundFontTracks(
  tracks: readonly SoundFontTrackInput[],
  win: SoundFontRenderWindow,
  onProgress?: (pct: number) => void,
): Promise<Map<string, RenderedSegment[]>> {
  const audio = new Map<string, RenderedSegment[]>();
  const plans = tracks.flatMap((track) => {
    const plan = planSoundFontTrack(track, win);
    return plan ? [{ id: track.id, plan }] : [];
  });
  if (plans.length === 0) return audio;

  onProgress?.(0);
  const [{ SpessaSynthProcessor, SoundBankLoader }, bytes] = await Promise.all([
    import('spessasynth_core'),
    fetchSoundBank(),
  ]);
  // One parse, shared: each synth only reads the bank.
  const bank = SoundBankLoader.fromArrayBuffer(bytes);
  const clock = new RenderClock(
    plans.reduce((sum, { plan }) => sum + win.lengthFrames - plan.fromFrame, 0),
    onProgress,
  );

  for (const { id, plan } of plans) {
    // As the live synth runs (SoundFontAdapter): GS mode, the bank as 'gm',
    // the synth-wide reverb/chorus off (the track's own FX do that), and the
    // worklet's 128-frame render size.
    const synth = new SpessaSynthProcessor(win.sampleRate, {
      effectsEnabled: false,
      eventsEnabled: false,
      maxBufferSize: BLOCK,
    });
    await synth.processorInitialized;
    synth.soundBankManager.addSoundBank(bank, 'gm');
    synth.programChange(CHANNEL, plan.program);
    for (const { controller, value } of plan.chase) {
      synth.controllerChange(CHANNEL, controller as MIDIController, value);
    }
    const segments = await renderPlan(synth, plan, win.lengthFrames, clock);
    if (segments.length > 0) audio.set(id, segments);
  }
  onProgress?.(1);
  return audio;
}

/** The sound bank's bytes: the file live playback loads. */
async function fetchSoundBank(): Promise<ArrayBuffer> {
  const response = await fetch(SOUNDFONT_URL, {
    signal: AbortSignal.timeout(SOUND_BANK_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`SoundFont fetch failed: ${response.status}`);
  }
  return response.arrayBuffer();
}

/** Run one track's plan on its synth; the segments of audio it made. */
async function renderPlan(
  synth: SpessaSynthProcessor,
  plan: SoundFontTrackPlan,
  lengthFrames: number,
  clock: RenderClock,
): Promise<RenderedSegment[]> {
  const out = new ChunkedAudio(CHUNK_FRAMES);
  // Before frame 0 the synth renders into scratch that is thrown away.
  const scratch: [Float32Array, Float32Array] = [
    new Float32Array(BLOCK),
    new Float32Array(BLOCK),
  ];
  // Effects are off, but the synth still takes buffers for them.
  const effects = new Float32Array(BLOCK);
  const outputs: Float32Array[][] = [scratch];
  const { events } = plan;
  let next = 0;
  let frame = plan.fromFrame;
  let sounding = false;

  while (frame < lengthFrames) {
    for (; next < events.length && events[next].frame <= frame; next++) {
      playEvent(synth, events[next]);
      sounding = true;
    }
    if (!sounding) {
      // Silent until the next event (or for good): skip, don't render.
      const to = next < events.length ? events[next].frame : lengthFrames;
      clock.advance(to - frame);
      frame = to;
      continue;
    }
    // Up to the next event, so it lands on its own frame.
    let count = Math.min(BLOCK, lengthFrames - frame);
    if (next < events.length)
      count = Math.min(count, events[next].frame - frame);
    if (frame < 0) {
      count = Math.min(count, -frame);
      scratch[0].fill(0);
      scratch[1].fill(0);
      outputs[0] = scratch;
      synth.processSplit(outputs, effects, effects, 0, count);
    } else {
      const slot = out.slot(frame);
      count = Math.min(count, slot.room);
      outputs[0] = slot.pair;
      synth.processSplit(outputs, effects, effects, slot.offset, count);
      out.wrote(frame, count);
    }
    frame += count;
    // Voices end once released and faded, so none left means silence.
    sounding = synth.voiceCount > 0;
    clock.advance(count);
    if (clock.due()) await clock.pause();
  }
  return out.segments();
}

function playEvent(synth: SpessaSynthProcessor, e: SoundFontEvent): void {
  if (e.kind === 'on') synth.noteOn(CHANNEL, e.note, e.velocity);
  else if (e.kind === 'off') synth.noteOff(CHANNEL, e.note);
  else synth.controllerChange(CHANNEL, e.controller as MIDIController, e.value);
}

/**
 * Stereo audio kept in fixed-size chunks as it is rendered: only the chunks
 * something was written to exist, so silent stretches cost nothing.
 */
class ChunkedAudio {
  private chunks = new Map<
    number,
    {
      pair: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
      start: number;
      end: number;
    }
  >();

  constructor(private readonly size: number) {}

  /** Where a block from `frame` goes, and how much of it fits. */
  slot(frame: number): {
    pair: [Float32Array, Float32Array];
    offset: number;
    room: number;
  } {
    const index = Math.floor(frame / this.size);
    const offset = frame - index * this.size;
    let chunk = this.chunks.get(index);
    if (!chunk) {
      chunk = {
        pair: [new Float32Array(this.size), new Float32Array(this.size)],
        start: offset,
        end: offset,
      };
      this.chunks.set(index, chunk);
    }
    return { pair: chunk.pair, offset, room: this.size - offset };
  }

  wrote(frame: number, count: number): void {
    const index = Math.floor(frame / this.size);
    const chunk = this.chunks.get(index)!;
    const offset = frame - index * this.size;
    chunk.start = Math.min(chunk.start, offset);
    chunk.end = Math.max(chunk.end, offset + count);
  }

  /** Runs of consecutive chunks, trimmed to what was written in them. */
  segments(): RenderedSegment[] {
    const indices = [...this.chunks.keys()].sort((a, b) => a - b);
    const segments: RenderedSegment[] = [];
    let run: number[] = [];
    const close = () => {
      if (run.length === 0) return;
      const first = this.chunks.get(run[0])!;
      const parts = run.map((index, i) => {
        const chunk = this.chunks.get(index)!;
        const from = i === 0 ? chunk.start : 0;
        const to = i === run.length - 1 ? chunk.end : this.size;
        return chunk.pair.map((ch) => ch.subarray(from, to)) as [
          Float32Array<ArrayBuffer>,
          Float32Array<ArrayBuffer>,
        ];
      });
      segments.push({
        startFrame: run[0] * this.size + first.start,
        length: parts.reduce((sum, [left]) => sum + left.length, 0),
        parts,
      });
      run = [];
    };
    for (const index of indices) {
      if (run.length > 0 && index !== run[run.length - 1] + 1) close();
      run.push(index);
    }
    close();
    return segments;
  }
}

/** Progress over the whole render, and when to let the page paint. */
class RenderClock {
  private done = 0;
  private sliceStart = performance.now();

  constructor(
    private readonly total: number,
    private readonly onProgress?: (pct: number) => void,
  ) {}

  advance(frames: number): void {
    this.done += frames;
  }

  due(): boolean {
    return performance.now() - this.sliceStart >= SLICE_MS;
  }

  async pause(): Promise<void> {
    this.onProgress?.(Math.min(1, this.done / this.total));
    await nextTask();
    this.sliceStart = performance.now();
  }
}

/** Resolve on a fresh task. A message, not a timer: a hidden tab throttles
 *  timers to one a second (or less), which would stall an export left to
 *  run in the background. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof MessageChannel === 'undefined') {
      setTimeout(resolve, 0);
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
