/**
 * Bass lines: templates, and the generator that plays them over a chart.
 * Ported from ICP Studio's bassLines.js; the generator's logic is unchanged.
 *
 * A drum groove can be stored as literal hits because drums don't change with
 * the harmony. A bass line can't: "play the fifth on beat 3" is G over C and
 * Ab over Db. So a line is a template of chord-relative roles, the way a
 * teacher describes one, and the generator turns roles into notes for
 * whatever chart and key it plays over.
 *
 * Degrees (the piano roll's rows):
 *   8 7 6 5 4 3 2 R   the chord's own intervals, R = root
 *   7- 5-             seventh / fifth below the root
 *   A                 approach: a half step either side of the next root
 *   W                 walk: a passing tone that connects the line
 *   X                 dead note: a muted ghost on the last pitch
 */

import {
  chordSpans,
  quartersPerBar,
  QUALITIES,
  type ChordSpan,
  type Chord,
  type Quality,
  type TimeSignature,
} from './harmony';

export type BassDegree =
  | '8'
  | '7'
  | '6'
  | '5'
  | '4'
  | '3'
  | '2'
  | 'R'
  | '7-'
  | '5-'
  | 'A'
  | 'W'
  | 'X';

export interface BassLineNote {
  /** Tone bar:beat:sixteenth, zero-indexed; the beat is always a quarter. */
  time: string;
  degree: BassDegree;
  /** Length in quarter notes. */
  dur: number;
  /** 0–1. */
  velocity: number;
}

export type BassInstrument = 'upright' | 'electric';
export type BassGridId = '8n' | '16n' | '8t';

/** One bass line: what the console's editor writes and the generator plays. */
export interface BassLine {
  /** File name: lowercase, digits, _ and -. */
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  /** Nothing reads lines outside the console yet; 'live' marks them ready. */
  status: 'draft' | 'live';
  /** Position in the library list; lower first. */
  order?: number;
  timeSignature: TimeSignature;
  /** Template length in bars, as "Nm". Any number: "32m" for a whole song. */
  length: string;
  /** The editor's grid only. */
  gridResolution: BassGridId;
  instrument: BassInstrument;
  /** Drum groove ids (Drum Grooves) this line goes with, best first. */
  grooves: string[];
  /** A note landing on a chord change plays that chord's root. */
  anchorOnChange: boolean;
  notes: BassLineNote[];
}

export const DEGREES: {
  id: BassDegree;
  label: string;
  hint: string;
  special?: boolean;
}[] = [
  { id: '8', label: '8', hint: 'Octave' },
  {
    id: '7',
    label: '7',
    hint: "The chord's seventh (b7 on a triad, 6 on a 6 chord)",
  },
  { id: '6', label: '6', hint: 'Sixth / thirteenth' },
  {
    id: '5',
    label: '5',
    hint: "The chord's fifth (b5, #5 where the chord says so)",
  },
  { id: '4', label: '4', hint: 'Fourth / eleventh' },
  { id: '3', label: '3', hint: "The chord's third (b3 on minor, 4 on sus)" },
  { id: '2', label: '2', hint: 'Second / ninth' },
  { id: 'R', label: 'R', hint: 'Root (the slash note on a slash chord)' },
  { id: '7-', label: '7↓', hint: 'Seventh, below the root' },
  { id: '5-', label: '5↓', hint: 'Fifth, below the root' },
  {
    id: 'A',
    label: 'Appr',
    hint: 'Approach the next root by half step',
    special: true,
  },
  {
    id: 'W',
    label: 'Walk',
    hint: 'Passing tone, chosen to connect the line',
    special: true,
  },
  { id: 'X', label: 'Dead', hint: 'Muted ghost note', special: true },
];

const DEGREE_IDS = new Set<string>(DEGREES.map((d) => d.id));

/** Semitones above the root for a chord-tone degree; null for A/W/X. */
export function degreeInterval(
  degree: BassDegree,
  quality: Quality,
): number | null {
  const q = QUALITIES[quality] ?? QUALITIES.maj;
  switch (degree) {
    case 'R':
      return 0;
    case '2':
      return q.second;
    case '3':
      return q.third;
    case '4':
      return q.fourth;
    case '5':
      return q.fifth;
    case '6':
      return q.sixth;
    case '7':
      return q.seventh;
    case '8':
      return 12;
    case '7-':
      return q.seventh - 12;
    case '5-':
      return q.fifth - 12;
    default:
      return null;
  }
}

