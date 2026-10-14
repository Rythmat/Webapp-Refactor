/**
 * Chords, keys and progressions for the bass line generator — ported from
 * ICP Studio's harmony.js with its logic unchanged, so a line plays here the
 * way it does there.
 *
 * A bass line has to work over any progression in any key, so nothing
 * downstream of this file deals in note names. A chord is a root pitch class
 * plus a quality, and a quality knows which interval its "3", "5" and "7" are.
 * That is what lets one walking template say "play the third" and be right
 * over Cmaj7, Dm7b5 and G7alt alike.
 *
 * Two ways in:
 * - parseChord('Bbmaj7')    absolute symbols, for typed charts
 * - progression presets     Roman numerals, so the key picker transposes them
 */

// ── Pitch classes ──────────────────────────────────────────────────────────

const SHARP_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const FLAT_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];
const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function pcName(pc: number, preferFlats = true): string {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

export function midiName(midi: number, preferFlats = true): string {
  return `${pcName(midi, preferFlats)}${Math.floor(midi / 12) - 1}`;
}

function parsePc(letter: string, accidental = ''): number | null {
  const base = LETTER_PC[letter.toUpperCase()];
  if (base === undefined) return null;
  const shift =
    accidental === '#' || accidental === '♯'
      ? 1
      : accidental === 'b' || accidental === '♭'
        ? -1
        : 0;
  return mod12(base + shift);
}

// ── Qualities ──────────────────────────────────────────────────────────────
// Each degree a bass template can ask for, as semitones above the root.
// `seventh` on a plain triad is the b7: over a bare major or minor chord that
// is what funk, blues and rock bass players reach for, and a jazz chart that
// wants the major seventh writes maj7. On a 6 chord the "7" row gives the 6th,
// because that is the chord tone a walking line wants.
//
// `scale` is what a walking line passes through between chord tones.

const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const MIXO = [0, 2, 4, 5, 7, 9, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LOC2 = [0, 2, 3, 5, 6, 8, 10];
const DIM_WH = [0, 2, 3, 5, 6, 8, 9, 11];
const HALF_W = [0, 1, 3, 4, 6, 7, 9, 10];
const ALT = [0, 1, 3, 4, 6, 8, 10];
const MELMIN = [0, 2, 3, 5, 7, 9, 11];
const WHOLE = [0, 2, 4, 6, 8, 10];

export interface QualitySpec {
  symbol: string;
  second: number;
  third: number;
  fourth: number;
  fifth: number;
  sixth: number;
  seventh: number;
  tones: number[];
  scale: number[];
}

export const QUALITIES = {
  maj: {
    symbol: '',
    second: 2,
    third: 4,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 4, 7],
    scale: IONIAN,
  },
  min: {
    symbol: 'm',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 3, 7],
    scale: DORIAN,
  },
  6: {
    symbol: '6',
    second: 2,
    third: 4,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 9,
    tones: [0, 4, 7, 9],
    scale: IONIAN,
  },
  m6: {
    symbol: 'm6',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 9,
    tones: [0, 3, 7, 9],
    scale: DORIAN,
  },
  maj7: {
    symbol: 'maj7',
    second: 2,
    third: 4,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 11,
    tones: [0, 4, 7, 11],
    scale: IONIAN,
  },
  7: {
    symbol: '7',
    second: 2,
    third: 4,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 4, 7, 10],
    scale: MIXO,
  },
  '7b9': {
    symbol: '7b9',
    second: 1,
    third: 4,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 4, 7, 10],
    scale: HALF_W,
  },
  '7alt': {
    symbol: '7alt',
    second: 1,
    third: 4,
    fourth: 5,
    fifth: 8,
    sixth: 8,
    seventh: 10,
    tones: [0, 4, 10],
    scale: ALT,
  },
  '7sus': {
    symbol: '7sus',
    second: 2,
    third: 5,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 5, 7, 10],
    scale: MIXO,
  },
  sus: {
    symbol: 'sus',
    second: 2,
    third: 5,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 5, 7],
    scale: MIXO,
  },
  m7: {
    symbol: 'm7',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 10,
    tones: [0, 3, 7, 10],
    scale: DORIAN,
  },
  mMaj7: {
    symbol: 'm(maj7)',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 7,
    sixth: 9,
    seventh: 11,
    tones: [0, 3, 7, 11],
    scale: MELMIN,
  },
  m7b5: {
    symbol: 'm7b5',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 6,
    sixth: 8,
    seventh: 10,
    tones: [0, 3, 6, 10],
    scale: LOC2,
  },
  dim: {
    symbol: 'dim',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 6,
    sixth: 8,
    seventh: 9,
    tones: [0, 3, 6],
    scale: DIM_WH,
  },
  dim7: {
    symbol: 'dim7',
    second: 2,
    third: 3,
    fourth: 5,
    fifth: 6,
    sixth: 8,
    seventh: 9,
    tones: [0, 3, 6, 9],
    scale: DIM_WH,
  },
  aug: {
    symbol: '+',
    second: 2,
    third: 4,
    fourth: 6,
    fifth: 8,
    sixth: 9,
    seventh: 10,
    tones: [0, 4, 8],
    scale: WHOLE,
  },
} satisfies Record<string, QualitySpec>;

