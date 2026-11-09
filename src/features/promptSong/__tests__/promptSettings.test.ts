/**
 * A prompt's key and tempo, for the session (owner, 2026-10-24): a key
 * center (a tonic alone keeps the session's mode) or a mode, and a tempo;
 * a prompt asking for nothing else just sets them.
 */
import { describe, expect, it } from 'vitest';
import { parseMusicPrompt } from '../parseMusicPrompt';
import {
  namedKey,
  sessionSettingsOf,
  type SessionKey,
} from '../promptSettings';

const eMixo: SessionKey = { tonicPc: 4, mode: 'mixolydian' };
const none: SessionKey = { tonicPc: null, mode: null };

describe('namedKey', () => {
  const key = (text: string, session = eMixo) =>
    namedKey(parseMusicPrompt(text), session);

  it('takes a tonic with its mode, or the session’s mode for a tonic alone', () => {
    expect(key('a bassline in G minor')).toMatchObject({
      tonicPc: 7,
      mode: 'aeolian',
    });
    expect(key('a bassline in G')).toMatchObject({
      tonicPc: 7,
      mode: 'mixolydian',
    });
    expect(key('chords in Dorian')).toMatchObject({
      tonicPc: 4,
      mode: 'dorian',
    });
  });

  it('names none for a prompt without one, or a mode alone on a keyless song', () => {
    expect(key('a funky bassline')).toBeNull();
    expect(key('chords in Dorian', none)).toBeNull();
  });
});

describe('sessionSettingsOf', () => {
  it('reads a key or tempo asked for alone', () => {
    expect(sessionSettingsOf('change the key to G minor', eMixo)).toEqual({
      key: { tonicPc: 7, label: 'G', mode: 'aeolian' },
      bpm: null,
    });
    expect(sessionSettingsOf('make it 100 bpm', eMixo)).toEqual({
      key: null,
      bpm: 100,
    });
    expect(sessionSettingsOf('set the tempo to 90', eMixo)?.bpm).toBe(90);
    expect(sessionSettingsOf('Bb at 120', none)).toEqual({
      key: { tonicPc: 10, label: 'Bb', mode: 'ionian' },
      bpm: 120,
    });
  });

  it('leaves a prompt that asks for a part, a section or a style to be written', () => {
    for (const text of [
      'write a bassline in G minor',
      'chords for the chorus in D',
      'a funk groove at 100 bpm',
      'add a dark beat at 90',
      'a sad song in A minor',
      'make a song in C',
    ]) {
      expect(sessionSettingsOf(text, eMixo), text).toBeNull();
    }
  });
});
