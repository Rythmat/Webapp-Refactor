import { describe, expect, it, vi } from 'vitest';

// ── EffectChain as a composer of per-slot modules (milestone 1.11, c1) ─────
// The chain wires its modules in one fixed order, with the EQ and the
// compressor (and its crush) always in the path and every other slot on true
// bypass, and adds no pass-through nodes of its own.

vi.mock('../../reverbIR', () => ({
  getProcessedIr: () => null,
  ensureProcessedIr: () => Promise.resolve(null),
}));

import {
  DEFAULT_EFFECTS,
  EffectChain,
  type TrackEffectState,
} from '../../EffectChain';
import { recordingContext, type RecNode } from './recordingContext';

interface Internals {
  inputNode: RecNode;
  outputNode: RecNode;
  eq: { filterGroups: RecNode[][]; output: RecNode };
  gate: { analyser: RecNode; output: RecNode };
  compressor: {
    preCompAnalyser: RecNode;
    compressor: RecNode;
    crushNode: RecNode;
    makeupGain: RecNode;
    postCompAnalyser: RecNode;
  };
  presence: { filter: RecNode };
  deEsser: { input: RecNode; compressor: RecNode };
  reverb: { input: RecNode; dryGain: RecNode; preDelay: RecNode };
  delay: { input: RecNode; dryGain: RecNode; delayNode: RecNode };
  saturator: { input: RecNode; dryGain: RecNode; shaper: RecNode };
  multiband: { input: RecNode; dryGain: RecNode };
  ducker: { input: RecNode };
}

function build() {
  const rec = recordingContext();
  const chain = new EffectChain(rec.ctx);
  const m = chain as unknown as Internals;
  const names = new Map<RecNode, string>([
    [m.inputNode, 'input'],
    [m.outputNode, 'output'],
    [m.eq.output, 'eqMakeup'],
    [m.gate.analyser, 'gateTap'],
    [m.gate.output, 'gate'],
    [m.compressor.preCompAnalyser, 'preTap'],
    [m.compressor.compressor, 'comp'],
    [m.compressor.crushNode, 'crush'],
    [m.compressor.makeupGain, 'makeup'],
    [m.compressor.postCompAnalyser, 'postTap'],
    [m.presence.filter, 'presence'],
    [m.deEsser.input, 'deEsser'],
    [m.deEsser.compressor, 'deEsserComp'],
    [m.reverb.input, 'reverb'],
    [m.reverb.dryGain, 'reverbDry'],
    [m.reverb.preDelay, 'reverbPreDelay'],
    [m.delay.input, 'delay'],
    [m.delay.dryGain, 'delayDry'],
    [m.delay.delayNode, 'delayLine'],
    [m.saturator.input, 'saturator'],
    [m.saturator.dryGain, 'saturatorDry'],
    [m.saturator.shaper, 'saturatorShaper'],
    [m.multiband.input, 'multiband'],
    [m.multiband.dryGain, 'multibandDry'],
    [m.ducker.input, 'duck'],
  ]);
  const nameEq = () =>
    m.eq.filterGroups.flat().forEach((f, i) => names.set(f, `eq${i}`));
  nameEq();
  /** The live edges between named nodes, in the order they were made. */
  const edges = () =>
    rec.edges
      .filter(([a, b]) => names.has(a) && names.has(b))
      .map(([a, b]) => `${names.get(a)}>${names.get(b)}`);
  return { rec, chain, edges, nameEq };
}

const eqPath = (n: number) => [
  'input>eq0',
  ...Array.from({ length: n - 1 }, (_, i) => `eq${i}>eq${i + 1}`),
  `eq${n - 1}>eqMakeup`,
];

