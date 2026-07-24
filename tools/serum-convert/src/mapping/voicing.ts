// Global0 + RoutingSlots + Macros → Oracle voicing, routing, macros, master.

import {
  plainParams,
  num,
  str,
  section,
  type SerumDoc,
} from '../serumPreset.ts';
import {
  GLOBAL_DEFAULTS,
  masterVolumeToUnit,
  pctToUnit,
  clamp,
} from '../serumDefaults.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type { PresetDataOut } from '../oracleTypes.ts';

export function applyVoicing(
  preset: PresetDataOut,
  doc: SerumDoc,
  oscMap: Map<number, 0 | 1>,
  fid: FidelityCollector,
): void {
  const g = plainParams(section(doc, 'Global0'));

  const mono = num(g, 'kParamMonoToggle', 0) > 0.5;
  const legato = num(g, 'kParamLegato', 0) > 0.5;
  preset.voiceMode = mono ? (legato ? 'legato' : 'mono') : 'poly';
  preset.voiceCount = clamp(
    Math.round(num(g, 'kParamPolyCount', GLOBAL_DEFAULTS.kParamPolyCount)),
    1,
    16,
  );
  preset.glide = clamp(
    num(g, 'kParamPortamentoTime', GLOBAL_DEFAULTS.kParamPortamentoTime),
    0,
    2,
  );
  preset.masterVolume = masterVolumeToUnit(
    num(g, 'kParamMasterVolume', GLOBAL_DEFAULTS.kParamMasterVolume),
  );
  fid.mapped(
    `voicing: ${preset.voiceMode} ×${preset.voiceCount}${preset.glide > 0 ? `, glide ${preset.glide.toFixed(2)}s` : ''}`,
  );

  // Filter routing: RoutingSlot order parallels Oscillator0..4
  // (A, B, C, Noise, Sub). kRoutingDestFilter → Filter 1; Direct/Master/None
  // leave the source out of both filter lists — Oracle then auto-routes it
  // straight to the output bus (Voice.ts bypassBus), which IS "direct". The
  // single-valued dest enum can't distinguish Filter 1 vs 2, so everything
  // filtered lands on Filter 1 (Oracle's primary); filter2 stays unused.
  const sourceIds = ['osc1', 'osc2', 'sub', 'noise'] as const;
  const filter1Sources: string[] = [];
  let sawRoutingInfo = false;
  const slotToOracle = (slot: number): string | null => {
    if (slot === 3) return 'noise';
    if (slot === 4) return 'sub';
    const mapped = oscMap.get(slot);
    return mapped === undefined ? null : mapped === 0 ? 'osc1' : 'osc2';
  };
  for (let slot = 0; slot < 5; slot++) {
    const oracle = slotToOracle(slot);
    if (!oracle) continue;
    const routingSection = section(doc, `RoutingSlot${slot}`);
    if (routingSection) sawRoutingInfo = true;
    const pp = plainParams(routingSection);
    const dest = str(pp, 'kParamRoutingDest', 'kRoutingDestFilter');
    // Only Filter routes through Oracle's filter; Direct/Master/None bypass.
    if (dest === 'kRoutingDestFilter') {
      if (!filter1Sources.includes(oracle)) filter1Sources.push(oracle);
    }
  }
  preset.routing.filterRouting = {
    // If the preset carried routing info, trust it (even "all direct" → empty).
    // Only fall back to all-into-filter when we saw no routing sections at all.
    filter1Sources: sawRoutingInfo ? filter1Sources : [...sourceIds],
    filter2Sources: [],
  };
  preset.routing.envelopeRouting = {
    env1Sources: [...sourceIds],
    env2Sources: [],
  };

  // Macros
  for (let i = 0; i < 8; i++) {
    const m = section(doc, `Macro${i}`);
    if (!m) continue;
    const name =
      typeof m.name === 'string' && m.name.trim()
        ? m.name.trim().toUpperCase().slice(0, 12)
        : `MACRO ${i + 1}`;
    preset.macros[i] = {
      name,
      value: pctToUnit(num(plainParams(m), 'kParamValue', 0)),
    };
  }
  const named = preset.macros.filter(
    (m) => !m.name.startsWith('MACRO '),
  ).length;
  if (named > 0) fid.mapped(`${named} named macros`);
}
