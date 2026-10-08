import {
  DEFAULT_EFFECTS,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';
import type { AutomationLanes, AutomationPoint } from '@/daw/audio/automation';
import { isChannelStripTabId } from '@/daw/components/ChannelStrip/channelStripTabs';
import {
  MARK_STYLES,
  type ScoreTextMark,
} from '@/daw/components/Score/scoreText';
import {
  ensureSamplerSampleId,
  type SamplerSampleRef,
} from '@/daw/instruments/samplerChops';
import { ensureProjectNoteIds, isNoteId } from '@/daw/model/noteIds';
import type { SynthTrackState } from '@/daw/oracle-synth/synthPatchKeys';
import type { MidiCCEvent, MidiNoteEvent } from '@/daw/prism-engine/types';
import type { AllSlices } from '@/daw/store';
import type { Marker } from '@/daw/store/markersSlice';
import type { ChordRecordMode, ChordRegion } from '@/daw/store/prismSlice';
import { defaultReturns, type ReturnBus } from '@/daw/store/returnsSlice';
import type {
  AudioClip,
  AudioInputChannel,
  MidiClip,
  Track,
  TrackType,
} from '@/daw/store/tracksSlice';
import type { LeadSheetChordFormat, ViewType } from '@/daw/store/uiSlice';
import type { DawTrackRole } from '@/daw/utils/trackRole';
import { planCloudTrackIds, rewriteTrackRefs } from './cloudIds';
import { keyColourFor, nextChordsFor } from './derived';
import {
  CHORD_REGION_FIELDS,
  LOCAL_KEYS,
  MARKER_FIELDS,
  NOTE_EVENT_FIELDS,
  TRACK_FIELDS,
  fieldDefault,
  trackFieldDefault,
  type DocKey,
  type ViewKey,
} from './fields';
import {
  decodeNoteMarks,
  encodeNoteMarks,
  type NoteMarksInMemory,
  type PersistedNoteMarks,
} from './notationCodec';

// ── Project drafts: codec v3 ───────────────────────────────────────────────
//
// How the Studio project is written to a draft on this device (the autosave
// and kept work) and read back. The registry (fields.ts) decides what goes
// in: every store key it marks local (the project's doc keys, and its view
// keys: how it was last seen on this device), every Track field it marks
// local and each Oracle track's patch. This file decides where each one
// sits, and the types of DRAFT_LAYOUT and TRACK_PLACES fail the build when a
// key or a Track field has no place.
//
// The format is v3 inside a v2 envelope (decision D1). A draft keeps
// "version": 2 and every v2 field at its v2 path, so a build from before 1.3
// (today's prod included) still reads it as v2 and keeps the core project
// after a rollback. v3 adds "schema": 3 and only additive fields: the metre,
// markers, mastering, the Prism builder, the Score and Lead Sheet marks and
// layout, clip lengths, controller data, note ids and the view. It never
// changes what a v2 field means. Prefs are not in it: prefsStore keeps them
// per user, apart from any project.
//
// A draft also says which builds after 1.3 may read it: `compat` is the
// oldest schema that loads it correctly by ignoring the fields it doesn't
// know. A later schema that only adds fields keeps it at 3, so after a
// rollback a build from 1.3 on still opens the draft, as a build from before
// 1.3 does through the v2 envelope. A schema that changes what a field means
// raises it, and builds below it set the draft aside (migrations.ts).
//
// Encoding is deterministic, since the pristine and kept-work checks compare
// two encodings of one session: nothing here mints an id. Notes without a
// whole id, or with one an earlier note of the project also has (a pre-1.3
// collaborator's copy, an old draft), get the one ensureProjectNoteIds
// derives, which is the same every time.
//
// Decoding is total: a value of the wrong type is replaced by its registry
// default and counted (`repaired`) rather than thrown on, and each key, the
// note marks and what a load derives are read on their own, so a value that
// throws costs only itself. Only what migrations.ts checks first (the
// envelope, the track list, track ids, the note columns) makes a draft
// unreadable, and a track that can't be read at all throws: no default
// stands in for a track, and loading without it would let the next autosave
// write over it. The caller then keeps the draft aside whole (loadSession).
//
// Pure: no store, no synth store, no storage. SessionSerializer applies what
// this decodes.

/** The envelope every draft is written in: builds before 1.3 read 1 and 2. */
export const SESSION_ENVELOPE_VERSION = 2;
/**
 * The format inside the envelope (decision D1). A draft without `schema` is
 * v1 or v2, from before 1.3, and goes through migrations.ts first. Any change
 * to what a draft holds bumps it, with a migration and fixtures (v3Shape.test
 * fails until then): 1.13b moving the Oracle patch, 1.16's per-project
 * chord-prompt flag, and 1.10 if measure indices change meaning (which raises
 * SESSION_COMPAT_VERSION too).
 */
export const SESSION_SCHEMA_VERSION = 3;
/**
 * The oldest schema whose builds may load a draft this build writes, by
 * ignoring the fields they don't know (written as `compat`). A schema bump
 * that only adds fields keeps it; one that changes what a stored field means
 * raises it to the new schema.
 */
export const SESSION_COMPAT_VERSION = 3;

// ── MIDI columns ───────────────────────────────────────────────────────────
//
// A clip's notes are five parallel arrays. startTickDeltas[0] is the
// absolute start of the first note and the rest are deltas from the note
// before. Notes are sorted by (startTick, note) on encode, so every delta is
// zero or more and long runs compress well.

export interface MidiClipEvents {
  notes: number[];
  velocities: number[];
  startTickDeltas: number[];
  durations: number[];
  channels: number[];
}

/**
 * A MIDI clip as the cloud payload and the demo bundles carry it. The local
 * draft writes DraftMidiClip, which adds columns, so this stays exactly what
 * music-atlas-api is sent until milestone 1.5's document field.
 */
export interface MidiClipColumnar {
  id: string;
  name?: string;
  startTick: number;
  events: MidiClipEvents;
}

/** Notes in (startTick, note) order; ties keep their order in the clip. */
function sortedOrder(events: readonly MidiNoteEvent[]): number[] {
  const order = events.map((_, i) => i);
  order.sort(
    (a, b) =>
      events[a].startTick - events[b].startTick ||
      events[a].note - events[b].note ||
      a - b,
  );
  return order;
}

export function encodeMidiEvents(events: MidiNoteEvent[]): MidiClipEvents {
  return encodeNoteColumns(events, false);
}

export function decodeMidiEvents(columnar: MidiClipEvents): MidiNoteEvent[] {
  const len = columnar.notes.length;
  const out = new Array<MidiNoteEvent>(len);
  let tick = 0;
  for (let i = 0; i < len; i++) {
    tick += columnar.startTickDeltas[i];
    out[i] = {
      note: columnar.notes[i],
      velocity: columnar.velocities[i],
      startTick: tick,
      durationTicks: columnar.durations[i],
      channel: columnar.channels[i],
    };
  }
  return out;
}

/** A clip's notes in the draft: the five v2 columns and, from v3, their ids. */
interface DraftNoteColumns extends MidiClipEvents {
  /** Each note's id, in the columns' (sorted) order. */
  ids?: string[];
}

/**
 * The columns of `events`, with their ids when `withIds`. The ids are put in
 * the same sorted order as the notes, so each id stays with its own note.
 */
function encodeNoteColumns(
  events: readonly MidiNoteEvent[],
  withIds: true,
): DraftNoteColumns;
function encodeNoteColumns(
  events: readonly MidiNoteEvent[],
  withIds: false,
): MidiClipEvents;
function encodeNoteColumns(
  events: readonly MidiNoteEvent[],
  withIds: boolean,
): DraftNoteColumns {
  const order = sortedOrder(events);
  const len = order.length;
  const columns: DraftNoteColumns = {
    notes: new Array<number>(len),
    velocities: new Array<number>(len),
    startTickDeltas: new Array<number>(len),
    durations: new Array<number>(len),
    channels: new Array<number>(len),
  };
  const ids = withIds ? new Array<string>(len) : null;
  let previousTick = 0;
  for (let i = 0; i < len; i++) {
    const event = events[order[i]];
    columns.notes[i] = event.note;
    columns.velocities[i] = event.velocity;
    columns.startTickDeltas[i] = event.startTick - previousTick;
    columns.durations[i] = event.durationTicks;
    columns.channels[i] = event.channel;
    if (ids) ids[i] = event.id ?? '';
    previousTick = event.startTick;
  }
  if (ids) columns.ids = ids;
  return columns;
}

/**
 * A clip's controller events (the sustain pedal, the mod wheel), columnar
 * like its notes. Sorted by tick only, keeping the order of events on one
 * tick: the last value written on a tick is the one that holds.
 */
interface DraftCcColumns {
  tickDeltas: number[];
  controllers: number[];
  values: number[];
  channels: number[];
}

function encodeCcColumns(events: readonly MidiCCEvent[]): DraftCcColumns {
  const order = events.map((_, i) => i);
  order.sort((a, b) => events[a].tick - events[b].tick || a - b);
  const columns: DraftCcColumns = {
    tickDeltas: [],
    controllers: [],
    values: [],
    channels: [],
  };
  let previousTick = 0;
  for (const index of order) {
    const event = events[index];
    columns.tickDeltas.push(event.tick - previousTick);
    columns.controllers.push(event.controller);
    columns.values.push(event.value);
    columns.channels.push(event.channel);
    previousTick = event.tick;
  }
  return columns;
}

// ── The stored draft ───────────────────────────────────────────────────────

/**
 * Where each local store key sits in the draft: at the top of `data`, in
 * one of its sections, or written by a codec of its own (the tracks; the
 * Score's note marks, stored by note id). v2's fields keep their v2 paths.
 * The type requires a place for every local key the registry declares, so a
 * new doc or view key is placed here or nothing compiles.
 */
const DRAFT_LAYOUT = {
  projectId: 'data',
  projectName: 'data',
  composerName: 'data',

  bpm: 'transport',
  timeSignatureNumerator: 'transport',
  timeSignatureDenominator: 'transport',
  loopStart: 'transport',
  loopEnd: 'transport',
  position: 'transport',
  loopEnabled: 'transport',

  tracks: 'tracks',

  rootNote: 'prism',
  mode: 'prism',
  rhythmName: 'prism',
  genre: 'prism',
  swing: 'prism',
  rootLocked: 'prism',
  chordRegions: 'data',
  chordSeq: 'prism',
  stringSeq: 'prism',
  strumMode: 'prism',
  strumAmount: 'prism',
  tiltMode: 'prism',
  tiltAmount: 'prism',
  filterPercent: 'prism',
  chordRecordMode: 'prism',

  measuresPerLine: 'notation',
  measureRowSizes: 'notation',
  measureRestMap: 'notation',
  measureFermatas: 'notation',
  leadSheetChordFormat: 'notation',
  leadSheetSections: 'notation',
  leadSheetRepeats: 'notation',
  leadSheetShowRepeats: 'notation',
  leadSheetShowMelody: 'notation',
  leadSheetMelodyTrackId: 'notation',
  scoreChordTracks: 'notation',
  scoreChordHidden: 'notation',
  scoreArticulations: 'noteMarks',
  scoreSlurs: 'noteMarks',
  scoreSpellings: 'noteMarks',
  scoreSlashNotes: 'noteMarks',
  scoreSystemBreaks: 'notation',
  scorePageBreaks: 'notation',
  scoreSystemRuns: 'notation',
  scoreTextMarks: 'notation',

  markers: 'data',

  masterVolume: 'mixer',
  masteringFxChain: 'mixer',
  masteringEffects: 'mixer',
  masterAutomation: 'data',
  returns: 'data',
  masteringBypass: 'view',

  clipColorMode: 'data',
  currentView: 'view',
  libraryOpen: 'view',
  channelStripTab: 'view',
  timelineZoom: 'view',
  timelineScrollLeft: 'view',
  selectedTrackId: 'view',
  automationOpenTrackId: 'view',
  automationParamId: 'view',
} as const satisfies { readonly [K in LocalKey]: DraftPlace };

/** The store keys a draft holds: the registry's doc and view keys. */
export type LocalKey = DocKey | ViewKey;

/** The parts of `data` a local key can sit in. */
type DraftSectionName =
  | 'data'
  | 'transport'
  | 'prism'
  | 'mixer'
  | 'notation'
  | 'view';
type DraftPlace = DraftSectionName | 'tracks' | 'noteMarks';

/** The local keys placed at `P`. */
type KeysAt<P extends DraftPlace> = {
  [K in LocalKey]: (typeof DRAFT_LAYOUT)[K] extends P ? K : never;
}[LocalKey];

/** The local keys written as they are, in a section of `data`. */
export type SectionKey = KeysAt<DraftSectionName>;

/** Where `key` sits in the draft (for the layout's tests). */
export function draftPlaceOf(key: LocalKey): DraftPlace {
  return DRAFT_LAYOUT[key];
}

type DraftSection<P extends DraftSectionName> = Partial<
  Pick<AllSlices, KeysAt<P>>
>;

/**
 * A Track's per-track settings blob, which the cloud payload carries too
 * (`settings_json` on the server). The fields of TRACK_PLACES marked
 * 'settings', plus three of the blob's own.
 */
export interface SerializedTrackSettings
  extends Partial<Pick<Track, TrackSettingsField>> {
  // The track's own id at save time. A cloud open loads the track under it
  // (planCloudTrackIds) and remaps cross-track references through it
  // (rewriteTrackRefs); a local load keeps ids anyway.
  sourceTrackId?: string;
  // The Oracle synth patch of an oracle-synth track. The synth params live in
  // a shared store and a per-track cache (synthTrackState.ts), not on the
  // Track, so a save takes it from there and a load seeds it back.
  oracleSynth?: SynthTrackState;
  // Cloud saves only: the Master bus automation lanes. The API stores this
  // blob opaquely but has no project-level field for them, so they ride on
  // the first track's settings (masterAutomationFromCloud).
  masterAutomation?: AutomationLanes;
  // Cloud saves only: the role the student picked for chord analysis. The
  // API has no column for it either; a save without it re-guesses it.
  trackRole?: DawTrackRole;
}

/** A MIDI clip in the draft: the v2 clip and the columns v3 adds. */
interface DraftMidiClip {
  id: string;
  name?: string;
  startTick: number;
  durationTicks?: number;
  events: DraftNoteColumns;
  ccEvents?: DraftCcColumns;
}

/** An audio clip in the draft, as v2 wrote it. */
interface DraftAudioClip {
  id: string;
  startTick: number;
  duration: number;
  fadeInTicks: number;
  fadeOutTicks: number;
  // Carried so a refresh after Save doesn't upload uploaded clips again.
  assetId?: string | null;
  offsetSeconds?: number;
  gain?: number;
}

/** A track in the draft: the Track's top-level fields and its settings. */
interface DraftTrack {
  id: string;
  name: string;
  type: TrackType;
  instrument: string;
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  recordArmed: boolean;
  monitoring: boolean;
  midiInputId: string | null;
  audioInputId: string | null;
  // This person's input channel for a live track. Draft only: channel
  // numbers belong to one audio interface. Optional: older drafts have none.
  audioInputChannel?: AudioInputChannel | null;
  // Optional: drafts from before 1.1 load as 'auto'.
  trackRole?: DawTrackRole;
  midiClips: DraftMidiClip[];
  audioClips: DraftAudioClip[];
  activeEffects?: string[];
  settings?: SerializedTrackSettings;
}

/** `data` of a stored draft: v2's fields at their v2 paths, and v3's. */
export interface DraftData extends DraftSection<'data'> {
  transport: DraftSection<'transport'> & {
    bpm: number;
    position: number;
    loopEnabled: boolean;
    loopStart: number;
    loopEnd: number;
    // Drafts from before 1.3 only. The metronome is a per-user pref now, and
    // a v3 draft never carries it.
    metronomeEnabled?: boolean;
  };
  tracks: DraftTrack[];
  prism: DraftSection<'prism'> & {
    rootNote: number | null;
    rhythmName: string;
    genre: string;
    swing: number;
  };
  mixer?: DraftSection<'mixer'>;
  notation?: DraftSection<'notation'> & {
    /** The Score's note marks, keyed by note id (notationCodec). */
    marks?: PersistedNoteMarks;
  };
  view?: DraftSection<'view'>;
}

/**
 * A draft as storage holds it. `version` is the envelope: 2 for every draft
 * since v2. `schema` is 3 for a v3 draft and absent from older ones, and
 * `compat` the oldest schema that may read it (SESSION_COMPAT_VERSION).
 */
export interface StoredSession {
  version: number;
  schema?: number;
  compat?: number;
  timestamp: number;
  data: DraftData;
}

// ── Tracks in the draft ────────────────────────────────────────────────────

/** Where a Track field sits in a draft track; 'none' keeps it out. */
type TrackPlace = 'top' | 'settings' | 'none';

/**
 * Where each Track field sits: on the track, in its settings blob, or
 * nowhere ('none'), for a field no draft keeps. The blob's fields are v2's
 * and the cloud's, so it stays the same blob. The type requires a place for
 * every Track field, and codecV3.test holds the places to the registry: a
 * field the registry keeps out of the draft (its `local` is false) is never
 * written, whatever its place says.
 *
 * The Guitar/Bass-to-MIDI binding (audioMidiSource) stays with the session
 * that made it, as it was built to: it names this person's live input, and a
 * reload asks them to pick it again.
 */
const TRACK_PLACES = {
  id: 'top',
  name: 'top',
  type: 'top',
  instrument: 'top',
  gmProgram: 'settings',
  color: 'top',
  mute: 'top',
  solo: 'top',
  volume: 'top',
  pan: 'top',
  recordArmed: 'top',
  monitoring: 'top',
  midiInputId: 'top',
  audioInputId: 'top',
  audioInputChannel: 'top',
  audioMidiSource: 'none',
  effects: 'settings',
  activeEffects: 'top',
  midiClips: 'top',
  audioClips: 'top',
  vocalChain: 'settings',
  guitarChain: 'settings',
  drumPads: 'settings',
  drumKit: 'settings',
  bassVoice: 'settings',
  samplerSample: 'settings',
  organState: 'settings',
  presetName: 'settings',
  sends: 'settings',
  automation: 'settings',
  trackRole: 'top',
} as const satisfies { readonly [K in keyof Track]-?: TrackPlace };

type TrackSettingsField = {
  [K in keyof Track]-?: (typeof TRACK_PLACES)[K] extends 'settings' ? K : never;
}[keyof Track];

const TRACK_KEYS = Object.keys(TRACK_PLACES) as (keyof Track)[];
/**
 * The fields placed at `place` that the registry keeps in the draft: one it
 * stops keeping drops out here even before its place says so.
 */
const fieldsAt = (place: TrackPlace) =>
  TRACK_KEYS.filter(
    (key) => TRACK_PLACES[key] === place && TRACK_FIELDS[key].local,
  );
const TOP_FIELDS = fieldsAt('top');
const SETTINGS_FIELDS = fieldsAt('settings') as TrackSettingsField[];
/** The fields no draft holds: a load gives each its default. */
const UNSAVED_FIELDS = TRACK_KEYS.filter(
  (key) =>
    !TOP_FIELDS.includes(key) && !(SETTINGS_FIELDS as string[]).includes(key),
);

/** Where `field` sits in a draft track (for the layout's tests). */
export function trackPlaceOf(field: keyof Track): TrackPlace {
  return TRACK_PLACES[field];
}

/** A track's Oracle patch as a save writes it; undefined when it has none. */
export type SynthPatchOf = (trackId: string) => SynthTrackState | undefined;

/**
 * The settings blob of `track` (undefined fields drop out on JSON encode).
 * The cloud save sends the same blob.
 */
export function trackSettings(
  track: Track,
  patchOf: SynthPatchOf,
): SerializedTrackSettings {
  const settings: Record<string, unknown> = {};
  for (const key of SETTINGS_FIELDS) settings[key] = track[key];
  settings.sourceTrackId = track.id;
  settings.oracleSynth =
    track.instrument === 'oracle-synth' ? patchOf(track.id) : undefined;
  return settings as SerializedTrackSettings;
}

function encodeMidiClip(clip: MidiClip): DraftMidiClip {
  return {
    id: clip.id,
    name: clip.name,
    startTick: clip.startTick,
    durationTicks: clip.durationTicks,
    events: encodeNoteColumns(clip.events, true),
    ccEvents: clip.ccEvents && encodeCcColumns(clip.ccEvents),
  } satisfies Record<keyof MidiClip, unknown>;
}

function encodeAudioClip(clip: AudioClip): DraftAudioClip {
  return {
    id: clip.id,
    startTick: clip.startTick,
    duration: clip.duration,
    fadeInTicks: clip.fadeInTicks ?? 0,
    fadeOutTicks: clip.fadeOutTicks ?? 0,
    assetId: clip.assetId ?? null,
    offsetSeconds: clip.offsetSeconds,
    gain: clip.gain,
  } satisfies Record<keyof AudioClip, unknown>;
}

function encodeTrack(track: Track, patchOf: SynthPatchOf): DraftTrack {
  const out: Record<string, unknown> = {};
  for (const key of TOP_FIELDS) {
    if (key === 'midiClips')
      out.midiClips = track.midiClips.map(encodeMidiClip);
    else if (key === 'audioClips')
      out.audioClips = track.audioClips.map(encodeAudioClip);
    else out[key] = track[key];
  }
  out.settings = trackSettings(track, patchOf);
  return out as unknown as DraftTrack;
}

// ── Encode ─────────────────────────────────────────────────────────────────

/** A project as the codec reads it: the registry's local keys. */
export type ProjectSnapshot = Pick<AllSlices, LocalKey>;

/** The Score's note marks of `project`, as the store keys them. */
function marksOf(project: ProjectSnapshot): NoteMarksInMemory {
  return {
    scoreArticulations: project.scoreArticulations,
    scoreSlurs: project.scoreSlurs,
    scoreSpellings: project.scoreSpellings,
    scoreSlashNotes: project.scoreSlashNotes,
  };
}

/**
 * The project as a v3 draft. Deterministic: the same project, patches and
 * timestamp always give the same draft, and nothing is minted. A Score mark
 * whose note is gone is left out (notationCodec).
 */
export function encodeSession(
  project: ProjectSnapshot,
  patchOf: SynthPatchOf,
  timestamp: number,
): StoredSession {
  // Every note goes out with a whole id, and every mark under that same id
  // (see notationCodec): the store keeps them whole, and for a note that
  // isn't, ensureProjectNoteIds derives the same id every time.
  const tracks = ensureProjectNoteIds(project.tracks);
  const sections: Record<DraftSectionName, Record<string, unknown>> = {
    data: {},
    transport: {},
    prism: {},
    mixer: {},
    notation: {},
    view: {},
  };
  for (const key of LOCAL_KEYS as readonly LocalKey[]) {
    const place = DRAFT_LAYOUT[key];
    if (place === 'tracks' || place === 'noteMarks') continue;
    sections[place][key] = project[key];
  }
  sections.notation.marks = encodeNoteMarks(marksOf(project), tracks).marks;

  return {
    version: SESSION_ENVELOPE_VERSION,
    schema: SESSION_SCHEMA_VERSION,
    compat: SESSION_COMPAT_VERSION,
    timestamp,
    data: {
      ...sections.data,
      transport: sections.transport,
      tracks: tracks.map((track) => encodeTrack(track, patchOf)),
      prism: sections.prism,
      mixer: sections.mixer,
      notation: sections.notation,
      view: sections.view,
    } as unknown as DraftData,
  };
}

// ── Decode: checking what a draft holds ────────────────────────────────────

/** How many values a decode replaced because they were the wrong type. */
interface Repairs {
  count: number;
}

/**
 * A stored value, checked: the value to load, or undefined when it can't be
 * used (the caller loads the default instead and counts a repair). A check
 * may repair inside a value (an entry of a list), counting each repair.
 */
type Check<T> = (raw: unknown, repairs: Repairs) => T | undefined;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const valid =
  <T>(test: (v: unknown) => boolean): Check<T> =>
  (raw) =>
    test(raw) ? (raw as T) : undefined;

const atLeast = (min: number) => (v: unknown) => isFiniteNumber(v) && v >= min;
const above = (min: number) => (v: unknown) => isFiniteNumber(v) && v > min;
const integerIn = (min: number, max: number) => (v: unknown) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const nullable =
  <T>(check: Check<T>): Check<T | null> =>
  (raw, repairs) =>
    raw === null ? null : check(raw, repairs);

/** A list, keeping each entry `entry` accepts and counting each it doesn't. */
const listOf =
  <T>(entry: Check<T>): Check<T[]> =>
  (raw, repairs) => {
    if (!Array.isArray(raw)) return undefined;
    const out: T[] = [];
    for (const item of raw) {
      const value = entry(item, repairs);
      if (value === undefined) repairs.count++;
      else out.push(value);
    }
    return out;
  };

const STRINGS = listOf(valid<string>(isString));
const BAR_INDICES = listOf(
  valid<number>(integerIn(0, Number.MAX_SAFE_INTEGER)),
);

/** A record, kept as it is when `test` accepts it. */
const recordWhere =
  <T>(test: (r: Record<string, unknown>) => boolean): Check<T> =>
  (raw) =>
    isRecord(raw) && test(raw) ? (raw as T) : undefined;

/** A nested spec's default, made fresh when it is a factory. */
const specDefault = (spec: { default: unknown }): unknown =>
  typeof spec.default === 'function'
    ? (spec.default as () => unknown)()
    : spec.default;

/**
 * Repair `record[field]` in place: kept when `test` accepts it; otherwise
 * set to `fallback`, or for an optional field (no fallback) removed unless
 * it is just absent. Each repair is counted.
 */
function repairField(
  record: Record<string, unknown>,
  field: string,
  test: (v: unknown) => boolean,
  repairs: Repairs,
  fallback?: unknown,
): void {
  const value = record[field];
  if (test(value)) return;
  if (fallback !== undefined) record[field] = fallback;
  else if (value === undefined) return;
  else delete record[field];
  repairs.count++;
}

const isColour = (v: unknown) =>
  Array.isArray(v) && v.length === 3 && v.every(isFiniteNumber);
const isNumberList = (v: unknown) =>
  Array.isArray(v) && v.every(isFiniteNumber);

/**
 * A chord region with the registry's types (CHORD_REGION_FIELDS), and any
 * field it doesn't list kept. Its identity is kept verbatim (decision D3):
 * readers trust it only while its label is the region's name
 * (identityIsCurrent). A missing id is left empty for dedupeChordRegionIds
 * to fill.
 */
const CHORD_REGION: Check<ChordRegion> = (raw, repairs) => {
  if (!isRecord(raw)) return undefined;
  const region: Record<string, unknown> = { ...raw };
  if (!isString(region.id) || region.id === '') {
    region.id = '';
    repairs.count++;
  }
  const spec = CHORD_REGION_FIELDS;
  repairField(
    region,
    'startTick',
    isFiniteNumber,
    repairs,
    specDefault(spec.startTick),
  );
  repairField(
    region,
    'endTick',
    isFiniteNumber,
    repairs,
    specDefault(spec.endTick),
  );
  repairField(region, 'name', isString, repairs, specDefault(spec.name));
  repairField(
    region,
    'noteName',
    isString,
    repairs,
    specDefault(spec.noteName),
  );
  repairField(region, 'color', isColour, repairs, specDefault(spec.color));
  repairField(region, 'rawStartTick', isFiniteNumber, repairs);
  repairField(region, 'degreeKey', isString, repairs);
  repairField(region, 'midis', isNumberList, repairs);
  repairField(region, 'confidence', isFiniteNumber, repairs);
  return region as unknown as ChordRegion;
};

/** A timeline marker with the registry's types; one without an id is lost. */
const MARKER: Check<Marker> = (raw, repairs) => {
  if (!isRecord(raw) || !isString(raw.id)) return undefined;
  const marker: Record<string, unknown> = { ...raw };
  const spec = MARKER_FIELDS;
  repairField(marker, 'tick', isFiniteNumber, repairs, specDefault(spec.tick));
  repairField(marker, 'name', isString, repairs, specDefault(spec.name));
  repairField(marker, 'color', isString, repairs, specDefault(spec.color));
  return marker as unknown as Marker;
};

const TEXT_MARK = recordWhere<ScoreTextMark>(
  (r) =>
    isString(r.id) &&
    Number.isInteger(r.measureIdx) &&
    isString(r.kind) &&
    Object.prototype.hasOwnProperty.call(MARK_STYLES, r.kind) &&
    (r.text === undefined || isString(r.text)),
);

const SECTION = recordWhere<AllSlices['leadSheetSections'][number]>(
  (r) => Number.isInteger(r.measureIdx) && isString(r.label),
);
const REPEAT = recordWhere<AllSlices['leadSheetRepeats'][number]>(
  (r) => Number.isInteger(r.startMeasure) && Number.isInteger(r.endMeasure),
);
const SYSTEM_RUN: Check<[number, number]> = (raw) =>
  Array.isArray(raw) &&
  raw.length === 2 &&
  Number.isInteger(raw[0]) &&
  Number.isInteger(raw[1])
    ? (raw as [number, number])
    : undefined;

/** The effect slots every chain has. */
const EFFECT_SLOTS = Object.keys(DEFAULT_EFFECTS);

/**
 * Saved effects over the defaults. A slot added since the draft was written
 * comes from the defaults, and so does a slot that isn't a record (counted),
 * so no chain meets a null slot; a slot the defaults don't have is kept as
 * saved. With `deep`, each saved slot is merged over its default too, so a
 * parameter added since arrives set: the mastering rack's are. A track's and
 * a bus's effects merge one level deep, as they always have.
 */
function effectsOverDefaults(
  saved: Record<string, unknown>,
  repairs: Repairs,
  deep = false,
): TrackEffectState {
  const defaults = structuredClone(DEFAULT_EFFECTS) as unknown as Record<
    string,
    unknown
  >;
  const merged: Record<string, unknown> = { ...defaults, ...saved };
  for (const slot of EFFECT_SLOTS) {
    const value = saved[slot];
    if (value === undefined) {
      merged[slot] = defaults[slot];
    } else if (!isRecord(value)) {
      merged[slot] = defaults[slot];
      repairs.count++;
    } else if (deep) {
      merged[slot] = { ...(defaults[slot] as object), ...value };
    }
  }
  return merged as unknown as TrackEffectState;
}

/**
 * The mastering rack, backfilled two levels deep: a slot added since the
 * draft was written comes from the defaults, and so does a parameter added
 * to a slot it has, so the master chain never meets an undefined setting.
 */
const MASTERING_EFFECTS: Check<TrackEffectState> = (raw, repairs) =>
  isRecord(raw) ? effectsOverDefaults(raw, repairs, true) : undefined;

const AUTOMATION_POINT = recordWhere<AutomationPoint>(
  (r) => isFiniteNumber(r.tick) && isFiniteNumber(r.value),
);

/** Automation lanes: each lane a list of points; anything else is dropped. */
const AUTOMATION: Check<AutomationLanes> = (raw, repairs) => {
  if (!isRecord(raw)) return undefined;
  const lanes: AutomationLanes = {};
  for (const [lane, points] of Object.entries(raw)) {
    const checked = listOf(AUTOMATION_POINT)(points, repairs);
    if (checked === undefined) repairs.count++;
    else lanes[lane] = checked;
  }
  return lanes;
};

/** A return bus, its effects merged over the defaults as a track's are. */
const RETURN_BUS: Check<ReturnBus> = (raw, repairs) => {
  if (
    !isRecord(raw) ||
    !isString(raw.id) ||
    !isString(raw.label) ||
    !isFiniteNumber(raw.volume) ||
    !Array.isArray(raw.fxChain)
  ) {
    return undefined;
  }
  if (raw.effects !== undefined && !isRecord(raw.effects)) repairs.count++;
  return {
    ...raw,
    effects: effectsOverDefaults(
      isRecord(raw.effects) ? raw.effects : {},
      repairs,
    ),
  } as unknown as ReturnBus;
};

/** The return buses; with none (from before buses existed) the default two. */
const RETURNS: Check<ReturnBus[]> = (raw, repairs) => {
  const buses = listOf(RETURN_BUS)(raw, repairs);
  if (buses === undefined) return undefined;
  return buses.length > 0 ? buses : defaultReturns();
};

/**
 * Return buses as a draft, the cloud payload or a collaborator's room holds
 * them, checked: a bus that isn't one is dropped, each one's effect slots
 * are backfilled, and none at all (or anything but a list) gives the default
 * two. Never throws.
 */
export function restoreReturns(saved: unknown): ReturnBus[] {
  return RETURNS(saved, { count: 0 }) ?? defaultReturns();
}

/** A rest map: bar index to how many bars the rest lasts. */
const REST_MAP: Check<Record<number, number>> = (raw, repairs) => {
  if (!isRecord(raw)) return undefined;
  const out: Record<number, number> = {};
  for (const [bar, count] of Object.entries(raw)) {
    if (/^\d+$/.test(bar) && Number.isInteger(count) && (count as number) > 0) {
      out[Number(bar)] = count as number;
    } else repairs.count++;
  }
  return out;
};

const CHORD_SEQ = listOf(listOf(valid<number>(isFiniteNumber)));

/**
 * A member of a string union. `members` has one entry per member, so one
 * added to the union fails to compile until it is added here, rather than
 * loading as the default on every reload.
 */
const memberOf = <T extends string>(
  members: Readonly<Record<T, true>>,
): Check<T> =>
  valid((v) => isString(v) && Object.prototype.hasOwnProperty.call(members, v));

/**
 * Whether a draft saved on each view opens on it. Practice needs the lesson
 * context milestone 1.15 saves; until then such a draft opens on Create.
 */
const RESTORES_VIEW: Readonly<Record<ViewType, boolean>> = {
  arrange: true,
  studio: true,
  score: true,
  leadsheet: true,
  practice: false,
};
const VIEWS = memberOf<ViewType>({
  arrange: true,
  studio: true,
  score: true,
  leadsheet: true,
  practice: true,
});

/**
 * How each local key written as it is gets checked on load. The type
 * requires one for every such key, so a new doc or view key gets a check or
 * nothing compiles.
 */
const KEY_CHECKS: { readonly [K in SectionKey]: Check<AllSlices[K]> } = {
  projectId: nullable(valid(isString)),
  projectName: valid(isString),
  composerName: valid(isString),

  bpm: valid(above(0)),
  timeSignatureNumerator: valid(integerIn(1, 64)),
  timeSignatureDenominator: valid(integerIn(1, 64)),
  loopStart: valid(atLeast(0)),
  loopEnd: valid(atLeast(0)),
  position: valid(atLeast(0)),
  loopEnabled: valid(isBoolean),

  rootNote: nullable(valid(integerIn(0, 11))),
  mode: valid((v) => isString(v) && v !== ''),
  rhythmName: valid(isString),
  genre: valid(isString),
  swing: valid(isFiniteNumber),
  rootLocked: valid(isBoolean),
  chordRegions: (raw, repairs) => {
    const regions = listOf(CHORD_REGION)(raw, repairs);
    return regions && dedupeChordRegionIds(regions);
  },
  chordSeq: CHORD_SEQ,
  stringSeq: STRINGS,
  strumMode: valid(isFiniteNumber),
  strumAmount: valid(isFiniteNumber),
  tiltMode: valid(isFiniteNumber),
  tiltAmount: valid(isFiniteNumber),
  filterPercent: valid((v) => isFiniteNumber(v) && v >= 0 && v <= 1),
  chordRecordMode: memberOf<ChordRecordMode>({
    replace: true,
    locked: true,
    merge: true,
  }),

  measuresPerLine: valid(integerIn(1, 64)),
  measureRowSizes: nullable(listOf(valid(integerIn(1, 64)))),
  measureRestMap: nullable(REST_MAP),
  measureFermatas: nullable(BAR_INDICES),
  leadSheetChordFormat: memberOf<LeadSheetChordFormat>({
    jazz: true,
    hybrid: true,
    numbers: true,
  }),
  leadSheetSections: listOf(SECTION),
  leadSheetRepeats: listOf(REPEAT),
  leadSheetShowRepeats: valid(isBoolean),
  leadSheetShowMelody: valid(isBoolean),
  leadSheetMelodyTrackId: nullable(valid(isString)),
  scoreChordTracks: STRINGS,
  scoreChordHidden: STRINGS,
  scoreSystemBreaks: BAR_INDICES,
  scorePageBreaks: BAR_INDICES,
  scoreSystemRuns: listOf(SYSTEM_RUN),
  scoreTextMarks: listOf(TEXT_MARK),

  markers: listOf(MARKER),

  masterVolume: valid(atLeast(0)),
  masteringFxChain: STRINGS as Check<AllSlices['masteringFxChain']>,
  masteringEffects: MASTERING_EFFECTS,
  masterAutomation: AUTOMATION,
  returns: RETURNS,
  masteringBypass: valid(isBoolean),

  clipColorMode: memberOf<AllSlices['clipColorMode']>({
    track: true,
    prism: true,
  }),
  currentView: VIEWS,
  libraryOpen: valid(isBoolean),
  channelStripTab: nullable(valid(isChannelStripTabId)),
  timelineZoom: valid(above(0)),
  timelineScrollLeft: valid(atLeast(0)),
  selectedTrackId: nullable(valid(isString)),
  automationOpenTrackId: nullable(valid(isString)),
  automationParamId: valid(isString),
};

/**
 * The chord lane with an id of its own on every region. Chord ids used to
 * come from a counter that restarted on each page load, so a save can hold
 * two regions with one id, and an edit by id then lands on the wrong chord.
 * The first region keeps the id and each later one gets the id with a
 * number added, the first that is free: derived, not random, so loading the
 * same draft twice gives the same ids (the kept-work check compares two
 * loads). Returns the same array when nothing repeats.
 */
export function dedupeChordRegionIds(regions: ChordRegion[]): ChordRegion[] {
  const taken = new Set(regions.map((region) => region.id));
  const seen = new Set<string>();
  let repaired: ChordRegion[] | null = null;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    if (region.id && !seen.has(region.id)) {
      seen.add(region.id);
      continue;
    }
    const base = region.id || 'chord';
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    const id = `${base}-${n}`;
    taken.add(id);
    seen.add(id);
    repaired ??= [...regions];
    repaired[i] = { ...region, id };
  }
  return repaired ?? regions;
}

