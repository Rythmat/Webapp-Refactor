// Oscillator selection + mapping: Serum's 3 main oscs (+ dedicated Sub and
// Noise) → Oracle's 2 wavetable oscs + sub + noise.

import { basename } from 'node:path';
import {
  plainParams,
  num,
  str,
  section,
  type SerumDoc,
  type Params,
} from '../serumPreset.ts';
import {
  OSC_DEFAULTS,
  panToUnit,
  pctToUnit,
  tablePosToUnit,
  foldPitch,
  detuneModeScale,
  clamp,
} from '../serumDefaults.ts';
import type { FidelityCollector } from '../fidelity.ts';
import type {
  PresetDataOut,
  BasicWaveform,
  OscWarpMode,
} from '../oracleTypes.ts';

const WT_FRAME_SIZE = 2048;

/**
 * Serum osc-engine (`kParamType`) → canonical engine. Serum may store the WT
 * engine as `kOsc_WT` or omit it (sparse default); both mean wavetable. Sub /
 * Noise main-osc engines are recoverable into Oracle's dedicated sub/noise;
 * Sample / MultiSample / Granular / Spectral have no Oracle equivalent.
 */
function normalizeEngine(raw: string): string {
  if (raw === 'wavetable' || raw === 'kOsc_WT') return 'wavetable';
  if (raw === 'kOsc_Sub') return 'sub';
  if (raw === 'kOsc_Noise') return 'noise';
  return raw;
}

/**
 * Serum warp menu (`kParamWarpMenu`) → Oracle warp mode. Token names verified
 * against 626 Factory presets (the serialized strings differ from the binary's
 * bare enum names — distortion warps carry a `kDist` prefix). Distortion-family
 * warps become live waveshapers; phase-family warps are pre-baked into the
 * wavetable frames. FM/RM/AM/PD modulation-osc warps and filter/remap warps
 * have no Oracle path and fall through to a drop.
 */
const WARP_MAP: Record<string, OscWarpMode> = {
  // phase family (pre-baked)
  kSync: 'sync',
  kHardSync: 'sync',
  kSoftSync: 'sync',
  kBendPos: 'bend',
  kBendNeg: 'bend',
  kBendPosNeg: 'bend',
  kPWM: 'pwm',
  kQuantize: 'quantize',
  kFlip: 'flip',
  kASYMPos: 'squeeze',
  kASYMNeg: 'squeeze',
  kASYMPosNeg: 'squeeze',
  // distortion family (live waveshaper) — `kDist*` serialized names
  kDistHardClip: 'hardclip',
  kDistSoftClip: 'softclip',
  kDistTube: 'tube',
  kDistStompBox: 'tube',
  kDistAsym: 'tube',
  kDistSoftSat: 'tapesat',
  kDistTapeSat: 'tapesat',
  kDistDiode1: 'diode',
  kDistDiode2: 'diode',
  kDistRectify: 'rectify',
  kDistSineShaper: 'sineshaper',
  kDistLinFold: 'fold',
  kDistSinFold: 'fold',
  kDistDownsample: 'crush',
};

/** Serum waveform enum → Oracle basic waveform (Oracle has no pulse). */
const WAVEFORM_MAP: Record<string, BasicWaveform> = {
  kSine: 'sine',
  kTriangle: 'triangle',
  kSaw: 'sawtooth',
  kSawtooth: 'sawtooth',
  kSquare: 'square',
  kPulse: 'square',
};

export function mapWarp(
  warpMenu: string,
  warpAmt: number,
): { mode: OscWarpMode; amount: number } | { drop: string } | null {
  if (!warpMenu || warpAmt <= 0.01) return null;
  const mode = WARP_MAP[warpMenu];
  if (mode) return { mode, amount: clamp(warpAmt, 0, 1) };
  return { drop: warpMenu.replace(/^k/, '') };
}

/** Best-effort sub/basic waveform from whichever shape key the section holds. */
function shapeWaveform(params: Params, fallback: BasicWaveform): BasicWaveform {
  const raw =
    str(params, 'kParamWave', '') ||
    str(params, 'kParamShape', '') ||
    str(params, 'kParamWaveForm', '');
  return WAVEFORM_MAP[raw] ?? fallback;
}

interface SerumOscInfo {
  index: number; // 0..2 = A..C
  letter: string;
  params: Params;
  engine: string; // 'wavetable' | kOsc_* string
  enabled: boolean;
  volume: number;
  tableName: string | null; // pack-namespaced
  tablePath: string | null; // relative path as stored (file-referenced tables)
  /** Frames embedded directly in the preset ("Embedded-Data" presets). */
  embeddedFrames: number[][] | null;
  numFrames: number;
  wtParams: Params;
}