export interface BassInstrumentSpec {
  label: string;
  floor: number;
  /** The window the generator keeps a chord's root in. */
  roots: [number, number];
  /** Top of the usable neck. */
  ceiling: number;
  release: number;
  centre: number;
  /** Evens out how loud each library was recorded. */
  gainDb: number;
  detail: string;
}

export const INSTRUMENTS: Record<BassInstrument, BassInstrumentSpec> = {
  upright: {
    label: 'Upright',
    floor: 28,
    roots: [28, 43],
    ceiling: 55,
    release: 0.12,
    centre: 36,
    gainDb: 3.6,
    detail:
      'Upright: 1958 Otto Rubner double bass, Spirocores, pizzicato (Meatbass)',
  },
  electric: {
    label: 'Electric',
    floor: 28,
    roots: [28, 43],
    ceiling: 60,
    release: 0.06,
    centre: 35,
    gainDb: 0,
    detail: 'Fingerstyle electric: "Baby Blue" from Black And Blue Basses',
  },
};

export const BASS_GRIDS: { id: BassGridId; label: string; perBeat: number }[] =
  [
    { id: '8n', label: '8ths', perBeat: 2 },
    { id: '16n', label: '16ths', perBeat: 4 },
    { id: '8t', label: 'Triplets', perBeat: 3 },
  ];

export const BASS_LINE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** Ids are file names: lowercase, digits, _ and -. */
export function bassLineIdFrom(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `bass-${Date.now().toString(36)}`
  );
}

export function blankBassLine(id: string, name: string): BassLine {
  return {
    id,
    name,
    status: 'draft',
    timeSignature: [4, 4],
    length: '1m',
    gridResolution: '8n',
    instrument: 'upright',
    grooves: [],
    anchorOnChange: true,
    notes: [],
  };
}

export const lineBars = (line: Pick<BassLine, 'length'>) =>
  Math.max(1, parseInt(line.length, 10) || 1);

export function sameMeter(
  a: TimeSignature = [4, 4],
  b: TimeSignature = [4, 4],
) {
  return quartersPerBar(a) === quartersPerBar(b) && a[0] === b[0];
}

// ── Time ───────────────────────────────────────────────────────────────────

export function timeToQuarters(
  time: string,
  timeSignature: TimeSignature = [4, 4],
): number {
  const [bar, beat, six] = String(time).split(':').map(Number);
  return (
    (bar || 0) * quartersPerBar(timeSignature) + (beat || 0) + (six || 0) / 4
  );
}

export function quartersToTime(
  q: number,
  timeSignature: TimeSignature = [4, 4],
): string {
  const qpb = quartersPerBar(timeSignature);
  const bar = Math.floor(q / qpb + 1e-9);
  const within = q - bar * qpb;
  const beat = Math.floor(within + 1e-9);
  const six = Number(((within - beat) * 4).toFixed(6));
  return `${bar}:${beat}:${six}`;
}

/**
 * Notes that sit on the same start and row — a double click when the line
 * was drawn. They sound as one louder note, so the editor flags them.
 */
export function stackedNotes(
  line: Pick<BassLine, 'notes' | 'timeSignature'>,
): number {
  const seen = new Set<string>();
  let n = 0;
  for (const nt of line.notes) {
    const key = `${timeToQuarters(nt.time, line.timeSignature).toFixed(4)}|${nt.degree}`;
    if (seen.has(key)) n++;
    else seen.add(key);
  }
  return n;
}

// ── The generator ──────────────────────────────────────────────────────────

export interface RealizedNote {
  /** Start, in quarter notes from the top of the realized timeline. */
  q: number;
  midi: number;
  dur: number;
  velocity: number;
  degree: BassDegree;
  /** Index into `spans`. */
  span: number;
}

export interface RealizedSpan extends ChordSpan {
  pass: number;
  anchor: number;
  rootPitch: number;
}

export interface RealizedLine {
  notes: RealizedNote[];
  spans: RealizedSpan[];
  totalQuarters: number;
  chartQuarters: number;
  barQuarters: number;
  passes: number;
}

