// ── A song's guitar boxes ──────────────────────────────────────────────────
// Every chord a song writes, in the order it first appears, with the guitar
// box chosen for it (lib/guitar/songChords). Kept per song object — a
// transposed song is a new object — and never at module scope, since the
// song library loads after the page does.

import type { Song } from '@/curriculum/types/songLibrary';
import {
  parseSongChord,
  resolveSongChords,
  type SongChordShape,
} from '@/lib/guitar/songChords';
import { resolveUkuleleSongChords } from '@/lib/guitar/songChords/ukulele';

/** The instruments the Songs page draws chord boxes for. */
export type SongBoxInstrument = 'guitar' | 'ukulele';

export interface SongGuitarChord {
  /** The chart's name, trimmed: 'F♯min7', 'D/F♯'. */
  name: string;
  /** Its degree where it first appears: '6 min7'. */
  degree: string;
  /** Null when no guitar box fits (an unreadable name). */
  box: SongChordShape | null;
}

const CACHES: Record<
  SongBoxInstrument,
  WeakMap<Song, readonly SongGuitarChord[]>
> = { guitar: new WeakMap(), ukulele: new WeakMap() };

/** The song's chords and their guitar (or ukulele) boxes, N.C. left out. */
export function songGuitarChords(
  song: Song,
  instrument: SongBoxInstrument = 'guitar',
): readonly SongGuitarChord[] {
  const CACHE = CACHES[instrument];
  const cached = CACHE.get(song);
  if (cached) return cached;
  const degrees = new Map<string, string>();
  for (const section of song.sections) {
    for (const bar of section.bars) {
      for (const hit of bar.chords ?? []) {
        const name = hit.chordName.trim();
        if (!degrees.has(name) && parseSongChord(name) !== 'noChord') {
          degrees.set(name, hit.degree);
        }
      }
    }
  }
  const boxes = (
    instrument === 'ukulele' ? resolveUkuleleSongChords : resolveSongChords
  )([...degrees.keys()]);
  const chords = [...degrees].map(([name, degree]) => ({
    name,
    degree,
    box: boxes.get(name) ?? null,
  }));
  CACHE.set(song, chords);
  return chords;
}

/** One chord's box, as the song's strip shows it. */
export function songGuitarBox(
  song: Song,
  chordName: string,
  instrument: SongBoxInstrument = 'guitar',
): SongChordShape | null {
  const name = chordName.trim();
  return (
    songGuitarChords(song, instrument).find((c) => c.name === name)?.box ?? null
  );
}
