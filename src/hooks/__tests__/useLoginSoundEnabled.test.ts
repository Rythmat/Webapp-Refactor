// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLoginSoundPlayed,
  getLoginSoundEnabled,
  hasPlayedLoginSound,
  markLoginSoundPlayed,
  setLoginSoundEnabled,
} from '../useLoginSoundEnabled';

const ENABLED_KEY = 'musicAtlas:loginSound';
const PLAYED = (id: string) => `musicAtlas:loginSoundPlayed:${id}`;
const USER = 'user-abc';
const OTHER = 'user-xyz';

// Mirrors the AuthContext effect's decision, so the test exercises the real
// gate rather than restating it.
const wouldPlay = (userId: string) =>
  getLoginSoundEnabled() && !hasPlayedLoginSound(userId);

describe('login sound preference', () => {
  beforeEach(() => window.localStorage.clear());

  it('defaults ON when no key is present', () => {
    expect(getLoginSoundEnabled()).toBe(true);
    expect(wouldPlay(USER)).toBe(true);
  });

  it('plays exactly once per account, then stays silent', () => {
    expect(wouldPlay(USER)).toBe(true);
    markLoginSoundPlayed(USER);
    expect(wouldPlay(USER)).toBe(false);
    expect(wouldPlay(USER)).toBe(false);
    expect(window.localStorage.getItem(PLAYED(USER))).toBe('1');
  });

  it('keys the played flag per account', () => {
    markLoginSoundPlayed(USER);
    expect(wouldPlay(USER)).toBe(false);
    expect(wouldPlay(OTHER)).toBe(true);
  });

  it('turning the toggle off silences it', () => {
    setLoginSoundEnabled(false, USER);
    expect(window.localStorage.getItem(ENABLED_KEY)).toBe('0');
    expect(getLoginSoundEnabled()).toBe(false);
    expect(wouldPlay(USER)).toBe(false);
  });

  it('turning it off does not clear the played flag', () => {
    markLoginSoundPlayed(USER);
    setLoginSoundEnabled(false, USER);
    expect(window.localStorage.getItem(PLAYED(USER))).toBe('1');
  });

  it('turning it back on re-arms one more play', () => {
    markLoginSoundPlayed(USER);
    setLoginSoundEnabled(false, USER);
    setLoginSoundEnabled(true, USER);
    expect(window.localStorage.getItem(ENABLED_KEY)).toBe('1');
    expect(window.localStorage.getItem(PLAYED(USER))).toBeNull();
    expect(wouldPlay(USER)).toBe(true);
    markLoginSoundPlayed(USER);
    expect(wouldPlay(USER)).toBe(false);
  });

  it('re-arms only the account passed in', () => {
    markLoginSoundPlayed(USER);
    markLoginSoundPlayed(OTHER);
    setLoginSoundEnabled(true, USER);
    expect(wouldPlay(USER)).toBe(true);
    expect(wouldPlay(OTHER)).toBe(false);
  });

  it('enabling without a user id still flips the preference', () => {
    markLoginSoundPlayed(USER);
    setLoginSoundEnabled(true, null);
    expect(getLoginSoundEnabled()).toBe(true);
    expect(hasPlayedLoginSound(USER)).toBe(true);
  });

  it('dispatches the sync event so mounted toggles update', () => {
    let fired = 0;
    window.addEventListener('login-sound-pref-change', () => (fired += 1));
    setLoginSoundEnabled(false, USER);
    setLoginSoundEnabled(true, USER);
    expect(fired).toBe(2);
  });

  it('clearLoginSoundPlayed removes only that key', () => {
    markLoginSoundPlayed(USER);
    markLoginSoundPlayed(OTHER);
    clearLoginSoundPlayed(USER);
    expect(hasPlayedLoginSound(USER)).toBe(false);
    expect(hasPlayedLoginSound(OTHER)).toBe(true);
  });
});