interface WorkNote {
  q: number;
  degree: BassDegree;
  dur: number;
  velocity: number;
  span: number;
  midi: number;
  anticipates?: boolean;
}

/**
 * The template over a chart. Deterministic for a given seed, so the same
 * chart plays the same line — which a student practising a passage needs —
 * but each pass gets its own variation, so a blues doesn't walk identically
 * every chorus.
 */
export function realizeLine(
  template: Pick<
    BassLine,
    'timeSignature' | 'instrument' | 'length' | 'notes' | 'anchorOnChange'
  >,
  bars: Chord[][],
  {
    timeSignature = template.timeSignature ?? [4, 4],
    instrument = template.instrument ?? 'upright',
    passes = 1,
    seed = 1,
  }: {
    timeSignature?: TimeSignature;
    instrument?: BassInstrument;
    passes?: number;
    seed?: number;
  } = {},
): RealizedLine {
  const inst = INSTRUMENTS[instrument] ?? INSTRUMENTS.upright;
  const {
    spans: chartSpans,
    totalQuarters: chartQ,
    barQuarters,
  } = chordSpans(bars, timeSignature);
  const empty = {
    notes: [],
    spans: [],
    totalQuarters: 0,
    chartQuarters: chartQ,
    barQuarters,
    passes,
  };
  if (!chartSpans.length) return empty;

  // Lay the chart out `passes` times so walking lines can vary per chorus.
  const spans: RealizedSpan[] = [];
  for (let p = 0; p < passes; p += 1) {
    chartSpans.forEach((s) =>
      spans.push({
        ...s,
        start: s.start + p * chartQ,
        end: s.end + p * chartQ,
        pass: p,
        anchor: 0,
        rootPitch: 0,
      }),
    );
  }
  const totalQuarters = chartQ * passes;

  const rand = mulberry32(seed);
  assignAnchors(spans, inst, rand);

  // Tile the template across the whole timeline.
  const tplTs = template.timeSignature ?? timeSignature;
  const tplQ = lineBars(template) * quartersPerBar(tplTs);
  const tplNotes = (template.notes ?? [])
    .filter((x) => DEGREE_IDS.has(x.degree))
    .map((x) => ({ ...x, q: timeToQuarters(x.time, tplTs) }))
    .filter((x) => x.q < tplQ - 1e-9)
    .sort((a, b) => a.q - b.q);
  if (!tplNotes.length) return { ...empty, spans, totalQuarters };

  const raw: WorkNote[] = [];
  for (let base = 0; base < totalQuarters - 1e-9; base += tplQ) {
    tplNotes.forEach((x) => {
      const q = base + x.q;
      if (q < totalQuarters - 1e-9)
        raw.push({
          q,
          degree: x.degree,
          dur: x.dur || 0.5,
          velocity: x.velocity ?? 0.8,
          span: 0,
          midi: 0,
        });
    });
  }

  // Which chord each note belongs to, and whether it has to become a root.
  raw.forEach((note) => {
    let idx = spanIndexAt(spans, note.q);
    const next = spans[idx + 1];
    // Anticipation: a note pushed just ahead of a change and ringing across
    // it belongs to the new chord — the funk and bossa push.
    if (
      next &&
      note.q < next.start &&
      note.q + note.dur > next.start + 0.05 &&
      next.start - note.q <= 0.5
    ) {
      idx += 1;
      note.anticipates = true;
    }
    note.span = idx;
    const onChange =
      Math.abs(spans[idx].start - note.q) < 1e-6 || note.anticipates;
    if (
      template.anchorOnChange !== false &&
      onChange &&
      !['R', 'A', 'X'].includes(note.degree)
    ) {
      note.degree = 'R';
    }
  });

  // Resolve pitches left to right; walking runs look ahead to their target.
  let prev = spans[0].anchor;
  for (let i = 0; i < raw.length; i += 1) {
    const note = raw[i];
    if (note.degree === 'W') {
      let j = i;
      while (j < raw.length && raw[j].degree === 'W') j += 1;
      const run = raw.slice(i, j);
      const target =
        j < raw.length
          ? resolveFixed(raw[j], raw[j + 1] ?? raw[0], spans, prev, inst, rand)
          : spans[0].anchor;
      fillWalk(run, prev, target, spans, inst, rand);
      prev = run[run.length - 1].midi;
      i = j - 1;
    } else {
      note.midi = resolveFixed(
        note,
        raw[i + 1] ?? raw[0],
        spans,
        prev,
        inst,
        rand,
      );
      prev = note.midi;
    }
  }

  // Dead notes and ghosts: short and quiet whatever the template says.
  raw.forEach((note) => {
    if (note.degree === 'X') {
      note.dur = Math.min(note.dur, 0.12);
      note.velocity *= 0.55;
    }
  });

  // N.C. bars: the bass lays out.
  const notes = raw
    .filter((note) => !spans[note.span].chord.nc)
    .map(({ q, midi, dur, velocity, degree, span }) => ({
      q,
      midi,
      dur,
      velocity,
      degree,
      span,
    }));

  return {
    notes,
    spans,
    totalQuarters,
    chartQuarters: chartQ,
    barQuarters,
    passes,
  };
}

