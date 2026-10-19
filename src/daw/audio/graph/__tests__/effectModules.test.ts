import { describe, expect, it, vi } from 'vitest';

// ── Each effect module's automation targets (milestone 1.11, c1) ───────────
// Only continuous, offline-renderable params are rideable, with the same
// value maps as the module's update(); everything else returns [].

vi.mock('../../reverbIR', () => ({
  getProcessedIr: () => null,
  ensureProcessedIr: () => Promise.resolve(null),
}));

import { DEFAULT_EFFECTS } from '../../EffectChain';
import type { AutomationTarget } from '../../automation';
import { CompressorModule } from '../effects/compressor';
import { DeEsserModule } from '../effects/deEsser';
import { DelayModule } from '../effects/delay';
import { DuckerModule } from '../effects/ducker';
import { EqModule } from '../effects/eq';
import { GateModule } from '../effects/gate';
import { MultibandModule } from '../effects/multiband';
import { PresenceModule } from '../effects/presence';
import { ReverbModule } from '../effects/reverb';
import { SaturatorModule } from '../effects/saturator';
import { recordingContext } from './recordingContext';

const d = () => structuredClone(DEFAULT_EFFECTS);
const ctx = () => recordingContext().ctx;
const at = (targets: AutomationTarget[], v: number) =>
  targets.map((t) => t.map(v));

describe('effect modules: automation targets', () => {
  it('reverb rides wet as a wet/dry pair', () => {
    const m = new ReverbModule(ctx(), d().reverb);
    const t = m.automationTargets('wet');
    expect(t.map((x) => x.param)).toEqual([m.wetGain.gain, m.dryGain.gain]);
    expect(at(t, 0.25)).toEqual([0.25, 0.75]);
    expect(m.automationTargets('decay')).toEqual([]);
  });

  it('delay rides wet and a clamped feedback', () => {
    const m = new DelayModule(ctx());
    const wet = m.automationTargets('wet');
    expect(wet.map((x) => x.param)).toEqual([m.wetGain.gain, m.dryGain.gain]);
    expect(at(wet, 0.4)).toEqual([0.4, 0.6]);
    const fb = m.automationTargets('feedback');
    expect(fb.map((x) => x.param)).toEqual([m.feedback.gain]);
    expect([...at(fb, 2), ...at(fb, -1), ...at(fb, 0.5)]).toEqual([
      0.95, 0, 0.5,
    ]);
    expect(m.automationTargets('time')).toEqual([]);
  });

  it('presence rides amount in dB (0–100 → 0–12)', () => {
    const m = new PresenceModule(ctx());
    const t = m.automationTargets('amount');
    expect(t.map((x) => x.param)).toEqual([m.filter.gain]);
    expect(at(t, 50)).toEqual([6]);
    expect(m.automationTargets('frequency')).toEqual([]);
  });

  it('saturator rides mix as a percent wet/dry pair', () => {
    const m = new SaturatorModule(ctx());
    const t = m.automationTargets('mix');
    expect(t.map((x) => x.param)).toEqual([m.wetGain.gain, m.dryGain.gain]);
    expect(at(t, 25)).toEqual([0.25, 0.75]);
    expect(m.automationTargets('drive')).toEqual([]);
  });

  it('multiband rides depth as a wet/dry pair', () => {
    const m = new MultibandModule(ctx(), d().multiband);
    const t = m.automationTargets('depth');
    expect(t.map((x) => x.param)).toEqual([m.wetGain.gain, m.dryGain.gain]);
    expect(at(t, 0.3)).toEqual([0.3, 0.7]);
  });

  it('EQ, gate, compressor, de-esser and ducker expose nothing', () => {
    const c = ctx();
    expect(new EqModule(c, d().eq).automationTargets()).toEqual([]);
    expect(new GateModule(c, d().gate).automationTargets()).toEqual([]);
    expect(new CompressorModule(c, d().compressor).automationTargets()).toEqual(
      [],
    );
    expect(new DeEsserModule(c).automationTargets()).toEqual([]);
    expect(new DuckerModule(c, d().ducker).automationTargets()).toEqual([]);
  });

  it('a wet/dry module bypasses straight to its destination', () => {
    const rec = recordingContext();
    const m = new DelayModule(rec.ctx);
    const next = rec.ctx.createGain();
    m.wire(m.input, next);
    expect(rec.from(m.input)).toEqual([next]);
    m.update(
      { ...d().delay, enabled: true },
      {
        glide: false,
        heard: false,
        deferIr: false,
      },
    );
    expect(rec.from(m.input)).toEqual([m.dryGain, m.delayNode]);
    expect(rec.from(m.delayNode)).toEqual([m.wetGain, m.feedback]);
  });
});
