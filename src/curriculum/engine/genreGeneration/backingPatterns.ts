/**
 * backingPatterns.ts — The notes of a play-along backing track (drums, bass,
 * chords), in ticks. No audio here: useBackingTrack schedules them on Tone.js.
 *
 * Patterns: v10 engine proven in Logic Pro.
 * Rules encoded:
 *   - Never 4+ consecutive 16th notes on kick (validated globally)
 *   - Approach always precedes goal (atomic cells)
 *   - Max 4 chromatic approaches per 4-bar phrase
 *   - Structured 4-bar loop, max 1 variation in bars 5-8
 *   - Double chromatic above: 33% at cadence bars only
 *
 * Bass and chords follow the step's chord timeline (chordTimeline.ts).
 */

import type { ActivityStepV2 } from '../../types/activity.v2';
import { buildApproachNotes, shouldAddApproach } from './bassApproach';
import { bassPC_toMidi } from './chordBassNote';
import type { ChordSymbolTones } from './chordSymbolTones';
import {
  buildChordTimeline,
  chordAtTick,
  type TimedChord,
} from './chordTimeline';
import type { GenreNoteEvent } from './resolveStepContent';

const BACKING_BARS = 16;
const BAR_TICKS = 1920;

export interface BackingNote {
  note: number;
  onset: number;
  duration: number;
  velocity: number;
  part: 'drums' | 'bass' | 'chords';
}

// ── Micro-timing jitter ─────────────────────────────────────────────────────

function jitter(lo = 0, hi = 4): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// ── Drum patterns ───────────────────────────────────────────────────────────

const KICK_PATTERNS: Record<string, number[]> = {
  standard: [0, 840, 960, 1800],
  syncopated: [0, 360, 960, 1680],
  double_2: [0, 720, 840, 960, 1800],
  busy: [0, 360, 840, 960, 1320, 1800],
  fill_end: [0, 840, 960, 1560, 1680, 1800],
  big_fill: [0, 840, 960, 1200, 1440, 1680, 1800],
};

const SNARE_PATTERNS: Record<string, [number, number][]> = {
  backbeat_gh: [
    [480, 95],
    [600, 25],
    [1440, 95],
  ],
  anticipate: [
    [480, 95],
    [1320, 30],
    [1440, 95],
  ],
  fill: [
    [480, 95],
    [960, 40],
    [1080, 30],
    [1200, 40],
    [1440, 95],
  ],
  big_fill: [
    [480, 95],
    [840, 35],
    [960, 50],
    [1080, 35],
    [1200, 50],
    [1320, 35],
    [1440, 95],
    [1680, 60],
  ],
};

const DRUM_PHRASE_1: [string, string, string][] = [
  ['standard', 'backbeat_gh', 'eighth'],
  ['syncopated', 'backbeat_gh', 'eighth'],
  ['double_2', 'anticipate', 'loose'],
  ['fill_end', 'fill', 'double4'],
];
const DRUM_PHRASE_2: [string, string, string][] = [
  ['standard', 'backbeat_gh', 'eighth'],
  ['busy', 'backbeat_gh', 'loose'],
  ['syncopated', 'anticipate', 'loose'],
  ['big_fill', 'big_fill', 'double4'],
];

function buildHihat(barOffset: number, mode: string): BackingNote[] {
  const notes: BackingNote[] = [];
  if (mode === 'eighth' || mode === 'loose') {
    for (let i = 0; i < 8; i++) {
      const t = barOffset + i * 240 + jitter(0, 4);
      const n = i === 5 ? 46 : 42;
      const vel =
        mode === 'loose'
          ? 45 + Math.floor(Math.random() * 30)
          : i % 2 === 0
            ? 72
            : 52;
      notes.push({
        note: n,
        onset: t,
        duration: 50,
        velocity: vel,
        part: 'drums',
      });
      if (mode === 'loose' && [1, 3, 7].includes(i) && Math.random() < 0.3) {
        notes.push({
          note: 42,
          onset: barOffset + i * 240 + 120 + jitter(0, 4),
          duration: 40,
          velocity: 32,
          part: 'drums',
        });
      }
    }
  } else if (mode === 'double4') {
    for (let i = 0; i < 6; i++) {
      notes.push({
        note: i === 5 ? 46 : 42,
        onset: barOffset + i * 240 + jitter(0, 4),
        duration: 50,
        velocity: i % 2 === 0 ? 72 : 52,
        part: 'drums',
      });
    }
    [1440, 1560, 1680, 1800].forEach((t0) => {
      notes.push({
        note: 42,
        onset: barOffset + t0 + jitter(0, 3),
        duration: 40,
        velocity: t0 === 1440 ? 65 : 50,
        part: 'drums',
      });
    });
  }
  return notes;
}

function removeChordStutters(notes: BackingNote[]): BackingNote[] {
  const chords = notes.filter((n) => n.part === 'chords');
  const other = notes.filter((n) => n.part !== 'chords');

  const byPitch = new Map<number, BackingNote[]>();
  for (const n of chords) {
    if (!byPitch.has(n.note)) byPitch.set(n.note, []);
    byPitch.get(n.note)!.push(n);
  }

  const toRemove = new Set<BackingNote>();

  for (const [, pitchNotes] of byPitch) {
    const sorted = [...pitchNotes].sort((a, b) => a.onset - b.onset);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].onset - sorted[i].onset <= 120) {
        toRemove.add(sorted[i + 1]);
      }
    }
  }

  return [...other, ...chords.filter((n) => !toRemove.has(n))];
}

