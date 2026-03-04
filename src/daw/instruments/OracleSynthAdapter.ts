import { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import type { InstrumentAdapter } from './InstrumentAdapter';

/**
 * Wraps the Oracle Synth SynthEngine for DAW track integration.
 *
 * After SynthEngine.init(), its internal signal chain is:
 *   masterGain -> fxChain -> analyser -> ctx.destination
 *
 * We disconnect the analyser from ctx.destination and reconnect it
 * to the track's output node so audio flows through the DAW mixer.
 */
export class OracleSynthAdapter implements InstrumentAdapter {
  private engine: SynthEngine | null = null;

  async init(ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.engine = new SynthEngine();
    await this.engine.init(ctx, { disableMidi: true });

    // Reroute: disconnect analyser from ctx.destination, connect to track output
    const analyser = this.engine.getAnalyserNode();
    if (analyser) {
      try {
        analyser.disconnect(ctx.destination);
      } catch {
        // May already be disconnected or never connected to destination
      }
      analyser.connect(outputNode);
    }
  }

  noteOn(note: number, velocity: number, time?: number): void {
    // DAW uses 0-127 velocity; Oracle Synth uses 0-1
    this.engine?.noteOn(note, velocity / 127, time);
  }

  noteOff(note: number, time?: number): void {
    this.engine?.noteOff(note, time);
  }

  allNotesOff(): void {
    this.engine?.allNotesOff();
  }

  panic(): void {
    this.engine?.forceAllNotesOff();
  }

  /** Access the underlying SynthEngine for parameter control (presets, FX, etc.). */
  getEngine(): SynthEngine | null {
    return this.engine;
  }

  dispose(): void {
    // Don't call engine.dispose() — it closes the shared AudioContext.
    // Instead, just silence all notes and release our reference.
    if (this.engine) {
      this.engine.allNotesOff();
    }
    this.engine = null;
  }
}
