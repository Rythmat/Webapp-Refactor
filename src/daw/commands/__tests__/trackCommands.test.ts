/**
 * The simple instrument picker's catalog and the track commands behind it
 * (simpleInstruments.ts, trackCommands.ts): plain instruments only, a change
 * of instrument that keeps the music and the mix, and an instrument track
 * added in one step, each one undo step.
 *
 * Run: npx vitest run src/daw/commands/__tests__/trackCommands.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toasts = vi.hoisted(() => [] as Array<{ title?: string }>);
vi.mock('@/daw/shell/notice', () => ({
  notice: (t: { title?: string }) => {
    toasts.push(t);
  },
}));

import {
  INSTRUMENT_FAMILIES,
  SIMPLE_INSTRUMENTS,
  instrumentLabel,
  instrumentsIn,
  nameFollowsInstrument,
  pickerFamilies,
  simpleInstrumentOf,
} from '@/daw/instruments/simpleInstruments';
import { MAX_TOTAL_TRACKS, useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import { addInstrumentTrack, setTrackInstrument } from '../trackCommands';

const s = () => useStore.getState();
const trackOf = (id: string) => s().tracks.find((t) => t.id === id)!;

const NOTE = {
  note: 60,
  velocity: 90,
  startTick: 0,
  durationTicks: 480,
  channel: 0,
};

let release: () => void = () => {};

beforeEach(() => {
  toasts.length = 0;
  useStore.setState(useStore.getInitialState(), true);
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  resetHistory();
});

/** A Rhodes track with a clip, a mix and an effect, as a project has. */
function rhodes(name = 'Rhodes'): string {
  const id = s().addTrack('midi', 'electric-piano', name);
  s().addMidiClip(id, {
    id: 'chords',
    startTick: 0,
    durationTicks: 1920,
    events: [NOTE, { ...NOTE, note: 64 }],
  });
  s().updateTrack(id, { volume: 0.42, pan: -0.3, mute: true });
  s().addActiveEffect(id, 'reverb');
  resetHistory();
  return id;
}

describe('the catalog', () => {
  it('offers plain instruments only: no Oracle Synth, no sampler, no audio', () => {
    const banned = /^(oracle-synth|sampler|guitar-fx|bass-fx|vocal-fx|none)\b/;
    for (const item of SIMPLE_INSTRUMENTS) {
      expect(item.sound, item.id).not.toMatch(banned);
    }
    const labels = SIMPLE_INSTRUMENTS.map((i) => i.label.toLowerCase());
    expect(labels.some((l) => l.includes('oracle'))).toBe(false);
  });

  it('gives every instrument a unique kebab-case id and a family with some', () => {
    const ids = SIMPLE_INSTRUMENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const family of INSTRUMENT_FAMILIES) {
      expect(instrumentsIn(family.id).length, family.id).toBeGreaterThan(0);
    }
    expect(INSTRUMENT_FAMILIES.map((f) => f.label)).toEqual(
      expect.arrayContaining([
        'Piano',
        'Electric Piano',
        'Organ',
        'Guitar',
        'Bass',
        'Strings',
        'Brass',
        'Woodwinds',
        'Mallets',
        'Choir & Voice',
        'Drums',
      ]),
    );
  });

  it('offers a drum track its kits, a melodic track no drums, a new track all', () => {
    expect(pickerFamilies({ instrument: 'drum-machine' })).toEqual(['drums']);
    expect(pickerFamilies({ instrument: 'electric-piano' })).not.toContain(
      'drums',
    );
    expect(pickerFamilies({ instrument: 'oracle-synth' })).not.toContain(
      'drums',
    );
    expect(pickerFamilies(null)).toEqual(INSTRUMENT_FAMILIES.map((f) => f.id));
  });

  it('names what a track plays, from the catalog or the sound itself', () => {
    const t = (fields: object) => ({
      type: 'midi' as const,
      instrument: 'soundfont' as const,
      ...fields,
    });
    expect(instrumentLabel(t({ gmProgram: 33 }))).toBe('Electric Bass');
    expect(instrumentLabel(t({ instrument: 'electric-piano' }))).toBe(
      'Electric Piano',
    );
    expect(instrumentLabel(t({ gmProgram: 89 }))).toBe('Pad 2 (warm)');
    expect(instrumentLabel(t({ instrument: 'oracle-synth' }))).toBe('Synth');
    expect(
      instrumentLabel({ type: 'audio', instrument: 'vocal-fx' } as never),
    ).toBe('Vocal (Audio)');
    expect(
      simpleInstrumentOf({ instrument: 'bass-electric', bassVoice: 'upright' })
        ?.id,
    ).toBe('upright-bass');
  });

  it('tells a name that only says the instrument from a name of one’s own', () => {
    const t = (name: string, fields: object = {}) =>
      ({
        name,
        type: 'midi',
        instrument: 'soundfont',
        gmProgram: 33,
        ...fields,
      }) as never;
    expect(nameFollowsInstrument(t('Bass'))).toBe(true);
    expect(nameFollowsInstrument(t('Electric Bass 2'))).toBe(true);
    expect(nameFollowsInstrument(t('Instruments'))).toBe(true);
    expect(nameFollowsInstrument(t(''))).toBe(true);
    expect(nameFollowsInstrument(t('Walking Line'))).toBe(false);
    expect(
      nameFollowsInstrument(t('Rhodes', { instrument: 'electric-piano' })),
    ).toBe(false);
  });
});

