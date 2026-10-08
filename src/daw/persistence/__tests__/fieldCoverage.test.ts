// @vitest-environment jsdom
/**
 * The project document registry (projectDocument/fields.ts) covers the whole
 * editor state, and its classification holds together.
 *
 * - Every data key of the store is classified, Map and Set values included,
 *   and every classified key is one the store holds. The thirteen keys
 *   milestone 1.3 deleted (decision D5) stay out of the store, and so do
 *   their actions.
 * - Every field of a real track is classified: tracks made by addTrack for
 *   each instrument, and tracks loaded from the captured v2 autosaves, which
 *   carry the optional fields a new track lacks. So is every field of their
 *   clips, notes, CC events, audio clips, chord regions, markers and return
 *   buses.
 * - Every data key of the Oracle synth store is in the patch or classified
 *   outside it.
 * - A fresh page starts each key at its registry default (decision D6), a
 *   new track starts each field at its default, and a reset returns to them.
 * - The flags agree with their scopes and with the binding decisions, and the
 *   'legacy' cloud flags are exactly what today's cloud payload carries.
 * - Every session key, every track field a save leaves out or keeps only
 *   for this person, and every synth key outside the patch says why
 *   (fieldReasons.ts), and every reason there names a classified field.
 * - The classification the codec, the resets and the save status act on is
 *   pinned key by key, so moving a key between scopes, lifetimes or cloud
 *   formats is a deliberate edit here too.
 *
 * The types do the first check at build time (an unclassified key fails tsc);
 * this file checks the running stores, which also hold keys no type names.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/fieldCoverage.test.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useStore } from '@/daw/store';
import type { InstrumentType, Track, TrackType } from '@/daw/store/tracksSlice';
import {
  AUDIO_CLIP_FIELDS,
  CC_EVENT_FIELDS,
  CHORD_REGION_FIELDS,
  DOC_CONTENT_KEYS,
  DOC_KEYS,
  DROP_KEYS,
  FIELD_GROUPS,
  LOCAL_KEYS,
  MARKER_FIELDS,
  MIDI_CLIP_FIELDS,
  NOTE_EVENT_FIELDS,
  ORACLE_NON_PATCH_FIELDS,
  ORACLE_PATCH_FIELD,
  PREF_KEYS,
  RESET_ON_NEW_KEYS,
  RETURN_BUS_FIELDS,
  SESSION_KEYS,
  STORE_FIELDS,
  TRACK_DOC_FIELDS,
  TRACK_FIELDS,
  TRACK_PER_USER_FIELDS,
  USER_PREF_KEYS,
  VIEW_KEYS,
  fieldDefault,
  trackFieldDefault,
  type FieldSpec,
  type StoreDataKey,
} from '../projectDocument/fields';
import {
  NESTED_FIELD_REASONS,
  ORACLE_NON_PATCH_REASONS,
  STORE_FIELD_REASONS,
  TRACK_FIELD_REASONS,
} from '../projectDocument/fieldReasons';
import {
  leaveAProjectBehind,
  same,
} from '../projectDocument/__tests__/projectLeftBehind';
import {
  deserializeSession,
  resetSessionToEmpty,
  serializeSession,
  serializeSessionForCloud,
  type SessionData,
} from '../SessionSerializer';

const s = () => useStore.getState();

/** A fresh page's store, without a reload. */
const resetStore = () => useStore.setState(useStore.getInitialState(), true);

/** The keys of a store state that hold data rather than actions. */
const dataKeysOf = (state: object): string[] =>
  Object.entries(state)
    .filter(([, value]) => typeof value !== 'function')
    .map(([key]) => key);

/** The keys among `keys` that `specs` doesn't classify, sorted, once each. */
const unclassified = (keys: Iterable<string>, specs: object): string[] =>
  [...new Set(keys)].filter((key) => !(key in specs)).sort();

const storeKeys = Object.keys(STORE_FIELDS) as StoreDataKey[];
const spec = (key: StoreDataKey): FieldSpec => STORE_FIELDS[key];
/** The classified keys a slice is meant to declare: all but any on its way out. */
const liveKeys = storeKeys.filter((key) => spec(key).scope !== 'drop');
const trackKeys = Object.keys(TRACK_FIELDS) as (keyof Track)[];

/** A nested spec's default, made fresh when it is a factory. */
const defaultOf = <T>(f: FieldSpec<T>): T =>
  typeof f.default === 'function' ? (f.default as () => T)() : f.default;

/** Every spec in the registry, named for failure messages. */
const ALL_SPECS: [string, FieldSpec][] = [
  ...storeKeys.map((k) => [k, STORE_FIELDS[k]] as [string, FieldSpec]),
  ...trackKeys.map(
    (k) => [`Track.${k}`, TRACK_FIELDS[k]] as [string, FieldSpec],
  ),
  ...Object.entries({
    MidiClip: MIDI_CLIP_FIELDS,
    MidiNoteEvent: NOTE_EVENT_FIELDS,
    MidiCCEvent: CC_EVENT_FIELDS,
    AudioClip: AUDIO_CLIP_FIELDS,
    ChordRegion: CHORD_REGION_FIELDS,
    Marker: MARKER_FIELDS,
    ReturnBus: RETURN_BUS_FIELDS,
  }).flatMap(([type, specs]) =>
    Object.entries(specs).map(
      ([k, v]) => [`${type}.${k}`, v] as [string, FieldSpec],
    ),
  ),
];

// ── Store keys ─────────────────────────────────────────────────────────────

/**
 * The dead state milestone 1.3 deleted (decision D5): keys no control wrote
 * and nothing read, and the actions that wrote them. None may come back
 * without a classification and a reader; the collab doc keeps the mastering
 * macros' keys for older peers, never the store.
 */
