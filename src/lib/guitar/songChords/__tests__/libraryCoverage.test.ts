/**
 * Every song in the library, in all 12 keys: every chord it writes gets a
 * playable guitar box (or is one of the two names the data garbles), the box
 * plays only the chord's notes with its bass (or root) lowest, and it passes
 * the gate it was chosen by.
 */

import { describe, expect, it } from 'vitest';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import { shapeNotes } from '@/lib/guitar/fretboard';
import { parseSongChord, resolveSongChords, songChordPcs } from '..';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const SONGS = Object.values(BUNDLED_SONGS) as Song[];

function chordNames(song: Song): string[] {
  return song.sections.flatMap((section) =>
    section.bars.flatMap((bar) => (bar.chords ?? []).map((c) => c.chordName)),
  );
}

describe('every song chord on guitar', () => {
  it('reads every name but the two the data garbles', () => {
    const unread = new Set<string>();
    for (const song of SONGS) {
      for (const name of chordNames(song)) {
        if (parseSongChord(name) === null) unread.add(name.trim());
      }
    }
    expect([...unread].sort()).toEqual(['AG♯min7', 'F♯C♯min7']);
  });

  it('gives every readable chord a playable box in all 12 keys', () => {
    const problems: string[] = [];
    const sources = new Map<string, number>();
    for (const song of SONGS) {
      for (let t = 0; t < 12; t++) {
        const names = chordNames(transposeSong(song, t));
        for (const [name, box] of resolveSongChords(names)) {
          const chord = parseSongChord(name);
          if (chord === null || chord === 'noChord') continue;
          if (!box) {
            problems.push(`${song.id} +${t}: no box for ${name}`);
            continue;
          }
          sources.set(box.source, (sources.get(box.source) ?? 0) + 1);
          const notes = shapeNotes(box.shape.frets);
          const lowest = mod12(Math.min(...notes.map((n) => n.midi)));
          const bass =
            box.bassNote === null && chord.bassPc !== null
              ? chord.bassPc
              : chord.rootPc;
          if (lowest !== bass) {
            problems.push(`${song.id} +${t}: ${name} bass ${box.shape.frets}`);
          }
          const allowed = new Set(songChordPcs(chord.quality, chord.rootPc));
          if (chord.bassPc !== null) allowed.add(chord.bassPc);
          if (notes.some((n) => !allowed.has(mod12(n.midi)))) {
            problems.push(`${song.id} +${t}: ${name} ${box.shape.frets}`);
          }
        }
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
    // Open shapes carry a good share of the library.
    expect(sources.get('open') ?? 0).toBeGreaterThan(
      (sources.get('movable') ?? 0) / 4,
    );
  }, 120_000);
});
