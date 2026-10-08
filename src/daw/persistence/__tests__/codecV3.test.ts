// @vitest-environment jsdom
/**
 * Codec v3: the project draft written on this device (the autosave, kept
 * work) and read back (projectDocument/codec.ts, through SessionSerializer).
 *
 * fixtures/v3-all-fields/all-fields.json is a v3 draft holding a value other
 * than its default for every local registry field: every doc and view store
 * key, every Track field and every nested field (clips, notes, controller
 * events, audio clips, chord regions, markers, return buses), an Oracle
 * patch and every kind of Score mark. Reading it back and writing it again
 * must give the same draft, so a field that stops round-tripping fails here.
 * The fixture is the format: changing what the codec writes means bumping
 * SESSION_SCHEMA_VERSION, adding a migration and new fixtures
 * (allFieldsFixture.test.ts writes it; v3Shape.test.ts holds its shape).
 *
 * Run: npx vitest run src/daw/persistence/__tests__/codecV3.test.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAMILY_DEGREE_ORDER } from '@prism/engine';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { assertNoteIds, isNoteId, legacyNoteId } from '@/daw/model/noteIds';
import {
  getTrackSynthState,
  setTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore, type AllSlices } from '@/daw/store';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { Track } from '@/daw/store/tracksSlice';
import { canUndo, pushUndo } from '@/daw/store/undoMiddleware';
import {
  checkedValue,
  decodeSession,
  draftPlaceOf,
  encodeSession,
  SESSION_COMPAT_VERSION,
  trackPlaceOf,
  type LocalKey,
  type ProjectSnapshot,
  type StoredSession,
} from '../projectDocument/codec';
import { keyColourFor, nextChordsFor } from '../projectDocument/derived';
import {
  AUDIO_CLIP_FIELDS,
  CC_EVENT_FIELDS,
  CHORD_REGION_FIELDS,
  DOC_KEYS,
  LOCAL_KEYS,
  MARKER_FIELDS,
  MIDI_CLIP_FIELDS,
  NOTE_EVENT_FIELDS,
  RETURN_BUS_FIELDS,
  TRACK_FIELDS,
  VIEW_KEYS,
  fieldDefault,
  trackFieldDefault,
  type FieldSpec,
} from '../projectDocument/fields';
import { migrateSession } from '../projectDocument/migrations';
import {
  deserializeSession,
  forgetLiveSession,
  loadSession,
  resetSessionToEmpty,
  serializeSession,
  SESSION_SCHEMA_VERSION,
  sessionLoadedAt,
} from '../SessionSerializer';
import { useSaveStatusStore } from '../saveStatusStore';

const s = () => useStore.getState();

const ALL_FIELDS = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures/v3-all-fields/all-fields.json',
);
const allFields = (): StoredSession =>
  JSON.parse(readFileSync(ALL_FIELDS, 'utf8')) as StoredSession;

/** Decode a stored draft of any version, as loadSession does. */
function decode(stored: unknown) {
  const migrated = migrateSession(stored);
  if (!migrated.ok) throw new Error(`unreadable: ${migrated.detail}`);
  return decodeSession(migrated.session);
}

/** The Oracle patches a decode collected, as a save's patch reader. */
const patchesOf =
  (synthPatches: readonly [string, unknown][]) => (trackId: string) =>
    new Map(synthPatches).get(trackId) as never;

const sorted = <T>(list: readonly T[]) => [...list].sort();

/** A nested spec's default, made fresh when it is a factory. */
const defaultOf = (spec: { default: unknown }): unknown =>
  typeof spec.default === 'function'
    ? (spec.default as () => unknown)()
    : spec.default;

const note = (
  n: number,
  startTick: number,
  id?: string,
  extra: Partial<MidiNoteEvent> = {},
): MidiNoteEvent => ({
  ...(id === undefined ? {} : { id }),
  note: n,
  velocity: 100,
  startTick,
  durationTicks: 480,
  channel: 0,
  ...extra,
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});

// ── The layout ──────────────────────────────────────────────────────────────

