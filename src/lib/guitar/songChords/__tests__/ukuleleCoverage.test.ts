/**
 * Every song in the library, in all 12 keys, on ukulele: every readable
 * chord gets a box a hand can hold, sounding the chord's required tones and
 * nothing outside the chord; major and minor chords are The Ukulele Atlas's
 * own boxes.
 */

import { describe, expect, it } from 'vitest';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import { ukuleleHandProblems } from '@/curriculum/data/ukulele/positions';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import { shapeNotes } from '@/lib/guitar/fretboard';
import { UKULELE } from '@/lib/guitar/instrument';
import { SONG_QUALITIES, parseSongChord, songChordPcs } from '..';
import { resolveUkuleleSongChords, ukuleleSongChord } from '../ukulele';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const SONGS = Object.values(BUNDLED_SONGS) as Song[];

function chordNames(song: Song): string[] {
  return song.sections.flatMap((section) =>
    section.bars.flatMap((bar) => (bar.chords ?? []).map((c) => c.chordName)),
  );
}

describe('every song chord on ukulele', () => {
  it('gives every readable chord a playable box in all 12 keys', () => {
    const problems: string[] = [];
    for (const song of SONGS) {
      for (let t = 0; t < 12; t++) {
        const names = chordNames(transposeSong(song, t));
        for (const [name, box] of resolveUkuleleSongChords(names)) {
          const chord = parseSongChord(name);
          if (chord === null || chord === 'noChord') continue;
          if (!box) {
            problems.push(`${song.id} +${t}: no box for ${name}`);
            continue;
          }
          const pcs = new Set(
            shapeNotes(box.shape.frets, UKULELE).map((n) => mod12(n.midi)),
          );
          const allowed = new Set(songChordPcs(chord.quality, chord.rootPc));
          if ([...pcs].some((pc) => !allowed.has(pc))) {
            problems.push(
              `${song.id} +${t}: ${name} extra in ${box.shape.frets}`,
            );
          }
          const required = SONG_QUALITIES[chord.quality].required.map((s) =>
            mod12(chord.rootPc + s),
          );
          // Every required tone; only a rootless voicing leaves the root out.
          const missing = required.filter((pc) => !pcs.has(pc));
          if (missing.some((pc) => pc !== mod12(chord.rootPc))) {
            problems.push(
              `${song.id} +${t}: ${name} misses in ${box.shape.frets}`,
            );
          }
          if (
            ukuleleHandProblems(box.shape, { allowMuted: [4, 1] }).length > 0
          ) {
            problems.push(`${song.id} +${t}: ${name} hand ${box.shape.frets}`);
          }
        }
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it('uses the book’s boxes and chart grips', () => {
    expect(ukuleleSongChord('C')?.shape.frets).toBe('0-0-0-3');
    expect(ukuleleSongChord('Am')?.shape.frets).toBe('2-0-0-0');
    expect(ukuleleSongChord('F')?.shape.frets).toBe('2-0-1-0');
    expect(ukuleleSongChord('G7')?.shape.frets).toBe('0-2-1-2');
    expect(ukuleleSongChord('Bb')?.shape.frets).toBe('3-2-1-1');
    // A slash chord plays its chord and names the bass.
    const slash = ukuleleSongChord('D/F♯');
    expect(slash?.shape.frets).toBe('2-2-2-5');
    expect(slash?.bassNote).toBe('F♯');
    expect(resolveUkuleleSongChords(['N.C.', 'C']).size).toBe(1);
    // A power chord that four strings can't hold mutes the G string, or
    // both outer strings.
    expect(ukuleleSongChord('B♭5')?.shape.frets).toMatch(/^X-/);
    expect(ukuleleSongChord('E♭5')?.shape.frets).toBe('X-3-6-X');
  });
});
