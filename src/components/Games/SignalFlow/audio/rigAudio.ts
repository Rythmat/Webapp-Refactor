import { generateImpulseResponse } from '@/daw/audio/graph/effects/impulseResponse';
import { createMeterTap } from '@/daw/audio/meterTap';
import { gearDef } from '../rig/gearDefs';
import {
  dbToGain,
  gainToDb,
  type Cable,
  type CableEdge,
  type GearInstance,
  type GearSource,
  type RigState,
} from '../rig/rigTypes';
import {
  LONG_RUN_HUM_DB,
  cableEdges,
  isLongRun,
  isOn,
  type RigTrace,
} from '../rig/traceSignal';
import { createFx, type Fx } from './fx';

// ── The rig, as sound ──────────────────────────────────────────────────────
// Every piece of gear's route table becomes real nodes, and every cable a real
// connection with a meter on it, so plugging in, flipping a switch or turning a
// knob changes what actually comes out. Nothing here decides what's right: the
// student's ears and the trace do that.

/** Sounds, each at about 0 dBFS RMS when playing. */
export interface SourceOutputs {
  output(name: string): AudioNode | null;
}

/** The ceiling everything meets at the end, in linear gain: −3 dBFS. */
export const OUTPUT_CEILING = 0.708;

const FADE_SECONDS = 0.012;
/** How long to wait, after a fade, before cutting a connection. */
const CUT_MS = 40;
const THUMP_LEVEL = 0.5;
const ROOM_WET = dbToGain(-20);

interface RouteNodes {
  fx?: Fx;
  gain: GainNode;
  clip?: WaveShaperNode;
  noise?: GainNode;
  hum?: GainNode;
}

interface GearNodes {
  junctions: Map<string, GainNode>;
  routes: Map<string, RouteNodes>;
  sources: Map<string, { def: GearSource; gain: GainNode; from: AudioNode }>;
  sinks: Map<string, { gain: GainNode; tap: AnalyserNode }>;
}

interface CableNodes {
  fade: GainNode;
  tap: AnalyserNode;
  /** Everything else this cable made. */
  extra: AudioNode[];
  long: boolean;
  /** Connections from gear into this cable, to cut when it is pulled. */
  cut: (() => void)[];
}

const clipCurve = (() => {
  let curve: Float32Array<ArrayBuffer> | null = null;
  return () => {
    if (curve) return curve;
    // Full scale is at the curve's midpoint, so the waveshaper has headroom to
    // see signals up to twice that, and everything past it flattens.
    const samples = 2049;
    curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = ((i - 1024) / 1024) * 2;
      curve[i] = Math.max(-1, Math.min(1, x)) / 2;
    }
    return curve;
  };
})();

const ceilingCurve = (() => {
  let curve: Float32Array<ArrayBuffer> | null = null;
  return () => {
    if (curve) return curve;
    const samples = 2049;
    curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i - 1024) / 1024;
      curve[i] = Math.tanh(x * 1.1) * OUTPUT_CEILING;
    }
    return curve;
  };
})();

const scratch = new Float32Array(2048);

const rmsDb = (tap: AnalyserNode): number => {
  const buffer = scratch.subarray(0, Math.min(tap.fftSize, scratch.length));
  tap.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (const sample of buffer) sum += sample * sample;
  return gainToDb(Math.sqrt(sum / buffer.length));
};

