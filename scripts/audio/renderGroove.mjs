#!/usr/bin/env node
// Renders the groove Audio's lessons play: one-shots from the Studio's Natural
// kit and the CC0 bass, sequenced by hand into stems that loop exactly, written
// as FLAC beside a credits file, with their measured peaks and spectra printed.
//
//   node scripts/audio/renderGroove.mjs
//
// Needs ffmpeg on PATH. The output is checked in, so nothing here runs at build
// time. Another stem (the owner's vocal, say) is one more entry in STEMS.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/audio-lab/groove-96-v1';
const STATS = 'src/curriculum/audio/mix/grooveStats.ts';
const RATE = 48000;
const BPM = 96;
const BARS = 4;
const STEP = 60 / BPM / 4; // a sixteenth
const LENGTH = Math.round(BARS * 16 * STEP * RATE);

const DRUMS = 'public/daw-assets/samples/drums/natural';
const BASS = 'public/samples/bass/electric';

/** Decode any file to float samples, one array per channel. */
function decode(path, channels) {
  const raw = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      path,
      '-f',
      'f32le',
      '-ac',
      String(channels),
      '-ar',
      String(RATE),
      '-',
    ],
    { maxBuffer: 1 << 28 },
  );
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  return Array.from({ length: channels }, (_, c) =>
    Float32Array.from(
      { length: all.length / channels },
      (_, i) => all[i * channels + c],
    ),
  );
}

/** Cut to the attack and to a length, with a short fade so that nothing clicks. */
function shape(channels, seconds, fadeSeconds = 0.03) {
  const peak = Math.max(
    ...channels.map((c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0)),
  );
  let start = channels[0].length;
  for (const c of channels) {
    const i = c.findIndex((v) => Math.abs(v) > peak * 0.02);
    if (i >= 0) start = Math.min(start, i);
  }
  start = Math.max(0, start - Math.round(0.001 * RATE));
  const length = Math.min(
    Math.round(seconds * RATE),
    channels[0].length - start,
  );
  const fade = Math.round(fadeSeconds * RATE);
  return channels.map((c) => {
    const out = c.slice(start, start + length);
    for (let i = 0; i < fade && i < length; i++)
      out[length - 1 - i] *= i / fade;
    return out;
  });
}

/** Add a hit into a stem, wrapping its tail round the loop. */
function place(stem, hit, step, velocity) {
  const at = Math.round(step * STEP * RATE);
  stem.forEach((channel, c) => {
    const source = hit[Math.min(c, hit.length - 1)];
    for (let i = 0; i < source.length; i++) {
      channel[(at + i) % LENGTH] += source[i] * velocity;
    }
  });
}

const newStem = (channels) =>
  Array.from({ length: channels }, () => new Float32Array(LENGTH));

const barPattern = (bar, steps, velocity = 1) =>
  steps.map((s) => [bar * 16 + s, velocity]);

