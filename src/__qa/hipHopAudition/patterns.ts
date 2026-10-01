/**
 * Hip Hop groove audition — progressions and their play-along presets for the
 * audition page (/__hiphop-grooves). The drum, bass and chord-rhythm patterns
 * live in the engine (hipHop/hipHopPatterns.ts) so the page and the lessons
 * play the same thing.
 *
 * Grids are one character per 16th, 16 per bar (480 ticks = a quarter):
 *   x hit   X accent   g ghost   o open hat (hat row only)
 *   r two 32nds (trap roll)   t three-hit triplet roll inside one 16th
 */

import {
  BAR_TICKS,
  BOOM_BAP_A,
  BOOM_BAP_B,
  BOOM_BAP_COMP,
  BOOM_BAP_STUDIO,
  CHUNK_EIGHTHS_STACCATO,
  CHUNK_QUARTERS,
  EIGHT_O_EIGHT_SLIDE,
  EIGHT_O_EIGHT_STACCATO,
  FOLLOW_KICK,
  HELD,
  LAID_BACK,
  ROOTS_1_3,
  ROOTS_PUSH,
  SUS2_BASS,
  TICKS_PER_16TH,
  TRAP_A,
  TRAP_B,
  TRAP_COMP,
  TRAP_EXPAND_7,
  TRAP_EXPAND_AEOLIAN,
  TRAP_EXPAND_B3,
  TRAP_EXPAND_B7,
  TRAP_FOUNDATION,
  TRAP_ONE_NOTE,
  type BassPattern,
  type BassTone,
  type CompPattern,
  type DrumPattern,
  type DrumVoice,
  DRUM_NOTES,
  OPEN_HAT,
} from '@/curriculum/engine/genreGeneration/hipHop/hipHopPatterns';
import type { DrumKitId } from '@/daw/instruments/drumKits';

export {
  BAR_TICKS,
  TICKS_PER_16TH,
  type BassPattern,
  type CompPattern,
  type DrumPattern,
};

export const LOOP_BARS = 4;

// ── Progressions ───────────────────────────────────────────────────────────

export interface ProgressionBar {
  symbol: string;
  /** Right-hand voicing, MIDI. Chords stay at or below C5. */
  rh: number[];
  /** Chord root pitch class, 0 = C. */
  rootPc: number;
  /** How the voicing is built, for the page. */
  voicing: string;
  /** Bass note when it isn't the root (slash chords), pitch class. */
  bassPc?: number;
  /** Exact bass MIDI note, when the default register would leap. */
  bass?: number;
  /** Play the RH as an 8th-note arpeggio pattern instead of the chord rhythm. */
  arp?: boolean;
}

export interface Progression {
  id: string;
  /** Hybrid numbering, e.g. "♭6 maj – ♭7 maj – 1 min". */
  degrees: string;
  reference?: string;
  /** One chord per bar, or several splitting the bar evenly. */
  bars: (ProgressionBar | ProgressionBar[])[];
  /** Aaron's settings for this progression; applied when it is picked. */
  preset?: Preset;
}

export interface Preset {
  bpm?: number;
  swing?: number;
  kit?: DrumKitId;
  bassVoice?: BassVoice;
  drums?: string;
  bass?: string;
  comp?: string;
}

/** The chords in a bar (one, or several splitting it evenly). */
export function barChords(
  progression: Progression,
  bar: number,
): ProgressionBar[] {
  const b = progression.bars[bar % progression.bars.length];
  return Array.isArray(b) ? b : [b];
}

/** The chord sounding at a 16th step of a bar. */
export function chordAt(
  progression: Progression,
  bar: number,
  step: number,
): ProgressionBar {
  const chords = barChords(progression, bar);
  return chords[
    Math.min(chords.length - 1, Math.floor((step * chords.length) / 16))
  ];
}

// ── Styles ─────────────────────────────────────────────────────────────────

export type BassVoice =
  | 'electric'
  | '808'
  | 'fretless'
  | 'fretless_mk'
  | 'finger'
  | 'upright';

/** What the Bass menu shows for each voice. */
export const BASS_VOICE_LABELS: Record<BassVoice, string> = {
  electric: 'Electric (old default)',
  '808': '808 (synth)',
  fretless: 'Fretless — FluidR3',
  fretless_mk: 'Fretless — MusyngKite',
  finger: 'Finger electric — FluidR3',
  upright: 'Upright — FluidR3',
};

