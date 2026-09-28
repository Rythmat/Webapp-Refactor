/**
 * MidiGuitarChordAggregator.ts — MIDI-guitar note events → chord events.
 *
 * A MIDI guitar sends one note per string, so a strum arrives as a burst of
 * note-ons. Notes starting within STRUM_WINDOW_MS of the first form one
 * strum, named from every pitch class still held (ringing strings included)
 * with the lowest held note as bass. Ghost notes — very soft, or released
 * within GHOST_MAX_MS (pick noise, fret buzz) — never count.
 *
 * Events:
 *   'on'      every strum, with a new strumId even when the chord repeats;
 *   'change'  a single added note (a hammer-on, a late string) or a strum's
 *             tail changes the sounding chord, or a ghost is taken back out;
 *   'off'     fewer than two pitch classes have been held for RELEASE_MS.
 * Releasing strings never sends a 'change': like AudioChordDetector's chord
 * hold, a decaying chord keeps its name.
 *
 * Pure apart from one wake-up timer, so a strum's 'on' and a release's 'off'
 * arrive without further input. All times are the caller's perfMs; call
 * reset() on teardown.
 */

import {
  identifyChordFromPitchClasses,
  nearestChordForPitchClasses,
} from './chordIdentity';
import type { GuitarChordEvent } from './types';

/** A strum as heard from either guitar input. */
export type { GuitarChordEvent };

const STRUM_WINDOW_MS = 60;
/**
 * Lesson strums are at least an eighth note apart (150 ms at the 200 BPM
 * ceiling), so notes this soon after a strum began are its tail — a slow
 * strum, or a low string tracked late — and never start another strum.
 */
const STRUM_TAIL_MS = 2 * STRUM_WINDOW_MS;
const GHOST_VELOCITY = 12;
const GHOST_MAX_MS = 40;
const RELEASE_MS = 150;

interface SoundingChord {
  strumId: number;
  onsetPerfMs: number;
  rootPc: number;
  quality: string;
  pcs: number[];
  midis: number[];
}