function validateKickGlobal(
  kicks: Array<{ onset: number; velocity: number }>,
): Array<{ onset: number; velocity: number }> {
  const sorted = [...kicks].sort((a, b) => a.onset - b.onset);
  // Remove kicks until no 4+ consecutive 16th notes remain
  // A "run" = consecutive kicks each ≤ 130 ticks apart
  let maxPasses = 20; // safety limit
  while (maxPasses-- > 0) {
    let foundRun = false;
    for (let i = 0; i <= sorted.length - 4; i++) {
      if (
        sorted[i + 1].onset - sorted[i].onset <= 130 &&
        sorted[i + 2].onset - sorted[i + 1].onset <= 130 &&
        sorted[i + 3].onset - sorted[i + 2].onset <= 130
      ) {
        // Remove the weakest kick in the run (lowest velocity, skip first and last)
        const candidates = [i + 1, i + 2];
        const weakest = candidates.reduce((a, b) =>
          sorted[a].velocity <= sorted[b].velocity ? a : b,
        );
        sorted.splice(weakest, 1);
        foundRun = true;
        break;
      }
    }
    if (!foundRun) break;
  }
  return sorted;
}

function buildDrumPattern(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const phraseMap = [...DRUM_PHRASE_1, ...DRUM_PHRASE_2];
  const allKicks: Array<{ onset: number; velocity: number }> = [];

  for (let bar = 0; bar < bars; bar++) {
    const o = bar * 1920;
    const [kickName, snareName, hihatMode] = phraseMap[bar % phraseMap.length];
    notes.push(...buildHihat(o, hihatMode));
    (SNARE_PATTERNS[snareName] ?? []).forEach(([t0, vel]) => {
      notes.push({
        note: 38,
        onset: o + t0 + jitter(0, 4),
        duration: 80,
        velocity: vel,
        part: 'drums',
      });
    });
    (KICK_PATTERNS[kickName] ?? []).forEach((t0) => {
      allKicks.push({
        onset: o + t0 + jitter(0, 4),
        velocity: t0 === 0 ? 100 : t0 === 960 ? 88 : 72 + jitter(0, 10),
      });
    });
  }
  validateKickGlobal(allKicks).forEach(({ onset, velocity }) => {
    notes.push({ note: 36, onset, duration: 100, velocity, part: 'drums' });
  });
  return notes;
}

// ── MIDI note constants for groove patterns ─────────────────────────────────
const KICK = 36;
const SNARE = 38;
const HH_CL = 42;
const HH_OP = 46;

function H(): number {
  return Math.floor(Math.random() * 7);
} // 0-6 ticks (H5)

// ── groove_funk_02: AWB / early Kool & the Gang ─────────────────────────────
// Clean 8th hat, syncopated kick (1/a-2/and-3/a-4), snare 2+4. l1b, l2a.
function buildDrumPattern_02(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  const bar1: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_CL, 104],
    [240, HH_CL, 104],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [720, HH_CL, 104],
    [840, KICK, 104],
    [960, HH_CL, 104],
    [1200, KICK, 104],
    [1200, HH_OP, 104],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1680, HH_CL, 104],
    [1800, KICK, 104],
  ];
  const bar2: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_CL, 104],
    [240, HH_CL, 104],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [720, HH_CL, 104],
    [840, KICK, 104],
    [960, HH_CL, 104],
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, KICK, 104],
    [1560, HH_OP, 104],
  ];
  const cell = [bar1, bar2];
  for (let rep = 0; rep < bars; rep++) {
    const o = rep * BAR;
    cell[rep % 2].forEach(([t, n, v]) => {
      notes.push({
        note: n,
        onset: o + t + H(),
        duration: n === HH_OP ? 200 : n === KICK || n === SNARE ? 100 : 50,
        velocity: v,
        part: 'drums',
      });
    });
  }
  return notes;
}

// ── groove_funk_03: Headhunters / Tower of Power ────────────────────────────
// Full 16th hat grid, busy kick syncopation. l2a, l2b.
function buildDrumPattern_03(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  const bar1: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_CL, 104],
    [120, HH_CL, 104],
    [240, KICK, 104],
    [240, HH_CL, 104],
    [360, HH_CL, 104],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [600, HH_CL, 104],
    [720, HH_CL, 104],
    [840, KICK, 104],
    [840, HH_CL, 104],
    [960, HH_CL, 104],
    [1080, HH_CL, 104],
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1320, HH_CL, 104],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, HH_CL, 104],
    [1680, HH_CL, 104],
    [1800, KICK, 104],
    [1800, HH_OP, 104],
  ];
  const bar2: [number, number, number][] = [
    [0, HH_CL, 104],
    [120, KICK, 104],
    [120, HH_CL, 104],
    [240, KICK, 104],
    [240, HH_CL, 104],
    [360, HH_CL, 104],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [600, HH_CL, 104],
    [720, HH_CL, 104],
    [840, KICK, 104],
    [840, HH_OP, 104],
    [960, HH_CL, 104],
    [1080, KICK, 104],
    [1080, HH_CL, 104],
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1320, HH_CL, 104],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, KICK, 104],
    [1560, HH_OP, 104],
  ];
  const cell = [bar1, bar2];
  for (let rep = 0; rep < bars; rep++) {
    const o = rep * BAR;
    cell[rep % 2].forEach(([t, n, v]) => {
      notes.push({
        note: n,
        onset: o + t + H(),
        duration: n === HH_OP ? 200 : n === KICK || n === SNARE ? 100 : 50,
        velocity: v,
        part: 'drums',
      });
    });
  }
  return notes;
}

