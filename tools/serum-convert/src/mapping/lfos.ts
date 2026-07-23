// LFO0..9 → Oracle's 4 node-breakpoint LFOs. The 4 most-modulation-used
// Serum LFOs win slots; each LFO's single-cycle curveData becomes an
// Oracle bar shape, replicated to approximate the Serum rate at 120 BPM.

import {
  plainParams,
  num,
  str,
  section,
  type SerumDoc,
} from '../serumPreset.ts';
import { clamp, lfoSyncCyclesPerBar } from '../serumDefaults.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type { CborValue } from '../cbor.ts';
import type { LFONodeOut, PresetDataOut } from '../oracleTypes.ts';

interface SerumLfoCurve {
  x: number[];
  y: number[];
  curve: number[];
}

function readCurveData(
  s: Record<string, CborValue> | undefined,
): SerumLfoCurve | null {
  const cd = s?.curveData;
  if (!cd || typeof cd !== 'object' || Array.isArray(cd)) return null;
  const c = cd as Record<string, CborValue>;
  const x = c.xVals;
  const y = c.yVals;
  const curve = c.curveVals;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length < 2) return null;
  return {
    x: x as number[],
    y: y as number[],
    curve: Array.isArray(curve) ? (curve as number[]) : [],
  };
}

/**
 * One Serum cycle → Oracle bar nodes, replicated k times across the bar.
 * Serum y: 0 = TOP of the editor (full value) — Oracle value = 1 − y.
 * Serum curveVals 0..1 (0.5 = linear) → Oracle curve −1..1.
 */
export function cycleToBar(
  cycle: SerumLfoCurve,
  repeats: number,
  maxNodes = 64,
): LFONodeOut[] {
  const k = clamp(Math.round(repeats), 1, 16);
  const perCycle = cycle.x.length;
  // Node budget: thin the cycle if k×points explodes
  const stride = Math.max(1, Math.ceil((perCycle * k) / maxNodes));
  const nodes: LFONodeOut[] = [];
  for (let rep = 0; rep < k; rep++) {
    for (let i = 0; i < perCycle; i += stride) {
      const t = (rep + clamp(cycle.x[i], 0, 1)) / k;
      const node: LFONodeOut = {
        time: clamp(t, 0, 1),
        value: clamp(1 - cycle.y[i], 0, 1),
      };
      const cv = cycle.curve[i];
      if (typeof cv === 'number' && Math.abs(cv - 0.5) > 0.01) {
        node.curve = clamp((cv - 0.5) * 2, -1, 1);
      }
      nodes.push(node);
    }
  }
  // Close the bar at the cycle's start value for a clean loop
  if (nodes.length && nodes[nodes.length - 1].time < 1) {
    nodes.push({ time: 1, value: nodes[0].value });
  }
  // Ensure strictly non-decreasing time and a node at t=0
  if (nodes[0]?.time !== 0)
    nodes.unshift({ time: 0, value: nodes[0]?.value ?? 0 });
  return nodes;
}

export function selectLfos(
  usage: Map<number, number>,
): Map<number, 0 | 1 | 2 | 3> {
  const ranked = [...usage.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([idx]) => idx);
  const map = new Map<number, 0 | 1 | 2 | 3>();
  ranked.slice(0, 4).forEach((serumIdx, slot) => {
    map.set(serumIdx, slot as 0 | 1 | 2 | 3);
  });
  return map;
}

export function applyLfos(
  preset: PresetDataOut,
  doc: SerumDoc,
  lfoMap: Map<number, 0 | 1 | 2 | 3>,
  usage: Map<number, number>,
  fid: FidelityCollector,
): void {
  const unusedDropped = [...usage.keys()].filter((i) => !lfoMap.has(i));
  if (unusedDropped.length) {
    fid.drop(
      `LFO${unusedDropped.map((i) => i + 1).join('/')} dropped (beyond Oracle's 4)`,
      unusedDropped.length,
    );
  }

  for (const [serumIdx, slot] of lfoMap) {
    const s = section(doc, `LFO${serumIdx}`);
    const pp = plainParams(s);
    const lfoType = str(pp, 'kParamType', 'Normal');
    const cycle = readCurveData(s);

    if (/RandomSH|Lorenz|Rossler|Path/.test(lfoType) || !cycle) {
      // Generative shapes: approximate with a stepped pseudo-random bar
      const steps = 8;
      const nodes: LFONodeOut[] = [];
      for (let i = 0; i < steps; i++) {
        // Deterministic pseudo-random from the LFO index (stable output)
        const v = (((serumIdx + 1) * 2654435761 * (i + 3)) % 1000) / 1000;
        nodes.push({ time: i / steps, value: v, curve: 1 }); // hold-style
        nodes.push({ time: (i + 1) / steps - 0.001, value: v });
      }
      nodes.push({ time: 1, value: nodes[0].value });
      const bar = nodes;
      preset.lfos[slot] = {
        ...preset.lfos[slot],
        bars: [bar, bar, bar, bar],
        smooths: [0, 0, 0, 0],
      };
      fid.approx(
        `LFO${serumIdx + 1} (${lfoType}) → stepped random approximation`,
        // Serum's RandomSH is itself stepped random — a fair match, not a
        // big loss (only the exact random sequence differs).
        0.5,
      );
      continue;
    }

    // Rate: Free mode stores Hz (verified); synced mode uses a calibrated
    // raw→cycles-per-bar map (falls back to quarter-notes uncalibrated).
    const isFree =
      str(pp, 'kParamMode', '') === 'Free' &&
      num(pp, 'kParamBeatSync', 1) < 0.5;
    const rateRaw = num(pp, 'kParamRate', 2);
    const repeats = isFree
      ? clamp(Math.round(rateRaw * 2), 1, 16) // Hz → cycles/bar @120BPM
      : clamp(Math.round(lfoSyncCyclesPerBar(rateRaw)), 1, 16);
    if (isFree) {
      fid.approx(
        `LFO${serumIdx + 1} free rate ${rateRaw.toFixed(1)}Hz → ${repeats} cycles/bar @120BPM`,
        0.5,
      );
    }

    const bar = cycleToBar(cycle, repeats);
    const smooth = clamp(num(pp, 'kParamSmooth', 0) / 100, 0, 1);
    preset.lfos[slot] = {
      ...preset.lfos[slot],
      bars: [bar, bar, bar, bar],
      smooths: [smooth, smooth, smooth, smooth],
    };
    fid.mapped(
      `LFO${serumIdx + 1} → LFO ${slot + 1} (${cycle.x.length} points)`,
    );
  }
}
