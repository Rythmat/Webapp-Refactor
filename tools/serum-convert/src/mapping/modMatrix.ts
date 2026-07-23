// ModSlot0..63 analysis + conversion to Oracle modRoutes.
//
// Serum mod-source enum (empirically confirmed against factory presets —
// see plan "Verified format facts"): 1=ModWheel, 2..5=Env1..4, 6..15=LFO1..10,
// 16=Velocity (probable), 17=Note (probable), 25..32=Macro1..8.

import { plainParams, num, section, type SerumDoc } from '../serumPreset.ts';
import { amountToUnit } from '../serumDefaults.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type { ModRouteOut } from '../oracleTypes.ts';

export interface ModSlotInfo {
  slot: number;
  sourceMain: number;
  sourceAux: number;
  destType: string;
  destID: number;
  destParam: string;
  amount: number; // −100..100
  bipolar: boolean;
  bypass: boolean;
}

export function analyzeModSlots(doc: SerumDoc): ModSlotInfo[] {
  const slots: ModSlotInfo[] = [];
  for (let i = 0; i < 64; i++) {
    const s = section(doc, `ModSlot${i}`);
    if (!s) continue;
    const src = s.source;
    if (!Array.isArray(src) || typeof src[0] !== 'number') continue; // inactive
    const pp = plainParams(s);
    slots.push({
      slot: i,
      sourceMain: src[0] as number,
      sourceAux: (src[1] as number) ?? 0,
      destType: String(s.destModuleTypeString ?? ''),
      destID: typeof s.destModuleID === 'number' ? s.destModuleID : 0,
      destParam: String(s.destModuleParamName ?? ''),
      amount: num(pp, 'kParamAmount', 0),
      bipolar: num(pp, 'kParamBipolar', 0) > 0.5,
      bypass: num(pp, 'kParamBypass', 0) > 0.5,
    });
  }
  return slots.filter((s) => !s.bypass && s.amount !== 0);
}

/** Census: which Serum LFO indices (0-based) are used by active slots, by count. */
export function lfoUsage(slots: ModSlotInfo[]): Map<number, number> {
  const use = new Map<number, number>();
  for (const s of slots) {
    if (s.sourceMain >= 6 && s.sourceMain <= 15) {
      const idx = s.sourceMain - 6;
      use.set(idx, (use.get(idx) ?? 0) + 1);
    }
  }
  return use;
}

/** Census: which Serum env indices 1..3 (0-based, excluding amp Env0) are used. */
export function envUsage(slots: ModSlotInfo[]): Map<number, number> {
  const use = new Map<number, number>();
  for (const s of slots) {
    if (s.sourceMain >= 3 && s.sourceMain <= 5) {
      const idx = s.sourceMain - 2; // env index 1..3
      use.set(idx, (use.get(idx) ?? 0) + 1);
    }
  }
  return use;
}

export interface Selections {
  /** Serum Oscillator index (0..2) → Oracle osc slot (0|1) */
  oscMap: Map<number, 0 | 1>;
  /** Serum LFO index (0..9) → Oracle LFO slot (0..3) */
  lfoMap: Map<number, 0 | 1 | 2 | 3>;
  /** Serum env index (1..3) chosen as Oracle's mod envelope */
  modEnvIndex: number | null;
}

function describeSource(main: number): string {
  if (main === 1) return 'ModWheel';
  if (main >= 2 && main <= 5) return `Env${main - 1}`;
  if (main >= 6 && main <= 15) return `LFO${main - 5}`;
  if (main === 16) return 'Velocity';
  if (main === 17) return 'Note';
  if (main >= 25 && main <= 32) return `Macro${main - 24}`;
  return `source#${main}`;
}

interface OracleSourceRef {
  type: string;
  index: number;
}