// ── groove_funk_04: Open hat beat 1, dense kick ─────────────────────────────
// Tight pocket. Kick+snare on beat 2. l2b, l3a.
function buildDrumPattern_04(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  const bar1: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_OP, 104],
    [480, KICK, 104],
    [480, SNARE, 104],
    [600, HH_CL, 104],
    [720, HH_CL, 104],
    [840, KICK, 104],
    [840, HH_CL, 104],
    [960, KICK, 104],
    [960, HH_CL, 104],
    [1080, HH_CL, 104],
    [1200, HH_CL, 104],
    [1320, HH_CL, 104],
    [1440, SNARE, 104],
    [1560, HH_CL, 104],
    [1680, HH_CL, 104],
    [1800, KICK, 104],
    [1800, HH_CL, 104],
  ];
  const bar2: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_CL, 104],
    [120, HH_CL, 104],
    [240, HH_CL, 104],
    [480, SNARE, 104],
    [600, HH_CL, 104],
    [720, HH_CL, 104],
    [840, KICK, 104],
    [840, HH_OP, 104],
    [960, KICK, 104],
    [960, HH_CL, 104],
    [1080, HH_CL, 104],
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1320, HH_CL, 104],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, KICK, 104],
    [1560, HH_CL, 104],
    [1680, HH_CL, 104],
    [1800, HH_CL, 104],
  ];
  const cell = [bar1, bar2];
  for (let rep = 0; rep < bars; rep++) {
    const o = rep * BAR;
    cell[rep % 2].forEach(([t, n, v]) => {
      notes.push({
        note: n,
        onset: o + t + H(),
        duration: n === HH_OP ? 200 : n === KICK || n === SNARE ? 100 : 50,
        velocity: v,
        part: 'drums',
      });
    });
  }
  return notes;
}

// ── groove_funk_05: James Brown ghost snares ────────────────────────────────
// Sparse kick. Ghost snares at vel=66. Snare IS the groove. l2a (JB).
function buildDrumPattern_05(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  const bar1: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_CL, 104],
    [240, KICK, 104],
    [240, HH_CL, 104],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [720, HH_CL, 104],
    [840, SNARE, 104],
    [960, HH_CL, 104],
    [1080, SNARE, 66], // ghost snare
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1440, HH_CL, 104],
    [1680, SNARE, 104],
    [1680, HH_CL, 104],
  ];
  const bar2: [number, number, number][] = [
    [0, HH_CL, 104],
    [120, SNARE, 66], // ghost snare
    [240, KICK, 104],
    [240, HH_CL, 104],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [720, HH_CL, 104],
    [840, SNARE, 66], // ghost snare
    [960, HH_CL, 104],
    [1080, SNARE, 66], // ghost snare
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, KICK, 104],
    [1680, HH_OP, 104],
  ];
  const cell = [bar1, bar2];
  for (let rep = 0; rep < bars; rep++) {
    const o = rep * BAR;
    cell[rep % 2].forEach(([t, n, v]) => {
      notes.push({
        note: n,
        onset: o + t + H(),
        duration: n === HH_OP ? 200 : n === KICK || n === SNARE ? 100 : 50,
        velocity: v,
        part: 'drums',
      });
    });
  }
  return notes;
}

// ── groove_funk_06: 32nd snare doubles (flams) ──────────────────────────────
// L3 sophisticated. 16th hat with vel variation (104/66). l3a, l3b.
// IMPORTANT: +55t double offset is a 32nd flam — do NOT humanize independently.
const DOUBLE_OFFSET = 55;

