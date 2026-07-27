import { ModRoute, ModSourceRef, ModTarget } from './types';
import { Voice } from './Voice';
import { buildCurve } from './ModCurves';
import { computeGainOffset, getModRange, migrateModRoute } from './modMath';

/**
 * Generalized modulation matrix. Routes any registered source to any
 * voice parameter through a uniform per-connection chain:
 *
 *   sourceNode → [WaveShaper curve?] → scaler(GainNode) → destination
 *   sharedOne(ConstantSource=1) → offsetGain(GainNode) → destination
 *
 * Destinations are AudioParams (summed with the base value) or AudioNode
 * inputs (e.g. the oscillators' detune mod buses). Sources are resolved
 * through an injected resolver so the engine owns the source registry —
 * global sources (LFO/macro/mod-wheel/audio) and per-voice sources
 * (velocity/keytrack/envelopes) look identical from here.
 */

export interface ResolvedSource {
  node: AudioNode;
  /** True when the source's native output is -1..1 (vs 0..1). */
  bipolar: boolean;
}

export type SourceResolver = (
  ref: ModSourceRef,
  voice: Voice,
) => ResolvedSource | null;

/** Per-voice custom WaveShaper curve for a route with `transform` set. */
export type TransformProvider = (
  voice: Voice,
  route: ModRoute,
) => Float32Array | null;

/** Extra destination resolver registered by features (keyed source:param). */
export type TargetResolver = (voice: Voice) => AudioParam | AudioNode | null;

interface ActiveConnection {
  routeId: string;
  voiceId: number;
  sourceNode: AudioNode;
  head: AudioNode; // first node after the source (curve shaper or scaler)
  curveNode: WaveShaperNode | null;
  scaler: GainNode;
  offsetGain: GainNode | null;
}

