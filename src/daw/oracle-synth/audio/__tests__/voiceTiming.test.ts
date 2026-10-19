import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceManager } from '../VoiceManager';
import { WavetableBank } from '../WavetableBank';
import { Envelope, envelopeLevelAt } from '../Envelope';
import { UnisonEngine } from '../UnisonEngine';
import { midiToFrequency } from '../constants';
import {
  FakeNode,
  FakeParam,
  fakeOracleContext,
  param,
} from './fakeOracleContext';

function setup(maxVoices = 8) {
  const fake = fakeOracleContext();
  const bank = new WavetableBank(fake.ctx);
  const dest = fake.ctx.createGain();
  const vm = new VoiceManager(fake.ctx, bank, dest, maxVoices);
  /** Oscillator nodes made after this call. */
  const mark = () => {
    const before = fake.ofKind('oscillator').length;
    return () => fake.ofKind('oscillator').slice(before);
  };
  return { fake, vm, mark };
}

const freq = (osc: FakeNode) => param(osc, 'frequency');

afterEach(() => {
  vi.useRealTimers();
});

describe('VoiceManager allocation on scheduled time', () => {
  it('uses spare polyphony before stealing a releasing voice', () => {
    const { vm } = setup(2);
    const a = vm.noteOn(60, 1, 0)!;
    vm.noteOff(60, 1);
    // At 1.1 voice A is in its release tail: a new voice is made instead.
    const b = vm.noteOn(62, 1, 1.1)!;
    expect(b).not.toBe(a);
    expect(a.isReleasing(1.1)).toBe(true);
    expect(a.endAt).toBeGreaterThan(1.3);

    // The pool is full: the releasing voice is stolen next, with a short
    // fade that starts at the new note's time (not "now").
    const c = vm.noteOn(64, 1, 1.2)!;
    expect(c).not.toBe(a);
    expect(c).not.toBe(b);
    expect(a.endAt).toBeCloseTo(1.205, 6);

    // Only active voices are left: the oldest active one (B) is stolen.
    vm.noteOn(65, 1, 1.25);
    expect(b.endAt).toBeCloseTo(1.255, 6);
    expect(c.isActive(1.25)).toBe(true);
  });

  it('is releasing only from the scheduled note-off', () => {
    const { vm } = setup(1);
    const voice = vm.noteOn(60, 1, 0)!;
    vm.noteOff(60, 2); // called at currentTime 0, ahead of its time
    expect(voice.stateAt(1)).toBe('active');
    expect(voice.stateAt(2.01)).toBe('releasing');
    expect(voice.stateAt(voice.endAt)).toBe('free');
  });

  it('reuses a voice whose release ended before the next note, with no steal', () => {
    const { vm, fake, mark } = setup(1);
    const first = mark();
    const voice = vm.noteOn(60, 1, 0)!;
    vm.noteOff(60, 0.5);
    const firstEnd = voice.endAt; // 0.5 + six release time constants + fade
    const firstOscs = first();
    const second = mark();
    const again = vm.noteOn(62, 1, 1)!;
    const secondOscs = second();

    expect(again).toBe(voice);
    // Each note's oscillators start at the note's time and stop after its
    // release, all scheduled while the clock still reads 0.
    for (const osc of firstOscs) {
      expect(fake.startTime(osc)).toBe(0);
      expect(fake.stopTime(osc)).toBeCloseTo(firstEnd, 6);
    }
    for (const osc of secondOscs) {
      expect(fake.startTime(osc)).toBe(1);
      expect(freq(osc).valueAt(1)).toBeCloseTo(midiToFrequency(62), 6);
    }
    expect(firstEnd).toBeCloseTo(0.865, 6);
    expect(firstOscs.length).toBeGreaterThan(0);
    expect(freq(firstOscs[0]).valueAt(0)).toBeCloseTo(midiToFrequency(60), 6);
  });
});

