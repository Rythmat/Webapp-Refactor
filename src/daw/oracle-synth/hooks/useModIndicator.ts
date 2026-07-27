import { useEffect, useMemo, useState } from 'react';
import { SynthEngine } from '../audio/SynthEngine';
import { computeGainOffset, getModRange } from '../audio/modMath';
import { shapeValue } from '../audio/ModCurves';
import { useSynthStore } from '../store';
import type { ModRoute, ModTarget } from '../audio/types';

/**
 * Modulation indicator data for a destination knob: the range the matrix
 * sweeps the parameter over, plus a live position driven by the first LFO
 * route (polled from an analyser tap at ~30fps). Values are NATIVE-UNIT
 * OFFSETS from the knob's base value (cutoff: cents, resonance: Q, …);
 * call sites convert to their own knob units.
 */
export interface ModIndicator {
  loOffset: number;
  hiOffset: number;
  liveOffset: number | null;
}

// The engine currently bound to the UI (registered by useSyncStoreToEngine).
// A module-level slot mirrors the singleton-store architecture and spares
// every knob module an engine prop. Refcounted because the DAW can mount
// TWO views on the same engine at once (inline strip + full-screen pop-out):
// closing one must not null the slot out from under the other.
let currentEngine: SynthEngine | null = null;
let engineRefs = 0;

export function acquireModIndicatorEngine(engine: SynthEngine): void {
  currentEngine = engine;
  engineRefs++;
}

export function releaseModIndicatorEngine(engine: SynthEngine): void {
  engineRefs = Math.max(0, engineRefs - 1);
  if (engineRefs === 0 && currentEngine === engine) {
    currentEngine = null;
  }
}

function isSourceBipolar(route: ModRoute): boolean {
  return route.source.type === 'audio';
}

/** Static native-offset extremes contributed by one route. */
function routeExtremes(route: ModRoute): [number, number] {
  const bipolar = isSourceBipolar(route);
  const range = getModRange(route.target.param);
  const legacyCutoff =
    route.target.param === 'cutoff' && route.polarity === 'unipolar';
  const { gain, offset } = computeGainOffset(
    route.polarity,
    bipolar,
    route.amount,
    range,
    legacyCutoff,
  );
  const srcLo = bipolar ? -1 : 0;
  const a = srcLo * gain + offset;
  const b = 1 * gain + offset;
  return [Math.min(a, b), Math.max(a, b)];
}

const LIVE_FPS = 30;

export function useModIndicator(
  targetSource: ModTarget['source'],
  targetParam: ModTarget['param'],
): ModIndicator | null {
  const modRoutes = useSynthStore((s) => s.modRoutes);

  const matching = useMemo(
    () =>
      modRoutes.filter(
        (r) =>
          r.enabled &&
          !r.transform && // transform curves have arbitrary output ranges
          r.target.source === targetSource &&
          r.target.param === targetParam,
      ),
    [modRoutes, targetSource, targetParam],
  );

  const staticRange = useMemo(() => {
    if (matching.length === 0) return null;
    let lo = 0;
    let hi = 0;
    for (const route of matching) {
      const [a, b] = routeExtremes(route);
      lo += a;
      hi += b;
    }
    return { lo, hi };
  }, [matching]);

  // Live dot: poll the first LFO route's analyser tap
  const lfoRoute = useMemo(
    () => matching.find((r) => r.source.type === 'lfo') ?? null,
    [matching],
  );
  const [liveOffset, setLiveOffset] = useState<number | null>(null);

  useEffect(() => {
    if (!lfoRoute || !currentEngine) {
      setLiveOffset(null);
      return;
    }
    const analyser = currentEngine.getLFOAnalyser(lfoRoute.source.index);
    if (!analyser) {
      setLiveOffset(null);
      return;
    }

    const buf = new Float32Array(analyser.fftSize);
    const bipolar = isSourceBipolar(lfoRoute);
    const range = getModRange(lfoRoute.target.param);
    const legacyCutoff =
      lfoRoute.target.param === 'cutoff' && lfoRoute.polarity === 'unipolar';
    const { gain, offset } = computeGainOffset(
      lfoRoute.polarity,
      bipolar,
      lfoRoute.amount,
      range,
      legacyCutoff,
    );

    // The audible chain shapes the source through the route's curve BEFORE
    // the scaler; the dot must mirror that or it lies for exp/log/scurve.
    const curve = lfoRoute.curve ?? 'linear';

    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 1000 / LIVE_FPS) return;
      last = t;
      analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
      const v = shapeValue(curve, buf[buf.length - 1]);
      setLiveOffset(v * gain + offset);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setLiveOffset(null);
    };
  }, [lfoRoute]);

  if (!staticRange) return null;
  return { loOffset: staticRange.lo, hiOffset: staticRange.hi, liveOffset };
}
