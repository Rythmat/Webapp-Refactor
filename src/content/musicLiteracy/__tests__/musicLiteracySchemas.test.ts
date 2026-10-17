import { describe, expect, it } from 'vitest';
import { listMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { musicLiteracyBodySchema, type MusicLiteracyLesson } from '../schemas';

/** The Music Literacy body schema against every lesson file in the repo. */

const files = import.meta.glob<MusicLiteracyLesson>(
  '../../../curriculum/data/musicLiteracy/*.json',
  { eager: true, import: 'default' },
);

const lesson = (): MusicLiteracyLesson =>
  structuredClone(listMusicLiteracy()[0]);

describe('the music_literacy schema', () => {
  it('holds every lesson file, named for its id', () => {
    expect(Object.keys(files).length).toBeGreaterThan(0);
    for (const [path, body] of Object.entries(files)) {
      const result = musicLiteracyBodySchema.safeParse(body);
      expect(result.success, `${path}: ${String(result.error)}`).toBe(true);
      expect(path.endsWith(`/${body.id}.json`)).toBe(true);
    }
  });

  it('refuses a step tag used twice', () => {
    const body = lesson();
    body.steps[1].tag = body.steps[0].tag;
    expect(musicLiteracyBodySchema.safeParse(body).success).toBe(false);
  });

  it('refuses a note that runs past its figure', () => {
    const body = lesson();
    body.steps[0].call.notes.push({ tick: 1920, duration: 480, degree: '1' });
    expect(musicLiteracyBodySchema.safeParse(body).success).toBe(false);
  });

  it('refuses a key it doesn’t know and a key it doesn’t have', () => {
    const body = lesson() as unknown as Record<string, unknown>;
    expect(
      musicLiteracyBodySchema.safeParse({
        ...body,
        key: { tonic: 'H', mode: 'major' },
      }).success,
    ).toBe(false);
    expect(
      musicLiteracyBodySchema.safeParse({ ...body, lyrics: [] }).success,
    ).toBe(false);
  });
});
