/**
 * hipHopPatterns.ts — Hip Hop drum, bass and chord-rhythm patterns.
 *
 * Chosen by ear with Aaron on the groove audition page (/__hiphop-grooves),
 * which plays these same objects. The play-along settings each progression uses
 * are in docs/genre-activities/PLANNING-LEDGER.md ("Hip-hop play-along specs").
 *
 * Grids are one character per 16th, 16 per bar (480 ticks = a quarter):
 *   x hit   X accent   g ghost   o open hat (hat row only)
 *   r two 32nds (trap roll)   t three-hit triplet roll inside one 16th
 */

export const TICKS_PER_16TH = 120;
export const BAR_TICKS = 1920;

// ── Drums ──────────────────────────────────────────────────────────────────

export type DrumVoice = 'kick' | 'snare' | 'clap' | 'hat';

export const DRUM_NOTES: Record<DrumVoice, number> = {
  kick: 36,
  snare: 38,
  clap: 40, // clap on the 808 kit, sidestick on the natural kit
  hat: 42,
};
export const OPEN_HAT = 46;

export type DrumBar = Partial<Record<DrumVoice, string>>;

export interface DrumPattern {
  id: string;
  name: string;
  note: string;
  bars: DrumBar[];
}

// ── Bass ───────────────────────────────────────────────────────────────────

/** Degrees above the chord root; the 5th always comes from the chord root. */
export type BassTone = 'R' | '5' | '8' | 'b3' | 'b6' | 'b7' | '7';

export interface BassHit {
  step: number;
  dur: number; // ticks
  tone: BassTone;
  /** 808 only: start at the previous pitch and slide into this one. */
  glide?: boolean;
}

export interface BassPattern {
  id: string;
  name: string;
  note: string;
  /** 'kick': one root per kick hit, held to the next kick. */
  follow?: 'kick';
  bars?: BassHit[][];
}

// ── Chord rhythm ───────────────────────────────────────────────────────────

export interface CompHit {
  step: number;
  dur: number;
}

export interface CompPattern {
  id: string;
  name: string;
  note: string;
  bars: CompHit[][];
}

// ════════════════════════════════════════════════════════════════════════════
// Drum patterns
// ════════════════════════════════════════════════════════════════════════════

export const BOOM_BAP_A: DrumPattern = {
  id: 'boombap_a',
  name: 'Boom Bap A — sparse kick',
  note: 'Kick on 1 and the "and" of 3; bar 2 adds the "a" of 2. Snare 2 & 4, 8th hats.',
  bars: [
    {
      kick: 'x.........x.....',
      snare: '....X.......X...',
      hat: 'x.x.x.x.x.x.x.x.',
    },
    {
      kick: 'x......x..x.....',
      snare: '....X.......X..g',
      hat: 'x.x.x.x.x.x.x.o.',
    },
  ],
};

export const BOOM_BAP_B: DrumPattern = {
  id: 'boombap_b',
  name: 'Boom Bap B — double kick',
  note: 'Kick on 1 and the "and" of 1, a ghost snare before beat 3.',
  bars: [
    {
      kick: 'x.x.......x.....',
      snare: '....X..g....X...',
      hat: 'x.x.x.x.x.x.x.x.',
    },
    {
      kick: 'x.x.......x..x..',
      snare: '....X..g....X...',
      hat: 'x.x.x.x.x.x.x.o.',
    },
  ],
};

export const LAID_BACK: DrumPattern = {
  id: 'laid_back',
  name: 'Laid back — Tribe / Dilla',
  note: 'Pushed kick on the "a" of 2, soft ghost before 4. Try it with the Dilla feel.',
  bars: [
    {
      kick: 'x......x..x.....',
      snare: '....X.......X...',
      hat: 'x.x.x.x.x.x.x.x.',
    },
    {
      kick: 'x.x.......x..x..',
      snare: '....X......gX...',
      hat: 'x.x.x.x.x.x.x.o.',
    },
  ],
};

export const BOOM_BAP_STUDIO: DrumPattern = {
  id: 'boombap_studio',
  name: 'Studio MIDI "hiphop-1" (as-is)',
  note: 'Transcribed from the Studio groove library, for comparison.',
  bars: [
    {
      kick: 'x...............',
      snare: '....X.......Xx..',
      hat: '..xx..xx..xx..xx',
    },
    {
      kick: 'x.....x.........',
      snare: '....X.......Xx..',
      hat: '..xx..xx..xx..xx',
    },
  ],
};

