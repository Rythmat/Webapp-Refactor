// @vitest-environment jsdom
/**
 * Drafts written before codec v3 load as they did, and v3 drafts still load
 * in the builds before it (projectDocument/migrations.ts, decision D1).
 *
 * The oracle is a frozen copy of the v2 decoder that 1.1 and 1.2 ship
 * (frozenV2Decoders.ts), taken before codec v3 replaced it: for each of the
 * 42 autosaves captured from real sessions (fixtures/v2, written before 1.1,
 * and fixtures/v2-1.2, written by 1.1 and 1.2), a synthetic v1 draft and
 * older v2 drafts made from them, the v3 path must load every v2 field just
 * as it did. Then the other way: a v3 draft read by the 1.2 decoder, and by
 * the one in prod before 1.1, must give them the same core project.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/migrations.test.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { Track } from '@/daw/store/tracksSlice';
import {
  decodeSession,
  encodeSession,
  type StoredSession,
} from '../projectDocument/codec';
import { TRACK_FIELDS } from '../projectDocument/fields';
import { migrateSession } from '../projectDocument/migrations';
import { isLoadableSession } from '../SessionSerializer';
import {
  decodeAs12,
  decodeAsMain,
  readAsMainSongPage,
  type FrozenDecode,
} from './frozenV2Decoders';

/* eslint-disable @typescript-eslint/no-explicit-any */

const FIXTURES = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures',
);
const GOLDEN_SESSIONS = resolve(
  process.cwd(),
  'scripts/studio-perf/fixtures/sessions',
);

function jsonFiles(dir: string): { name: string; session: any }[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
    .sort()
    .map((file) => ({
      name: file,
      session: JSON.parse(readFileSync(join(dir, file), 'utf8')),
    }));
}

const V2 = jsonFiles(join(FIXTURES, 'v2'));
const V2_12 = jsonFiles(join(FIXTURES, 'v2-1.2'));
const V1 = jsonFiles(join(FIXTURES, 'v1'));
const ALL_FIELDS = jsonFiles(join(FIXTURES, 'v3-all-fields'))[0].session;

function migrated(stored: unknown) {
  const result = migrateSession(stored);
  if (!result.ok) throw new Error(`unreadable: ${result.detail}`);
  return result;
}

function decode(stored: unknown) {
  return decodeSession(migrated(stored).session);
}

/** The store keys the v2 decoder sets from a draft (bar the metronome). */
const V2_KEYS = [
  'projectId',
  'projectName',
  'composerName',
  'bpm',
  'position',
  'loopEnabled',
  'loopStart',
  'loopEnd',
  'rootNote',
  'mode',
  'rhythmName',
  'genre',
  'swing',
  'chordRegions',
  'returns',
  'masterAutomation',
] as const;

const TRACK_KEYS = Object.keys(TRACK_FIELDS);

/** A note in (startTick, note) order, without the id v3 adds. */
const plainNote = ({ id: _id, ...rest }: MidiNoteEvent) => rest;
const byPlace = (a: MidiNoteEvent, b: MidiNoteEvent) =>
  a.startTick - b.startTick || a.note - b.note;

/**
 * A track as the frozen decoder gives it, restricted to the Track's fields
 * (it also spreads whatever else the draft holds), with each clip's notes in
 * the order the columns store them.
 */
function frozenTrack(track: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of TRACK_KEYS) {
    if (track[key] !== undefined) out[key] = track[key];
  }
  out.midiClips = track.midiClips.map((clip: any) => ({
    ...clip,
    events: [...clip.events].sort(byPlace),
  }));
  return out;
}

/** Our track for comparison: the notes without ids. */
function ourTrack(track: Track): Record<string, unknown> {
  return {
    ...track,
    midiClips: track.midiClips.map((clip) => ({
      ...clip,
      events: clip.events.map(plainNote),
    })),
  };
}

