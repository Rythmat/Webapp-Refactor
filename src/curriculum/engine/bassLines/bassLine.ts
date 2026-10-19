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
 *   A                 approach: a note either side of the next target
 *   W                 walk: a passing tone that connects the line
 *   X                 dead note: a muted ghost on the last pitch
 *
 * Walk and Approach follow the genre's rules where it has them (Pop, Funk,
 * Hip Hop, Latin — GENRE_BASS_RULES), "diatonic" meaning the chart's key:
 *   Walk      a diatonic step toward the next root (Pop) or the next chord
 *             tone (the rest), one step per walking note.
 *   Approach  a note just above or below the note it leads into: diatonic
 *             only (Pop), or diatonic or chromatic (the rest).
 * Elsewhere they keep the free rules ported from ICP Studio.
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
  /**
   * The genre whose Walk and Approach rules the editor previews it with.
   * Lessons and bands play it by their own genre's rules.
   */
  genre?: string;
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
    hint: 'Approach the next note from just above or below (by genre)',
    special: true,
  },
  {
    id: 'W',
    label: 'Walk',
    hint: 'Step toward the next root or chord tone (by genre)',
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

/** What each chord-tone degree is, in a quality's own spelling of it. */
const DEGREE_SLOT: Partial<
  Record<BassDegree, 'second' | 'fourth' | 'fifth' | 'sixth' | 'seventh'>
> = {
  '2': 'second',
  '4': 'fourth',
  '5': 'fifth',
  '5-': 'fifth',
  '6': 'sixth',
  '7': 'seventh',
  '7-': 'seventh',
};

/** The intervals a degree may take from a key, nearest its own first. */
const KEYED_OPTIONS: Record<
  'second' | 'fourth' | 'fifth' | 'sixth' | 'seventh',
  number[]
> = {
  second: [2, 1],
  fourth: [5, 6],
  fifth: [7, 6, 8],
  sixth: [9, 8],
  seventh: [10, 11],
};

/**
 * A chord-tone degree's interval when the chart's key is known (a band
 * following a student's chart). A tone the chord's quality names stays the
 * chord's own: a written C7 keeps its B♭, a maj7 its B, a 7♭9 its ♭9. One it
 * doesn't name takes the key's note under the chord nearest the degree's own
 * (`chordDiatonic`): a '7' over C in C major is B, over G it's F, over Am
 * it's G; a '4' over B♭ in D minor is E.
 *
 * Never an avoid note, as parts that follow the chords play them: a ♭9 is the
 * root, and a ♮11 over a major chord or a ♭13 over a minor one is the 5th —
 * unless the line steps through it (`passes`), the 3-4-5 climb and ♭7-6-5
 * fall a funk line is made of.
 */
export function keyedInterval(
  degree: BassDegree,
  chord: Chord,
  keyScale: readonly number[],
  passes = false,
): number | null {
  const iv = degreeInterval(degree, chord.quality);
  const slot = DEGREE_SLOT[degree];
  if (iv === null || !slot || chord.nc) return iv;
  const q = QUALITIES[chord.quality] ?? QUALITIES.maj;
  const own = pcOf(iv);
  // The quality spells it (in its tones, or as its own alteration).
  if (q.tones.includes(own) || q[slot] !== QUALITIES.maj[slot]) return iv;
  const scale = chordDiatonic(keyScale, chord);
  const inKey = KEYED_OPTIONS[slot]
    .filter((i) => scale.has(pcOf(chord.root + i)))
    .sort((a, b) => Math.abs(a - own) - Math.abs(b - own));
  if (!inKey.length) return iv;
  const pick = inKey[0];
  const avoid = (pick === 5 && q.third === 4) || (pick === 8 && q.third === 3);
  const safe = pick === 1 ? 0 : avoid && !passes ? q.fifth : pick;
  return iv - own + safe;
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
  /** A 2, 4 or 6 the line steps to or from: a passing note, not a color. */
  passes?: boolean;
}

// ── Genre rules for Walk and Approach ─────────────────────────────────────

export interface BassStyleRules {
  /** What a walking note steps toward: the next root, or the next chord tone. */
  walkTarget: 'root' | 'chordTone';
  /** Approach notes: diatonic neighbours only, or chromatic ones too. */
  approach: 'diatonic' | 'diatonicOrChromatic';
}

/** Genres with their own rules; the rest walk and approach freely. */
export const GENRE_BASS_RULES: Record<string, BassStyleRules> = {
  pop: { walkTarget: 'root', approach: 'diatonic' },
  funk: { walkTarget: 'chordTone', approach: 'diatonicOrChromatic' },
  'hip-hop': { walkTarget: 'chordTone', approach: 'diatonicOrChromatic' },
  latin: { walkTarget: 'chordTone', approach: 'diatonicOrChromatic' },
};

export function bassRulesFor(
  genre: string | undefined,
): BassStyleRules | undefined {
  return genre ? GENRE_BASS_RULES[genre] : undefined;
}

const pcOf = (m: number) => ((m % 12) + 12) % 12;
const IONIAN_PCS = [0, 2, 4, 5, 7, 9, 11];

/**
 * The chart's key, as the major scale (or its relative minor, the same
 * notes) holding most of the chords' tones, weighted by how long each
 * sounds; the roots break a tie.
 */
export function chartKeyScale(spans: readonly ChordSpan[]): number[] {
  let best: number[] = IONIAN_PCS;
  let bestScore = -Infinity;
  for (let tonic = 0; tonic < 12; tonic += 1) {
    const scale = new Set(IONIAN_PCS.map((x) => (x + tonic) % 12));
    let score = 0;
    spans.forEach((sp) => {
      if (sp.chord.nc) return;
      const q = QUALITIES[sp.chord.quality] ?? QUALITIES.maj;
      const len = sp.end - sp.start;
      q.tones.forEach((t) => {
        if (scale.has((sp.chord.root + t) % 12)) score += len;
      });
      if (scale.has(sp.chord.root)) score += len * 0.5;
    });
    if (score > bestScore) {
      bestScore = score;
      best = [...scale];
    }
  }
  return best;
}

/**
 * The key's notes under one chord: a chord tone outside the key (E7's G♯ in
 * A minor, C7's B♭ in C) takes the place of the key note it alters.
 */
export function chordDiatonic(
  keyScale: readonly number[],
  chord: Chord,
): Set<number> {
  if (chord.nc) return new Set(keyScale);
  const q = QUALITIES[chord.quality] ?? QUALITIES.maj;
  return keyNotesUnder(
    keyScale,
    q.tones.map((t) => (chord.root + t) % 12),
  );
}

/**
 * The key's notes under a chord's tones (pitch classes), each tone outside
 * the key taking the place of the key note it alters. The Walk rules read
 * it through `chordDiatonic`; parts that follow the chords read it from a
 * chord symbol's tones (parts/followChords.ts).
 */
export function keyNotesUnder(
  keyScale: readonly number[],
  tones: readonly number[],
): Set<number> {
  const set = new Set(keyScale);
  // Three chromatic notes in a row: the altered key note is still there.
  const runs = (x: Set<number>) =>
    [...x].filter((p) => x.has((p + 1) % 12) && x.has((p + 2) % 12)).length;
  tones.forEach((tone) => {
    if (set.has(tone)) return;
    const below = new Set(set);
    below.delete((tone + 11) % 12);
    below.add(tone);
    const above = new Set(set);
    above.delete((tone + 1) % 12);
    above.add(tone);
    const next = runs(below) <= runs(above) ? below : above;
    set.clear();
    next.forEach((p) => set.add(p));
  });
  return set;
}

/** The next note of `scale` above (dir 1) or below (dir -1) `m`. */
function scaleStep(m: number, dir: 1 | -1, scale: Set<number>): number {
  let x = m + dir;
  for (let i = 0; i < 12 && !scale.has(pcOf(x)); i += 1) x += dir;
  return x;
}

/** What the genre rules need while a line is resolved. */
interface RuleContext {
  rules: BassStyleRules;
  keyScale: number[];
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
  > &
    Partial<Pick<BassLine, 'genre'>>,
  bars: Chord[][],
  {
    timeSignature = template.timeSignature ?? [4, 4],
    instrument = template.instrument ?? 'upright',
    passes = 1,
    seed = 1,
    genre,
    keyScale,
  }: {
    timeSignature?: TimeSignature;
    instrument?: BassInstrument;
    passes?: number;
    seed?: number;
    /** Whose Walk and Approach rules to play by; the line's own when absent. */
    genre?: string;
    /**
     * The chart's key as pitch classes, when it's known: a band following a
     * student's chart. Degrees a chord doesn't name take the key's note
     * under it (`keyedInterval`), and walks and approaches step through its
     * scale rather than one read from the chart. Left out, a line plays as
     * it always has.
     */
    keyScale?: readonly number[];
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
  const rules = bassRulesFor(genre ?? template.genre);
  const key = keyScale && [...new Set(keyScale.map(pcOf))];
  const ruled: RuleContext | undefined = rules
    ? { rules, keyScale: key ?? chartKeyScale(chartSpans) }
    : undefined;

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

  // A 2, 4 or 6 the line steps to or from passes through; one it leaps to
  // and from is a color of the chord.
  if (key) {
    const steps: Partial<Record<BassDegree, BassDegree[]>> = {
      '2': ['R', '3'],
      '4': ['3', '5'],
      '6': ['5', '7'],
    };
    const sounding = raw.filter((n) => n.degree !== 'X');
    sounding.forEach((note, i) => {
      const near = steps[note.degree];
      if (!near) return;
      const sides = [sounding[i - 1], sounding[i + 1]];
      note.passes = sides.some(
        (n) =>
          n &&
          (near.includes(n.degree) || n.degree === 'W' || n.degree === 'A'),
      );
    });
  }

  // Resolve pitches left to right; walking runs look ahead to their target.
  let prev = spans[0].anchor;
  for (let i = 0; i < raw.length; i += 1) {
    const note = raw[i];
    if (note.degree === 'W') {
      let j = i;
      while (j < raw.length && raw[j].degree === 'W') j += 1;
      const run = raw.slice(i, j);
      if (ruled) {
        walkByRule(
          run,
          prev,
          walkTarget(raw, j, spans, inst, ruled.rules, key),
          spans,
          inst,
          ruled,
          rand,
          j < raw.length && !FREE_DEGREES.has(raw[j].degree)
            ? chordTonePitch(raw[j], spans, inst, key)
            : undefined,
        );
        prev = run[run.length - 1].midi;
        i = j - 1;
        continue;
      }
      const target =
        j < raw.length
          ? resolveFixed(
              raw[j],
              raw[j + 1] ?? raw[0],
              spans,
              prev,
              inst,
              rand,
              undefined,
              key,
            )
          : spans[0].anchor;
      fillWalk(run, prev, target, spans, inst, rand, key);
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
        ruled,
        key,
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

/**
 * A chord-tone degree's interval: in the chart's key when it's known
 * (`keyedInterval`), else the quality's own.
 */
function toneInterval(
  note: WorkNote,
  chord: Chord,
  key: readonly number[] | undefined,
): number {
  return (
    (key
      ? keyedInterval(note.degree, chord, key, note.passes)
      : degreeInterval(note.degree, chord.quality)) ?? 0
  );
}

/** A note whose pitch doesn't depend on what follows it. */
function resolveFixed(
  note: WorkNote,
  after: WorkNote | undefined,
  spans: RealizedSpan[],
  prev: number,
  inst: BassInstrumentSpec,
  rand: () => number,
  ruled?: RuleContext,
  /** The chart's key, when it's known. */
  key?: readonly number[],
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
    if (ruled)
      return approachByRule(
        after,
        note,
        targetSpan,
        spans,
        prev,
        inst,
        rand,
        ruled,
        key,
      );
    const t = targetSpan.anchor;
    const r = rand();
    // In a known key, the steps and the dominant are the key's own notes;
    // the half steps stay chromatic, as the style plays them.
    const scale = key && chordDiatonic(key, targetSpan.chord);
    let options: number[];
    if (r < 0.72) {
      // Chromatic, from either side.
      options = [t - 1, t + 1];
    } else if (r < 0.88) {
      // A step above or below.
      options = scale
        ? [scaleStep(t, 1, scale), scaleStep(t, -1, scale)]
        : [t + 2, t - 2];
    } else {
      // Its dominant.
      options = [t - 5, t + 7].filter((m) => !scale || scale.has(pcOf(m)));
    }
    options = options.map((m) => fit(m, inst)).filter((m) => m !== prev);
    if (!options.length) return fit(t - 1, inst);
    // Approach from whichever side the line is already on.
    options.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
    return options[0];
  }
  if (note.degree === 'R') return span.anchor;
  return fit(span.rootPitch + toneInterval(note, span.chord, key), inst);
}

const FREE_DEGREES = new Set<BassDegree>(['A', 'W', 'X']);

/** A chord-tone note's pitch; it needs no look-ahead and draws no chance. */
function chordTonePitch(
  note: WorkNote,
  spans: RealizedSpan[],
  inst: BassInstrumentSpec,
  key?: readonly number[],
) {
  const span = spans[note.span];
  if (note.degree === 'R') return span.anchor;
  return fit(span.rootPitch + toneInterval(note, span.chord, key), inst);
}

/**
 * Where a walk heads under the genre rules: the next root the line plays
 * (Pop), or the next chord tone (the rest); round to the start of the line
 * when it ends walking.
 */
function walkTarget(
  raw: WorkNote[],
  from: number,
  spans: RealizedSpan[],
  inst: BassInstrumentSpec,
  rules: BassStyleRules,
  key?: readonly number[],
): number {
  for (let k = from; k < raw.length; k += 1) {
    const n = raw[k];
    if (FREE_DEGREES.has(n.degree)) continue;
    if (rules.walkTarget === 'root' && n.degree !== 'R') continue;
    return chordTonePitch(n, spans, inst, key);
  }
  return spans[0].anchor;
}

/**
 * A walk under the genre rules: diatonic steps toward the target, planned
 * over the whole run so it ends on a note next to the target — never on it,
 * so the downbeat doesn't repeat — from the side it was coming from where it
 * can. A run with notes to spare steps away first (C D C B into A); a step
 * that doesn't divide evenly takes one third. A target out of reach is
 * walked straight toward.
 */
function walkByRule(
  run: WorkNote[],
  from: number,
  target: number,
  spans: RealizedSpan[],
  inst: BassInstrumentSpec,
  ruled: RuleContext,
  rand: () => number,
  /** The note right after the run, which it must not end on either. */
  following?: number,
) {
  const scaleOf = (note: WorkNote) =>
    chordDiatonic(ruled.keyScale, spans[note.span].chord);
  const first = scaleOf(run[0]);
  // How far the line may walk each way before leaving the instrument.
  const room = (dir: 1 | -1) => {
    let m = from;
    let n = 0;
    while (n < 12) {
      const next = scaleStep(m, dir, first);
      if (next < inst.floor || next > inst.ceiling) break;
      m = next;
      n += 1;
    }
    return n;
  };
  const moves = planWalk(
    run.length,
    diatonicDistance(from, target, first),
    { low: -room(-1), high: room(1) },
    rand,
    following === undefined
      ? undefined
      : diatonicDistance(from, following, first),
  );
  let prev = from;
  run.forEach((note, i) => {
    const scale = scaleOf(note);
    const dir: 1 | -1 = moves[i] > 0 ? 1 : -1;
    for (let n = 0; n < Math.abs(moves[i]); n += 1)
      prev = scaleStep(prev, dir, scale);
    note.midi = prev;
  });
}

/** Diatonic steps from `from` to `to` (signed); a note off the scale counts as reached when passed. */
function diatonicDistance(
  from: number,
  to: number,
  scale: Set<number>,
): number {
  const dir: 1 | -1 = to > from ? 1 : -1;
  let m = from;
  let d = 0;
  while (dir === 1 ? m < to : m > to) {
    m = scaleStep(m, dir, scale);
    d += dir;
  }
  return d;
}

/**
 * The run's moves in diatonic steps (±1, or ±2 for a third), the cheapest
 * by: ending next to the target (`d` steps away), on the near side; no
 * landing on the target early; few turns; steps over thirds.
 */
export function planWalk(
  k: number,
  d: number,
  /** The positions the instrument allows, in diatonic steps from the start. */
  range: { low: number; high: number } = { low: -99, high: 99 },
  /** A little chance, so equally good walks take turns. */
  rand: () => number = () => 0,
  /** Another position not to end on: the note right after the run. */
  avoid?: number,
): number[] {
  const s = Math.sign(d) || -1;
  const inRange = (pos: number) => pos >= range.low && pos <= range.high;
  if (k > 6 || (Math.abs(d) >= k + 1 && inRange(k * s) && k * s !== avoid))
    return Array<number>(k).fill(s);
  const MOVES = [-2, -1, 1, 2];
  let best: number[] = Array<number>(k).fill(s);
  let bestCost = Infinity;
  const path: number[] = [];
  const search = (pos: number, cost: number, lastDir: number) => {
    if (cost >= bestCost) return;
    if (path.length === k) {
      const dist = Math.abs(d - pos);
      let c = cost;
      if (dist === 0 || pos === avoid) c += 10;
      else {
        c += (dist - 1) * 2.5;
        // The far side: past the target, coming back.
        if (Math.sign(pos - d) === s) c += 1;
      }
      if (c < bestCost) {
        bestCost = c;
        best = path.slice();
      }
      return;
    }
    for (const mv of MOVES) {
      const next = pos + mv;
      if (!inRange(next)) continue;
      let c = cost + rand() * 0.05;
      if (Math.abs(mv) === 2) c += 2 + 0.1 * path.length;
      const dir = Math.sign(mv);
      if (lastDir && dir !== lastDir) c += 0.6;
      if (!path.length && dir === s) c -= 0.2;
      if (next === d && path.length < k - 1) c += 3;
      path.push(mv);
      search(next, c, dir);
      path.pop();
    }
  };
  search(0, 0, 0);
  return best;
}

/**
 * An approach under the genre rules: just above or below the note it leads
 * into — a diatonic neighbour, or (where the genre allows) a half step —
 * from whichever side the line is already on.
 */
function approachByRule(
  after: WorkNote | undefined,
  note: WorkNote,
  targetSpan: RealizedSpan,
  spans: RealizedSpan[],
  prev: number,
  inst: BassInstrumentSpec,
  rand: () => number,
  ruled: RuleContext,
  key?: readonly number[],
): number {
  const t =
    after && after.q > note.q && !FREE_DEGREES.has(after.degree)
      ? chordTonePitch(after, spans, inst, key)
      : targetSpan.anchor;
  const scale = chordDiatonic(ruled.keyScale, targetSpan.chord);
  const diatonic = [scaleStep(t, 1, scale), scaleStep(t, -1, scale)];
  const chromatic = [t + 1, t - 1];
  const pool =
    ruled.rules.approach === 'diatonic' || rand() < 0.5 ? diatonic : chromatic;
  const options = pool
    .filter((m) => m >= inst.floor && m <= inst.ceiling && m !== prev)
    .sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
  return options[0] ?? fit(diatonic[1], inst);
}

/**
 * Fill a run of walking notes between `from` and `to`. Every candidate path
 * through the chord's scale is scored and the best kept: steps of one to four
 * semitones, no repeated notes, chord tones on the downbeats, a short last
 * step into the target. Runs are rarely longer than three notes, so trying
 * them all is cheap and beats any rule of thumb about which way to go. In a
 * known key it walks the key's notes only.
 */
function fillWalk(
  run: WorkNote[],
  from: number,
  to: number,
  spans: RealizedSpan[],
  inst: BassInstrumentSpec,
  rand: () => number,
  /** The chart's key, when it's known: the walk keeps to its notes. */
  key?: readonly number[],
) {
  const span = spans[run[0].span];
  const q = QUALITIES[span.chord.quality] ?? QUALITIES.maj;
  const rootPc = span.chord.root;
  const keyed = key && chordDiatonic(key, span.chord);
  const inScale = (m: number) =>
    keyed
      ? keyed.has(pcOf(m))
      : q.scale.includes((((m - rootPc) % 12) + 12) % 12);
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
  const options = k <= 3 && !keyed ? pool.concat(chromatic) : pool;
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
