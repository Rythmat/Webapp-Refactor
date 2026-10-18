import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MusicLiteracyLesson } from '../schemas';
import { blankStepOfKind } from '../template';
import { titleCase } from '../titleCase';

/**
 * Music Literacy's titles in Title Case: every word capitalized but the
 * short ones, the music as written. Directions, hints and goals are left in
 * sentences (nothing here touches them).
 */

describe('titleCase', () => {
  it('capitalizes every word but the short ones', () => {
    expect(titleCase('A note called C')).toBe('A Note Called C');
    expect(titleCase('The root is 1')).toBe('The Root Is 1');
    expect(titleCase('Choose your key')).toBe('Choose Your Key');
    expect(titleCase('Play the chords')).toBe('Play the Chords');
    expect(titleCase('Hear it with your band')).toBe('Hear It with Your Band');
    expect(
      titleCase('a rhythm and a beat but not for so yet at by in of on up as'),
    ).toBe('A Rhythm and a Beat but Not for so yet at by in of on up As');
    expect(titleCase('Choose The Chords From A list')).toBe(
      'Choose the Chords from A List',
    );
  });

  it('capitalizes the first and last word, and the first after a colon', () => {
    expect(titleCase('Major or minor?')).toBe('Major or Minor?');
    expect(titleCase('Go to 5: musical gravity')).toBe(
      'Go to 5: Musical Gravity',
    );
    expect(titleCase('Up: the 1-2-3')).toBe('Up: The 1-2-3');
    expect(titleCase('Part 2 · choose a color')).toBe(
      'Part 2 · Choose a Color',
    );
    expect(titleCase('the one to start with')).toBe('The One to Start With');
  });

  it('keeps the music as written: 1-2-3, ♭3, 7th, X, ALL and the hybrid chord labels', () => {
    expect(titleCase('Up: 1-2-3')).toBe('Up: 1-2-3');
    expect(titleCase('Flat the ♭3: minor')).toBe('Flat the ♭3: Minor');
    expect(titleCase('The 1 chord with its 7th')).toBe(
      'The 1 Chord with Its 7th',
    );
    expect(titleCase('Your progression, now with 7ths')).toBe(
      'Your Progression, Now with 7ths',
    );
    expect(titleCase('Add a 3rd chord: | 1 | X | X | X |')).toBe(
      'Add a 3rd Chord: | 1 | X | X | X |',
    );
    expect(titleCase('Play ALL the notes')).toBe('Play ALL the Notes');
    expect(titleCase('From 4 maj to 5 dom7')).toBe('From 4 maj to 5 dom7');
    expect(titleCase('The ♭6 maj7 and the ♭7 dom7 in minor')).toBe(
      'The ♭6 maj7 and the ♭7 dom7 in Minor',
    );
    expect(titleCase('2 min, 3 min')).toBe('2 min, 3 min');
  });

  it('leaves a capital A alone, since it may be the note', () => {
    expect(titleCase('Play in A major')).toBe('Play in A Major');
  });

  it('cases each part of a hyphenated word, and the brackets’ words', () => {
    expect(titleCase('call-and-response')).toBe('Call-and-Response');
    expect(titleCase('Call and response (melody)')).toBe(
      'Call and Response (Melody)',
    );
    expect(titleCase('“the call” is yours')).toBe('“The Call” Is Yours');
  });

  it('is the same the second time', () => {
    for (const title of [
      'A note called C',
      'Add a 4th chord: | X | X | X | X |',
      'Neighbors of 5: 5-4-6-5, 5-6-4-5',
      'Choose 2 chords',
    ]) {
      expect(titleCase(titleCase(title))).toBe(titleCase(title));
    }
    expect(titleCase('')).toBe('');
  });
});

describe('the seed lessons’ titles', () => {
  const dir = 'src/curriculum/data/musicLiteracy';
  const lessons = [
    'music-literacy-part-1.json',
    'music-literacy-part-2.json',
  ].map(
    (name) =>
      JSON.parse(readFileSync(`${dir}/${name}`, 'utf8')) as MusicLiteracyLesson,
  );

  it('are all in Title Case: every step, section and module', () => {
    for (const lesson of lessons) {
      const titles = [
        ...lesson.steps.flatMap((step) => [step.title, step.section ?? '']),
        ...(lesson.modules ?? []).map((m) => m.title),
      ].filter(Boolean);
      for (const title of titles)
        expect(titleCase(title), lesson.id).toBe(title);
    }
  });

  it('keep Part 1’s own words, cased', () => {
    expect(lessons[0].steps.map((step) => step.title)).toEqual([
      'A Note Called C',
      'The Root Is 1',
      'Add the 3: Major',
      'Go to 5: Musical Gravity',
      'The Major Triad',
      'Flat the 3: Minor',
      'The Minor Triad',
    ]);
  });

  it('open Part 2 on Choose Your Key, then Major or Minor?', () => {
    const [key, mode] = lessons[1].steps;
    expect(key).toEqual({
      kind: 'chooseKey',
      tag: 'choose-your-key',
      section: 'Choose a Color',
      title: 'Choose Your Key',
      direction: 'Pick a color on the circle. Its note is your 1.',
    });
    expect(mode).toMatchObject({
      kind: 'chooseMode',
      tag: 'choose-major-or-minor',
      title: 'Major or Minor?',
      direction: 'Pick one. It sets your 3.',
    });
  });

  it('are what the editor’s new choose steps say too', () => {
    expect(blankStepOfKind('chooseKey', 'k', 'Choose Your Key')).toEqual({
      kind: 'chooseKey',
      tag: 'k',
      title: 'Choose Your Key',
      direction: 'Pick a color on the circle. Its note is your 1.',
    });
    expect(blankStepOfKind('chooseMode', 'm', 'Major or Minor?')).toEqual({
      kind: 'chooseMode',
      tag: 'm',
      title: 'Major or Minor?',
      direction: 'Pick one. It sets your 3.',
    });
  });
});
