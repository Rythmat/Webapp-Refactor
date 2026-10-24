// @vitest-environment jsdom
/**
 * A prompt's drums from the Grooves library (owner, 2026-10-23): a groove
 * of the style, nearest the tempo, or one the prompt names; repeated to fill
 * the spot; and on a blank project the tempo set within the groove's range.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { echoRandom } from '@/curriculum/engine/echo/random';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { buildPromptPart, type PartContext } from '../buildPromptPart';
import { buildPromptSong } from '../buildPromptSong';
import {
  drumsFor,
  grooveFor,
  grooveNamedIn,
  grooveTempoRange,
  tempoInGroove,
  tileGroove,
} from '../promptGroove';

beforeAll(() => pairingsReady);

const BAR = 1920;
/** A one-bar groove: four kicks. */
const ONE_BAR = [0, 480, 960, 1440].map((startTick) => ({
  note: 36,
  velocity: 100,
  startTick,
  durationTicks: 120,
  channel: 9,
}));
const loadGroove = async () => ONE_BAR;

describe('grooveFor', () => {
  it('picks a groove of the style, near the tempo', () => {
    const trap = grooveFor('a trap beat', 'hip-hop', 'trap', 60, echoRandom(1));
    expect(trap?.genre).toBe('Trap');
    const rock = grooveFor('a rock song', 'rock', null, 120, echoRandom(1));
    expect(rock?.genre).toBe('Rock');
    expect(rock?.bpm).toBe(120);
    const bossa = grooveFor('bossa nova', 'latin', 'bossa', 90, echoRandom(1));
    expect(bossa?.name).toBe('Bossa 1');
  });

  it('takes a groove the prompt names, and none for a style the library lacks', () => {
    expect(grooveNamedIn('use the Rock 10 groove')?.name).toBe('Rock 10');
    expect(
      grooveFor('drums like Hip Hop 2', 'rock', null, 120, echoRandom(1))?.name,
    ).toBe('Hip Hop 2');
    expect(
      grooveFor('a jazz swing', 'jazz', null, 120, echoRandom(1)),
    ).toBeNull();
  });

  it('every style with grooves finds one', () => {
    for (const genre of [
      'Hip Hop',
      'Trap',
      'R&B',
      'Neo Soul',
      'Rock',
      'Indie',
      'Punk',
      'Funk',
      'Latin',
    ]) {
      expect(
        GROOVES.some((g) => g.genre === genre),
        genre,
      ).toBe(true);
    }
  });
});

describe('drumsFor: the band’s drums or a library groove', () => {
  it('picks among the band’s own drums and the style’s grooves, by the seed', () => {
    const picks = new Set(
      Array.from(
        { length: 24 },
        (_, seed) =>
          drumsFor('a funk beat', 'funk', null, 110, echoRandom(seed))?.genre ??
          'band',
      ),
    );
    expect(picks).toEqual(new Set(['band', 'Funk']));
  });

  it('plays a groove the prompt names, and the band’s where the library has none', () => {
    for (const seed of [1, 2, 3]) {
      expect(
        drumsFor('use Rock 7', 'funk', null, 110, echoRandom(seed))?.name,
      ).toBe('Rock 7');
      expect(
        drumsFor('a jazz swing', 'jazz', null, 140, echoRandom(seed)),
      ).toBeNull();
    }
  });
});

describe('the groove’s tempo', () => {
  it('is its own, ten percent either way', () => {
    expect(grooveTempoRange({ bpm: 90 })).toEqual([81, 99]);
    expect(tempoInGroove({ bpm: 90 }, 120)).toBe(99);
    expect(tempoInGroove({ bpm: 90 }, 70)).toBe(81);
    expect(tempoInGroove({ bpm: 90 }, 92)).toBe(92);
  });
});

describe('tileGroove', () => {
  it('repeats a groove’s bars to fill the spot, the last pass cut', () => {
    const tiled = tileGroove(ONE_BAR, 2.5 * BAR, BAR);
    expect(tiled.map((e) => e.startTick)).toEqual([
      0, 480, 960, 1440, 1920, 2400, 2880, 3360, 3840, 4320,
    ]);
    expect(tiled.every((e) => !('id' in e))).toBe(true);
  });
});

describe('a prompt’s drums are a groove', () => {
  const context = (over: Partial<PartContext> = {}): PartContext => ({
    startTick: 0,
    lengthTicks: 4 * BAR,
    trackPart: null,
    tonicPc: 0,
    mode: 'ionian',
    bpm: 120,
    timeSignature: [4, 4],
    chords: [],
    projectGenre: 'Pop',
    ...over,
  });

  it('plays the groove over the spot, in place of the band’s drums', async () => {
    const result = await buildPromptPart(
      'add a funk beat like Funk 2',
      context(),
      {
        seed: 1,
        loadGroove,
      },
    );
    const drums = result.parts.filter((p) => p.part === 'drums');
    expect(drums).toHaveLength(1);
    expect(drums[0].clip.name).toBe('Funk 2');
    expect(drums[0].clip.events).toHaveLength(16);
    expect(result.reading.groove).toBe(drums[0].clip.name);
    // A song with a tempo keeps it.
    expect(result.newBpm).toBeNull();
  });

  it('sets a blank project’s tempo within its groove’s range', async () => {
    const result = await buildPromptPart(
      'add a hip hop beat with Hip Hop 3',
      context({ blank: true }),
      {
        seed: 2,
        loadGroove,
      },
    );
    const groove = GROOVES.find((g) => g.name === result.reading.groove)!;
    const [low, high] = grooveTempoRange(groove);
    expect(result.newBpm).toBeGreaterThanOrEqual(low);
    expect(result.newBpm).toBeLessThanOrEqual(high);
    // A tempo the prompt names wins.
    const named = await buildPromptPart(
      'a Hip Hop 3 beat at 92 bpm',
      context({ blank: true }),
      {
        seed: 2,
        loadGroove,
      },
    );
    expect(named.newBpm).toBe(92);
  });

  it('starts a Home song at a tempo its groove was written for', async () => {
    const song = await buildPromptSong('a dark trap beat on Trap 1', {
      seed: 3,
      loadGroove,
    });
    const groove = GROOVES.find((g) => g.name === song!.reading.groove)!;
    const [low, high] = grooveTempoRange(groove);
    expect(song!.reading.bpm).toBeGreaterThanOrEqual(low);
    expect(song!.reading.bpm).toBeLessThanOrEqual(high);
    expect(song!.track.clips.drums?.name).toBe(groove.name);
    expect(song!.track.layerClips.some((l) => l.part === 'drums')).toBe(false);
  });
});

describe('the band’s drums stay a choice', () => {
  it('plays the band’s drums on some seeds, with no groove named', async () => {
    const context: PartContext = {
      startTick: 0,
      lengthTicks: 4 * BAR,
      trackPart: null,
      tonicPc: 0,
      mode: 'ionian',
      bpm: 110,
      timeSignature: [4, 4],
      chords: [],
      projectGenre: 'Pop',
    };
    const grooves = new Set<string | null>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = await buildPromptPart('add a funk beat', context, {
        seed,
        loadGroove,
      });
      grooves.add(r.reading.groove);
      expect(r.parts.filter((p) => p.part === 'drums').length).toBeGreaterThan(
        0,
      );
    }
    expect(grooves.has(null)).toBe(true);
    expect([...grooves].some((g) => g !== null)).toBe(true);
  });
});
