import { afterEach, describe, expect, it, vi } from 'vitest';
import { TonewheelOrganEngine } from '../TonewheelOrganEngine';

// ── The organ releases on the audio clock (instruments-06, -18) ───────────
// allNotesOff and panic ignored the time they were given, and a released
// voice came apart on a wall-clock setTimeout: before a scheduled release
// had even begun, or mid-tail during an offline render.

type Call = [node: string, method: string, ...args: unknown[]];

/** A stand-in Web Audio graph: every node accepts any call; the calls that
 *  matter here (stop, disconnect, onended) are logged, and assignments are kept. */
function fakeContext(calls: Call[]) {
  let nextId = 0;
  const make = (kind: string): unknown => {
    const id = `${kind}${nextId++}`;
    const store: Record<PropertyKey, unknown> = {};
    const target = function () {} as unknown as Record<PropertyKey, unknown>;
    const proxy: unknown = new Proxy(target, {
      get(_t, prop) {
        if (prop in store) return store[prop];
        if (prop === Symbol.toPrimitive) return () => 0;
        if (prop === 'then') return undefined;
        if (prop === 'stop' || prop === 'disconnect') {
          return (...args: unknown[]) => calls.push([id, prop, ...args]);
        }
        if (typeof prop === 'string' && prop.startsWith('create')) {
          return () => make(prop.slice(6).toLowerCase());
        }
        if (prop === 'connect') return () => proxy;
        const child = make(`${id}.${String(prop)}`);
        store[prop] = child;
        return child;
      },
      set(_t, prop, value) {
        store[prop] = value;
        if (prop === 'onended') calls.push([id, 'onended', value]);
        return true;
      },
      apply() {
        return proxy;
      },
    });
    return proxy;
  };
  const ctx = make('ctx') as Record<string, unknown>;
  ctx.sampleRate = 48000;
  ctx.currentTime = 3;
  return ctx as unknown as AudioContext;
}

async function playingOrgan(calls: Call[]) {
  const ctx = fakeContext(calls);
  const organ = new TonewheelOrganEngine();
  await organ.init(ctx, {} as AudioNode);
  organ.noteOn(60, 100, 1);
  calls.length = 0;
  return organ;
}

const oscStops = (calls: Call[]) =>
  calls.filter(([node, method]) => node.startsWith('osc') && method === 'stop');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TonewheelOrganEngine release', () => {
  it('allNotesOff fades from the time given, not from now', async () => {
    const calls: Call[] = [];
    const organ = await playingOrgan(calls);
    organ.allNotesOff(4);
    const stops = oscStops(calls);
    expect(stops.length).toBe(9);
    for (const [, , t] of stops) expect(t).toBeCloseTo(4.1, 6);
  });

  it('panic cuts at the time given', async () => {
    const calls: Call[] = [];
    const organ = await playingOrgan(calls);
    organ.panic(6);
    const stops = oscStops(calls);
    expect(stops.length).toBe(9);
    expect(stops.every(([, , t]) => t === 6)).toBe(true);
  });

  it('with no time, releases from the context clock', async () => {
    const calls: Call[] = [];
    const organ = await playingOrgan(calls);
    organ.allNotesOff();
    expect(oscStops(calls).every(([, , t]) => t === 3 + 0.1)).toBe(true);
  });

  it('a voice comes apart when its sources end, not on a timer', async () => {
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const calls: Call[] = [];
    const ctx = fakeContext(calls);
    const organ = new TonewheelOrganEngine();
    await organ.init(ctx, {} as AudioNode);
    organ.noteOn(60, 100, 1);
    calls.length = 0;
    timer.mockClear();

    organ.noteOff(60, 8);
    expect(timer).not.toHaveBeenCalled();
    expect(calls.some(([, method]) => method === 'disconnect')).toBe(false);

    const handlers = calls.filter(([, method]) => method === 'onended');
    expect(handlers.length).toBe(1);
    (handlers[0][2] as () => void)();
    const disconnected = calls.filter(([, method]) => method === 'disconnect');
    // 9 tonewheels, 9 drawbar gains and the voice mixer.
    expect(disconnected.length).toBe(19);
  });
});
