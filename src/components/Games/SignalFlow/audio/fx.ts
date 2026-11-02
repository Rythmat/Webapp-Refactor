import { CompressorPedal } from '@/daw/audio/pedals/CompressorPedal';
import { DelayPedal } from '@/daw/audio/pedals/DelayPedal';
import { OverdrivePedal } from '@/daw/audio/pedals/OverdrivePedal';
import type { PedalProcessor } from '@/daw/audio/pedals/PedalProcessor';
import { dbToGain, type FxKind } from '../rig/rigTypes';

// ── The processors a route can hold ────────────────────────────────────────
// The Studio's own pedals where they fit. The amp is local: all it needs from
// an amp sim is a soft clip and a speaker's shape, and the Studio's sim would
// bring its NAM worklet along for nothing.

export interface Fx {
  input: AudioNode;
  output: AudioNode;
  setParams(params: Readonly<Record<string, number>>): void;
  setBypassed(bypassed: boolean): void;
  dispose(): void;
}

const softClipCurve = (() => {
  let curve: Float32Array<ArrayBuffer> | null = null;
  return () => {
    if (curve) return curve;
    const samples = 2048;
    curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(3 * x);
    }
    return curve;
  };
})();

/** A pedal, trimmed so engaging it keeps roughly the level it was given. */
function pedalFx(
  ctx: AudioContext,
  pedal: PedalProcessor,
  trimDb: number,
  baseParams: Readonly<Record<string, number>> = {},
): Fx {
  const trim = ctx.createGain();
  trim.gain.value = dbToGain(trimDb);
  pedal.getOutputNode().connect(trim);
  pedal.updateParams({ ...baseParams });
  return {
    input: pedal.getInputNode(),
    output: trim,
    setParams: (params) => pedal.updateParams({ ...baseParams, ...params }),
    setBypassed: (bypassed) => {
      pedal.setEnabled(!bypassed);
      trim.gain.value = bypassed ? 1 : dbToGain(trimDb);
    },
    dispose: () => {
      pedal.dispose();
      trim.disconnect();
    },
  };
}

function ampDrive(ctx: AudioContext): Fx {
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.curve = softClipCurve();
  shaper.oversample = '2x';
  const out = ctx.createGain();
  out.gain.value = 0.3;
  pre.connect(shaper);
  shaper.connect(out);
  return {
    input: pre,
    output: out,
    setParams: (params) => {
      pre.gain.value = dbToGain(params.gainDb ?? 0);
    },
    setBypassed: () => {},
    dispose: () => {
      pre.disconnect();
      shaper.disconnect();
      out.disconnect();
    },
  };
}

/** A 12-inch speaker in a box: no deep lows, no fizz, a little bite. */
function cabinet(ctx: AudioContext): Fx {
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = 85;
  const bite = ctx.createBiquadFilter();
  bite.type = 'peaking';
  bite.frequency.value = 2400;
  bite.Q.value = 1;
  bite.gain.value = 3;
  const high = ctx.createBiquadFilter();
  high.type = 'lowpass';
  high.frequency.value = 4600;
  high.Q.value = 0.8;
  low.connect(bite);
  bite.connect(high);
  return {
    input: low,
    output: high,
    setParams: () => {},
    setBypassed: () => {},
    dispose: () => {
      low.disconnect();
      bite.disconnect();
      high.disconnect();
    },
  };
}

/** A laptop's own speakers: nothing below the mids. */
function tinySpeaker(ctx: AudioContext): Fx {
  const low = ctx.createBiquadFilter();
  low.type = 'highpass';
  low.frequency.value = 800;
  low.Q.value = 1.4;
  const high = ctx.createBiquadFilter();
  high.type = 'lowpass';
  high.frequency.value = 6000;
  const trim = ctx.createGain();
  trim.gain.value = dbToGain(-8);
  low.connect(high);
  high.connect(trim);
  return {
    input: low,
    output: trim,
    setParams: () => {},
    setBypassed: () => {},
    dispose: () => {
      low.disconnect();
      high.disconnect();
      trim.disconnect();
    },
  };
}

/** A sparse scatter of clicks, for a buffer too small for the computer. */
function crackleBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < 26; i++) {
    const at = Math.floor(Math.random() * (length - 40));
    const sign = Math.random() < 0.5 ? -1 : 1;
    for (let k = 0; k < 24; k++) data[at + k] = sign * (1 - k / 24);
  }
  return buffer;
}

/** The computer's round trip: a real delay, as you'd feel it playing. */
function latency(ctx: AudioContext): Fx {
  const input = ctx.createGain();
  const delay = ctx.createDelay(0.25);
  const output = ctx.createGain();
  const crackle = ctx.createGain();
  crackle.gain.value = 0;
  input.connect(delay);
  delay.connect(output);
  crackle.connect(output);
  const clicks = ctx.createBufferSource?.();
  if (clicks) {
    clicks.buffer = crackleBuffer(ctx);
    clicks.loop = true;
    clicks.connect(crackle);
    clicks.start();
  }
  return {
    input,
    output,
    setParams: (params) => {
      delay.delayTime.value = params.seconds ?? 0;
      crackle.gain.value = params.crackle ? dbToGain(-24) : 0;
    },
    setBypassed: () => {},
    dispose: () => {
      clicks?.stop();
      clicks?.disconnect();
      input.disconnect();
      delay.disconnect();
      crackle.disconnect();
      output.disconnect();
    },
  };
}

export function createFx(ctx: AudioContext, kind: FxKind): Fx {
  switch (kind) {
    case 'compressor':
      // The native node adds its own makeup gain; this takes it back out.
      return pedalFx(ctx, new CompressorPedal(ctx), -10);
    case 'overdrive':
      // The curve saturates hard at instrument level; the volume is the trim.
      return pedalFx(ctx, new OverdrivePedal(ctx), 0, {
        tone: 0.55,
        volume: 0.14,
      });
    case 'delay':
      return pedalFx(ctx, new DelayPedal(ctx), 1);
    case 'ampDrive':
      return ampDrive(ctx);
    case 'cabinet':
      return cabinet(ctx);
    case 'tinySpeaker':
      return tinySpeaker(ctx);
    case 'latency':
      return latency(ctx);
  }
}
