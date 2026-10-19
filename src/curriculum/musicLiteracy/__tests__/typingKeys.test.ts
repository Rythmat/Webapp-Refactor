// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  HIGHEST_TYPING_OCTAVE,
  LOWEST_TYPING_OCTAVE,
  START_TYPING_OCTAVE,
  isPlayableKeyEvent,
  literacyTypingNote,
  shiftedTypingOctave,
  typingLetterFor,
  typingOctaveLabel,
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

  it('moves an octave on Z and X, between C3 and C4 for the A key', () => {
    expect(shiftedTypingOctave('KeyZ', 4)).toBe(3);
    expect(shiftedTypingOctave('KeyZ', 3)).toBe(3);
    expect(shiftedTypingOctave('KeyX', 3)).toBe(4);
    expect(shiftedTypingOctave('KeyX', 4)).toBe(4);
    expect(shiftedTypingOctave('KeyA', 4)).toBeNull();
    expect(literacyTypingNote('KeyA', 3)).toBe(48);
  });

  it('reaches every key of C3–C5 from one of its two octaves', () => {
    for (let midi = 48; midi <= 72; midi++) {
      const reachable = [LOWEST_TYPING_OCTAVE, HIGHEST_TYPING_OCTAVE].some(
        (octave) => typingLetterFor(midi, octave) !== null,
      );
      expect(reachable, `MIDI ${midi}`).toBe(true);
    }
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