export interface Feel {
  /** Ticks; negative is early. */
  kickOffset: number;
  snareOffset: number;
}

export interface AuditionStyle {
  id: string;
  level: string;
  title: string;
  blurb: string;
  key: string;
  /** Spell accidentals as flats (flat keys) rather than sharps. */
  flats?: boolean;
  bpm: number;
  bpmRange: [number, number];
  /** 50 = straight 16ths, 66 = triplet swing. */
  swing: number;
  feel?: Feel;
  kit: DrumKitId;
  bassVoice: BassVoice;
  /** Play today's generator output (the Funk fallback) instead of the patterns. */
  engine?: 'current';
  drums: DrumPattern[];
  bass: BassPattern[];
  comping: CompPattern[];
  progressions: Progression[];
}

// ════════════════════════════════════════════════════════════════════════════
// Progressions (4 bars, one chord per bar)
// ════════════════════════════════════════════════════════════════════════════

type Chord = ProgressionBar;

/** Hip Hop plays chords high: Boom Bap backing sits in the C6–C8 range. */
const up = (chord: Chord, octaves: number): Chord => ({
  ...chord,
  rh: chord.rh.map((n) => n + 12 * octaves),
});

// L1 — C minor, triads only.
const Cm: Chord = {
  symbol: 'Cm',
  rh: [60, 63, 67],
  rootPc: 0,
  voicing: 'root position',
};
const Cm1: Chord = {
  symbol: 'Cm (1st inv.)',
  rh: [63, 67, 72],
  rootPc: 0,
  voicing: '1st inversion',
};
const Fm: Chord = {
  symbol: 'Fm',
  rh: [65, 68, 72],
  rootPc: 5,
  voicing: 'root position',
};
const G: Chord = {
  symbol: 'G',
  rh: [55, 59, 62],
  rootPc: 7,
  voicing: 'root position',
};
const G1: Chord = {
  symbol: 'G (1st inv.)',
  rh: [59, 62, 67],
  rootPc: 7,
  voicing: '1st inversion',
};

// L2 — A minor: triads, inversions, sus2 and sus4. Bass E1 → D1 steps down.
const Em1: Chord = {
  symbol: 'Em (1st inv.)',
  rh: [55, 59, 64],
  rootPc: 4,
  bass: 28,
  voicing: '1st inversion',
};
const Dm1: Chord = {
  symbol: 'Dm (1st inv.)',
  rh: [53, 57, 62],
  rootPc: 2,
  bass: 26,
  voicing: '1st inversion',
};
const Dm: Chord = {
  symbol: 'Dm',
  rh: [62, 65, 69],
  rootPc: 2,
  voicing: 'root position',
};
const Asus4_1: Chord = {
  symbol: 'Am sus4 (1st inv.)',
  rh: [62, 64, 69],
  rootPc: 9,
  voicing: 'sus4, 1st inversion',
};
const Am1: Chord = {
  symbol: 'Am (1st inv.)',
  rh: [60, 64, 69],
  rootPc: 9,
  voicing: '1st inversion',
};
const Am: Chord = {
  symbol: 'Am',
  rh: [57, 60, 64],
  rootPc: 9,
  voicing: 'root position',
};
const Asus2: Chord = {
  symbol: 'Am sus2',
  rh: [57, 59, 64],
  rootPc: 9,
  voicing: 'sus2',
};
const Dsus2: Chord = {
  symbol: 'Dm sus2',
  rh: [62, 64, 69],
  rootPc: 2,
  voicing: 'sus2',
};