function buildDrumPattern_06(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  const bar1: [number, number, number][] = [
    [0, KICK, 104],
    [0, HH_CL, 104],
    [120, SNARE, 66],
    [120, HH_CL, 66],
    [240, HH_CL, 104],
    [360, KICK, 104],
    [360, HH_CL, 66],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [600, HH_CL, 66],
    [720, HH_CL, 104],
    [840, SNARE, 66],
    [840, HH_CL, 66],
    [840 + DOUBLE_OFFSET, SNARE, 66], // 32nd flam
    [960, HH_CL, 104],
    [1080, SNARE, 66],
    [1080, HH_CL, 66],
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1320, KICK, 104],
    [1320, HH_CL, 66],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, HH_CL, 66],
    [1680, HH_CL, 104],
    [1800, SNARE, 66],
    [1800, HH_CL, 66],
    [1800 + DOUBLE_OFFSET, SNARE, 66], // 32nd flam
  ];
  const bar2: [number, number, number][] = [
    [0, HH_CL, 104],
    [120, SNARE, 66],
    [120, HH_CL, 66],
    [240, KICK, 104],
    [240, HH_CL, 104],
    [360, HH_CL, 66],
    [480, SNARE, 104],
    [480, HH_CL, 104],
    [600, HH_CL, 66],
    [720, HH_CL, 104],
    [840, SNARE, 66],
    [840, HH_CL, 66],
    [840 + DOUBLE_OFFSET, SNARE, 66],
    [960, HH_CL, 104],
    [1080, SNARE, 66],
    [1080, HH_CL, 66],
    [1200, KICK, 104],
    [1200, HH_CL, 104],
    [1320, HH_CL, 66],
    [1440, SNARE, 104],
    [1440, HH_CL, 104],
    [1560, KICK, 104],
    [1560, HH_CL, 66],
    [1680, SNARE, 66],
    [1680, HH_CL, 104],
    [1800, SNARE, 66],
    [1800, HH_CL, 66],
  ];
  const cell = [bar1, bar2];
  for (let rep = 0; rep < bars; rep++) {
    const o = rep * BAR;
    cell[rep % 2].forEach(([t, n, v]) => {
      // 32nd doubles: humanize the base hit, not the double
      const isDouble = t === 840 + DOUBLE_OFFSET || t === 1800 + DOUBLE_OFFSET;
      const h = isDouble ? 0 : H();
      notes.push({
        note: n,
        onset: o + t + h,
        duration: n === HH_OP ? 200 : n === KICK || n === SNARE ? 100 : 50,
        velocity: v,
        part: 'drums',
      });
    });
  }
  return notes;
}

// ── Pop grooves — steady backbeat, straight 8ths, no funk syncopation ──────
// Pop drumming stays out of the way of the vocal/melody: steady kick on 1 & 3
// (or with a light "and of 2" push), strict backbeat snare on 2 & 4, no ghost
// notes, no 16th-grid density, no flams. groove_pop_01 covers the up-tempo
// pop/rock feel; groove_ballad_01 is sparser for slower, spacious sections.

function buildPopDrumPattern_01(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    // Straight 8th hats — steady, not syncopated
    for (let i = 0; i < 8; i++) {
      const isLast = i === 7;
      notes.push({
        note: isLast ? HH_OP : HH_CL,
        onset: o + i * 240 + jitter(0, 3),
        duration: isLast ? 150 : 60,
        velocity: i % 2 === 0 ? 78 : 58,
        part: 'drums',
      });
    }
    // Kick — beat 1, and a light push on the "and" of 2, beat 3
    notes.push({
      note: KICK,
      onset: o + jitter(0, 3),
      duration: 100,
      velocity: 100,
      part: 'drums',
    });
    notes.push({
      note: KICK,
      onset: o + 720 + jitter(0, 3),
      duration: 100,
      velocity: 80,
      part: 'drums',
    });
    notes.push({
      note: KICK,
      onset: o + 960 + jitter(0, 3),
      duration: 100,
      velocity: 92,
      part: 'drums',
    });
    // Snare — strict backbeat, 2 & 4, no ghosts
    notes.push({
      note: SNARE,
      onset: o + 480 + jitter(0, 3),
      duration: 90,
      velocity: 100,
      part: 'drums',
    });
    notes.push({
      note: SNARE,
      onset: o + 1440 + jitter(0, 3),
      duration: 90,
      velocity: 100,
      part: 'drums',
    });
  }
  return notes;
}

function buildPopBalladDrumPattern(bars: number): BackingNote[] {
  const notes: BackingNote[] = [];
  const BAR = 1920;
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR;
    // Soft quarter-note hats — sparse, spacious
    [0, 480, 960, 1440].forEach((t0, i) => {
      notes.push({
        note: HH_CL,
        onset: o + t0 + jitter(0, 3),
        duration: 80,
        velocity: i % 2 === 0 ? 50 : 40,
        part: 'drums',
      });
    });
    // Kick — beat 1 only, soft
    notes.push({
      note: KICK,
      onset: o + jitter(0, 3),
      duration: 120,
      velocity: 85,
      part: 'drums',
    });
    // Snare — soft backbeat, 2 & 4
    notes.push({
      note: SNARE,
      onset: o + 480 + jitter(0, 3),
      duration: 100,
      velocity: 78,
      part: 'drums',
    });
    notes.push({
      note: SNARE,
      onset: o + 1440 + jitter(0, 3),
      duration: 100,
      velocity: 78,
      part: 'drums',
    });
  }
  return notes;
}

// ── Groove dispatcher ───────────────────────────────────────────────────────

type GrooveId =
  | 'groove_funk_01'
  | 'groove_funk_02'
  | 'groove_funk_03'
  | 'groove_funk_04'
  | 'groove_funk_05'
  | 'groove_funk_06'
  | 'groove_pop_01'
  | 'groove_pop_02'
  | 'groove_pop_03'
  | 'groove_rock_01'
  | 'groove_rock_02'
  | 'groove_ballad_01';