describe('voices end from onended, not timers', () => {
  it('schedules no wall-clock timer and frees the voice when its sources end', () => {
    vi.useFakeTimers();
    const { vm, fake } = setup(2);
    const onEnd = vi.fn();
    const voice = vm.noteOn(60, 1, 0)!;
    voice.onEnd = onEnd;
    vm.noteOff(60, 1);
    expect(vi.getTimerCount()).toBe(0);

    fake.endSources(voice.endAt - 0.01);
    expect(onEnd).not.toHaveBeenCalled();
    fake.endSources(voice.endAt);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(voice.isFree(voice.endAt)).toBe(true);
    // The ended oscillators are unwired.
    const osc = fake.ofKind('oscillator')[0];
    expect(osc.disconnect).toHaveBeenCalled();
  });

  it('ignores a stale onended after the voice took a new note', () => {
    const { vm, fake } = setup(1);
    const onEnd = vi.fn();
    const voice = vm.noteOn(60, 1, 0)!;
    voice.onEnd = onEnd;
    vm.noteOff(60, 0.5);
    vm.noteOn(62, 1, 2); // reused before the first note's onended fires
    fake.endSources(1);
    expect(onEnd).not.toHaveBeenCalled();
  });
});

describe('release starts from the level at its time', () => {
  it('computes the level analytically mid-attack and mid-decay', () => {
    const fake = fakeOracleContext();
    const env = new Envelope({
      attack: 0.1,
      decay: 0.3,
      sustain: 0.5,
      release: 0.2,
    });
    const p = new FakeParam(0);
    const target = p as unknown as AudioParam;

    // Mid-attack, called long before the note even starts (offline).
    const seg = env.trigger(target, 1, fake.ctx, 1);
    const released = env.release(target, fake.ctx, 1.05, seg);
    const expected = 0.005 + (1 - 0.005) * 0.5;
    expect(released.releaseFrom).toBeCloseTo(expected, 6);
    expect(p.valueAt(1.05)).toBeCloseTo(expected, 4);
    // The attack up to the release is kept (not dropped by the cancel) …
    expect(p.valueAt(1.025)).toBeCloseTo(0.005 + 0.995 * 0.25, 4);
    // … and the release falls from there, with no jump.
    expect(p.valueAt(1.06)).toBeLessThan(expected);
    expect(p.valueAt(1.06)).toBeGreaterThan(expected * 0.7);

    // Mid-decay.
    const p2 = new FakeParam(0);
    const seg2 = env.trigger(p2 as unknown as AudioParam, 0.8, fake.ctx, 0);
    const at = 0.25;
    const level = envelopeLevelAt(seg2, at);
    env.release(p2 as unknown as AudioParam, fake.ctx, at, seg2);
    expect(p2.valueAt(at)).toBeCloseTo(level, 4);
    expect(level).toBeLessThan(0.8);
    expect(level).toBeGreaterThan(0.4);
  });

  it('decays to sustain even with a zero attack', () => {
    const fake = fakeOracleContext();
    const env = new Envelope({
      attack: 0,
      decay: 0.3,
      sustain: 0.5,
      release: 0.2,
    });
    const p = new FakeParam(0);
    env.trigger(p as unknown as AudioParam, 1, fake.ctx, 0);
    expect(p.valueAt(2)).toBeCloseTo(0.5, 3);
  });

  it('a voice steal fades from the level at the steal time', () => {
    const { vm, fake } = setup(1);
    vm.noteOn(60, 1, 0);
    vm.noteOff(60, 1);
    const victim = vm.getVoice(0)!;
    const level = victim.levelAt('osc1', 1.1);
    vm.noteOn(64, 1, 1.1);
    expect(victim.levelAt('osc1', 1.1)).toBeCloseTo(level, 6);
    expect(victim.levelAt('osc1', 1.105)).toBe(0);
    expect(level).toBeGreaterThan(0.05);
    expect(fake.nodes.length).toBeGreaterThan(0);
  });
});