// L3 — E minor, jazzy: Phrygian, Dorian, harmonic minor.
const Em: Chord = {
  symbol: 'Em',
  rh: [52, 55, 59],
  rootPc: 4,
  voicing: 'root position',
};
const F: Chord = {
  symbol: 'F',
  rh: [53, 57, 60],
  rootPc: 5,
  voicing: 'root position',
};
const Em9: Chord = {
  symbol: 'Em9',
  rh: [55, 59, 62, 66],
  rootPc: 4,
  voicing: 'LH E · RH 3-5-7-9',
};
const AoverB: Chord = {
  symbol: 'A/B',
  rh: [57, 61, 64],
  rootPc: 9,
  bassPc: 11,
  voicing: 'LH B · RH A triad',
};
// D♯1 up a half step to E1 — never down a major 7th.
const Ds7dim: Chord = {
  symbol: 'D♯dim7',
  rh: [63, 66, 69, 72],
  rootPc: 3,
  bass: 27,
  voicing: 'ascending arpeggio',
  arp: true,
};
const EmAdd2: Chord = {
  symbol: 'Em add2',
  rh: [64, 66, 67, 71],
  rootPc: 4,
  bass: 28,
  voicing: 'ascending arpeggio',
  arp: true,
};
const Am7: Chord = {
  symbol: 'Am7',
  rh: [57, 60, 64, 67],
  rootPc: 9,
  voicing: 'root position',
};
const B7b9: Chord = {
  symbol: 'B7♭9',
  rh: [57, 60, 63, 66],
  rootPc: 11,
  voicing: 'rootless ♭7-♭9-3-5',
};

const L1_PROGRESSIONS: Progression[] = [
  {
    id: 'l1_bass_study',
    degrees: 'Cm vamp — whole notes',
    reference: 'Trap bass study: one chord, so the bass is all you hear move',
    bars: [Cm, Cm, Cm, Cm],
    preset: {
      bpm: 72,
      kit: '808',
      drums: 'trap_a',
      bassVoice: '808',
      bass: 'trap_foundation',
      comp: 'held',
    },
  },
  {
    id: 'l1_bass_study_chunk',
    degrees: 'Cm vamp — 8th chunking, up an octave',
    reference: 'Trap bass study, staccato chords C5-E♭5-G5',
    bars: [up(Cm, 1), up(Cm, 1), up(Cm, 1), up(Cm, 1)],
    preset: {
      bpm: 72,
      kit: '808',
      drums: 'trap_a',
      bassVoice: '808',
      bass: 'trap_foundation',
      comp: 'chunk_eighths_staccato',
    },
  },
  {
    id: 'l1_1_4_root',
    degrees: 'Cm – Fm (root position)',
    bars: [Cm, Cm, Fm, Fm],
    preset: {
      bpm: 72,
      kit: '808',
      drums: 'trap_b',
      bassVoice: '808',
      bass: '808_slide',
      comp: 'held',
    },
  },
  {
    id: 'l1_1_5_root',
    degrees: 'Cm – G (root position)',
    bars: [Cm, Cm, G, G],
    preset: {
      bpm: 72,
      kit: '808',
      drums: 'trap_b',
      bassVoice: '808',
      bass: '808_staccato',
      comp: 'trap_comp',
    },
  },
  {
    id: 'l1_pair_cm1_fm',
    degrees: 'Jam: Cm 1st inv. ↔ Fm root',
    reference: 'common tone C stays on top',
    bars: [Cm1, Fm, Cm1, Fm],
    preset: {
      bpm: 72,
      kit: '808',
      drums: 'trap_a',
      bassVoice: '808',
      bass: 'follow_kick',
      comp: 'held',
    },
  },
  {
    id: 'l1_pair_cm_g1',
    degrees: 'Jam: Cm root ↔ G 1st inv.',
    reference: 'common tone G stays on top',
    bars: [Cm, G1, Cm, G1],
    preset: {
      bpm: 72,
      kit: '808',
      drums: 'trap_a',
      bassVoice: '808',
      bass: '808_slide',
      comp: 'chunk_eighths_staccato',
    },
  },
];

