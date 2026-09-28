import { describe, expect, it } from 'vitest';
import { currentEventForMidi, nextEventForMidi } from '../noteGate';

/**
 * The scenario these guard is the real funk L2 D1.1 variant D1-A: left hand
 * plays an octave pop under a right-hand stab, so the LH root is still ringing
 * when the next note is due. Two hands, overlapping notes, no clock.
 */

// Bar 1 of D1-A, verbatim from funk_v2.ts.
const BAR_1 = [
  { id: 'lh_c2', midi: 36, startTicks: 0, durationTicks: 380 }, // LH root, rings on
  { id: 'rh_eb3', midi: 51, startTicks: 0, durationTicks: 120 },
  { id: 'rh_g3', midi: 55, startTicks: 0, durationTicks: 120 },
  { id: 'rh_bb3', midi: 58, startTicks: 0, durationTicks: 120 },
  { id: 'rh_d4', midi: 62, startTicks: 0, durationTicks: 120 },
  { id: 'lh_c3', midi: 48, startTicks: 240, durationTicks: 120 }, // octave pop
  { id: 'lh_c2_b3', midi: 36, startTicks: 960, durationTicks: 380 },
  { id: 'rh_eb3_b3', midi: 51, startTicks: 960, durationTicks: 120 },
];

const none = new Set<string>();

describe('the free-time note gate', () => {
  it('opens on every note of the first onset, both hands at once', () => {
    expect(currentEventForMidi(BAR_1, 36, none)?.event.id).toBe('lh_c2');
    expect(currentEventForMidi(BAR_1, 51, none)?.event.id).toBe('rh_eb3');
    expect(currentEventForMidi(BAR_1, 62, none)?.event.id).toBe('rh_d4');
  });

  it('refuses a note from a later onset while the first is unplayed', () => {
    // The octave pop at 240 cannot be claimed before the downbeat.
    expect(currentEventForMidi(BAR_1, 48, none)).toBeNull();
  });

  it('lets the other hand through while a note is still held', () => {
    // THE BUG. LH C2 is held — correctly, it is a 380-tick note — and the RH
    // stab has been played and released. Before the fix the held C2 kept the
    // gate pinned at onset 0, so the octave pop at 240 was rejected and the
    // student's correct playing was ignored until they lifted the finger.
    const completed = new Set(['rh_eb3', 'rh_g3', 'rh_bb3', 'rh_d4']);
    const held = new Set(['lh_c2']);
    expect(currentEventForMidi(BAR_1, 48, completed, held)?.event.id).toBe(
      'lh_c3',
    );
  });

  it('still refuses to skip ahead when nothing is held', () => {
    // Same completed set, but the finger has lifted without credit. The gate
    // stays shut at onset 0 — a held note buys progress, an abandoned one does
    // not.
    const completed = new Set(['rh_eb3', 'rh_g3', 'rh_bb3', 'rh_d4']);
    expect(currentEventForMidi(BAR_1, 48, completed, none)).toBeNull();
  });

  it('does not let a held note unlock the whole rest of the step', () => {
    // Holding the downbeat frees onset 240 and nothing beyond it.
    const held = new Set(['lh_c2']);
    const completed = new Set(['rh_eb3', 'rh_g3', 'rh_bb3', 'rh_d4']);
    expect(currentEventForMidi(BAR_1, 48, completed, held)?.event.id).toBe(
      'lh_c3',
    );
    // Beat 3 is two onsets away and stays locked.
    expect(currentEventForMidi(BAR_1, 51, completed, held)).toBeNull();
  });

  it('holds the gate open for a sustained note in either direction', () => {
    // RH sustaining, LH moving — the mirror image of the reported case.
    const held = new Set(['rh_eb3', 'rh_g3', 'rh_bb3', 'rh_d4']);
    const completed = new Set(['lh_c2']);
    expect(currentEventForMidi(BAR_1, 48, completed, held)?.event.id).toBe(
      'lh_c3',
    );
  });

  it('claims nothing for a pitch that is not written', () => {
    expect(currentEventForMidi(BAR_1, 99, none)).toBeNull();
    expect(currentEventForMidi(BAR_1, 99, none, new Set(['lh_c2']))).toBeNull();
  });

  it('gives the same pitch its next occurrence, not the one already credited', () => {
    const completed = new Set([
      'lh_c2',
      'rh_eb3',
      'rh_g3',
      'rh_bb3',
      'rh_d4',
      'lh_c3',
    ]);
    expect(currentEventForMidi(BAR_1, 36, completed)?.event.id).toBe(
      'lh_c2_b3',
    );
  });

  it('returns nothing once every note is accounted for', () => {
    const all = new Set(BAR_1.map((e) => e.id));
    expect(currentEventForMidi(BAR_1, 36, all)).toBeNull();
  });

  it('reports the index alongside the event', () => {
    expect(currentEventForMidi(BAR_1, 51, none)?.index).toBe(1);
  });
});

describe('the in-time path', () => {
  it('takes the next uncompleted occurrence without an onset gate', () => {
    // In time the playhead enforces order, so a later onset is reachable.
    expect(nextEventForMidi(BAR_1, 48, none)?.event.id).toBe('lh_c3');
  });

  it('advances past what is already credited', () => {
    expect(nextEventForMidi(BAR_1, 36, new Set(['lh_c2']))?.event.id).toBe(
      'lh_c2_b3',
    );
  });
});
