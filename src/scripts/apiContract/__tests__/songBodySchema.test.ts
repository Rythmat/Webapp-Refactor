import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { generateSongSchema } from '@/scripts/apiContract/generateSongSchema';
import { songBodySchema } from '@/scripts/apiContract/songBodySchema';

/**
 * The contract, kept honest two ways.
 *
 * One: the committed schema is regenerated from the type file and has to
 * match, so a field added to `ChordBar` fails here rather than silently
 * falling out of the API's copy.
 *
 * Two: every chart in the library is validated against it. A schema that
 * compiles and rejects the corpus would be exactly the bug this exists to
 * prevent — it is what the API had.
 */

const TYPES = 'src/curriculum/types/songLibrary.ts';
const OUT = 'src/scripts/apiContract/songBodySchema.ts';

const pretty = async (source: string) =>
  format(source, { ...(await resolveConfig(OUT)), parser: 'typescript' });

describe('the generated schema', () => {
  it('matches what the type file says today', async () => {
    const wanted = await pretty(
      generateSongSchema(readFileSync(TYPES, 'utf8')),
    );
    if (process.env.WRITE_SONG_SCHEMA) writeFileSync(OUT, wanted);
    expect(readFileSync(OUT, 'utf8')).toBe(wanted);
  });
});

// `_*.ts` are the importer's own files (`_generated_index.ts` is a list of
// imports to paste, not a chart), as in refPaths.test.ts.
const modules = import.meta.glob<Record<string, unknown>>(
  [
    '../../../curriculum/data/songs/*.ts',
    '!../../../curriculum/data/songs/_*.ts',
  ],
  { eager: true },
);
const songs: Song[] = Object.values(modules)
  .flatMap((m) => Object.values(m))
  .filter(
    (v): v is Song =>
      !!v && typeof v === 'object' && 'sections' in v && 'keyRoot' in v,
  );

describe('the corpus against the schema', () => {
  it('has a corpus to check', () => {
    expect(songs.length).toBeGreaterThan(600);
  });

  it('accepts every chart in the library', () => {
    const rejected = songs
      .map((song) => ({ song, result: songBodySchema.safeParse(song) }))
      .filter((r) => !r.result.success)
      .map(
        (r) =>
          `${r.song.id}: ${r.result.error?.issues
            .slice(0, 3)
            .map((i) => `${i.path.join('.')} ${i.message}`)
            .join('; ')}`,
      );
    expect(rejected).toEqual([]);
  });

  it('is strict, so a typo is a failure and not a silent field', () => {
    const [first] = songs;
    const typo = { ...first, tiemSignature: [4, 4] };
    expect(songBodySchema.safeParse(typo).success).toBe(false);
  });

  it('rejects the shapes the API was right to reject', () => {
    const [first] = songs;
    expect(songBodySchema.safeParse({ ...first, mode: 'lunar' }).success).toBe(
      false,
    );
    expect(
      songBodySchema.safeParse({ ...first, timeSignature: [4] }).success,
    ).toBe(false);
  });

  it('accepts the fields the API rejected on the first import', () => {
    // instrumental, a repeat barline, an ending, a coda, a cue, a key change,
    // and the per-bar metre that has no data yet.
    const song = {
      ...songs[0],
      sections: [
        {
          id: 's',
          label: 'Verse 1',
          instrumental: 'first-time' as const,
          repeatCount: 2,
          measuresPerRow: 3,
          notes: 'a note',
          bars: [
            {
              chords: [
                { degree: '1 maj', chordName: 'C', beat: 1, duration: 4 },
              ],
              repeatStart: true,
              repeatEnd: true,
              repeatTimes: 3,
              ending: [1, 2],
              segno: true,
              coda: true,
              toCoda: true,
              jump: 'D.S. al Coda' as const,
              fine: true,
              cue: 'Break',
              keyChange: 'A♭ major',
              timeSignature: [5, 4] as [number, number],
              systemBreak: true,
              systemRun: 4,
              fermata: true,
              restBars: 2,
            },
          ],
        },
      ],
    };
    const result = songBodySchema.safeParse(song);
    expect(
      result.success
        ? []
        : result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`),
    ).toEqual([]);
  });
});