// ── Decode: tracks ─────────────────────────────────────────────────────────

const TRACK_ROLE = memberOf<DawTrackRole>({
  chords: true,
  melody: true,
  bass: true,
  drums: true,
  auto: true,
});

const INPUT_CHANNEL: Check<AudioInputChannel> = (raw) => {
  if (!isRecord(raw)) return undefined;
  const channelOk = integerIn(0, 1024);
  if (raw.mode === 'mono' && channelOk(raw.channel)) {
    return raw as unknown as AudioInputChannel;
  }
  if (raw.mode === 'stereo' && channelOk(raw.left) && channelOk(raw.right)) {
    return raw as unknown as AudioInputChannel;
  }
  return undefined;
};

/** How each settings field is checked: an optional field of its own type. */
const SETTINGS_CHECKS: {
  readonly [K in TrackSettingsField]: Check<NonNullable<Track[K]>>;
} = {
  gmProgram: valid(integerIn(0, 127)),
  effects: (raw, repairs) =>
    isRecord(raw) ? effectsOverDefaults(raw, repairs) : undefined,
  vocalChain: valid(Array.isArray),
  guitarChain: valid(Array.isArray),
  drumPads: valid(isRecord),
  drumKit: valid(isString),
  bassVoice: valid(isString),
  samplerSample: (raw) =>
    isRecord(raw)
      ? ensureSamplerSampleId(raw as unknown as SamplerSampleRef)
      : undefined,
  organState: valid(isRecord),
  presetName: valid(isString),
  sends: valid(isRecord),
  automation: AUTOMATION,
};