describe('EffectChain composes its modules', () => {
  it('wires the slots in the fixed order, the off ones bypassed', () => {
    const { chain, edges } = build();
    chain.update(structuredClone(DEFAULT_EFFECTS));
    expect(edges().sort()).toEqual(
      [
        ...eqPath(8),
        'eqMakeup>gateTap',
        'eqMakeup>gate',
        'gate>preTap',
        'gate>comp',
        'comp>crush',
        'crush>makeup',
        'makeup>postTap',
        'makeup>deEsser',
        'deEsser>reverb',
        'reverb>delay',
        'delay>saturator',
        'saturator>multiband',
        'multiband>duck',
        'duck>output',
      ].sort(),
    );
  });

  it('puts each enabled slot between its neighbours', () => {
    const { chain, edges } = build();
    const on: TrackEffectState = structuredClone(DEFAULT_EFFECTS);
    for (const slot of [
      'presence',
      'de-esser',
      'reverb',
      'delay',
      'saturator',
      'multiband',
    ] as const) {
      on[slot].enabled = true;
    }
    chain.update(on);
    const live = edges();
    for (const edge of [
      'makeup>presence',
      'presence>deEsser',
      'deEsser>deEsserComp',
      'reverb>reverbDry',
      'reverbDry>delay',
      'reverb>reverbPreDelay',
      'delay>delayDry',
      'delayDry>saturator',
      'delay>delayLine',
      'saturator>saturatorShaper',
      'saturatorDry>multiband',
      'multiband>multibandDry',
      'multibandDry>duck',
      'duck>output',
    ]) {
      expect(live).toContain(edge);
    }
    // Nothing skips an enabled slot.
    for (const skip of [
      'makeup>deEsser',
      'deEsser>reverb',
      'reverb>delay',
      'delay>saturator',
      'saturator>multiband',
      'multiband>duck',
    ]) {
      expect(live).not.toContain(skip);
    }
  });

  it('switching a slot off and on again leaves the graph as it was', () => {
    const { rec, chain } = build();
    const on = structuredClone(DEFAULT_EFFECTS);
    on.reverb.enabled = true;
    on.delay.enabled = true;
    chain.update(on);
    const before = rec.edges.map(([a, b]) => `${a.id}>${b.id}`).sort();
    chain.update({ ...on, reverb: { ...on.reverb, enabled: false } });
    chain.update(on);
    expect(rec.edges.map(([a, b]) => `${a.id}>${b.id}`).sort()).toEqual(before);
  });

  it('a 24 dB/oct cut adds its filter in place and touches nothing else', () => {
    const { rec, chain, edges, nameEq } = build();
    chain.update(structuredClone(DEFAULT_EFFECTS));
    const isEqEdge = (e: string) => e.startsWith('input>') || /^eq\d/.test(e);
    const rest = edges().filter((e) => !isEqEdge(e));
    const oldLowCut = (chain as unknown as Internals).eq.filterGroups[0][0];

    const steep = structuredClone(DEFAULT_EFFECTS);
    steep.eq.bands[0] = { ...steep.eq.bands[0], slope: 24 };
    chain.update(steep);
    nameEq();
    expect(edges().filter(isEqEdge).sort()).toEqual(eqPath(9).sort());
    expect(edges().filter((e) => !isEqEdge(e))).toEqual(rest);
    // The replaced filter is out of the graph.
    expect(rec.edges.some(([a, b]) => a === oldLowCut || b === oldLowCut)).toBe(
      false,
    );
  });

  it('adds no nodes beyond the effects themselves', () => {
    const { rec } = build();
    // input + output, reverb 7, EQ 8 + makeup, gate 2, compressor 5, delay 5,
    // presence 1, de-esser 5, saturator 5, multiband 1 + 3 bands (2+4+2
    // filters, comp, makeup, trim each) + sum, trim, wet, dry, ducker 1.
    expect(rec.nodes).toHaveLength(2 + 7 + 9 + 2 + 5 + 5 + 1 + 5 + 5 + 22 + 1);
  });

  it('routes automation to the slot that owns the parameter', () => {
    const { chain } = build();
    const m = chain as unknown as {
      reverb: { wetGain: { gain: unknown } };
      delay: { feedback: { gain: unknown } };
    };
    expect(chain.getAutomationTargets('reverb', 'wet')[0].param).toBe(
      m.reverb.wetGain.gain,
    );
    expect(chain.getAutomationTargets('delay', 'feedback')[0].param).toBe(
      m.delay.feedback.gain,
    );
    expect(chain.getAutomationTargets('gate', 'threshold')).toEqual([]);
    expect(chain.getAutomationTargets('ducker', 'amount')).toEqual([]);
  });
});