export class MidiGuitarChordAggregator {
  /** Held notes → note-on time. */
  private readonly held = new Map<number, number>();
  /** Notes of the strum still being collected → note-on time. */
  private readonly windowNotes = new Map<number, number>();
  private windowStart: number | null = null;
  private sounding: SoundingChord | null = null;
  /** When the held pitch classes last dropped below two. */
  private thinSince: number | null = null;
  private nextStrumId = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly onEvent: (event: GuitarChordEvent) => void) {}

  noteOn(midi: number, velocity: number, perfMs: number): void {
    this.advance(perfMs);
    if (velocity < GHOST_VELOCITY) return;
    this.held.set(midi, perfMs);
    this.windowNotes.set(midi, perfMs);
    this.windowStart ??= perfMs;
    this.trackThin(perfMs);
    this.schedule(perfMs);
  }

  noteOff(midi: number, perfMs: number): void {
    this.advance(perfMs);
    const onAt = this.held.get(midi);
    if (onAt === undefined) return;
    this.held.delete(midi);
    if (perfMs - onAt < GHOST_MAX_MS) this.dropGhost(midi);
    this.trackThin(perfMs);
    this.schedule(perfMs);
  }

  /** Forget everything without emitting; strumIds keep counting up. */
  reset(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.held.clear();
    this.windowNotes.clear();
    this.windowStart = null;
    this.sounding = null;
    this.thinSince = null;
  }

  // ── Time ─────────────────────────────────────────────────────────────────

  private windowDue(): number {
    return this.windowStart === null
      ? Infinity
      : this.windowStart + STRUM_WINDOW_MS;
  }

  private releaseDue(): number {
    return this.sounding && this.thinSince !== null
      ? this.thinSince + RELEASE_MS
      : Infinity;
  }

  /** Run every transition due at or before `perfMs`, in time order. */
  private advance(perfMs: number): void {
    for (;;) {
      const windowDue = this.windowDue();
      const releaseDue = this.releaseDue();
      if (Math.min(windowDue, releaseDue) > perfMs) return;
      if (windowDue <= releaseDue) this.closeWindow();
      else this.release();
    }
  }

  private schedule(nowMs: number): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const due = Math.min(this.windowDue(), this.releaseDue());
    if (due === Infinity) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.advance(due);
      this.schedule(due);
    }, due - nowMs);
  }

  // ── Transitions ──────────────────────────────────────────────────────────

  private closeWindow(): void {
    const onsetPerfMs = this.windowStart!;
    const isStrum =
      !this.sounding ||
      (this.windowNotes.size >= 2 &&
        onsetPerfMs - this.sounding.onsetPerfMs >= STRUM_TAIL_MS);
    this.windowStart = null;
    this.windowNotes.clear();

    const midis = this.heldMidis();
    const pcs = pitchClasses(midis);
    if (pcs.length < 2) return;
    if (isStrum) {
      this.sounding = nameChord(this.nextStrumId++, onsetPerfMs, midis, pcs);
      this.emit('on', this.sounding);
    } else if (pcs.some((pc) => !this.sounding!.pcs.includes(pc))) {
      this.revise(midis, pcs);
    }
  }

  private release(): void {
    const chord = this.sounding!;
    const offsetPerfMs = this.thinSince!;
    this.sounding = null;
    this.thinSince = null;
    this.emit('off', chord, offsetPerfMs);
  }

  /** A ghost never counted: drop it from the open strum, or from the chord. */
  private dropGhost(midi: number): void {
    if (this.windowNotes.delete(midi)) {
      const starts = [...this.windowNotes.values()];
      this.windowStart = starts.length ? Math.min(...starts) : null;
      return;
    }
    if (!this.sounding?.midis.includes(midi)) return;
    const midis = this.heldMidis();
    const pcs = pitchClasses(midis);
    if (pcs.length >= 2 && !sameSet(pcs, this.sounding.pcs)) {
      this.revise(midis, pcs);
    }
  }

  private revise(midis: number[], pcs: number[]): void {
    const { strumId, onsetPerfMs } = this.sounding!;
    this.sounding = nameChord(strumId, onsetPerfMs, midis, pcs);
    this.emit('change', this.sounding);
  }

  private trackThin(perfMs: number): void {
    if (pitchClasses(this.heldMidis()).length >= 2) this.thinSince = null;
    else this.thinSince ??= perfMs;
  }

  private heldMidis(): number[] {
    return [...this.held.keys()].sort((a, b) => a - b);
  }

  private emit(
    phase: GuitarChordEvent['phase'],
    chord: SoundingChord,
    offsetPerfMs?: number,
  ): void {
    this.onEvent({
      phase,
      strumId: chord.strumId,
      rootPc: chord.rootPc,
      quality: chord.quality,
      pcs: [...chord.pcs],
      confidence: 1, // MIDI reports exactly what was played
      onsetPerfMs: chord.onsetPerfMs,
      ...(offsetPerfMs !== undefined ? { offsetPerfMs } : {}),
      source: 'midi',
      midis: [...chord.midis],
    });
  }
}

/** Distinct pitch classes, ascending. */
function pitchClasses(midis: number[]): number[] {
  return [...new Set(midis.map((m) => m % 12))].sort((a, b) => a - b);
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((pc) => b.includes(pc));
}

/** `midis` ascending, so midis[0] is the bass. */
function nameChord(
  strumId: number,
  onsetPerfMs: number,
  midis: number[],
  pcs: number[],
): SoundingChord {
  const bassPc = midis[0] % 12;
  const { rootPc, quality } = identifyChordFromPitchClasses(pcs, bassPc) ??
    nearestChordForPitchClasses(pcs, bassPc) ?? { rootPc: bassPc, quality: '' };
  return { strumId, onsetPerfMs, rootPc, quality, pcs, midis };
}
