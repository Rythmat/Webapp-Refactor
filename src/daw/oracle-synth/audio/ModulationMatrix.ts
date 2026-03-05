import { ModRoute, ModTarget } from './types';
import { LFO } from './LFO';
import { Voice } from './Voice';

/**
 * Routes LFO outputs to voice AudioParams via GainNode scalers.
 * For each active mod route and each active voice, creates:
 *   LFO output → GainNode (depth scaler) → target AudioParam
 *
 * LFO output is unipolar (0..1). The GainNode scales it by
 * depthMax * modRange so the parameter sweeps from its base value
 * up to base + depthMax * modRange.
 */

interface ActiveConnection {
  routeId: string;
  voiceId: number;
  scaler: GainNode;
  offsetSource?: ConstantSourceNode;
  offsetGain?: GainNode;
}

type ParamResolverMap = Partial<Record<ModTarget['param'], () => AudioParam>>;

export class ModulationMatrix {
  private ctx: AudioContext;
  private lfos: LFO[];
  private connections: ActiveConnection[] = [];
  private routes: ModRoute[] = [];

  constructor(ctx: AudioContext, lfos: LFO[]) {
    this.ctx = ctx;
    this.lfos = lfos;
  }

  setRoutes(routes: ModRoute[]): void {
    // Tear down old connections and rebuild
    this.disconnectAll();
    this.routes = routes;
  }

  /**
   * Called when a voice becomes active. Connects all enabled routes
   * to the voice's target AudioParams.
   */
  connectVoice(voice: Voice): void {
    for (const route of this.routes) {
      if (!route.enabled) continue;
      this.connectRouteToVoice(route, voice);
    }
  }

  /**
   * Called when a voice is freed. Disconnects all routes from this voice.
   */
  disconnectVoice(voice: Voice): void {
    const toRemove: ActiveConnection[] = [];
    for (const conn of this.connections) {
      if (conn.voiceId === voice.id) {
        conn.scaler.disconnect();
        if (conn.offsetSource) {
          conn.offsetSource.stop();
          conn.offsetSource.disconnect();
        }
        if (conn.offsetGain) {
          conn.offsetGain.disconnect();
        }
        toRemove.push(conn);
      }
    }
    this.connections = this.connections.filter((c) => !toRemove.includes(c));
  }

  private connectRouteToVoice(route: ModRoute, voice: Voice): void {
    const lfo = this.lfos[route.lfoIndex];
    if (!lfo) return;

    const targetParam = this.resolveTarget(voice, route.target);
    if (!targetParam) return;

    const modRange = this.getModRange(route.target.param);
    const maxOffset = route.depthMax * modRange;

    // Create scaler GainNode: LFO (0..1) → scaler (gain=maxOffset) → target
    const scaler = this.ctx.createGain();
    scaler.gain.value = maxOffset;
    lfo.getOutputNode().connect(scaler);
    scaler.connect(targetParam);

    let offsetSource: ConstantSourceNode | undefined;
    let offsetGain: GainNode | undefined;

    // For cutoff: sweep DOWN from the base cutoff position.
    // Add a constant -maxOffset so that:
    //   LFO=1 → detune = -maxOffset + maxOffset = 0  (at cutoff)
    //   LFO=0 → detune = -maxOffset + 0 = -maxOffset (below cutoff)
    if (route.target.param === 'cutoff') {
      offsetSource = this.ctx.createConstantSource();
      offsetSource.offset.value = 1;
      offsetGain = this.ctx.createGain();
      offsetGain.gain.value = -maxOffset;
      offsetSource.connect(offsetGain);
      offsetGain.connect(targetParam);
      offsetSource.start();
    }

    this.connections.push({
      routeId: route.id,
      voiceId: voice.id,
      scaler,
      offsetSource,
      offsetGain,
    });
  }

  /**
   * Returns the maximum modulation amount in the parameter's native units.
   * When depth is 1.0, the LFO sweeps ± this value around the current setting.
   */
  private getModRange(param: ModTarget['param']): number {
    switch (param) {
      case 'cutoff':
        return 4800; // ±4800 cents (4 octaves) via detune
      case 'resonance':
        return 15; // ±15 Q
      case 'level':
        return 0.5; // ±0.5 gain
      case 'gain':
        return 12; // ±12 dB
      case 'pan':
        return 1; // ±1 (full L-R)
      case 'detune':
        return 100; // ±100 cents
      case 'blend':
      case 'mix':
      case 'wtPos':
        return 0.5; // ±0.5
      default:
        return 1;
    }
  }

  private resolveTarget(voice: Voice, target: ModTarget): AudioParam | null {
    const { source, param } = target;
    const osc1 = voice.getOsc1();
    const osc2 = voice.getOsc2();
    const flt1 = voice.getFilter1();
    const flt2 = voice.getFilter2();

    const sourceResolvers: Record<ModTarget['source'], ParamResolverMap> = {
      sub: {},
      noise: {},
      osc1: {
        level: () => osc1.getGainParam(),
      },
      osc2: {
        level: () => osc2.getGainParam(),
      },
      flt1: {
        cutoff: () => flt1.getDetuneParam(),
        resonance: () => flt1.getResonanceParam(),
        level: () => flt1.getGainParam(),
      },
      flt2: {
        cutoff: () => flt2.getDetuneParam(),
        resonance: () => flt2.getResonanceParam(),
        level: () => flt2.getGainParam(),
      },
    };

    const resolver = sourceResolvers[source]?.[param];
    return resolver ? resolver() : null;
  }

  disconnectAll(): void {
    for (const conn of this.connections) {
      try {
        conn.scaler.disconnect();
        if (conn.offsetSource) {
          conn.offsetSource.stop();
          conn.offsetSource.disconnect();
        }
        if (conn.offsetGain) {
          conn.offsetGain.disconnect();
        }
      } catch {
        // Already disconnected
      }
    }
    this.connections = [];
  }
}
