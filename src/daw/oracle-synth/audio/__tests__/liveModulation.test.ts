/**
 * Live modulation (liveModulation.ts, SynthEngine's control-rate driver and
 * getLiveModulation): what the routes add to a destination now, with the
 * matrix's maths; the engine driving a wavetable's position per voice from
 * a note's envelope; and the live readout the dock's synth card draws.
 *
 * Run: npx vitest run src/daw/oracle-synth/audio/__tests__/liveModulation.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { liveOffsets, routeOffset } from '../liveModulation';
import { SynthEngine } from '../SynthEngine';
import type { ModRoute } from '../types';
import { fakeOracleContext } from './fakeOracleContext';

const route = (over: Partial<ModRoute>): ModRoute => ({
  id: 'route-1',
  source: { type: 'envelope', index: 1 },
  target: { source: 'osc1', param: 'wtPos' },
  amount: 1,
  polarity: 'unipolar',
  enabled: true,
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe('routeOffset', () => {
  it('sweeps base → base + amount × range for a unipolar route', () => {
    // wtPos's range is 0.5.
    expect(routeOffset(route({}), 0)).toBeCloseTo(0);
    expect(routeOffset(route({}), 1)).toBeCloseTo(0.5);
    expect(routeOffset(route({ amount: 0.5 }), 1)).toBeCloseTo(0.25);
  });

  it('sweeps either side for a bipolar route', () => {
    const r = route({ polarity: 'bipolar' });
    expect(routeOffset(r, 0)).toBeCloseTo(-0.5);
    expect(routeOffset(r, 1)).toBeCloseTo(0.5);
  });

  it('opens a filter with a unipolar cutoff route (no v1 down-sweep)', () => {
    const r = route({ target: { source: 'flt1', param: 'cutoff' } });
    // Cutoff's range is 4800 cents: a full source opens it by all of it.
    expect(routeOffset(r, 0)).toBeCloseTo(0);
    expect(routeOffset(r, 1)).toBeCloseTo(4800);
  });
});

describe('liveOffsets', () => {
  it('sums routes by destination and leaves out what it can’t read', () => {
    const routes = [
      route({ id: 'a', amount: 0.5 }),
      route({ id: 'b', amount: 0.5 }),
      route({ id: 'c', enabled: false }),
      route({ id: 'd', transform: 'scale-quantize' }),
      route({ id: 'e', source: { type: 'audio', index: 0 } }),
    ];
    const offsets = liveOffsets(routes, (r) =>
      r.source.type === 'audio' ? null : 1,
    );
    expect([...offsets]).toEqual([['osc1:wtPos', 0.5]]);
  });

  it('keeps only the destinations asked for', () => {
    const routes = [
      route({ id: 'a' }),
      route({ id: 'b', target: { source: 'flt1', param: 'resonance' } }),
    ];
    const offsets = liveOffsets(
      routes,
      () => 1,
      (r) => r.target.param === 'wtPos',
    );
    expect([...offsets.keys()]).toEqual(['osc1:wtPos']);
  });
});

describe('SynthEngine’s live modulation', () => {
  const setup = async () => {
    const fake = fakeOracleContext();
    const engine = new SynthEngine();
    await engine.init(fake.ctx, { disableMidi: true });
    engine.setEnvelopeParams(1, {
      attack: 1,
      decay: 0.01,
      sustain: 1,
      release: 1,
    });
    return { fake, engine };
  };

  it('reads nothing while no note sounds', async () => {
    const { engine } = await setup();
    engine.setModRoutes([route({})]);
    expect(engine.getLiveModulation()).toBeNull();
    engine.releaseResources();
  });

  it('follows a note’s envelope, and drives the wavetable position per voice', async () => {
    const { fake, engine } = await setup();
    engine.setModRoutes([route({})]);
    engine.setOscillatorParams(0, { wtPosition: 0.2 });
    const voices = (
      engine as unknown as {
        voiceManager: {
          getActiveVoices(): { setOscillatorParams: () => void }[];
        };
      }
    ).voiceManager;

    engine.noteOn(60, 1, 0);
    fake.setTime(0.5);
    const half = engine.getLiveModulation()?.get('osc1:wtPos') ?? 0;
    fake.setTime(1.5);
    const full = engine.getLiveModulation()?.get('osc1:wtPos') ?? 0;
    // The attack climbs: halfway in, then the whole 0.5 range at the top.
    expect(half).toBeGreaterThan(0.1);
    expect(half).toBeLessThan(full);
    expect(full).toBeCloseTo(0.5, 1);

    const [voice] = voices.getActiveVoices();
    const set = vi.spyOn(voice, 'setOscillatorParams');
    (engine as unknown as { tickControlRate(): void }).tickControlRate();
    // The patch's 0.2 plus the envelope's 0.5.
    expect(set).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ wtPosition: expect.closeTo(0.7, 1) }),
    );
    engine.releaseResources();
  });

  it('stops driving once no route aims at a JS destination', async () => {
    const { engine } = await setup();
    engine.setModRoutes([route({})]);
    const timer = () =>
      (engine as unknown as { controlRateTimer: unknown }).controlRateTimer;
    expect(timer()).not.toBeNull();
    engine.setModRoutes([
      route({ target: { source: 'flt1', param: 'cutoff' } }),
    ]);
    expect(timer()).toBeNull();
    engine.releaseResources();
  });
});
