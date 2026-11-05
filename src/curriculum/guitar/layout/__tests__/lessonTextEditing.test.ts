import { describe, expect, it } from 'vitest';
import { parseChordList } from '../lessonTextEditing';

describe('chord symbols as typed in the lesson editor', () => {
  it.each([
    ['Cmaj7', ['Cmaj7']],
    ['Dm7 G7 Cmaj7 Cmaj7', ['Dm7', 'G7', 'Cmaj7', 'Cmaj7']],
    ['Dm7 | G7 | Cmaj7', ['Dm7', 'G7', 'Cmaj7']],
    ['Dm7, G7', ['Dm7', 'G7']],
    // As the lesson shows them.
    ['C maj7', ['Cmaj7']],
    ['D min7 → G dom7 → C maj7', ['Dm7', 'G7', 'Cmaj7']],
    ['B♭7 E♭maj7', ['Bb7', 'Ebmaj7']],
    ['C m9♭5', ['Cm9b5']],
    ['', []],
  ])('%s', (text, symbols) => {
    expect(parseChordList(text)).toEqual(symbols);
  });

  it('refuses what isn’t a chord', () => {
    expect(parseChordList('Cmaj7 H7')).toBeNull();
    expect(parseChordList('hello')).toBeNull();
  });
});
