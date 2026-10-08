// @vitest-environment jsdom
/**
 * A new track's defaults (projectDocument/trackDefaults.ts), the one source
 * for addTrack's and the project templates' new tracks.
 *
 * - The module loads without the store. It is for tracksSlice, and the
 *   store's index creates every slice as it loads, so a store import here
 *   would have the index run before tracksSlice had finished loading: the
 *   store would then fail to build whenever a page reached a slice first, as
 *   the practice tracks and UNISON do.
 * - initialTrackDefaults is what addTrack and the templates make, for every
 *   instrument, but for the id and the colour. Since addTrack and the
 *   templates are to be built on it, three tracks are also written out in
 *   full, so today's values and key order stay pinned after that.
 *
 * Run: npx vitest run src/daw/persistence/projectDocument/__tests__/trackDefaults.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import { useStore } from '@/daw/store';
import type { InstrumentType, Track, TrackType } from '@/daw/store/tracksSlice';
import { initialTrackDefaults } from '../trackDefaults';

const s = () => useStore.getState();

beforeEach(() => {
  // A fresh page's store, without a reload.
  useStore.setState(useStore.getInitialState(), true);
});

/** The store's index and the slices that would close the loop through it. */
const STORE_MODULES = [
  '@/daw/store',
  '@/daw/store/tracksSlice',
  '@/daw/store/prismSlice',
];

describe('loading', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    for (const path of STORE_MODULES) vi.doUnmock(path);
    vi.resetModules();
  });

  it('never loads the store', async () => {
    for (const path of STORE_MODULES) {
      vi.doMock(path, () => {
        throw new Error(`trackDefaults.ts loaded ${path}`);
      });
    }
    const fresh = await import('../trackDefaults');
    expect(fresh.initialTrackDefaults('drum-machine', 'Drums')).toMatchObject({
      instrument: 'drum-machine',
      activeEffects: ['compressor'],
    });
  });

  it('lets a page reach a slice before the store, as the practice tracks do', async () => {
    const { nextChordId } = await import('@/daw/store/prismSlice');
    const fresh = await import('@/daw/store');
    expect(typeof nextChordId()).toBe('string');
    const id = fresh.useStore
      .getState()
      .addTrack('midi', 'drum-machine', 'Drums');
    expect(fresh.useStore.getState().tracks.map((t) => t.id)).toEqual([id]);
  });

  it('is the function initialState.ts exports, the contract path', async () => {
    const [initial, defaults] = await Promise.all([
      import('../initialState'),
      import('../trackDefaults'),
    ]);
    expect(initial.initialTrackDefaults).toBe(defaults.initialTrackDefaults);
  });
});

/**
 * Each instrument a track is made of by name, with the type the editor
 * creates it as. An instrument-'none' track is only ever an imported audio
 * file, tested on its own below.
 */
const INSTRUMENTS: Record<Exclude<InstrumentType, 'none'>, TrackType> = {
  'oracle-synth': 'midi',
  'piano-sampler': 'midi',
  'electric-piano': 'midi',
  'bass-electric': 'midi',
  cello: 'midi',
  organ: 'midi',
  'tonewheel-organ': 'midi',
  soundfont: 'midi',
  'drum-machine': 'midi',
  sampler: 'midi',
  'guitar-fx': 'audio',
  'bass-fx': 'audio',
  'vocal-fx': 'audio',
};

/** A track addTrack makes, found by its id. */
function addedTrack(type: TrackType, instrument: InstrumentType, name: string) {
  const id = s().addTrack(type, instrument, name);
  const track = s().tracks.find((t) => t.id === id);
  if (!track) throw new Error(`addTrack made no ${instrument} track`);
  return track;
}

