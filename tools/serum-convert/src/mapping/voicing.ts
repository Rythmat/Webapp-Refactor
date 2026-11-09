// Global0 + RoutingSlots + Macros → Oracle voicing, routing, macros, master.

import type { FidelityCollector } from '../fidelity.ts';
import type { PresetDataOut } from '../oracleTypes.ts';
import {
  GLOBAL_DEFAULTS,
  masterVolumeToUnit,
  pctToUnit,
  clamp,
} from '../serumDefaults.ts';
import {
  plainParams,
  num,
  str,
  section,
  type SerumDoc,
} from '../serumPreset.ts';

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
  // The mod wheel's resting position (Serum saves it, 0..100): presets with
  // mod-wheel routes sound as saved from the first note.
  const wheel = num(g, 'kParamModWheel', 0);
  if (wheel > 0) preset.modWheel = clamp(wheel / 100, 0, 1);
  fid.mapped(
    `voicing: ${preset.voiceMode} ×${preset.voiceCount}${preset.glide > 0 ? `, glide ${preset.glide.toFixed(2)}s` : ''}`,
  );

  // Filter routing: RoutingSlot order parallels Oscillator0..4
  // (A, B, C, Noise, Sub). kRoutingDestFilter sends the source into the
  // filters; Direct/Master/None leave it out of both filter lists — Oracle
  // then auto-routes it straight to the output bus (Voice.ts bypassBus),
  // which IS "direct". kParamFilterBalance splits a filtered source between
  // Filter 1 (0) and Filter 2 (100); between, it feeds both (audit
  // 2026-10-21: the balance was ignored, so Filter 2 received nothing).
  const sourceIds = ['osc1', 'osc2', 'sub', 'noise'] as const;
  const filter1Sources: string[] = [];
  const filter2Sources: string[] = [];
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
      const balance = num(pp, 'kParamFilterBalance', 0);
      if (balance < 99.5 && !filter1Sources.includes(oracle)) {
        filter1Sources.push(oracle);
      }
      if (balance > 0.5 && !filter2Sources.includes(oracle)) {
        filter2Sources.push(oracle);
      }
    }
  }
  const serial =
    preset.filters[1].enabled &&
    (!preset.filters[0].enabled || preset.filters[0].mix < 0.5);
  preset.routing.filterRouting = {
    // If the preset carried routing info, trust it (even "all direct" → empty).
    // Only fall back to all-into-filter when we saw no routing sections at all.
    filter1Sources: sawRoutingInfo ? filter1Sources : [...sourceIds],
    filter2Sources: sawRoutingInfo ? filter2Sources : [],
    // Series (Filter 1 into Filter 2) only where the patch needs it to
    // sound: Filter 2 on while Filter 1 is all but dry (BA - 303 Reality's
    // Ladder sits on Filter 2 behind a dry Filter 1). Elsewhere the filters
    // stay side by side and the per-source balance decides; a Filter 2 left
    // on unrouted (a 20 Hz lowpass, a high-pass) mustn't close the sound
    // off, as series everywhere did (audit 2026-10-21).
    ...(serial ? { serial: true } : {}),
  };
  // Two resonant filters in series stack their peaks (Web Audio's Q is the
  // peak in dB, where Serum's ladders saturate): each gets half, so the
  // pair peaks about where one did (audit 2026-10-21: BA - Dual MG Bass ran
  // to +11 dB).
  if (serial) {
    for (const f of preset.filters) {
      if (f.resonance > 3) f.resonance = Math.max(3, f.resonance / 2);
    }
  }
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
