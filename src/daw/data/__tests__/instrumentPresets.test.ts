import { describe, expect, it } from 'vitest';
import {
  PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
} from '../instrumentPresets';

// ── Every listed preset changes the sound (instruments-08, state-reload-31) ─
// A preset with no instrument behind it only renamed the track, and several
// presets shared one sound under different names. Only presets that switch
// the track to a sound no other preset makes are listed.

/** What a preset plays: its instrument, plus the GM program for SoundFont. */
const soundOf = (p: (typeof PRESETS)[number]) =>
  `${p.instrumentType}:${p.gmProgram ?? '-'}`;

describe('instrument presets', () => {
  it('each switch the track to an instrument', () => {
    for (const preset of PRESETS) {
      expect(preset.instrumentType, preset.name).toBeTruthy();
      if (preset.instrumentType === 'soundfont') {
        expect(preset.gmProgram, preset.name).toBeTypeOf('number');
      }
    }
  });

  it('each make a sound no other preset makes', () => {
    const sounds = PRESETS.map(soundOf);
    expect(new Set(sounds).size).toBe(sounds.length);
  });

  it('no longer list the label-only and duplicate presets', () => {
    const names = PRESETS.map((p) => p.name);
    for (const gone of [
      '808 Boom',
      'Natural',
      'Finger Drums',
      'Lofi Piano',
      'Analog Lead',
      'Warm Pad',
      'Bongos',
      'Grand Piano',
      'Rhodes',
      'Wurlitzer',
      'Hammond B3',
      'Jazz Organ',
    ]) {
      expect(names).not.toContain(gone);
    }
  });

  it('keep the preset each keyboard instrument shows by default', () => {
    const first = (type: string) =>
      PRESETS.find((p) => p.instrumentType === type)?.name;
    expect(PRESETS.find((p) => p.name === 'Studio Grand')?.instrumentType).toBe(
      'piano-sampler',
    );
    expect(first('electric-piano')).toBe('Mellow EP');
    expect(first('organ')).toBe('Church Organ');
    expect(first('bass-electric')).toBe('Bass Guitar');
    expect(first('cello')).toBe('Cello');
  });

  it('only offer categories that hold presets, each once', () => {
    expect(new Set(PRESET_CATEGORIES)).toEqual(
      new Set(PRESETS.map((p) => p.category)),
    );
    expect(new Set(PRESET_CATEGORIES).size).toBe(PRESET_CATEGORIES.length);
    for (const category of PRESET_CATEGORIES) {
      expect(getPresetsByCategory(category).length, category).toBeGreaterThan(
        0,
      );
    }
  });
});