/**
 * Spread a track's saved settings back onto it. Effects merge over the
 * defaults, so a slot added since the save was written (multiband, say)
 * arrives set rather than undefined; a Chops sample saved before samples had
 * ids gets a deterministic one (ensureSamplerSampleId). A field of the wrong
 * type is left out and counted.
 */
export function applyTrackSettings(
  settings: SerializedTrackSettings | undefined,
  repairs: Repairs = { count: 0 },
): Pick<Track, TrackSettingsField> {
  const saved: Record<string, unknown> = isRecord(settings) ? settings : {};
  const out: Record<string, unknown> = {};
  for (const key of SETTINGS_FIELDS) {
    const raw = saved[key];
    if (raw === undefined) continue;
    const value = (SETTINGS_CHECKS[key] as Check<unknown>)(raw, repairs);
    if (value === undefined) repairs.count++;
    else out[key] = value;
  }
  out.effects ??= trackFieldDefault('effects');
  return out as Pick<Track, TrackSettingsField>;
}

/**
 * A field that has a default for every track (none depends on the
 * instrument once a track exists), checked: the stored value, or the
 * default when it is absent or the wrong type.
 */
function trackField<K extends keyof Track>(
  key: K,
  raw: unknown,
  check: Check<Track[K]>,
  repairs: Repairs,
): Track[K] {
  if (raw === undefined) return trackFieldDefault(key);
  const value = check(raw, repairs);
  if (value !== undefined) return value;
  repairs.count++;
  return trackFieldDefault(key);
}

