import type { MidiNoteEvent } from '@prism/engine';
import {
  DEFAULT_CEILING,
  voiceChord,
} from '@/curriculum/engine/chordComping/chordComping';
import {
  chordSymbolTones,
  type ChordSymbolTones,
} from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import {
  timedChordTimeline,
  type TimedChords,
} from '@/curriculum/engine/genreGeneration/chordTimeline';
import { barTicks } from '@/curriculum/engine/meter';
import type { MidiClip } from '@/daw/store/tracksSlice';
import type { GenrePracticeTrackResult } from '@/features/practiceTracks/genre/buildGenrePracticeTrack';

// ── Prism's chords, voiced from their symbols (owner, 2026-11-10) ──────────
//
// Prism builds its parts through the Learn practice-track engine, whose
// chord patterns are written for a student playing along: a pop root-3-5
// that drops the 7th, a funk 7-3-5 that sounds like another triad, every
// chord stacked from its root. Kept as lessons need them, they're wrong for
// a Studio part: the lane says Bmaj7 and the track must play Bmaj7.
//
// So the chords part keeps the engine's rhythm (when each chord is hit, for
// how long, how hard) and takes its pitches from the chord symbol sounding
// at each hit: every tone (up to four, the 5th dropped first), in the close
// inversion nearest the chord before it, under a keyboard ceiling (C5), so
// the chords move smoothly in the middle of the keyboard, clear of the bass.
// It reads the same symbols the chord lane is named from, so the two agree.
//
// A band's captured part (a pianist's own voicings) stays as played while it
// sounds every chord: only a part that loses a chord's 3rd or 7th (a triad
// part over 7th chords) is voiced again.

/** Notes struck within this many ticks of each other are one chord hit. */
const STRUM_TICKS = 30;

/**
 * How far ahead a hit may belong to the next chord: a beat. Comping pushes
 * the change (an eighth before the bar, or a few ticks), and the engine
 * already voiced such a hit as the chord it anticipates.
 */
const ANTICIPATION_TICKS = 480;

/**
 * A hit this close before a change is the next chord struck a hair early
 * (the engine's humanized timing), whatever its notes: a B triad is three
 * tones of A♭m7 as much as of Bmaj7.
 */
const NUDGE_TICKS = 60;

/** The chord sounding at a tick of the loop, as its tones. */
export type ChordAt = (tick: number) => ChordSymbolTones | null;

/** The chords a built part plays over: the lane's own, by tick. */
export function chordsOf(
  built: Pick<GenrePracticeTrackResult, 'chordCycle' | 'timeSignature'>,
  timed?: TimedChords,
): ChordAt {
  const bar = barTicks(built.timeSignature);
  if (timed) {
    const timeline = timedChordTimeline(timed, 64, bar);
    if (timeline.length) {
      return (tick) =>
        [...timeline].reverse().find((c) => c.tick <= tick) ?? timeline[0];
    }
  }
  const tones = built.chordCycle.map((symbol) => chordSymbolTones(symbol));
  return (tick) => tones[Math.floor(tick / bar) % tones.length] ?? null;
}

/** A clip's notes in hits: the notes struck together, in time order. */
function hitsOf(events: readonly MidiNoteEvent[]): MidiNoteEvent[][] {
  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);
  const hits: MidiNoteEvent[][] = [];
  for (const event of sorted) {
    const last = hits[hits.length - 1];
    if (last && event.startTick - last[0].startTick <= STRUM_TICKS)
      last.push(event);
    else hits.push([event]);
  }
  return hits;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** How many of a hit's pitch classes are tones of `chord`. */
function shared(hit: readonly MidiNoteEvent[], chord: ChordSymbolTones) {
  const tones = new Set(chord.intervals.map((i) => mod12(chord.rootPc + i)));
  return hit.filter((e) => tones.has(mod12(e.note))).length;
}

/**
 * The chord a hit plays: the one sounding at it, or the next one when the
 * hit anticipates it (its notes are that chord's more than this one's), as
 * the engine wrote it.
 */
function chordOfHit(
  hit: readonly MidiNoteEvent[],
  chordAt: ChordAt,
  offset: number,
): ChordSymbolTones | null {
  const tick = hit[0].startTick + offset;
  const now = chordAt(tick);
  const nudged = chordAt(tick + NUDGE_TICKS);
  if (nudged !== now) return nudged;
  const next = chordAt(tick + ANTICIPATION_TICKS);
  if (!now || !next || next === now) return now ?? next;
  return shared(hit, next) > shared(hit, now) ? next : now;
}

