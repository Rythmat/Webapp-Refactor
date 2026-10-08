/**
 * drumGroove.ts — designed drum grooves: the data an admin authors in the
 * console's Drum Grooves designer, and how it becomes backing notes.
 *
 * A groove is a document: meter, length, kit, per-pad levels and a list of hits
 * at PPQ 480 on General MIDI pad notes. That is the shape the genre engine
 * (BackingNote) and the Studio (MidiClip) already speak, so a designed groove
 * plays through the same DrumMachineEngine as every hardcoded one, with no
 * translation layer to drift.
 *
 * No audio and no React here.
 */

import type { DrumKitId } from '@/daw/instruments/drumKits';
import type { BackingNote } from '../genreGeneration/backingPatterns';

export const PPQ = 480;

export interface DrumGrooveHit {
  /** Ticks from the start of the pattern, PPQ 480. */
  tick: number;
  /** General MIDI pad note: 36 kick, 38 snare, 42 closed hat… (drumKits.ts). */
  note: number;
  /** 1–127. */
  velocity: number;
  /**
   * Feel: where the hit was actually played, in ticks from `tick` (negative =
   * ahead of the beat). `tick` is where it's written — what the grid shows and
   * edits — and playback sounds `tick + offset`, so a real performance keeps
   * its push and lay-back while staying editable on the grid.
   */
  offset?: number;
}

/** Where a hit sounds: its written tick plus its feel. */
export const playedTick = (hit: DrumGrooveHit) => hit.tick + (hit.offset ?? 0);

/** How far a played note may sit from a grid line and still be written on it. */
const FEEL_WINDOW = 30;

/**
 * A played tick as written position + feel: the coarsest of 16ths, 16th
 * triplets and 32nds within FEEL_WINDOW ticks, else the nearest 32nd.
 */
export function splitFeel(played: number): { tick: number; offset: number } {
  for (const step of [120, 80, 60]) {
    const tick = Math.round(played / step) * step;
    if (Math.abs(played - tick) <= FEEL_WINDOW) {
      return { tick: Math.max(0, tick), offset: played - Math.max(0, tick) };
    }
  }
  const tick = Math.max(0, Math.round(played / 60) * 60);
  return { tick, offset: played - tick };
}

export type GrooveGridId = '8n' | '16n' | '8t' | '16t' | '32n';
export type TempoUnit = 'quarter' | 'dotted-quarter' | 'half' | 'eighth';

export interface DrumGroove {
  /**
   * What a step's `grooveId` names. An id that matches a hardcoded groove
   * (groove_funk_02, trap_a) replaces it once published; delete the file and
   * the code path is back.
   */
  id: string;
  name: string;
  description?: string;
  /** Genre it was written for — filtering only. */
  genre?: string;
  /** Finer style inside the genre ('Trap', 'Indie', 'Bossa') — filtering. */
  style?: string;
  /** Free tags for the library's search ('shuffle', 'half-time'). */
  tags?: string[];
  /** Lessons and Practice Tracks only ever play 'live' grooves. */
  status: 'draft' | 'live';
  timeSignature: [number, number];
  /** Felt pulses per bar, for the beat lights: 4 for a 12/8 shuffle, not 12. */
  feltBeats: number;
  /** Pattern length in bars; it loops to fill the backing. */
  bars: number;
  /**
   * ALWAYS quarter-note bpm. Lessons keep their own tempo; this is the
   * designer's audition tempo and a Theory Practice Track's opening tempo.
   */
  tempo: number;
  /** What the tempo number means to a musician (♩. = 156 is 234 quarters). */
  tempoUnit: TempoUnit;
  /**
   * Audition swing, 50–75 (swing.ts). In a lesson the step's or flow's swing
   * wins, because it swings the bass, chords and the student's target notes
   * too — a groove swinging on its own would pull away from the grading.
   */
  swing: number;
  grid: GrooveGridId;
  /** Kit used when the step names none (backing_style.kit wins). */
  kit: DrumKitId;
  /** Per-pad trim, multiplied into velocity: a fader, not a velocity edit. */
  padGains: Partial<Record<number, number>>;
  /**
   * Played-by-a-person variation, re-rolled every time the backing is built —
   * what the hardcoded funk grooves do with jitter(). 0 is machine-exact.
   */
  humanize: { timing: number; velocity: number };
  hits: DrumGrooveHit[];
}

// ── Grid ───────────────────────────────────────────────────────────────────

export const GROOVE_GRIDS: {
  id: GrooveGridId;
  label: string;
  ticks: number;
}[] = [
  { id: '8n', label: '8ths', ticks: 240 },
  { id: '16n', label: '16ths', ticks: 120 },
  { id: '8t', label: '8th triplets', ticks: 160 },
  { id: '16t', label: '16th triplets', ticks: 80 },
  { id: '32n', label: '32nds', ticks: 60 },
];

export function gridTicks(grid: GrooveGridId): number {
  return GROOVE_GRIDS.find((g) => g.id === grid)?.ticks ?? 120;
}

/**
 * Ticks per bar. The denominator is a note value, not a beat count: 12/8 is
 * twelve eighths = 2880 ticks, six quarter notes' worth.
 */
export function barTicks([top, bottom]: [number, number]): number {
  return Math.round((top * PPQ * 4) / bottom);
}

export function patternTicks(
  groove: Pick<DrumGroove, 'timeSignature' | 'bars'>,
) {
  return barTicks(groove.timeSignature) * groove.bars;
}

/**
 * The coarsest grid every hit sits on, so opening a groove shows its notes on
 * cells rather than as a pile of off-grid warnings.
 */
export function inferGrid(hits: readonly DrumGrooveHit[]): GrooveGridId {
  for (const id of ['8n', '16n', '8t', '16t', '32n'] as const) {
    const step = gridTicks(id);
    if (hits.every((h) => h.tick % step === 0)) return id;
  }
  return '16n';
}

