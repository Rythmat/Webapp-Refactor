// Statistical scan of raw parameter value ranges across the Serum 2 factory
// library. Ground truth for the calibration curves in serumDefaults.ts —
// tells us the real min/max/distribution of each param before we lock any
// display-value mapping.
//
//   node tools/serum-convert/src/paramScan.ts --library "<Xfer Records dir>"

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSerumPreset, plainParams, section } from './serumPreset.ts';

const lib = process.argv[process.argv.indexOf('--library') + 1];
if (!lib) {
  console.error('pass --library "<Xfer Records dir>"');
  process.exit(1);
}
const ROOT = join(lib, 'Serum 2 Presets', 'Presets', 'Factory');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.SerumPreset')) out.push(p);
  }
  return out;
}

interface Stat {
  min: number;
  max: number;
  count: number;
  samples: number[];
}
const stats = new Map<string, Stat>();
function rec(key: string, v: unknown): void {
  if (typeof v !== 'number' || !isFinite(v)) return;
  let s = stats.get(key);
  if (!s) {
    s = { min: Infinity, max: -Infinity, count: 0, samples: [] };
    stats.set(key, s);
  }
  s.min = Math.min(s.min, v);
  s.max = Math.max(s.max, v);
  s.count++;
  if (s.samples.length < 8000) s.samples.push(v);
}

const files = walk(ROOT);
console.log(`scanning ${files.length} presets…`);
let scanned = 0;
for (const f of files) {
  let doc;
  try {
    doc = parseSerumPreset(f);
  } catch {
    continue;
  }
  scanned++;
  for (let i = 0; i < 2; i++) {
    const vf = plainParams(section(doc, `VoiceFilter${i}`));
    rec('VoiceFilter.kParamFreq', vf.kParamFreq);
    rec('VoiceFilter.kParamReso', vf.kParamReso);
  }
  for (let i = 0; i < 4; i++) {
    const env = plainParams(section(doc, `Env${i}`));
    rec('Env.kParamAttack', env.kParamAttack);
    rec('Env.kParamDecay', env.kParamDecay);
    rec('Env.kParamSustain', env.kParamSustain);
    rec('Env.kParamRelease', env.kParamRelease);
  }
  for (let i = 0; i < 10; i++) {
    rec('LFO.kParamRate', plainParams(section(doc, `LFO${i}`)).kParamRate);
  }
  for (let i = 0; i < 3; i++) {
    const osc = plainParams(section(doc, `Oscillator${i}`));
    rec('Osc.kParamVolume', osc.kParamVolume);
    rec('Osc.kParamPan', osc.kParamPan);
    rec('Osc.kParamFine', osc.kParamFine);
    rec('Osc.kParamDetune', osc.kParamDetune);
  }
  rec(
    'Global.kParamMasterVolume',
    plainParams(section(doc, 'Global0')).kParamMasterVolume,
  );
}

console.log(`decoded ${scanned}\n`);
for (const [k, s] of [...stats.entries()].sort()) {
  const sorted = [...s.samples].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.floor(sorted.length * p)] ?? NaN;
  console.log(
    `${k.padEnd(28)} n=${String(s.count).padStart(5)} min=${s.min.toFixed(4)} p50=${pct(0.5).toFixed(4)} p95=${pct(0.95).toFixed(4)} p99=${pct(0.99).toFixed(4)} max=${s.max.toFixed(4)}`,
  );
}