const DELETED_IN_1_3 = {
  keys: [
    'pitchData',
    'theme',
    'editingAudioClipId',
    'editingAudioClipTrackId',
    'masteringStyle',
    'masteringEq',
    'masteringPresence',
    'masteringDeEsser',
    'masteringLoudness',
    'masteringStereoField',
    'masteringDynamics',
    'masteringAmount',
    'melodyOverrides',
  ],
  actions: [
    'setPitchSegments',
    'addPitchEdit',
    'removePitchEdit',
    'clearPitchEdits',
    'setTheme',
    'setEditingAudioClip',
    'setMasteringStyle',
    'setMasteringEq',
    'setMasteringPresence',
    'setMasteringDeEsser',
    'setMasteringLoudness',
    'setMasteringStereoField',
    'setMasteringDynamics',
    'setMasteringAmount',
  ],
} as const;

describe('store keys', () => {
  beforeEach(resetStore);

  it('classifies every data key the store holds, Map and Set values too', () => {
    const state = s();
    expect(state.remoteUsers).toBeInstanceOf(Map);
    expect(state.hwActiveNotes).toBeInstanceOf(Set);
    expect(unclassified(dataKeysOf(state), STORE_FIELDS)).toEqual([]);
  });

  it('classifies only keys the store holds', () => {
    const held = new Set(dataKeysOf(s()));
    expect(liveKeys.filter((key) => !held.has(key))).toEqual([]);
  });

  it('classifies no action', () => {
    const state = s() as unknown as Record<string, unknown>;
    expect(storeKeys.filter((key) => typeof state[key] === 'function')).toEqual(
      [],
    );
  });

  it('holds none of the state milestone 1.3 deleted, and classifies none', () => {
    const state = s() as unknown as Record<string, unknown>;
    const back = [...DELETED_IN_1_3.keys, ...DELETED_IN_1_3.actions].filter(
      (key) => key in state || key in STORE_FIELDS,
    );
    expect(back).toEqual([]);
  });
});

// ── Tracks ─────────────────────────────────────────────────────────────────

/** Each instrument, with the track type the app creates it as. */
const INSTRUMENTS: Record<InstrumentType, TrackType> = {
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
  none: 'midi',
};

describe('a new track', () => {
  beforeEach(resetStore);

  for (const [instrument, type] of Object.entries(INSTRUMENTS) as [
    InstrumentType,
    TrackType,
  ][]) {
    it(`${instrument}: every field is classified and starts at its default`, () => {
      // The Timeline names a dropped instrument after itself.
      const ctx = { instrument, name: instrument };
      const id = s().addTrack(type, instrument, ctx.name);
      const track = s().tracks.find((t) => t.id === id);
      if (!track) throw new Error(`addTrack made no ${instrument} track`);

      expect(unclassified(Object.keys(track), TRACK_FIELDS)).toEqual([]);
      expect(trackFieldDefault('type', ctx)).toBe(type);
      for (const key of trackKeys) {
        const expected = trackFieldDefault(key, ctx);
        if (expected !== undefined) expect(Object.keys(track)).toContain(key);
        // The id is minted and the colour comes from the palette in turn.
        if (key === 'id' || key === 'color') continue;
        expect({ key, value: track[key] }).toEqual({ key, value: expected });
      }
    });
  }

  it('gives a track of no particular instrument plain defaults', () => {
    expect(trackFieldDefault('type')).toBe('midi');
    expect(trackFieldDefault('audioInputChannel')).toBeNull();
    expect(trackFieldDefault('activeEffects')).toEqual([]);
    expect(trackFieldDefault('trackRole')).toBe('auto');
    expect(trackFieldDefault('effects').compressor.enabled).toBe(false);
  });
});

// ── The captured autosaves ─────────────────────────────────────────────────

const FIXTURE_ROOT = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures',
);

/** Each v2 dialect's autosaves, parsed. */
function fixtures(folder: string): { name: string; session: SessionData }[] {
  return readdirSync(join(FIXTURE_ROOT, folder))
    .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
    .sort()
    .map((file) => ({
      name: `${folder}/${file}`,
      session: JSON.parse(
        readFileSync(join(FIXTURE_ROOT, folder, file), 'utf8'),
      ) as SessionData,
    }));
}

/** Every field name the open project uses, by the type that holds it. */
function fieldsInUse() {
  const st = s();
  const seen = {
    Track: new Set<string>(),
    MidiClip: new Set<string>(),
    MidiNoteEvent: new Set<string>(),
    MidiCCEvent: new Set<string>(),
    AudioClip: new Set<string>(),
    ChordRegion: new Set<string>(),
    Marker: new Set<string>(),
    ReturnBus: new Set<string>(),
  };
  const add = (into: Set<string>, value: object) =>
    Object.keys(value).forEach((key) => into.add(key));
  for (const track of st.tracks) {
    add(seen.Track, track);
    for (const clip of track.midiClips) {
      add(seen.MidiClip, clip);
      clip.events.forEach((event) => add(seen.MidiNoteEvent, event));
      clip.ccEvents?.forEach((event) => add(seen.MidiCCEvent, event));
    }
    track.audioClips.forEach((clip) => add(seen.AudioClip, clip));
  }
  st.chordRegions.forEach((region) => add(seen.ChordRegion, region));
  st.markers.forEach((marker) => add(seen.Marker, marker));
  st.returns.forEach((bus) => add(seen.ReturnBus, bus));
  return seen;
}

/** Where each type's fields are classified. */
const SPECS_BY_TYPE = {
  Track: TRACK_FIELDS,
  MidiClip: MIDI_CLIP_FIELDS,
  MidiNoteEvent: NOTE_EVENT_FIELDS,
  MidiCCEvent: CC_EVENT_FIELDS,
  AudioClip: AUDIO_CLIP_FIELDS,
  ChordRegion: CHORD_REGION_FIELDS,
  Marker: MARKER_FIELDS,
  ReturnBus: RETURN_BUS_FIELDS,
} as const;

