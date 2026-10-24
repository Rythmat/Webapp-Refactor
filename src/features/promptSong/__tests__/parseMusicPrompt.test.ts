/**
 * Reading a song prompt (owner, 2026-10-23): genre, flavor, moods, key,
 * mode, tempo, level and form, from the words students type. The moods are
 * the progression library's own vibe tags and synonyms, and the genre words
 * agree with the UNISON style parser's.
 */
import { describe, expect, it } from 'vitest';
import { VIBE_INFO, VIBE_TAGS } from '@/curriculum/engine/progressionRules';
import { parseStyle } from '@/unison/engine/styleParser';
import {
  GENRE_WORDS,
  looksLikeMusicPrompt,
  MOOD_WORDS,
  parseMusicPrompt,
  type MusicPrompt,
} from '../parseMusicPrompt';

type Expect = Partial<
  Pick<
    MusicPrompt,
    | 'genre'
    | 'flavor'
    | 'vibes'
    | 'tonicLabel'
    | 'mode'
    | 'bpm'
    | 'level'
    | 'form'
    | 'tempoWord'
    | 'timeSignature'
  >
>;

const CASES: [string, Expect][] = [
  [
    'Make a sad lo-fi beat in D Dorian at 80 BPM',
    {
      genre: 'hip-hop',
      flavor: 'lofi',
      vibes: ['melancholic', 'cool'],
      tonicLabel: 'D',
      mode: 'dorian',
      bpm: 80,
    },
  ],
  [
    'Start a funk groove at 100 BPM',
    { genre: 'funk', bpm: 100, tonicLabel: null },
  ],
  [
    'Write a sad chord progression in A minor',
    { genre: null, vibes: ['melancholic'], tonicLabel: 'A', mode: 'aeolian' },
  ],
  ['Write a 12-bar blues', { genre: 'blues', form: '12-bar' }],
  ['a twelve bar shuffle', { genre: 'blues', form: '12-bar' }],
  [
    'happy reggaeton in Bb',
    {
      genre: 'latin',
      flavor: 'reggaeton',
      vibes: ['happy'],
      tonicLabel: 'Bb',
      mode: null,
    },
  ],
  ['a jazz ballad', { genre: 'jazz', flavor: 'ballad' }],
  ['a ballad', { genre: 'pop', flavor: 'ballad' }],
  [
    'gospel ballad in Eb major',
    { genre: 'rnb', flavor: 'gospel', tonicLabel: 'Eb', mode: 'ionian' },
  ],
  [
    'trap in F#m 140bpm',
    {
      genre: 'hip-hop',
      flavor: 'trap',
      tonicLabel: 'F#',
      mode: 'aeolian',
      bpm: 140,
    },
  ],
  [
    'Dark drill beat in Gm at 142',
    {
      flavor: 'trap',
      vibes: ['dark'],
      tonicLabel: 'G',
      mode: 'aeolian',
      bpm: 142,
    },
  ],
  ['make a beat', { genre: null, tonicLabel: null, mode: null }],
  ['make a song in a minute', { tonicLabel: null, mode: null }],
  [
    'in Brazil make a samba',
    { genre: 'latin', flavor: 'bossa', tonicLabel: null },
  ],
  ['80s synthwave', { genre: 'electronic', bpm: null, vibes: ['dreamy'] }],
  ['a 3 min pop song', { genre: 'pop', mode: null }],
  [
    'make something chill in C Minor',
    { vibes: ['cool'], tonicLabel: 'C', mode: 'aeolian' },
  ],
  [
    'bossa nova in key of G',
    { genre: 'latin', flavor: 'bossa', tonicLabel: 'G' },
  ],
  [
    'an advanced jazz tune in B flat',
    { genre: 'jazz', level: 3, tonicLabel: 'Bb' },
  ],
  ['easy rock song in E', { genre: 'rock', level: 1, tonicLabel: 'E' }],
  ['a slow neo soul vamp', { genre: 'neo-soul', tempoWord: 'slow' }],
  ['upbeat afrobeat jam', { genre: 'african', tempoWord: 'fast' }],
  ['a waltz in 3/4', { timeSignature: [3, 4] }],
  ['edm drop', { genre: 'electronic', flavor: 'house' }],
  ['drum and bass track', { genre: 'electronic', flavor: 'dnb' }],
  ['pop punk anthem', { genre: 'rock', flavor: 'punk' }],
  ['r&b slow jam', { genre: 'rnb', tempoWord: 'slow' }],
  ['country song', { genre: 'folk' }],
  ['polka & yodel', { genre: null, vibes: [], tonicLabel: null, bpm: null }],
  ['asdf', { genre: null, vibes: [] }],
];

describe('parseMusicPrompt', () => {
  it.each(CASES)('reads “%s”', (text, expected) => {
    expect(parseMusicPrompt(text)).toMatchObject(expected);
  });

  it('reads nothing in noise', () => {
    expect(parseMusicPrompt('asdf qwerty').matched).toEqual([]);
  });

  it('knows every vibe the progression library tags, and its synonyms', () => {
    for (const tag of VIBE_TAGS) {
      expect(MOOD_WORDS[tag], tag).toBe(tag);
      for (const synonym of VIBE_INFO[tag].synonyms) {
        expect(MOOD_WORDS[synonym.toLowerCase()], synonym).toBe(tag);
      }
    }
  });

  it('reads the UNISON style parser’s genre words as it does', () => {
    const slug = (g: string) =>
      g.toLowerCase().replace('r&b', 'rnb').replace(/ /g, '-');
    for (const word of [
      'pop',
      'rock',
      'jazz',
      'funk',
      'blues',
      'reggae',
      'folk',
      'latin',
      'electronic',
      'african',
      'hip hop',
      'neo soul',
      'jam band',
      'r&b',
      'rnb',
      'salsa',
      'bossa nova',
    ]) {
      const unison = parseStyle(word)?.primaryGenre;
      expect(GENRE_WORDS[word]?.genre, word).toBe(slug(unison!));
    }
  });
});

describe('looksLikeMusicPrompt', () => {
  it.each([
    'Make a sad lo-fi beat in D Dorian at 80 BPM',
    'Write a 12-bar blues',
    'make a beat',
    'funk in E at 100 bpm',
    'a chill pop song',
    'Lay down a neo-soul groove',
  ])('asks for music: “%s”', (text) => {
    expect(looksLikeMusicPrompt(text)).toBe(true);
  });

  it.each([
    'Teach me funk',
    'Where did reggae come from?',
    'Quiz me on major scales',
    'How do reggae rhythms work?',
    'Show me the timeline of jazz',
    'asdf',
  ])('is a question: “%s”', (text) => {
    expect(looksLikeMusicPrompt(text)).toBe(false);
  });
});