export class ModulationMatrix {
  private ctx: AudioContext;
  private connections: ActiveConnection[] = [];
  private routes: ModRoute[] = [];
  private sourceResolver: SourceResolver | null = null;
  private transformProviders = new Map<string, TransformProvider>();
  private extraTargets = new Map<string, TargetResolver>();
  private sharedOne: ConstantSourceNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    // Single DC source feeding every connection's offsetGain
    this.sharedOne = ctx.createConstantSource();
    this.sharedOne.offset.value = 1;
    this.sharedOne.start();
  }

  setSourceResolver(resolver: SourceResolver): void {
    this.sourceResolver = resolver;
  }

  registerTransform(id: string, provider: TransformProvider): void {
    this.transformProviders.set(id, provider);
  }

  registerTarget(
    source: string,
    param: string,
    resolver: TargetResolver,
  ): void {
    this.extraTargets.set(`${source}:${param}`, resolver);
  }

  setRoutes(routes: ModRoute[]): void {
    this.disconnectAll();
    this.routes = routes.map(migrateModRoute);
  }

  /**
   * Called when a voice becomes active. Clears any connections left from
   * the voice's previous life first — without this, retriggered voices
   * stack modulation depth and leak nodes.
   */
  connectVoice(voice: Voice): void {
    this.disconnectVoice(voice);
    for (const route of this.routes) {
      if (!route.enabled) continue;
      this.connectRouteToVoice(route, voice);
    }
  }

  /** Called when a voice is freed. Disconnects all routes from this voice. */
  disconnectVoice(voice: Voice): void {
    const remaining: ActiveConnection[] = [];
    for (const conn of this.connections) {
      if (conn.voiceId === voice.id) {
        this.teardownConnection(conn);
      } else {
        remaining.push(conn);
      }
    }
    this.connections = remaining;
  }

  /** Re-applies routes to voices that are already sounding (route edits). */
  reconnectActiveVoices(voices: Voice[]): void {
    for (const voice of voices) {
      this.connectVoice(voice);
    }
  }

  private connectRouteToVoice(route: ModRoute, voice: Voice): void {
    if (!this.sourceResolver) return;

    const resolved = this.sourceResolver(route.source, voice);
    if (!resolved) return;

    const target = this.resolveTarget(voice, route.target);
    if (!target) return;

    // Optional shaping stage: registered transform beats the standard curve.
    // Transform contract: the provider's curve maps the raw source value
    // directly to the target's NATIVE units, so amount/polarity scaling is
    // the provider's job — the scaler runs at unity and no offset is added.
    let curveNode: WaveShaperNode | null = null;
    let usedTransform = false;
    if (route.transform) {
      const provider = this.transformProviders.get(route.transform);
      const curve = provider?.(voice, route);
      if (curve) {
        curveNode = this.ctx.createWaveShaper();
        curveNode.curve = curve as Float32Array<ArrayBuffer>;
        usedTransform = true;
      }
    } else if (route.curve && route.curve !== 'linear') {
      curveNode = this.ctx.createWaveShaper();
      curveNode.curve = buildCurve(route.curve) as Float32Array<ArrayBuffer>;
    }

    const range = getModRange(route.target.param);
    const legacyCutoff =
      route.target.param === 'cutoff' && route.polarity === 'unipolar';
    const { gain, offset } = usedTransform
      ? { gain: 1, offset: 0 }
      : computeGainOffset(
          route.polarity,
          resolved.bipolar,
          route.amount,
          range,
          legacyCutoff,
        );

    const scaler = this.ctx.createGain();
    scaler.gain.value = gain;

    const head: AudioNode = curveNode ?? scaler;
    resolved.node.connect(head);
    if (curveNode) curveNode.connect(scaler);
    ModulationMatrix.connectTo(scaler, target);

    let offsetGain: GainNode | null = null;
    if (offset !== 0) {
      offsetGain = this.ctx.createGain();
      offsetGain.gain.value = offset;
      this.sharedOne.connect(offsetGain);
      ModulationMatrix.connectTo(offsetGain, target);
    }

    this.connections.push({
      routeId: route.id,
      voiceId: voice.id,
      sourceNode: resolved.node,
      head,
      curveNode,
      scaler,
      offsetGain,
    });
  }

  /** AudioNode.connect has separate overloads for node vs param targets;
   *  a single call through a widened signature avoids duplicated branches. */
  private static connectTo(
    node: AudioNode,
    target: AudioParam | AudioNode,
  ): void {
    (node.connect as (destination: AudioNode | AudioParam) => void)(target);
  }

  private resolveTarget(
    voice: Voice,
    target: ModTarget,
  ): AudioParam | AudioNode | null {
    const extra = this.extraTargets.get(`${target.source}:${target.param}`);
    if (extra) return extra(voice);

    const { source, param } = target;
    type ParamResolvers = Partial<
      Record<ModTarget['param'], () => AudioParam | AudioNode>
    >;

    // wtPos/blend are absent: they are not AudioParams (control-rate only)
    const resolvers: Record<ModTarget['source'], ParamResolvers> = {
      osc1: {
        level: () => voice.getOsc1().getGainParam(),
        pan: () => voice.getOsc1().getPanParam(),
        detune: () => voice.getOsc1().getDetuneModInput(),
      },
      osc2: {
        level: () => voice.getOsc2().getGainParam(),
        pan: () => voice.getOsc2().getPanParam(),
        detune: () => voice.getOsc2().getDetuneModInput(),
      },
      sub: {
        level: () => voice.getSub().getGainParam(),
        pan: () => voice.getSub().getPanParam(),
        detune: () => voice.getSub().getDetuneModInput(),
      },
      noise: {
        level: () => voice.getNoise().getGainParam(),
        pan: () => voice.getNoise().getPanParam(),
      },
      flt1: {
        cutoff: () => voice.getFilter1().getDetuneParam(),
        resonance: () => voice.getFilter1().getResonanceParam(),
        level: () => voice.getFilter1().getGainParam(),
      },
      flt2: {
        cutoff: () => voice.getFilter2().getDetuneParam(),
        resonance: () => voice.getFilter2().getResonanceParam(),
        level: () => voice.getFilter2().getGainParam(),
      },
    };

    return resolvers[source]?.[param]?.() ?? null;
  }

  private teardownConnection(conn: ActiveConnection): void {
    try {
      conn.sourceNode.disconnect(conn.head);
    } catch {
      /* already disconnected */
    }
    try {
      conn.curveNode?.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      conn.scaler.disconnect();
    } catch {
      /* already disconnected */
    }
    if (conn.offsetGain) {
      try {
        this.sharedOne.disconnect(conn.offsetGain);
      } catch {
        /* already disconnected */
      }
      try {
        conn.offsetGain.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }

  disconnectAll(): void {
    for (const conn of this.connections) {
      this.teardownConnection(conn);
    }
    this.connections = [];
  }

  /** Number of live connections (test/diagnostic hook). */
  getConnectionCount(): number {
    return this.connections.length;
  }

  dispose(): void {
    this.disconnectAll();
    try {
      this.sharedOne.stop();
      this.sharedOne.disconnect();
    } catch {
      /* already stopped */
    }
  }
}