const peakOf = (stem) =>
  Math.max(...stem.map((c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));

const rmsOf = (stem) => {
  let sum = 0;
  let n = 0;
  for (const c of stem)
    for (const v of c) {
      sum += v * v;
      n++;
    }
  return Math.sqrt(sum / n);
};

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

function normalize(stem, peakDb) {
  const gain = 10 ** (peakDb / 20) / peakOf(stem);
  for (const c of stem) for (let i = 0; i < c.length; i++) c[i] *= gain;
}

// ── The kit ──────────────────────────────────────────────────────────────────

function kickStem() {
  const hit = shape(decode(join(DRUMS, 'kick.wav'), 1), 0.8);
  const stem = newStem(1);
  for (let bar = 0; bar < BARS; bar++) {
    for (const [s, v] of barPattern(bar, [0], 1)) place(stem, hit, s, v);
    for (const [s, v] of barPattern(bar, [7], 0.82)) place(stem, hit, s, v);
    for (const [s, v] of barPattern(bar, [10], 0.92)) place(stem, hit, s, v);
  }
  // The turnaround.
  place(stem, hit, 3 * 16 + 14, 0.75);
  return stem;
}

function snareStem() {
  const hit = shape(decode(join(DRUMS, 'snare.wav'), 1), 0.65);
  const stem = newStem(1);
  for (let bar = 0; bar < BARS; bar++) {
    for (const [s, v] of barPattern(bar, [4, 12], 1)) place(stem, hit, s, v);
  }
  // A ghost note leading into each second half.
  for (let bar = 1; bar < BARS; bar += 2) place(stem, hit, bar * 16 + 15, 0.28);
  return stem;
}

function hatsStem() {
  const closed = shape(decode(join(DRUMS, 'hihat-closed.wav'), 2), 0.22, 0.05);
  const open = shape(decode(join(DRUMS, 'hihat-open.wav'), 2), 0.5, 0.08);
  const stem = newStem(2);
  for (let bar = 0; bar < BARS; bar++) {
    for (let s = 0; s < 16; s += 2) {
      const accent = s % 4 === 0 ? 1 : 0.62;
      if (bar === BARS - 1 && s === 14) place(stem, open, bar * 16 + s, 0.8);
      else place(stem, closed, bar * 16 + s, accent);
    }
  }
  return stem;
}

// ── The bass ─────────────────────────────────────────────────────────────────
// A minor, one chord a bar: Am, F, C, G.

function bassStem() {
  const stem = newStem(1);
  const note = (name, seconds) =>
    shape(decode(join(BASS, `${name}.mp3`), 1), seconds, 0.04);
  const bars = [
    ['A1', 'A1', 'C2', 'E2'],
    ['F1', 'F1', 'A1', 'C2'],
    ['C2', 'C2', 'E2', 'G2'],
    ['G1', 'G1', 'B1', 'D2'],
  ];
  bars.forEach((names, bar) => {
    place(stem, note(names[0], STEP * 5.5), bar * 16, 1);
    place(stem, note(names[1], STEP * 2.6), bar * 16 + 6, 0.8);
    place(stem, note(names[2], STEP * 2.6), bar * 16 + 10, 0.86);
    place(stem, note(names[3], STEP * 1.8), bar * 16 + 13, 0.74);
  });
  return stem;
}

// ── Measuring ────────────────────────────────────────────────────────────────

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(a * k);
        const wi = Math.sin(a * k);
        const u = [re[i + k], im[i + k]];
        const v = [
          re[i + k + len / 2] * wr - im[i + k + len / 2] * wi,
          re[i + k + len / 2] * wi + im[i + k + len / 2] * wr,
        ];
        re[i + k] = u[0] + v[0];
        im[i + k] = u[1] + v[1];
        re[i + k + len / 2] = u[0] - v[0];
        im[i + k + len / 2] = u[1] - v[1];
      }
    }
  }
}

const BANDS = [
  [20, 40],
  [40, 60],
  [60, 80],
  [80, 100],
  [100, 150],
  [150, 200],
  [200, 300],
  [300, 500],
  [500, 1000],
  [1000, 2500],
  [2500, 4000],
  [4000, 6000],
  [6000, 8000],
  [8000, 12000],
  [12000, 20000],
];

/** Energy per band, in dB against the strongest band, averaged over the loop. */
function spectrum(stem) {
  const size = 1 << 15;
  const totals = new Float64Array(size / 2);
  const mono = stem[0].map(
    (_, i) => stem.reduce((m, c) => m + c[i], 0) / stem.length,
  );
  for (let offset = 0; offset + size <= LENGTH; offset += size / 2) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      re[i] =
        mono[offset + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
    }
    fft(re, im);
    for (let k = 0; k < size / 2; k++)
      totals[k] += re[k] * re[k] + im[k] * im[k];
  }
  const binHz = RATE / size;
  const bands = BANDS.map(([lo, hi]) => {
    let sum = 0;
    for (let k = Math.ceil(lo / binHz); k < hi / binHz; k++) sum += totals[k];
    // Energy per octave, so that wide bands don't read as strong just for width.
    return { lo, hi, power: sum / Math.log2(hi / lo) };
  });
  const most = Math.max(...bands.map((b) => b.power));
  let peakBin = 1;
  for (let k = 1; k < totals.length; k++)
    if (totals[k] > totals[peakBin]) peakBin = k;
  return {
    peakHz: Math.round(peakBin * binHz),
    bands: bands.map((b) => ({
      range: `${b.lo}-${b.hi}`,
      db: Math.round(10 * Math.log10(Math.max(b.power / most, 1e-12))),
    })),
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────

function write(name, stem) {
  const interleaved = new Float32Array(LENGTH * stem.length);
  for (let i = 0; i < LENGTH; i++) {
    stem.forEach((c, n) => {
      interleaved[i * stem.length + n] = c[i];
    });
  }
  const path = join(OUT, `${name}.flac`);
  execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-f',
      'f32le',
      '-ar',
      String(RATE),
      '-ac',
      String(stem.length),
      '-i',
      '-',
      '-sample_fmt',
      's16',
      '-compression_level',
      '12',
      path,
    ],
    { input: Buffer.from(interleaved.buffer) },
  );
  return statSync(path).size;
}