/** The optional Track fields the captured autosaves carry between them. */
const OPTIONAL_TRACK_FIELDS_SAVED = [
  'gmProgram',
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

describe('projects loaded from the captured autosaves', () => {
  for (const folder of ['v2', 'v2-1.2']) {
    it(`${folder}: every field of every entry is classified`, () => {
      const outside: string[] = [];
      const tracksSeen = new Set<string>();
      for (const { name, session } of fixtures(folder)) {
        resetStore();
        expect(deserializeSession(session), name).toBe(true);
        const seen = fieldsInUse();
        seen.Track.forEach((key) => tracksSeen.add(key));
        for (const [type, keys] of Object.entries(seen)) {
          const specs = SPECS_BY_TYPE[type as keyof typeof SPECS_BY_TYPE];
          for (const key of unclassified(keys, specs)) {
            outside.push(`${name}: ${type}.${key}`);
          }
        }
      }
      expect(outside).toEqual([]);
      // The check above means something only if the saves hold the optional
      // fields a new track lacks.
      expect([...tracksSeen]).toEqual(
        expect.arrayContaining(OPTIONAL_TRACK_FIELDS_SAVED),
      );
    });
  }

  // A decoder fills a field an older save lacks with the plain default
  // (trackFieldDefault without a context), never a new track's: with that,
  // an old drum machine would come back with its compressor on, a live track
  // on an input channel nobody chose, and every role guessed and frozen.
  it("fills what an older save lacks with the plain default, not a new track's", () => {
    const save = fixtures('v2').find(({ name }) =>
      name.endsWith('/kitchen-sink.json'),
    );
    if (!save) throw new Error('the v2 kitchen sink is missing');
    // The v2 saves predate trackRole and audioInputChannel. Take the effects
    // away too, as a save from before they were kept.
    const older = structuredClone(save.session);
    for (const track of older.data.tracks) {
      delete track.activeEffects;
      if (track.settings) delete track.settings.effects;
    }
    resetStore();
    expect(deserializeSession(older)).toBe(true);

    const backfilled = [
      'audioInputChannel',
      'trackRole',
      'effects',
      'activeEffects',
    ] as const;
    for (const track of s().tracks) {
      for (const key of backfilled) {
        const { instrument } = track;
        expect({ instrument, key, value: track[key] }).toEqual({
          instrument,
          key,
          value: trackFieldDefault(key),
        });
      }
    }
    // The save holds the instruments whose new-track defaults differ, so the
    // check means something.
    expect(s().tracks.map((t) => t.instrument)).toEqual(
      expect.arrayContaining(['drum-machine', 'guitar-fx', 'vocal-fx']),
    );
  });
});

// ── Nested entries made by the editor ──────────────────────────────────────

describe('entries the editor makes', () => {
  beforeEach(resetStore);

  it('classifies every field of clips, notes, takes, chords and markers', () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'clip-keys',
      name: 'Verse',
      startTick: 0,
      durationTicks: 7680,
      events: [
        {
          note: 60,
          velocity: 90,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
      ccEvents: [{ tick: 0, controller: 64, value: 127, channel: 0 }],
    });
    const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
    s().addAudioClip(guitar, {
      id: 'take-1',
      startTick: 0,
      duration: 1920,
      fadeInTicks: 10,
      fadeOutTicks: 20,
      assetId: 'asset-1',
      offsetSeconds: 0.5,
      gain: 0.9,
    });
    s().insertChordRegion(0, '1 maj', 'C maj');
    s().addMarker(1920, 'Verse');

    const seen = fieldsInUse();
    for (const [type, keys] of Object.entries(seen)) {
      const specs = SPECS_BY_TYPE[type as keyof typeof SPECS_BY_TYPE];
      expect({ type, outside: unclassified(keys, specs) }).toEqual({
        type,
        outside: [],
      });
    }
    // Every kind of entry was made, so the loop checked each.
    expect(Object.values(seen).every((keys) => keys.size > 0)).toBe(true);
  });

  it('makes them with the registry defaults', () => {
    s().insertChordRegion(0, '1 maj', 'C maj');
    s().addMarker(1920, 'Verse');
    const [region] = s().chordRegions;
    const [marker] = s().markers;
    expect(region.color).toEqual(defaultOf(CHORD_REGION_FIELDS.color));
    expect(marker.color).toBe(defaultOf(MARKER_FIELDS.color));
    expect(s().returns.map((bus) => bus.id)).toEqual(['A', 'B']);
  });
});

// ── Defaults ───────────────────────────────────────────────────────────────

// selectedTrackId was the last to come round: its slice started at
// 'demo-chords', a track no project has, until milestone 1.3 (D6).
describe('a fresh page starts every key at its registry default (D6)', () => {
  const initial = useStore.getInitialState();
  for (const key of liveKeys) {
    it(key, () => {
      expect(initial[key]).toEqual(fieldDefault(key));
    });
  }
});

/** Whether the store holds `key` at its registry default (Map and Set too). */
function atDefault(key: StoreDataKey): boolean {
  const state = s() as unknown as Record<string, unknown>;
  return same(state[key], fieldDefault(key));
}