/** A column read as a number, `fallback` (counted) when it isn't one. */
function columnValue(
  column: readonly unknown[],
  index: number,
  fallback: number,
  repairs: Repairs,
): number {
  const value = column[index];
  if (isFiniteNumber(value)) return value;
  repairs.count++;
  return fallback;
}

const NOTE_DEFAULTS = {
  velocity: NOTE_EVENT_FIELDS.velocity.default as number,
  durationTicks: NOTE_EVENT_FIELDS.durationTicks.default as number,
  channel: NOTE_EVENT_FIELDS.channel.default as number,
};

/**
 * A clip's notes from their columns (equal lengths: migrations.ts checks
 * that). A note without a pitch is dropped; any other value of the wrong
 * type takes its default. An id that isn't a note id, or an ids column of
 * the wrong length, is left for ensureProjectNoteIds to fill.
 */
function decodeNoteColumns(
  columns: DraftNoteColumns,
  repairs: Repairs,
): MidiNoteEvent[] {
  const len = columns.notes.length;
  let ids: readonly unknown[] | null = null;
  if (columns.ids !== undefined) {
    if (Array.isArray(columns.ids) && columns.ids.length === len) {
      ids = columns.ids;
    } else repairs.count++;
  }
  const events: MidiNoteEvent[] = [];
  let tick = 0;
  for (let i = 0; i < len; i++) {
    tick += columnValue(columns.startTickDeltas, i, 0, repairs);
    const note = columns.notes[i];
    if (!isFiniteNumber(note)) {
      repairs.count++;
      continue;
    }
    const event: MidiNoteEvent = {
      note,
      velocity: columnValue(
        columns.velocities,
        i,
        NOTE_DEFAULTS.velocity,
        repairs,
      ),
      startTick: tick,
      durationTicks: columnValue(
        columns.durations,
        i,
        NOTE_DEFAULTS.durationTicks,
        repairs,
      ),
      channel: columnValue(columns.channels, i, NOTE_DEFAULTS.channel, repairs),
    };
    const id = ids?.[i];
    if (isNoteId(id)) event.id = id;
    events.push(event);
  }
  return events;
}