const STEMS = [
  {
    id: 'kick',
    label: 'Kick',
    make: kickStem,
    peakDb: -6,
    license: 'owner',
    pan: 0,
  },
  {
    id: 'snare',
    label: 'Snare',
    make: snareStem,
    peakDb: -6,
    license: 'owner',
    pan: 0,
  },
  {
    id: 'hats',
    label: 'Hats',
    make: hatsStem,
    peakDb: -18,
    license: 'owner',
    pan: 0,
  },
  {
    id: 'bass',
    label: 'Bass',
    make: bassStem,
    peakDb: -9,
    license: 'cc0',
    pan: 0,
  },
];

mkdirSync(OUT, { recursive: true });
const rendered = [];
let total = 0;
for (const entry of STEMS) {
  const stem = entry.make();
  normalize(stem, entry.peakDb);
  const bytes = write(entry.id, stem);
  total += bytes;
  const s = spectrum(stem);
  rendered.push({ ...entry, stem, bytes, rmsDb: db(rmsOf(stem)), spectrum: s });
  console.log(
    `${entry.id.padEnd(6)} peak ${db(peakOf(stem)).toFixed(1)} dBFS  rms ${db(rmsOf(stem)).toFixed(1)} dB  ${(bytes / 1024).toFixed(0)} KB  strongest ${s.peakHz} Hz`,
  );
  console.log('       ' + s.bands.map((b) => `${b.range}:${b.db}`).join('  '));
}

const mix = new Float32Array(LENGTH);
for (const { stem } of rendered) {
  for (let i = 0; i < LENGTH; i++) {
    mix[i] += stem.reduce((m, c) => m + c[i], 0) / stem.length;
  }
}
const mixPeakDb = db(mix.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
console.log(
  `mix    peak ${mixPeakDb.toFixed(1)} dBFS  total ${(total / 1024).toFixed(0)} KB  loop ${LENGTH} samples`,
);

writeFileSync(
  join(OUT, 'CREDITS.md'),
  `# Audio lessons' groove

Rendered by scripts/audio/renderGroove.mjs: ${BARS} bars at ${BPM} BPM, ${LENGTH / RATE} seconds, ${RATE} Hz.

- **Kick, snare, hats:** one-shots from the Studio's Natural kit (public/daw-assets/samples/drums/natural).
- **Bass:** Karoryfer Samples, Black And Blue Basses, CC0 1.0 (see public/samples/bass/CREDITS.md).
`,
);

writeFileSync(
  STATS,
  `// Written by scripts/audio/renderGroove.mjs: what the rendered stems measure.

export const GROOVE_STATS = ${JSON.stringify(
    {
      seconds: LENGTH / RATE,
      bpm: BPM,
      mixPeakDb: +mixPeakDb.toFixed(2),
      totalBytes: total,
      stems: Object.fromEntries(
        rendered.map((r) => [
          r.id,
          {
            peakDb: r.peakDb,
            rmsDb: +r.rmsDb.toFixed(2),
            channels: r.stem.length,
            strongestHz: r.spectrum.peakHz,
          },
        ]),
      ),
    },
    null,
    2,
  )} as const;
`,
);
readFileSync(STATS);