function getGrooveForStyleRef(
  styleRef: string | undefined,
  genre: string,
): GrooveId {
  if (genre === 'pop') {
    switch (styleRef) {
      case 'l2b':
      case 'l3a':
        return 'groove_ballad_01';
      default:
        return 'groove_pop_01';
    }
  }
  switch (styleRef) {
    case 'l1a':
      return 'groove_funk_01';
    case 'l1b':
      return 'groove_funk_02';
    case 'l2a':
      return 'groove_funk_05';
    case 'l2b':
      return 'groove_funk_03';
    case 'l3a':
      return 'groove_funk_04';
    case 'l3b':
      return 'groove_funk_06';
    default:
      return 'groove_funk_01';
  }
}

function buildDrumPatternForGroove(
  bars: number,
  grooveId: GrooveId = 'groove_funk_01',
): BackingNote[] {
  switch (grooveId) {
    case 'groove_funk_02':
      return buildDrumPattern_02(bars);
    case 'groove_funk_03':
      return buildDrumPattern_03(bars);
    case 'groove_funk_04':
      return buildDrumPattern_04(bars);
    case 'groove_funk_05':
      return buildDrumPattern_05(bars);
    case 'groove_funk_06':
      return buildDrumPattern_06(bars);
    case 'groove_pop_01':
    case 'groove_pop_02':
    case 'groove_pop_03':
    case 'groove_rock_01':
    case 'groove_rock_02':
      return buildPopDrumPattern_01(bars);
    case 'groove_ballad_01':
      return buildPopBalladDrumPattern(bars);
    case 'groove_funk_01':
    default:
      return buildDrumPattern(bars);
  }
}

// ── Bass patterns ───────────────────────────────────────────────────────────

type BassDegree = 'root' | 'oct' | 'fifth';

function buildBassPattern(
  bars: number,
  level: number,
  genre: string,
  chordAt: (tick: number) => ChordSymbolTones,
  timeline: readonly TimedChord[],
): BackingNote[] {
  const notes: BackingNote[] = [];
  const rootAt = (tick: number) => bassPC_toMidi(chordAt(tick).bassPc);

  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR_TICKS;
    // Chords that change inside this bar (after its downbeat).
    const changes = timeline
      .map((chord) => chord.tick)
      .filter((t) => t > o && t < o + BAR_TICKS);
    // A change late in the bar replaces the chromatic walk into the next bar.
    const walkIntoNextBar = !changes.some((t) => t > o + 960);

    // Each note takes the root of the chord sounding when it's played.
    const push = (
      degree: BassDegree,
      onset: number,
      dur: number,
      vel: number,
    ) => {
      const root = rootAt(o + onset);
      const note =
        degree === 'root'
          ? root
          : degree === 'oct'
            ? Math.min(root + 12, 48) // cap at C3 — keeps bass in C1-C3
            : root + 7;
      notes.push({
        note,
        onset: o + onset + jitter(0, 5),
        duration: dur,
        velocity: vel,
        part: 'bass',
      });
    };

    // Hit each mid-bar chord change on its root, unless the pattern already plays there.
    const hitChanges = () =>
      changes.forEach((t, i) => {
        if (notes.some((n) => Math.abs(n.onset - t) < 30)) return;
        const until = changes[i + 1] ?? o + BAR_TICKS;
        push('root', t - o, Math.max(120, Math.min(480, until - t) - 20), 90);
      });

    if (genre === 'pop') {
      // Pop bass locks to root + 5th on the beat — no chromatic approach
      // walks (that's a funk/jazz device). L1: root-5th on beats 1 & 3.
      // L2/L3: same root-5th harmony, dotted-quarter+eighth "push" rhythm.
      if (level === 1) {
        push('root', 0, 460, 95); // root, beat 1
        push('fifth', 960, 460, 88); // 5th, beat 3
      } else {
        push('root', 0, 700, 95); // root, dotted quarter
        push('root', 720, 220, 82); // root, eighth
        push('fifth', 960, 700, 88); // 5th, dotted quarter
        push('fifth', 1680, 220, 78); // 5th, eighth
      }
      hitChanges();
      continue;
    }

    if (level === 1) {
      // "boom ... ba-doom" — beat 1, 16th pickup into beat 3
      push('root', 0, 360, 95); // boom  (beat 1, dotted 8th)
      push('root', 840, 120, 95); // ba    (a-of-2, 16th pickup)
      push('root', 960, 360, 88); // doom  (beat 3, dotted 8th)
    } else if (level === 2) {
      push('root', 0, 220, 95);
      push('oct', 240, 120, 82);
      push('root', 960, 380, 88);
      if (walkIntoNextBar && shouldAddApproach(bar, bars)) {
        pushApproach(notes, rootAt(o + BAR_TICKS), o);
      }
    } else {
      push('root', 0, 220, 96);
      push('oct', 240, 120, 85);
      push('root', 480, 180, 78);
      push('fifth', 840, 120, 72);
      push('root', 960, 220, 92);
      push('oct', 1200, 120, 80);
      // L3: chromatic approach with full engine variety
      if (walkIntoNextBar && shouldAddApproach(bar, bars)) {
        pushApproach(notes, rootAt(o + BAR_TICKS), o);
      } else {
        push('fifth', 1320, 120, 75); // fallback: 5th fill
      }
    }
    hitChanges();
  }
  return notes;
}

