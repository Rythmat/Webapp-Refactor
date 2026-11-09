import { describe, expect, it, vi } from 'vitest';

// ── EffectChain as a composer of per-slot modules (milestone 1.11, c1–c2) ──
// The chain wires its modules in one fixed order, every off slot on true
// bypass, and adds no pass-through nodes of its own. Until they are first
// used, the EQ's filters, the compressor and its crush are out of the path: a
// fresh chain runs input → EQ makeup → gate → pad (the compressor's
// look-ahead) → compressor makeup → … and nothing filters or shapes it.

vi.mock('../../reverbIR', () => ({
  getProcessedIr: () => null,
  ensureProcessedIr: () => Promise.resolve(null),
}));

import {
  DEFAULT_EFFECTS,
  EffectChain,
  type TrackEffectState,
} from '../../EffectChain';
import { generateCrushCurve } from '../effects/crushCurve';
import { recordingContext, type RecNode } from './recordingContext';

interface Internals {
  inputNode: RecNode;
  outputNode: RecNode;
  eq: { filterGroups: RecNode[][]; output: RecNode };
  gate: { output: RecNode };
  compressor: {
    preCompAnalyser: RecNode;
    compressor: RecNode;
    crushNode: RecNode;
    pad: RecNode;
    makeupGain: RecNode;
    latencySeconds: number;
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
    [m.gate.output, 'gate'],
    [m.compressor.preCompAnalyser, 'preTap'],
    [m.compressor.compressor, 'comp'],
    [m.compressor.crushNode, 'crush'],
    [m.compressor.pad, 'pad'],
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
  /** Every node the input reaches, in the order they were found. */
  const reachable = () => {
    const seen: RecNode[] = [m.inputNode];
    for (let i = 0; i < seen.length; i++) {
      for (const to of rec.from(seen[i])) {
        if (!seen.includes(to)) seen.push(to);
      }
    }
    return seen;
  };
  return { rec, chain, m, edges, nameEq, reachable };
}

/** The defaults with the EQ, or the compressor, switched on or off. */
function withEq(enabled: boolean): TrackEffectState {
  const state = structuredClone(DEFAULT_EFFECTS);
  state.eq.enabled = enabled;
  return state;
}
function withComp(enabled: boolean, crush = 0): TrackEffectState {
  const state = structuredClone(DEFAULT_EFFECTS);
  state.compressor = { ...state.compressor, enabled, crush };
  return state;
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
        'input>eqMakeup',
        'eqMakeup>gate',
        'gate>preTap',
        'gate>pad',
        'pad>makeup',
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
    // The EQ joins the path once it is on, and stays when it is off again.
    chain.update(withEq(true));
    chain.update(withEq(false));
    expect(
      edges()
        .filter((e) => /^eq\d|^input>/.test(e))
        .sort(),
    ).toEqual(eqPath(8).sort());
    const isEqEdge = (e: string) => e.startsWith('input>') || /^eq\d/.test(e);
    const rest = edges().filter((e) => !isEqEdge(e));
    const oldLowCut = (chain as unknown as Internals).eq.filterGroups[0][0];

    const steep = withEq(false);
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
    // input + output, reverb 7, EQ 8 + makeup, gate 2, compressor 6 (with
    // the pad), delay 5,
    // presence 1, de-esser 5, saturator 5, multiband 1 + 3 bands (2+4+2
    // filters, comp, makeup, trim each) + sum, trim, wet, dry, ducker 1.
    expect(rec.nodes).toHaveLength(2 + 7 + 9 + 1 + 6 + 5 + 1 + 5 + 5 + 22 + 1);
  });

  it('a fresh chain neither filters, compresses nor shapes the sound', () => {
    const { chain, m, reachable } = build();
    chain.update(structuredClone(DEFAULT_EFFECTS));
    const path = reachable();
    expect(path.slice(0, 4)).toEqual([
      m.inputNode,
      m.eq.output,
      m.gate.output,
      m.compressor.preCompAnalyser,
    ]);
    expect(path).toContain(m.compressor.pad);
    expect(path).toContain(m.compressor.makeupGain);
    expect(path).toContain(m.outputNode);
    const kinds = path.map((n) => n.kind);
    expect(kinds).not.toContain('biquad');
    expect(kinds).not.toContain('compressor');
    expect(kinds).not.toContain('waveshaper');
    // The pad is the only delay: no other pass-through node holds sound back.
    expect(path.filter((n) => n.kind === 'delay')).toEqual([m.compressor.pad]);
    expect(m.compressor.pad.delayTime).toMatchObject({ value: 0.006 });
  });

  it("the compressor takes the pad's place once, and stays when off", () => {
    const { chain, m, edges, reachable } = build();
    chain.update(withComp(false));
    chain.update(withComp(true));
    expect(edges()).toContain('gate>comp');
    expect(edges()).toContain('comp>makeup');
    expect(edges().some((e) => e.includes('pad'))).toBe(false);
    const onEdges = edges().sort();

    chain.update(withComp(false));
    expect(edges().sort()).toEqual(onEdges);
    expect(reachable()).toContain(m.compressor.compressor);
    expect(reachable()).not.toContain(m.compressor.pad);
    const comp = m.compressor.compressor as unknown as {
      threshold: { value: number; events: unknown[][] };
      ratio: { value: number; events: unknown[][] };
    };
    const last = (p: { value: number; events: unknown[][] }) =>
      p.events.length ? p.events[p.events.length - 1][1] : p.value;
    expect(last(comp.threshold)).toBe(0);
    expect(last(comp.ratio)).toBe(1);
  });

  it('the crush is in the path only while it is above 0', () => {
    const { chain, m, edges, reachable } = build();
    chain.update(withComp(true));
    expect(edges()).not.toContain('comp>crush');

    chain.update(withComp(true, 0.5));
    expect(edges()).toContain('comp>crush');
    expect(edges()).toContain('crush>makeup');
    expect(edges()).not.toContain('comp>makeup');
    expect(m.compressor.crushNode.curve).toBe(generateCrushCurve(0.5));
    const onEdges = edges().sort();

    // Back at 0 it leaves: no curve clips beyond ±1, no 2x oversampling
    // holds the sound back.
    chain.update(withComp(true, 0));
    expect(edges()).toContain('comp>makeup');
    expect(edges().some((e) => e.includes('crush'))).toBe(false);
    expect(reachable()).not.toContain(m.compressor.crushNode);
    expect(reachable().some((n) => n.kind === 'waveshaper')).toBe(false);

    // The compressor switched off takes the crush with it, and back on with
    // the crush up the same edges return.
    chain.update(withComp(true, 0.5));
    chain.update(withComp(false, 0.5));
    expect(reachable()).not.toContain(m.compressor.crushNode);
    chain.update(withComp(true, 0.5));
    expect(edges().sort()).toEqual(onEdges);
  });

  it("the EQ's filters join the path once, the first time it is on", () => {
    const { rec: r, chain, edges } = build();
    chain.update(withEq(false));
    expect(edges()).toContain('input>eqMakeup');
    expect(edges().some((e) => /eq\d/.test(e))).toBe(false);

    chain.update(withEq(true));
    const isEqEdge = (e: string) => /^eq\d|^input>/.test(e);
    expect(edges().filter(isEqEdge).sort()).toEqual(eqPath(8).sort());
    const connects = r.connects.length;
    chain.update(withEq(false));
    chain.update(withEq(true));
    expect(edges().filter(isEqEdge).sort()).toEqual(eqPath(8).sort());
    // Toggling again rewires nothing.
    expect(r.connects.length).toBe(connects);
  });

  it('the path holds sound back by the look-ahead, on or off', () => {
    const { chain, m, reachable } = build();
    // What on the path holds sound back: a delay, the compressor's
    // look-ahead, or an oversampling waveshaper.
    const late = () =>
      reachable().filter(
        (n) =>
          n.kind === 'delay' ||
          n.kind === 'compressor' ||
          (n.kind === 'waveshaper' && n.oversample !== 'none'),
      );
    chain.update(withComp(false));
    expect(late()).toEqual([m.compressor.pad]);
    expect(m.compressor.pad.delayTime).toMatchObject({ value: 0.006 });
    chain.update(withComp(true));
    expect(late()).toEqual([m.compressor.compressor]);
    chain.update(withComp(true, 0.4));
    chain.update(withComp(true, 0));
    expect(late()).toEqual([m.compressor.compressor]);
    chain.update(withComp(false));
    expect(late()).toEqual([m.compressor.compressor]);
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
