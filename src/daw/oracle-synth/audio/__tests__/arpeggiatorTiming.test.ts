import { afterEach, describe, expect, it, vi } from 'vitest';
import { Arpeggiator } from '../Arpeggiator';
import { ArpParams } from '../types';

const PARAMS: ArpParams = {
  enabled: true,
  rate: '1/8',
  style: 'up',
  distance: 12,
  step: 1,
};

function arp(clock: { now: () => number; live: boolean }) {
  const events: Array<[string, number, number]> = [];
  const a = new Arpeggiator(
    (note, _vel, time) => events.push(['on', note, time]),
    (note, time) => events.push(['off', note, time]),
    clock,
  );
  a.setParams(PARAMS);
  a.setBPM(120); // 1/8 = 0.25 s
  return { a, events };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Arpeggiator on context time', () => {
  it('places every step on the grid from the first key, with no timers offline', () => {
    vi.useFakeTimers();
    // Offline: the clock stays at 0 while the whole song is scheduled.
    const { a, events } = arp({ now: () => 0, live: false });
    a.noteOn(60, 0.8, 1);
    a.noteOn(64, 0.8, 1); // same chord, separate call
    a.noteOff(60, 2);
    a.noteOff(64, 2);
    expect(vi.getTimerCount()).toBe(0);
    expect(events).toEqual([
      ['on', 60, 1],
      ['off', 60, 1.25],
      ['on', 64, 1.25],
      ['off', 64, 1.5],
      ['on', 60, 1.5],
      ['off', 60, 1.75],
      ['on', 64, 1.75],
      ['off', 64, 2],
    ]);
  });

  it('keeps the grid when a key is added mid-step (no restart)', () => {
    const { a, events } = arp({ now: () => 0, live: false });
    a.noteOn(60, 0.8, 0);
    a.noteOn(67, 0.8, 0.3);
    a.allNotesOff(0.8);
    const ons = events.filter((e) => e[0] === 'on').map((e) => e[2]);
    expect(ons).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it('live: a pump schedules steps on the context clock, not the timer', () => {
    vi.useFakeTimers();
    let now = 10;
    const { a, events } = arp({ now: () => now, live: true });
    a.noteOn(60, 0.8, 10);
    a.noteOn(64, 0.8, 10);
    // Timers fire late and unevenly; the step times don't care.
    for (const jump of [0.013, 0.07, 0.031, 0.09, 0.2]) {
      now += jump;
      vi.advanceTimersByTime(25);
    }
    const ons = events.filter((e) => e[0] === 'on').map((e) => e[2]);
    expect(ons.slice(0, 2)).toEqual([10, 10.25]);
    a.allNotesOff(now);
    expect(vi.getTimerCount()).toBe(0);
  });
});