describe('a reset returns to the registry defaults', () => {
  beforeEach(resetStore);

  it('runs over a project where every reset key has changed', () => {
    leaveAProjectBehind(RESET_ON_NEW_KEYS);
    expect(() => resetSessionToEmpty()).not.toThrow();
  });

  // Before milestone 1.3 the reset kept two lists by hand, and they missed 34
  // of these keys (the loop, the count-in and the takes in progress, the
  // Prism builder's strum, tilt and filter, the clip colours, the selected
  // track, zoom and tool among them). It runs through resetProjectState now.
  it('puts every resetOnNew key back to its default', () => {
    leaveAProjectBehind(RESET_ON_NEW_KEYS);
    // Every key starts off its default, so the reset is what moves it back.
    expect(RESET_ON_NEW_KEYS.filter(atDefault)).toEqual([]);
    resetSessionToEmpty();
    expect(RESET_ON_NEW_KEYS.filter((key) => !atDefault(key))).toEqual([]);
  });

  it('leaves prefs, collab, devices and the clipboard alone', () => {
    const outlivers = storeKeys.filter(
      (key) =>
        spec(key).scope === 'pref' ||
        ['collab', 'devices'].includes(spec(key).group) ||
        key === 'clipboardClips' ||
        key === 'clipboardAudioClip',
    );
    expect(outlivers.filter((key) => RESET_ON_NEW_KEYS.includes(key))).toEqual(
      [],
    );
  });
});

describe('defaults', () => {
  it('makes every object or array default a factory', () => {
    const shared = ALL_SPECS.filter(
      ([, f]) => f.default !== null && typeof f.default === 'object',
    ).map(([name]) => name);
    expect(shared).toEqual([]);
  });

  it('hands out a fresh copy on every call', () => {
    for (const key of storeKeys) {
      const first = fieldDefault(key);
      if (first === null || typeof first !== 'object') continue;
      const second = fieldDefault(key);
      expect({ key, same: first === second }).toEqual({ key, same: false });
      expect(second).toEqual(first);
    }
    for (const key of trackKeys) {
      const ctx = { instrument: 'drum-machine' as const, name: 'Drums' };
      const first = trackFieldDefault(key, ctx);
      if (first === null || typeof first !== 'object') continue;
      expect(trackFieldDefault(key, ctx)).not.toBe(first);
    }
  });
});

// ── Flags ──────────────────────────────────────────────────────────────────

describe('the classification', () => {
  const said = (reason: string | undefined) => (reason?.trim() ?? '') !== '';

  it('gives every session and drop key a reason', () => {
    const silent = storeKeys.filter(
      (key) =>
        (spec(key).scope === 'session' || spec(key).scope === 'drop') &&
        !said(STORE_FIELD_REASONS[key]),
    );
    expect(silent).toEqual([]);
  });

  it('gives every track field no save keeps, or kept per user, a reason', () => {
    const silent = trackKeys.filter(
      (key) =>
        (TRACK_FIELDS[key].scope === 'session' || TRACK_FIELDS[key].perUser) &&
        !said(TRACK_FIELD_REASONS[key]),
    );
    expect(silent).toEqual([]);
  });

  // The registry's prose lives apart from it (fieldReasons.ts), so it stays
  // out of the bundle every page loads; the types keep its keys to fields
  // that exist, and this keeps them to fields that are classified.
  it('gives reasons only for classified fields, never an empty one', () => {
    const stray: string[] = [];
    const check = (
      type: string,
      reasons: Readonly<Record<string, string | undefined>>,
      specs: object,
    ) => {
      for (const [key, reason] of Object.entries(reasons)) {
        if (!(key in specs) || !said(reason)) stray.push(`${type}.${key}`);
      }
    };
    check('store', STORE_FIELD_REASONS, STORE_FIELDS);
    check('Track', TRACK_FIELD_REASONS, TRACK_FIELDS);
    check('MidiClip', NESTED_FIELD_REASONS.MidiClip, MIDI_CLIP_FIELDS);
    check(
      'MidiNoteEvent',
      NESTED_FIELD_REASONS.MidiNoteEvent,
      NOTE_EVENT_FIELDS,
    );
    check('MidiCCEvent', NESTED_FIELD_REASONS.MidiCCEvent, CC_EVENT_FIELDS);
    check('AudioClip', NESTED_FIELD_REASONS.AudioClip, AUDIO_CLIP_FIELDS);
    check('ChordRegion', NESTED_FIELD_REASONS.ChordRegion, CHORD_REGION_FIELDS);
    check('Marker', NESTED_FIELD_REASONS.Marker, MARKER_FIELDS);
    check('ReturnBus', NESTED_FIELD_REASONS.ReturnBus, RETURN_BUS_FIELDS);
    check('synth', ORACLE_NON_PATCH_REASONS, ORACLE_NON_PATCH_FIELDS);
    expect(stray).toEqual([]);
  });

  it('keeps the prose out of the registry the store loads', () => {
    const withProse = ALL_SPECS.filter(([, f]) => 'reason' in f).map(
      ([name]) => name,
    );
    expect(withProse).toEqual([]);
  });

  it('keeps every pref per user and out of resets', () => {
    for (const key of PREF_KEYS) {
      expect({ key, perUser: spec(key).perUser }).toEqual({
        key,
        perUser: true,
      });
      expect({ key, resetOnNew: spec(key).resetOnNew }).toEqual({
        key,
        resetOnNew: false,
      });
    }
  });

  it('settles the flags each scope implies', () => {
    // Saved: doc in the draft and with the project, view in the draft only.
    // Never saved, shared or undone: pref (kept per user instead), session
    // and drop. Only a per-user track field is view and per user at once.
    const offScope = ALL_SPECS.filter(([, f]) => {
      const unsaved = !f.local && f.cloud === false && !f.collab && !f.undo;
      switch (f.scope) {
        case 'doc':
          return !f.local || f.perUser || !f.resetOnNew;
        case 'view':
          return (
            !f.local || f.cloud !== false || f.collab || f.undo || !f.resetOnNew
          );
        case 'pref':
          return !unsaved || !f.perUser || f.resetOnNew;
        case 'session':
          return !unsaved || f.perUser;
        case 'drop':
          return !unsaved || f.perUser || f.resetOnNew;
        default:
          return true;
      }
    }).map(([name]) => name);
    expect(offScope).toEqual([]);
  });

  it('names a known group for every field', () => {
    const groups: readonly string[] = FIELD_GROUPS;
    const unknownGroup = ALL_SPECS.filter(
      ([, f]) => !groups.includes(f.group),
    ).map(([name, f]) => `${name}: ${f.group}`);
    expect(unknownGroup).toEqual([]);
    expect(groups).toContain(ORACLE_PATCH_FIELD.group);
  });

  it('lists every key in exactly one scope', () => {
    const lists = [DOC_KEYS, VIEW_KEYS, PREF_KEYS, SESSION_KEYS, DROP_KEYS];
    expect(lists.flat().sort()).toEqual([...storeKeys].sort());
    // A track field is document content or this person's own, but for the
    // Guitar/Bass-to-MIDI binding, which no save keeps.
    const trackSession = trackKeys.filter(
      (key) => TRACK_FIELDS[key].scope === 'session',
    );
    expect(trackSession).toEqual(['audioMidiSource']);
    expect(
      [...TRACK_DOC_FIELDS, ...TRACK_PER_USER_FIELDS, ...trackSession].sort(),
    ).toEqual([...trackKeys].sort());
  });

  it('puts exactly the doc and view keys in the draft', () => {
    expect([...LOCAL_KEYS].sort()).toEqual([...DOC_KEYS, ...VIEW_KEYS].sort());
  });

  it('has no key on its way out: 1.3 deleted the ones it found', () => {
    expect(DROP_KEYS).toEqual([]);
  });
});