function spanIndexAt(spans: readonly ChordSpan[], q: number): number {
  for (let i = spans.length - 1; i >= 0; i -= 1)
    if (spans[i].start <= q + 1e-6) return i;
  return 0;
}

/**
 * Each chord's root gets one octave for the whole span, chosen to stay near
 * the last one and drift back toward the middle of the instrument rather than
 * climbing or sinking a semitone at a time through a cycle.
 */
function assignAnchors(
  spans: RealizedSpan[],
  inst: BassInstrumentSpec,
  rand: () => number,
) {
  let prev = inst.centre;
  spans.forEach((s) => {
    // No chord: nothing sounds, and the next chord is placed near the last one.
    if (s.chord.nc) {
      s.anchor = prev;
      s.rootPitch = prev;
      return;
    }
    const pc = s.chord.bass ?? s.chord.root;
    const options: number[] = [];
    for (let m = inst.roots[0]; m <= inst.roots[1]; m += 1)
      if (((m % 12) + 12) % 12 === pc) options.push(m);
    let best = options[0];
    let bestCost = Infinity;
    options.forEach((m) => {
      const cost =
        Math.abs(m - prev) + 0.35 * Math.abs(m - inst.centre) + rand() * 0.5;
      if (cost < bestCost) {
        bestCost = cost;
        best = m;
      }
    });
    s.anchor = best;
    // Degrees count up from the chord's root even when a slash puts another
    // note in the bass: C/E's "5" is still G.
    s.rootPitch = best - ((pc - s.chord.root + 12) % 12);
    prev = best;
  });
}

function fit(m: number, inst: BassInstrumentSpec): number {
  let x = m;
  while (x > inst.ceiling) x -= 12;
  while (x < inst.floor) x += 12;
  return x;
}

/** A note whose pitch doesn't depend on what follows it. */
function resolveFixed(
  note: WorkNote,
  after: WorkNote | undefined,
  spans: RealizedSpan[],
  prev: number,
  inst: BassInstrumentSpec,
  rand: () => number,
): number {
  const span = spans[note.span];
  if (note.degree === 'X') return prev;
  if (note.degree === 'A') {
    const targetSpan =
      spans[
        after && after.q > note.q
          ? spanIndexAt(spans, after.q)
          : (note.span + 1) % spans.length
      ];
    const t = targetSpan.anchor;
    const r = rand();
    let options: number[];
    if (r < 0.72)
      options = [t - 1, t + 1]; // chromatic, from either side
    else if (r < 0.88)
      options = [t + 2, t - 2]; // a step above or below
    else options = [t - 5, t + 7]; // its dominant
    options = options.map((m) => fit(m, inst)).filter((m) => m !== prev);
    if (!options.length) return fit(t - 1, inst);
    // Approach from whichever side the line is already on.
    options.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
    return options[0];
  }
  if (note.degree === 'R') return span.anchor;
  const iv = degreeInterval(note.degree, span.chord.quality) ?? 0;
  return fit(span.rootPitch + iv, inst);
}

/**
 * Fill a run of walking notes between `from` and `to`. Every candidate path
 * through the chord's scale is scored and the best kept: steps of one to four
 * semitones, no repeated notes, chord tones on the downbeats, a short last
 * step into the target. Runs are rarely longer than three notes, so trying
 * them all is cheap and beats any rule of thumb about which way to go.
 */