/** The keys as strings: `6` and `7` are written unquoted. */
export type Quality = `${keyof typeof QUALITIES}`;

/**
 * A parsed chord. `nc` is "no chord": the band drops out and the bass rests
 * through it; its root and quality are placeholders nothing reads.
 */
export interface Chord {
  nc?: true;
  root: number;
  quality: Quality;
  /** Slash note's pitch class, or null. */
  bass: number | null;
  /** The writer's spelling, kept for display until transposed. */
  symbol?: string;
  /** How this chord spells; undefined means follow the key. */
  flats?: boolean;
}

export const NO_CHORD: Chord = {
  nc: true,
  root: 0,
  quality: 'maj',
  bass: null,
  symbol: 'N.C.',
};

/**
 * What a chart writes after the root, mapped to a quality. Extensions a bass
 * line has no use for (9, 11, 13) fold into the seventh chord they extend.
 * Order matters: longer and more specific spellings first.
 */
const SUFFIXES: [RegExp, Quality][] = [
  [/^(m|min|-)(maj7|ma7|M7|Δ7?|\(maj7\)|\(ma7\))$/, 'mMaj7'],
  [/^(m7b5|m7♭5|-7b5|ø7?|min7b5)$/, 'm7b5'],
  [/^(dim7|°7|o7)$/, 'dim7'],
  [/^(dim|°|o)$/, 'dim'],
  [/^(maj7|ma7|M7|Δ7?|maj9|ma9|M9|Δ9|maj7#11|maj13|Δ#11)$/, 'maj7'],
  [/^(maj|ma|M)$/, 'maj'],
  [/^(m6|min6|-6|m69|-69)$/, 'm6'],
  [/^(m7|min7|-7|m9|min9|-9|m11|-11|m13|-13)$/, 'm7'],
  [/^(m|min|-)$/, 'min'],
  [/^(6|69|6\/9)$/, '6'],
  [/^(7sus4?|9sus4?|13sus4?|sus7)$/, '7sus'],
  [/^(sus4?|sus2)$/, 'sus'],
  [/^(7alt|alt|7#9b13|7b9b13|7#5#9|7#9#5)$/, '7alt'],
  [/^(7b9|7♭9|13b9|7b9#11)$/, '7b9'],
  [/^(7|9|11|13|7#11|9#11|13#11|7#9|7b13|7b5|7#5|9b13)$/, '7'],
  [/^(\+|aug|\+5|#5)$/, 'aug'],
  [/^(\+7|aug7|7\+)$/, 'aug'],
];

function qualityFromSuffix(raw: string): Quality | null {
  const s = raw.replace(/\s+/g, '');
  if (s === '') return 'maj';
  for (const [re, q] of SUFFIXES) if (re.test(s)) return q;
  // Unknown extension soup: read the family from its start rather than give up.
  if (/^(m|min|-)(?!aj)/.test(s)) return /7|9|11|13/.test(s) ? 'm7' : 'min';
  if (/^(maj|ma|M|Δ)/.test(s)) return 'maj7';
  if (/^(7|9|11|13)/.test(s)) return '7';
  return null;
}

/**
 * 'Bbmaj7', 'F#m7b5', 'C7/E', 'Eb-7'. Null for anything that isn't a chord,
 * which is how the chart field tells a typo from a chord.
 */
export function parseChord(symbol: string | null | undefined): Chord | null {
  if (!symbol) return null;
  const s = String(symbol).trim();
  if (/^(n\.?c\.?)$/i.test(s)) return { ...NO_CHORD };
  const m = s.match(/^([A-Ga-g])([#b♯♭]?)(.*?)(?:\/([A-Ga-g])([#b♯♭]?))?$/);
  if (!m) return null;
  const root = parsePc(m[1], m[2]);
  const quality = qualityFromSuffix(m[3]);
  if (root === null || !quality) return null;
  const bass = m[4] ? parsePc(m[4], m[5]) : null;
  return {
    root,
    quality,
    bass,
    symbol: s,
    // A flat or sharp root says how this chord spells; a natural root (C, G)
    // says nothing, so notes around it follow the key instead.
    flats: m[2] === 'b' || m[2] === '♭' ? true : m[2] ? false : undefined,
  };
}

export function chordSymbol(
  chord: Chord | null | undefined,
  preferFlats = true,
): string {
  if (!chord) return '';
  if (chord.nc) return 'N.C.';
  const q = QUALITIES[chord.quality]?.symbol ?? '';
  const slash =
    chord.bass !== null && chord.bass !== chord.root
      ? `/${pcName(chord.bass, preferFlats)}`
      : '';
  return `${pcName(chord.root, preferFlats)}${q}${slash}`;
}

// ── Keys ───────────────────────────────────────────────────────────────────

/** Spelled the way a chart in that key would be. */
export const KEYS = [
  { pc: 0, name: 'C', flats: true },
  { pc: 1, name: 'Db', flats: true },
  { pc: 2, name: 'D', flats: false },
  { pc: 3, name: 'Eb', flats: true },
  { pc: 4, name: 'E', flats: false },
  { pc: 5, name: 'F', flats: true },
  { pc: 6, name: 'F#', flats: false },
  { pc: 7, name: 'G', flats: false },
  { pc: 8, name: 'Ab', flats: true },
  { pc: 9, name: 'A', flats: false },
  { pc: 10, name: 'Bb', flats: true },
  { pc: 11, name: 'B', flats: false },
] as const;

/** Minor keys spell from their relative major: C minor has three flats. */
export function keyPrefersFlats(pc: number, minor = false): boolean {
  const major = minor ? (pc + 3) % 12 : pc;
  return KEYS.find((k) => k.pc === major)?.flats ?? true;
}

// ── Roman numerals ─────────────────────────────────────────────────────────
// Presets are written the way a teacher writes them on a whiteboard:
// 'ii7 V7 Imaj7', 'iiø7 V7alt i6', '#iv°7'. Case carries the default
// quality (lowercase is minor) and the suffix refines it.

const NUMERALS: Record<string, number> = {
  i: 0,
  ii: 2,
  iii: 4,
  iv: 5,
  v: 7,
  vi: 9,
  vii: 11,
};

export function parseRoman(token: string, keyPc: number): Chord | null {
  const m = String(token)
    .trim()
    .match(/^([b#♭♯]?)(iii|vii|ii|iv|vi|i|v)(.*)$/i);
  if (!m) return null;
  const degree = NUMERALS[m[2].toLowerCase()];
  const shift = m[1] === 'b' || m[1] === '♭' ? -1 : m[1] ? 1 : 0;
  const minorCase = m[2] === m[2].toLowerCase();
  const rest = m[3];

  let quality: Quality | null;
  if (/^(ø7?|m7b5)$/.test(rest)) quality = 'm7b5';
  else if (/^(°7|o7|dim7)$/.test(rest)) quality = 'dim7';
  else if (/^(°|o|dim)$/.test(rest)) quality = 'dim';
  else if (rest === '') quality = minorCase ? 'min' : 'maj';
  else if (rest === '7') quality = minorCase ? 'm7' : '7';
  else if (rest === '6') quality = minorCase ? 'm6' : '6';
  else if (minorCase && /^(maj7|Δ7?)$/.test(rest)) quality = 'mMaj7';
  else quality = qualityFromSuffix(rest);
  if (!quality) return null;

  // A raised numeral is spelled sharp whatever the key: #iv°7 in C is F#dim7,
  // not Gbdim7. A lowered one is spelled flat. Unaltered ones follow the key.
  const flats = shift > 0 ? false : shift < 0 ? true : undefined;
  return { root: mod12(keyPc + degree + shift), quality, bass: null, flats };
}

// ── Progressions ───────────────────────────────────────────────────────────
// One string per bar; two chords in a bar split it evenly. Presets are
// key-relative; `minor` tells the key picker to say "C minor" and spell with
// the minor key's accidentals. Named by what they are, not by tunes.

export interface Progression {
  id: string;
  name: string;
  group: string;
  minor?: boolean;
  bars: string[];
}

export const PROGRESSIONS: Progression[] = [
  {
    id: 'two-five-one',
    name: 'ii–V–I',
    group: 'Jazz',
    bars: ['ii7', 'V7', 'Imaj7', 'Imaj7'],
  },
  {
    id: 'minor-two-five',
    name: 'Minor ii–V–i',
    group: 'Jazz',
    minor: true,
    bars: ['iiø7', 'V7alt', 'i6', 'i6'],
  },
  {
    id: 'turnaround',
    name: 'I–vi–ii–V',
    group: 'Jazz',
    bars: ['Imaj7', 'vi7', 'ii7', 'V7'],
  },
  {
    id: 'jazz-blues',
    name: 'Jazz blues',
    group: 'Blues',
    bars: [
      'I7',
      'IV7',
      'I7',
      'v7 I7',
      'IV7',
      '#iv°7',
      'I7',
      'VI7',
      'ii7',
      'V7',
      'I7 VI7',
      'ii7 V7',
    ],
  },
  {
    id: 'basic-blues',
    name: 'Basic 12-bar blues',
    group: 'Blues',
    bars: [
      'I7',
      'I7',
      'I7',
      'I7',
      'IV7',
      'IV7',
      'I7',
      'I7',
      'V7',
      'IV7',
      'I7',
      'V7',
    ],
  },
  {
    id: 'minor-blues',
    name: 'Minor blues',
    group: 'Blues',
    minor: true,
    bars: [
      'i7',
      'i7',
      'i7',
      'i7',
      'iv7',
      'iv7',
      'i7',
      'i7',
      'bVI7',
      'V7alt',
      'i7',
      'V7alt',
    ],
  },
  {
    id: 'rhythm-a',
    name: 'Rhythm changes (A)',
    group: 'Jazz',
    bars: [
      'I6 vi7',
      'ii7 V7',
      'iii7 VI7',
      'ii7 V7',
      'v7 I7',
      'IV7 #iv°7',
      'I6 vi7',
      'ii7 V7',
    ],
  },
  {
    id: 'pop-four',
    name: 'I–V–vi–IV',
    group: 'Pop & Funk',
    bars: ['I', 'V', 'vi', 'IV'],
  },
  {
    id: 'dom-vamp',
    name: 'Dominant vamp',
    group: 'Pop & Funk',
    bars: ['I7', 'I7', 'I7', 'I7'],
  },
  {
    id: 'minor-vamp',
    name: 'Minor vamp',
    group: 'Pop & Funk',
    minor: true,
    bars: ['i7', 'i7', 'i7', 'i7'],
  },
  {
    id: 'minor-cycle',
    name: 'Minor i–iv–v',
    group: 'Latin',
    minor: true,
    bars: ['i7', 'i7', 'iv7', 'iv7', 'iiø7', 'V7alt', 'i7', 'i7'],
  },
  {
    id: 'major-cycle',
    name: 'I–IV–ii–V',
    group: 'Latin',
    bars: ['Imaj7', 'IVmaj7', 'ii7', 'V7'],
  },
];

export function progressionById(id: string): Progression {
  return PROGRESSIONS.find((p) => p.id === id) ?? PROGRESSIONS[0];
}

/** A preset in a key → bars of chords. */
export function realizePreset(preset: Progression, keyPc: number): Chord[][] {
  return preset.bars.map((bar) =>
    bar
      .trim()
      .split(/\s+/)
      .map((t) => parseRoman(t, keyPc))
      .filter((c): c is Chord => c !== null),
  );
}

// ── Charts ─────────────────────────────────────────────────────────────────

/**
 * One bar as a lead sheet writes it: chords separated by spaces, split evenly
 * across the bar. A '.' is a slot where the previous chord carries on, so
 * 'C . . G7' is three beats of C and one of G7 in 4/4. '%' (or an empty bar)
 * repeats the previous bar. Also returns the tokens that aren't chords, so the
 * chart field can point at the typo.
 */
export function parseBar(
  text: string | null | undefined,
  previousBar: Chord[] | null = null,
): { chords: Chord[]; bad: string[]; repeat: boolean } {
  const t = String(text ?? '').trim();
  if (!t || t === '%')
    return {
      chords: previousBar ? [...previousBar] : [],
      bad: [],
      repeat: true,
    };
  const bad: string[] = [];
  const chords: Chord[] = [];
  t.split(/\s+/).forEach((tok) => {
    if (tok === '.' || tok === '/') {
      if (chords.length) chords.push(chords[chords.length - 1]);
      else if (previousBar?.length)
        chords.push(previousBar[previousBar.length - 1]);
      return;
    }
    const c = parseChord(tok);
    if (c) chords.push(c);
    else bad.push(tok);
  });
  return { chords, bad, repeat: false };
}

/** '| Dm7 G7 | Cmaj7 | % |' → bars of chords. Bars split on '|'. */
export function parseChart(text: string | null | undefined): {
  bars: Chord[][];
  bad: string[];
} {
  const bad: string[] = [];
  const bars: Chord[][] = [];
  String(text || '')
    .split('|')
    .map((b) => b.trim())
    .filter(Boolean)
    .forEach((bar) => {
      const r = parseBar(bar, bars[bars.length - 1] ?? null);
      bad.push(...r.bad);
      if (r.chords.length) bars.push(r.chords);
    });
  return { bars, bad };
}

/**
 * Best guess at a chart's key from its chords: the major key whose diatonic
 * chords, weighted towards the first and last, account for the most of them.
 * Only used to pick sharps or flats.
 */
export function guessKey(bars: Chord[][]): { pc: number; minor: boolean } {
  const chords = bars.flat().filter((c) => c && !c.nc);
  if (!chords.length) return { pc: 0, minor: false };
  const DIATONIC: [number, string][] = [
    [0, 'maj'],
    [2, 'min'],
    [4, 'min'],
    [5, 'maj'],
    [7, 'dom'],
    [9, 'min'],
    [11, 'dim'],
  ];
  const family = (q: Quality) =>
    ['min', 'm7', 'm6', 'mMaj7'].includes(q)
      ? 'min'
      : ['m7b5', 'dim', 'dim7'].includes(q)
        ? 'dim'
        : ['7', '7b9', '7alt', '7sus'].includes(q)
          ? 'dom'
          : 'maj';
  let best = { pc: 0, score: -1 };
  for (let k = 0; k < 12; k += 1) {
    let score = 0;
    chords.forEach((c, i) => {
      const deg = mod12(c.root - k);
      const hit = DIATONIC.find(([d]) => d === deg);
      if (!hit) return;
      const f = family(c.quality);
      const fits =
        hit[1] === f || (hit[1] === 'dom' && (f === 'dom' || f === 'maj'));
      let w = fits ? 1 : 0.4;
      if (deg === 0 && i === chords.length - 1) w += 2; // ends on the tonic
      if (deg === 0 && i === 0) w += 1;
      score += w;
    });
    if (score > best.score) best = { pc: k, score };
  }
  // A final minor tonic means the relative minor.
  const last = chords[chords.length - 1];
  const minorEnd =
    last && family(last.quality) === 'min' && mod12(last.root - best.pc) === 9;
  return minorEnd
    ? { pc: (best.pc + 9) % 12, minor: true }
    : { pc: best.pc, minor: false };
}

// ── Timeline ───────────────────────────────────────────────────────────────
// Bars of chords → spans in quarter notes, the unit the generator and Tone
// both count in. A 2/4 samba would otherwise change chord twice as often as
// the chart means, so short meters stretch each chart bar across two of theirs.

export type TimeSignature = [number, number];

export function quartersPerBar([top, bottom]: TimeSignature): number {
  return top / (bottom / 4);
}

export function chartBarQuarters(timeSignature: TimeSignature): number {
  const q = quartersPerBar(timeSignature);
  return q < 3 ? q * 2 : q;
}

export interface ChordSpan {
  start: number;
  end: number;
  chord: Chord;
  bar: number;
}

export function chordSpans(
  bars: Chord[][],
  timeSignature: TimeSignature,
): { spans: ChordSpan[]; totalQuarters: number; barQuarters: number } {
  const barQ = chartBarQuarters(timeSignature);
  const spans: ChordSpan[] = [];
  bars.forEach((chords, b) => {
    const each = barQ / chords.length;
    chords.forEach((chord, i) => {
      const start = b * barQ + i * each;
      const prev = spans[spans.length - 1];
      // Two bars of the same chord are one span: the bass shouldn't treat
      // bar 2 of a vamp as a change to land on.
      if (prev && sameChord(prev.chord, chord) && prev.end === start)
        prev.end = start + each;
      else spans.push({ start, end: start + each, chord, bar: b });
    });
  });
  return { spans, totalQuarters: bars.length * barQ, barQuarters: barQ };
}

function sameChord(a: Chord, b: Chord): boolean {
  if (a.nc || b.nc) return Boolean(a.nc && b.nc);
  return (
    a.root === b.root &&
    a.quality === b.quality &&
    (a.bass ?? null) === (b.bass ?? null)
  );
}
