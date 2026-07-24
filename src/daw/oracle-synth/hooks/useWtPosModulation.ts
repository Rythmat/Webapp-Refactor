import { useEffect } from 'react';
import { SynthEngine } from '../audio/SynthEngine';
import { useSynthStore } from '../store';
import { computeGainOffset, getModRange } from '../audio/modMath';
import { shapeValue } from '../audio/ModCurves';
import type { ModRoute } from '../audio/types';

/**
 * Control-rate driver for wavetable-position and unison-blend modulation.
 *
 * These two targets can't live in the audio modulation matrix: WT position is
 * a discrete-frame crossfade computed in JS, and unison blend is a JS gain
 * recalculation — neither is an AudioParam, so the matrix silently ignores
 * routes aimed at them. Instead we poll each such route's source at ~30fps and
 * push `engine.setOscillatorParams`, which fans the value to every voice.
 *
 * This mirrors Vital, where `osc_wave_frame` is modulated at block rate and the
 * oscillator interpolates between adjacent frames across the block — a smooth
 * sweep from a control-rate value (mtytel/vital, synth_oscillator.cpp).
 *
 * Practical sources are macro / LFO / mod-wheel (global scalars). Per-voice
 * sources (envelope / velocity / keytrack) and audio-rate sources have no
 * single global value to read here and are skipped.
 *
 * When no wtPos/blend routes exist the loop is inert, so the normal
 * store→engine sync stays in sole control of these params.
 */

const LIVE_FPS = 30;

function oscIndexOf(source: ModRoute['target']['source']): 0 | 1 | null {
  if (source === 'osc1') return 0;
  if (source === 'osc2') return 1;
  return null; // sub/noise/filters have no wtPos/blend
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function useWtPosModulation(engine: SynthEngine | null): void {
  useEffect(() => {
    if (!engine) return;
    let raf = 0;
    let last = 0;
    const bufs = new Map<number, Float32Array>();

    const readSource = (route: ModRoute): number | null => {
      const s = useSynthStore.getState();
      switch (route.source.type) {
        case 'macro':
          return s.macros[route.source.index]?.value ?? null;
        case 'modwheel':
          return s.modWheel;
        case 'lfo': {
          const analyser = engine.getLFOAnalyser(route.source.index);
          if (!analyser) return null;
          let buf = bufs.get(route.source.index);
          if (!buf || buf.length !== analyser.fftSize) {
            buf = new Float32Array(analyser.fftSize);
            bufs.set(route.source.index, buf);
          }
          analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
          return buf[buf.length - 1];
        }
        default:
          return null; // envelope / velocity / keytrack / audio → not readable here
      }
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 1000 / LIVE_FPS) return;
      last = t;

      const s = useSynthStore.getState();
      // Accumulate offsets per "oscIndex:param" so multiple routes sum.
      const offsets = new Map<string, number>();
      for (const route of s.modRoutes) {
        if (!route.enabled) continue;
        if (route.target.param !== 'wtPos' && route.target.param !== 'blend') {
          continue;
        }
        const oscIndex = oscIndexOf(route.target.source);
        if (oscIndex === null) continue;
        const src = readSource(route);
        if (src === null) continue;

        const range = getModRange(route.target.param);
        const { gain, offset } = computeGainOffset(
          route.polarity,
          false, // macro/lfo/modwheel are unipolar 0..1
          route.amount,
          range,
        );
        const shaped = shapeValue(route.curve ?? 'linear', src);
        const contribution = shaped * gain + offset;
        // Never let a NaN (e.g. an un-migrated route with an undefined amount,
        // or a bad source read) reach an AudioParam — a single NaN target
        // poisons the gain node to silence on every voice.
        if (!Number.isFinite(contribution)) continue;
        const key = `${oscIndex}:${route.target.param}`;
        offsets.set(key, (offsets.get(key) ?? 0) + contribution);
      }

      if (offsets.size === 0) return; // nothing to drive → leave sync in control

      for (const [key, off] of offsets) {
        const [idxStr, param] = key.split(':');
        const oscIndex = Number(idxStr) as 0 | 1;
        const base = s.oscillators[oscIndex];
        if (param === 'wtPos') {
          engine.setOscillatorParams(oscIndex, {
            wtPosition: clamp01(base.wtPosition + off),
          });
        } else {
          engine.setOscillatorParams(oscIndex, {
            unisonBlend: clamp01(base.unisonBlend + off),
          });
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);
}
