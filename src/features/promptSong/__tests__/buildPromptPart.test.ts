// @vitest-environment jsdom
/**
 * A part for a spot (owner, 2026-10-23): the parts the prompt names (else
 * the track's, else the band), in the project's key and tempo, over the
 * lane's chords there — or new chords when chords or a section are asked
 * for, apart from the song's other progressions, a bridge leaving home.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import {
  buildPromptPart,
  partsOf,
  PromptPartRefusal,
  sectionOf,
  type PartContext,
} from '../buildPromptPart';

beforeAll(() => pairingsReady);

const BAR = 1920;
const context = (over: Partial<PartContext> = {}): PartContext => ({
  startTick: 8 * BAR,
  lengthTicks: 4 * BAR,
  trackPart: null,
  tonicPc: 2,
  mode: 'dorian',
  bpm: 96,
  timeSignature: [4, 4],
  chords: [],
  projectGenre: 'Pop',
  ...over,
});
const lane = [
  { tick: 0, symbol: 'Dm7' },
  { tick: BAR, symbol: 'G7' },
  { tick: 2 * BAR, symbol: 'Dm7' },
  { tick: 3 * BAR, symbol: 'G7' },
];

describe('partsOf and sectionOf', () => {
  it.each([
    ['add a bass line', ['bass']],
    ['a funk beat here', ['drums']],
    ['chords for these bars', ['chords']],
    ['a groove', ['drums', 'bass']],
    ['the whole band', ['drums', 'bass', 'chords']],
    ['make it sad', null],
  ])('“%s” → %j', (text, parts) => {
    expect(partsOf(text)).toEqual(parts);
  });

  it('reads the section a prompt names', () => {
    expect(sectionOf('write a bridge')).toBe('bridge');
    expect(sectionOf('chords for the pre-chorus')).toBe('pre-chorus');
    expect(sectionOf('add a bass line')).toBeNull();
  });
});

describe('buildPromptPart', () => {
  it('writes the part asked for, in the spot’s length, over the lane’s chords', async () => {
    const result = await buildPromptPart(
      'add a funk bass line',
      context({ chords: lane }),
      { seed: 1 },
    );
    expect(result.reading.parts).toEqual(['bass']);
    expect(result.parts.every((p) => p.part === 'bass')).toBe(true);
    expect(result.parts[0].clip.durationTicks).toBe(4 * BAR);
    expect(
      result.parts[0].clip.events.every((e) => e.startTick < 4 * BAR),
    ).toBe(true);
    // It followed the lane: no chords of its own, and the project's key.
    expect(result.chordRegions).toBeNull();
    expect(result.newKey).toBeNull();
    expect(result.reading.chords).toEqual(['Dm7', 'G7', 'Dm7', 'G7']);
  });

  it('plays the selected track’s part when the prompt names none', async () => {
    const result = await buildPromptPart(
      'make it groove harder',
      context({ trackPart: 'drums', chords: lane }),
      { seed: 2 },
    );
    // "groove" names drums and bass.
    expect(result.reading.parts).toEqual(['drums', 'bass']);
    const plain = await buildPromptPart(
      'funky',
      context({ trackPart: 'drums', chords: lane }),
      { seed: 2 },
    );
    expect(plain.reading.parts).toEqual(['drums']);
  });

  it('writes a highlighted track’s part, even for a section named', async () => {
    const drums = await buildPromptPart(
      'something for the chorus',
      context({ trackPart: 'drums', trackHighlighted: true, chords: lane }),
      { seed: 2 },
    );
    expect(drums.reading.parts).toEqual(['drums']);
    expect(drums.section).toBeNull();
    const bass = await buildPromptPart(
      'a busier one for the bridge',
      context({ trackPart: 'bass', trackHighlighted: true, chords: lane }),
      { seed: 2 },
    );
    expect(bass.reading.parts).toEqual(['bass']);
    // Not highlighted, a section named is its chords.
    const chords = await buildPromptPart(
      'something for the chorus',
      context({ trackPart: 'drums', chords: lane }),
      { seed: 2 },
    );
    expect(chords.reading.parts).toEqual(['chords']);
  });

  it('writes new chords when chords are asked for, apart from the song’s others', async () => {
    const result = await buildPromptPart(
      'write new chords here',
      context({
        chords: lane,
        otherProgressions: [
          ['Dm7', 'G7'],
          ['Am', 'F', 'C', 'G'],
        ],
      }),
      { seed: 3 },
    );
    expect(result.chordRegions).toHaveLength(4);
    const chords = result.reading.chords;
    expect(chords.every((c) => chordSymbolTones(c))).toBe(true);
    expect(chords.join(' ')).not.toBe('Dm7 G7 Dm7 G7');
  });

  it('writes a bridge’s chords, off the tonic, and names the section to mark', async () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = await buildPromptPart(
        'write a bridge',
        context({
          otherProgressions: [['Dm7', 'G7', 'Dm7', 'G7']],
        }),
        { seed },
      );
      expect(result.reading.parts).toEqual(['chords']);
      expect(result.section).toBe('bridge');
      // It leaves home: the first chord isn't D (the tonic).
      expect(chordSymbolTones(result.reading.chords[0])!.rootPc).not.toBe(2);
    }
  });

  it('keeps to the session’s style when the prompt names none', async () => {
    const result = await buildPromptPart(
      'Write chords for a new chorus that lifts',
      context({
        sessionText: 'Make a soulful R&B ballad',
        projectGenre: 'Pop',
      }),
      { seed: 6 },
    );
    expect(result.reading.styleName).toBe('R&B Ballad');
    expect(result.section).toBe('chorus');
    const own = await buildPromptPart(
      'a funk bass line',
      context({ sessionText: 'Make a soulful R&B ballad' }),
      { seed: 6 },
    );
    expect(own.reading.styleName).toBe('Funk');
  });

  it('follows the chord ruler and key center where the prompt names no key', async () => {
    const result = await buildPromptPart(
      'a bass line',
      context({ chords: lane }),
      { seed: 7 },
    );
    expect(result.reading.chords).toEqual(['Dm7', 'G7', 'Dm7', 'G7']);
    expect(result.newKey).toBeNull();
    const chords = await buildPromptPart(
      'new chords',
      context({ tonicPc: 2, mode: 'dorian' }),
      { seed: 7 },
    );
    expect(chords.reading.keyName).toBe('D Dorian');
    expect(chords.reading.chords[0]).toMatch(/^Dm/);
  });

  it('writes in a key the prompt names, new chords over the ruler’s, and the session takes it', async () => {
    const result = await buildPromptPart(
      'a bass line in F# minor',
      context({ chords: lane }),
      { seed: 7 },
    );
    expect(result.newKey).toEqual({ tonicPc: 6, mode: 'aeolian' });
    expect(result.reading.keyName).toBe('F# minor');
    expect(result.reading.chords[0]).toMatch(/^F#m/);
    expect(result.chordRegions?.length).toBeGreaterThan(0);
    // A tonic alone keeps the session's mode: D Dorian → G Dorian.
    const tonic = await buildPromptPart(
      'chords in G',
      context({ tonicPc: 2, mode: 'dorian' }),
      { seed: 7 },
    );
    expect(tonic.newKey).toEqual({ tonicPc: 7, mode: 'dorian' });
    // The session's own key named again changes nothing.
    const same = await buildPromptPart(
      'chords in D dorian',
      context({ tonicPc: 2, mode: 'dorian' }),
      { seed: 7 },
    );
    expect(same.newKey).toBeNull();
  });

  it('sets the session’s tempo to one the prompt names', async () => {
    const named = await buildPromptPart(
      'a bass line at 120 bpm',
      context({ bpm: 96 }),
      { seed: 3 },
    );
    expect(named.newBpm).toBe(120);
    const unnamed = await buildPromptPart('a bass line', context({ bpm: 96 }), {
      seed: 3,
    });
    expect(unnamed.newBpm).toBeNull();
  });

  it('sets a key for a song that has none', async () => {
    const result = await buildPromptPart(
      'chords in A minor',
      context({ tonicPc: null, mode: null }),
      { seed: 4 },
    );
    expect(result.newKey).toEqual({ tonicPc: 9, mode: 'aeolian' });
  });

  it('refuses a melody and a metre other than 4/4', async () => {
    await expect(
      buildPromptPart('write a melody', context(), { seed: 1 }),
    ).rejects.toBeInstanceOf(PromptPartRefusal);
    await expect(
      buildPromptPart('add a bass line', context({ timeSignature: [3, 4] }), {
        seed: 1,
      }),
    ).rejects.toMatchObject({ reason: 'meter' });
  });
});
