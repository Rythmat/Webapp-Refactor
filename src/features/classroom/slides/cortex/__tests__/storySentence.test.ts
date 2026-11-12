import { describe, expect, it } from 'vitest';
import { STORY_MAX_WORDS, storySentence } from '../showcase';

const DOUALA =
  'Cameroonian saxophonist Manu Dibango records "Soul Makossa" as a B-side for a World Cup anthem. The track\'s infectious bassline crosses the Atlantic, becomes a disco hit in New York, and is later sampled by Michael Jackson on "Wanna Be Startin\' Somethin\'." It remains one of the most borrowed riffs in pop history.';

describe('a globe stop’s story', () => {
  it('tells what the place has to do with the subject', () => {
    expect(storySentence(DOUALA, 'Michael Jackson')).toBe(
      "The track's infectious bassline crosses the Atlantic, becomes a disco hit in New York, and is later sampled by Michael Jackson on \"Wanna Be Startin' Somethin'.\"",
    );
  });

  it('falls back to the first sentence, cut short at a word', () => {
    expect(storySentence('One. Two.', 'Nobody Here')).toBe('One.');
    const long = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ');
    const told = storySentence(`${long}.`, 'Nobody');
    expect(told.endsWith('…')).toBe(true);
    expect(told.split(/\s+/)).toHaveLength(STORY_MAX_WORDS);
  });
});