describe('the draft layout', () => {
  it('places every local key of the registry: the doc and view keys', () => {
    expect(sorted(LOCAL_KEYS)).toEqual(sorted([...DOC_KEYS, ...VIEW_KEYS]));
    for (const key of LOCAL_KEYS) {
      expect({ key, place: draftPlaceOf(key as LocalKey) }).toEqual({
        key,
        place: expect.any(String),
      });
    }
  });

  it('keeps the v2 fields at their v2 paths', () => {
    const v2 = {
      projectId: 'data',
      projectName: 'data',
      composerName: 'data',
      bpm: 'transport',
      position: 'transport',
      loopEnabled: 'transport',
      loopStart: 'transport',
      loopEnd: 'transport',
      tracks: 'tracks',
      rootNote: 'prism',
      rhythmName: 'prism',
      genre: 'prism',
      swing: 'prism',
      mode: 'prism',
      chordRegions: 'data',
      returns: 'data',
      masterAutomation: 'data',
    } as const;
    for (const [key, place] of Object.entries(v2)) {
      expect({ key, place: draftPlaceOf(key as LocalKey) }).toEqual({
        key,
        place,
      });
    }
  });

  it('writes no Track field the registry keeps out of the draft', () => {
    for (const field of Object.keys(TRACK_FIELDS) as (keyof Track)[]) {
      if (TRACK_FIELDS[field].local) continue;
      expect({ field, place: trackPlaceOf(field) }).toEqual({
        field,
        place: 'none',
      });
    }
  });

  it('places nowhere only what no draft keeps', () => {
    const nowhere = (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter(
      (field) => trackPlaceOf(field) === 'none',
    );
    // The Guitar/Bass-to-MIDI binding is session-only, as the feature was
    // built (integration item 11): the registry keeps it out of the draft.
    expect(nowhere.filter((field) => TRACK_FIELDS[field].local)).toEqual([]);
    expect(nowhere).toContain('audioMidiSource');
  });

  it('keeps the settings blob the cloud payload carries', () => {
    const inSettings = (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter(
      (field) => trackPlaceOf(field) === 'settings',
    );
    expect(sorted(inSettings)).toEqual(
      sorted([
        'gmProgram',
        'effects',
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
      ]),
    );
  });
});

// ── Every field ─────────────────────────────────────────────────────────────

describe('the all-fields draft', () => {
  it('holds a value other than its default for every local store key', () => {
    const { project } = decode(allFields());
    const atDefault = LOCAL_KEYS.filter((key) => {
      try {
        expect(project[key as LocalKey]).toEqual(fieldDefault(key));
        return true;
      } catch {
        return false;
      }
    });
    expect(atDefault).toEqual([]);
  });

  it('holds a value other than its default for every Track field it keeps', () => {
    const { project } = decode(allFields());
    const unset = (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter(
      (field) =>
        project.tracks.every((track) => {
          if (field === 'id' || trackPlaceOf(field) === 'none') return false;
          try {
            expect(track[field]).toEqual(trackFieldDefault(field));
            return true;
          } catch {
            return false;
          }
        }),
    );
    expect(unset).toEqual([]);
  });

  it('holds a value other than its default for every nested field', () => {
    const { project } = decode(allFields());
    const clips = project.tracks.flatMap((t) => t.midiClips);
    const groups: [string, Record<string, FieldSpec>, object[]][] = [
      ['MidiClip', MIDI_CLIP_FIELDS, clips],
      ['MidiNoteEvent', NOTE_EVENT_FIELDS, clips.flatMap((c) => c.events)],
      ['MidiCCEvent', CC_EVENT_FIELDS, clips.flatMap((c) => c.ccEvents ?? [])],
      [
        'AudioClip',
        AUDIO_CLIP_FIELDS,
        project.tracks.flatMap((t) => t.audioClips),
      ],
      ['ChordRegion', CHORD_REGION_FIELDS, project.chordRegions],
      ['Marker', MARKER_FIELDS, project.markers],
      ['ReturnBus', RETURN_BUS_FIELDS, project.returns],
    ];
    const unset: string[] = [];
    for (const [type, specs, entries] of groups) {
      expect({ type, entries: entries.length > 0 }).toEqual({
        type,
        entries: true,
      });
      for (const [field, spec] of Object.entries(specs)) {
        const differs = entries.some((entry) => {
          const value = (entry as Record<string, unknown>)[field];
          if (typeof spec.default === 'function') return value !== undefined;
          return JSON.stringify(value) !== JSON.stringify(defaultOf(spec));
        });
        if (!differs) unset.push(`${type}.${field}`);
      }
    }
    expect(unset).toEqual([]);
  });

  it('holds an Oracle patch and every kind of Score mark', () => {
    const { project, synthPatches } = decode(allFields());
    expect(synthPatches.map(([id]) => id)).toEqual(['trk-lead']);
    expect(synthPatches[0][1]).toMatchObject({ presetName: 'BASS' });
    expect(project.scoreArticulations).toHaveLength(2);
    expect(project.scoreSlurs).toHaveLength(1);
    expect(project.scoreSpellings).toHaveLength(1);
    expect(project.scoreSlashNotes).toHaveLength(1);
  });

  it('writes back as stored, field for field', () => {
    const stored = allFields();
    const { project, synthPatches } = decode(stored);
    const again = encodeSession(
      project,
      patchesOf(synthPatches),
      stored.timestamp,
    );
    // The fixture is the v3 format: a codec change that fails here changes
    // what drafts hold, which needs SESSION_SCHEMA_VERSION bumped, a
    // migration from this format and new fixtures. The order keys are
    // written in is not the format, so it isn't compared.
    expect(
      JSON.parse(JSON.stringify(again)),
      'the v3 draft format changed: bump SESSION_SCHEMA_VERSION, add a migration and fixtures',
    ).toEqual(stored);
  });

  it('round-trips through the store: restore, then the next autosave', () => {
    const stored = allFields();
    expect(deserializeSession(stored)).toBe(true);
    const again = serializeSession();
    expect({ ...again, timestamp: 0 }).toEqual({ ...stored, timestamp: 0 });
    expect(getTrackSynthState('trk-lead')).toEqual(
      stored.data.tracks[1].settings?.oracleSynth,
    );
  });

  it('is written in the v2 envelope with the v3 schema', () => {
    const stored = allFields();
    expect([stored.version, stored.schema, stored.compat]).toEqual([
      2,
      SESSION_SCHEMA_VERSION,
      SESSION_COMPAT_VERSION,
    ]);
    expect([SESSION_SCHEMA_VERSION, SESSION_COMPAT_VERSION]).toEqual([3, 3]);
    // Prefs are kept per user, apart from any project.
    expect(stored.data.transport).not.toHaveProperty('metronomeEnabled');
    expect(JSON.stringify(stored.data)).not.toMatch(
      /countInBars|timelineSnapEnabled|chordRulerShowNotes/,
    );
  });
});

// ── Deterministic ───────────────────────────────────────────────────────────

describe('encoding', () => {
  /** A Keys track whose clip holds `events`. */
  const project = (events: MidiNoteEvent[]): ProjectSnapshot => {
    const { project: decoded } = decode(allFields());
    return {
      ...decoded,
      tracks: decoded.tracks.map((t) =>
        t.id === 'trk-keys'
          ? { ...t, midiClips: [{ ...t.midiClips[0], events }] }
          : t,
      ),
      scoreArticulations: [],
      scoreSlurs: [],
      scoreSpellings: [],
      scoreSlashNotes: [],
    };
  };
  const keysClip = (session: StoredSession) =>
    session.data.tracks[0].midiClips[0].events;

  it('writes each note id beside its own note when the notes are out of order', () => {
    const events = [
      note(67, 960, 'idForG67aaa'.padEnd(12, 'x')),
      note(60, 0, 'idForC60aaa'.padEnd(12, 'x')),
      note(64, 0, 'idForE64aaa'.padEnd(12, 'x')),
      note(60, 0, 'idForC60bbb'.padEnd(12, 'x'), { velocity: 50 }),
    ];
    const columns = keysClip(
      encodeSession(project(events), () => undefined, 0),
    );
    expect(columns.notes).toEqual([60, 60, 64, 67]);
    expect(columns.velocities).toEqual([100, 50, 100, 100]);
    expect(columns.ids).toEqual([
      'idForC60aaax',
      'idForC60bbbx',
      'idForE64aaax',
      'idForG67aaax',
    ]);
    // Read back, every id is on its own note.
    const restored = decode(encodeSession(project(events), () => undefined, 0))
      .project.tracks[0].midiClips[0].events;
    for (const event of events) {
      expect(restored).toContainEqual(event);
    }
  });

  it('mints nothing, so two encodings of one session are the same', () => {
    const idless = [note(60, 0), note(64, 480), note(67, 960)];
    const random = vi.spyOn(crypto, 'getRandomValues');
    const uuid = vi.spyOn(crypto, 'randomUUID');
    try {
      const first = JSON.stringify(
        encodeSession(project(idless), () => undefined, 1),
      );
      const second = JSON.stringify(
        encodeSession(project(idless), () => undefined, 1),
      );
      expect(second).toBe(first);
      expect(random).not.toHaveBeenCalled();
      expect(uuid).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
      uuid.mockRestore();
    }
  });

  it('writes the ids notes saved without one get on every load', () => {
    const idless = [note(67, 960), note(60, 0), note(64, 480)];
    const ids = keysClip(
      encodeSession(project(idless), () => undefined, 0),
    ).ids;
    expect(ids).toEqual([0, 1, 2].map((i) => legacyNoteId('clip-keys', i)));
  });

  it('keeps one note per id: a repeat gets an id of its own', () => {
    const twice = 'SharedNote01';
    const encoded = encodeSession(
      project([note(60, 0, twice), note(64, 480, twice)]),
      () => undefined,
      0,
    );
    const ids = keysClip(encoded).ids ?? [];
    expect(ids[0]).toBe(twice);
    expect(isNoteId(ids[1])).toBe(true);
    expect(ids[1]).not.toBe(twice);
  });

  it('settles an id two notes share before keying the marks, minting nothing', () => {
    // A pre-1.3 collaborator's copy of a note: two notes, one id.
    const twice = 'SharedNote01';
    const base = project([note(60, 0, twice), note(64, 480, twice)]);
    base.scoreArticulations = ['trk-keys:clip-keys:480:64|accent'];
    const random = vi.spyOn(crypto, 'getRandomValues');
    try {
      const encoded = encodeSession(base, () => undefined, 0);
      expect(random).not.toHaveBeenCalled();
      const ids = keysClip(encoded).ids ?? [];
      expect(ids[0]).toBe(twice);
      expect(ids[1]).toBe(legacyNoteId('clip-keys', 1));
      // The mark is the second note's, under its own id, and comes back on
      // that note.
      expect(encoded.data.notation?.marks?.articulations).toEqual([
        `${ids[1]}|accent`,
      ]);
      expect(decode(encoded).project.scoreArticulations).toEqual([
        'trk-keys:clip-keys:480:64|accent',
      ]);
      expect(JSON.stringify(encodeSession(base, () => undefined, 0))).toBe(
        JSON.stringify(encoded),
      );
    } finally {
      random.mockRestore();
    }
  });

  it('keeps the Guitar/Bass-to-MIDI binding with the session that made it', () => {
    const base = project([note(60, 0, 'KeysNote0001')]);
    base.tracks = base.tracks.map((t) =>
      t.id === 'trk-lead'
        ? {
            ...t,
            audioMidiSource: {
              enabled: true,
              sourceTrackId: 'trk-guitar',
              mode: 'poly',
            },
          }
        : t,
    );
    const encoded = encodeSession(base, () => undefined, 0);
    expect(JSON.stringify(encoded)).not.toContain('audioMidiSource');
    // A draft that holds one anyway loads without it.
    const stored = allFields();
    (
      stored.data.tracks[1] as unknown as Record<string, unknown>
    ).audioMidiSource = {
      enabled: true,
      sourceTrackId: 'trk-guitar',
      mode: 'poly',
    };
    const decoded = decode(stored);
    expect(decoded.project.tracks[1]).not.toHaveProperty('audioMidiSource');
    expect(decoded.repaired).toBe(0);
  });

  it('stores controller data sorted by tick, keeping the order on one tick', () => {
    const base = project([note(60, 0, 'KeysNote0001')]);
    const ccEvents = [
      { tick: 960, controller: 64, value: 0, channel: 0 },
      { tick: 0, controller: 64, value: 127, channel: 0 },
      { tick: 960, controller: 64, value: 127, channel: 0 },
    ];
    base.tracks[0] = {
      ...base.tracks[0],
      midiClips: [{ ...base.tracks[0].midiClips[0], ccEvents }],
    };
    const restored = decode(encodeSession(base, () => undefined, 0)).project
      .tracks[0].midiClips[0].ccEvents;
    expect(restored).toEqual([ccEvents[1], ccEvents[0], ccEvents[2]]);
  });

  it('leaves out a Score mark whose note is gone', () => {
    const base = project([note(60, 0, 'KeysNote0001')]);
    base.scoreArticulations = [
      'trk-keys:clip-keys:0:60|accent',
      'trk-keys:clip-keys:480:62|staccato',
    ];
    const encoded = encodeSession(base, () => undefined, 0);
    expect(encoded.data.notation?.marks?.articulations).toEqual([
      'KeysNote0001|accent',
    ]);
  });
});

// ── Decoding ────────────────────────────────────────────────────────────────

describe('decoding', () => {
  const withKeysColumns = (patch: Record<string, unknown>): StoredSession => {
    const stored = allFields();
    Object.assign(stored.data.tracks[0].midiClips[0].events, patch);
    return stored;
  };

  it('gives the same project, ids and all, every time', () => {
    const stored = allFields();
    delete stored.data.tracks[0].midiClips[0].events.ids;
    expect(JSON.stringify(decode(stored))).toBe(JSON.stringify(decode(stored)));
  });

  it('loads a note with a broken velocity, and counts the repair', () => {
    const outcome = decode(withKeysColumns({ velocities: [90, null, 70] }));
    expect(outcome.repaired).toBe(1);
    expect(outcome.project.tracks[0].midiClips[0].events[1]).toMatchObject({
      note: 64,
      velocity: NOTE_EVENT_FIELDS.velocity.default,
    });
  });

  it('gives notes with a broken ids column the ids they would have had', () => {
    const outcome = decode(withKeysColumns({ ids: ['KeysNote0001'] }));
    expect(outcome.repaired).toBe(1);
    expect(
      outcome.project.tracks[0].midiClips[0].events.map((e) => e.id),
    ).toEqual([0, 1, 2].map((i) => legacyNoteId('clip-keys', i)));
  });

  it('gives two notes saved under one id ids of their own, the same every load', () => {
    const stored = allFields();
    const columns = stored.data.tracks[0].midiClips[0].events;
    const shared = columns.ids?.[0];
    columns.ids = [shared ?? '', shared ?? '', columns.ids?.[2] ?? ''];
    // And the same id once more on another track.
    stored.data.tracks[2].midiClips[0].events.ids = [shared ?? '', 'x'];
    const random = vi.spyOn(crypto, 'getRandomValues');
    try {
      const { project } = decode(stored);
      const ids = project.tracks.flatMap((t) =>
        t.midiClips.flatMap((c) => c.events.map((e) => e.id)),
      );
      expect(assertNoteIds(project.tracks)).toEqual([]);
      expect(project.tracks[0].midiClips[0].events[0].id).toBe(shared);
      expect(ids.filter((id) => id === shared)).toHaveLength(1);
      expect(
        decode(stored).project.tracks.flatMap((t) =>
          t.midiClips.flatMap((c) => c.events.map((e) => e.id)),
        ),
      ).toEqual(ids);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it('leaves every note of the project with a whole id', () => {
    const stored = allFields();
    for (const track of stored.data.tracks) {
      for (const clip of track.midiClips) delete clip.events.ids;
    }
    expect(assertNoteIds(decode(stored).project.tracks)).toEqual([]);
  });

  it('loads a value of the wrong type as its default', () => {
    const stored = allFields();
    (stored.data.transport as Record<string, unknown>).bpm = 'fast';
    (stored.data.prism as Record<string, unknown>).rootNote = 14;
    (stored.data.view as Record<string, unknown>).timelineZoom = -1;
    const outcome = decode(stored);
    expect(outcome.repaired).toBe(3);
    expect(outcome.project).toMatchObject({
      bpm: fieldDefault('bpm'),
      rootNote: null,
      rootTrackColor: null,
      timelineZoom: fieldDefault('timelineZoom'),
    });
  });

  it('loads an effect slot that isn’t one as its default, wherever it sits', () => {
    const stored = allFields();
    const slots = (effects: unknown) => effects as Record<string, unknown>;
    slots(stored.data.mixer?.masteringEffects).compressor = null;
    slots(stored.data.tracks[0].settings?.effects).reverb = 5;
    slots(stored.data.returns?.[0].effects).delay = 'off';
    const outcome = decode(stored);
    expect(outcome.repaired).toBe(3);
    expect(outcome.project.masteringEffects.compressor).toEqual(
      DEFAULT_EFFECTS.compressor,
    );
    expect(outcome.project.tracks[0].effects.reverb).toEqual(
      DEFAULT_EFFECTS.reverb,
    );
    expect(outcome.project.returns[0].effects.delay).toEqual(
      DEFAULT_EFFECTS.delay,
    );
    // The rest of each is as saved.
    expect(outcome.project.tracks[0].effects.ducker.keyTrackId).toBe(
      'trk-drums',
    );
  });

  it('loads a value that throws when read as its default, and nothing else', () => {
    const stored = allFields();
    Object.defineProperty(stored.data.view, 'timelineZoom', {
      enumerable: true,
      get() {
        throw new Error('unreadable');
      },
    });
    const outcome = decode(stored);
    expect(outcome.repaired).toBe(1);
    expect(outcome.project.timelineZoom).toBe(fieldDefault('timelineZoom'));
    expect(outcome.project.timelineScrollLeft).toBe(300);
    expect(outcome.project.markers).toHaveLength(2);
  });

  it('reads a value the cloud payload shares with a draft as a draft does', () => {
    expect(checkedValue('bpm', 92)).toBe(92);
    expect(checkedValue('bpm', null)).toBe(fieldDefault('bpm'));
    expect(checkedValue('rootNote', 12)).toBeNull();
    expect(
      checkedValue('masterAutomation', { volume: [{ tick: 'x' }] }),
    ).toEqual({ volume: [] });
  });

  it('opens a draft saved on the practice screen on Create', () => {
    const stored = allFields();
    (stored.data.view as Record<string, unknown>).currentView = 'practice';
    (stored.data.view as Record<string, unknown>).libraryOpen = false;
    expect(decode(stored).project).toMatchObject({
      currentView: 'arrange',
      libraryOpen: true,
    });
  });

  it('selects the first MIDI track when the selected one is gone', () => {
    const stored = allFields();
    (stored.data.view as Record<string, unknown>).selectedTrackId = 'gone';
    expect(decode(stored).project.selectedTrackId).toBe('trk-keys');
  });

  it('clears references to a track the draft does not hold', () => {
    const stored = allFields();
    const notation = stored.data.notation as Record<string, unknown>;
    notation.scoreChordTracks = ['trk-keys', 'gone'];
    notation.leadSheetMelodyTrackId = 'gone';
    const keys = stored.data.tracks[0].settings?.effects;
    if (!keys) throw new Error('no Keys effects');
    keys.ducker.keyTrackId = 'gone';
    const { project } = decode(stored);
    expect(project.scoreChordTracks).toEqual(['trk-keys']);
    expect(project.leadSheetMelodyTrackId).toBeNull();
    expect(project.tracks[0].effects.ducker.keyTrackId).toBeNull();
  });

  it('backfills the mastering rack two levels deep', () => {
    const stored = allFields();
    const effects = stored.data.mixer?.masteringEffects as unknown as Record<
      string,
      Record<string, unknown>
    >;
    delete effects.multiband;
    delete effects.compressor.knee;
    const { project } = decode(stored);
    expect(project.masteringEffects.multiband).toEqual(
      DEFAULT_EFFECTS.multiband,
    );
    expect(project.masteringEffects.compressor).toMatchObject({
      enabled: true,
      threshold: -18,
      knee: DEFAULT_EFFECTS.compressor.knee,
    });
  });

  it('keeps a chord identity as it was saved', () => {
    const { project } = decode(allFields());
    expect(
      (project.chordRegions[0] as { identity?: unknown }).identity,
    ).toEqual({
      rootPc: 2,
      quality: 'minor7',
      bassPc: 2,
      source: 'given',
      label: '2 minor',
    });
  });

  it('gives a repeated chord id a derived one, the same on every load', () => {
    const stored = allFields();
    stored.data.chordRegions![1].id = 'chord-1';
    const first = decode(stored).project.chordRegions.map((r) => r.id);
    const second = decode(stored).project.chordRegions.map((r) => r.id);
    expect(first).toEqual(['chord-1', 'chord-1-2']);
    expect(second).toEqual(first);
  });

  it('works out what a load derives', () => {
    const { project } = decode(allFields());
    expect(project.rootTrackColor).toBe(keyColourFor(2, 'dorian'));
    expect(project.availableNextChords).toEqual(
      nextChordsFor(['2 minor', '5 major'], 0.5),
    );
    expect(project.nextColorIndex).toBe(project.tracks.length);
  });
});

// ── What a load derives, against the store's own ───────────────────────────

describe('the derived state matches what the store computes', () => {
  it('the key colour, for every root and mode', () => {
    const modes = [
      ...FAMILY_DEGREE_ORDER.flatMap((family) => family.modes),
      'majorPentatonic',
    ];
    for (const mode of modes) {
      for (let root = 0; root < 12; root++) {
        useStore.setState({
          rootNote: null,
          rootLocked: false,
          tracks: [],
          chordRegions: [],
          stringSeq: [],
        });
        s().setMode(mode);
        s().setRootNote(root);
        expect({ mode, root, colour: keyColourFor(root, mode) }).toEqual({
          mode,
          root,
          colour: s().rootTrackColor,
        });
      }
    }
    expect(keyColourFor(null, 'ionian')).toBeNull();
  });

  it('the chords the Prism builder offers next', () => {
    s().clearSequence();
    s().addChord('1 major');
    s().addChord('4 major');
    expect(nextChordsFor(s().stringSeq, s().filterPercent)).toEqual(
      s().availableNextChords,
    );
    s().setFilterPercent(0.4);
    expect(nextChordsFor(s().stringSeq, 0.4)).toEqual(s().availableNextChords);
    expect(nextChordsFor([], 1)).toEqual([]);
  });
});

// ── Loading through the facade ─────────────────────────────────────────────

describe('loading a draft into the store', () => {
  let stop: () => void = () => {};
  afterEach(() => stop());

  it('lets go of the cached patches before seeding the draft’s', () => {
    setTrackSynthState('trk-lead', { presetName: 'OLD' } as never);
    const seen: unknown[] = [];
    stop = onSessionGeneration(() => {
      seen.push(getTrackSynthState('trk-lead'), s().projectName);
    });
    const before = getSessionGeneration();
    expect(deserializeSession(allFields())).toBe(true);
    expect(getSessionGeneration()).toBe(before + 1);
    // The bump ran while the store still held the old project, with the
    // old patch already gone; the draft's patch went in after.
    expect(seen).toEqual([undefined, fieldDefault('projectName')]);
    expect(getTrackSynthState('trk-lead')).toMatchObject({
      presetName: 'BASS',
    });
  });

  it('starts every other key afresh', () => {
    useStore.setState({
      activeTutorialId: 'make-first-track',
      lastSeekPosition: 3840,
      detectedKeyRootPc: 7,
      activeTool: 'scissors',
    });
    deserializeSession(allFields());
    expect(s()).toMatchObject({
      activeTutorialId: null,
      // Stop returns to the restored playhead, not the last project's spot.
      lastSeekPosition: allFields().data.transport.position,
      detectedKeyRootPc: null,
      activeTool: 'cursor',
      isPlaying: false,
    });
  });

  it('marks the draft as the only copy of the project', () => {
    useSaveStatusStore.setState({ savedComplete: true });
    deserializeSession(allFields());
    expect(useSaveStatusStore.getState().savedComplete).toBe(false);
    expect(sessionLoadedAt()).not.toBeNull();
  });

  it('starts its own undo history', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    pushUndo();
    expect(canUndo()).toBe(true);
    deserializeSession(allFields());
    expect(canUndo()).toBe(false);
  });

  it('changes nothing when the draft cannot be read', () => {
    s().setProjectName('Still Here');
    const before = getSessionGeneration();
    const outcome = loadSession('{"version": 2, "data": ');
    expect(outcome).toMatchObject({ ok: false, reason: 'unparseable' });
    expect(s().projectName).toBe('Still Here');
    expect(getSessionGeneration()).toBe(before);
    expect(sessionLoadedAt()).toBeNull();
  });

  it('changes nothing when a track can’t be read, and says why', () => {
    s().setProjectName('Still Here');
    setTrackSynthState('trk-lead', { presetName: 'OPEN' } as never);
    const before = getSessionGeneration();
    const stored = allFields();
    Object.defineProperty(stored.data.tracks[0].settings, 'presetName', {
      enumerable: true,
      get() {
        throw new Error('unreadable');
      },
    });
    expect(loadSession(stored)).toMatchObject({
      ok: false,
      reason: 'migration-failed',
    });
    expect(deserializeSession(stored)).toBe(false);
    expect(s().projectName).toBe('Still Here');
    expect(getSessionGeneration()).toBe(before);
    expect(getTrackSynthState('trk-lead')).toEqual({ presetName: 'OPEN' });
    expect(sessionLoadedAt()).toBeNull();
  });

  it('leaves the metronome alone: a v3 draft holds none', () => {
    // A draft written before 1.3 hands its metronome to the student's prefs
    // (legacyPrefs.test.ts).
    useStore.setState({ metronomeEnabled: true });
    deserializeSession(allFields());
    expect(s().metronomeEnabled).toBe(true);
    useStore.setState({ metronomeEnabled: false });
    deserializeSession(allFields());
    expect(s().metronomeEnabled).toBe(false);
  });

  it('reports what it repaired', () => {
    const stored = allFields();
    delete (stored.data.tracks[2] as Partial<(typeof stored.data.tracks)[2]>)
      .midiClips;
    (stored.data.tracks[0].midiClips[0].events.velocities as unknown[])[1] =
      null;
    expect(loadSession(stored)).toEqual({ ok: true, from: 3, repaired: 1 });
    expect(s().tracks[2].midiClips).toEqual([]);
  });
});

describe('starting an empty project', () => {
  it('returns every project key to its registry default', () => {
    deserializeSession(allFields());
    const before = getSessionGeneration();
    resetSessionToEmpty();
    expect(getSessionGeneration()).toBe(before + 1);
    const keys: (keyof AllSlices)[] = [
      'rhythmName',
      'selectedTrackId',
      'markers',
      'timeSignatureNumerator',
      'masteringFxChain',
      'scoreArticulations',
      'clipColorMode',
      'strumMode',
      'loopEnd',
    ];
    for (const key of keys) {
      expect({ key, value: s()[key] }).toEqual({
        key,
        value: fieldDefault(key as never),
      });
    }
    expect(s().rhythmName).toBe('Whole Notes');
    expect(useSaveStatusStore.getState().savedComplete).toBe(true);
  });
});