describe('setTrackInstrument', () => {
  it('changes the instrument and keeps the clips, notes, name, mix and effects', () => {
    const id = rhodes();
    const before = trackOf(id);
    expect(setTrackInstrument(id, 'violin')).toBe(true);
    const after = trackOf(id);
    expect(after).toMatchObject({
      instrument: 'soundfont',
      gmProgram: 40,
      name: 'Rhodes',
      volume: 0.42,
      pan: -0.3,
      mute: true,
    });
    expect(after.midiClips).toBe(before.midiClips);
    expect(after.effects).toBe(before.effects);
    expect(after.activeEffects).toEqual(['reverb']);
  });

  it('renames a track whose name only said what it played', () => {
    const id = s().addTrack('midi', 'soundfont', 'Instruments');
    setTrackInstrument(id, 'grand-piano');
    expect(trackOf(id)).toMatchObject({
      name: 'Grand Piano',
      instrument: 'piano-sampler',
      presetName: 'Studio Grand',
    });
    setTrackInstrument(id, 'upright-bass');
    expect(trackOf(id)).toMatchObject({
      name: 'Upright Bass',
      instrument: 'bass-electric',
      bassVoice: 'upright',
    });
  });

  it('is one undo step that brings the instrument and the name back', () => {
    const id = s().addTrack('midi', 'electric-piano', 'Electric Piano');
    resetHistory();
    setTrackInstrument(id, 'marimba');
    expect(historyLabels()).toEqual(['Change instrument']);
    expect(trackOf(id)).toMatchObject({ name: 'Marimba', gmProgram: 12 });
    expect(undo()).toBe(true);
    expect(trackOf(id)).toMatchObject({
      name: 'Electric Piano',
      instrument: 'electric-piano',
    });
  });

  it('swaps a drum track’s kit', () => {
    const id = s().addTrack('midi', 'drum-machine', 'Drums');
    setTrackInstrument(id, 'kit-808');
    expect(trackOf(id)).toMatchObject({
      instrument: 'drum-machine',
      drumKit: '808',
      name: '808 Kit',
    });
  });

  it('changes nothing on an audio track, for an unknown id, or to the same sound', () => {
    const vox = s().addTrack('audio', 'vocal-fx', 'Vox');
    expect(setTrackInstrument(vox, 'violin')).toBe(false);
    expect(trackOf(vox).instrument).toBe('vocal-fx');
    const id = rhodes();
    expect(setTrackInstrument(id, 'no-such-thing')).toBe(false);
    expect(setTrackInstrument(id, 'electric-piano')).toBe(false);
    expect(historyLabels()).toEqual([]);
  });
});

describe('addInstrumentTrack', () => {
  it('adds a selected MIDI track playing the instrument, named after it', () => {
    const id = addInstrumentTrack('trumpet');
    expect(trackOf(id)).toMatchObject({
      type: 'midi',
      instrument: 'soundfont',
      gmProgram: 56,
      name: 'Trumpet',
    });
    expect(s().selectedTrackId).toBe(id);
  });

  it('adds a drum track on its kit, in one undo step', () => {
    const id = addInstrumentTrack('house-kit');
    expect(trackOf(id)).toMatchObject({
      instrument: 'drum-machine',
      drumKit: 'house',
    });
    expect(historyLabels()).toEqual(['Add track']);
    undo();
    expect(s().tracks).toHaveLength(0);
  });

  it('adds nothing past the track limit', () => {
    for (let i = 0; i < MAX_TOTAL_TRACKS; i++) addInstrumentTrack('flute');
    expect(addInstrumentTrack('flute')).toBe('');
    expect(s().tracks).toHaveLength(MAX_TOTAL_TRACKS);
    expect(toasts.at(-1)?.title).toBe('Track limit reached');
  });
});