// ── The Oracle synth store ─────────────────────────────────────────────────

describe('the Oracle synth store', () => {
  const patch: readonly string[] = ORACLE_PATCH_FIELD.keys;
  const outside = ORACLE_NON_PATCH_FIELDS as Readonly<
    Record<string, { scope: string }>
  >;
  const why = ORACLE_NON_PATCH_REASONS as Readonly<Record<string, string>>;

  it('puts every data key in the patch or gives it a reason to stay out', () => {
    const keys = dataKeysOf(useSynthStore.getState());
    expect(useSynthStore.getState().activeNotes).toBeInstanceOf(Set);
    expect(
      keys.filter((key) => !patch.includes(key) && !(key in outside)),
    ).toEqual([]);
    expect(patch.filter((key) => !keys.includes(key))).toEqual([]);
    expect(Object.keys(outside).filter((key) => !keys.includes(key))).toEqual(
      [],
    );
  });

  it('keeps the two lists apart, and every key outside the patch unsaved', () => {
    expect(patch.filter((key) => key in outside)).toEqual([]);
    const off = Object.entries(outside)
      .filter(
        ([key, f]) =>
          !['pref', 'session'].includes(f.scope) || !why[key]?.trim(),
      )
      .map(([key]) => key);
    expect(off).toEqual([]);
    // The presets a student saves follow them; the rest is the moment's.
    expect(
      Object.keys(outside).filter((key) => outside[key].scope === 'pref'),
    ).toEqual(['userPresets']);
  });
});

// ── The binding decisions ──────────────────────────────────────────────────