/** Expect our decode of `stored` to load what the frozen decoder does. */
function expectSameAsFrozen(name: string, stored: any, frozen: FrozenDecode) {
  const ours = decode(stored);
  for (const key of V2_KEYS) {
    expect({ name, key, value: ours.project[key] }).toEqual({
      name,
      key,
      value: frozen.state[key],
    });
  }
  expect(ours.project.tracks.map(ourTrack), name).toEqual(
    frozen.state.tracks.map(frozenTrack),
  );
  expect(ours.synthPatches, name).toEqual(frozen.synthSeeds);
  // The metronome moves to the student's prefs, which take it from here.
  expect(migrated(stored).legacyPrefs, name).toEqual(
    typeof frozen.state.metronomeEnabled === 'boolean'
      ? { metronomeEnabled: frozen.state.metronomeEnabled }
      : {},
  );
}

/** What this build writes once it has loaded `stored`. */
function reencoded(stored: unknown): StoredSession {
  const { project, synthPatches } = decode(stored);
  const patches = new Map(synthPatches);
  return JSON.parse(
    JSON.stringify(
      encodeSession(project, (id) => patches.get(id), 1760000000000),
    ),
  );
}

/** A frozen decode without the keys a build before 1.3 can't get from v3. */
function withoutPrefs(decoded: FrozenDecode | null, extra: string[] = []) {
  if (!decoded) throw new Error('the frozen decoder refused it');
  const state = { ...decoded.state };
  delete state.metronomeEnabled;
  state.tracks = state.tracks.map((track: any) => {
    const copy = { ...track };
    for (const key of extra) delete copy[key];
    return copy;
  });
  return { ...decoded, state };
}

// ── v2, both dialects ──────────────────────────────────────────────────────

describe('the captured v2 autosaves', () => {
  it('are all here: 21 written before 1.1 and 21 by 1.1 and 1.2', () => {
    expect([V2.length, V2_12.length]).toEqual([21, 21]);
  });

  for (const { name, session } of [
    ...V2.map((f) => ({ ...f, name: `v2/${f.name}` })),
    ...V2_12.map((f) => ({ ...f, name: `v2-1.2/${f.name}` })),
  ]) {
    describe(name, () => {
      it('loads every v2 field as the 1.2 decoder did', () => {
        const frozen = decodeAs12(session);
        if (!frozen) throw new Error('the frozen decoder refused it');
        expectSameAsFrozen(name, session, frozen);
      });

      it('loads as a v2 draft, with nothing repaired', () => {
        const result = migrated(session);
        expect([result.from, result.repaired]).toEqual([2, 0]);
        expect(decode(session).repaired).toBe(0);
      });

      it('colours clips by harmony when it has a chord lane, as v2 showed it', () => {
        expect(decode(session).project.clipColorMode).toBe(
          session.data.chordRegions?.length > 0 ? 'prism' : 'track',
        );
      });

      it('rewritten as v3, keeps every v2 field at its v2 path', () => {
        const v3 = reencoded(session);
        const before = session.data;
        const after = v3.data as any;
        for (const field of [
          'projectId',
          'projectName',
          'composerName',
          'chordRegions',
          'masterAutomation',
        ]) {
          expect({ field, value: after[field] }).toEqual({
            field,
            value: before[field],
          });
        }
        for (const field of [
          'bpm',
          'position',
          'loopEnabled',
          'loopStart',
          'loopEnd',
        ]) {
          expect(after.transport[field], field).toEqual(
            before.transport[field],
          );
        }
        for (const field of ['rootNote', 'rhythmName', 'genre', 'swing']) {
          expect(after.prism[field], field).toEqual(before.prism[field]);
        }
        expect(after.prism.mode).toEqual(before.prism.mode ?? 'ionian');
        after.tracks.forEach((track: any, i: number) => {
          const was = before.tracks[i];
          for (const [index, clip] of track.midiClips.entries()) {
            const { ids, ...columns } = clip.events;
            expect(columns).toEqual(was.midiClips[index].events);
            expect(ids).toHaveLength(columns.notes.length);
          }
          expect(track.audioClips).toEqual(was.audioClips);
          expect(track.settings).toEqual(was.settings);
        });
      });

      it('rewritten as v3, reads in 1.2 as the original did', () => {
        expect(withoutPrefs(decodeAs12(reencoded(session)))).toEqual(
          withoutPrefs(decodeAs12(session)),
        );
      });

      it('rewritten as v3, reads in prod (before 1.1) as the original did', () => {
        // Prod's decoder copies what a track holds, and a v3 draft always
        // holds the role and the input channel, which pre-1.1 saves lack.
        const extra = ['trackRole', 'audioInputChannel'];
        expect(withoutPrefs(decodeAsMain(reencoded(session)), extra)).toEqual(
          withoutPrefs(decodeAsMain(session), extra),
        );
        expect(readAsMainSongPage(reencoded(session))).toEqual(
          readAsMainSongPage(session),
        );
      });

      it('loads the same project, note ids and all, every time', () => {
        expect(JSON.stringify(decode(session))).toBe(
          JSON.stringify(decode(session)),
        );
        expect(JSON.stringify(decode(reencoded(session)).project)).toBe(
          JSON.stringify(decode(session).project),
        );
      });
    });
  }
});

