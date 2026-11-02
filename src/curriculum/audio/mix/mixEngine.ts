import {
  dbToGain,
  effectiveOn,
  fullScaleCurve,
  MONITOR_TRIM_DB,
  safetyCurve,
} from './mixMath';
import type { StemId } from './stems';

// ── A small mixing desk ────────────────────────────────────────────────────
// Stems looping in lock, each with its own input gain and converter, filters,
// fader, mute, solo and pan, into a bus, a master and a master converter:
//
//   source → input gain → in-tap → clip → filters → fader → pan → out-tap ┐
//                                                                          │
//   bus ← ─────────────────────────────────────────────────────────────────┘
//   bus → bus filters → master → pre-tap → clip → session-tap
//       → monitor trim → safety ceiling → output (a bus channel)
//
// What's on the meters is the session's scale, before the monitor trim. Nothing
// here adds colour: labAudio's compressor adds makeup gain to everything below
// its threshold, which would falsify a lesson about level. The safety ceiling is
// straight up to its knee, which the trim keeps the signal under.

export interface FilterSpec {
  type: 'highpass' | 'lowpass' | 'peaking';
  hz: number;
  q?: number;
  gainDb?: number;
}

export interface ChannelSettings {
  /** Before the channel's converter: a preamp's gain, or a stem's trim. */
  inputDb?: number;
  faderDb?: number;
  mute?: boolean;
  solo?: boolean;
  pan?: number;
  filters?: readonly FilterSpec[];
}

export interface BusSettings {
  masterDb?: number;
  filters?: readonly FilterSpec[];
  /** Extra turned down for the ears only: it never moves a meter. */
  monitorDb?: number;
}

/** Where a meter can read. */
export type MeterPoint =
  | { stem: StemId; at: 'input' | 'output' }
  | { bus: 'pre' | 'session' };

const RAMP = 0.012;
const FADE = 0.015;
/** Leaves time to schedule every source at the same instant. */
const START_LEAD = 0.04;

/**
 * A place a meter reads. Each side has its own analyser: one alone mixes stereo
 * down first, which reads a wide stem or a panned one lower than it really is.
 */
interface Tap {
  through: GainNode;
  splitter: ChannelSplitterNode;
  sides: readonly [AnalyserNode, AnalyserNode];
}

interface Channel {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  input: GainNode;
  inTap: Tap;
  clip: WaveShaperNode;
  filters: BiquadFilterNode[];
  filterEnd: GainNode;
  fader: GainNode;
  pan: StereoPannerNode;
  outTap: Tap;
  settings: ChannelSettings;
}

const SPECTRUM_FFT = 8192;
const METER_FFT = 2048;

export class MixEngine {
  private readonly ctx: BaseAudioContext;
  private readonly channels = new Map<StemId, Channel>();
  private readonly bus: GainNode;
  private busFilters: BiquadFilterNode[] = [];
  private readonly busEnd: GainNode;
  private readonly master: GainNode;
  private readonly preTap: Tap;
  private readonly masterClip: WaveShaperNode;
  private readonly sessionTap: Tap;
  private readonly spectrumTap: AnalyserNode;
  private readonly fade: GainNode;
  private readonly monitor: GainNode;
  private readonly ceiling: WaveShaperNode;
  private readonly scratch = new Float32Array(METER_FFT);
  private readonly spectrumData: Float32Array<ArrayBuffer>;
  private readonly duration: number;
  private startedAt: number | null = null;
  private closed = false;