export function gatherOscillators(doc: SerumDoc): SerumOscInfo[] {
  const out: SerumOscInfo[] = [];
  const presetName = doc.meta.presetName;
  for (let i = 0; i < 3; i++) {
    const osc = section(doc, `Oscillator${i}`);
    if (!osc) continue;
    const pp = plainParams(osc);
    const engine = str(pp, 'kParamType', 'wavetable');
    // Default enable: Osc A on, B/C off
    const enabled = num(pp, 'kParamEnable', i === 0 ? 1 : 0) > 0.5;
    const wt = osc[`WTOsc${i}`];
    const wtSection =
      wt && typeof wt === 'object' && !Array.isArray(wt)
        ? (wt as Record<string, unknown>)
        : {};
    const tablePath =
      typeof wtSection.relativePathToWT === 'string'
        ? wtSection.relativePathToWT
        : null;

    // Presets can embed their wavetable instead of referencing a file
    let embeddedFrames: number[][] | null = null;
    const embedded = wtSection.embeddedWTData;
    if (Array.isArray(embedded) && embedded.length >= WT_FRAME_SIZE) {
      const frameCount = Math.floor(embedded.length / WT_FRAME_SIZE);
      embeddedFrames = [];
      for (let f = 0; f < frameCount; f++) {
        embeddedFrames.push(
          (embedded as number[]).slice(
            f * WT_FRAME_SIZE,
            (f + 1) * WT_FRAME_SIZE,
          ),
        );
      }
    }

    const tableName = embeddedFrames
      ? `S2/${presetName} ${'ABC'[i]}`
      : tablePath
        ? packTableName(tablePath)
        : null;

    out.push({
      index: i,
      letter: 'ABC'[i],
      params: pp,
      engine: normalizeEngine(engine),
      enabled,
      volume: num(pp, 'kParamVolume', OSC_DEFAULTS.kParamVolume),
      tableName,
      tablePath,
      embeddedFrames,
      numFrames:
        typeof wtSection.numFrames === 'number' ? wtSection.numFrames : 0,
      wtParams: plainParams(wt),
    });
  }
  return out;
}

/** Pack-namespaced table name from a Serum relative path. */
export function packTableName(relativePath: string): string {
  const base = basename(relativePath).replace(/\.wav$/i, '');
  return `S2/${base}`;
}

function isSubLike(osc: SerumOscInfo): boolean {
  const name = (osc.tablePath ?? '').toLowerCase();
  const octave = num(osc.params, 'kParamOctave', 0);
  return /sine|sub|basic shapes/.test(name) && octave <= -1;
}

/** Selects up to 2 wavetable oscs for Oracle (by loudness), reporting drops.
 *  Sub/Noise-engine main oscs are recovered into Oracle's dedicated sub/noise
 *  rather than dropped. */
export function selectOscillators(
  oscs: SerumOscInfo[],
  fid: FidelityCollector,
): {
  chosen: SerumOscInfo[];
  oscMap: Map<number, 0 | 1>;
  subCandidate: SerumOscInfo | null;
  noiseCandidate: SerumOscInfo | null;
} {
  const active = oscs.filter((o) => o.enabled);
  const wavetable = active.filter((o) => o.engine === 'wavetable');

  // Engine-based recovery for non-wavetable main oscillators.
  let subFromEngine: SerumOscInfo | null = null;
  let noiseCandidate: SerumOscInfo | null = null;
  for (const o of active) {
    if (o.engine === 'wavetable') continue;
    if (o.engine === 'sub' && !subFromEngine) {
      subFromEngine = o;
      fid.mapped(`Osc ${o.letter} → sub oscillator (Sub engine)`);
    } else if (o.engine === 'noise' && !noiseCandidate) {
      noiseCandidate = o;
      fid.mapped(`Osc ${o.letter} → noise (Noise engine)`);
    } else {
      fid.drop(
        `Osc ${o.letter} dropped: ${o.engine.replace('kOsc_', '')} engine (no Oracle equivalent)`,
        3,
      );
    }
  }

  const ranked = [...wavetable].sort((a, b) => b.volume - a.volume);
  const chosen = ranked.slice(0, 2).sort((a, b) => a.index - b.index);
  const oscMap = new Map<number, 0 | 1>();
  chosen.forEach((o, slot) => oscMap.set(o.index, slot as 0 | 1));

  // Prefer an explicit Sub-engine osc; else fold the first sub-like extra.
  let subCandidate: SerumOscInfo | null = subFromEngine;
  for (const extra of ranked.slice(2)) {
    if (!subCandidate && isSubLike(extra)) {
      subCandidate = extra;
      fid.approx(
        `Osc ${extra.letter} folded into Oracle's sub oscillator (sub-like table)`,
        0.5,
      );
    } else {
      // A silent oscillator is barely a loss; a loud one is a real gap
      const penalty = extra.volume < 0.02 ? 0.2 : 1 + extra.volume * 3;
      fid.drop(
        `Osc ${extra.letter} dropped (level ${extra.volume.toFixed(2)}) — Oracle has 2 oscillators`,
        penalty,
      );
    }
  }
  return { chosen, oscMap, subCandidate, noiseCandidate };
}