function mapSource(
  main: number,
  sel: Selections,
): OracleSourceRef | { unmappable: string } {
  if (main === 1) return { type: 'modwheel', index: 0 };
  if (main === 2) return { type: 'envelope', index: 0 }; // amp env
  if (main >= 3 && main <= 5) {
    const envIdx = main - 2;
    if (sel.modEnvIndex === envIdx) return { type: 'envelope', index: 1 };
    return { unmappable: `${describeSource(main)} (not the chosen mod env)` };
  }
  if (main >= 6 && main <= 15) {
    const slot = sel.lfoMap.get(main - 6);
    if (slot !== undefined) return { type: 'lfo', index: slot };
    return { unmappable: `${describeSource(main)} (beyond Oracle's 4 LFOs)` };
  }
  if (main === 16) return { type: 'velocity', index: 0 };
  if (main === 17) return { type: 'keytrack', index: 0 };
  if (main >= 25 && main <= 32) return { type: 'macro', index: main - 25 };
  return { unmappable: describeSource(main) };
}

interface OracleTargetRef {
  source: string;
  param: string;
}

function mapTarget(
  s: ModSlotInfo,
  sel: Selections,
): OracleTargetRef[] | { unmappable: string } {
  const { destType, destID, destParam } = s;

  if (destType === 'Oscillator') {
    if (destID === 4) {
      // Sub
      if (destParam === 'kParamVolume')
        return [{ source: 'sub', param: 'level' }];
      if (destParam === 'kParamPan') return [{ source: 'sub', param: 'pan' }];
      if (destParam === 'kParamFine' || destParam === 'kParamCoarsePit') {
        return [{ source: 'sub', param: 'detune' }];
      }
      return { unmappable: `Sub ${destParam}` };
    }
    if (destID === 3) {
      // Noise
      if (destParam === 'kParamVolume')
        return [{ source: 'noise', param: 'level' }];
      if (destParam === 'kParamPan') return [{ source: 'noise', param: 'pan' }];
      return { unmappable: `Noise ${destParam}` };
    }
    const slot = sel.oscMap.get(destID);
    if (slot === undefined) {
      return {
        unmappable: `Osc ${'ABC'[destID] ?? destID} ${destParam} (osc dropped)`,
      };
    }
    const osc = slot === 0 ? 'osc1' : 'osc2';
    if (destParam === 'kParamVolume') return [{ source: osc, param: 'level' }];
    if (destParam === 'kParamPan') return [{ source: osc, param: 'pan' }];
    if (destParam === 'kParamFine' || destParam === 'kParamCoarsePit') {
      return [{ source: osc, param: 'detune' }];
    }
    return { unmappable: `Osc ${'ABC'[destID]} ${destParam}` };
  }

  if (destType === 'WTOsc') {
    if (destParam === 'kParamTablePos') {
      // Oracle drives WT position at control rate (useWtPosModulation).
      const slot = sel.oscMap.get(destID);
      if (slot === undefined) {
        return {
          unmappable: `WT position (osc ${'ABC'[destID] ?? destID} dropped)`,
        };
      }
      return [{ source: slot === 0 ? 'osc1' : 'osc2', param: 'wtPos' }];
    }
    return {
      unmappable: `WT ${destParam.replace(/^kParam/, '')} modulation (no Oracle target)`,
    };
  }

  if (destType === 'VoiceFilter') {
    const flt = destID === 1 ? 'flt2' : 'flt1';
    if (destParam === 'kParamFreq') return [{ source: flt, param: 'cutoff' }];
    if (destParam === 'kParamReso')
      return [{ source: flt, param: 'resonance' }];
    if (destParam === 'kParamLevelOut')
      return [{ source: flt, param: 'level' }];
    return { unmappable: `Filter ${destParam}` };
  }

  if (destType === 'Global' && destParam === 'kParamVoiceAmp') {
    // Per-voice amp: env0→VoiceAmp is Oracle's built-in amp envelope
    // (handled implicitly); other sources → both osc levels.
    return [
      { source: 'osc1', param: 'level' },
      { source: 'osc2', param: 'level' },
    ];
  }

  return { unmappable: `${destType}.${destParam}` };
}