/** Chromatic approach into `nextRoot` on beat 1 of the next bar. */
function pushApproach(
  notes: BackingNote[],
  nextRoot: number,
  barOffset: number,
): void {
  buildApproachNotes(
    nextRoot,
    BAR_TICKS, // goal = beat 1 of the next bar (relative to this bar's start)
    barOffset,
    0, // prev chord on beat 1
    undefined,
    'funk',
  ).forEach((a) =>
    notes.push({
      note: a.midi,
      onset: a.onset,
      duration: a.duration,
      velocity: 75,
      part: 'bass',
    }),
  );
}

// ── Chord patterns — Peter's approach cell system ───────────────────────────

const S16 = 120;
const E8 = 240;

type CellRole = 'G' | 'A' | 'A2' | 'AA';
type CellStep = [number, CellRole, number];

const APPROACH_CELLS: Record<string, CellStep[]> = {
  P1: [
    [0, 'G', E8],
    [E8, 'A', S16],
    [E8 + S16, 'G', S16],
  ],
  P2: [
    [0, 'A', S16],
    [S16, 'G', S16],
    [S16 * 3, 'G', S16],
  ],
  P3: [
    [0, 'AA', E8],
    [E8, 'A2', S16],
    [E8 + S16, 'G', S16],
  ],
  P4: [
    [0, 'AA', E8],
    [E8, 'A2', E8],
    [E8 * 2, 'G', S16],
    [E8 * 2 + S16, 'G', S16],
  ],
};

const CELL_VALID_STARTS: Record<string, number[]> = {
  P1: [0, 240, 480, 720, 960, 1200, 1440, 1680],
  P2: [0, 240, 360, 480, 720, 840, 960, 1200, 1440, 1680, 1800],
  P3: [0, 240, 480, 720, 960, 1200, 1440, 1680],
  P4: [0, 240, 480, 720, 960, 1200, 1440, 1680],
};

const PRIMARY_STAB_POSITIONS = [0, 360, 960, 1200];

interface ChordVoicings {
  G: number[];
  A: number[];
  A2: number[];
  AA: number[];
}

type VoicingAt = (tick: number) => ChordVoicings;

/**
 * Rootless shell for a chord: its 7th (the root for a triad), 3rd and 5th, the
 * 7th between A3 and G4 — Dm7 → C-F-A, G7 → F-B-D. The approach roles sit a
 * half step below (A), a half step above (A2) and a whole step above (AA).
 */
function buildVoicings(chord: ChordSymbolTones): ChordVoicings {
  const guide = chord.seventh ?? 0;
  let bottom = chord.rootPc + guide;
  while (bottom < 57) bottom += 12;
  while (bottom > 67) bottom -= 12;
  const above = (interval: number | undefined, floor: number) => {
    if (interval === undefined) return undefined;
    let note = bottom + ((interval - guide + 12) % 12);
    while (note <= floor) note += 12;
    return note;
  };
  const third = above(chord.third, bottom) ?? bottom + 12;
  const fifth =
    above(
      chord.fifth ?? chord.intervals.find((i) => i === 8 || i === 6),
      third,
    ) ?? third + 3;
  const G = [bottom, third, fifth];
  return {
    G,
    A: G.map((p) => p - 1),
    A2: G.map((p) => p + 1),
    AA: G.map((p) => p + 2),
  };
}

/** The tick a cell's last goal (G) lands on, relative to the cell start. */
function cellGoal(cell: CellStep[]): number {
  return Math.max(
    0,
    ...cell.filter(([, role]) => role === 'G').map(([t]) => t),
  );
}

function makeStabs(
  barOffset: number,
  voicingAt: VoicingAt,
  onsets: number[],
  dur: number,
  vel: number,
): BackingNote[] {
  const notes: BackingNote[] = [];
  onsets.forEach((t0) => {
    const t = barOffset + t0 + jitter(-10, 10);
    voicingAt(barOffset + t0).G.forEach((p) =>
      notes.push({
        note: p,
        onset: Math.max(0, t),
        duration: dur,
        velocity: vel + jitter(0, 6),
        part: 'chords',
      }),
    );
  });
  return notes;
}

function makePlainBar(o: number, voicingAt: VoicingAt): BackingNote[] {
  return makeStabs(o, voicingAt, PRIMARY_STAB_POSITIONS, 120, 72);
}

function makeApproachBar(
  o: number,
  voicingAt: VoicingAt,
  cellId?: string,
): BackingNote[] {
  const id = cellId ?? (Math.random() < 0.5 ? 'P1' : 'P2');
  const starts = CELL_VALID_STARTS[id] ?? [];
  const pool =
    starts.filter((t) => t >= 720).length > 0 && Math.random() < 0.7
      ? starts.filter((t) => t >= 720)
      : starts;
  const start = pool[Math.floor(Math.random() * pool.length)];
  const cell = APPROACH_CELLS[id] ?? [];
  // The approach leads into the chord its goal lands on.
  const v = voicingAt(o + start + cellGoal(cell));
  const notes: BackingNote[] = [];
  cell.forEach(([rel, role, dur]) => {
    const t = o + start + rel;
    v[role].forEach((p) =>
      notes.push({
        note: p,
        onset: t,
        duration: dur,
        velocity: (role === 'G' ? 72 : 68) + jitter(0, 6),
        part: 'chords',
      }),
    );
  });
  PRIMARY_STAB_POSITIONS.forEach((t0) => {
    if (Math.abs(t0 - start) < 200) return;
    const t = o + t0 + jitter(-10, 10);
    voicingAt(o + t0).G.forEach((p) =>
      notes.push({
        note: p,
        onset: Math.max(0, t),
        duration: 120,
        velocity: 72 + jitter(0, 6),
        part: 'chords',
      }),
    );
  });
  return notes;
}