/** A clip's controller events, or undefined when its columns don't line up. */
function decodeCcColumns(
  raw: unknown,
  repairs: Repairs,
): MidiCCEvent[] | undefined {
  if (raw === undefined) return undefined;
  const columns = isRecord(raw) ? raw : null;
  const lists = columns
    ? [
        columns.tickDeltas,
        columns.controllers,
        columns.values,
        columns.channels,
      ]
    : [];
  if (
    !columns ||
    !lists.every(Array.isArray) ||
    new Set(lists.map((list) => (list as unknown[]).length)).size !== 1
  ) {
    repairs.count++;
    return undefined;
  }
  const [deltas, controllers, values, channels] = lists as unknown[][];
  const events: MidiCCEvent[] = [];
  let tick = 0;
  for (let i = 0; i < deltas.length; i++) {
    tick += columnValue(deltas, i, 0, repairs);
    if (!isFiniteNumber(controllers[i])) {
      repairs.count++;
      continue;
    }
    events.push({
      tick,
      controller: controllers[i] as number,
      value: columnValue(values, i, 0, repairs),
      channel: columnValue(channels, i, 0, repairs),
    });
  }
  return events;
}

function decodeMidiClip(
  raw: DraftMidiClip,
  where: string,
  repairs: Repairs,
): MidiClip {
  const clip: MidiClip = {
    id: isString(raw.id) && raw.id !== '' ? raw.id : `clip-${where}`,
    startTick: 0,
    events: decodeNoteColumns(raw.events, repairs),
  };
  if (clip.id !== raw.id) repairs.count++;
  if (isString(raw.name)) clip.name = raw.name;
  if (isFiniteNumber(raw.startTick)) clip.startTick = raw.startTick;
  else repairs.count++;
  if (raw.durationTicks !== undefined) {
    if (isFiniteNumber(raw.durationTicks) && raw.durationTicks > 0) {
      clip.durationTicks = raw.durationTicks;
    } else repairs.count++;
  }
  const ccEvents = decodeCcColumns(raw.ccEvents, repairs);
  if (ccEvents) clip.ccEvents = ccEvents;
  return clip;
}