/**
 * Hits the grid can't address — a 32nd push on a 16th grid. They still play
 * and are always saved; the designer just can't click them until the grid is
 * fine enough. Never round them onto the grid: that deletes a note silently.
 */
export function offGridHits(
  hits: readonly DrumGrooveHit[],
  grid: GrooveGridId,
): DrumGrooveHit[] {
  const step = gridTicks(grid);
  return hits.filter((h) => h.tick % step !== 0);
}

// ── Tempo ──────────────────────────────────────────────────────────────────

export const TEMPO_UNITS: {
  id: TempoUnit;
  symbol: string;
  quarters: number;
}[] = [
  { id: 'quarter', symbol: '♩', quarters: 1 },
  { id: 'dotted-quarter', symbol: '♩.', quarters: 1.5 },
  { id: 'half', symbol: '𝅗𝅥', quarters: 2 },
  { id: 'eighth', symbol: '♪', quarters: 0.5 },
];

const quartersPer = (unit: TempoUnit) =>
  TEMPO_UNITS.find((u) => u.id === unit)?.quarters ?? 1;

/** Quarter bpm → the number a musician counts. */
export function toCounted(quarterBpm: number, unit: TempoUnit): number {
  return Math.round(quarterBpm / quartersPer(unit));
}

/** The number a musician counts → quarter bpm. */
export function toQuarterBpm(counted: number, unit: TempoUnit): number {
  return Math.round(counted * quartersPer(unit));
}

// ── Velocity ───────────────────────────────────────────────────────────────

/**
 * Ghost, soft, normal, accent — the four levels the hardcoded patterns use
 * (hipHopBacking's HIT_VELOCITY: g 38, x 96, X 112).
 */
export const VELOCITY_LEVELS = [38, 70, 96, 112] as const;

export function nextVelocity(velocity: number): number {
  const i = VELOCITY_LEVELS.findIndex((v) => Math.abs(v - velocity) <= 12);
  return VELOCITY_LEVELS[(i + 1) % VELOCITY_LEVELS.length];
}

// ── Playback ───────────────────────────────────────────────────────────────

const clampVelocity = (v: number) => Math.max(1, Math.min(127, Math.round(v)));

/** A hit's velocity after its pad's trim. Shared by lessons and the designer. */
export function trimmedVelocity(groove: DrumGroove, hit: DrumGrooveHit) {
  return clampVelocity(hit.velocity * (groove.padGains[hit.note] ?? 1));
}

/**
 * The groove tiled across `bars` bars of 4/4 backing as drum BackingNotes,
 * pad trims applied and humanize rolled. Unswung: the caller swings it with
 * the rest of the backing.
 */
export function buildDesignedDrums(
  groove: DrumGroove,
  bars: number,
  barLength = 1920,
): BackingNote[] {
  const loop = patternTicks(groove);
  const total = bars * barLength;
  const { timing, velocity } = groove.humanize;
  const roll = (amount: number) =>
    amount > 0 ? Math.round((Math.random() * 2 - 1) * amount) : 0;

  const notes: BackingNote[] = [];
  if (loop <= 0) return notes;
  for (let start = 0; start < total; start += loop) {
    for (const hit of groove.hits) {
      const onset = Math.max(0, start + playedTick(hit));
      if (onset >= total) continue;
      notes.push({
        note: hit.note,
        // Late, never early: a hit pushed before the downbeat would land in
        // the previous bar's count.
        onset: onset + Math.abs(roll(timing)),
        duration: 60,
        velocity: clampVelocity(trimmedVelocity(groove, hit) + roll(velocity)),
        part: 'drums',
      });
    }
  }
  return notes.sort((a, b) => a.onset - b.onset);
}

/** A blank groove for "New groove". */
export function blankGroove(id: string, name: string): DrumGroove {
  return {
    id,
    name,
    status: 'draft',
    timeSignature: [4, 4],
    feltBeats: 4,
    bars: 1,
    tempo: 100,
    tempoUnit: 'quarter',
    swing: 50,
    grid: '16n',
    kit: 'natural',
    padGains: {},
    humanize: { timing: 0, velocity: 0 },
    hits: [],
  };
}

/** Ids are file names and step references: lowercase, digits, _ and -. */
export function grooveIdFrom(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `groove_${Date.now().toString(36)}`
  );
}

/**
 * Loop lengths the designer offers, in bars. A groove written longer (the
 * imported 8-bar Funk 01) keeps its length until one of these is picked.
 */
export const LOOP_LENGTHS = [1, 2, 4] as const;

/**
 * The groove at a new loop length. Shrinking keeps the hits past the new end —
 * reported in the designer, not deleted — so growing back restores them.
 * Growing fills each new bar that has nothing kept by repeating the pattern
 * (bar 3 of a 2-bar groove grown to 4 is a copy of bar 1).
 */
export function resizeLoop(groove: DrumGroove, bars: number): DrumGroove {
  const n = Math.max(1, Math.round(bars));
  if (n <= groove.bars) return { ...groove, bars: n };

  const barT = barTicks(groove.timeSignature);
  const barOf = (tick: number) => Math.floor(tick / barT);
  const filled = new Set(groove.hits.map((h) => barOf(h.tick)));
  const hits = [...groove.hits];
  for (let bar = groove.bars; bar < n; bar++) {
    if (filled.has(bar)) continue;
    const source = bar % groove.bars;
    for (const h of groove.hits) {
      if (barOf(h.tick) === source) {
        hits.push({ ...h, tick: h.tick + (bar - source) * barT });
      }
    }
  }
  return { ...groove, bars: n, hits };
}

export const GROOVE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
