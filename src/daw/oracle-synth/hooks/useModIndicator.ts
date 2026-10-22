import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { addFrameTask } from '@/daw/engine/engineClock';
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
// every knob module an engine prop. Refcounted per engine because the DAW
// can mount TWO views on the same engine at once (inline strip + full-screen
// pop-out): closing one must not null the slot out from under the other.
// Knob modules subscribe to it: the parent registers the engine after its
// children's effects ran, and a track switch or reload swaps it.
let currentEngine: SynthEngine | null = null;
const engineRefs = new Map<SynthEngine, number>();
const engineListeners = new Set<() => void>();

function setCurrentEngine(engine: SynthEngine | null): void {
  if (engine === currentEngine) return;
  currentEngine = engine;
  engineListeners.forEach((cb) => cb());
}

export function acquireModIndicatorEngine(engine: SynthEngine): void {
  engineRefs.set(engine, (engineRefs.get(engine) ?? 0) + 1);
  setCurrentEngine(engine);
}

export function releaseModIndicatorEngine(engine: SynthEngine): void {
  const refs = (engineRefs.get(engine) ?? 0) - 1;
  if (refs > 0) {
    engineRefs.set(engine, refs);
    return;
  }
  engineRefs.delete(engine);
  if (currentEngine === engine) {
    // Fall back to an engine another view still holds, if any.
    let held: SynthEngine | null = null;
    for (const e of engineRefs.keys()) held = e;
    setCurrentEngine(held);
  }
}

function subscribeEngine(cb: () => void): () => void {
  engineListeners.add(cb);
  return () => {
    engineListeners.delete(cb);
  };
}

const getEngine = () => currentEngine;

function isSourceBipolar(route: ModRoute): boolean {
  return route.source.type === 'audio';
}

/** Static native-offset extremes contributed by one route. */
function routeExtremes(route: ModRoute): [number, number] {
  const bipolar = isSourceBipolar(route);
  const range = getModRange(route.target.param);
  const { gain, offset } = computeGainOffset(
    route.polarity,
    bipolar,
    route.amount,
    range,
  );
  const srcLo = bipolar ? -1 : 0;
  const a = srcLo * gain + offset;
  const b = 1 * gain + offset;
  return [Math.min(a, b), Math.max(a, b)];
}

const LIVE_FPS = 30;
/** The live dot moves when the offset changes by this share of its range. */
const LIVE_STEP = 0.005;

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
  const engine = useSyncExternalStore(subscribeEngine, getEngine, getEngine);

  useEffect(() => {
    if (!lfoRoute || !engine) {
      setLiveOffset(null);
      return;
    }
    const analyser = engine.getLFOAnalyser(lfoRoute.source.index);
    if (!analyser) {
      setLiveOffset(null);
      return;
    }

    const buf = new Float32Array(analyser.fftSize);
    const bipolar = isSourceBipolar(lfoRoute);
    const range = getModRange(lfoRoute.target.param);
    const { gain, offset } = computeGainOffset(
      lfoRoute.polarity,
      bipolar,
      lfoRoute.amount,
      range,
    );
    // Smaller moves than this don't show on the ring: no render for them.
    const [lo, hi] = routeExtremes(lfoRoute);
    const step = Math.abs(hi - lo) * LIVE_STEP;

    // The audible chain shapes the source through the route's curve BEFORE
    // the scaler; the dot must mirror that or it lies for exp/log/scurve.
    const curve = lfoRoute.curve ?? 'linear';

    let shown: number | null = null;
    const stopTask = addFrameTask(
      () => {
        analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
        const v = shapeValue(curve, buf[buf.length - 1]);
        const next = v * gain + offset;
        if (shown !== null && Math.abs(next - shown) <= step) return;
        shown = next;
        setLiveOffset(next);
      },
      { fps: LIVE_FPS, name: 'mod-indicator' },
    );
    return () => {
      stopTask();
      setLiveOffset(null);
    };
  }, [lfoRoute, engine]);

  if (!staticRange) return null;
  return { loOffset: staticRange.lo, hiOffset: staticRange.hi, liveOffset };
}
