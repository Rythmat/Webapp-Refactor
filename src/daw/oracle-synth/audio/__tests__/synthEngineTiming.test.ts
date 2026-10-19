import { afterEach, describe, expect, it, vi } from 'vitest';
import { SynthEngine } from '../SynthEngine';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { midiToFrequency } from '../constants';
import { ArpParams } from '../types';
import { fakeOracleContext, param } from './fakeOracleContext';

const ARP: ArpParams = {
  enabled: true,
  rate: '1/8',
  style: 'up',
  distance: 12,
  step: 1,
};

/** Every source start/stop and param event, in creation order. */
function schedule(fake: ReturnType<typeof fakeOracleContext>) {
  return fake.nodes.map((n) => ({
    kind: n.kind,
    start: n.start.mock.calls,
    stop: n.stop.mock.calls,
    freq: n.kind === 'oscillator' ? param(n, 'frequency').events : null,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SynthEngine on scheduled time', () => {
  it('schedules two sequenced notes the same way every time, at their times and pitches', async () => {
    const run = async () => {
      const fake = fakeOracleContext();
      const engine = new SynthEngine();
      await engine.init(fake.ctx, { disableMidi: true });
      const before = fake.ofKind('oscillator').length;
      // Everything is scheduled while the clock reads 0, as offline.
      engine.noteOn(60, 0.8, 0.5);
      engine.noteOff(60, 1.0);
      engine.noteOn(67, 0.8, 1.5);
      engine.noteOff(67, 2.0);
      const oscs = fake.ofKind('oscillator').slice(before);
      return { fake, oscs };
    };
    const a = await run();
    const b = await run();
    expect(JSON.stringify(schedule(a.fake))).toBe(
      JSON.stringify(schedule(b.fake)),
    );

    const starts = a.oscs.map((o) => a.fake.startTime(o));
    expect(starts).toContain(0.5);
    expect(starts).toContain(1.5);
    for (const osc of a.oscs) {
      const t = a.fake.startTime(osc);
      const f = param(osc, 'frequency').valueAt(t);
      expect(f).toBeCloseTo(midiToFrequency(t === 0.5 ? 60 : 67), 6);
      expect(a.fake.stopTime(osc)).toBeGreaterThan(t);
    }
  });

  it('sends a held key’s note-off to the path that started it when the arp is toggled', async () => {
    const fake = fakeOracleContext();
    const engine = new SynthEngine();
    await engine.init(fake.ctx, { disableMidi: true });
    engine.setArpParams({ ...ARP, enabled: false });
    const before = fake.ofKind('oscillator').length;

    engine.noteOn(60, 0.8, 0); // raw voice
    engine.setArpParams(ARP); // hand over: raw released, arp seeded
    engine.noteOff(60, 1); // goes to the arp, which stops
    engine.noteOn(62, 0.8, 1.5); // arp
    engine.setArpParams({ ...ARP, enabled: false }); // hand back: plays raw
    engine.noteOff(62, 2);

    const oscs = fake.ofKind('oscillator').slice(before);
    // Every oscillator got a stop: no note was stranded.
    for (const osc of oscs) {
      expect(Number.isFinite(fake.stopTime(osc))).toBe(true);
    }
    // A second press of the same key still sounds (the scale lock's
    // per-pitch refs were balanced by the hand-overs).
    const more = fake.ofKind('oscillator').length;
    engine.noteOn(60, 0.8, 3);
    expect(fake.ofKind('oscillator').length).toBeGreaterThan(more);
  });

  it('never resumes a host context', async () => {
    const fake = fakeOracleContext();
    (fake.ctx as unknown as { state: string }).state = 'suspended';
    const engine = new SynthEngine();
    await engine.init(fake.ctx, { disableMidi: true });
    expect(fake.ctx.resume).not.toHaveBeenCalled();
    expect(engine.getIsInitialized()).toBe(true);
  });

  it('builds nothing when released while its own context is resuming', async () => {
    const fake = fakeOracleContext();
    (fake.ctx as unknown as { state: string }).state = 'suspended';
    let resolve: () => void = () => {};
    (fake.ctx as unknown as { resume: () => Promise<void> }).resume = () =>
      new Promise<void>((r) => {
        resolve = r;
      });
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return fake.ctx;
      }),
    );
    const engine = new SynthEngine();
    const pending = engine.init(undefined, { disableMidi: true });
    engine.releaseResources();
    resolve();
    await pending;
    expect(engine.getIsInitialized()).toBe(false);
    const started = fake.nodes.filter((n) => n.start.mock.calls.length > 0);
    expect(started).toHaveLength(0);
  });

  it('adapter: a dispose during init releases the engine instead of throwing', async () => {
    const fake = fakeOracleContext();
    const output = fake.ctx.createGain();
    const adapter = new OracleSynthAdapter();
    const pending = adapter.init(fake.ctx, output);
    adapter.dispose();
    await expect(pending).resolves.toBeUndefined();
    // Every engine source that was started has been stopped again.
    for (const n of fake.nodes) {
      if (n.start.mock.calls.length > 0) {
        expect(n.stop).toHaveBeenCalled();
      }
    }
    const analyser = fake.ofKind('analyser')[0];
    expect(analyser.connect).not.toHaveBeenCalledWith(output);
  });

  it('adapter forwards time for pitch bend, all-notes-off and panic', async () => {
    const fake = fakeOracleContext();
    const adapter = new OracleSynthAdapter();
    await adapter.init(fake.ctx, fake.ctx.createGain());
    const engine = adapter.getEngine()!;
    const bend = vi.spyOn(engine, 'setPitchBend');
    const off = vi.spyOn(engine, 'allNotesOff');
    const panic = vi.spyOn(engine, 'forceAllNotesOff');
    adapter.pitchBend(0.5, 1.25);
    adapter.allNotesOff(2);
    adapter.panic(3);
    expect(bend).toHaveBeenCalledWith(0.5, 1.25);
    expect(off).toHaveBeenCalledWith(2);
    expect(panic).toHaveBeenCalledWith(3);

    // A loop's all-notes-off releases at the loop's time, not now.
    adapter.noteOn(60, 100, 1);
    const voices = fake.ofKind('oscillator').slice(-2);
    adapter.allNotesOff(4);
    for (const osc of voices) {
      expect(fake.stopTime(osc)).toBeGreaterThan(4);
    }
  });
});
