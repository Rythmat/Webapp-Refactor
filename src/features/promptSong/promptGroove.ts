import type { MidiNoteEvent } from '@prism/engine';
import { pickOne, type EchoRandom } from '@/curriculum/engine/echo/random';
import { GROOVES, type GrooveItem } from '@/daw/data/groovesLibrary';
import type { PromptFlavor, PromptGenre } from './parseMusicPrompt';

// ── The drums a prompt's part plays (owner, 2026-10-23) ────────────────────
//
// "Move the Drum Groove into the prompt generation", in addition to the
// console's Bands: a prompt's drums are its band's own, or a groove of the
// style from the Grooves library (daw/data/groovesLibrary.ts, the grooves
// the drum dock's menu used to list) near the song's tempo, a seeded pick
// among them, repeated to fill the spot. A groove the prompt names ("use
// Hip Hop 2") wins. A style the library has no groove for (jazz, house,
// reggae…) plays its band's drums.

/** The library's genres for each style, the first that has grooves wins. */
function grooveGenres(
  genre: PromptGenre,
  flavor: PromptFlavor | null,
): string[] {
  if (flavor === 'trap') return ['Trap'];
  if (flavor === 'punk') return ['Punk'];
  if (flavor === 'indie') return ['Indie'];
  if (flavor === 'ballad' && genre === 'pop') return ['R&B'];
  switch (genre) {
    case 'hip-hop':
      return ['Hip Hop'];
    case 'rnb':
      return ['R&B', 'Neo Soul'];
    case 'neo-soul':
      return ['Neo Soul', 'R&B'];
    case 'latin':
      return ['Latin'];
    case 'rock':
      return ['Rock'];
    case 'funk':
    case 'jam-band':
      return ['Funk'];
    case 'pop':
      return ['Indie', 'Rock'];
    case 'folk':
      return ['Rock'];
    default:
      return [];
  }
}

/** A groove the text names by its name ("Hip Hop 2", "train 1"). */
export function grooveNamedIn(text: string): GrooveItem | null {
  const t = text.toLowerCase();
  // Longest first: "Rock 10" before "Rock 1".
  return (
    [...GROOVES]
      .sort((a, b) => b.name.length - a.name.length)
      .find((g) =>
        new RegExp(`\\b${g.name.toLowerCase().replace(/[&]/g, '\\&')}\\b`).test(
          t,
        ),
      ) ?? null
  );
}

/** The library's grooves of a style, nearest the tempo first, two at most. */
function libraryNear(
  genre: PromptGenre,
  flavor: PromptFlavor | null,
  bpm: number,
): GrooveItem[] {
  for (const libraryGenre of grooveGenres(genre, flavor)) {
    let pool = GROOVES.filter((g) => g.genre === libraryGenre);
    // Bossa nova: the Bossa groove, of the Latin ones.
    if (flavor === 'bossa') {
      const bossa = pool.filter((g) => /bossa/i.test(g.name));
      if (bossa.length) pool = bossa;
    }
    if (pool.length) {
      return [...pool]
        .sort((a, b) => Math.abs(a.bpm - bpm) - Math.abs(b.bpm - bpm))
        .slice(0, 2);
    }
  }
  return [];
}

/**
 * The library groove for a prompt: one it names, else one of its style, the
 * nearest the song's tempo (a seeded pick between the closest two); null
 * when the library has none for the style.
 */
export function grooveFor(
  text: string,
  genre: PromptGenre,
  flavor: PromptFlavor | null,
  bpm: number,
  rng: EchoRandom,
): GrooveItem | null {
  const named = grooveNamedIn(text);
  if (named) return named;
  const near = libraryNear(genre, flavor, bpm);
  return near.length ? pickOne(rng, near) : null;
}

/**
 * The drums a prompt plays: a groove it names; else a seeded pick among
 * its band's own drums (null) and the library's grooves of its style
 * nearest the tempo (grooveFor's two closest).
 */
export function drumsFor(
  text: string,
  genre: PromptGenre,
  flavor: PromptFlavor | null,
  bpm: number,
  rng: EchoRandom,
): GrooveItem | null {
  const named = grooveNamedIn(text);
  if (named) return named;
  const library = libraryNear(genre, flavor, bpm);
  return pickOne<GrooveItem | null>(rng, [null, ...library]);
}

/**
 * A groove's notes repeated to fill `length` ticks: its pattern is the whole
 * bars its notes reach, laid end to end, the last pass cut at `length`.
 */
export function tileGroove(
  events: readonly MidiNoteEvent[],
  length: number,
  barTicks: number,
): MidiNoteEvent[] {
  if (!events.length) return [];
  const reach = Math.max(...events.map((e) => e.startTick + 1));
  const pattern = Math.max(barTicks, Math.ceil(reach / barTicks) * barTicks);
  const out: MidiNoteEvent[] = [];
  for (let at = 0; at < length; at += pattern) {
    for (const e of events) {
      const startTick = at + e.startTick;
      if (startTick >= length) continue;
      // A copy of each pass: new notes, no ids of the groove's own.
      out.push({
        note: e.note,
        velocity: e.velocity,
        startTick,
        durationTicks: Math.min(e.durationTicks, length - startTick),
        channel: e.channel,
      });
    }
  }
  return out;
}

/** Loads a groove's notes (loadGrooveEvents); swappable for tests. */
export type GrooveLoader = (id: string) => Promise<MidiNoteEvent[] | null>;

export const loadGroove: GrooveLoader = async (id) => {
  const { loadGrooveEvents } = await import('@/daw/midi/loadGrooveEvents');
  return loadGrooveEvents(id);
};

/**
 * The tempos a groove plays well at: its own (the library's `bpm`, the
 * tempo it was written at), ten percent either way.
 */
export function grooveTempoRange(
  groove: Pick<GrooveItem, 'bpm'>,
): [number, number] {
  return [Math.round(groove.bpm * 0.9), Math.round(groove.bpm * 1.1)];
}

/** The tempo nearest `wanted` a groove plays well at (grooveTempoRange). */
export function tempoInGroove(
  groove: Pick<GrooveItem, 'bpm'>,
  wanted: number,
): number {
  const [low, high] = grooveTempoRange(groove);
  return Math.min(high, Math.max(low, Math.round(wanted)));
}