export class RigAudio {
  private gear = new Map<string, GearNodes>();
  private cables = new Map<string, CableNodes>();
  private cableIdsByKey = new Map<string, string>();
  private readonly listenBus: GainNode;
  private readonly probeBus: GainNode;
  private readonly mixBus: GainNode;
  private readonly room: ConvolverNode;
  private readonly roomWet: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly ceiling: WaveShaperNode;
  private readonly outputTap: AnalyserNode;
  private readonly noise: AudioBufferSourceNode | null;
  private readonly hum: OscillatorNode[] = [];
  private readonly humBus: GainNode;
  private probing: string | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly destination: AudioNode,
    private readonly sources: SourceOutputs,
  ) {
    this.listenBus = ctx.createGain();
    this.probeBus = ctx.createGain();
    this.probeBus.gain.value = 0;
    this.mixBus = ctx.createGain();
    this.listenBus.connect(this.mixBus);
    this.probeBus.connect(this.mixBus);

    // A little room, so gear sounds like it's somewhere. Dry on the probe: that
    // is the cable itself.
    this.room = ctx.createConvolver();
    this.room.buffer = generateImpulseResponse(ctx, 0.6, 'room');
    this.roomWet = ctx.createGain();
    this.roomWet.gain.value = ROOM_WET;
    this.listenBus.connect(this.room);
    this.room.connect(this.roomWet);
    this.roomWet.connect(this.mixBus);

    // The hearing's safety: a limiter, then a curve nothing can pass.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -9;
    this.limiter.ratio.value = 20;
    this.limiter.knee.value = 3;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.ceiling = ctx.createWaveShaper();
    this.ceiling.curve = ceilingCurve();
    this.outputTap = createMeterTap(ctx);
    this.mixBus.connect(this.limiter);
    this.limiter.connect(this.ceiling);
    this.ceiling.connect(this.outputTap);
    this.outputTap.connect(destination);

    this.noise = this.startNoise();
    this.humBus = ctx.createGain();
    this.startHum();
  }

  private startNoise(): AudioBufferSourceNode | null {
    const { ctx } = this;
    if (!ctx.createBufferSource) return null;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Uniform noise is 0.577 RMS; scaled to about 0 dBFS.
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 1.73;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start();
    return source;
  }

  /** Mains hum: 60 Hz and its harmonics, about 0 dBFS RMS. */
  private startHum() {
    const { ctx } = this;
    if (!ctx.createOscillator) return;
    for (const [frequency, level] of [
      [60, 1.1],
      [120, 0.7],
      [180, 0.5],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(this.humBus);
      osc.start();
      this.hum.push(osc);
    }
  }

  // ── Syncing to a rig ─────────────────────────────────────────────────────

  sync(rig: RigState, trace: RigTrace) {
    const wanted = Object.values(rig.gear).filter((g) => g.placed);
    for (const id of [...this.gear.keys()]) {
      if (!rig.gear[id]?.placed) this.removeGear(id);
    }
    for (const gear of wanted) {
      if (!this.gear.has(gear.id)) this.addGear(gear, rig);
      this.updateGear(gear, rig, trace);
    }

    const cables = new Map(rig.cables.map((c) => [this.keyOf(c), c]));
    for (const [key, id] of [...this.cableIdsByKey]) {
      if (!cables.has(key)) {
        this.removeCable(id);
        this.cableIdsByKey.delete(key);
      }
    }
    for (const [key, cable] of cables) {
      if (!this.cableIdsByKey.has(key)) {
        this.addCable(cable, rig);
        this.cableIdsByKey.set(key, cable.id);
      }
    }
  }

  /** A cable is the same cable while its ends are the same. */
  private keyOf(cable: Cable) {
    return `${cable.id}|${cable.a.gear}/${cable.a.port}|${cable.b.gear}/${cable.b.port}`;
  }

  private junction(nodes: GearNodes, endpoint: string): GainNode {
    let junction = nodes.junctions.get(endpoint);
    if (!junction) {
      junction = this.ctx.createGain();
      nodes.junctions.set(endpoint, junction);
    }
    return junction;
  }

  private addGear(gear: GearInstance, rig: RigState) {
    const { ctx } = this;
    const def = gearDef(gear);
    const nodes: GearNodes = {
      junctions: new Map(),
      routes: new Map(),
      sources: new Map(),
      sinks: new Map(),
    };
    this.gear.set(gear.id, nodes);

    for (const route of def.routes(gear, rig.env)) {
      if (route.midi) continue;
      const from = this.junction(nodes, route.from);
      const to = this.junction(nodes, route.to);
      const parts: RouteNodes = { gain: ctx.createGain() };
      if (route.fx) {
        parts.fx = createFx(ctx, route.fx);
        from.connect(parts.fx.input);
        parts.fx.output.connect(parts.gain);
      } else {
        from.connect(parts.gain);
      }
      if (route.clips) {
        // The curve's input range is ±2, so scale in and out around it.
        parts.clip = ctx.createWaveShaper();
        parts.clip.curve = clipCurve();
        const inTrim = ctx.createGain();
        inTrim.gain.value = 0.5;
        const outTrim = ctx.createGain();
        outTrim.gain.value = 2;
        parts.gain.connect(inTrim);
        inTrim.connect(parts.clip);
        parts.clip.connect(outTrim);
        outTrim.connect(to);
      } else {
        parts.gain.connect(to);
      }
      if (route.noiseDb !== undefined && this.noise) {
        parts.noise = ctx.createGain();
        this.noise.connect(parts.noise);
        parts.noise.connect(to);
      }
      if (route.humDb !== undefined || gear.kind === 'di') {
        parts.hum = ctx.createGain();
        parts.hum.gain.value = 0;
        this.humBus.connect(parts.hum);
        parts.hum.connect(to);
      }
      nodes.routes.set(route.id, parts);
    }

    for (const source of def.sources?.(gear) ?? []) {
      if (source.source === 'notes') continue;
      const from = this.sources.output(source.source);
      if (!from) continue;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      from.connect(gain);
      gain.connect(this.junction(nodes, source.at));
      nodes.sources.set(source.at, { def: source, gain, from });
    }

    for (const sink of def.sinks?.(gear) ?? []) {
      const gain = ctx.createGain();
      const tap = createMeterTap(ctx);
      this.junction(nodes, sink.at).connect(gain);
      gain.connect(tap);
      gain.connect(this.listenBus);
      nodes.sinks.set(sink.id, { gain, tap });
    }
  }

  private updateGear(gear: GearInstance, rig: RigState, trace: RigTrace) {
    const nodes = this.gear.get(gear.id);
    if (!nodes) return;
    const def = gearDef(gear);
    const on = isOn(rig, gear);
    const now = this.ctx.currentTime;
    for (const route of def.routes(gear, rig.env)) {
      const parts = nodes.routes.get(route.id);
      if (!parts) continue;
      parts.gain.gain.setTargetAtTime(
        on ? dbToGain(route.gainDb) : 0,
        now,
        FADE_SECONDS,
      );
      if (parts.noise) {
        parts.noise.gain.value =
          on && route.gainDb !== -Infinity && route.noiseDb !== undefined
            ? dbToGain(route.noiseDb)
            : 0;
      }
      if (parts.hum) {
        parts.hum.gain.setTargetAtTime(
          on && route.humDb !== undefined ? dbToGain(route.humDb) : 0,
          now,
          FADE_SECONDS,
        );
      }
      if (parts.fx) {
        if (route.fxParams) parts.fx.setParams(route.fxParams);
        parts.fx.setBypassed(!!route.fxBypassed);
      }
    }
    for (const [at, source] of nodes.sources) {
      const live = trace.sourcesLive[`${gear.id}/${at}`];
      source.gain.gain.setTargetAtTime(
        live ? dbToGain(source.def.levelDb) : 0,
        now,
        FADE_SECONDS,
      );
    }
    const listen = rig.env.listen ?? 'foh';
    for (const sink of def.sinks?.(gear) ?? []) {
      nodes.sinks
        .get(sink.id)
        ?.gain.gain.setTargetAtTime(
          on ? dbToGain(sink[listen]) : 0,
          now,
          FADE_SECONDS,
        );
    }
  }

  private removeGear(id: string) {
    const nodes = this.gear.get(id);
    if (!nodes) return;
    for (const parts of nodes.routes.values()) {
      parts.fx?.dispose();
      parts.gain.disconnect();
      parts.clip?.disconnect();
      if (parts.noise) {
        this.noise?.disconnect(parts.noise);
        parts.noise.disconnect();
      }
      if (parts.hum) {
        this.humBus.disconnect(parts.hum);
        parts.hum.disconnect();
      }
    }
    for (const source of nodes.sources.values()) {
      source.from.disconnect(source.gain);
      source.gain.disconnect();
    }
    for (const sink of nodes.sinks.values()) {
      sink.gain.disconnect();
      sink.tap.disconnect();
    }
    for (const junction of nodes.junctions.values()) junction.disconnect();
    this.gear.delete(id);
  }

  private addCable(cable: Cable, rig: RigState) {
    const { ctx } = this;
    const fade = ctx.createGain();
    fade.gain.value = 0;
    const tap = createMeterTap(ctx);
    fade.connect(tap);
    const parts: CableNodes = {
      fade,
      tap,
      extra: [],
      long: isLongRun(rig.env, cable),
      cut: [],
    };
    const edges = cableEdges(rig, cable).filter((edge) => !edge.midi);
    // A USB cable's tap hears both directions at once; this keeps its meter
    // reading what's on the cable, rather than twice it.
    const duplex = edges.length === 2 && !edges[0].from.includes('#');
    fade.gain.setTargetAtTime(duplex ? 0.5 : 1, ctx.currentTime, FADE_SECONDS);
    for (const edge of edges) this.connectEdge(edge, cable, parts);
    this.cables.set(cable.id, parts);
  }

  private connectEdge(edge: CableEdge, cable: Cable, parts: CableNodes) {
    const fromGear = this.gear.get(edge.fromGear);
    const toGear = this.gear.get(edge.toGear);
    if (!fromGear || !toGear) return;
    const from = this.junction(fromGear, edge.from);
    const to = this.junction(toGear, edge.to);
    const { ctx } = this;
    const lane = ctx.createGain();
    lane.gain.value = 0;
    lane.gain.setTargetAtTime(1, ctx.currentTime, FADE_SECONDS);
    parts.extra.push(lane);
    from.connect(lane);
    parts.cut.push(() => from.disconnect(lane));

    let end: AudioNode = lane;
    if (parts.long && (cable.kind === 'ts' || cable.kind === 'trs')) {
      end = this.unbalancedRun(lane, parts);
    } else if (parts.long) {
      end = this.balancedRun(lane, parts);
    }
    end.connect(parts.fade);
    end.connect(to);
    parts.cut.push(() => {
      end.disconnect();
    });
  }

  /** Over distance: the highs roll off, and the wire picks up the mains. */
  private unbalancedRun(input: AudioNode, parts: CableNodes): AudioNode {
    const { ctx } = this;
    const capacitance = ctx.createBiquadFilter();
    capacitance.type = 'lowpass';
    capacitance.frequency.value = 3200;
    input.connect(capacitance);
    const pickup = ctx.createGain();
    pickup.gain.value = dbToGain(LONG_RUN_HUM_DB);
    this.humBus.connect(pickup);
    pickup.connect(capacitance);
    parts.extra.push(capacitance, pickup);
    parts.cut.push(() => this.humBus.disconnect(pickup));
    return capacitance;
  }

  /** Balanced for real: the same hum lands on both wires, one of them carrying
   *  the signal upside down. Flipping that wire back at the far end and adding
   *  the two doubles the signal and cancels the hum. */
  private balancedRun(input: AudioNode, parts: CableNodes): AudioNode {
    const { ctx } = this;
    const hot = ctx.createGain();
    const coldFlip = ctx.createGain();
    coldFlip.gain.value = -1;
    const cold = ctx.createGain();
    const receiverFlip = ctx.createGain();
    receiverFlip.gain.value = -1;
    const receiver = ctx.createGain();
    receiver.gain.value = 0.5;
    const pickup = ctx.createGain();
    pickup.gain.value = dbToGain(LONG_RUN_HUM_DB);

    input.connect(hot);
    input.connect(coldFlip);
    coldFlip.connect(cold);
    this.humBus.connect(pickup);
    pickup.connect(hot);
    pickup.connect(cold);
    hot.connect(receiver);
    cold.connect(receiverFlip);
    receiverFlip.connect(receiver);

    parts.extra.push(hot, coldFlip, cold, receiverFlip, receiver, pickup);
    parts.cut.push(() => this.humBus.disconnect(pickup));
    return receiver;
  }

  private removeCable(id: string) {
    const parts = this.cables.get(id);
    if (!parts) return;
    this.cables.delete(id);
    if (this.probing === id) this.setProbe(null);
    const { ctx } = this;
    for (const node of parts.extra) {
      if (node instanceof Object && 'gain' in node) {
        (node as GainNode).gain.setTargetAtTime?.(
          0,
          ctx.currentTime,
          FADE_SECONDS / 2,
        );
      }
    }
    const finish = () => {
      for (const cut of parts.cut) cut();
      for (const node of parts.extra) node.disconnect();
      parts.fade.disconnect();
      parts.tap.disconnect();
    };
    // Faded out first, so pulling a plug doesn't click.
    if (typeof setTimeout === 'function' && !this.disposed) {
      setTimeout(finish, CUT_MS);
    } else {
      finish();
    }
  }

  // ── Listening ────────────────────────────────────────────────────────────

  /** Headphones on one cable, or null to hear the rig. */
  setProbe(cable: string | null) {
    const now = this.ctx.currentTime;
    if (this.probing && this.probing !== cable) {
      const was = this.cables.get(this.probing);
      try {
        was?.tap.disconnect(this.probeBus);
      } catch {
        // Already gone with its cable.
      }
    }
    const next = cable ? this.cables.get(cable) : undefined;
    if (next && this.probing !== cable) next.tap.connect(this.probeBus);
    this.probing = next ? (cable as string) : null;
    this.probeBus.gain.setTargetAtTime(next ? 1 : 0, now, FADE_SECONDS);
    this.listenBus.gain.setTargetAtTime(next ? 0 : 1, now, FADE_SECONDS);
  }

  /** A cable's level right now, in dBFS RMS. */
  cableLevel(cable: string): number {
    const parts = this.cables.get(cable);
    return parts ? rmsDb(parts.tap) : -Infinity;
  }

  cableTap(cable: string): AnalyserNode | null {
    return this.cables.get(cable)?.tap ?? null;
  }

  /** A speaker's level right now. */
  sinkLevel(gear: string): number {
    const sinks = this.gear.get(gear)?.sinks;
    if (!sinks) return -Infinity;
    let loudest = -Infinity;
    for (const sink of sinks.values()) {
      loudest = Math.max(loudest, rmsDb(sink.tap));
    }
    return loudest;
  }

  /** The highest sample leaving for the speakers, this moment. */
  outputPeak(): number {
    const buffer = scratch.subarray(
      0,
      Math.min(this.outputTap.fftSize, scratch.length),
    );
    this.outputTap.getFloatTimeDomainData(buffer);
    let peak = 0;
    for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
    return peak;
  }

  /** A power-on transient, through whatever is live. */
  thump() {
    const { ctx } = this;
    if (!ctx.createOscillator) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime?.(28, now + 0.16);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(THUMP_LEVEL, now);
    gain.gain.setTargetAtTime(0, now + 0.02, 0.05);
    osc.connect(gain);
    gain.connect(this.mixBus);
    osc.start(now);
    osc.stop(now + 0.3);
    osc.onended = () => gain.disconnect();
  }

  /** The small mechanical sound of a plug going home. */
  plugClick() {
    const { ctx, noise } = this;
    if (!noise) return;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(dbToGain(-34), now);
    gain.gain.setTargetAtTime(0, now, 0.006);
    noise.connect(gain);
    gain.connect(this.mixBus);
    setTimeout(() => {
      noise.disconnect(gain);
      gain.disconnect();
    }, 80);
  }

  private disposed = false;

  /** Everything disconnected. The context and the channel aren't ours to close. */
  dispose() {
    this.disposed = true;
    for (const key of [...this.cableIdsByKey.keys()]) {
      const id = this.cableIdsByKey.get(key);
      if (id) this.removeCable(id);
    }
    this.cableIdsByKey.clear();
    for (const id of [...this.gear.keys()]) this.removeGear(id);
    this.noise?.stop();
    this.noise?.disconnect();
    for (const osc of this.hum) {
      osc.stop();
      osc.disconnect();
    }
    this.humBus.disconnect();
    this.listenBus.disconnect();
    this.probeBus.disconnect();
    this.room.disconnect();
    this.roomWet.disconnect();
    this.mixBus.disconnect();
    this.limiter.disconnect();
    this.ceiling.disconnect();
    this.outputTap.disconnect();
  }
}
