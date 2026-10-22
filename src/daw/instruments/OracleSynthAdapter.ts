import { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
// For its side effect: every engine's pack tables can wait for the pack
// to register (wavetableImport's registrar), playback and export alike.
import '@/daw/oracle-synth/store/presets/packLoader';
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
    const engine = new SynthEngine();
    this.engine = engine;
    await engine.init(ctx, { disableMidi: true });

    // Disposed (track deleted, instrument switched, undo …) while init was
    // waiting: release what the engine built and stop here.
    if (this.engine !== engine) {
      engine.releaseResources();
      return;
    }

    // Reroute: disconnect analyser from ctx.destination, connect to track output
    const analyser = engine.getAnalyserNode();
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

  /**
   * Sequenced/live CC automation from the DAW (values 0-127, normalized to
   * 0-1 for the engine). The scheduled `time` is forwarded so automation
   * lands sample-aligned with notes instead of a lookahead (~100ms) early.
   * Map: CC1 mod wheel · CC7 volume · CC20-27 macros 1-8.
   */
  cc(controller: number, value: number, time?: number): void {
    this.engine?.handleCC(controller, value / 127, time);
  }

  pitchBend(value: number, time?: number): void {
    this.engine?.setPitchBend(value, time);
  }

  /** Releases every held note at `time` (an AudioContext time; now if omitted). */
  allNotesOff(time?: number): void {
    this.engine?.allNotesOff(time);
  }

  /** Silences every voice with a short fade from `time` (now if omitted). */
  panic(time?: number): void {
    this.engine?.forceAllNotesOff(time);
  }

  /**
   * Lines the Oracle's bar-shaped LFOs up with the song: at context time
   * `time` the transport is at `beat` (quarter notes from the song start).
   * For the playback scheduler to call on start, loop and seek.
   */
  alignToTransport(time: number, beat: number): void {
    this.engine?.alignLFOs(time, beat);
  }

  /** Access the underlying SynthEngine for parameter control (presets, FX, etc.). */
  getEngine(): SynthEngine | null {
    return this.engine;
  }

  dispose(): void {
    // Don't call engine.dispose() — it closes the shared AudioContext.
    // releaseResources() stops every engine-owned source node (vibrato,
    // LFOs, macro sources, …) so deleting/recreating tracks doesn't
    // accumulate running nodes on the shared context.
    if (this.engine) {
      this.engine.releaseResources();
    }
    this.engine = null;
  }
}