describe('mono and legato', () => {
  it('LEGATO keeps the envelope and glides from the last pitch', () => {
    const { vm, mark } = setup(4);
    vm.setVoiceMode('legato');
    vm.setGlideTime(0.09);
    const first = mark();
    const voice = vm.noteOn(60, 1, 0)!;
    const oscs = first();
    // The first note doesn't glide (not from 440 Hz, not from anywhere).
    expect(freq(oscs[0]).events.some((e) => e.kind === 'target')).toBe(false);
    expect(freq(oscs[0]).valueAt(0)).toBeCloseTo(midiToFrequency(60), 6);

    const levelBefore = voice.levelAt('osc1', 0.5);
    const more = mark();
    expect(vm.noteOn(64, 1, 0.5)).toBeNull(); // same voice, nothing new
    expect(more()).toHaveLength(0);
    expect(voice.levelAt('osc1', 0.5)).toBeCloseTo(levelBefore, 6);
    const f = freq(oscs[0]);
    expect(f.valueAt(0.5)).toBeCloseTo(midiToFrequency(60), 4);
    expect(f.valueAt(0.5 + 0.3)).toBeCloseTo(midiToFrequency(64), 0);

    // Letting go of the sounding key returns to the held one, gliding.
    vm.noteOff(64, 1);
    expect(f.valueAt(1)).toBeCloseTo(midiToFrequency(64), 4);
    expect(f.valueAt(1.3)).toBeCloseTo(midiToFrequency(60), 0);
    expect(voice.isActive(1.2)).toBe(true);
    vm.noteOff(60, 1.5);
    expect(voice.isReleasing(1.6)).toBe(true);
  });

  it('MONO retriggers the envelope from its current level', () => {
    const { vm, mark } = setup(4);
    vm.setVoiceMode('mono');
    const first = mark();
    const voice = vm.noteOn(60, 1, 0)!;
    vm.noteOn(64, 1, 0.5);
    expect(first()).toHaveLength(2); // osc1's two unison engines, once
    // The attack restarts at 0.5 from where the envelope was, so the level
    // just after is on its way back up rather than at the 0.005 floor.
    const at = voice.levelAt('osc1', 0.5);
    expect(at).toBeGreaterThan(0.1);
    expect(voice.levelAt('osc1', 0.505)).toBeGreaterThan(at);
    expect(voice.noteOnAt).toBe(0.5);
  });

  it('MONO glides a new note from the last played pitch', () => {
    const { vm, mark } = setup(4);
    vm.setVoiceMode('mono');
    vm.setGlideTime(0.09);
    vm.noteOn(60, 1, 0);
    vm.noteOff(60, 0.4);
    const next = mark();
    vm.noteOn(67, 1, 1);
    const f = freq(next()[0]);
    expect(f.valueAt(1)).toBeCloseTo(midiToFrequency(60), 4);
    expect(f.valueAt(1.5)).toBeCloseTo(midiToFrequency(67), 0);
  });
});

describe('UnisonEngine', () => {
  it('creates unison gains at their targets and starts on the given time', () => {
    const fake = fakeOracleContext();
    const unison = new UnisonEngine(fake.ctx, fake.ctx.createGain());
    unison.setVoiceCount(4);
    unison.setBlend(0.1);
    const gainsBefore = fake.ofKind('gain').length;
    unison.start(0.5);
    const gains = fake.ofKind('gain').slice(gainsBefore);
    expect(gains).toHaveLength(4);
    const values = gains.map((g) => param(g, 'gain').value);
    expect(values[2]).toBeCloseTo(0.725, 6); // centre voice
    expect(values[0]).toBeCloseTo(0.275, 6);
    for (const g of gains) expect(param(g, 'gain').events).toHaveLength(0);
    for (const osc of fake.ofKind('oscillator')) {
      expect(fake.startTime(osc)).toBe(0.5);
    }

    unison.stop(1);
    for (const osc of fake.ofKind('oscillator')) {
      expect(fake.stopTime(osc)).toBe(1);
      expect(osc.disconnect).not.toHaveBeenCalled();
    }
    fake.endSources(1);
    for (const osc of fake.ofKind('oscillator')) {
      expect(osc.disconnect).toHaveBeenCalled();
    }
  });
});