function decodeAudioClip(
  raw: unknown,
  where: string,
  repairs: Repairs,
): AudioClip | null {
  if (!isRecord(raw)) {
    repairs.count++;
    return null;
  }
  const number = (field: string, fallback: number): number => {
    const value = raw[field];
    if (isFiniteNumber(value)) return value;
    if (value !== undefined) repairs.count++;
    return fallback;
  };
  const clip: AudioClip = {
    id: isString(raw.id) && raw.id !== '' ? raw.id : `audio-${where}`,
    startTick: number('startTick', 0),
    duration: number('duration', 0),
    fadeInTicks: number('fadeInTicks', 0),
    fadeOutTicks: number('fadeOutTicks', 0),
  };
  if (clip.id !== raw.id) repairs.count++;
  if (raw.assetId === null || isString(raw.assetId)) clip.assetId = raw.assetId;
  else if (raw.assetId !== undefined) {
    clip.assetId = null;
    repairs.count++;
  }
  for (const field of ['offsetSeconds', 'gain'] as const) {
    const value = raw[field];
    if (isFiniteNumber(value)) clip[field] = value;
    else if (value !== undefined) repairs.count++;
  }
  return clip;
}

/** Decoded tracks, with the patches to seed and the saved → loaded ids. */
interface DecodedTracks {
  tracks: Track[];
  synthPatches: [string, SynthTrackState][];
  remap: Map<string, string>;
}