// ── Older drafts ───────────────────────────────────────────────────────────

describe('a v1 draft', () => {
  it('is here', () => {
    expect(V1.map((f) => f.name)).toEqual(['legacy-v1.json']);
  });

  for (const { name, session } of V1) {
    it(`${name} loads as the 1.2 decoder did, notes in column order`, () => {
      expect(session.version).toBe(1);
      const frozen = decodeAs12(session);
      if (!frozen) throw new Error('the frozen decoder refused it');
      expectSameAsFrozen(name, session, frozen);
      expect(migrated(session).from).toBe(1);
    });

    it(`${name} becomes the columns v2 wrote, and v3's ids`, () => {
      const v3 = reencoded(session);
      expect([v3.version, v3.schema]).toEqual([2, 3]);
      const chords = v3.data.tracks[0].midiClips[0].events;
      expect(chords.notes).toEqual([60, 60, 64, 55, 67]);
      expect(chords.velocities).toEqual([90, 70, 85, 75, 80]);
      expect(chords.startTickDeltas).toEqual([0, 0, 0, 960, 0]);
      expect(new Set(chords.ids).size).toBe(5);
    });
  }
});

/** `session` as a v2 build of 2026-05-28 wrote it, before its additions. */
function earlyV2(session: any): any {
  const old = structuredClone(session);
  delete old.data.returns;
  delete old.data.chordRegions;
  delete old.data.masterAutomation;
  delete old.data.prism.mode;
  for (const track of old.data.tracks) {
    delete track.settings;
    delete track.trackRole;
    delete track.audioInputChannel;
    delete track.activeEffects;
    for (const clip of track.audioClips) {
      delete clip.assetId;
      delete clip.offsetSeconds;
      delete clip.gain;
    }
  }
  return old;
}

describe('an early v2 draft, before settings, returns, chords and mode', () => {
  for (const { name, session } of V2_12) {
    it(`${name} loads as the 1.2 decoder did`, () => {
      const old = earlyV2(session);
      const frozen = decodeAs12(old);
      if (!frozen) throw new Error('the frozen decoder refused it');
      expectSameAsFrozen(name, old, frozen);
    });
  }
});

describe('the golden render sessions (scripts/studio-perf/fixtures/sessions)', () => {
  for (const { name, session } of jsonFiles(GOLDEN_SESSIONS)) {
    it(`${name} loads, its extra golden key aside, as the 1.2 decoder did`, () => {
      expect(session).toHaveProperty('golden');
      expect(isLoadableSession(session)).toBe(true);
      const frozen = decodeAs12(session);
      if (!frozen) throw new Error('the frozen decoder refused it');
      expectSameAsFrozen(name, session, frozen);
      // golden.mjs registers each clip's audio under its id before loading.
      const ids = (s: any) =>
        s.data.tracks.flatMap((t: any) =>
          [...t.midiClips, ...t.audioClips].map((c: any) => c.id),
        );
      expect(ids(reencoded(session))).toEqual(ids(session));
    });
  }
});