describe('decision D5', () => {
  it('makes these, and only these, per-user prefs', () => {
    expect([...PREF_KEYS].sort()).toEqual(
      [
        'metronomeEnabled',
        'countInBars',
        'timelineSnapEnabled',
        'timelineGridSize',
        'timelineTripletMode',
        'chordRulerShowNotes',
        'inputDeviceId',
        'inputChannelCountOverride',
      ].sort(),
    );
    // The two device keys keep their own storage, apart from the user prefs.
    expect([...USER_PREF_KEYS].sort()).toEqual(
      PREF_KEYS.filter(
        (key) => key !== 'inputDeviceId' && key !== 'inputChannelCountOverride',
      ).sort(),
    );
  });

  it('keeps this view state with the project, on this device', () => {
    expect([...VIEW_KEYS].sort()).toEqual(
      [
        'position',
        'loopEnabled',
        'currentView',
        'libraryOpen',
        'channelStripTab',
        'timelineZoom',
        'timelineScrollLeft',
        'selectedTrackId',
        'automationOpenTrackId',
        'automationParamId',
        'masteringBypass',
      ].sort(),
    );
    expect([...TRACK_PER_USER_FIELDS].sort()).toEqual(
      [
        'recordArmed',
        'monitoring',
        'midiInputId',
        'audioInputId',
        'audioInputChannel',
      ].sort(),
    );
    for (const key of TRACK_PER_USER_FIELDS) {
      expect({ key, scope: TRACK_FIELDS[key].scope }).toEqual({
        key,
        scope: 'view',
      });
    }
  });

  // D5 listed it with the per-user view fields. It stays session-only, as
  // decided when Guitar/Bass-to-MIDI was built (1.3 integration item 11).
  it('keeps the Guitar/Bass-to-MIDI binding out of every save', () => {
    const { scope, local, cloud, collab, undo, perUser } =
      TRACK_FIELDS.audioMidiSource;
    expect({ scope, local, cloud, collab, undo, perUser }).toEqual({
      scope: 'session',
      local: false,
      cloud: false,
      collab: false,
      undo: false,
      perUser: false,
    });
    expect(TRACK_FIELD_REASONS.audioMidiSource).toMatch(/session-only/);
  });

  it('lets a refresh drop the binding while keeping the track', () => {
    resetStore();
    const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
    const synth = s().addTrack('midi', 'oracle-synth', 'Lead');
    s().updateTrack(synth, {
      audioMidiSource: { enabled: true, sourceTrackId: guitar, mode: 'mono' },
    });
    const draft = serializeSession();
    expect(JSON.stringify(draft)).not.toContain('audioMidiSource');

    resetStore();
    expect(deserializeSession(draft)).toBe(true);
    const lead = s().tracks.find((t) => t.name === 'Lead');
    expect(lead).toBeDefined();
    expect(lead).not.toHaveProperty('audioMidiSource');
  });

  it('adds these to the document', () => {
    const added: StoreDataKey[] = [
      'timeSignatureNumerator',
      'timeSignatureDenominator',
      'markers',
      'masterVolume',
      'masteringFxChain',
      'masteringEffects',
      'masterAutomation',
      'stringSeq',
      'chordSeq',
      'strumMode',
      'strumAmount',
      'tiltMode',
      'tiltAmount',
      'filterPercent',
      'chordRecordMode',
      'rootLocked',
      'clipColorMode',
      'measuresPerLine',
      'measureRowSizes',
      'measureRestMap',
      'measureFermatas',
      'leadSheetChordFormat',
      'leadSheetSections',
      'leadSheetRepeats',
      'leadSheetShowRepeats',
      'leadSheetShowMelody',
      'leadSheetMelodyTrackId',
      'scoreChordTracks',
      'scoreChordHidden',
      'scoreArticulations',
      'scoreSlurs',
      'scoreSpellings',
      'scoreSlashNotes',
      'scoreSystemBreaks',
      'scorePageBreaks',
      'scoreSystemRuns',
      'scoreTextMarks',
    ];
    expect(added.filter((key) => !DOC_KEYS.includes(key))).toEqual([]);
    expect(MIDI_CLIP_FIELDS.durationTicks.local).toBe(true);
    expect(MIDI_CLIP_FIELDS.ccEvents.local).toBe(true);
    expect(NOTE_EVENT_FIELDS.id.local).toBe(true);
  });

  it('shares the Prism builder but keeps it out of undo', () => {
    for (const key of [
      'stringSeq',
      'chordSeq',
      'strumMode',
      'strumAmount',
      'tiltMode',
      'tiltAmount',
      'filterPercent',
    ] as const) {
      expect({ key, collab: spec(key).collab, undo: spec(key).undo }).toEqual({
        key,
        collab: true,
        undo: false,
      });
    }
  });

  it('saves the key lock unshared, and shares the chord record mode', () => {
    const sync = (key: StoreDataKey) => {
      const { scope, collab, undo } = spec(key);
      return { key, scope, collab, undo };
    };
    expect(sync('rootLocked')).toEqual({
      key: 'rootLocked',
      scope: 'doc',
      collab: false,
      undo: false,
    });
    // D5's "not shared in collab" is the key lock's. The record mode guards
    // the chord lane everyone in a room shares, so it is shared like the
    // rest of the Prism settings, and outside undo like them.
    expect(sync('chordRecordMode')).toEqual({
      key: 'chordRecordMode',
      scope: 'doc',
      collab: true,
      undo: false,
    });
  });

  it('saves mute and solo, and lets each collaborator set their own', () => {
    for (const key of ['mute', 'solo'] as const) {
      const f = TRACK_FIELDS[key];
      expect({ key, scope: f.scope, cloud: f.cloud, collab: f.collab }).toEqual(
        { key, scope: 'doc', cloud: 'legacy', collab: false },
      );
      expect(TRACK_DOC_FIELDS).toContain(key);
    }
  });

  it('derives the key colour and resets the tool', () => {
    expect(spec('rootTrackColor').scope).toBe('session');
    expect(spec('activeTool').scope).toBe('session');
    expect(spec('activeTool').resetOnNew).toBe(true);
    expect(fieldDefault('activeTool')).toBe('cursor');
  });

  it('starts the rhythm at Whole Notes and selects no track (D6)', () => {
    expect(fieldDefault('rhythmName')).toBe('Whole Notes');
    expect(fieldDefault('selectedTrackId')).toBeNull();
  });
});

// ── The classification, key by key ─────────────────────────────────────────
//
// The codec writes LOCAL_KEYS, initialProjectState resets RESET_ON_NEW_KEYS
// and the save status counts 'document' fields as what a legacy cloud save
// leaves out, so a one-word edit to a spec changes what a refresh keeps, what
// a new project inherits and whether kept work is kept. These pin each list.

/** The names of `specs`' fields that `test` picks, sorted. */
const namesWhere = (
  specs: Readonly<Record<string, FieldSpec>>,
  test: (f: FieldSpec) => boolean,
): string[] =>
  Object.keys(specs)
    .filter((key) => test(specs[key]))
    .sort();

