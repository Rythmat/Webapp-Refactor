import { describe, expect, it, vi } from 'vitest';

// ── The guitar pedals as effects (owner, 2026-10-22) ───────────────────────
// Overdrive, Amp, Chorus, Phaser, Flanger and Wah are effect slots any rack
// can add. A pedal joins the chain the first time it is switched on (a
// chain that never used one has none of its nodes), in a guitarist's
// order, and is truly bypassed while off. Pitch Correction isn't one. Run:
// npx vitest run src/daw/audio/graph/__tests__/pedalEffects.test.ts

vi.mock('../../reverbIR', () => ({
  getProcessedIr: () => null,
  ensureProcessedIr: () => Promise.resolve(null),
}));

import { DEFAULT_EFFECTS, EffectChain } from '../../EffectChain';
import {
  defaultPedalParams,
  PEDAL_EFFECTS,
  PEDAL_SLOTS,
  pedalKnobValues,
  type PedalEffectDef,
} from '../effects/pedalEffects';
import { PedalEffectModule } from '../effects/pedalModule';
import type { PedalProcessor } from '../../pedals/PedalProcessor';
import { recordingContext, type RecNode } from './recordingContext';

describe('the pedal effects', () => {
  it('are the guitar pedals, without Pitch Correction', () => {
    expect(PEDAL_SLOTS).toEqual([
      'overdrive',
      'amp',
      'chorus',
      'phaser',
      'flanger',
      'wah',
    ]);
    expect(PEDAL_SLOTS).not.toContain('pitch-correction');
    // Saved only once used: a chain's defaults don't name them.
    for (const slot of PEDAL_SLOTS)
      expect(DEFAULT_EFFECTS[slot]).toBeUndefined();
  });

  it('give a pedal its knobs, each at its default until set', () => {
    const chorus = PEDAL_EFFECTS.find((d) => d.slot === 'chorus')!;
    expect(defaultPedalParams('chorus')).toEqual({
      enabled: false,
      rate: 0.3,
      depth: 0.5,
      mix: 0.5,
    });
    expect(pedalKnobValues(chorus, undefined)).toEqual({
      rate: 0.3,
      depth: 0.5,
      mix: 0.5,
    });
    expect(
      pedalKnobValues(chorus, { enabled: true, mix: 0.9, depth: Number.NaN }),
    ).toEqual({ rate: 0.3, depth: 0.5, mix: 0.9 });
    // The phaser keeps its free (Hz) rate.
    const phaser = PEDAL_EFFECTS.find((d) => d.slot === 'phaser')!;
    expect(pedalKnobValues(phaser, undefined).rateMode).toBe(0);
  });
});

describe('a pedal slot', () => {
  /** A pedal made of one node, so its wiring can be read. */
  function fakeDef(rec: ReturnType<typeof recordingContext>) {
    const params: Record<string, number>[] = [];
    let made = 0;
    const def: PedalEffectDef = {
      slot: 'chorus',
      label: 'Chorus',
      about: '',
      knobs: [{ key: 'mix', label: 'MIX', default: 0.5, format: String }],
      create: () => {
        made++;
        const node = rec.ctx.createGain() as unknown as AudioNode;
        const pedal: PedalProcessor = {
          type: 'chorus',
          getInputNode: () => node,
          getOutputNode: () => node,
          setEnabled: () => {},
          updateParams: (p) => params.push(p),
          dispose: () => {},
        };
        return pedal;
      },
    };
    return { def, params, made: () => made };
  }

  const opts = { glide: false, heard: true, deferIr: false };

  it('passes the sound through while off and makes no pedal', () => {
    const rec = recordingContext();
    const { def, made } = fakeDef(rec);
    const source = rec.ctx.createGain() as unknown as RecNode;
    const module = new PedalEffectModule(
      rec.ctx as unknown as AudioContext,
      def,
    );
    module.wire(source as unknown as AudioNode);
    module.update(undefined, opts);
    expect(made()).toBe(0);
    expect(rec.from(source)).toEqual([module.output]);
  });

  it('puts the pedal in the path while on, and takes it out while off', () => {
    const rec = recordingContext();
    const { def, params } = fakeDef(rec);
    const source = rec.ctx.createGain() as unknown as RecNode;
    const module = new PedalEffectModule(
      rec.ctx as unknown as AudioContext,
      def,
    );
    module.wire(source as unknown as AudioNode);
    module.update({ enabled: true, mix: 0.8 }, opts);
    const pedal = module.pedalProcessor!.getInputNode() as unknown as RecNode;
    expect(rec.from(source)).toEqual([pedal]);
    expect(rec.from(pedal)).toEqual([module.output]);
    expect(params.at(-1)).toEqual({ mix: 0.8 });

    module.update({ enabled: false, mix: 0.8 }, opts);
    expect(rec.from(source)).toEqual([module.output]);
  });
});

describe('the chain with a pedal', () => {
  it('has none until one is switched on, then the drive leads the chain', () => {
    const rec = recordingContext();
    const chain = new EffectChain(rec.ctx as unknown as AudioContext);
    const input = (chain as unknown as { inputNode: RecNode }).inputNode;
    const before = rec.nodes.length;
    chain.update(structuredClone(DEFAULT_EFFECTS));
    expect(rec.nodes.length).toBe(before);

    const state = structuredClone(DEFAULT_EFFECTS);
    state.overdrive = { ...defaultPedalParams('overdrive'), enabled: true };
    chain.update(state);
    // The input feeds the overdrive first (a guitarist's board order).
    const first = rec.from(input);
    expect(first).toHaveLength(1);
    expect(rec.nodes.length).toBeGreaterThan(before);
    // Its shaper is in the path.
    const seen = new Set<RecNode>([input]);
    const queue = [input];
    while (queue.length) {
      for (const to of rec.from(queue.shift()!)) {
        if (!seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
    expect([...seen].some((n) => n.kind === 'waveshaper')).toBe(true);
  });
});
