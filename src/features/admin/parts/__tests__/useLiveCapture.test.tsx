// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PartNote } from '@/curriculum/engine/parts/part';
import { useLiveCapture } from '../useLiveCapture';

/**
 * Live capture from a MIDI keyboard: overlapping keys each ring until their
 * own release, and the sustain pedal holds released keys on — heard and
 * written — until it comes up.
 */

/** A MIDI input: an EventTarget that 'midimessage' events go out on. */
const input = Object.assign(new EventTarget(), { name: 'Fake Keys' });
const send = (...data: number[]) =>
  act(() => {
    input.dispatchEvent(
      Object.assign(new Event('midimessage'), { data: new Uint8Array(data) }),
    );
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  vi.stubGlobal('navigator', {
    requestMIDIAccess: async () =>
      Object.assign(new EventTarget(), {
        inputs: new Map([['fake', input]]),
      }),
  });
  let tick = 0;
  const notes: PartNote[] = [];
  const on: number[] = [];
  const off: number[] = [];
  const hook = renderHook(() =>
    useLiveCapture({
      active: true,
      length: 1920 * 4,
      quantize: 0,
      currentTick: () => tick,
      onNote: (n) => notes.push(n),
      monitorOn: (m) => on.push(m),
      monitorOff: (m) => off.push(m),
    }),
  );
  return { hook, notes, on, off, at: (t: number) => (tick = t) };
}

describe('live capture', () => {
  it('lets each overlapping key ring until its own release', async () => {
    const { hook, notes, off, at } = setup();
    await waitFor(() =>
      expect(hook.result.current.inputs).toEqual(['Fake Keys']),
    );
    at(0);
    send(0x90, 60, 100);
    at(240);
    send(0x90, 64, 100);
    at(480);
    send(0x80, 60, 0);
    // Letting go of C leaves E sounding.
    expect(off).toEqual([60]);
    at(960);
    send(0x80, 64, 0);
    expect(off).toEqual([60, 64]);
    expect(notes.map((n) => [n.midi, n.tick, n.duration])).toEqual([
      [60, 0, 480],
      [64, 240, 720],
    ]);
  });

  it('holds released keys on under the sustain pedal, to its release', async () => {
    const { hook, notes, off, at } = setup();
    await waitFor(() => expect(hook.result.current.inputs).toHaveLength(1));
    at(0);
    send(0xb0, 64, 127);
    send(0x90, 60, 100);
    at(120);
    send(0x80, 60, 0);
    at(240);
    send(0x90, 67, 100);
    at(360);
    send(0x80, 67, 0);
    // Both still ring.
    expect(off).toEqual([]);
    expect(notes).toEqual([]);
    at(1920);
    send(0xb0, 64, 0);
    expect(off.sort()).toEqual([60, 67]);
    expect(
      notes.map((n) => [n.midi, n.duration]).sort((a, b) => a[0] - b[0]),
    ).toEqual([
      [60, 1920],
      [67, 1680],
    ]);
  });

  it('ends a ringing key when it is struck again under the pedal', async () => {
    const { hook, notes, on, off, at } = setup();
    await waitFor(() => expect(hook.result.current.inputs).toHaveLength(1));
    at(0);
    send(0xb0, 64, 127);
    send(0x90, 60, 100);
    send(0x80, 60, 0);
    at(480);
    send(0x90, 60, 90);
    expect(notes.map((n) => [n.tick, n.duration])).toEqual([[0, 480]]);
    expect(off).toEqual([60]);
    expect(on).toEqual([60, 60]);
  });
});
