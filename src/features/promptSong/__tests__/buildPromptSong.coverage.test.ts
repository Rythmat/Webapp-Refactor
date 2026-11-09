// @vitest-environment jsdom
/**
 * Every genre a prompt can name builds a song (owner, 2026-10-23): the
 * console's band where the genre has a live one, else a band put together
 * from its grooves and bass lines, over a progression the library tags for
 * the prompt, in 4/4, with drums, bass and chords. The same text and seed
 * give the same notes.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { buildPromptSong, type PromptSong } from '../buildPromptSong';
import type { PromptGenre } from '../parseMusicPrompt';

beforeAll(() => pairingsReady);

const GENRES: PromptGenre[] = [
  'pop',
  'rock',
  'hip-hop',
  'rnb',
  'jazz',
  'blues',
  'folk',
  'funk',
  'neo-soul',
  'electronic',
  'latin',
  'reggae',
  'jam-band',
  'african',
];
const LEVEL_WORD = { 1: 'easy', 2: 'intermediate', 3: 'advanced' } as const;
const PROMPT_WORD: Record<PromptGenre, string> = {
  pop: 'pop',
  rock: 'rock',
  'hip-hop': 'hip hop',
  rnb: 'r&b',
  jazz: 'jazz',
  blues: 'blues',
  folk: 'folk',
  funk: 'funk',
  'neo-soul': 'neo soul',
  electronic: 'electronic',
  latin: 'latin',
  reggae: 'reggae',
  'jam-band': 'jam band',
  african: 'african',
};

/** What a part plays, ids aside. */
const notesOf = (song: PromptSong) =>
  [
    ...Object.values(song.track.clips),
    ...song.track.layerClips.map((l) => l.clip),
  ].map((clip) =>
    clip!.events.map(({ note, velocity, startTick, durationTicks }) => [
      note,
      velocity,
      startTick,
      durationTicks,
    ]),
  );

/** Whether the song has a part: in a clip of its own or a band layer's. */
const plays = (song: PromptSong, part: 'drums' | 'bass' | 'chords') =>
  !!song.track.clips[part]?.events.length ||
  song.track.layerClips.some((l) => l.part === part && l.clip.events.length);

describe('a song for every genre and level', () => {
  for (const genre of GENRES) {
    for (const level of [1, 2, 3] as const) {
      it(`${genre} L${level}`, async () => {
        const song = await buildPromptSong(
          `an ${LEVEL_WORD[level]} ${PROMPT_WORD[genre]} song`,
          { seed: 1 },
        );
        expect(song, `${genre} L${level}`).not.toBeNull();
        expect(song!.genre).toBe(genre);
        expect(song!.track.timeSignature).toEqual([4, 4]);
        expect(song!.track.chordRegions).toHaveLength(16);
        expect(plays(song!, 'drums')).toBe(true);
        expect(plays(song!, 'bass')).toBe(true);
        expect(plays(song!, 'chords')).toBe(true);
      });
    }
  }
});

describe('the seed', () => {
  it('gives the same song for the same text and seed', async () => {
    const a = await buildPromptSong('a dark trap beat', { seed: 42 });
    const b = await buildPromptSong('a dark trap beat', { seed: 42 });
    expect(a!.reading).toEqual(b!.reading);
    expect(notesOf(a!)).toEqual(notesOf(b!));
  });

  it('puts Math.random back after the build', async () => {
    const real = Math.random;
    await buildPromptSong('a happy pop song', { seed: 3 });
    expect(Math.random).toBe(real);
  });
});
