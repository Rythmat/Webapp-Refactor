import { describe, expect, it } from 'vitest';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import {
  applySynthStateToEngine,
  captureSynthState,
  type SynthTrackState,
} from '../synthTrackState';

// ── A saved patch replays with its reverb and the project tempo ────────────
// applySynthStateToEngine is the only patch application when a project loads
// and in every export (synth-store-02, synth-store-04, synth-ui-01,
// synth-engine-06/07): before, it skipped the reverb (effects start off, so
// the track played dry until its panel opened) and set the tempo the patch
// was saved with (the synth store's 120 default), not the project's.

/** An engine that records every setter call, in order. */
function recordingEngine() {
  const calls: Array<[method: string, ...args: unknown[]]> = [];
  const engine = new Proxy(
    {},
    {
      get:
        (_, method: string) =>
        (...args: unknown[]) => {
          calls.push([method, ...args]);
          return method === 'ensureWavetables' ? Promise.resolve() : undefined;
        },
    },
  ) as unknown as SynthEngine;
  const argsOf = (method: string) =>
    calls.filter(([name]) => name === method).map(([, ...args]) => args);
  return { engine, calls, argsOf };
}

/** The synth store's default patch, saved at the store's 120 bpm, with a
 *  reverb switched on. */
function patchWithReverb(): SynthTrackState {
  const patch = captureSynthState();
  return {
    ...patch,
    bpm: 120,
    fx: {
      ...patch.fx,
      reverb: { ...patch.fx.reverb, enabled: true, mix: 0.4 },
    },
  };
}

describe('applySynthStateToEngine', () => {
  it('applies the patch reverb', () => {
    const { engine, argsOf } = recordingEngine();
    const patch = patchWithReverb();
    applySynthStateToEngine(engine, patch, { projectBpm: 90 });
    expect(argsOf('setReverbParams')).toEqual([[patch.fx.reverb]]);
  });

  it('applies every FX section, so none can drift from the panel sync', () => {
    const { engine, argsOf } = recordingEngine();
    applySynthStateToEngine(engine, patchWithReverb(), { projectBpm: 90 });
    for (const setter of [
      'setDriveParams',
      'setChorusParams',
      'setPhaserParams',
      'setDelayParams',
      'setReverbParams',
      'setCompressorParams',
    ]) {
      expect(argsOf(setter), setter).toHaveLength(1);
    }
  });

  it('runs LFOs and the arp at the project tempo, not the saved one', () => {
    const { engine, argsOf } = recordingEngine();
    applySynthStateToEngine(engine, patchWithReverb(), { projectBpm: 90 });
    expect(argsOf('setBPM')).toEqual([[90]]);
  });

  it('falls back to the saved tempo when the host gives none', () => {
    const { engine, argsOf } = recordingEngine();
    applySynthStateToEngine(engine, patchWithReverb());
    expect(argsOf('setBPM')).toEqual([[120]]);
    applySynthStateToEngine(engine, patchWithReverb(), {
      projectBpm: Number.NaN,
    });
    expect(argsOf('setBPM')).toEqual([[120], [120]]);
  });

  it('loads a pre-v3 patch without a reverb section instead of throwing', () => {
    const { engine, argsOf } = recordingEngine();
    const patch = patchWithReverb();
    const olderFx: Partial<SynthTrackState['fx']> = { ...patch.fx };
    delete olderFx.reverb;
    const older = { ...patch, fx: olderFx } as unknown as SynthTrackState;
    expect(() =>
      applySynthStateToEngine(engine, older, { projectBpm: 90 }),
    ).not.toThrow();
    expect(argsOf('setReverbParams')).toEqual([]);
    expect(argsOf('setArpParams')).toHaveLength(1);
  });
});