describe('initialTrackDefaults', () => {
  for (const [instrument, type] of Object.entries(INSTRUMENTS) as [
    InstrumentType,
    TrackType,
  ][]) {
    it(`${instrument}: is what addTrack makes, but for the id and colour`, () => {
      // The Timeline names a dropped instrument after itself.
      const defaults = initialTrackDefaults(instrument, instrument);
      expect(defaults.type).toBe(type);

      const track = addedTrack(type, instrument, instrument);
      expect(track).toStrictEqual({
        id: track.id,
        ...defaults,
        color: track.color,
      });
      // The same keys in the same order, so the project's JSON doesn't move.
      expect(Object.keys(track)).toEqual(['id', ...Object.keys(defaults)]);
    });
  }

  it('lets the caller set the type: an imported audio file', () => {
    const track = addedTrack('audio', 'none', 'Loop.wav');
    expect(track).toStrictEqual({
      id: track.id,
      ...initialTrackDefaults('none', 'Loop.wav'),
      type: 'audio',
      color: track.color,
    });
  });

  for (const template of PROJECT_TEMPLATES) {
    it(`${template.id}: every template track is the defaults with the template's colour`, () => {
      s().loadProjectTemplate(template.id);
      const firstMidi = template.tracks.findIndex((def) => def.type === 'midi');
      expect(s().tracks).toHaveLength(template.tracks.length);
      s().tracks.forEach((track, i) => {
        const def = template.tracks[i];
        expect(track).toStrictEqual({
          id: track.id,
          ...initialTrackDefaults(def.instrument, def.name),
          type: def.type,
          color: def.color,
          // The template arms and monitors its first MIDI track.
          ...(i === firstMidi ? { recordArmed: true, monitoring: true } : {}),
        });
      });
    });
  }

  it('starts a drum machine with its compressor on, and only a drum machine', () => {
    const drums = initialTrackDefaults('drum-machine', 'Drums');
    expect(drums.effects.compressor.enabled).toBe(true);
    expect(drums.activeEffects).toEqual(['compressor']);
    const keys = initialTrackDefaults('piano-sampler', 'Keys');
    expect(keys.effects).toEqual(DEFAULT_EFFECTS);
    expect(keys.activeEffects).toEqual([]);
  });

  it('puts a live guitar, bass or vocal track on the first input channel', () => {
    for (const instrument of ['guitar-fx', 'bass-fx', 'vocal-fx'] as const) {
      expect(initialTrackDefaults(instrument, 'Live')).toMatchObject({
        type: 'audio',
        audioInputChannel: { mode: 'mono', channel: 0 },
        recordArmed: false,
        monitoring: false,
      });
    }
    expect(initialTrackDefaults('oracle-synth', 'Lead').audioInputChannel).toBe(
      null,
    );
  });

  it('guesses the role from the name and the instrument', () => {
    expect(initialTrackDefaults('soundfont', 'Bass').trackRole).toBe('bass');
    expect(initialTrackDefaults('drum-machine', 'Beat').trackRole).toBe(
      'drums',
    );
    expect(initialTrackDefaults('oracle-synth', 'Lead').trackRole).toBe(
      'melody',
    );
    expect(initialTrackDefaults('oracle-synth', 'Track 3').trackRole).toBe(
      'auto',
    );
  });

  it('leaves out the optional fields a new track has none of', () => {
    const track = initialTrackDefaults('oracle-synth', 'Lead');
    const optional = [
      'gmProgram',
      'audioMidiSource',
      'vocalChain',
      'guitarChain',
      'drumPads',
      'drumKit',
      'bassVoice',
      'samplerSample',
      'organState',
      'presetName',
      'sends',
      'automation',
    ];
    expect(optional.filter((key) => key in track)).toEqual([]);
    expect('id' in track).toBe(false);
  });

  it('hands out fresh effects, clip lists and input channel on every call', () => {
    const first = initialTrackDefaults('guitar-fx', 'Guitar');
    const second = initialTrackDefaults('guitar-fx', 'Guitar');
    expect(second).toEqual(first);
    for (const key of [
      'effects',
      'activeEffects',
      'midiClips',
      'audioClips',
      'audioInputChannel',
    ] as const) {
      expect({ key, same: first[key] === second[key] }).toEqual({
        key,
        same: false,
      });
    }
  });
});

// ── Today's new tracks, written out ────────────────────────────────────────

/** The first palette colour: a fresh page's first track takes it. */
const FIRST_COLOUR = '#f94144';

/** What every new track starts with, whatever its instrument. */
const UNTOUCHED = {
  mute: false,
  solo: false,
  volume: 0.8,
  pan: 0,
  recordArmed: false,
  monitoring: false,
  midiInputId: null,
  audioInputId: null,
} as const;

/**
 * Three new tracks as addTrack made them before the registry, every key in
 * its order. The parity checks above compare initialTrackDefaults with
 * addTrack; once addTrack is built on it they compare it with itself, and
 * these still hold today's values: a drum machine's compressor, a live
 * input's channel, a synth's plain effects and the guessed roles.
 */
const WRITTEN_OUT: { type: TrackType; track: Omit<Track, 'id'> }[] = [
  {
    type: 'midi',
    track: {
      name: 'Drums',
      type: 'midi',
      instrument: 'drum-machine',
      color: FIRST_COLOUR,
      ...UNTOUCHED,
      audioInputChannel: null,
      effects: {
        ...DEFAULT_EFFECTS,
        compressor: { ...DEFAULT_EFFECTS.compressor, enabled: true },
      },
      activeEffects: ['compressor'],
      midiClips: [],
      audioClips: [],
      trackRole: 'drums',
    },
  },
  {
    type: 'audio',
    track: {
      name: 'Guitar',
      type: 'audio',
      instrument: 'guitar-fx',
      color: FIRST_COLOUR,
      ...UNTOUCHED,
      audioInputChannel: { mode: 'mono', channel: 0 },
      effects: DEFAULT_EFFECTS,
      activeEffects: [],
      midiClips: [],
      audioClips: [],
      trackRole: 'auto',
    },
  },
  {
    type: 'midi',
    track: {
      name: 'Lead',
      type: 'midi',
      instrument: 'oracle-synth',
      color: FIRST_COLOUR,
      ...UNTOUCHED,
      audioInputChannel: null,
      effects: DEFAULT_EFFECTS,
      activeEffects: [],
      midiClips: [],
      audioClips: [],
      trackRole: 'melody',
    },
  },
];

describe('a new track, written out', () => {
  for (const { type, track: expected } of WRITTEN_OUT) {
    it(`${expected.instrument}: holds today's values, in today's order`, () => {
      const defaults = initialTrackDefaults(expected.instrument, expected.name);
      expect(defaults).toStrictEqual(expected);
      expect(Object.keys(defaults)).toEqual(Object.keys(expected));

      // And addTrack, as the first track of a fresh page, makes just that.
      const track = addedTrack(type, expected.instrument, expected.name);
      expect(track).toStrictEqual({ id: track.id, ...expected });
      expect(Object.keys(track)).toEqual(['id', ...Object.keys(expected)]);
    });
  }
});
