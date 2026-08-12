/**
 * popBackingEngine.ts — Pop play-along drum patterns.
 * TypeScript port of pop_engine_patterns.py (L1 drums).
 *
 * All onsets on-grid; humanization (±6 ticks) applied at render time.
 * TPQ=480, BAR=1920.
 */

const TPQ = 480;
const BAR = 1920;
const EIGHTH = 240;
const SIXTEENTH = 120;

// GM drum pitches
const KICK = 36;
const SNARE = 38;
const CLAP = 39;
const SIDESTICK = 37;
const HAT_CLOSED = 42;
const HAT_PEDAL = 44;
const HAT_OPEN = 46;
const TAMBOURINE = 54;
const LOW_TOM = 45;
const MID_TOM = 47;
const HIGH_TOM = 50;

export interface PopNote {
  note: number;
  onset: number;
  duration: number;
  velocity: number;
  part: 'drums' | 'bass' | 'chords';
}

function h(): number {
  return Math.floor(Math.random() * 7);
}

// ── T001/T002/T007 — drums_pop_sidestick_eighth ───────────────────────────────
// Mid-tempo pop ballad. Sidestick on 2+4, tambourine, closed-hat eighths,
// variable kick A/B pattern alternating each bar.
function drumsSidestickEighth(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const isA = bar % 2 === 0;
    const isPhraseEnd = (bar + 1) % 8 === 0;

    // Sidestick on beats 2 and 4
    for (const t of [TPQ, 3 * TPQ]) {
      notes.push({
        note: SIDESTICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 96,
        part: 'drums',
      });
    }
    // Closed hat every eighth
    for (let i = 0; i < 8; i++) {
      notes.push({
        note: HAT_CLOSED,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: i % 2 === 0 ? 80 : 70,
        part: 'drums',
      });
    }
    // Tambourine on strong eighths (0, 2, 4, 6)
    for (let i = 0; i < 8; i += 2) {
      notes.push({
        note: TAMBOURINE,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: 64,
        part: 'drums',
      });
    }
    // Variable kick
    const kickOnsets = isPhraseEnd
      ? [0, 240, 720, 960, 1680]
      : isA
        ? [0, 960, 1200, 1680]
        : [720, 960, 1680];
    for (const t of kickOnsets) {
      notes.push({
        note: KICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 100,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── T011 — drums_pop_classic_rock_beat ───────────────────────────────────────
// Kick 1+3, snare 2+4, eighth hats. Pedal hat layer enters bar 4+.
// Phrase-end (bar 8, 16, …) replaces snare with clap-roll fill.
function drumsClassicRockBeat(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const isPhraseEnd = (bar + 1) % 8 === 0;
    const withPedalHat = bar >= 4;

    // Kick: beats 1 and 3
    for (const t of [0, 2 * TPQ]) {
      notes.push({
        note: KICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 104,
        part: 'drums',
      });
    }
    // Snare: beats 2 and 4 (omitted on phrase-end — fill takes over)
    if (!isPhraseEnd) {
      for (const t of [TPQ, 3 * TPQ]) {
        notes.push({
          note: SNARE,
          onset: o + t + h(),
          duration: EIGHTH,
          velocity: 100,
          part: 'drums',
        });
      }
    }
    // Closed hat every eighth
    for (let i = 0; i < 8; i++) {
      notes.push({
        note: HAT_CLOSED,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: i % 2 === 0 ? 84 : 72,
        part: 'drums',
      });
    }
    // Pedal hat — additive layer from bar 4 onward
    if (withPedalHat) {
      for (let i = 0; i < 8; i++) {
        notes.push({
          note: HAT_PEDAL,
          onset: o + i * EIGHTH + h(),
          duration: EIGHTH,
          velocity: 56,
          part: 'drums',
        });
      }
    }
    // Phrase-end fill: clap roll + tom run (fill_pop_clap_roll_into_crash)
    if (isPhraseEnd) {
      for (const t of [
        Math.round(1.5 * TPQ),
        Math.round(1.75 * TPQ),
        2 * TPQ,
        Math.round(2.25 * TPQ),
        Math.round(2.5 * TPQ),
        Math.round(2.75 * TPQ),
        3 * TPQ,
      ]) {
        notes.push({
          note: CLAP,
          onset: o + t + h(),
          duration: SIXTEENTH,
          velocity: 96,
          part: 'drums',
        });
      }
      for (const [t, note] of [
        [Math.round(3.25 * TPQ), HIGH_TOM],
        [Math.round(3.5 * TPQ), MID_TOM],
        [Math.round(3.75 * TPQ), KICK],
      ] as [number, number][]) {
        notes.push({
          note,
          onset: o + t + h(),
          duration: SIXTEENTH,
          velocity: 92,
          part: 'drums',
        });
      }
    }
  }
  return notes;
}

// ── T004 — drums_pop_eighth_tom_u2 ───────────────────────────────────────────
// Driving eighth-note low-tom pulse (U2 style), kick 1+3, snare 2+4.
function drumsEighthTomU2(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    for (let i = 0; i < 8; i++) {
      notes.push({
        note: LOW_TOM,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: i % 2 === 0 ? 84 : 72,
        part: 'drums',
      });
    }
    for (const t of [0, 2 * TPQ]) {
      notes.push({
        note: KICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 100,
        part: 'drums',
      });
    }
    for (const t of [TPQ, 3 * TPQ]) {
      notes.push({
        note: SNARE,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 92,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── T003 — drums_pop_uptempo_synth_snare ─────────────────────────────────────
// Open hat on beat 1 ("splash"), closed hats on 2–8, kick 1+3, snare 2+4.
function drumsUptempoSynthSnare(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    notes.push({
      note: HAT_OPEN,
      onset: o + h(),
      duration: EIGHTH * 2,
      velocity: 92,
      part: 'drums',
    });
    for (const i of [2, 3, 4, 5, 6, 7]) {
      notes.push({
        note: HAT_CLOSED,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: 76,
        part: 'drums',
      });
    }
    for (const t of [0, 2 * TPQ]) {
      notes.push({
        note: KICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 104,
        part: 'drums',
      });
    }
    for (const t of [TPQ, 3 * TPQ]) {
      notes.push({
        note: SNARE,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 100,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── T005 — drums_pop_sparse_halftime_synth ───────────────────────────────────
// Half-time feel: kick on beat 1, snare on beat 3, sparse quarter hats.
function drumsSparseHalftimeSynth(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    notes.push({
      note: KICK,
      onset: o + h(),
      duration: EIGHTH,
      velocity: 100,
      part: 'drums',
    });
    notes.push({
      note: SNARE,
      onset: o + 2 * TPQ + h(),
      duration: EIGHTH,
      velocity: 100,
      part: 'drums',
    });
    for (let b = 0; b < 4; b++) {
      notes.push({
        note: HAT_CLOSED,
        onset: o + b * TPQ + h(),
        duration: EIGHTH,
        velocity: 64,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── T006 — drums_pop_trap_ballad_16ths ───────────────────────────────────────
// 16th-note kick syncopation, clap on 2+4, 16th hat grid.
function drumsTrapBallad16ths(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    for (const t of [
      0,
      Math.round(0.75 * TPQ),
      2 * TPQ,
      Math.round(2.75 * TPQ),
    ]) {
      notes.push({
        note: KICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 100,
        part: 'drums',
      });
    }
    for (const t of [TPQ, 3 * TPQ]) {
      notes.push({
        note: CLAP,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 96,
        part: 'drums',
      });
    }
    for (let i = 0; i < 16; i++) {
      const vel = i % 4 === 0 ? 76 : i % 2 === 0 ? 60 : 50;
      notes.push({
        note: HAT_CLOSED,
        onset: o + i * SIXTEENTH + h(),
        duration: SIXTEENTH,
        velocity: vel,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── T008 — drums_pop_simple_pop_beat_no_kick ─────────────────────────────────
// Kickless. Snare 2+4, closed hat eighths.
function drumsSimplePopBeatNoKick(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    for (const t of [TPQ, 3 * TPQ]) {
      notes.push({
        note: SNARE,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 92,
        part: 'drums',
      });
    }
    for (let i = 0; i < 8; i++) {
      notes.push({
        note: HAT_CLOSED,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: 72,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── T016 — drums_pop_neo_soul_2_bar ──────────────────────────────────────────
// 2-bar phrase, syncopated kick. Bar A: kick 1, 1.75. Bar B: kick 1, 2.75, 3.
function drumsNeoSoul2Bar(bars: number): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const isBarA = bar % 2 === 0;
    const kickOnsets = isBarA
      ? [0, Math.round(0.75 * TPQ)]
      : [0, Math.round(2.75 * TPQ), 3 * TPQ];
    for (const t of kickOnsets) {
      notes.push({
        note: KICK,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 100,
        part: 'drums',
      });
    }
    for (const t of [TPQ, 3 * TPQ]) {
      notes.push({
        note: SNARE,
        onset: o + t + h(),
        duration: EIGHTH,
        velocity: 96,
        part: 'drums',
      });
    }
    for (let i = 0; i < 8; i++) {
      notes.push({
        note: HAT_CLOSED,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH,
        velocity: i % 2 === 0 ? 78 : 64,
        part: 'drums',
      });
    }
  }
  return notes;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type PopGrooveId =
  | 'groove_pop_01' // sidestick eighth (ballad)
  | 'groove_pop_02' // classic rock beat
  | 'groove_pop_03' // eighth tom U2
  | 'groove_pop_04' // uptempo synth snare
  | 'groove_pop_05' // sparse halftime synth
  | 'groove_pop_06' // trap ballad 16ths
  | 'groove_pop_07' // simple pop beat (no kick)
  | 'groove_pop_08'; // neo-soul 2-bar

export function buildPopDrums(bars: number, grooveId: PopGrooveId): PopNote[] {
  switch (grooveId) {
    case 'groove_pop_01':
      return drumsSidestickEighth(bars);
    case 'groove_pop_02':
      return drumsClassicRockBeat(bars);
    case 'groove_pop_03':
      return drumsEighthTomU2(bars);
    case 'groove_pop_04':
      return drumsUptempoSynthSnare(bars);
    case 'groove_pop_05':
      return drumsSparseHalftimeSynth(bars);
    case 'groove_pop_06':
      return drumsTrapBallad16ths(bars);
    case 'groove_pop_07':
      return drumsSimplePopBeatNoKick(bars);
    case 'groove_pop_08':
      return drumsNeoSoul2Bar(bars);
  }
}

// ── Pop chord voice-leading rule ──────────────────────────────────────────────
//
// Pop Rule: consecutive chord roots must never jump more than a perfect fifth
// (7 semitones). Always use root position; pick the octave of the new root
// that is closest to the previous chord's root and within P5.
//
// Usage when authoring targetNotes for chord steps:
//   let prev = 60; // C4
//   const [r, t, f] = popRootPosWithinP5(9, 'min', prev); // Am → [57,60,64]
//   prev = r; // 57
//   const [r2, t2, f2] = popRootPosWithinP5(5, 'maj', prev); // Fm → [53,57,60]

/**
 * Returns a root-position triad [root, third, fifth] for the given chord,
 * picking the octave of the root that is closest to `prevRoot` and within a
 * perfect fifth (7 semitones). Enforces the Pop P5 voice-leading rule.
 *
 * @param rootPc  Pitch class of the chord root: 0=C, 2=D, 4=E, 5=F, 7=G, 9=A, 11=B
 * @param quality 'maj' or 'min'
 * @param prevRoot MIDI note of the previous chord's root (the bass note)
 * @param range   Acceptable MIDI range for the root (default [40, 76])
 */
export function popRootPosWithinP5(
  rootPc: number,
  quality: 'maj' | 'min',
  prevRoot: number,
  range: [number, number] = [40, 76],
): [number, number, number] {
  const pc = ((rootPc % 12) + 12) % 12;
  const [i1, i2] = quality === 'maj' ? [4, 7] : [3, 7];

  const candidates: number[] = [];
  for (let midi = range[0]; midi <= range[1]; midi++) {
    if (midi % 12 === pc) candidates.push(midi);
  }
  if (!candidates.length) {
    const fallback = pc + 48;
    return [fallback, fallback + i1, fallback + i2];
  }

  // Prefer candidates within P5 (7 semitones); fall back to nearest if none
  const withinP5 = candidates.filter((r) => Math.abs(r - prevRoot) <= 7);
  const pool = withinP5.length > 0 ? withinP5 : candidates;
  pool.sort((a, b) => Math.abs(a - prevRoot) - Math.abs(b - prevRoot));

  const root = pool[0];
  return [root, root + i1, root + i2];
}

// ── Chord symbol parser ───────────────────────────────────────────────────────

const NOTE_PC_MAP: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function parseChordSymbol(s: string): {
  rootPc: number;
  quality: 'maj' | 'min';
} {
  const m = s.match(/^([A-G][b#]?)(m(?!aj))?/);
  if (!m) return { rootPc: 0, quality: 'maj' };
  return { rootPc: NOTE_PC_MAP[m[1]] ?? 0, quality: m[2] ? 'min' : 'maj' };
}

// Finds the MIDI note with pitch class `rootPc` closest to `prevRoot`
// within P5 (7 semitones), constrained to `range`. Same logic as popRootPosWithinP5
// but returns only the single root note (not a triad).
function closestMidi(
  rootPc: number,
  prevRoot: number,
  range: [number, number],
): number {
  const pc = ((rootPc % 12) + 12) % 12;
  const candidates: number[] = [];
  for (let midi = range[0]; midi <= range[1]; midi++) {
    if (midi % 12 === pc) candidates.push(midi);
  }
  if (!candidates.length) return prevRoot;
  const withinP5 = candidates.filter((r) => Math.abs(r - prevRoot) <= 7);
  const pool = withinP5.length > 0 ? withinP5 : candidates;
  pool.sort((a, b) => Math.abs(a - prevRoot) - Math.abs(b - prevRoot));
  return pool[0];
}

// ── Per-bar chord data ────────────────────────────────────────────────────────

interface BarData {
  bassRoot: number; // MIDI in bass register [28–55], P5 voice-led
  voicing: [number, number, number]; // root-pos triad in [48–72], P5 voice-led
}

function buildBarData(
  bars: number,
  chordSymbols: string[],
  keyRootMidi: number,
): BarData[] {
  const symbols = chordSymbols.length > 0 ? chordSymbols : ['C'];
  const keyPc = ((keyRootMidi % 12) + 12) % 12;

  let prevBassRoot = closestMidi(keyPc, 24, [16, 43]);
  let prevVoicingRoot = closestMidi(keyPc, 60, [48, 72]);

  return Array.from({ length: bars }, (_, bar) => {
    const { rootPc, quality } = parseChordSymbol(symbols[bar % symbols.length]);
    const bassRoot = closestMidi(rootPc, prevBassRoot, [16, 43]);
    prevBassRoot = bassRoot;
    const voicing = popRootPosWithinP5(
      rootPc,
      quality,
      prevVoicingRoot,
      [48, 72],
    );
    prevVoicingRoot = voicing[0];
    return { bassRoot, voicing };
  });
}

// ── Bass patterns ─────────────────────────────────────────────────────────────

// Quarter-note roots on beats 1–3; chromatic walk-up (half-step below next root) on beat 4.
function bassRootPulseWithWalks(bars: number, data: BarData[]): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const root = data[bar].bassRoot;
    const nextRoot = data[(bar + 1) % data.length].bassRoot;
    for (let b = 0; b < 3; b++) {
      notes.push({
        note: root,
        onset: o + b * TPQ + h(),
        duration: TPQ - 20,
        velocity: 72,
        part: 'chords',
      });
    }
    notes.push({
      note: nextRoot - 1,
      onset: o + 3 * TPQ + h(),
      duration: TPQ - 20,
      velocity: 65,
      part: 'chords',
    });
  }
  return notes;
}

// Driving eighth-note pulse on the root (rock/uptempo grooves).
function bassEighthPulse(bars: number, data: BarData[]): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const root = data[bar].bassRoot;
    for (let i = 0; i < 8; i++) {
      notes.push({
        note: root,
        onset: o + i * EIGHTH + h(),
        duration: EIGHTH - 15,
        velocity: i % 2 === 0 ? 72 : 62,
        part: 'chords',
      });
    }
  }
  return notes;
}

// 3+3+2 tresillo rhythm on root (uptempo synth-pop grooves).
function bassTresilloRoot(bars: number, data: BarData[]): PopNote[] {
  const onsets = [0, EIGHTH * 3, EIGHTH * 6];
  const durations = [EIGHTH + SIXTEENTH, EIGHTH + SIXTEENTH, EIGHTH * 2];
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const root = data[bar].bassRoot;
    onsets.forEach((t, i) => {
      notes.push({
        note: root,
        onset: o + t + h(),
        duration: durations[i] - 10,
        velocity: 72,
        part: 'chords',
      });
    });
  }
  return notes;
}

// Whole-note sustain per chord (sparse/halftime/trap grooves).
function bassSustainedRoot(bars: number, data: BarData[]): PopNote[] {
  return data.slice(0, bars).map((d, bar) => ({
    note: d.bassRoot,
    onset: bar * BAR + h(),
    duration: BAR - 20,
    velocity: 70,
    part: 'chords' as const,
  }));
}

// Root on beats 1+3, fifth on beats 2+4 (neo-soul/R&B groove).
function bassRootFifthAlternating(bars: number, data: BarData[]): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    const root = data[bar].bassRoot;
    [root, root + 7, root, root + 7].forEach((note, b) => {
      notes.push({
        note,
        onset: o + b * TPQ + h(),
        duration: TPQ - 20,
        velocity: b === 0 ? 72 : 65,
        part: 'chords',
      });
    });
  }
  return notes;
}

// ── Aux layers ────────────────────────────────────────────────────────────────

// Strings: bass root doubled up one octave, whole-note sustain, very soft.
// Adds warmth and depth from bar 0.
function auxStringsDouble(bars: number, data: BarData[]): PopNote[] {
  return data.slice(0, bars).map((d, bar) => ({
    note: d.bassRoot + 12,
    onset: bar * BAR,
    duration: BAR - 30,
    velocity: 50,
    part: 'chords' as const,
  }));
}

// Pad: chord triad shifted up an octave, whole-note sustain, very soft.
// Additive buildup — enters at entryBar (default bar 4, second pass through form).
function padSustainedChordTones(
  bars: number,
  data: BarData[],
  entryBar = 4,
): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = entryBar; bar < bars; bar++) {
    const o = bar * BAR;
    data[bar].voicing.forEach((midi) => {
      notes.push({
        note: midi + 12,
        onset: o,
        duration: BAR - 20,
        velocity: 40,
        part: 'chords',
      });
    });
  }
  return notes;
}

// ── Comping patterns (triggered only when engine_generates includes 'chords') ──

// Quarter-note chord stabs on all 4 beats (ballad/sparse grooves).
function compingQuarterChunk(bars: number, data: BarData[]): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    for (let b = 0; b < 4; b++) {
      data[bar].voicing.forEach((midi) => {
        notes.push({
          note: midi,
          onset: o + b * TPQ + h(),
          duration: TPQ - 20,
          velocity: 80,
          part: 'chords',
        });
      });
    }
  }
  return notes;
}

// Eighth-note chord stabs (rock/uptempo grooves).
function compingEighthChunk(bars: number, data: BarData[]): PopNote[] {
  const notes: PopNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    for (let i = 0; i < 8; i++) {
      data[bar].voicing.forEach((midi) => {
        notes.push({
          note: midi,
          onset: o + i * EIGHTH + h(),
          duration: EIGHTH - 10,
          velocity: i % 2 === 0 ? 78 : 62,
          part: 'chords',
        });
      });
    }
  }
  return notes;
}

// ── Public multi-track builders ───────────────────────────────────────────────

/** Bass track: root-voiced, P5 voice-led, pattern matches the groove template. */
export function buildPopBass(
  bars: number,
  grooveId: PopGrooveId,
  chordSymbols: string[],
  keyRootMidi: number,
): PopNote[] {
  const data = buildBarData(bars, chordSymbols, keyRootMidi);
  switch (grooveId) {
    case 'groove_pop_01':
    case 'groove_pop_07':
      return bassRootPulseWithWalks(bars, data);
    case 'groove_pop_02':
    case 'groove_pop_03':
      return bassEighthPulse(bars, data);
    case 'groove_pop_04':
      return bassTresilloRoot(bars, data);
    case 'groove_pop_05':
    case 'groove_pop_06':
      return bassSustainedRoot(bars, data);
    case 'groove_pop_08':
      return bassRootFifthAlternating(bars, data);
  }
}

/**
 * Aux layers: strings double (bars 0+) + sustained pad (bars 4+).
 * Always added to pop play-alongs regardless of engine_generates.
 */
export function buildPopAux(
  bars: number,
  grooveId: PopGrooveId,
  chordSymbols: string[],
  keyRootMidi: number,
  contentBars = 4,
): PopNote[] {
  if (!chordSymbols.length) return [];
  const data = buildBarData(bars, chordSymbols, keyRootMidi);
  return [
    ...auxStringsDouble(bars, data),
    ...padSustainedChordTones(bars, data, contentBars),
  ];
}

/** Comping: chord voicings with rhythm matching the groove. Only call when
 *  engine_generates includes 'chords' (student is not playing the chords). */
export function buildPopComping(
  bars: number,
  grooveId: PopGrooveId,
  chordSymbols: string[],
  keyRootMidi: number,
): PopNote[] {
  if (!chordSymbols.length) return [];
  const data = buildBarData(bars, chordSymbols, keyRootMidi);
  switch (grooveId) {
    case 'groove_pop_02':
    case 'groove_pop_03':
    case 'groove_pop_04':
      return compingEighthChunk(bars, data);
    default:
      return compingQuarterChunk(bars, data);
  }
}
