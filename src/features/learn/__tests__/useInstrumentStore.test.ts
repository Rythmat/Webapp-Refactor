// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  instrumentOptions,
  isBassLearnEnabled,
  isGuitarLearnEnabled,
  isUkuleleLearnEnabled,
  learnPageRoute,
  mergeStoredInstrument,
  useInstrumentStore,
} from '@/features/learn/useInstrumentStore';

describe('useInstrumentStore', () => {
  afterEach(() => {
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
  });

  it('defaults to piano, right-handed', () => {
    const { instrument, leftHanded } = useInstrumentStore.getState();
    expect(instrument).toBe('piano');
    expect(leftHanded).toBe(false);
  });

  it('switches instrument and handedness', () => {
    useInstrumentStore.getState().setInstrument('guitar');
    useInstrumentStore.getState().setLeftHanded(true);
    expect(useInstrumentStore.getState()).toMatchObject({
      instrument: 'guitar',
      leftHanded: true,
    });
  });

  it('falls back to piano for a stored value it cannot teach', () => {
    const merge = mergeStoredInstrument;
    const current = useInstrumentStore.getState();
    expect(
      merge({ instrument: 'banjo', leftHanded: 'yes' }, current),
    ).toMatchObject({ instrument: 'piano', leftHanded: false });
    expect(
      merge({ instrument: 'guitar', leftHanded: true }, current),
    ).toMatchObject({ instrument: 'guitar', leftHanded: true });
    expect(merge(undefined, current)).toMatchObject({ instrument: 'piano' });
    expect(merge({ instrument: 'ukulele' }, current)).toMatchObject({
      instrument: 'ukulele',
    });
  });

  it('lists piano, guitar, bass and ukulele (in development)', () => {
    const options = instrumentOptions();
    expect(options.map((o) => o.id)).toEqual([
      'piano',
      'guitar',
      'bass',
      'ukulele',
    ]);
    expect(options.find((o) => o.id === 'piano')?.available).toBe(true);
    expect(options.find((o) => o.id === 'bass')?.available).toBe(true);
    expect(options.find((o) => o.id === 'ukulele')?.available).toBe(true);
  });

  // Ukulele waits behind a flag outside development until the owner has
  // played it through (2026-10-27), as bass does.
  it('offers ukulele outside development only to a browser that switches it on', () => {
    vi.stubEnv('DEV', false);
    try {
      localStorage.removeItem('learn-ukulele');
      expect(isUkuleleLearnEnabled()).toBe(false);
      expect(
        instrumentOptions().find((o) => o.id === 'ukulele')?.available,
      ).toBe(false);
      localStorage.setItem('learn-ukulele', 'true');
      expect(isUkuleleLearnEnabled()).toBe(true);
      expect(learnPageRoute('ukulele')).toBe('/learn/ukulele');
    } finally {
      localStorage.removeItem('learn-ukulele');
      vi.unstubAllEnvs();
    }
  });

  // Bass waits behind a flag outside development until the owner has played
  // it through (2026-10-27).
  it('offers bass outside development only to a browser that switches it on', () => {
    vi.stubEnv('DEV', false);
    try {
      localStorage.removeItem('learn-bass');
      expect(isBassLearnEnabled()).toBe(false);
      localStorage.setItem('learn-bass', 'true');
      expect(isBassLearnEnabled()).toBe(true);
      expect(instrumentOptions().find((o) => o.id === 'bass')?.available).toBe(
        true,
      );
    } finally {
      localStorage.removeItem('learn-bass');
      vi.unstubAllEnvs();
    }
  });

  // Guitar used to show only in development, or with a flag set, so the
  // live site said "Coming soon" (owner, 2026-10-24).
  it('offers guitar to everyone, unless this browser switches it off', () => {
    localStorage.removeItem('learn-guitar');
    expect(isGuitarLearnEnabled()).toBe(true);
    expect(instrumentOptions().find((o) => o.id === 'guitar')?.available).toBe(
      true,
    );

    localStorage.setItem('learn-guitar', 'false');
    expect(isGuitarLearnEnabled()).toBe(false);
    expect(instrumentOptions().find((o) => o.id === 'guitar')?.available).toBe(
      false,
    );

    localStorage.removeItem('learn-guitar');
    expect(isGuitarLearnEnabled()).toBe(true);
  });
});
