// VoiceFilter0/1 → Oracle's two biquad filters. Serum has 45+ filter models;
// Oracle has 8 biquad types — bucket by dominant behavior, report approximations.

import {
  plainParams,
  num,
  str,
  section,
  type SerumDoc,
} from '../serumPreset.ts';
import {
  FILTER_DEFAULTS,
  filterFreqToHz,
  resoToQ,
  pctToUnit,
} from '../serumDefaults.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type { FilterType, PresetDataOut } from '../oracleTypes.ts';

interface TypeBucket {
  type: FilterType;
  exact: boolean;
}

/** Serum filter-type string → nearest biquad. Order matters (prefix tests). */
export function bucketFilterType(serumType: string): TypeBucket {
  const t = serumType;
  // Exact-behavior families
  if (/^L(6|12|24)/.test(t)) return { type: 'lowpass', exact: true };
  if (/^H(6|12|24)/.test(t)) return { type: 'highpass', exact: true };
  if (/^(B12|B24|BP)/.test(t)) return { type: 'bandpass', exact: true };
  if (/^(BN|N12|N24)|BandReject/.test(t)) return { type: 'notch', exact: true };
  // Analog-model lowpasses
  if (
    /^(MgL|LadderMg|LadderEMS|LadderAcid|DirtyMg|Scream|French|German)/.test(t)
  ) {
    return { type: 'lowpass', exact: false };
  }
  // Phasers / allpass
  if (/^(Phase|Allpass)/.test(t)) return { type: 'allpass', exact: false };
  // Combs / flangers → strongest peak region ≈ bandpass
  if (/^(Comb|Flange|Diffuser|Reverb)/.test(t)) {
    return { type: 'bandpass', exact: false };
  }
  // Formants → vowel peak ≈ bandpass
  if (/^Formant/.test(t)) return { type: 'bandpass', exact: false };
  // Shelving / EQ-ish
  if (/LowShelf|Shelf.*L/i.test(t)) return { type: 'lowshelf', exact: true };
  if (/HighShelf|Shelf.*H/i.test(t)) return { type: 'highshelf', exact: true };
  if (/Peak|EQ|AddBass/i.test(t)) return { type: 'peaking', exact: false };
  return { type: 'lowpass', exact: false };
}

export function applyFilters(
  preset: PresetDataOut,
  doc: SerumDoc,
  fid: FidelityCollector,
): void {
  for (let i = 0 as 0 | 1; i < 2; i++) {
    const s = section(doc, `VoiceFilter${i}`);
    const pp = plainParams(s);
    const enabled = num(pp, 'kParamEnable', 0) > 0.5; // default OFF (verified)
    if (!enabled) continue;

    const serumType = str(pp, 'kParamType', 'L12');
    const bucket = bucketFilterType(serumType);
    preset.filters[i] = {
      type: bucket.type,
      cutoff: filterFreqToHz(num(pp, 'kParamFreq', FILTER_DEFAULTS.kParamFreq)),
      resonance: resoToQ(num(pp, 'kParamReso', FILTER_DEFAULTS.kParamReso)),
      pan: 0,
      gain: 0,
      mix: pctToUnit(num(pp, 'kParamWet', FILTER_DEFAULTS.kParamWet)),
      enabled: true,
    };
    if (bucket.exact) {
      fid.mapped(`Filter ${i + 1}: ${serumType} → ${bucket.type}`);
    } else {
      fid.approx(
        `Filter ${i + 1}: ${serumType} → ${bucket.type} approximation`,
        1,
      );
    }
    const drive = num(pp, 'kParamDrive', 0);
    if (drive > 5) {
      fid.approx(
        `Filter ${i + 1} drive ${Math.round(drive)}% → master drive FX`,
        0.5,
      );
      // Fold filter drive into the master drive effect (best available slot)
      preset.fx.drive.enabled = true;
      preset.fx.drive.amount = Math.max(preset.fx.drive.amount, drive / 100);
      preset.fx.drive.mix = Math.max(preset.fx.drive.mix, 0.4);
    }
  }
}
