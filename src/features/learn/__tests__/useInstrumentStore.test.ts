// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  instrumentOptions,
  isGuitarLearnEnabled,
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
  });

  it('lists piano and guitar; bass and ukulele are not available yet', () => {
    const options = instrumentOptions();
    expect(options.map((o) => o.id)).toEqual([
      'piano',
      'guitar',
      'bass',
      'ukulele',
    ]);
    expect(options.find((o) => o.id === 'piano')?.available).toBe(true);
    expect(options.find((o) => o.id === 'bass')?.available).toBe(false);
    expect(options.find((o) => o.id === 'ukulele')?.available).toBe(false);
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
