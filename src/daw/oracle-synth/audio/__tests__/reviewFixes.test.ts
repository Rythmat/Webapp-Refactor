import { afterEach, describe, expect, it, vi } from 'vitest';
import { LFO } from '../LFO';
import { LFOWaveformBuilder } from '../LFOWaveformBuilder';
import { VoiceManager } from '../VoiceManager';
import { WavetableBank } from '../WavetableBank';
import { Arpeggiator } from '../Arpeggiator';
import { SynthEngine } from '../SynthEngine';
import { ArpParams } from '../types';
import { fakeOracleContext, param } from './fakeOracleContext';

const ARP: ArpParams = {
  enabled: true,
  rate: '1/8',
  style: 'up',
  distance: 12,
  step: 1,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('LFO alignment', () => {
  it('re-aligning on play, loop or seek builds no buffer, and an aligned lap starts nothing', () => {
    const fake = fakeOracleContext(48000);
    const build = vi.spyOn(LFOWaveformBuilder, 'buildBuffer');
    const lfo = new LFO(fake.ctx);
    lfo.start(0);
    const built = build.mock.calls.length;
    const sources = () => fake.ofKind('bufferSource').length;

    // 120 bpm: the 4-bar loop is 8 s; a lap of 8 s lands on the same phase.
    const before = sources();
    lfo.alignToBeat(8, 0);
    expect(sources()).toBe(before);

    // A seek to another phase restarts the source, reusing the buffer.
    lfo.alignToBeat(9, 6);
    expect(sources()).toBe(before + 1);
    const node = fake.ofKind('bufferSource').at(-1)!;
    expect(node.start).toHaveBeenCalledWith(9, 3); // beat 6 = 3 s into the loop
    expect(build.mock.calls.length).toBe(built);
  });

  it('an edit between a booked alignment and its start leaves one source sounding', () => {
    const fake = fakeOracleContext(8000);
    const lfo = new LFO(fake.ctx);
    lfo.start(0);
    fake.setTime(1);
    lfo.alignToBeat(1.1, 0); // play booked 100 ms ahead
    lfo.setBarSmooth(0, 0.5); // a patch edit now
    const at = 1.05;
    const sounding = fake
      .ofKind('bufferSource')
      .filter((s) => fake.startTime(s) <= at && fake.stopTime(s) > at);
    expect(sounding).toHaveLength(1);
  });
});

describe('arp live pump after a stall', () => {
  it('drops overdue steps instead of playing them late as a cluster', () => {
    vi.useFakeTimers();
    let now = 0;
    const ons: [number, number][] = [];
    const arp = new Arpeggiator(
      (n, _v, t) => ons.push([n, t]),
      () => {},
      { now: () => now, live: true },
    );
    arp.setParams({ ...ARP, rate: '1/16' });
    arp.noteOn(60, 1, 0.1); // booked 100 ms ahead
    now = 1.0; // the next timer wake comes a second late
    vi.advanceTimersByTime(20);
    // Nothing older than the 40 ms pump horizon is played.
    expect(ons.filter(([, t]) => t < now - 0.04)).toHaveLength(0);
    expect(ons.length).toBeGreaterThan(0);
    arp.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('voice bookkeeping on booked time', () => {
  it('writes spread pan at the note time, not at the clock (offline)', () => {
    const fake = fakeOracleContext();
    const vm = new VoiceManager(
      fake.ctx,
      new WavetableBank(fake.ctx),
      fake.ctx.createGain(),
      2,
    );
    vm.setSpread(1);
    for (let i = 0; i < 6; i++) {
      vm.noteOn(60 + i, 1, i + 1);
      vm.noteOn(70 + i, 1, i + 1); // pool of 2 → steals each step
    }
    const times = new Set<number>();
    for (const p of fake.ofKind('panner')) {
      for (const e of param(p, 'pan').events) times.add(e.time);
    }
    expect([...times].some((t) => t > 1)).toBe(true);
  });

  it('a switched-off source’s old tail never ends the note that follows', () => {
    const fake = fakeOracleContext();
    const vm = new VoiceManager(
      fake.ctx,
      new WavetableBank(fake.ctx),
      fake.ctx.createGain(),
      1,
    );
    const v = vm.noteOn(60, 1, 0)!;
    const onEnd = vi.fn();
    v.onEnd = onEnd;
    vm.noteOff(60, 0.5); // osc1's tail ends ~0.865
    v.setOscillatorParams(0, { enabled: false });
    v.setSubOscillatorParams({ enabled: true });
    vm.noteOn(62, 1, 1); // booked before that tail's onended
    vm.noteOff(62, 3);
    fake.endSources(1.5); // only the old osc1 set has ended
    expect(onEnd).not.toHaveBeenCalled();
    fake.endSources(10);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('MONO/LEGATO key changes report the voice so note-dependent routes rebuild', () => {
    const fake = fakeOracleContext();
    const vm = new VoiceManager(
      fake.ctx,
      new WavetableBank(fake.ctx),
      fake.ctx.createGain(),
      4,
    );
    vm.setVoiceMode('legato');
    const changed = vi.fn();
    vm.onPitchChange = changed;
    const voice = vm.noteOn(60, 1, 0)!;
    vm.noteOn(64, 1, 0.5);
    vm.noteOff(64, 1); // back to 60
    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledWith(voice);
  });
});

describe('arp hand-over on booked time', () => {
  it('switching the arp off plays a booked key at its own time, not now', async () => {
    const fake = fakeOracleContext();
    const engine = new SynthEngine();
    await engine.init(fake.ctx, { disableMidi: true });
    engine.setArpParams(ARP);
    fake.setTime(5);
    engine.noteOn(62, 0.8, 5.1); // sequencer key, 100 ms ahead
    const before = fake.ofKind('oscillator').length;
    engine.setArpParams({ ...ARP, enabled: false });
    const starts = new Set(
      fake
        .ofKind('oscillator')
        .slice(before)
        .map((o) => fake.startTime(o)),
    );
    expect([...starts]).toEqual([5.1]);
    engine.releaseResources();
  });
});
