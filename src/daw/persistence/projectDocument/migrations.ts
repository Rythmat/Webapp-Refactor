import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import {
  SESSION_COMPAT_VERSION,
  SESSION_ENVELOPE_VERSION,
  SESSION_SCHEMA_VERSION,
  encodeMidiEvents,
  type DraftData,
  type StoredSession,
} from './codec';
import { NOTE_EVENT_FIELDS } from './fields';

// ── Bringing older drafts up to v3 ─────────────────────────────────────────
//
// Every draft this build reads goes through migrateSession first: the
// autosave, kept work, a quarantined draft being tried again. It answers
// three questions. Can the draft be read at all (JSON, an envelope this build
// knows, the shape every version shares)? Which format was it written in? And
// what is it as v3? decodeSession (codec.ts) then reads v3 only.
//
// The formats:
// - v1 (builds of 2026-03-04 to 05-28): version 1, each clip's notes an array
//   of {note, velocity, startTick, durationTicks, channel}.
// - v2 (2026-05-28 to milestone 1.3): version 2, the notes in five columns.
//   Two dialects share it (fixtures/v2 and fixtures/v2-1.2): 1.1 added each
//   track's trackRole and audioInputChannel, and random chord ids, without a
//   version bump. Every v2 addition is optional, and a field a draft lacks
//   loads as its registry default ('auto', no input channel).
// - v3 (1.3 on): the same envelope, version 2, with schema 3 (codec.ts).
// - Later schemas: a draft whose `compat` is 3 or lower only adds fields to
//   v3, so it is read as v3 and the fields this build doesn't know are left
//   out. `from` says it was newer, and the caller keeps a copy of it before
//   writing over it (quarantine.ts, backupBeforeMigration). A higher compat
//   means a field changed its meaning: the draft is set aside, unread.
//
// Each step is pure and deterministic, and copies what it changes, so the
// caller's object is never written to. Fields a step doesn't know are kept.
// A v1 or v2 draft holds no Score marks, chord identities or note ids, so
// none needs translating: decodeSession derives each note's id from its clip
// and place (legacyNoteId), the same id every time.
//
// A draft is unreadable only when what every version shares is broken: it
// isn't JSON or an object, its envelope is unknown or newer than this build,
// its schema is newer and its compat doesn't let this build read it, it has
// no data, transport or track list, a track has no id, or a clip's note
// columns don't line up. Anything less is repaired and counted, here
// (a missing clip list) or in decodeSession (a value of the wrong type).

/** Why a draft can't be loaded. */
export type UnreadableReason =
  /** Not JSON at all. */
  | 'unparseable'
  /** JSON, but not a draft this build can make sense of. */
  | 'malformed'
  /** Written by a newer build in a format this one can't read. */
  | 'future-version'
  /** Readable, but bringing it up to date failed: a bug, kept for later. */
  | 'migration-failed';

/**
 * Prefs a draft from before 1.3 carried, which the student's per-user prefs
 * take on the first time they load one (prefsStore). A v3 draft has none.
 */
export interface LegacyPrefs {
  metronomeEnabled?: boolean;
}

export type MigrationResult =
  | {
      ok: true;
      /** The draft as v3: `version` 2, `schema` 3. */
      session: StoredSession;
      /**
       * The format it was written in: 1, 2, 3, or a later schema read as 3.
       * Unless it is SESSION_SCHEMA_VERSION, writing over the draft loses
       * its original, so the caller keeps a copy first.
       */
      from: number;
      /** How many parts were missing or broken and loaded as empty. */
      repaired: number;
      legacyPrefs: LegacyPrefs;
    }
  | {
      ok: false;
      reason: UnreadableReason;
      /** What exactly, for logs. */
      detail: string;
      /** The envelope version, or for a newer schema the schema. */
      version?: number;
    };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Thrown inside a step to make the draft unreadable as `malformed`. */
class MalformedDraft extends Error {}

/**
 * The draft `input` (the raw string storage holds, or a parsed object) as
 * v3, or why it can't be read. Never throws, and never changes `input`.
 */
export function migrateSession(input: unknown): MigrationResult {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return unreadable('unparseable', `not JSON (${String(err)})`);
    }
  }
  if (!isRecord(parsed)) return unreadable('malformed', 'not an object');

  const { version, schema } = parsed;
  if (typeof version !== 'number') {
    return unreadable('malformed', 'no envelope version');
  }
  if (version > SESSION_ENVELOPE_VERSION) {
    return unreadable('future-version', `envelope ${version}`, version);
  }
  if (version !== 1 && version !== 2) {
    return unreadable('malformed', `envelope ${version}`, version);
  }
  if (schema !== undefined) {
    if (!Number.isInteger(schema) || version !== 2 || (schema as number) < 3) {
      return unreadable('malformed', `schema ${String(schema)}`, version);
    }
    // A later schema that only added fields says this build may read it.
    const { compat } = parsed;
    if (
      (schema as number) > SESSION_SCHEMA_VERSION &&
      !(
        Number.isInteger(compat) && (compat as number) <= SESSION_SCHEMA_VERSION
      )
    ) {
      return unreadable(
        'future-version',
        `schema ${String(schema)}, compat ${String(compat)}`,
        schema as number,
      );
    }
  }
  const from = (schema as number | undefined) ?? version;

  const repairs = { count: 0 };
  try {
    let data = sharedShape(parsed.data, repairs);
    let legacyPrefs: LegacyPrefs = {};
    if (from < 3) ({ data, legacyPrefs } = v2ToV3(data));
    return {
      ok: true,
      session: {
        version: SESSION_ENVELOPE_VERSION,
        schema: SESSION_SCHEMA_VERSION,
        compat: SESSION_COMPAT_VERSION,
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0,
        data: data as unknown as DraftData,
      },
      from,
      repaired: repairs.count,
      legacyPrefs,
    };
  } catch (err) {
    if (err instanceof MalformedDraft) {
      return unreadable('malformed', err.message, version);
    }
    return unreadable('migration-failed', String(err), version);
  }
}

