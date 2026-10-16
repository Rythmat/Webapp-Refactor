/**
 * The console's metronome and clock for live capture: a short square click,
 * accented on the downbeat, a one-bar count-in, and where the transport is
 * as it's heard. The Parts editor and the Band editor both capture with it.
 */

import * as Tone from 'tone';

export function makeClick(): Tone.Synth {
  return new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    volume: -12,
  }).toDestination();
}

/** Every beat of a meter across `length` ticks (PPQ 480), downbeats marked. */
export function clickBeats(
  timeSignature: readonly [number, number],
  length: number,
): { tick: number; downbeat: boolean }[] {
  const bar = (1920 * timeSignature[0]) / timeSignature[1];
  const beat = bar / timeSignature[0];
  const out: { tick: number; downbeat: boolean }[] = [];
  for (let t = 0; t < length; t += beat)
    out.push({ tick: Math.round(t), downbeat: Math.round(t) % bar === 0 });
  return out;
}

/**
 * A click every beat on the transport, looping with it; the returned
 * function takes it off. `at` turns a tick (PPQ 480) into transport time.
 */
export function scheduleClicks(
  synth: Tone.Synth,
  timeSignature: readonly [number, number],
  length: number,
  at: (tick: number) => string,
): () => void {
  const part = new Tone.Part(
    (time, ev: { time: string; downbeat: boolean }) =>
      synth.triggerAttackRelease(ev.downbeat ? 'C6' : 'G5', 0.03, time),
    clickBeats(timeSignature, length).map((b) => ({
      time: at(b.tick),
      downbeat: b.downbeat,
    })),
  );
  part.start(0);
  return () => {
    try {
      part.stop();
      part.dispose();
    } catch {
      /* already gone */
    }
  };
}

/** One bar of clicks, then `then` — a count-in. */
export async function countIn(
  timeSignature: readonly [number, number],
  bpm: number,
  then: () => void,
): Promise<void> {
  if (Tone.getContext().state !== 'running') await Tone.start();
  const click = makeClick();
  const beats = timeSignature[0];
  const beat = (60 / bpm) * (4 / timeSignature[1]);
  const t0 = Tone.now() + 0.1;
  for (let i = 0; i < beats; i++)
    click.triggerAttackRelease(i === 0 ? 'C6' : 'G5', 0.03, t0 + i * beat);
  window.setTimeout(
    () => {
      then();
      window.setTimeout(() => click.dispose(), 500);
    },
    (0.1 + beats * beat - 0.05) * 1000,
  );
}

/**
 * Where the transport is as it's heard right now, in transport ticks.
 * `transport.ticks` reads the scheduler, which runs Tone's look-ahead
 * (0.1 s) in front of the speakers, and the speakers add their own output
 * latency: a player keeping time with what they hear would be written
 * that much late — about a 16th note. This is the position of the sound
 * leaving the speakers now, which is what a key pressed in time meets.
 */
export function heardTransportTicks(): number {
  const raw = Tone.getContext().rawContext as AudioContext;
  const latency = (raw.outputLatency || 0) + (raw.baseLatency || 0);
  return Tone.getTransport().getTicksAtTime(
    Math.max(0, Tone.immediate() - latency),
  );
}