const L2_PROGRESSIONS: Progression[] = [
  {
    id: 'l2_parallel',
    degrees: 'Em 1st inv. → Dm 1st inv. (parallel)',
    reference: 'chords up an octave; bass steps down E → D',
    bars: [up(Em1, 1), up(Dm1, 1), up(Em1, 1), up(Dm1, 1)],
    preset: {
      bpm: 90,
      swing: 50,
      kit: 'house',
      drums: 'boombap_a',
      bassVoice: 'finger',
      bass: 'follow_kick',
      comp: 'chunk_eighths_staccato',
    },
  },
  {
    id: 'l2_sus4',
    degrees: 'Dm | Dm | Am sus4 (1st inv.) | Am',
    reference: 'D-E-A resolving to C-E-A; chords up two octaves',
    bars: [up(Dm, 2), up(Dm, 2), up(Asus4_1, 2), up(Am1, 2)],
    preset: {
      bpm: 87,
      swing: 50,
      kit: 'house',
      drums: 'boombap_a',
      bassVoice: 'finger',
      bass: 'follow_kick',
      comp: 'chunk_eighths_staccato',
    },
  },
  {
    id: 'l2_sus2',
    degrees: 'Am sus2 Am | Am sus2 Am | Dm sus2 Dm | Dm sus2 Dm',
    reference: 'two chords a bar; chords up two octaves',
    bars: [
      [up(Asus2, 2), up(Am, 2)],
      [up(Asus2, 2), up(Am, 2)],
      [up(Dsus2, 2), up(Dm, 2)],
      [up(Dsus2, 2), up(Dm, 2)],
    ],
    preset: {
      bpm: 90,
      swing: 50,
      kit: 'house',
      drums: 'boombap_a',
      bassVoice: '808',
      bass: 'sus2_bass',
      comp: 'chunk_eighths_staccato',
    },
  },
];