export function applyOscillators(
  preset: PresetDataOut,
  doc: SerumDoc,
  chosen: SerumOscInfo[],
  subCandidate: SerumOscInfo | null,
  noiseCandidate: SerumOscInfo | null,
  fid: FidelityCollector,
): void {
  chosen.forEach((o, slot) => {
    const p = o.params;
    const pitch = foldPitch(
      num(p, 'kParamOctave', 0),
      num(p, 'kParamCoarsePit', 0),
    );

    // Warp → live waveshaper (distortion) or pre-baked frame transform (phase)
    const warpMenu = str(o.wtParams, 'kParamWarpMenu', '');
    const warpAmt = num(o.wtParams, 'kParamWarp', 0);
    const warp = mapWarp(warpMenu, warpAmt);
    let warpMode: OscWarpMode = 'none';
    let warpAmount = 0;
    if (warp && 'mode' in warp) {
      warpMode = warp.mode;
      warpAmount = warp.amount;
      fid.mapped(
        `Osc ${o.letter} warp ${warpMenu.replace(/^k/, '')} → ${warp.mode}`,
      );
    } else if (warp && 'drop' in warp) {
      fid.drop(
        `Osc ${o.letter} warp ${warp.drop} (${Math.round(warpAmt * 100)}%) dropped (no Oracle equivalent)`,
        1 + warpAmt,
      );
    }

    const detuneMode = str(p, 'kParamDetuneMode', 'kDetuneLinear');
    preset.oscillators[slot] = {
      waveform: 'sawtooth', // fallback when the pack table is missing
      wavetable: o.tableName ?? 'SAWTOOTH',
      octave: pitch.octave,
      semitone: pitch.semitone,
      fine: clamp(num(p, 'kParamFine', 0), -100, 100),
      wtPosition: tablePosToUnit(num(o.wtParams, 'kParamTablePos', 0)),
      pan: panToUnit(num(p, 'kParamPan', 0)),
      level: clamp(o.volume, 0, 1),
      unisonVoices: clamp(Math.round(num(p, 'kParamUnison', 1)), 1, 16),
      unisonDetune: clamp(
        num(p, 'kParamDetune', OSC_DEFAULTS.kParamDetune) *
          detuneModeScale(detuneMode),
        0,
        1,
      ),
      unisonBlend: clamp(num(p, 'kParamDetuneWid', 50) / 100, 0, 1),
      warpMode,
      warpAmount,
      enabled: true,
    };
    fid.mapped(
      `Osc ${o.letter} → osc${slot + 1} (${o.tableName ?? 'basic'}, level ${o.volume.toFixed(2)})`,
    );
  });
  if (chosen.length < 2) preset.oscillators[1].enabled = chosen.length > 1;
  if (chosen.length === 0) {
    fid.drop('no wavetable oscillators — osc1 left at default saw', 4);
  }

  // Serum's dedicated Sub (Oscillator4) — or a folded sub-like main osc
  const subSection = section(doc, 'Oscillator4');
  const subPP = plainParams(subSection);
  const subEnabled = num(subPP, 'kParamEnable', 0) > 0.5;
  const subSource = subEnabled ? subPP : subCandidate?.params;
  if (subSource) {
    const pitch = foldPitch(
      clamp(num(subSource, 'kParamOctave', -1), -2, -1),
      num(subSource, 'kParamCoarsePit', 0),
    );
    preset.subOscillator = {
      waveform: shapeWaveform(subSource, 'sine'),
      octave: clamp(pitch.octave, -2, -1),
      semitone: clamp(pitch.semitone, -12, 12),
      fine: clamp(num(subSource, 'kParamFine', 0), -100, 100),
      level: clamp(
        num(subSource, 'kParamVolume', OSC_DEFAULTS.kParamVolume),
        0,
        1,
      ),
      pan: panToUnit(num(subSource, 'kParamPan', 0)),
      enabled: true,
    };
    fid.mapped(subEnabled ? 'Sub oscillator' : 'Sub (folded from main osc)');
  }

  // Noise: dedicated Oscillator3, or a main osc whose engine is Noise.
  const noiseSection = section(doc, 'Oscillator3');
  const noisePP = plainParams(noiseSection);
  const noise3Enabled = num(noisePP, 'kParamEnable', 0) > 0.5;
  const noiseSource = noise3Enabled ? noisePP : noiseCandidate?.params;
  if (noiseSource) {
    const inner = noise3Enabled ? noiseSection?.NoiseOsc3 : undefined;
    const samplePath =
      inner && typeof inner === 'object' && !Array.isArray(inner)
        ? String(
            (inner as Record<string, unknown>).relativePathToNoiseSample ?? '',
          )
        : '';
    const isPink = /pink/i.test(samplePath);
    preset.noise = {
      type: isPink ? 'pink' : 'white',
      level: clamp(num(noiseSource, 'kParamVolume', 0.3), 0, 1),
      pan: panToUnit(num(noiseSource, 'kParamPan', 0)),
      enabled: true,
    };
    if (samplePath && !/white|pink/i.test(samplePath)) {
      fid.approx(
        `noise sample "${samplePath}" → ${isPink ? 'pink' : 'white'} noise`,
        1,
      );
    } else {
      fid.mapped(
        noise3Enabled ? 'noise oscillator' : 'noise (folded from main osc)',
      );
    }
  }
}

export type { SerumOscInfo };