/**
 * The draft's tracks as store Tracks: ids as saved (a repeated or invalid
 * one gets a fresh id, the first occurrence keeping it), every field
 * checked, clips decoded, and the Oracle patches collected for the caller to
 * seed. With no MIDI track monitored, the first one is armed and monitored,
 * so a MIDI keyboard plays something.
 */
function decodeTracks(
  raws: readonly DraftTrack[],
  repairs: Repairs,
): DecodedTracks {
  // A draft written by the app never repeats a track id; one that does (or
  // holds an id no track may have) gets `track-<n>`, so loading it twice
  // still gives the same ids.
  let minted = 0;
  const { ids, remap } = planCloudTrackIds(
    raws.map((raw) => raw.id),
    () => `track-${++minted}`,
  );
  const synthPatches: [string, SynthTrackState][] = [];
  const tracks = raws.map((raw, t): Track => {
    const id = ids[t];
    if (id !== raw.id) repairs.count++;
    const instrument = isString(raw.instrument) ? raw.instrument : 'none';
    if (instrument !== raw.instrument) repairs.count++;
    const name = trackField('name', raw.name, valid(isString), repairs);
    const settings = isRecord(raw.settings)
      ? (raw.settings as SerializedTrackSettings)
      : undefined;
    if (raw.settings !== undefined && settings === undefined) repairs.count++;

    let type: TrackType;
    if (raw.type === 'midi' || raw.type === 'audio') type = raw.type;
    else {
      repairs.count++;
      type = trackFieldDefault('type', {
        instrument: instrument as Track['instrument'],
        name,
      });
    }

    const track: Track = {
      id,
      name,
      type,
      instrument: instrument as Track['instrument'],
      color: trackField('color', raw.color, valid(isString), repairs),
      mute: trackField('mute', raw.mute, valid(isBoolean), repairs),
      solo: trackField('solo', raw.solo, valid(isBoolean), repairs),
      volume: trackField('volume', raw.volume, valid(isFiniteNumber), repairs),
      pan: trackField('pan', raw.pan, valid(isFiniteNumber), repairs),
      recordArmed: trackField(
        'recordArmed',
        raw.recordArmed,
        valid(isBoolean),
        repairs,
      ),
      monitoring: trackField(
        'monitoring',
        raw.monitoring,
        valid(isBoolean),
        repairs,
      ),
      midiInputId: trackField(
        'midiInputId',
        raw.midiInputId,
        nullable(valid(isString)),
        repairs,
      ),
      audioInputId: trackField(
        'audioInputId',
        raw.audioInputId,
        nullable(valid(isString)),
        repairs,
      ),
      audioInputChannel: trackField(
        'audioInputChannel',
        raw.audioInputChannel,
        nullable(INPUT_CHANNEL),
        repairs,
      ),
      ...applyTrackSettings(settings, repairs),
      activeEffects: trackField(
        'activeEffects',
        raw.activeEffects,
        STRINGS as Check<Track['activeEffects']>,
        repairs,
      ),
      midiClips: raw.midiClips.map((clip, c) =>
        decodeMidiClip(clip, `${t}-${c}`, repairs),
      ),
      audioClips: raw.audioClips.flatMap((clip, c) => {
        const decoded = decodeAudioClip(clip, `${t}-${c}`, repairs);
        return decoded ? [decoded] : [];
      }),
      trackRole: trackField('trackRole', raw.trackRole, TRACK_ROLE, repairs),
    };
    if (instrument === 'oracle-synth' && settings?.oracleSynth !== undefined) {
      if (isRecord(settings.oracleSynth)) {
        synthPatches.push([id, settings.oracleSynth as SynthTrackState]);
      } else repairs.count++;
    }
    // A field the registry keeps out of the draft loads as its default,
    // whatever an older draft holds.
    for (const key of UNSAVED_FIELDS) {
      const value = trackFieldDefault(key);
      if (value === undefined) delete (track as Partial<Track>)[key];
      else (track as unknown as Record<string, unknown>)[key] = value;
    }
    return track;
  });

  if (!tracks.some((t) => t.monitoring && t.type === 'midi')) {
    const firstMidi = tracks.find((t) => t.type === 'midi');
    if (firstMidi) {
      firstMidi.monitoring = true;
      firstMidi.recordArmed = true;
    }
  }
  return { tracks, synthPatches, remap };
}

