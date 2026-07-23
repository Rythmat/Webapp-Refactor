// Env0..3 → Oracle's two ADSRs. Env0 is Serum's amp envelope → envelopes[0];
// the most-modulation-used of Env1..3 becomes Oracle's mod envelope.

import { plainParams, num, section, type SerumDoc } from '../serumPreset.ts';
import { ENV_DEFAULTS, clamp } from '../serumDefaults.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type { EnvelopeParamsOut, PresetDataOut } from '../oracleTypes.ts';

function readEnv(
  doc: SerumDoc,
  index: number,
): EnvelopeParamsOut & { hold: number } {
  const pp = plainParams(section(doc, `Env${index}`));
  return {
    attack: clamp(num(pp, 'kParamAttack', ENV_DEFAULTS.kParamAttack), 0.001, 5),
    hold: num(pp, 'kParamHold', ENV_DEFAULTS.kParamHold),
    decay: num(pp, 'kParamDecay', ENV_DEFAULTS.kParamDecay),
    sustain: clamp(num(pp, 'kParamSustain', ENV_DEFAULTS.kParamSustain), 0, 1),
    release: clamp(
      num(pp, 'kParamRelease', ENV_DEFAULTS.kParamRelease),
      0.001,
      10,
    ),
  };
}

export function applyEnvelopes(
  preset: PresetDataOut,
  doc: SerumDoc,
  modEnvIndex: number | null,
  fid: FidelityCollector,
): void {
  const amp = readEnv(doc, 0);
  preset.envelopes[0] = {
    attack: amp.attack,
    // Oracle has no Hold stage — fold it into decay (the sustain plateau
    // start moves earlier, but total shape time is preserved)
    decay: clamp(amp.decay + amp.hold, 0.001, 5),
    sustain: amp.sustain,
    release: amp.release,
  };
  if (amp.hold > 0.01) {
    fid.approx(`amp env hold ${amp.hold.toFixed(2)}s folded into decay`, 0.5);
  }
  fid.mapped('amp envelope (Env1)');

  if (modEnvIndex !== null) {
    const mod = readEnv(doc, modEnvIndex);
    preset.envelopes[1] = {
      attack: mod.attack,
      decay: clamp(mod.decay + mod.hold, 0.001, 5),
      sustain: mod.sustain,
      release: mod.release,
    };
    fid.mapped(`mod envelope (Env${modEnvIndex + 1})`);
  }
}