function makeCadenceBar(o: number, voicingAt: VoicingAt): BackingNote[] {
  if (Math.random() < 0.33) {
    const id = Math.random() < 0.5 ? 'P3' : 'P4';
    const cell = APPROACH_CELLS[id] ?? [];
    const v = voicingAt(o + 960 + cellGoal(cell));
    const notes: BackingNote[] = [];
    cell.forEach(([rel, role, dur]) => {
      v[role].forEach((p) =>
        notes.push({
          note: p,
          onset: o + 960 + rel,
          duration: dur,
          velocity: (role === 'G' ? 72 : 68) + jitter(0, 6),
          part: 'chords',
        }),
      );
    });
    notes.push(...makeStabs(o, voicingAt, [0, 360], 120, 72));
    return notes;
  }
  return makePlainBar(o, voicingAt);
}

/** [start, end) spans of a bar during each of which one chord sounds. */
function chordSpans(
  barOffset: number,
  timeline: readonly TimedChord[],
): [number, number][] {
  const changes = timeline
    .map((chord) => chord.tick)
    .filter((t) => t > barOffset && t < barOffset + BAR_TICKS);
  const edges = [barOffset, ...changes, barOffset + BAR_TICKS];
  return edges.slice(0, -1).map((s, i) => [s, edges[i + 1]]);
}

function buildChordPattern(
  bars: number,
  level: number,
  chordAt: (tick: number) => ChordSymbolTones,
  timeline: readonly TimedChord[],
): BackingNote[] {
  const notes: BackingNote[] = [];

  if (level === 3) {
    // Held root-position chords, changing wherever the progression does.
    for (let bar = 0; bar < bars; bar++) {
      for (const [start, end] of chordSpans(bar * BAR_TICKS, timeline)) {
        const chord = chordAt(start);
        const base = 48 + chord.rootPc;
        [0, chord.third, chord.fifth, chord.seventh]
          .filter((i): i is number => i !== undefined)
          .forEach((i) =>
            notes.push({
              note: base + i,
              onset: start,
              duration: Math.max(120, end - start - 120),
              velocity: 68,
              part: 'chords',
            }),
          );
      }
    }
    return removeChordStutters(notes);
  }

  const voicings = new Map<string, ChordVoicings>();
  const voicingAt: VoicingAt = (tick) => {
    const chord = chordAt(tick);
    const key = `${chord.rootPc}:${chord.intervals.join(',')}`;
    let v = voicings.get(key);
    if (!v) {
      v = buildVoicings(chord);
      voicings.set(key, v);
    }
    return v;
  };
  const bar2CellId = Math.random() < 0.5 ? 'P1' : 'P2';
  const variationBar = Math.floor(Math.random() * 3);

  for (let bar = 0; bar < Math.min(bars, 16); bar++) {
    const o = bar * BAR_TICKS;
    const phrasePos = bar % 4;
    const isSecondPass = bar >= 4;

    if (phrasePos === 3) {
      notes.push(...makeCadenceBar(o, voicingAt));
    } else if (phrasePos === 0) {
      notes.push(
        ...(isSecondPass && variationBar === 0
          ? makeApproachBar(o, voicingAt)
          : makePlainBar(o, voicingAt)),
      );
    } else if (phrasePos === 1) {
      notes.push(
        ...(isSecondPass && variationBar === 1
          ? makePlainBar(o, voicingAt)
          : makeApproachBar(o, voicingAt, bar2CellId)),
      );
    } else {
      notes.push(
        ...(isSecondPass && variationBar === 2
          ? makeApproachBar(o, voicingAt)
          : makePlainBar(o, voicingAt)),
      );
    }
  }
  return removeChordStutters(notes);
}

// ── Pop chord comping — plain triads, quarter-note chunking ────────────────
// No approach-cell stabs, no rootless 7th voicings — pop comping is a plain
// root-3-5 triad, either "chunked" in even quarter notes (L1/L2, the
// defining pop comping feel) or held as sustained whole notes (L3).

function buildPopVoicing(chord: ChordSymbolTones): number[] {
  let base = 48 + chord.rootPc;
  while (base > 55) base -= 12;
  while (base < 44) base += 12;
  return [base, base + (chord.third ?? 12), base + (chord.fifth ?? 7)]; // root-3-5
}