describe('the classification, key by key', () => {
  it('puts exactly these keys in the project document', () => {
    expect([...DOC_KEYS].sort()).toEqual(
      [
        // meta and transport
        'projectId',
        'projectName',
        'composerName',
        'bpm',
        'timeSignatureNumerator',
        'timeSignatureDenominator',
        'loopStart',
        'loopEnd',
        // tracks and harmony
        'tracks',
        'rootNote',
        'mode',
        'rhythmName',
        'genre',
        'swing',
        'rootLocked',
        'chordRegions',
        // the Prism builder
        'chordSeq',
        'stringSeq',
        'strumMode',
        'strumAmount',
        'tiltMode',
        'tiltAmount',
        'filterPercent',
        'chordRecordMode',
        // notation
        'measuresPerLine',
        'measureRowSizes',
        'measureRestMap',
        'measureFermatas',
        'leadSheetChordFormat',
        'leadSheetSections',
        'leadSheetRepeats',
        'leadSheetShowRepeats',
        'leadSheetShowMelody',
        'leadSheetMelodyTrackId',
        'scoreChordTracks',
        'scoreChordHidden',
        'scoreArticulations',
        'scoreSlurs',
        'scoreSpellings',
        'scoreSlashNotes',
        'scoreSystemBreaks',
        'scorePageBreaks',
        'scoreSystemRuns',
        'scoreTextMarks',
        // markers, mixer and clip colours
        'markers',
        'masterVolume',
        'masteringFxChain',
        'masteringEffects',
        'masterAutomation',
        'returns',
        'clipColorMode',
      ].sort(),
    );
  });

  it('counts every doc key but the cloud link as content', () => {
    expect(DOC_KEYS.filter((key) => !DOC_CONTENT_KEYS.includes(key))).toEqual([
      'projectId',
    ]);
    expect(DOC_CONTENT_KEYS.filter((key) => !DOC_KEYS.includes(key))).toEqual(
      [],
    );
  });

  it('keeps only the cloud link and audio clip ids out of the cloud copy', () => {
    const notInCloud = ALL_SPECS.filter(
      ([, f]) => f.scope === 'doc' && f.cloud === false,
    ).map(([name]) => name);
    expect(notInCloud.sort()).toEqual(['AudioClip.id', 'projectId']);
  });

  it('leaves exactly these nested fields to the 1.5 document', () => {
    const documentOnly = Object.fromEntries(
      Object.entries(SPECS_BY_TYPE).map(([type, specs]) => [
        type,
        namesWhere(specs, (f) => f.cloud === 'document'),
      ]),
    );
    expect(documentOnly).toEqual({
      Track: [],
      MidiClip: ['ccEvents', 'durationTicks'],
      MidiNoteEvent: ['id'],
      MidiCCEvent: Object.keys(CC_EVENT_FIELDS).sort(),
      AudioClip: [],
      ChordRegion: Object.keys(CHORD_REGION_FIELDS).sort(),
      Marker: Object.keys(MARKER_FIELDS).sort(),
      ReturnBus: [],
    });
  });

  it('carries only these session keys from one project to the next', () => {
    const carried = SESSION_KEYS.filter((key) => !spec(key).resetOnNew);
    expect([...carried].sort()).toEqual(
      [
        // live input and constants
        'hwActiveNotes',
        'audioActiveNotes',
        'availableFirstChords',
        'globalTuningCents',
        // devices
        'inputs',
        'outputs',
        'midiStatus',
        'outputDeviceId',
        'inputDeviceChannelCount',
        'outputDeviceChannelCount',
        'inputDetectedChannelCount',
        'enabledMonoInputs',
        'enabledStereoInputs',
        'enabledMonoOutputs',
        'enabledStereoOutputs',
        // the clipboard and panels
        'clipboardClips',
        'clipboardAudioClip',
        'userListOpen',
        'chatPanelOpen',
        'settingsOpen',
        // the collaboration room
        'isCollabActive',
        'roomId',
        'roomCode',
        'connectionStatus',
        'remoteUsers',
        'localRole',
        'collabRole',
        'leavePromptPending',
        'roomError',
        'kickedNotice',
        'awaitingSessionCreation',
        'sessionSaved',
        'sessionStartedEmpty',
        'sessionDraftProjectId',
        'inviteRequested',
        'chatMessages',
        'unreadChatCount',
      ].sort(),
    );
  });

  it('shares and undoes the document as intended for 1.9 and 1.14', () => {
    const docSpecs = Object.fromEntries(
      DOC_KEYS.map((key) => [key, spec(key)]),
    );
    const trackDocSpecs = Object.fromEntries(
      TRACK_DOC_FIELDS.map((key) => [key, TRACK_FIELDS[key] as FieldSpec]),
    );
    // Each collaborator sets their own: the link, the loop region and the key
    // lock; on a track, mute and solo.
    expect(namesWhere(docSpecs, (f) => !f.collab)).toEqual(
      ['projectId', 'loopStart', 'loopEnd', 'rootLocked'].sort(),
    );
    expect(namesWhere(trackDocSpecs, (f) => !f.collab)).toEqual([
      'mute',
      'solo',
    ]);
    // Outside the project undo: the link and the names, the loop region, the
    // key lock, the Prism settings and builder, and the lead sheet's display
    // settings.
    expect(namesWhere(docSpecs, (f) => !f.undo)).toEqual(
      [
        'projectId',
        'projectName',
        'composerName',
        'loopStart',
        'loopEnd',
        'rhythmName',
        'genre',
        'swing',
        'rootLocked',
        'chordSeq',
        'stringSeq',
        'strumMode',
        'strumAmount',
        'tiltMode',
        'tiltAmount',
        'filterPercent',
        'chordRecordMode',
        'leadSheetChordFormat',
        'leadSheetShowRepeats',
        'leadSheetShowMelody',
        'leadSheetMelodyTrackId',
      ].sort(),
    );
    expect(namesWhere(trackDocSpecs, (f) => !f.undo)).toEqual(['mute', 'solo']);
  });
});

// ── The cloud flags against today's payload ────────────────────────────────

/** Where each store key the legacy payload carries sits in it. */
const STORE_IN_PAYLOAD: Partial<Record<StoreDataKey, string>> = {
  projectName: 'name',
  composerName: 'composerName',
  bpm: 'bpm',
  rootNote: 'prism.rootNote',
  rhythmName: 'prism.rhythmName',
  genre: 'prism.genre',
  swing: 'prism.swing',
  returns: 'returns',
  tracks: 'tracks',
  // Rides on the first track's settings: the API has no field for it.
  masterAutomation: 'tracks.0.settings.masterAutomation',
};

