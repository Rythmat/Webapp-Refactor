// ── The synthetic reverb impulse response (cached by rate, type and decay) ──
// The instant IR the reverb uses until the bundled real one (reverbIR.ts) has
// decoded. Cached per `${sampleRate}:${type}:${decay}` and shared by every
// chain, so a type's noise is drawn once per page.

import type { ReverbType } from '../../EffectChain';

const irCache = new Map<string, AudioBuffer>();

export function generateImpulseResponse(
  ctx: AudioContext,
  decay: number,
  type: ReverbType = 'hall',
): AudioBuffer {
  const quantizedDecay = Math.round(decay * 10) / 10;
  const key = `${ctx.sampleRate}:${type}:${quantizedDecay}`;

  let buffer = irCache.get(key);
  if (buffer) return buffer;

  const sampleRate = ctx.sampleRate;
  const length = Math.round(sampleRate * Math.max(0.1, quantizedDecay));
  buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;

      switch (type) {
        case 'hall': {
          // Long, smooth decay with gradual onset and wide stereo
          const onset = Math.min(1, t / 0.03); // 30ms build-up
          const stereoSpread = ch === 0 ? 1 : 0.85 + Math.random() * 0.15;
          data[i] =
            noise *
            onset *
            Math.exp((-2.5 * t) / quantizedDecay) *
            stereoSpread;
          break;
        }
        case 'room': {
          // Short early reflections, tighter stereo, faster decay
          const earlyRef = t < 0.015 ? 0.6 + Math.random() * 0.4 : 1;
          data[i] = noise * earlyRef * Math.exp((-4 * t) / quantizedDecay);
          break;
        }
        case 'chamber': {
          // Dense early reflections, warm mid-range
          const density = 1 + 0.3 * Math.sin(t * 200);
          data[i] = noise * density * Math.exp((-3 * t) / quantizedDecay);
          break;
        }
        case 'plate': {
          // Very dense, bright, instant onset — high-density noise
          const brightness = 1 + 0.15 * Math.sin(t * 800);
          data[i] = noise * brightness * Math.exp((-3.5 * t) / quantizedDecay);
          break;
        }
        case 'spring': {
          // Metallic, bouncy — comb filter resonance
          const combDelay = Math.round(sampleRate * 0.0037); // ~3.7ms comb
          const combSample = i > combDelay ? data[i - combDelay] * 0.4 : 0;
          data[i] =
            (noise + combSample) * Math.exp((-4.5 * t) / quantizedDecay);
          break;
        }
      }
    }
  }

  irCache.set(key, buffer);
  return buffer;
}