function unreadable(
  reason: UnreadableReason,
  detail: string,
  version?: number,
): MigrationResult {
  return version === undefined
    ? { ok: false, reason, detail }
    : { ok: false, reason, detail, version };
}

// ── What every version shares ──────────────────────────────────────────────

/**
 * `data` checked for what every version shares, as a copy: a data object,
 * a transport, and a track list whose tracks have ids. A track without a
 * clip list gets an empty one, and every clip's notes are columns of equal
 * length; a v1 clip's note objects become columns here (v1 → v2). A missing
 * Prism block reads as empty, its fields as their defaults.
 */
function sharedShape(
  data: unknown,
  repairs: { count: number },
): Record<string, unknown> {
  if (!isRecord(data)) throw new MalformedDraft('no data object');
  if (!isRecord(data.transport)) throw new MalformedDraft('no transport');
  if (!Array.isArray(data.tracks)) throw new MalformedDraft('no track list');
  const out: Record<string, unknown> = {
    ...data,
    tracks: data.tracks.map((track, t) => sharedTrackShape(track, t, repairs)),
  };
  if (!isRecord(data.prism)) {
    out.prism = {};
    repairs.count++;
  }
  return out;
}

function sharedTrackShape(
  track: unknown,
  index: number,
  repairs: { count: number },
): Record<string, unknown> {
  if (!isRecord(track)) throw new MalformedDraft(`track ${index} is no object`);
  if (typeof track.id !== 'string' || track.id === '') {
    throw new MalformedDraft(`track ${index} has no id`);
  }
  return {
    ...track,
    midiClips: listOrEmpty(track.midiClips, repairs).flatMap((clip, c) => {
      if (isRecord(clip))
        return [sharedClipShape(clip, `${index}.${c}`, repairs)];
      repairs.count++;
      return [];
    }),
    audioClips: listOrEmpty(track.audioClips, repairs),
  };
}

/** `list`, or an empty one (counted unless `list` is simply absent). */
function listOrEmpty(list: unknown, repairs: { count: number }): unknown[] {
  if (Array.isArray(list)) return list;
  if (list !== undefined) repairs.count++;
  return [];
}

const NOTE_COLUMNS = [
  'notes',
  'velocities',
  'startTickDeltas',
  'durations',
  'channels',
] as const;

function sharedClipShape(
  clip: Record<string, unknown>,
  where: string,
  repairs: { count: number },
): Record<string, unknown> {
  // A clip is told apart by its notes, not by the draft's version: an array
  // is v1's shape, as the decoders before 1.3 read it too.
  if (Array.isArray(clip.events)) {
    return { ...clip, events: encodeMidiEvents(v1Notes(clip.events, repairs)) };
  }
  const columns = clip.events;
  if (!isRecord(columns))
    throw new MalformedDraft(`clip ${where} has no notes`);
  const lengths = NOTE_COLUMNS.map((name) => {
    const column = columns[name];
    if (!Array.isArray(column)) {
      throw new MalformedDraft(`clip ${where} has no ${name} column`);
    }
    return column.length;
  });
  if (new Set(lengths).size > 1) {
    throw new MalformedDraft(`clip ${where} has columns of unequal length`);
  }
  return clip;
}

// ── v1 → v2 ────────────────────────────────────────────────────────────────

/**
 * v1's note objects, checked: one without a pitch is dropped, and any other
 * value that isn't a number takes the registry's default. Each is counted.
 */
function v1Notes(
  events: readonly unknown[],
  repairs: { count: number },
): MidiNoteEvent[] {
  const notes: MidiNoteEvent[] = [];
  for (const event of events) {
    if (!isRecord(event) || !Number.isFinite(event.note)) {
      repairs.count++;
      continue;
    }
    const value = (field: keyof typeof NOTE_EVENT_FIELDS): number => {
      const raw = event[field];
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      repairs.count++;
      return NOTE_EVENT_FIELDS[field].default as number;
    };
    notes.push({
      note: event.note as number,
      velocity: value('velocity'),
      startTick: value('startTick'),
      durationTicks: value('durationTicks'),
      channel: value('channel'),
    });
  }
  return notes;
}

// ── v2 → v3 ────────────────────────────────────────────────────────────────

/**
 * v2 as v3. Everything v2 holds keeps its path and meaning; two things move:
 * - The metronome leaves the draft for the student's per-user prefs, which
 *   take it on from the first draft that brings one (legacyPrefs).
 * - Clip colouring becomes a field of the project. A v2 project showed its
 *   clips in harmony colours whenever it had a chord lane (setChordRegions
 *   turns that on), so that is what it opens with (decision D5).
 */
function v2ToV3(data: Record<string, unknown>): {
  data: Record<string, unknown>;
  legacyPrefs: LegacyPrefs;
} {
  const transport = { ...(data.transport as Record<string, unknown>) };
  const metronome = transport.metronomeEnabled;
  delete transport.metronomeEnabled;
  const chordCount = Array.isArray(data.chordRegions)
    ? data.chordRegions.length
    : 0;
  return {
    data: {
      ...data,
      transport,
      clipColorMode: chordCount > 0 ? 'prism' : 'track',
    },
    legacyPrefs:
      typeof metronome === 'boolean' ? { metronomeEnabled: metronome } : {},
  };
}