/**
 * The chord tones a hit can't be without: its 3rd (a sus chord has none)
 * and its 7th. A rootless voicing (3rd and 7th over the bass's root) has
 * them; a triad over a 7th chord doesn't.
 */
function soundsChord(hit: readonly MidiNoteEvent[], chord: ChordSymbolTones) {
  const pcs = new Set(hit.map((e) => mod12(e.note)));
  const needs = [chord.third, chord.seventh].filter(
    (i): i is number => i !== undefined,
  );
  return needs.every((i) => pcs.has(mod12(chord.rootPc + i)));
}

/** A single note moved into the voicing's octave, nearest the last chord. */
function placeNote(note: number, ceiling: number, previous: number[] | null) {
  const centre = previous?.length
    ? previous.reduce((a, b) => a + b, 0) / previous.length
    : ceiling - 6;
  let placed = mod12(note) + 12 * Math.floor(centre / 12);
  while (placed - centre > 6) placed -= 12;
  while (centre - placed > 6) placed += 12;
  while (placed > ceiling) placed -= 12;
  return placed;
}

/**
 * A chords part voiced from its symbols: each hit's pitches are the chord's
 * own tones, voice-led from the hit before, the hit's timing, length and
 * velocity kept. Notes struck alone keep their pitch class, in the chords'
 * octave.
 */
export function voiceChordHits(
  events: readonly MidiNoteEvent[],
  chordAt: ChordAt,
  offset = 0,
  ceiling = DEFAULT_CEILING,
): MidiNoteEvent[] {
  const out: MidiNoteEvent[] = [];
  let previous: number[] | null = null;
  for (const hit of hitsOf(events)) {
    const chord = chordOfHit(hit, chordAt, offset);
    if (hit.length < 2 || !chord) {
      for (const e of hit)
        out.push({ ...e, note: placeNote(e.note, ceiling, previous) });
      continue;
    }
    const voicing = voiceChord(chord, ceiling, previous);
    if (!voicing.length) {
      out.push(...hit);
      continue;
    }
    previous = voicing;
    const duration = Math.max(...hit.map((e) => e.durationTicks));
    const velocity = Math.round(
      hit.reduce((sum, e) => sum + e.velocity, 0) / hit.length,
    );
    voicing.forEach((note, i) =>
      out.push({
        note,
        // A strum stays a strum: each voice starts where the hit's did.
        startTick: hit[Math.min(i, hit.length - 1)].startTick,
        durationTicks: duration,
        velocity,
        channel: hit[0].channel,
      }),
    );
  }
  return out;
}

/** True when a part's hits all sound their chords' 3rds and 7ths. */
export function partSoundsChords(
  events: readonly MidiNoteEvent[],
  chordAt: ChordAt,
): boolean {
  return hitsOf(events).every((hit) => {
    const chord = chordOfHit(hit, chordAt, 0);
    return hit.length < 2 || !chord || soundsChord(hit, chord);
  });
}

/** A chords clip voiced from its symbols (voiceChordHits). */
const voiced = (clip: MidiClip, chordAt: ChordAt): MidiClip => ({
  ...clip,
  events: voiceChordHits(clip.events, chordAt),
});

/**
 * A built track's chord parts, voiced for the Studio: the engine's own
 * chords always (its patterns are a student's), a band layer's only where
 * it leaves out a chord's 3rd or 7th. Everything else is returned as is.
 */
export function voicePromptChords(
  built: GenrePracticeTrackResult,
  timed?: TimedChords,
): Pick<GenrePracticeTrackResult, 'clips' | 'layerClips'> {
  const chordAt = chordsOf(built, timed);
  const own = built.clips.chords;
  return {
    clips: {
      ...built.clips,
      ...(own?.events.length ? { chords: voiced(own, chordAt) } : {}),
    },
    layerClips: built.layerClips.map((layer) =>
      layer.part === 'chords' && !partSoundsChords(layer.clip.events, chordAt)
        ? { ...layer, clip: voiced(layer.clip, chordAt) }
        : layer,
    ),
  };
}