const L3_PROGRESSIONS: Progression[] = [
  {
    id: 'l3_phrygian',
    degrees: 'Phrygian: Em → F',
    reference: '1 min – ♭2 maj, triads',
    bars: [Em, F, Em, F],
    preset: {
      bpm: 84,
      swing: 50,
      kit: '808',
      drums: 'boombap_a',
      bassVoice: '808',
      bass: 'follow_kick',
      comp: 'chunk_eighths_staccato',
    },
  },
  {
    id: 'l3_dorian',
    degrees: 'Dorian: Em9 → A/B',
    reference: 'LH E, RH G-B-D-F♯ → LH B, RH A-C♯-E',
    bars: [Em9, AoverB, Em9, AoverB],
    preset: {
      bpm: 81,
      swing: 66,
      kit: 'house',
      drums: 'boombap_b',
      bassVoice: 'upright',
      bass: 'follow_kick',
      comp: 'held',
    },
  },
  {
    id: 'l3_harmonic',
    degrees: 'Harmonic minor: D♯dim7 → Em add2 (arpeggios)',
    reference: 'ascending 8ths, twice a bar; bass D♯ up to E',
    bars: [Ds7dim, EmAdd2, Ds7dim, EmAdd2],
    preset: { bassVoice: '808', bpm: 77, kit: 'house' },
  },
  {
    id: 'l3_jazz',
    degrees: 'Am7 → B7♭9 → Em9',
    reference: 'A-C-E-G → A-C-D♯-F♯ → G-B-D-F♯',
    bars: [Am7, B7b9, Em9, Em9],
    preset: {
      bpm: 81,
      swing: 66,
      kit: 'house',
      drums: 'boombap_b',
      bassVoice: 'upright',
      bass: 'follow_kick',
      comp: 'held',
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════════

export const AUDITION_STYLES: AuditionStyle[] = [
  {
    id: 'current',
    level: 'Now',
    title: "Today's engine (Funk fallback)",
    blurb:
      'What a Hip Hop play-along would play today: the Funk L1 groove, bass and stabs, generated by backingPatterns.ts. For comparison.',
    key: 'C minor',
    flats: true,
    bpm: 72,
    bpmRange: [65, 95],
    swing: 50,
    kit: 'natural',
    bassVoice: 'finger',
    engine: 'current',
    drums: [],
    bass: [],
    comping: [],
    progressions: L1_PROGRESSIONS.map(({ preset: _preset, ...p }) => p),
  },
  {
    id: 'l1_trap',
    level: 'L1',
    title: 'Trap',
    blurb:
      'Metro Boomin, Southside. Half-time at 72 (= 144), 808 kit, 808 bass. Triads only; the challenge is inversions.',
    key: 'C minor',
    flats: true,
    bpm: 72,
    bpmRange: [65, 80],
    swing: 50,
    kit: '808',
    bassVoice: '808',
    drums: [TRAP_A, TRAP_B],
    bass: [
      TRAP_FOUNDATION,
      TRAP_ONE_NOTE,
      TRAP_EXPAND_B7,
      TRAP_EXPAND_7,
      TRAP_EXPAND_B3,
      TRAP_EXPAND_AEOLIAN,
      EIGHT_O_EIGHT_SLIDE,
      FOLLOW_KICK,
      EIGHT_O_EIGHT_STACCATO,
    ],
    comping: [TRAP_COMP, CHUNK_EIGHTHS_STACCATO, CHUNK_QUARTERS, HELD],
    progressions: L1_PROGRESSIONS,
  },
  {
    id: 'l2_boombap',
    level: 'L2',
    title: 'Boom Bap',
    blurb:
      'Premier, Pete Rock, Dre. Triads and inversions, then sus2 and sus4. Chords sit high — a Hip Hop trait.',
    key: 'A minor',
    bpm: 90,
    bpmRange: [85, 95],
    swing: 50,
    kit: 'house',
    bassVoice: 'finger',
    drums: [BOOM_BAP_A, BOOM_BAP_B, BOOM_BAP_STUDIO],
    bass: [FOLLOW_KICK, SUS2_BASS, ROOTS_1_3, ROOTS_PUSH],
    comping: [CHUNK_EIGHTHS_STACCATO, BOOM_BAP_COMP, HELD],
    progressions: L2_PROGRESSIONS,
  },
  {
    id: 'l3_conscious',
    level: 'L3',
    title: 'Conscious',
    blurb:
      'Jazzy chords over a laid-back boom bap. A Tribe Called Quest, Common, Mos Def, Lauryn Hill, Kendrick Lamar. Arpeggio bars ignore the chord rhythm.',
    key: 'E minor',
    bpm: 90,
    bpmRange: [75, 96],
    swing: 50,
    kit: 'natural',
    bassVoice: 'finger',
    drums: [LAID_BACK, BOOM_BAP_A, BOOM_BAP_B],
    bass: [FOLLOW_KICK, ROOTS_1_3, ROOTS_PUSH],
    comping: [HELD, CHUNK_EIGHTHS_STACCATO, CHUNK_QUARTERS, BOOM_BAP_COMP],
    progressions: L3_PROGRESSIONS,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Event building
// ════════════════════════════════════════════════════════════════════════════

export interface AuditionEvent {
  part: 'drums' | 'bass' | 'chords';
  tick: number;
  note: number;
  dur: number;
  vel: number; // 0–127
  /** Bass only: slide in from this MIDI note. */
  glideFrom?: number;
}

export interface BuildOptions {
  swing: number;
  feel?: Feel;
}

/** Delay for an off-beat 16th at a given swing percentage. */
export function swingDelay(step: number, swing: number): number {
  if (step % 2 === 0) return 0;
  return Math.round((240 * swing) / 100 - TICKS_PER_16TH);
}

const HIT_VELOCITY: Record<string, number> = {
  x: 96,
  X: 112,
  g: 38,
  o: 88,
  r: 70,
  t: 64,
};

/** Bass register: roots sit between E1 and E♭2, like the lesson engine. */
export function bassRoot(pc: number): number {
  return 28 + ((pc - 4 + 12) % 12);
}

/** The 5th always comes from the chord root, even over a slash bass. */
function bassNote(chord: ProgressionBar, tone: BassTone): number {
  const above = { '5': 7, b3: 3, b6: 8, b7: 10, '7': 11 } as const;
  if (tone in above) {
    return bassRoot(chord.rootPc) + above[tone as keyof typeof above];
  }
  const bass = chord.bass ?? bassRoot(chord.bassPc ?? chord.rootPc);
  return tone === 'R' ? bass : bass + 12;
}

export function buildDrumEvents(
  pattern: DrumPattern,
  opts: BuildOptions,
): AuditionEvent[] {
  const events: AuditionEvent[] = [];
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const grid = pattern.bars[bar % pattern.bars.length];
    (Object.keys(grid) as DrumVoice[]).forEach((voice) => {
      const row = grid[voice] ?? '';
      [...row].forEach((ch, step) => {
        if (ch === '.') return;
        let tick =
          bar * BAR_TICKS +
          step * TICKS_PER_16TH +
          swingDelay(step, opts.swing);
        if (voice === 'kick') tick += opts.feel?.kickOffset ?? 0;
        if (voice === 'snare' || voice === 'clap')
          tick += opts.feel?.snareOffset ?? 0;
        tick = Math.max(0, tick);
        const note =
          voice === 'hat' && ch === 'o' ? OPEN_HAT : DRUM_NOTES[voice];
        const vel = HIT_VELOCITY[ch] ?? 90;
        const count = ch === 'r' ? 2 : ch === 't' ? 3 : 1;
        for (let i = 0; i < count; i++) {
          events.push({
            part: 'drums',
            tick: tick + Math.round((i * TICKS_PER_16TH) / count),
            note,
            dur: 60,
            vel: i === 0 ? vel : vel - 12,
          });
        }
      });
    });
  }
  return events;
}

export function buildBassEvents(
  pattern: BassPattern,
  progression: Progression,
  drums: DrumPattern | undefined,
  opts: BuildOptions,
): AuditionEvent[] {
  const events: AuditionEvent[] = [];
  const loopEnd = LOOP_BARS * BAR_TICKS;

  if (pattern.follow === 'kick') {
    const kicks: number[] = [];
    for (let bar = 0; bar < LOOP_BARS; bar++) {
      const row =
        drums?.bars[bar % drums.bars.length].kick ?? 'x.......x.......';
      [...row].forEach((ch, step) => {
        if (ch !== '.') kicks.push(bar * BAR_TICKS + step * TICKS_PER_16TH);
      });
    }
    kicks.forEach((raw, i) => {
      const next = kicks[i + 1] ?? loopEnd;
      const bar = Math.floor(raw / BAR_TICKS);
      const step = (raw % BAR_TICKS) / TICKS_PER_16TH;
      const tick = Math.max(
        0,
        raw + swingDelay(step, opts.swing) + (opts.feel?.kickOffset ?? 0),
      );
      events.push({
        part: 'bass',
        tick,
        note: bassNote(chordAt(progression, bar, step), 'R'),
        dur: Math.min(next - raw - 20, 1400),
        vel: step === 0 ? 104 : 92,
      });
    });
    return events;
  }

  let prevNote: number | undefined;
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const hits = pattern.bars![bar % pattern.bars!.length];
    hits.forEach((hit) => {
      const note = bassNote(chordAt(progression, bar, hit.step), hit.tone);
      events.push({
        part: 'bass',
        tick:
          bar * BAR_TICKS +
          hit.step * TICKS_PER_16TH +
          swingDelay(hit.step, opts.swing),
        note,
        dur: hit.dur,
        vel: hit.step === 0 ? 104 : 90,
        glideFrom: hit.glide ? prevNote : undefined,
      });
      prevNote = note;
    });
  }
  return events;
}

/** 8th-note arpeggio pattern: up through the four chord tones, twice a bar. */
const ARP_ORDER = [0, 1, 2, 3, 0, 1, 2, 3];

export function buildChordEvents(
  pattern: CompPattern,
  progression: Progression,
  opts: BuildOptions,
): AuditionEvent[] {
  const events: AuditionEvent[] = [];
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const hits = pattern.bars[bar % pattern.bars.length];
    const chord = chordAt(progression, bar, 0);
    if (chord.arp) {
      const notes = [...chord.rh].sort((a, b) => a - b);
      ARP_ORDER.forEach((index, i) => {
        events.push({
          part: 'chords',
          tick: bar * BAR_TICKS + i * 240,
          note: notes[Math.min(index, notes.length - 1)],
          dur: 220,
          vel: i === 0 ? 84 : 72,
        });
      });
      continue;
    }
    hits.forEach((hit) => {
      const tick =
        bar * BAR_TICKS +
        hit.step * TICKS_PER_16TH +
        swingDelay(hit.step, opts.swing);
      chordAt(progression, bar, hit.step).rh.forEach((note) => {
        events.push({
          part: 'chords',
          tick,
          note,
          dur: hit.dur,
          vel: hit.step === 0 ? 78 : 68,
        });
      });
    });
  }
  return events;
}

const SHARP_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
];
const FLAT_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'G♭',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

/** Note name with octave, spelled for the key. */
export function spell(midi: number, flats = false): string {
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