function buildPopChordPattern(
  bars: number,
  level: number,
  chordAt: (tick: number) => ChordSymbolTones,
  timeline: readonly TimedChord[],
): BackingNote[] {
  const notes: BackingNote[] = [];

  for (let bar = 0; bar < bars; bar++) {
    const o = bar * BAR_TICKS;
    if (level === 3) {
      for (const [start, end] of chordSpans(o, timeline)) {
        buildPopVoicing(chordAt(start)).forEach((p) =>
          notes.push({
            note: p,
            onset: start,
            duration: Math.max(120, end - start - 120),
            velocity: 65,
            part: 'chords',
          }),
        );
      }
    } else {
      [0, 480, 960, 1440].forEach((t0) => {
        const t = o + t0 + jitter(-4, 4);
        buildPopVoicing(chordAt(o + t0)).forEach((p) =>
          notes.push({
            note: p,
            onset: Math.max(0, t),
            duration: 440,
            velocity: 66 + jitter(0, 8),
            part: 'chords',
          }),
        );
      });
    }
  }
  return removeChordStutters(notes);
}

// ── Backing note assembly ───────────────────────────────────────────────────

/** The key's tonic chord — what bass and chords follow without chord symbols. */
function tonicChord(keyRoot: number, genre: string): ChordSymbolTones {
  const rootPc = ((keyRoot % 12) + 12) % 12;
  return genre === 'pop'
    ? { rootPc, bassPc: rootPc, intervals: [0, 4, 7], third: 4, fifth: 7 }
    : {
        rootPc,
        bassPc: rootPc,
        intervals: [0, 3, 7, 10],
        third: 3,
        fifth: 7,
        seventh: 10,
      };
}

/**
 * When the student plays the bass line themselves (their left hand) and the
 * engine also plays bass, the backing bass doubles the left hand note for note.
 */
function doubledLeftHand(
  step: ActivityStepV2,
  targetNotes: readonly GenreNoteEvent[],
): BackingNote[] | null {
  if (!step.backing_parts?.student_plays?.includes('bass')) return null;
  const leftHand = targetNotes.filter((n) => n.hand === 'lh');
  if (!leftHand.length) return null;
  return leftHand.map((n) => ({
    note: n.midi,
    onset: n.onset,
    duration: n.duration,
    velocity: n.velocity ?? 90,
    part: 'bass',
  }));
}

/**
 * Every backing note for a play-along step, in ticks from transport start.
 *
 * Bass and chords follow the step's chord timeline (chordTimeline.ts): when each
 * chord of `chordSymbols` sounds, including mid-bar changes the target notes
 * play. Without chord symbols they stay on the key's tonic chord.
 *
 * `countInTicks` is the lead-in before the student's bar 1 (in time, the piano
 * roll's count-in bar plus the one-bar note offset). The groove, bass and chords
 * all start there, so backing bar N lines up with target bar N. The lead-in
 * plays the groove's last bars (its fill), so the drums still count the student in.
 */
export function buildBackingNotes(
  step: ActivityStepV2,
  keyRoot: number,
  level: number,
  styleRef: string,
  targetNotes: GenreNoteEvent[],
  genre: string,
  countInTicks = 0,
): BackingNote[] {
  const engineGenerates = step.backing_parts?.engine_generates ?? [];
  const timeline = buildChordTimeline(
    step.chordSymbols,
    targetNotes,
    BACKING_BARS,
  );
  const tonic = tonicChord(keyRoot, genre);
  const chordAt = (tick: number): ChordSymbolTones =>
    chordAtTick(timeline, tick) ?? tonic;

  const notes: BackingNote[] = [];
  let drums: BackingNote[] = [];
  if (engineGenerates.includes('drums')) {
    const grooveId = (step.grooveId ??
      getGrooveForStyleRef(styleRef, genre)) as GrooveId;
    drums = buildDrumPatternForGroove(BACKING_BARS, grooveId);
    notes.push(...drums);
  }
  if (engineGenerates.includes('bass')) {
    notes.push(
      ...(doubledLeftHand(step, targetNotes) ??
        buildBassPattern(BACKING_BARS, level, genre, chordAt, timeline)),
    );
  }
  if (engineGenerates.includes('chords')) {
    notes.push(
      ...(genre === 'pop'
        ? buildPopChordPattern(BACKING_BARS, level, chordAt, timeline)
        : buildChordPattern(BACKING_BARS, level, chordAt, timeline)),
    );
  }

  // ── Ending: replay beat 1 content on the downbeat after the last bar ──
  // Collects bass + chord notes from beat 1 of bar 1 and places a copy
  // at the final downbeat. Drums excluded — avoids kick-run violations
  // when the last bar has a fill pattern ending near the bar line.
  const endingTick = BACKING_BARS * BAR_TICKS;
  const beat1Notes = notes.filter((n) => n.onset < 120 && n.part !== 'drums');
  beat1Notes.forEach((n) => {
    notes.push({ ...n, onset: endingTick + Math.min(n.onset, 10) });
  });

  if (countInTicks <= 0) return notes;

  // Lead-in: the groove's closing bars, ending exactly on the student's bar 1.
  const leadInStart = endingTick - countInTicks;
  const leadIn = drums
    .filter((n) => n.onset >= leadInStart && n.onset < endingTick)
    .map((n) => ({ ...n, onset: n.onset - leadInStart }));

  return [
    ...leadIn,
    ...notes.map((n) => ({ ...n, onset: n.onset + countInTicks })),
  ];
}