function fillWalk(
  run: WorkNote[],
  from: number,
  to: number,
  spans: RealizedSpan[],
  inst: BassInstrumentSpec,
  rand: () => number,
) {
  const span = spans[run[0].span];
  const q = QUALITIES[span.chord.quality] ?? QUALITIES.maj;
  const rootPc = span.chord.root;
  const inScale = (m: number) =>
    q.scale.includes((((m - rootPc) % 12) + 12) % 12);
  const isChordTone = (m: number) =>
    q.tones.includes((((m - rootPc) % 12) + 12) % 12);

  const lo = Math.max(inst.floor, Math.min(from, to) - 7);
  const hi = Math.min(inst.ceiling, Math.max(from, to) + 7);
  const pool: number[] = [];
  for (let m = lo; m <= hi; m += 1) if (inScale(m)) pool.push(m);
  // Chromatic passing tones are allowed, but cost more.
  const chromatic: number[] = [];
  for (let m = lo; m <= hi; m += 1) if (!inScale(m)) chromatic.push(m);

  const k = run.length;
  const options = k <= 3 ? pool.concat(chromatic) : pool;
  // A little noise per candidate, so equally good lines take turns.
  const jitter = run.map(() => options.map(() => rand() * 0.9));
  let best: number[] | null = null;
  let bestScore = Infinity;

  const walk = (
    i: number,
    prevM: number,
    prevDir: number,
    path: number[],
    score: number,
  ) => {
    if (score >= bestScore) return;
    if (i === k) {
      const last = Math.abs(to - prevM);
      let s = score;
      if (last === 0) s += 6;
      else if (last > 4) s += (last - 4) * 1.5;
      if (s < bestScore) {
        bestScore = s;
        best = path.slice();
      }
      return;
    }
    options.forEach((m, idx) => {
      const step = m - prevM;
      const size = Math.abs(step);
      let s = score + jitter[i][idx];
      if (size === 0) s += 8;
      else if (size > 5) s += (size - 5) * 2;
      else if (size >= 3) s += 0.4;
      if (!inScale(m)) s += 1.6;
      const strong =
        Number.isInteger(run[i].q) && Math.round(run[i].q) % 2 === 0;
      if (strong && !isChordTone(m)) s += 1.2;
      const dir = Math.sign(step);
      if (prevDir && dir && dir !== prevDir) s += 0.7;
      path.push(m);
      walk(i + 1, m, dir || prevDir, path, s);
      path.pop();
    });
  };
  walk(0, from, 0, [], 0);

  const chosen: number[] = best ?? run.map(() => from);
  chosen.forEach((m, i) => {
    run[i].midi = m;
  });
}

/** Small, fast, seedable. Math.random can't be replayed. */
function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: string[]): number {
  let h = 2166136261;
  parts
    .join('|')
    .split('')
    .forEach((c) => {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    });
  return h >>> 0;
}

/**
 * How many times to lay a chart out before looping, so a walking line doesn't
 * repeat note for note every four bars.
 */
export function passesFor(barCount: number): number {
  if (!barCount) return 1;
  return Math.max(1, Math.min(4, Math.ceil(16 / barCount)));
}

// ── Swing ──────────────────────────────────────────────────────────────────
// The drum player bakes swing into each hit's onset (genreGeneration/swing.ts
// swings 16ths), and the jazz grooves from ICP Studio carry their swung 8ths
// in each hit's offset. A bass line has no offsets, so it's swung here: 8ths
// for a walking line, 16ths for funk. 50 is straight, 66 a triplet feel.

export type BassSwingOn = 'eighths' | 'sixteenths';

/** Where a note at `q` quarters lands with swing applied. */
export function swingQuarters(
  q: number,
  swing: number,
  on: BassSwingOn,
): number {
  if (swing <= 50) return q;
  const pair = on === 'eighths' ? 1 : 0.5;
  const offbeat = pair / 2;
  const pos = ((q % pair) + pair) % pair;
  // Only notes on the off-beat move; within an eighth of the pair still counts
  // (swing.ts's window).
  if (Math.abs(pos - offbeat) > pair / 8) return q;
  return q + (pair * swing) / 100 - offbeat;
}