/** The payload's own fields for a track, its settings, clips and buses. */
const TRACK_IN_PAYLOAD: Record<string, string> = {
  name: 'name',
  type: 'type',
  instrument: 'instrument',
  color: 'color',
  mute: 'mute',
  solo: 'solo',
  volume: 'volume',
  pan: 'pan',
  activeEffects: 'activeEffects',
  midiClips: 'midiClips',
  audioClips: 'audioClips',
  'settings.sourceTrackId': 'id',
  'settings.gmProgram': 'gmProgram',
  'settings.effects': 'effects',
  'settings.vocalChain': 'vocalChain',
  'settings.guitarChain': 'guitarChain',
  'settings.drumPads': 'drumPads',
  'settings.drumKit': 'drumKit',
  'settings.bassVoice': 'bassVoice',
  'settings.samplerSample': 'samplerSample',
  'settings.organState': 'organState',
  'settings.presetName': 'presetName',
  'settings.sends': 'sends',
  'settings.automation': 'automation',
  'settings.trackRole': 'trackRole',
};
/** Track settings that hold something other than a Track field. */
const SETTINGS_ELSEWHERE = [
  'settings.oracleSynth',
  'settings.masterAutomation',
];
const NOTE_COLUMNS: Record<string, string> = {
  notes: 'note',
  velocities: 'velocity',
  startTickDeltas: 'startTick',
  durations: 'durationTicks',
  channels: 'channel',
};

const legacy = (specs: Record<string, { cloud: unknown }>) =>
  Object.keys(specs)
    .filter((key) => specs[key].cloud === 'legacy')
    .sort();

const at = (value: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (v, part) => (v as Record<string, unknown> | undefined)?.[part],
      value,
    );

/**
 * Every saved project that has tracks, sent through today's cloud codec, as
 * the request body.
 */
function cloudBodies(): Record<string, unknown>[] {
  const withTracks = fixtures('v2-1.2').filter(
    ({ session }) => session.data.tracks.length > 0,
  );
  return withTracks.map(({ name, session }) => {
    resetStore();
    expect(deserializeSession(session), name).toBe(true);
    // An uploaded take, so the body carries an audio clip, and master
    // automation, which rides on the first track.
    s().addAudioClip(s().tracks[0].id, {
      id: 'take-1',
      startTick: 0,
      duration: 1920,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: 'asset-1',
      offsetSeconds: 0,
      gain: 1,
    });
    s().upsertMasterAutomationPoint('volume', { tick: 0, value: 0.5 });
    return JSON.parse(JSON.stringify(serializeSessionForCloud())) as Record<
      string,
      unknown
    >;
  });
}

describe("the cloud flags match today's legacy payload", () => {
  beforeEach(resetStore);

  it('for store keys', () => {
    expect(legacy(STORE_FIELDS)).toEqual(Object.keys(STORE_IN_PAYLOAD).sort());
    const known = new Set(
      Object.values(STORE_IN_PAYLOAD).map((path) => path.split('.')[0]),
    );
    for (const body of cloudBodies()) {
      expect(Object.keys(body).filter((key) => !known.has(key))).toEqual([]);
      expect(Object.keys(body.prism as object).sort()).toEqual([
        'genre',
        'rhythmName',
        'rootNote',
        'swing',
      ]);
      for (const path of Object.values(STORE_IN_PAYLOAD)) {
        expect({ path, there: at(body, path) !== undefined }).toEqual({
          path,
          there: true,
        });
      }
    }
  });

  it('for tracks, clips, notes, audio clips and return buses', () => {
    expect(legacy(TRACK_FIELDS)).toEqual(
      [...new Set(Object.values(TRACK_IN_PAYLOAD))].sort(),
    );
    expect(ORACLE_PATCH_FIELD.cloud).toBe('legacy');

    const seen = {
      track: new Set<string>(),
      midiClip: new Set<string>(),
      events: new Set<string>(),
      audioClip: new Set<string>(),
      bus: new Set<string>(),
    };
    for (const body of cloudBodies()) {
      for (const track of body.tracks as Record<string, unknown>[]) {
        for (const [key, value] of Object.entries(track)) {
          if (key !== 'settings') seen.track.add(key);
          else
            Object.keys(value as object).forEach((k) =>
              seen.track.add(`settings.${k}`),
            );
        }
        for (const clip of track.midiClips as Record<string, unknown>[]) {
          Object.keys(clip).forEach((key) => seen.midiClip.add(key));
          Object.keys(clip.events as object).forEach((key) =>
            seen.events.add(key),
          );
        }
        for (const clip of track.audioClips as Record<string, unknown>[]) {
          Object.keys(clip).forEach((key) => seen.audioClip.add(key));
        }
      }
      for (const bus of body.returns as Record<string, unknown>[]) {
        Object.keys(bus).forEach((key) => seen.bus.add(key));
      }
    }

    // Every field the payload carries is flagged legacy, and every legacy
    // field is in it.
    const trackKnown = [
      ...Object.keys(TRACK_IN_PAYLOAD),
      ...SETTINGS_ELSEWHERE,
    ];
    expect([...seen.track].filter((k) => !trackKnown.includes(k))).toEqual([]);
    expect([...seen.track].sort()).toEqual(
      expect.arrayContaining(Object.keys(TRACK_IN_PAYLOAD).sort()),
    );
    expect([...seen.midiClip].sort()).toEqual(legacy(MIDI_CLIP_FIELDS));
    expect(
      [...seen.events].map((c) => NOTE_COLUMNS[c] ?? `?${c}`).sort(),
    ).toEqual(legacy(NOTE_EVENT_FIELDS));
    expect([...seen.audioClip].sort()).toEqual(legacy(AUDIO_CLIP_FIELDS));
    expect([...seen.bus].sort()).toEqual(legacy(RETURN_BUS_FIELDS));
    // Neither CC events nor chord regions nor markers travel today.
    expect(legacy(CC_EVENT_FIELDS)).toEqual([]);
    expect(legacy(CHORD_REGION_FIELDS)).toEqual([]);
    expect(legacy(MARKER_FIELDS)).toEqual([]);
  });
});