export const TRAP_A: DrumPattern = {
  id: 'trap_a',
  name: 'Trap A — steady 16th hats, rolls',
  note: 'Written at half time: snare + clap on 2 & 4 here = beat 3 at double tempo. Bar 2 has 32nd and triplet rolls.',
  bars: [
    {
      kick: 'x.........x..x..',
      snare: '....X.......X...',
      clap: '....x.......x...',
      hat: 'xxxxxxxxxxxxxxxx',
    },
    {
      kick: 'x.....x...x.....',
      snare: '....X.......X...',
      clap: '....x.......x...',
      hat: 'xxxxxxxxxxrrxxtt',
    },
  ],
};

export const TRAP_B: DrumPattern = {
  id: 'trap_b',
  name: 'Trap B — bounce',
  note: 'Kick on the "a" of 1; 8th hats with triplet rolls.',
  bars: [
    {
      kick: 'x..x......x.....',
      snare: '....X.......X...',
      clap: '....x.......x...',
      hat: 'x.x.x.x.x.x.xtx.',
    },
    {
      kick: 'x.....xx...x....',
      snare: '....X.......X...',
      clap: '....x.......x...',
      hat: 'x.x.x.xrx.x.tttt',
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Bass patterns
// ════════════════════════════════════════════════════════════════════════════

export const FOLLOW_KICK: BassPattern = {
  id: 'follow_kick',
  name: 'Locks to the kick',
  note: 'A root on every kick, held to the next one.',
  follow: 'kick',
};

export const ROOTS_1_3: BassPattern = {
  id: 'roots_1_3',
  name: 'Long roots on 1 & 3',
  note: 'The simplest boom bap bass: two held roots a bar.',
  bars: [
    [
      { step: 0, dur: 840, tone: 'R' },
      { step: 8, dur: 840, tone: 'R' },
    ],
  ],
};

export const ROOTS_PUSH: BassPattern = {
  id: 'roots_push',
  name: '1, 3 and the push',
  note: 'Root on 1, a 16th pickup into 3, the 5th on the "and" of 3.',
  bars: [
    [
      { step: 0, dur: 600, tone: 'R' },
      { step: 7, dur: 110, tone: 'R' },
      { step: 8, dur: 240, tone: 'R' },
      { step: 10, dur: 360, tone: '5' },
    ],
  ],
};

// Aaron's Trap bass: root on 1, the 5 on the "and" of 3. The expansion turns
// that 5 into a dotted 8th and adds a second dotted 8th — in bar 1 OR bar 2 of
// the 2-bar loop, never both. Aeolian swaps 5 → 7 for ♭6 → 5.
const trapBar = (second?: [BassTone, BassTone]): BassHit[] =>
  second
    ? [
        { step: 0, dur: 1150, tone: 'R' },
        { step: 10, dur: 340, tone: second[0] },
        { step: 13, dur: 340, tone: second[1] },
      ]
    : [
        { step: 0, dur: 1150, tone: 'R' },
        { step: 10, dur: 700, tone: '5' },
      ];

export const TRAP_ONE_NOTE: BassPattern = {
  id: 'trap_one_note',
  name: 'Trap rhythm, one note',
  note: 'Root on 1 and on the "and" of 3 — the rhythm before the 5 comes in.',
  bars: [
    [
      { step: 0, dur: 1150, tone: 'R' },
      { step: 10, dur: 700, tone: 'R' },
    ],
  ],
};

export const TRAP_FOUNDATION: BassPattern = {
  id: 'trap_foundation',
  name: 'Trap foundation',
  note: 'Root on 1, the 5 on the "and" of 3 (dotted quarter).',
  bars: [trapBar()],
};

export const TRAP_EXPAND_B7: BassPattern = {
  id: 'trap_expand_b7',
  name: 'Expansion in bar 2: 5 → ♭7',
  note: 'Bar 2 splits the 5 into two dotted 8ths: 5, then ♭7.',
  bars: [trapBar(), trapBar(['5', 'b7'])],
};

export const TRAP_EXPAND_7: BassPattern = {
  id: 'trap_expand_7',
  name: 'Expansion in bar 2: 5 → 7',
  note: 'The same move up to the natural 7 (the leading tone).',
  bars: [trapBar(), trapBar(['5', '7'])],
};

export const TRAP_EXPAND_B3: BassPattern = {
  id: 'trap_expand_b3',
  name: 'Expansion in bar 1: 5 → ♭3',
  note: 'The expansion up front instead: bar 1 goes 5, ♭3; bar 2 is the foundation.',
  bars: [trapBar(['5', 'b3']), trapBar()],
};

export const TRAP_EXPAND_AEOLIAN: BassPattern = {
  id: 'trap_expand_aeolian',
  name: 'Aeolian expansion in bar 2: ♭6 → 5',
  note: 'Aeolian uses ♭6 → 5 instead of 5 → 7.',
  bars: [trapBar(), trapBar(['b6', '5'])],
};

export const EIGHT_O_EIGHT_SLIDE: BassPattern = {
  id: '808_slide',
  name: '808 sustain + slide',
  note: 'One long 808 per bar; bar 2 slides up the octave on the "and" of 4.',
  bars: [
    [{ step: 0, dur: 1800, tone: 'R' }],
    [
      { step: 0, dur: 1600, tone: 'R' },
      { step: 14, dur: 220, tone: '8', glide: true },
    ],
  ],
};

export const SUS2_BASS: BassPattern = {
  id: 'sus2_bass',
  name: 'Root, 5, ♭7',
  note: 'Root (quarter), 5 (dotted 8th), ♭7 (dotted 8th), then the root again next bar.',
  bars: [
    [
      { step: 0, dur: 460, tone: 'R' },
      { step: 4, dur: 340, tone: '5' },
      { step: 7, dur: 340, tone: 'b7' },
    ],
  ],
};

export const EIGHT_O_EIGHT_STACCATO: BassPattern = {
  id: '808_staccato',
  name: 'Trap staccato',
  note: 'Short 808 hits on 1, the "a" of 1, 3 and the "a" of 3.',
  bars: [
    [
      { step: 0, dur: 200, tone: 'R' },
      { step: 3, dur: 200, tone: 'R' },
      { step: 8, dur: 200, tone: 'R' },
      { step: 11, dur: 200, tone: 'R' },
    ],
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Chord rhythms
// ════════════════════════════════════════════════════════════════════════════

export const HELD: CompPattern = {
  id: 'held',
  name: 'Held — one per bar',
  note: 'The sample-loop sound: the chord rings the whole bar.',
  bars: [[{ step: 0, dur: 1860 }]],
};

export const BOOM_BAP_COMP: CompPattern = {
  id: 'boombap_comp',
  name: 'Boom Bap (2-bar)',
  note: 'Quarter-note chords on 1 and 3; bar 2 adds the "and" of 4.',
  bars: [
    [
      { step: 0, dur: 440 },
      { step: 8, dur: 440 },
    ],
    [
      { step: 0, dur: 440 },
      { step: 8, dur: 220 },
      { step: 14, dur: 220 },
    ],
  ],
};

export const CHUNK_EIGHTHS_STACCATO: CompPattern = {
  id: 'chunk_eighths_staccato',
  name: '8th-note chunking, staccato',
  note: 'The chord on every 8th note, short and detached — always staccato in Hip Hop.',
  bars: [[0, 2, 4, 6, 8, 10, 12, 14].map((step) => ({ step, dur: 90 }))],
};

export const TRAP_COMP: CompPattern = {
  id: 'trap_comp',
  name: 'Trap (2-bar)',
  note: 'A whole note in bar 1 (no pickup), then short syncopated stabs in bar 2.',
  bars: [
    [{ step: 0, dur: 1860 }],
    [
      { step: 0, dur: 200 },
      { step: 3, dur: 200 },
      { step: 8, dur: 200 },
      { step: 11, dur: 200 },
    ],
  ],
};

export const CHUNK_QUARTERS: CompPattern = {
  id: 'chunk_quarters',
  name: 'Quarter-note chunking',
  note: 'The chord on every beat, as in the Pop L1 chunking steps.',
  bars: [[0, 4, 8, 12].map((step) => ({ step, dur: 440 }))],
};

// ── Lookup by id (what lesson steps name) ───────────────────────────────────

const byId = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

export const HIPHOP_DRUMS = byId([
  TRAP_A,
  TRAP_B,
  BOOM_BAP_A,
  BOOM_BAP_B,
  BOOM_BAP_STUDIO,
  LAID_BACK,
]);

export const HIPHOP_BASS = byId([
  TRAP_FOUNDATION,
  TRAP_ONE_NOTE,
  TRAP_EXPAND_B7,
  TRAP_EXPAND_7,
  TRAP_EXPAND_B3,
  TRAP_EXPAND_AEOLIAN,
  EIGHT_O_EIGHT_SLIDE,
  EIGHT_O_EIGHT_STACCATO,
  FOLLOW_KICK,
  ROOTS_1_3,
  ROOTS_PUSH,
  SUS2_BASS,
]);

export const HIPHOP_COMPING = byId([
  HELD,
  BOOM_BAP_COMP,
  TRAP_COMP,
  CHUNK_QUARTERS,
  CHUNK_EIGHTHS_STACCATO,
]);