/** Macros (unmodulated) sit at a fixed value → their contribution to a target
 *  Oracle can't model is deterministic, so it's noted rather than dropped. */
function isStaticSource(main: number): boolean {
  return main >= 25 && main <= 32; // Macro1..8
}

/** True when neither source nor target maps into Oracle's space. */
function mapTargetIsUnmappable(s: ModSlotInfo, sel: Selections): boolean {
  return 'unmappable' in mapTarget(s, sel);
}

/** Penalty weight for a dropped mod route, by how audible its loss is. */
function droppedRoutePenalty(destType: string, destParam: string): number {
  // Target is an FX Oracle doesn't model — the FX itself is already
  // penalized where it's dropped, so the route adds almost nothing.
  if (destType.startsWith('FX')) return 0.1;
  // Macro-modulates-macro: the macro's own destinations are mapped directly.
  if (destType === 'Macro') return 0.15;
  // Envelope-parameter modulation: unusual, subtle, no Oracle equivalent.
  if (destType === 'Env') return 0.4;
  // Warp modulation — warp itself is already dropped in the oscillator map.
  if (destType === 'WTOsc' && /Warp/.test(destParam)) return 0.3;
  return 0.5;
}

export function mapModRoutes(
  slots: ModSlotInfo[],
  sel: Selections,
  macroValues: number[],
  fid: FidelityCollector,
): { routes: ModRouteOut[] } {
  const routes: ModRouteOut[] = [];
  let counter = 0;

  for (const s of slots) {
    const srcDesc = describeSource(s.sourceMain);
    const destDesc = `${s.destType}.${s.destParam}`;

    // Amp envelope → VoiceAmp is Oracle's built-in behavior, not a route
    if (
      s.sourceMain === 2 &&
      s.destType === 'Global' &&
      s.destParam === 'kParamVoiceAmp'
    ) {
      fid.mapped(`Env1 → VoiceAmp (Oracle's built-in amp envelope)`);
      continue;
    }

    // Static-source handling: a macro sits at a fixed value, so its
    // contribution to a target Oracle CAN'T model is deterministic — the
    // shipped sound only loses macroVal·amount, and a macro at rest (very
    // common) loses nothing audible, just the live control. (WT position is
    // no longer such a case: it's now a real control-rate target, so a
    // macro→wtPos route falls through to normal routing below.)
    if (isStaticSource(s.sourceMain) && mapTargetIsUnmappable(s, sel)) {
      const macroVal = macroValues[s.sourceMain - 25] ?? 0;
      const engaged = Math.abs(macroVal * amountToUnit(s.amount));
      fid.approx(
        `${srcDesc} → ${destDesc}: static macro contribution (${(macroVal * 100) | 0}%) not modeled`,
        0.1 + engaged * 0.6,
      );
      continue;
    }

    const src = mapSource(s.sourceMain, sel);
    if ('unmappable' in src) {
      fid.drop(`mod route ${srcDesc} → ${destDesc}: ${src.unmappable}`, 0.5);
      continue;
    }
    const targets = mapTarget(s, sel);
    if ('unmappable' in targets) {
      fid.drop(
        `mod route ${srcDesc} → ${destDesc}: ${targets.unmappable}`,
        droppedRoutePenalty(s.destType, s.destParam),
      );
      continue;
    }
    if (s.sourceAux !== 0) {
      fid.approx(
        `mod route ${srcDesc} → ${destDesc}: aux source dropped`,
        0.15,
      );
    }

    for (const target of targets) {
      routes.push({
        id: `serum-${++counter}`,
        source: { type: src.type, index: src.index },
        target,
        amount: amountToUnit(s.amount),
        polarity: s.bipolar ? 'bipolar' : 'unipolar',
        curve: 'linear',
        enabled: true,
      });
    }
    fid.mapped(`mod route ${srcDesc} → ${destDesc}`);
  }
  return { routes };
}
