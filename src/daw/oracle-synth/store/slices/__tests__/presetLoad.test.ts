// @vitest-environment jsdom
/**
 * Loading and saving presets (synth audit, 2026-10-21): a preset just
 * loaded isn't marked edited (the dirty watcher used to fire on the load
 * itself), an edit after it is, and a user preset saved under a factory
 * preset's name is kept as "NAME 2", so loading either finds it.
 *
 * Run: npx vitest run src/daw/oracle-synth/store/slices/__tests__/presetLoad.test.ts
 */
import { describe, expect, it } from 'vitest';
import { useSynthStore } from '../../index';
import { freePresetName } from '../presetSlice';

const s = () => useSynthStore.getState();

describe('loading a preset', () => {
  it('is not an edit; changing a param after it is', () => {
    s().loadPreset('BASS');
    expect(s().presetName).toBe('BASS');
    expect(s().isDirty).toBe(false);
    s().initPreset();
    expect(s().isDirty).toBe(false);
    s().loadPreset('PAD');
    s().setFilterParam(0, 'cutoff', 999);
    expect(s().isDirty).toBe(true);
  });
});

describe('saving under a factory name', () => {
  it('keeps the copy as "NAME 2", which loads back with its edit', () => {
    s().loadPreset('PAD');
    s().setFilterParam(0, 'cutoff', 999);
    s().savePreset('PAD');
    expect(s().presetName).toBe('PAD 2');
    s().loadPreset('PAD');
    expect(s().filters[0].cutoff).not.toBe(999);
    s().loadPreset('PAD 2');
    expect(s().filters[0].cutoff).toBe(999);
  });

  it('picks the first free number', () => {
    const taken = new Set(['X', 'X 2', 'X 3']);
    expect(freePresetName('X', (n) => taken.has(n))).toBe('X 4');
    expect(freePresetName('Y', (n) => taken.has(n))).toBe('Y');
  });
});