  constructor({
    context,
    output,
    buffers,
  }: {
    context: BaseAudioContext;
    output: AudioNode;
    buffers: ReadonlyMap<StemId, AudioBuffer>;
  }) {
    this.ctx = context;
    this.bus = context.createGain();
    this.busEnd = context.createGain();
    this.master = context.createGain();
    this.preTap = this.tap();
    this.masterClip = this.fullScale();
    this.sessionTap = this.tap();
    this.spectrumTap = context.createAnalyser();
    this.spectrumTap.fftSize = SPECTRUM_FFT;
    this.spectrumTap.smoothingTimeConstant = 0.7;
    this.spectrumData = new Float32Array(this.spectrumTap.frequencyBinCount);
    this.fade = context.createGain();
    this.fade.gain.value = 0;
    this.monitor = context.createGain();
    this.monitor.gain.value = dbToGain(MONITOR_TRIM_DB);
    this.ceiling = context.createWaveShaper();
    this.ceiling.curve = safetyCurve();

    this.bus.connect(this.busEnd);
    this.busEnd.connect(this.master);
    this.master.connect(this.preTap.through);
    this.preTap.through.connect(this.masterClip);
    this.masterClip.connect(this.sessionTap.through);
    this.sessionTap.through.connect(this.fade);
    this.masterClip.connect(this.spectrumTap);
    this.fade.connect(this.monitor);
    this.monitor.connect(this.ceiling);
    this.ceiling.connect(output);

    let duration = 0;
    for (const [id, buffer] of buffers) {
      duration = Math.max(duration, buffer.duration);
      const input = context.createGain();
      const inTap = this.tap();
      const clip = this.fullScale();
      const filterEnd = context.createGain();
      const fader = context.createGain();
      // As stereo, or a panner takes 3 dB off a mono stem even when centred, and
      // every meter would read that much under what the lesson says.
      fader.channelCount = 2;
      fader.channelCountMode = 'explicit';
      fader.channelInterpretation = 'speakers';
      const pan = context.createStereoPanner();
      const outTap = this.tap();
      input.connect(inTap.through);
      inTap.through.connect(clip);
      clip.connect(filterEnd);
      filterEnd.connect(fader);
      fader.connect(pan);
      pan.connect(outTap.through);
      outTap.through.connect(this.bus);
      this.channels.set(id, {
        buffer,
        source: null,
        input,
        inTap,
        clip,
        filters: [],
        filterEnd,
        fader,
        pan,
        outTap,
        settings: {},
      });
    }
    this.duration = duration || 1;
  }

  private tap(): Tap {
    const through = this.ctx.createGain();
    through.channelCount = 2;
    through.channelCountMode = 'explicit';
    through.channelInterpretation = 'speakers';
    const splitter = this.ctx.createChannelSplitter(2);
    const sides = [0, 1].map((side) => {
      const node = this.ctx.createAnalyser();
      node.fftSize = METER_FFT;
      splitter.connect(node, side);
      return node;
    }) as unknown as readonly [AnalyserNode, AnalyserNode];
    through.connect(splitter);
    return { through, splitter, sides };
  }

  private release(tap: Tap): void {
    tap.through.disconnect();
    tap.splitter.disconnect();
  }

  private fullScale(): WaveShaperNode {
    const node = this.ctx.createWaveShaper();
    node.curve = fullScaleCurve();
    return node;
  }

  get playing(): boolean {
    return this.startedAt != null;
  }

  /** Start every stem at one instant, on the same sample. */
  start(): void {
    if (this.closed || this.startedAt != null) return;
    const at = this.ctx.currentTime + START_LEAD;
    for (const channel of this.channels.values()) {
      const source = this.ctx.createBufferSource();
      source.buffer = channel.buffer;
      source.loop = true;
      source.connect(channel.input);
      source.start(at);
      channel.source = source;
    }
    this.startedAt = at;
    this.fade.gain.setTargetAtTime(1, at, FADE);
  }

  stop(): void {
    if (this.startedAt == null) return;
    const now = this.ctx.currentTime;
    this.fade.gain.cancelScheduledValues(now);
    this.fade.gain.setTargetAtTime(0, now, FADE);
    const stopAt = now + FADE * 5;
    for (const channel of this.channels.values()) {
      const { source } = channel;
      if (!source) continue;
      source.stop(stopAt);
      source.onended = () => source.disconnect();
      channel.source = null;
    }
    this.startedAt = null;
  }

  /** Seconds into the loop, for a playhead. */
  position(): number | null {
    if (this.startedAt == null) return null;
    const elapsed = this.ctx.currentTime - this.startedAt;
    return ((elapsed % this.duration) + this.duration) % this.duration;
  }

  get loopSeconds(): number {
    return this.duration;
  }

