import { describe, expect, it } from 'vitest';
import { isAudioPlayerPath, isFocusPath } from '../focusPaths';

describe('a guided Audio lesson takes the whole window', () => {
  it.each([
    '/learn/audio/sound-basics/hear-the-kit',
    '/learn/audio/sound-basics/decibels-and-faders',
    '/learn/audio/signal-path/gain-staging',
  ])('%s', (path) => {
    expect(isAudioPlayerPath(path)).toBe(true);
    expect(isFocusPath(path)).toBe(true);
  });

  it.each([
    '/learn/audio',
    '/learn/audio/sound-basics',
    '/learn/audio/sound-basics/physics-of-sound',
    '/learn/audio/anatomy/microphone',
    '/learn/audio/nonsense/gain-staging',
  ])('but not %s', (path) => {
    expect(isAudioPlayerPath(path)).toBe(false);
  });
});