// ── Decode ─────────────────────────────────────────────────────────────────

/**
 * What a draft loads as: every local key (the draft's value, or its registry
 * default when the draft has none), with the keys a load derives worked out.
 */
type DecodedProject = ProjectSnapshot &
  Pick<AllSlices, 'rootTrackColor' | 'availableNextChords' | 'nextColorIndex'>;

export interface DecodedSession {
  project: DecodedProject;
  /** Each Oracle track's patch, for the caller to seed (setTrackSynthState). */
  synthPatches: [trackId: string, patch: SynthTrackState][];
  /**
   * How many values were the wrong type, or couldn't be read, and loaded as
   * their default.
   */
  repaired: number;
}

/**
 * A v3 draft (migrations.ts brings older ones up to v3 first) as the project
 * it holds. Pure and deterministic: the same draft always gives the same
 * project, note ids included, and nothing is minted. A repeated track or
 * chord id, which only a damaged draft holds, gets one derived from its
 * place.
 */
export function decodeSession(session: StoredSession): DecodedSession {
  const repairs: Repairs = { count: 0 };
  const data = session.data;
  const sections: Record<DraftSectionName, Record<string, unknown>> = {
    data: data as unknown as Record<string, unknown>,
    transport: sectionOf(data.transport),
    prism: sectionOf(data.prism),
    mixer: sectionOf(data.mixer),
    notation: sectionOf(data.notation),
    view: sectionOf(data.view),
  };

  const project: Record<string, unknown> = {};
  for (const key of LOCAL_KEYS as readonly LocalKey[]) {
    const place = DRAFT_LAYOUT[key];
    if (place === 'tracks' || place === 'noteMarks') continue;
    project[key] = checkedKey(
      key as SectionKey,
      () => sections[place][key],
      repairs,
    );
  }

  // The tracks have no default to fall back on: one that can't be read
  // throws, and the draft is kept aside whole (see the top of this file).
  const decoded = decodeTracks(data.tracks, repairs);
  // Every note leaves with a whole id: the id it was saved with, or for one
  // saved without (any v1 or v2 draft), legacyNoteId of its clip and place.
  const withIds = ensureProjectNoteIds(decoded.tracks);
  // References to tracks point at the ids the tracks loaded under; one to a
  // track the draft doesn't hold is cleared.
  const linked = rewriteTrackRefs(
    {
      tracks: withIds,
      scoreChordTracks: project.scoreChordTracks as string[],
      scoreChordHidden: project.scoreChordHidden as string[],
      leadSheetMelodyTrackId: project.leadSheetMelodyTrackId as string | null,
      selectedTrackId: project.selectedTrackId as string | null,
      automationOpenTrackId: project.automationOpenTrackId as string | null,
    },
    decoded.remap,
  );
  Object.assign(project, linked);
  const tracks = linked.tracks;

  Object.assign(
    project,
    readOnItsOwn(
      () => {
        const marks = sections.notation.marks;
        if (marks !== undefined && !isRecord(marks)) repairs.count++;
        return decodeNoteMarks(
          (isRecord(marks) ? marks : {}) as unknown as PersistedNoteMarks,
          tracks,
        );
      },
      noMarks,
      repairs,
    ),
  );

  // A view a draft can't reopen (practice, until milestone 1.15 saves its
  // lesson) opens on Create, with the library open as switching there opens
  // it.
  if (!RESTORES_VIEW[project.currentView as ViewType]) {
    project.currentView = 'arrange';
    project.libraryOpen = true;
  }
  // The track Prism and the lessons act on: as saved, else the first MIDI
  // track, so a loaded project never asks for a track to be selected.
  project.selectedTrackId ??= tracks.find((t) => t.type === 'midi')?.id ?? null;

  const rootNote = project.rootNote as number | null;
  return {
    project: {
      ...(project as ProjectSnapshot),
      rootTrackColor: readOnItsOwn(
        () => keyColourFor(rootNote, project.mode as string),
        () => null,
        repairs,
      ),
      availableNextChords: readOnItsOwn(
        () =>
          nextChordsFor(
            project.stringSeq as string[],
            project.filterPercent as number,
          ),
        () => [],
        repairs,
      ),
      nextColorIndex: tracks.length,
    },
    synthPatches: decoded.synthPatches,
    repaired: repairs.count,
  };
}

const noMarks = (): NoteMarksInMemory => ({
  scoreArticulations: [],
  scoreSlurs: [],
  scoreSpellings: [],
  scoreSlashNotes: [],
});

/**
 * `read()`, or `fallback()` (counted) when it throws, which only a damaged
 * draft makes it do: one part that can't be read costs only itself.
 */
function readOnItsOwn<T>(
  read: () => T,
  fallback: () => T,
  repairs: Repairs,
): T {
  try {
    return read();
  } catch {
    repairs.count++;
    return fallback();
  }
}

/** A section of `data` as a record; a missing or broken one reads as empty. */
function sectionOf(section: unknown): Record<string, unknown> {
  return isRecord(section) ? section : {};
}

/**
 * A local key's stored value, checked: its default when it is absent, the
 * wrong type or throws on reading (counted, bar absent).
 */
function checkedKey<K extends SectionKey>(
  key: K,
  read: () => unknown,
  repairs: Repairs,
): AllSlices[K] {
  return readOnItsOwn(
    () => {
      const raw = read();
      if (raw === undefined) return fieldDefault(key);
      const value = (KEY_CHECKS[key] as Check<AllSlices[K]>)(raw, repairs);
      if (value !== undefined) return value;
      repairs.count++;
      return fieldDefault(key);
    },
    () => fieldDefault(key),
    repairs,
  );
}

/**
 * `raw` as `key` loads from a draft: the value when it checks out, else the
 * key's registry default. The cloud open reads the keys its payload shares
 * with the draft through this, so both load them alike. Never throws.
 */
export function checkedValue<K extends SectionKey>(
  key: K,
  raw: unknown,
): AllSlices[K] {
  return checkedKey(key, () => raw, { count: 0 });
}