// ── v3 in the builds before it ─────────────────────────────────────────────

describe('a v3 draft in a build from before 1.3', () => {
  const ours = decode(ALL_FIELDS);

  /** The core project, as a frozen decoder or ours loads it. */
  const core = (state: any) => ({
    projectId: state.projectId,
    projectName: state.projectName,
    composerName: state.composerName,
    bpm: state.bpm,
    loop: [state.loopEnabled, state.loopStart, state.loopEnd],
    key: [state.rootNote, state.mode, state.rhythmName, state.genre],
    swing: state.swing,
    chordRegions: state.chordRegions,
    returns: state.returns,
    masterAutomation: state.masterAutomation,
    tracks: state.tracks.map((t: any) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      instrument: t.instrument,
      mix: [t.color, t.mute, t.solo, t.volume, t.pan],
      effects: [t.effects, t.activeEffects],
      sound: [
        t.gmProgram,
        t.drumKit,
        t.bassVoice,
        t.samplerSample,
        t.organState,
        t.vocalChain,
        t.guitarChain,
        t.sends,
        t.automation,
        t.presetName,
      ],
      clips: t.midiClips.map((c: any) => ({
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: c.events.map(plainNote),
      })),
      audioClips: t.audioClips,
    })),
  });

  it('is still a v2 envelope to them', () => {
    expect(ALL_FIELDS.version).toBe(2);
    expect(ALL_FIELDS.data.tracks).toEqual(expect.any(Array));
  });

  it('loads the core project in 1.2', () => {
    const frozen = decodeAs12(ALL_FIELDS);
    expect(frozen).not.toBeNull();
    expect(core(frozen!.state)).toEqual(core(ours.project));
    expect(frozen!.synthSeeds).toEqual(ours.synthPatches);
  });

  it('loads the core project in prod (before 1.1)', () => {
    const frozen = decodeAsMain(ALL_FIELDS);
    expect(frozen).not.toBeNull();
    expect(core(frozen!.state)).toEqual(core(ours.project));
  });

  it('reads in prod’s Song page and kept-work checks', () => {
    expect(readAsMainSongPage(ALL_FIELDS)).toEqual({
      hasContent: true,
      projectName: 'All Fields',
    });
  });
});

// ── What can't be read ─────────────────────────────────────────────────────

