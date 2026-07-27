// Orchestrates one .SerumPreset → Oracle PresetData conversion.
// Order matters: the mod-slot census drives which oscillators/LFOs/envelope
// win Oracle's smaller slot budget, and mod-route mapping needs those picks.

import { createCollector, type FidelityReport } from './fidelity.ts';
import { applyEnvelopes } from './mapping/envelopes.ts';
import { applyFilters } from './mapping/filters.ts';
import { applyFx } from './mapping/fx.ts';
import { selectLfos, applyLfos } from './mapping/lfos.ts';
import {
  analyzeModSlots,
  lfoUsage,
  envUsage,
  mapModRoutes,
  type Selections,
} from './mapping/modMatrix.ts';
import {
  gatherOscillators,
  selectOscillators,
  applyOscillators,
} from './mapping/oscillators.ts';
import { applyVoicing } from './mapping/voicing.ts';
import { defaultPreset, type PresetDataOut } from './oracleTypes.ts';
import { parseSerumPreset, type SerumDoc } from './serumPreset.ts';

export interface ConversionResult {
  preset: PresetDataOut;
  report: FidelityReport;
  doc: SerumDoc;
  /** Pack tables referenced by the converted oscillators — either a
   *  library file to extract or frames embedded in the preset itself. */
  wavetables: {
    name: string;
    sourcePath: string | null;
    embeddedFrames: number[][] | null;
  }[];
}

export function convertPreset(
  filePath: string,
  category = '',
): ConversionResult {
  const doc = parseSerumPreset(filePath);
  const fid = createCollector();
  const name = doc.meta.presetName.toUpperCase();
  const preset = defaultPreset(name);

  // 1. Census
  const slots = analyzeModSlots(doc);
  const lfoUse = lfoUsage(slots);
  const envUse = envUsage(slots);

  // 2. Selections
  const oscs = gatherOscillators(doc);
  const { chosen, oscMap, subCandidate, noiseCandidate } = selectOscillators(
    oscs,
    fid,
  );
  const lfoMap = selectLfos(lfoUse);
  const modEnvIndex =
    [...envUse.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const sel: Selections = { oscMap, lfoMap, modEnvIndex };

  // 3. Domain mapping
  applyOscillators(preset, doc, chosen, subCandidate, noiseCandidate, fid);
  applyFilters(preset, doc, fid);
  applyEnvelopes(preset, doc, modEnvIndex, fid);
  applyLfos(preset, doc, lfoMap, lfoUse, fid);
  applyFx(preset, doc, fid);
  applyVoicing(preset, doc, oscMap, fid);

  // 4. Mod routes (needs all selections; macro values inform static-source
  //    handling for targets Oracle can't model)
  const { routes } = mapModRoutes(
    slots,
    sel,
    preset.macros.map((m) => m.value),
    fid,
  );
  preset.modRoutes = routes;

  const wavetables = chosen
    .filter((o) => o.tableName && (o.tablePath || o.embeddedFrames))
    .map((o) => ({
      name: o.tableName!,
      sourcePath: o.tablePath,
      embeddedFrames: o.embeddedFrames,
    }));

  return {
    preset,
    report: fid.finish(doc.meta.presetName, category),
    doc,
    wavetables,
  };
}
