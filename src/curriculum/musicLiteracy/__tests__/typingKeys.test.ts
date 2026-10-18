// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CHORD_KEY_RANGE, MELODY_KEY_RANGE } from '../literacyKeyRange';
import {
  HIGHEST_TYPING_OCTAVE,
  LOWEST_TYPING_OCTAVE,
  START_TYPING_OCTAVE,
  isPlayableKeyEvent,
  literacyTypingNote,
  shiftedTypingOctave,
  typingLetterFor,
  typingOctaveLabel,
  typingOctavesFor,
} from '../typingKeys';

describe('the computer keyboard as the lesson’s piano', () => {
  it('plays the Studio’s map: A is C, the row above the black keys', () => {
    expect(START_TYPING_OCTAVE).toBe(4);
    expect(literacyTypingNote('KeyA', 4)).toBe(60); // the 1 in C
    expect(literacyTypingNote('KeyD', 4)).toBe(64); // the 3
    expect(literacyTypingNote('KeyE', 4)).toBe(63); // the ♭3
    expect(literacyTypingNote('KeyG', 4)).toBe(67); // the 5
    expect(literacyTypingNote('KeyK', 4)).toBe(72); // C5
    expect(literacyTypingNote('Semicolon', 4)).toBe(76);
    expect(literacyTypingNote('KeyQ', 4)).toBeNull();
  });

  it('moves an octave on Z and X, between the two the keyboard shows', () => {
    const chords = typingOctavesFor(CHORD_KEY_RANGE);
    expect(chords).toEqual({ low: 3, high: 4, start: 4 });
    expect(shiftedTypingOctave('KeyZ', 4, chords)).toBe(3);
    expect(shiftedTypingOctave('KeyZ', 3, chords)).toBe(3);
    expect(shiftedTypingOctave('KeyX', 3, chords)).toBe(4);
    expect(shiftedTypingOctave('KeyX', 4, chords)).toBe(4);
    const melody = typingOctavesFor(MELODY_KEY_RANGE);
    expect(melody).toEqual({ low: 4, high: 5, start: 4 });
    expect(shiftedTypingOctave('KeyX', 4, melody)).toBe(5);
    expect(shiftedTypingOctave('KeyX', 5, melody)).toBe(5);
    expect(shiftedTypingOctave('KeyZ', 4, melody)).toBe(4);
    expect(shiftedTypingOctave('KeyA', 4)).toBeNull();
    expect(literacyTypingNote('KeyA', 3)).toBe(48);
    expect([LOWEST_TYPING_OCTAVE, HIGHEST_TYPING_OCTAVE]).toEqual([3, 5]);
  });

  it('reaches every key of either keyboard from one of its two octaves', () => {
    for (const range of [CHORD_KEY_RANGE, MELODY_KEY_RANGE]) {
      const { low, high } = typingOctavesFor(range);
      for (let midi = range.low; midi <= range.high; midi++) {
        const reachable = [low, high].some(
          (octave) => typingLetterFor(midi, octave) !== null,
        );
        expect(reachable, `MIDI ${midi}`).toBe(true);
      }
    }
  });

  it('starts each step on the octave that reaches most of its notes', () => {
    // Part 1 in C: C4–G4, A = C4.
    expect(typingOctavesFor(MELODY_KEY_RANGE, [60, 64, 67]).start).toBe(4);
    // B major's 5-4-6-5: F♯5, E5, G♯5, A = C5.
    expect(typingOctavesFor(MELODY_KEY_RANGE, [78, 76, 80]).start).toBe(5);
    // A G chord, G3 B3 D4: A = C3.
    expect(typingOctavesFor(CHORD_KEY_RANGE, [55, 59, 62]).start).toBe(3);
  });

  it('names the letter for a note, for the answer’s hint', () => {
    expect(typingLetterFor(60, 4)).toBe('A');
    expect(typingLetterFor(64, 4)).toBe('D');
    expect(typingLetterFor(63, 4)).toBe('E');
    expect(typingLetterFor(76, 4)).toBe(';');
    expect(typingLetterFor(48, 4)).toBeNull();
    expect(typingLetterFor(48, 3)).toBe('A');
    expect(typingOctaveLabel(4)).toBe('A = C4');
  });

  it('leaves keys typed into a field, and shortcuts, alone', () => {
    const key = (init: KeyboardEventInit, target?: Element) => {
      const event = new KeyboardEvent('keydown', init);
      if (target) Object.defineProperty(event, 'target', { value: target });
      return event;
    };
    expect(isPlayableKeyEvent(key({ code: 'KeyA' }))).toBe(true);
    expect(isPlayableKeyEvent(key({ code: 'KeyA', metaKey: true }))).toBe(
      false,
    );
    expect(isPlayableKeyEvent(key({ code: 'KeyA', ctrlKey: true }))).toBe(
      false,
    );
    expect(
      isPlayableKeyEvent(
        key({ code: 'KeyA' }, document.createElement('input')),
      ),
    ).toBe(false);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inside = document.createElement('button');
    dialog.append(inside);
    expect(isPlayableKeyEvent(key({ code: 'KeyA' }, inside))).toBe(false);
    expect(
      isPlayableKeyEvent(
        key({ code: 'KeyA' }, document.createElement('button')),
      ),
    ).toBe(true);
  });
});