describe('a draft that can’t be read', () => {
  const valid = () => structuredClone(V2_12[0].session);
  const cases: [string, unknown, string][] = [
    ['not JSON', '{"version": 2, "data": {', 'unparseable'],
    ['JSON but no object', '[1, 2]', 'malformed'],
    ['no version', { data: {} }, 'malformed'],
    ['a newer envelope', { ...valid(), version: 3 }, 'future-version'],
    ['a newer schema', { ...valid(), schema: 4 }, 'future-version'],
    [
      'a newer schema that changed what a field means',
      { ...valid(), schema: 4, compat: 4 },
      'future-version',
    ],
    [
      'a newer schema with a compat that is no schema',
      { ...valid(), schema: 4, compat: '3' },
      'future-version',
    ],
    ['a schema on v1', { ...valid(), version: 1, schema: 3 }, 'malformed'],
    ['a schema below 3', { ...valid(), schema: 2 }, 'malformed'],
    ['no data', { version: 2, timestamp: 1 }, 'malformed'],
    [
      'no transport',
      { ...valid(), data: { ...valid().data, transport: undefined } },
      'malformed',
    ],
    [
      'no track list',
      { ...valid(), data: { ...valid().data, tracks: {} } },
      'malformed',
    ],
  ];
  for (const [what, input, reason] of cases) {
    it(`${what}: ${reason}`, () => {
      expect(migrateSession(input)).toMatchObject({ ok: false, reason });
      expect(isLoadableSession(input as never)).toBe(false);
    });
  }

  it('a track without an id, or note columns that don’t line up: malformed', () => {
    const noId = valid();
    const firstMidi = noId.data.tracks.findIndex(
      (t: any) => t.midiClips.length > 0,
    );
    delete noId.data.tracks[firstMidi].id;
    expect(migrateSession(noId)).toMatchObject({ reason: 'malformed' });

    const uneven = valid();
    uneven.data.tracks[firstMidi].midiClips[0].events.velocities.pop();
    expect(migrateSession(uneven)).toMatchObject({ reason: 'malformed' });
  });

  it('a missing clip list or Prism block is repaired, not refused', () => {
    const draft = valid();
    delete draft.data.tracks[0].midiClips;
    draft.data.tracks[1].audioClips = 'none';
    delete draft.data.prism;
    const result = migrateSession(draft);
    expect(result).toMatchObject({ ok: true, repaired: 2 });
    const { project } = decode(draft);
    expect(project.tracks[0].midiClips).toEqual([]);
    expect(project.tracks[1].audioClips).toEqual([]);
    expect(project.rootNote).toBeNull();
  });
});

describe('a draft from a later schema', () => {
  /** ALL_FIELDS as a later build that only added fields would write it. */
  const later = (compat: unknown) => ({
    ...structuredClone(ALL_FIELDS),
    schema: 4,
    compat,
    data: {
      ...structuredClone(ALL_FIELDS.data),
      chordPromptDismissed: true,
      prism: { ...structuredClone(ALL_FIELDS.data.prism), newField: [1, 2] },
    },
  });

  it('loads as v3 when its compat says this build may read it', () => {
    const result = migrated(later(3));
    expect([result.from, result.repaired]).toEqual([4, 0]);
    expect(result.session).toMatchObject({ version: 2, schema: 3, compat: 3 });
    // What this build doesn't know is left out; the rest loads as v3 does.
    const ours = decode(later(3));
    expect(ours.project).toEqual(decode(ALL_FIELDS).project);
    expect(JSON.stringify(reencoded(later(3)))).not.toMatch(
      /chordPromptDismissed|newField/,
    );
  });

  it('is set aside when its compat is newer than this build, or missing', () => {
    for (const compat of [4, undefined, 2.5]) {
      expect(migrateSession(later(compat))).toMatchObject({
        ok: false,
        reason: 'future-version',
        version: 4,
      });
    }
  });
});

describe('migrating', () => {
  /** Freeze `value` all the way down, so a write to it throws. */
  function deepFreeze<T>(value: T): T {
    if (typeof value === 'object' && value !== null) {
      for (const inner of Object.values(value)) deepFreeze(inner);
      Object.freeze(value);
    }
    return value;
  }

  it('never writes to the draft it is given', () => {
    for (const session of [V1[0].session, V2[0].session, ALL_FIELDS]) {
      const frozen = deepFreeze(structuredClone(session));
      expect(() => decode(frozen)).not.toThrow();
    }
  });

  it('accepts v1, v2 and v3, and a raw string as well as an object', () => {
    for (const session of [V1[0].session, V2[0].session, ALL_FIELDS]) {
      expect(isLoadableSession(session)).toBe(true);
      expect(isLoadableSession(JSON.stringify(session))).toBe(true);
    }
  });

  it('passes a v3 draft through as it is', () => {
    const result = migrated(ALL_FIELDS);
    expect(result.from).toBe(3);
    expect(result.session.data).toBe(result.session.data);
    expect(result.legacyPrefs).toEqual({});
    expect(result.session.data.tracks).toEqual(ALL_FIELDS.data.tracks);
  });
});
