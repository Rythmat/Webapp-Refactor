// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getChordClef, setChordClef } from '../clefPreference';

describe('the stored clef preference', () => {
  beforeEach(() => localStorage.clear());

  it('starts on the treble clef', () => {
    expect(getChordClef()).toBe('treble');
  });

  it('remembers a choice', () => {
    setChordClef('bass');
    expect(getChordClef()).toBe('bass');
    setChordClef('treble');
    expect(getChordClef()).toBe('treble');
  });

  it('falls back to treble on anything unexpected', () => {
    localStorage.setItem('musicAtlas:chordClef', 'alto');
    expect(getChordClef()).toBe('treble');
  });

  it('is the clef name itself, so it drops straight into buildScore', () => {
    setChordClef('bass');
    const staves: 'treble' | 'bass' = getChordClef();
    expect(staves).toBe('bass');
  });
});
