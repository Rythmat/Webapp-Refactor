/**
 * useBackingTrack.ts — Multi-track backing engine for play-along activities.
 *
 * Sound engine (in priority order):
 *   1. Real instruments — DrumMachineEngine + SamplerInstrument + epSamplerV2
 *      All accept time parameter — sample-accurate scheduling
 *   2. SF2 fallback — SoundFontAdapter (if real engines fail)
 *   3. Tone.js synths — last resort
 *
 * Patterns: v10 engine proven in Logic Pro.
 * Rules encoded:
 *   - Never 4+ consecutive 16th notes on kick (validated globally)
 *   - Approach always precedes goal (atomic cells)
 *   - Max 4 chromatic approaches per 4-bar phrase
 *   - Structured 4-bar loop, max 1 variation in bars 5-8
 *   - Double chromatic above: 33% at cadence bars only
 */

import { useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { DrumMachineEngine } from '../../daw/instruments/DrumMachineEngine';
// Bass uses direct Tone.Sampler for triggerAttackRelease (self-contained per note)
import { SoundFontAdapter } from '../../daw/instruments/SoundFontAdapter';
import {
  buildApproachNotes,
  shouldAddApproach,
} from '../engine/genreGeneration/bassApproach';
import { deriveBassNotes } from '../engine/genreGeneration/chordBassNote';
import {
  startEpSampler,
  triggerEpAttackRelease,
} from '../engine/genreGeneration/epSamplerV2';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
import type { ActivityStepV2 } from '../types/activity.v2';

const BACKING_BARS = 16;

// ── Bass sampler config (public/samples/bass-electric/) ─────────────────────

const BASS_ELECTRIC_CONFIG = {
  baseUrl: '/samples/bass-electric/',
  sampleMap: {
    'A#1': 'As1.mp3',
    'C#1': 'Cs1.mp3',
    E1: 'E1.mp3',
    G1: 'G1.mp3',
    'A#2': 'As2.mp3',
    'C#2': 'Cs2.mp3',
    E2: 'E2.mp3',
    G2: 'G2.mp3',
    'A#3': 'As3.mp3',
    'C#3': 'Cs3.mp3',
    E3: 'E3.mp3',
    G3: 'G3.mp3',
    'A#4': 'As4.mp3',
    'C#4': 'Cs4.mp3',
    E4: 'E4.mp3',
    G4: 'G4.mp3',
    'C#5': 'Cs5.mp3',
  },
};

interface BackingNote {
  note: number;
  onset: number;
  duration: number;
  velocity: number;
  part: 'drums' | 'bass' | 'chords';
}

// ── Chord voicing derivation ────────────────────────────────────────────────

function getBackingVoicing(keyRoot: number): number[] {
  // Returns [root, b3, 5, b7] in octave 3-4 range for chord comping.
  // Root is first element so bass can extract it via chordsByBar[n][0].
  const root = keyRoot % 12;
  const base = 48 + root;
  return [base, base + 3, base + 7, base + 10];
}

function deriveChordsByBar(
  _targetNotes: GenreNoteEvent[],
  keyRoot: number,
): number[][] {
  // targetNotes are MELODY notes, not chord voicings.
  // Bass and chord patterns should always derive from keyRoot.
  const defaultVoicing = getBackingVoicing(keyRoot);
  return Array(BACKING_BARS).fill(defaultVoicing);
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

// ── Groove dispatcher ───────────────────────────────────────────────────────

type GrooveId =
  | 'groove_funk_01'
  | 'groove_funk_02'
  | 'groove_funk_03'
  | 'groove_funk_04'
  | 'groove_funk_05'
  | 'groove_funk_06';

function getGrooveForStyleRef(styleRef?: string): GrooveId {
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
    case 'groove_funk_01':
    default:
      return buildDrumPattern(bars);
  }
}

// ── Bass patterns ───────────────────────────────────────────────────────────

function buildBassPattern(
  bars: number,
  keyRoot: number,
  level: number,
  chordSymbols: string[] | undefined,
): BackingNote[] {
  const bassNotes = deriveBassNotes(chordSymbols, keyRoot, bars);
  console.log(
    '[buildBassPattern] chordSymbols:',
    chordSymbols,
    'keyRoot:',
    keyRoot,
    'bassNotes:',
    bassNotes,
  );
  const notes: BackingNote[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const o = bar * 1920;
    const root = bassNotes[bar];
    const oct = root + 12;
    const fifth = root + 7;

    const push = (note: number, onset: number, dur: number, vel: number) =>
      notes.push({
        note,
        onset: o + onset + jitter(0, 5),
        duration: dur,
        velocity: vel,
        part: 'bass',
      });

    if (level === 1) {
      // "boom ... ba-doom" — beat 1, 16th pickup into beat 3
      push(root, 0, 360, 95); // boom  (beat 1, dotted 8th)
      push(root, 840, 120, 95); // ba    (a-of-2, 16th pickup)
      push(root, 960, 360, 88); // doom  (beat 3, dotted 8th)
    } else if (level === 2) {
      push(root, 0, 220, 95);
      push(oct, 240, 120, 82);
      push(root, 960, 380, 88);
      // Chromatic approach to next bar's root (replaces hardcoded chrom)
      if (shouldAddApproach(bar, bars)) {
        const nextRoot = bassNotes[(bar + 1) % bars];
        const approachNotes = buildApproachNotes(
          nextRoot,
          1920, // goal = beat1 of next bar (relative to current bar start)
          o, // current bar offset
          0, // prev chord on beat1
          undefined,
          'funk',
        );
        approachNotes.forEach((a) =>
          notes.push({
            note: a.midi,
            onset: a.onset,
            duration: a.duration,
            velocity: 75,
            part: 'bass',
          }),
        );
      }
    } else {
      push(root, 0, 220, 96);
      push(oct, 240, 120, 85);
      push(root, 480, 180, 78);
      push(fifth, 840, 120, 72);
      push(root, 960, 220, 92);
      push(oct, 1200, 120, 80);
      // L3: chromatic approach with full engine variety
      if (shouldAddApproach(bar, bars)) {
        const nextRoot = bassNotes[(bar + 1) % bars];
        const approachNotes = buildApproachNotes(
          nextRoot,
          1920, // goal = beat1 of next bar
          o,
          0,
          undefined,
          'funk',
        );
        approachNotes.forEach((a) =>
          notes.push({
            note: a.midi,
            onset: a.onset,
            duration: a.duration,
            velocity: 75,
            part: 'bass',
          }),
        );
      } else {
        push(root - 12, 1320, 120, 75); // fallback: low root fill
      }
    }
  }
  return notes;
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

function buildVoicings(keyRoot: number): ChordVoicings {
  let b7 = keyRoot + 10;
  while (b7 < 57) b7 += 12;
  while (b7 > 67) b7 -= 12;
  const b3 = b7 + 5,
    fif = b7 + 9;
  return {
    G: [b7, b3, fif],
    A: [b7 - 1, b3 - 1, fif - 1],
    A2: [b7 + 1, b3 + 1, fif + 1],
    AA: [b7 + 2, b3 + 2, fif + 2],
  };
}

function makeStabs(
  barOffset: number,
  pitches: number[],
  onsets: number[],
  dur: number,
  vel: number,
): BackingNote[] {
  const notes: BackingNote[] = [];
  onsets.forEach((t0) => {
    const t = barOffset + t0 + jitter(-10, 10);
    pitches.forEach((p) =>
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

function makePlainBar(o: number, v: ChordVoicings): BackingNote[] {
  return makeStabs(o, v.G, PRIMARY_STAB_POSITIONS, 120, 72);
}

function makeApproachBar(
  o: number,
  v: ChordVoicings,
  cellId?: string,
): BackingNote[] {
  const id = cellId ?? (Math.random() < 0.5 ? 'P1' : 'P2');
  const starts = CELL_VALID_STARTS[id] ?? [];
  const pool =
    starts.filter((t) => t >= 720).length > 0 && Math.random() < 0.7
      ? starts.filter((t) => t >= 720)
      : starts;
  const start = pool[Math.floor(Math.random() * pool.length)];
  const notes: BackingNote[] = [];
  (APPROACH_CELLS[id] ?? []).forEach(([rel, role, dur]) => {
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
    v.G.forEach((p) =>
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

function makeCadenceBar(o: number, v: ChordVoicings): BackingNote[] {
  if (Math.random() < 0.33) {
    const id = Math.random() < 0.5 ? 'P3' : 'P4';
    const notes: BackingNote[] = [];
    (APPROACH_CELLS[id] ?? []).forEach(([rel, role, dur]) => {
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
    notes.push(...makeStabs(o, v.G, [0, 360], 120, 72));
    return notes;
  }
  return makePlainBar(o, v);
}

function buildChordPattern(
  bars: number,
  level: number,
  chordsByBar: number[][],
  keyRoot: number,
): BackingNote[] {
  const notes: BackingNote[] = [];

  if (level === 3) {
    for (let bar = 0; bar < bars; bar++) {
      const o = bar * 1920;
      (chordsByBar[bar % chordsByBar.length] ?? []).forEach((midi) =>
        notes.push({
          note: midi,
          onset: o,
          duration: 1800,
          velocity: 68,
          part: 'chords',
        }),
      );
    }
    return removeChordStutters(notes);
  }

  const v = buildVoicings(keyRoot);
  const bar2CellId = Math.random() < 0.5 ? 'P1' : 'P2';
  const variationBar = Math.floor(Math.random() * 3);

  for (let bar = 0; bar < Math.min(bars, 16); bar++) {
    const o = bar * 1920;
    const phrasePos = bar % 4;
    const isSecondPass = bar >= 4;

    if (phrasePos === 3) {
      notes.push(...makeCadenceBar(o, v));
    } else if (phrasePos === 0) {
      notes.push(
        ...(isSecondPass && variationBar === 0
          ? makeApproachBar(o, v)
          : makePlainBar(o, v)),
      );
    } else if (phrasePos === 1) {
      notes.push(
        ...(isSecondPass && variationBar === 1
          ? makePlainBar(o, v)
          : makeApproachBar(o, v, bar2CellId)),
      );
    } else {
      notes.push(
        ...(isSecondPass && variationBar === 2
          ? makeApproachBar(o, v)
          : makePlainBar(o, v)),
      );
    }
  }
  return removeChordStutters(notes);
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useBackingTrack(tempo: number) {
  const partsRef = useRef<Record<string, Tone.Part | undefined>>({});
  const isPlayingRef = useRef(false);

  // Real instrument engines
  const drumEngineRef = useRef<DrumMachineEngine | null>(null);
  const bassSamplerRef = useRef<Tone.Sampler | null>(null); // direct Tone.js Sampler
  const bassBridgeRef = useRef<Tone.Gain | null>(null);
  const drumBridgeRef = useRef<Tone.Gain | null>(null);
  const enginesReady = useRef(false);
  const enginesLoading = useRef(false);

  // SF2 fallback
  const sf2BassRef = useRef<SoundFontAdapter | null>(null);
  const sf2ChordsRef = useRef<SoundFontAdapter | null>(null);
  const sf2Ready = useRef(false);
  const sf2LoadingRef = useRef(false);
  const sf2NoteOffTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Tone.js last resort
  const kickSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const snareSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const hihatSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const bassSynthRef = useRef<Tone.MonoSynth | null>(null);
  const chordSynthRef = useRef<Tone.PolySynth | null>(null);

  const ensureFallbackSynths = useCallback(() => {
    if (!kickSynthRef.current) {
      kickSynthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 5,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -4,
      }).toDestination();
    }
    if (!snareSynthRef.current) {
      snareSynthRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
        volume: -6,
      }).toDestination();
    }
    if (!hihatSynthRef.current) {
      hihatSynthRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
        volume: -12,
      }).toDestination();
    }
    if (!bassSynthRef.current) {
      bassSynthRef.current = new Tone.MonoSynth({
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
        oscillator: { type: 'triangle' },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.2,
          baseFrequency: 200,
          octaves: 2,
        },
        volume: -6,
      }).toDestination();
    }
    if (!chordSynthRef.current) {
      chordSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
        oscillator: { type: 'triangle' },
        volume: -10,
      }).toDestination();
    }
  }, []);

  // ── initSF2 (name preserved so GenreLessonContainerV2 needs no changes) ──

  const initSF2 = useCallback(async (): Promise<boolean> => {
    if (enginesReady.current) return true;
    if (enginesLoading.current) return false;
    enginesLoading.current = true;

    try {
      await Tone.start();
      const ctx = Tone.getContext().rawContext as AudioContext;

      // Bridge Tone.js Gain nodes route through standardized-audio-context
      // so SamplerInstrument/DrumMachineEngine audio reaches speakers.
      // (native AudioNode passed directly can be silent due to wrapper mismatch)
      drumBridgeRef.current = new Tone.Gain(1).toDestination();
      bassBridgeRef.current = new Tone.Gain(1).toDestination();

      // DrumMachineEngine — real .wav samples (kick, snare, hihat, etc.)
      try {
        drumEngineRef.current = new DrumMachineEngine();
        await drumEngineRef.current.init(
          ctx,
          drumBridgeRef.current.input as unknown as AudioNode,
        );
      } catch (drumErr) {
        console.warn('[useBackingTrack] DrumMachineEngine failed:', drumErr);
        drumEngineRef.current = null;
      }

      // Direct Tone.js Sampler for bass — using triggerAttackRelease
      // which is self-contained per note (no voice collision issues)
      await new Promise<void>((resolve) => {
        bassSamplerRef.current = new Tone.Sampler({
          urls: BASS_ELECTRIC_CONFIG.sampleMap,
          baseUrl: BASS_ELECTRIC_CONFIG.baseUrl,
          onload: () => resolve(),
        });
        bassSamplerRef.current.connect(bassBridgeRef.current!);
      });

      // EP1 sampler for chord stabs
      await startEpSampler();

      enginesReady.current = true;
      enginesLoading.current = false;
      console.log('[useBackingTrack] Real instruments loaded ✓', {
        drums: !!drumEngineRef.current,
        bassSampler: !!bassSamplerRef.current,
      });
      return true;
    } catch (err) {
      console.warn('[useBackingTrack] Real engines failed, trying SF2...', err);
      enginesLoading.current = false;

      try {
        if (sf2Ready.current) return true;
        if (sf2LoadingRef.current) return false;
        sf2LoadingRef.current = true;
        await Tone.start();
        const ctx = Tone.getContext().rawContext as AudioContext;
        sf2BassRef.current = new SoundFontAdapter(33);
        sf2ChordsRef.current = new SoundFontAdapter(4);
        await Promise.all([
          sf2BassRef.current.init(ctx, out),
          sf2ChordsRef.current.init(ctx, out),
        ]);
        sf2Ready.current = true;
        sf2LoadingRef.current = false;
        return true;
      } catch (sf2Err) {
        console.warn(
          '[useBackingTrack] SF2 also failed, using Tone.js synths',
          sf2Err,
        );
        sf2LoadingRef.current = false;
        ensureFallbackSynths();
        return false;
      }
    }
  }, [ensureFallbackSynths]);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      drumEngineRef.current?.dispose();
      bassSamplerRef.current?.dispose();
      drumBridgeRef.current?.dispose();
      bassBridgeRef.current?.dispose();
      kickSynthRef.current?.dispose();
      snareSynthRef.current?.dispose();
      hihatSynthRef.current?.dispose();
      bassSynthRef.current?.dispose();
      chordSynthRef.current?.dispose();
      sf2BassRef.current?.dispose();
      sf2ChordsRef.current?.dispose();
      drumEngineRef.current = null;
      bassSamplerRef.current = null;
      drumBridgeRef.current = null;
      bassBridgeRef.current = null;
      kickSynthRef.current = null;
      snareSynthRef.current = null;
      hihatSynthRef.current = null;
      bassSynthRef.current = null;
      chordSynthRef.current = null;
      sf2BassRef.current = null;
      sf2ChordsRef.current = null;
    };
  }, []);

  const disposeAll = useCallback(() => {
    Object.values(partsRef.current).forEach((part) => {
      if (part) {
        try {
          part.stop(0);
        } catch {
          /* ignore negative time rounding */
        }
        part.dispose();
      }
    });
    partsRef.current = {};
    sf2NoteOffTimers.current.forEach(clearTimeout);
    sf2NoteOffTimers.current = [];
    drumEngineRef.current?.allNotesOff();
    bassSamplerRef.current?.releaseAll();
    sf2BassRef.current?.allNotesOff();
    sf2ChordsRef.current?.allNotesOff();
  }, []);

  const stopBacking = useCallback(() => {
    isPlayingRef.current = false;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().loop = false;
    disposeAll();
  }, [disposeAll]);

  // ── startBacking ──────────────────────────────────────────────────────────

  const startBacking = useCallback(
    async (
      step: ActivityStepV2,
      keyRoot: number,
      level: number = 1,
      styleRef: string = 'l1a',
      targetNotes: GenreNoteEvent[] = [],
    ) => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      disposeAll();
      await Tone.start();
      ensureFallbackSynths();

      Tone.getTransport().bpm.value = tempo;
      Tone.getTransport().loop = false;

      const useReal = enginesReady.current;
      const useSF2 = sf2Ready.current;
      const engineGenerates = step.backing_parts?.engine_generates ?? [];
      const chordsByBar = deriveChordsByBar(targetNotes, keyRoot);
      const spt = 60 / (tempo * 480); // seconds per tick

      const allNotes: BackingNote[] = [];
      if (engineGenerates.includes('drums')) {
        const grooveId = (step.grooveId ??
          getGrooveForStyleRef(styleRef)) as GrooveId;
        allNotes.push(...buildDrumPatternForGroove(BACKING_BARS, grooveId));
      }
      if (engineGenerates.includes('bass'))
        allNotes.push(
          ...buildBassPattern(BACKING_BARS, keyRoot, level, step.chordSymbols),
        );
      if (engineGenerates.includes('chords'))
        allNotes.push(
          ...buildChordPattern(BACKING_BARS, level, chordsByBar, keyRoot),
        );

      // ── Ending: replay beat 1 content on the downbeat after the last bar ──
      // Collects bass + chord notes from beat 1 of bar 1 and places a copy
      // at the final downbeat. Drums excluded — avoids kick-run violations
      // when the last bar has a fill pattern ending near the bar line.
      const endingTick = BACKING_BARS * 1920;
      const beat1Notes = allNotes.filter(
        (n) => n.onset < 120 && n.part !== 'drums',
      );
      beat1Notes.forEach((n) => {
        allNotes.push({
          ...n,
          onset: endingTick + Math.min(n.onset, 10),
        });
      });

      // Dev verification
      if (import.meta.env.DEV) {
        const kicks = allNotes
          .filter((n) => n.note === 36)
          .map((n) => n.onset)
          .sort((a, b) => a - b);
        let maxRun = 1,
          run = 1;
        for (let i = 1; i < kicks.length; i++) {
          run = kicks[i] - kicks[i - 1] <= 130 ? run + 1 : 1;
          maxRun = Math.max(maxRun, run);
        }
        console.assert(maxRun < 4, `[drums] kick run of ${maxRun}`);
        console.log(
          `[backing] ${allNotes.length} notes, max kick run: ${maxRun}`,
        );
      }

      // ── Drums ─────────────────────────────────────────────────────────────
      const drumEvents = allNotes
        .filter((n) => n.part === 'drums')
        .map((n) => ({
          time: n.onset * spt,
          note: n.note,
          velocity: n.velocity,
        }));

      if (drumEvents.length) {
        const drumPart = new Tone.Part(
          (time, value: { note: number; velocity: number }) => {
            if (useReal && drumEngineRef.current) {
              drumEngineRef.current.noteOn(value.note, value.velocity, time);
            } else {
              const vel = value.velocity / 127;
              if (value.note === 36)
                kickSynthRef.current?.triggerAttackRelease(
                  'C1',
                  '8n',
                  time,
                  vel,
                );
              else if (value.note === 38)
                snareSynthRef.current?.triggerAttackRelease('16n', time, vel);
              else if (value.note === 42) {
                // Closed hat chokes any sustaining open hat
                hihatSynthRef.current?.triggerRelease(time);
                hihatSynthRef.current?.triggerAttackRelease('32n', time, vel);
              } else if (value.note === 46)
                hihatSynthRef.current?.triggerAttackRelease(
                  '16n',
                  time,
                  vel * 0.8,
                );
            }
          },
          drumEvents,
        );
        drumPart.start(0);
        partsRef.current.drums = drumPart;
      }

      // ── Bass ──────────────────────────────────────────────────────────────
      // Two-voice alternating system (like index/middle finger plucking).
      // For 16th note pickups followed immediately by another note:
      //   - NO noteOff — the next noteOn on the SAME voice stops the string
      //   - This is how a real bass player works: new pluck kills old vibration
      // For notes with space after them: normal noteOff for clean cutoff.
      const rawBass = allNotes
        .filter((n) => n.part === 'bass')
        .sort((a, b) => a.onset - b.onset);

      // For each bass note, compute the duration it should actually sound.
      // If a 16th note is immediately followed by another note, its sounding
      // duration extends to the onset of the next note (the new pluck cuts
      // the string, like a real bass player).
      const IMMEDIATE_TICKS = 130; // just over one 16th (120t)
      const bassEvents = rawBass.map((n, i) => {
        const next = rawBass[i + 1];
        const isPickup =
          next != null && next.onset - n.onset <= IMMEDIATE_TICKS;
        // Pickup 16th: ring until next note starts (next pluck kills the string)
        // Normal note: use written duration
        const soundDur = isPickup ? next!.onset - n.onset : n.duration;
        return {
          time: n.onset * spt,
          note: n.note,
          velocity: n.velocity,
          durationSec: soundDur * spt,
          durationMs: soundDur * spt * 1000,
        };
      });

      if (bassEvents.length) {
        const bassPart = new Tone.Part(
          (
            time,
            value: {
              note: number;
              velocity: number;
              durationSec: number;
              durationMs: number;
            },
          ) => {
            if (useReal && bassSamplerRef.current) {
              // triggerAttackRelease is self-contained: each call creates its
              // own buffer source with its own stop timer. No voice collision.
              const noteName = Tone.Frequency(value.note, 'midi').toNote();
              bassSamplerRef.current.triggerAttackRelease(
                noteName,
                value.durationSec,
                time,
                value.velocity / 127,
              );
            } else if (useSF2 && sf2BassRef.current) {
              Tone.getDraw().schedule(() => {
                sf2BassRef.current!.noteOn(value.note, value.velocity);
                const t = setTimeout(
                  () => sf2BassRef.current?.noteOff(value.note),
                  value.durationMs,
                );
                sf2NoteOffTimers.current.push(t);
              }, time);
            } else {
              bassSynthRef.current?.triggerAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                time,
              );
            }
          },
          bassEvents,
        );
        bassPart.start(0);
        partsRef.current.bass = bassPart;
      }

      // ── Chords ────────────────────────────────────────────────────────────
      const chordEvents = allNotes
        .filter((n) => n.part === 'chords')
        .map((n) => ({
          time: n.onset * spt,
          note: n.note,
          velocity: n.velocity,
          durationSec: n.duration * spt,
          durationMs: n.duration * spt * 1000,
        }));

      if (chordEvents.length) {
        const chordPart = new Tone.Part(
          (
            time,
            value: {
              note: number;
              velocity: number;
              durationSec: number;
              durationMs: number;
            },
          ) => {
            if (useReal) {
              // epSamplerV2 — FluidR3 EP1, sample-accurate with time param
              void triggerEpAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                value.velocity,
                time,
              );
            } else if (useSF2 && sf2ChordsRef.current) {
              Tone.getDraw().schedule(() => {
                sf2ChordsRef.current!.noteOn(value.note, value.velocity);
                const t = setTimeout(
                  () => sf2ChordsRef.current?.noteOff(value.note),
                  value.durationMs,
                );
                sf2NoteOffTimers.current.push(t);
              }, time);
            } else {
              chordSynthRef.current?.triggerAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                time,
              );
            }
          },
          chordEvents,
        );
        chordPart.start(0);
        partsRef.current.chords = chordPart;
      }

      Tone.getTransport().start('+0.1');
      isPlayingRef.current = true;
    },
    [tempo, disposeAll, ensureFallbackSynths],
  );

  return {
    startBacking,
    stopBacking,
    initSF2,
    sf2Ready: enginesReady.current || sf2Ready.current,
  };
}