  /** Set every channel at once: mute and solo depend on one another. */
  setChannels(
    settings: Readonly<Partial<Record<StemId, ChannelSettings>>>,
  ): void {
    if (this.closed) return;
    const now = this.ctx.currentTime;
    for (const [id, channel] of this.channels) {
      const next = settings[id];
      if (next) channel.settings = next;
    }
    const states = Object.fromEntries(
      [...this.channels].map(([id, c]) => [id, c.settings]),
    );
    for (const [id, channel] of this.channels) {
      const s = channel.settings;
      channel.input.gain.setTargetAtTime(dbToGain(s.inputDb ?? 0), now, RAMP);
      const on = effectiveOn(id, states);
      channel.fader.gain.setTargetAtTime(
        on ? dbToGain(s.faderDb ?? 0) : 0,
        now,
        RAMP,
      );
      channel.pan.pan.setTargetAtTime(s.pan ?? 0, now, RAMP);
      channel.filters = this.applyFilters(
        channel.filters,
        s.filters ?? [],
        channel.clip,
        channel.filterEnd,
      );
    }
  }

  setBus(settings: BusSettings): void {
    if (this.closed) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(
      dbToGain(settings.masterDb ?? 0),
      now,
      RAMP,
    );
    this.monitor.gain.setTargetAtTime(
      dbToGain(MONITOR_TRIM_DB + (settings.monitorDb ?? 0)),
      now,
      RAMP,
    );
    this.busFilters = this.applyFilters(
      this.busFilters,
      settings.filters ?? [],
      this.bus,
      this.busEnd,
    );
  }

  /** Move filters that are already there, or rewire if the set has changed. */
  private applyFilters(
    current: BiquadFilterNode[],
    specs: readonly FilterSpec[],
    from: AudioNode,
    to: AudioNode,
  ): BiquadFilterNode[] {
    const now = this.ctx.currentTime;
    const same =
      current.length === specs.length &&
      current.every((f, i) => f.type === specs[i].type);
    const filters = same
      ? current
      : specs.map((spec) => {
          const node = this.ctx.createBiquadFilter();
          node.type = spec.type;
          return node;
        });
    if (!same) {
      from.disconnect(current[0] ?? to);
      for (const node of current) node.disconnect();
      let tail = from;
      for (const node of filters) {
        tail.connect(node);
        tail = node;
      }
      tail.connect(to);
    }
    specs.forEach((spec, i) => {
      filters[i].frequency.setTargetAtTime(spec.hz, now, RAMP);
      filters[i].Q.setTargetAtTime(spec.q ?? Math.SQRT1_2, now, RAMP);
      filters[i].gain.setTargetAtTime(spec.gainDb ?? 0, now, RAMP);
    });
    return filters;
  }

  private tapAt(point: MeterPoint): Tap | undefined {
    if ('bus' in point) {
      return point.bus === 'pre' ? this.preTap : this.sessionTap;
    }
    const channel = this.channels.get(point.stem);
    return point.at === 'input' ? channel?.inTap : channel?.outTap;
  }

  /** The highest level at a point over the last few milliseconds. Before a
   *  clip stage, this can read above 1: that's how a meter knows it's over. */
  peak(point: MeterPoint): number {
    const tap = this.tapAt(point);
    if (!tap || this.startedAt == null) return 0;
    let peak = 0;
    for (const side of tap.sides) {
      side.getFloatTimeDomainData(this.scratch);
      for (const v of this.scratch) peak = Math.max(peak, Math.abs(v));
    }
    return peak;
  }

  /** What's really on the mix bus now, in decibels per band. */
  spectrum(): { data: Float32Array<ArrayBuffer>; sampleRate: number } | null {
    if (this.startedAt == null) return null;
    this.spectrumTap.getFloatFrequencyData(this.spectrumData);
    return { data: this.spectrumData, sampleRate: this.ctx.sampleRate };
  }

  /** Silence everything and leave the graph. The context carries on. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const channel of this.channels.values()) {
      if (channel.source) {
        channel.source.stop();
        channel.source.disconnect();
      }
      for (const node of [
        channel.input,
        channel.clip,
        ...channel.filters,
        channel.filterEnd,
        channel.fader,
        channel.pan,
      ]) {
        node.disconnect();
      }
      this.release(channel.inTap);
      this.release(channel.outTap);
    }
    for (const node of [
      this.bus,
      ...this.busFilters,
      this.busEnd,
      this.master,
      this.masterClip,
      this.spectrumTap,
      this.fade,
      this.monitor,
      this.ceiling,
    ]) {
      node.disconnect();
    }
    this.release(this.preTap);
    this.release(this.sessionTap);
    this.startedAt = null;
  }
}
