import { DEFAULT_EFFECTS, type EffectSlotType } from '@/daw/audio/EffectChain';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import type { SynthStore } from '@/daw/oracle-synth/store/storeTypes';
import { SYNTH_STATE_KEYS } from '@/daw/oracle-synth/synthPatchKeys';
import { getFirstChords } from '@/daw/prism-engine/engine/progression';
import {
  StrumMode,
  VelocityTilt,
  type MidiCCEvent,
  type MidiNoteEvent,
} from '@/daw/prism-engine/types';
import type { AllSlices } from '@/daw/store';
import type { Marker } from '@/daw/store/markersSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { defaultReturns, type ReturnBus } from '@/daw/store/returnsSlice';
import type {
  AudioClip,
  AudioInputChannel,
  InstrumentType,
  MidiClip,
  Track,
  TrackType,
} from '@/daw/store/tracksSlice';
import { guessTrackRole } from '@/daw/utils/trackRole';

// ── The project document registry ──────────────────────────────────────────
//
// Every piece of editor state, classified once. Before this file six
// hand-kept lists decided what a refresh, a cloud save, a reset, the autosave
// trigger, undo and collab each covered, and they had drifted apart: a
// refresh lost the metre and every Score mark, and a new project inherited
// the last one's markers and mastering. The codec, the resets and the save
// status (and later undo and collab) take their lists from here instead. The
// coverage test (persistence/__tests__/fieldCoverage.test.ts) fails when a
// store key, a synth store key, a Track field or a nested field is left out,
// and the types below fail the build first: a new key is classified here or
// nothing compiles.
//
// Scopes:
// - doc: the project itself. Saved in the draft and with the project, and
//   starts over with a new project. An edit to its content makes the project
//   unsaved. Its one key that isn't content is projectId, the link to the
//   cloud copy, which DOC_CONTENT_KEYS leaves out.
// - view: how this project was last seen on this device (playhead, zoom,
//   view, selected track). Saved in the draft only: never in the cloud, never
//   shared, never undone, and changing it never makes the project unsaved.
// - pref: follows the student from project to project (metronome, snap).
//   Stored per user apart from any project, and never reset by one.
// - session: never saved. Most of it starts over with each project; collab,
//   devices, the clipboard and panel layout carry on (resetOnNew false). One
//   track field is session too: the Guitar/Bass-to-MIDI binding.
// - drop: a key on its way out, written and read by nothing, that its slice
//   still declares. Milestone 1.3 deleted the thirteen it found (the pitch
//   edits, the theme, the eight mastering macros and others), so none is
//   classified today; the coverage test keeps them out of the store.
//
// Flags:
// - local: written to the project's draft on this device (codec v3).
// - cloud: 'legacy' when today's cloud payload carries it, 'document' when
//   only milestone 1.5's document field will, false when the cloud copy
//   doesn't hold it. Two doc fields are false, and the copy loses nothing by
//   either: projectId, which is the copy's own address, and an audio clip's
//   id, which every cloud open mints afresh until milestone 1.10.
// - collab: shared live with everyone in a room. A doc field with collab
//   false still belongs to the project and is saved with it, but in a room
//   each collaborator sets their own (mute, solo, the loop region, the key
//   lock).
// - undo: part of the project's undo history. Collab and undo say what a
//   field should do, not what it does today: milestones 1.9 (undo) and 1.14
//   (sync) build on them.
// - perUser: belongs to the person, not the project, so it never reaches the
//   cloud copy or a room and never makes the project unsaved. That is the
//   prefs, stored per user apart from any project, and the track fields that
//   are this person's own on this device (arm, monitor, inputs), which only
//   the draft keeps. A doc field each collaborator sets for themself is not
//   perUser: it is collab false.
// - resetOnNew: initialProjectState() puts it back to its default for every
//   new project and every load.
//
// Why a field is classified as it is (every session key, the fields each
// person keeps for themself, and any other choice a reader might not expect)
// is written beside this file, in fieldReasons.ts. This registry loads with
// the store on every page of the app, and nothing reads that prose at
// runtime, so it stays out of the bundle: only the tests and the reload
// harness load it.
//
// Defaults are the one source of each key's starting value (decision D6):
// the slices mirror them, and the coverage test holds every slice's initial
// value to them; the resets return to them. A default that is an object or
// an array is a factory, so no two projects ever share one.

/** Where a field lives; see the scopes above. */
export type FieldScope = 'doc' | 'view' | 'pref' | 'session' | 'drop';

/** One field's classification; the scopes and flags are described above. */
export interface FieldSpec<T = unknown> {
  scope: FieldScope;
  /** One of FIELD_GROUPS. */
  group: string;
  default: T | (() => T);
  local: boolean;
  cloud: 'legacy' | 'document' | false;
  collab: boolean;
  undo: boolean;
  perUser: boolean;
  resetOnNew: boolean;
}

/**
 * The groups of the reload harness's fingerprint
 * (scripts/studio-perf/fixtures/fingerprint.mjs), so the harness can label
 * its fields from here. A fingerprint field is named after its group:
 * `transport.bpm`, `markers`, `tracks[2].volume`; 'meta' is its `project.*`.
 * The groups after 'context' hold session state the fingerprint leaves out.
 */
export const FIELD_GROUPS = [
  'meta',
  'transport',
  'tracks',
  'harmony',
  'prism',
  'notation',
  'markers',
  'mixer',
  'view',
  'context',
  'tutorial',
  'analysis',
  'unison',
  'suggest',
  'live',
  'devices',
  'ui',
  'collab',
] as const;

export type FieldGroup = (typeof FIELD_GROUPS)[number];

type DataKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: never[]) => unknown ? never : K;
}[keyof T];

/** Every store key that holds data rather than an action. */
export type StoreDataKey = DataKeys<AllSlices>;

// ── Builders ───────────────────────────────────────────────────────────────

type Default<T> = T | (() => T);
type ScopedSpec<T, S extends FieldScope> = Readonly<
  FieldSpec<T> & { scope: S }
>;
type CloudFlag = FieldSpec['cloud'];

/** The flags each scope settles; doc fields add their cloud and sync. */
const SCOPE_FLAGS = {
  doc: { scope: 'doc', local: true, perUser: false, resetOnNew: true },
  view: {
    scope: 'view',
    local: true,
    cloud: false,
    collab: false,
    undo: false,
    perUser: false,
    resetOnNew: true,
  },
  pref: {
    scope: 'pref',
    local: false,
    cloud: false,
    collab: false,
    undo: false,
    perUser: true,
    resetOnNew: false,
  },
  session: {
    scope: 'session',
    local: false,
    cloud: false,
    collab: false,
    undo: false,
    perUser: false,
  },
} as const;

/** Shared with collaborators, and undoable. */
const SHARED_UNDO = { collab: true, undo: true } as const;
/** Shared with collaborators, outside the project undo. */
const SHARED = { collab: true, undo: false } as const;
/**
 * Saved with the project, but in a room each collaborator sets their own;
 * outside the project undo.
 */
const UNSHARED = { collab: false, undo: false } as const;

type Sync = typeof SHARED_UNDO | typeof SHARED | typeof UNSHARED;

function doc<T>(
  group: FieldGroup,
  value: Default<T>,
  cloud: CloudFlag,
  sync: Sync,
): ScopedSpec<T, 'doc'> {
  return Object.freeze({
    ...SCOPE_FLAGS.doc,
    group,
    default: value,
    cloud,
    ...sync,
  });
}

function view<T>(group: FieldGroup, value: Default<T>): ScopedSpec<T, 'view'> {
  return Object.freeze({ ...SCOPE_FLAGS.view, group, default: value });
}

function pref<T>(group: FieldGroup, value: Default<T>): ScopedSpec<T, 'pref'> {
  return Object.freeze({ ...SCOPE_FLAGS.pref, group, default: value });
}

/**
 * When a session key starts over: with each project (resetOnNew), or never,
 * carrying on for as long as the page is open.
 */
type Lifetime = 'project' | 'page';

function session<T>(
  group: FieldGroup,
  value: Default<T>,
  lifetime: Lifetime,
): ScopedSpec<T, 'session'> {
  return Object.freeze({
    ...SCOPE_FLAGS.session,
    group,
    default: value,
    resetOnNew: lifetime === 'project',
  });
}

// ── Store keys ─────────────────────────────────────────────────────────────

const STORE_SPECS = {
  // ── meta ──
  projectId: doc('meta', null, false, UNSHARED),
  projectName: doc('meta', 'Untitled Project', 'legacy', SHARED),
  composerName: doc('meta', '', 'legacy', SHARED),

  // ── transport ──
  bpm: doc('transport', 120, 'legacy', SHARED_UNDO),
  timeSignatureNumerator: doc('transport', 4, 'document', SHARED_UNDO),
  timeSignatureDenominator: doc('transport', 4, 'document', SHARED_UNDO),
  loopStart: doc('transport', 0, 'document', UNSHARED),
  loopEnd: doc('transport', 7680, 'document', UNSHARED),
  position: view('transport', 0),
  loopEnabled: view('transport', false),
  metronomeEnabled: pref('transport', false),
  countInBars: pref('transport', 0),
  isPlaying: session('transport', false, 'project'),
  isRecording: session('transport', false, 'project'),
  isCountingIn: session('transport', false, 'project'),
  countInIsRecording: session('transport', false, 'project'),
  countInStartedAt: session('transport', null, 'project'),
  lastSeekPosition: session('transport', 0, 'project'),
  editorLoop: session('transport', null, 'project'),

  // ── live input and takes in progress ──
  liveRecordingNotes: session('live', () => [], 'project'),
  liveRecordingTrackId: session('live', null, 'project'),
  liveRecordingStartTick: session('live', 0, 'project'),
  liveAudioPeaks: session('live', () => [], 'project'),
  liveAudioTrackId: session('live', null, 'project'),
  liveAudioStartTick: session('live', 0, 'project'),
  hwActiveNotes: session('live', () => new Set<number>(), 'page'),
  audioActiveNotes: session('live', () => [], 'page'),

  // ── tracks ──
  tracks: doc('tracks', () => [], 'legacy', SHARED_UNDO),
  nextColorIndex: session('tracks', 0, 'project'),

  // ── harmony ──
  rootNote: doc('harmony', null, 'legacy', SHARED_UNDO),
  mode: doc('harmony', 'ionian', 'document', SHARED_UNDO),
  rhythmName: doc('harmony', 'Whole Notes', 'legacy', SHARED),
  genre: doc('harmony', 'Pop', 'legacy', SHARED),
  swing: doc('harmony', 0, 'legacy', SHARED),
  rootLocked: doc('harmony', false, 'document', UNSHARED),
  chordRegions: doc('harmony', () => [], 'document', SHARED_UNDO),
  rootTrackColor: session('harmony', null, 'project'),

  // ── prism ──
  chordSeq: doc('prism', () => [], 'document', SHARED),
  stringSeq: doc('prism', () => [], 'document', SHARED),
  strumMode: doc('prism', StrumMode.Synchronized, 'document', SHARED),
  strumAmount: doc('prism', 0, 'document', SHARED),
  tiltMode: doc('prism', VelocityTilt.Balanced, 'document', SHARED),
  tiltAmount: doc('prism', 0, 'document', SHARED),
  filterPercent: doc('prism', 1, 'document', SHARED),
  chordRecordMode: doc('prism', 'replace', 'document', SHARED),
  chordRulerShowNotes: pref('prism', false),
  availableFirstChords: session('prism', () => getFirstChords(), 'page'),
  availableNextChords: session('prism', () => [], 'project'),

  // ── notation ──
  measuresPerLine: doc('notation', 4, 'document', SHARED_UNDO),
  measureRowSizes: doc('notation', null, 'document', SHARED_UNDO),
  measureRestMap: doc('notation', null, 'document', SHARED_UNDO),
  measureFermatas: doc('notation', null, 'document', SHARED_UNDO),
  leadSheetChordFormat: doc('notation', 'hybrid', 'document', SHARED),
  leadSheetSections: doc('notation', () => [], 'document', SHARED_UNDO),
  leadSheetRepeats: doc('notation', () => [], 'document', SHARED_UNDO),
  leadSheetShowRepeats: doc('notation', false, 'document', SHARED),
  leadSheetShowMelody: doc('notation', false, 'document', SHARED),
  leadSheetMelodyTrackId: doc('notation', null, 'document', SHARED),
  scoreChordTracks: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreChordHidden: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreArticulations: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreSlurs: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreSpellings: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreSlashNotes: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreSystemBreaks: doc('notation', () => [], 'document', SHARED_UNDO),
  scorePageBreaks: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreSystemRuns: doc('notation', () => [], 'document', SHARED_UNDO),
  scoreTextMarks: doc('notation', () => [], 'document', SHARED_UNDO),

  // ── markers ──
  markers: doc('markers', () => [], 'document', SHARED_UNDO),

  // ── mixer ──
  masterVolume: doc('mixer', 0.8, 'document', SHARED_UNDO),
  masteringFxChain: doc('mixer', () => [], 'document', SHARED_UNDO),
  masteringEffects: doc(
    'mixer',
    () => structuredClone(DEFAULT_EFFECTS),
    'document',
    SHARED_UNDO,
  ),
  masterAutomation: doc('mixer', () => ({}), 'legacy', SHARED_UNDO),
  returns: doc('mixer', () => defaultReturns(), 'legacy', SHARED_UNDO),
  masteringBypass: view('mixer', false),

  // ── view ──
  clipColorMode: doc('view', 'track', 'document', SHARED_UNDO),
  currentView: view('view', 'arrange'),
  libraryOpen: view('view', true),
  channelStripTab: view('view', null),
  timelineZoom: view('view', 1),
  timelineScrollLeft: view('view', 0),
  selectedTrackId: view('view', null),
  automationOpenTrackId: view('view', null),
  automationParamId: view('view', 'volume'),
  timelineGridSize: pref('view', '1/4'),
  timelineSnapEnabled: pref('view', true),
  timelineTripletMode: pref('view', false),
  activeTool: session('view', 'cursor', 'project'),
  selectedClipId: session('view', null, 'project'),
  selectedClipTrackId: session('view', null, 'project'),
  parkedClipSelection: session('view', null, 'project'),

  // ── lesson and practice context ──
  practiceSession: session('context', null, 'project'),
  activeTutorialId: session('context', null, 'project'),
  tutorialStepIndex: session('context', 0, 'project'),
  tutorialStepStatus: session('tutorial', 'waiting', 'project'),
  tutorialStepCelebrate: session('tutorial', true, 'project'),

  // ── analysis (the music-intelligence bus) ──
  detectedKeyRootPc: session('analysis', null, 'project'),
  detectedMode: session('analysis', null, 'project'),
  keyConfidence: session('analysis', 0, 'project'),
  keySource: session('analysis', null, 'project'),
  activeNotesBitmask: session('analysis', 0xfff, 'project'),
  globalTuningCents: session('analysis', 0, 'page'),
  liveChordStream: session('analysis', () => [], 'project'),
  liveAnalysis: session('analysis', null, 'project'),

  // ── unison ──
  unisonDoc: session('unison', null, 'project'),
  unisonLoading: session('unison', false, 'project'),
  unisonError: session('unison', null, 'project'),
  selectionAnalysis: session('unison', null, 'project'),
  chordAnalysis: session('unison', null, 'project'),
  chordAnalysisPromptOpen: session('unison', false, 'project'),

  // ── suggest ──
  prismSuggestOpen: session('suggest', false, 'project'),
  prismSuggestInsertTick: session('suggest', 0, 'project'),
  prismSuggestTrackId: session('suggest', null, 'project'),
  prismSuggestMeasures: session('suggest', 4, 'project'),
  prismSuggestSets: session('suggest', () => [], 'project'),
  prismSuggestActiveIdx: session('suggest', 0, 'project'),
  prismSuggestPreviewPlaying: session('suggest', false, 'project'),
  prismSuggestStyle: session('suggest', null, 'project'),

  // ── devices ──
  inputs: session('devices', () => [], 'page'),
  outputs: session('devices', () => [], 'page'),
  midiStatus: session('devices', 'idle', 'page'),
  inputDeviceId: pref('devices', null),
  inputChannelCountOverride: pref('devices', null),
  outputDeviceId: session('devices', null, 'page'),
  inputDeviceChannelCount: session('devices', 0, 'page'),
  outputDeviceChannelCount: session('devices', 0, 'page'),
  inputDetectedChannelCount: session('devices', 0, 'page'),
  enabledMonoInputs: session('devices', () => [], 'page'),
  enabledStereoInputs: session('devices', () => [], 'page'),
  enabledMonoOutputs: session('devices', () => [], 'page'),
  enabledStereoOutputs: session('devices', () => [], 'page'),

  // ── ui ──
  editingClipId: session('ui', null, 'project'),
  editingClipTrackId: session('ui', null, 'project'),
  clipboardClips: session('ui', () => [], 'page'),
  clipboardAudioClip: session('ui', null, 'page'),
  userListOpen: session('ui', false, 'page'),
  chatPanelOpen: session('ui', false, 'page'),
  settingsOpen: session('ui', false, 'page'),
  recordingLimitModalOpen: session('ui', false, 'project'),
  lastAudioExportAt: session('ui', null, 'project'),
  leadSheetSelectedChordIdx: session('ui', null, 'project'),
  selectedChordIds: session('ui', () => [], 'project'),
  selectedNotes: session('ui', () => [], 'project'),

  // ── collab ──
  isCollabActive: session('collab', false, 'page'),
  roomId: session('collab', null, 'page'),
  roomCode: session('collab', null, 'page'),
  connectionStatus: session('collab', 'disconnected', 'page'),
  remoteUsers: session('collab', () => new Map(), 'page'),
  localRole: session('collab', 'editor', 'page'),
  collabRole: session('collab', 'editor', 'page'),
  leavePromptPending: session('collab', false, 'page'),
  roomError: session('collab', null, 'page'),
  kickedNotice: session('collab', false, 'page'),
  awaitingSessionCreation: session('collab', false, 'page'),
  sessionSaved: session('collab', false, 'page'),
  sessionStartedEmpty: session('collab', false, 'page'),
  sessionDraftProjectId: session('collab', null, 'page'),
  inviteRequested: session('collab', false, 'page'),
  chatMessages: session('collab', () => [], 'page'),
  unreadChatCount: session('collab', 0, 'page'),
} satisfies { [K in StoreDataKey]: FieldSpec<AllSlices[K]> };

/** Every store key that holds data, and only those. */
export const STORE_FIELDS = Object.freeze(STORE_SPECS) as {
  [K in StoreDataKey]: FieldSpec<AllSlices[K]>;
};

type StoreSpecs = typeof STORE_SPECS;
type KeysOfScope<S extends FieldScope> = {
  [K in keyof StoreSpecs]: StoreSpecs[K]['scope'] extends S ? K : never;
}[keyof StoreSpecs];

/** The store keys of each scope, as types. */
export type DocKey = KeysOfScope<'doc'>;
export type ViewKey = KeysOfScope<'view'>;
export type PrefKey = KeysOfScope<'pref'>;

// ── Tracks ─────────────────────────────────────────────────────────────────

/** What a new track's defaults depend on. */
export interface TrackDefaultContext {
  instrument: InstrumentType;
  name: string;
}

type TrackDefault<T> = T | ((ctx?: TrackDefaultContext) => T);

/**
 * A track field's spec. A default that depends on the instrument or the name
 * is a function of the new track's context (trackFieldDefault); called
 * without one, it gives what a track of no particular instrument starts with.
 *
 * The context is for a new track only (addTrack, initialTrackDefaults). A
 * decoder that fills in a field an older save lacks passes none, as today's
 * decode does: no input channel, the 'auto' role, plain effects with none
 * active. With the context, an old drum machine would come back with its
 * compressor switched on, and a guessed role would replace 'auto', which
 * follows the track's name.
 */
type TrackFieldSpec<T> = Omit<FieldSpec<T>, 'default'> & {
  default: TrackDefault<T>;
};

/** Live guitar, bass and vocal tracks: audio tracks fed by an input. */
const LIVE_INPUT_INSTRUMENTS: ReadonlySet<InstrumentType> = new Set([
  'guitar-fx',
  'bass-fx',
  'vocal-fx',
]);

const isLiveInput = (ctx?: TrackDefaultContext) =>
  ctx !== undefined && LIVE_INPUT_INSTRUMENTS.has(ctx.instrument);

const isDrumMachine = (ctx?: TrackDefaultContext) =>
  ctx?.instrument === 'drum-machine';

function trackDoc<T>(
  value: TrackDefault<T>,
  cloud: CloudFlag,
  sync: Sync,
): Readonly<TrackFieldSpec<T>> {
  return Object.freeze({
    ...SCOPE_FLAGS.doc,
    group: 'tracks',
    default: value,
    cloud,
    ...sync,
  });
}

/**
 * A track field each person keeps for themself: kept in the draft on this
 * device, never in the cloud, never shared, never undone, and never making
 * the project unsaved.
 */
function trackPerUser<T>(value: TrackDefault<T>): Readonly<TrackFieldSpec<T>> {
  return Object.freeze({
    ...SCOPE_FLAGS.view,
    perUser: true,
    group: 'tracks',
    default: value,
  });
}

/**
 * A track field no save keeps: not the draft, the cloud copy or a room, and
 * never undone. It lasts as long as its track does in this tab, so a new
 * project, which starts with no tracks, has none of it (resetOnNew).
 */
function trackSession<T>(value: TrackDefault<T>): Readonly<TrackFieldSpec<T>> {
  return Object.freeze({
    ...SCOPE_FLAGS.session,
    resetOnNew: true,
    group: 'tracks',
    default: value,
  });
}

type TrackFields = { [K in keyof Track]-?: TrackFieldSpec<Track[K]> };

/**
 * Every Track field. An optional field defaults to undefined: a new track
 * has none, and a save without it loads without it.
 */
export const TRACK_FIELDS: TrackFields = Object.freeze({
  id: trackDoc(() => crypto.randomUUID(), 'legacy', SHARED_UNDO),
  name: trackDoc((ctx) => ctx?.name ?? '', 'legacy', SHARED_UNDO),
  type: trackDoc<TrackType>(
    (ctx) => (isLiveInput(ctx) ? 'audio' : 'midi'),
    'legacy',
    SHARED_UNDO,
  ),
  instrument: trackDoc<InstrumentType>(
    (ctx) => ctx?.instrument ?? 'none',
    'legacy',
    SHARED_UNDO,
  ),
  gmProgram: trackDoc(undefined, 'legacy', SHARED_UNDO),
  color: trackDoc(TRACK_PALETTES[0], 'legacy', SHARED_UNDO),
  mute: trackDoc(false, 'legacy', UNSHARED),
  solo: trackDoc(false, 'legacy', UNSHARED),
  volume: trackDoc(0.8, 'legacy', SHARED_UNDO),
  pan: trackDoc(0, 'legacy', SHARED_UNDO),
  recordArmed: trackPerUser(false),
  monitoring: trackPerUser(false),
  midiInputId: trackPerUser(null),
  audioInputId: trackPerUser(null),
  audioInputChannel: trackPerUser<AudioInputChannel | null>((ctx) =>
    isLiveInput(ctx) ? { mode: 'mono', channel: 0 } : null,
  ),
  audioMidiSource: trackSession(undefined),
  effects: trackDoc(
    (ctx) => {
      const effects = structuredClone(DEFAULT_EFFECTS);
      if (isDrumMachine(ctx)) {
        effects.compressor = { ...effects.compressor, enabled: true };
      }
      return effects;
    },
    'legacy',
    SHARED_UNDO,
  ),
  activeEffects: trackDoc<EffectSlotType[]>(
    (ctx) => (isDrumMachine(ctx) ? ['compressor'] : []),
    'legacy',
    SHARED_UNDO,
  ),
  midiClips: trackDoc<MidiClip[]>(() => [], 'legacy', SHARED_UNDO),
  audioClips: trackDoc<AudioClip[]>(() => [], 'legacy', SHARED_UNDO),
  vocalChain: trackDoc(undefined, 'legacy', SHARED_UNDO),
  guitarChain: trackDoc(undefined, 'legacy', SHARED_UNDO),
  drumPads: trackDoc(undefined, 'legacy', SHARED_UNDO),
  drumKit: trackDoc(undefined, 'legacy', SHARED_UNDO),
  bassVoice: trackDoc(undefined, 'legacy', SHARED_UNDO),
  samplerSample: trackDoc(undefined, 'legacy', SHARED_UNDO),
  organState: trackDoc(undefined, 'legacy', SHARED_UNDO),
  presetName: trackDoc(undefined, 'legacy', SHARED_UNDO),
  sends: trackDoc(undefined, 'legacy', SHARED_UNDO),
  automation: trackDoc(undefined, 'legacy', SHARED_UNDO),
  trackRole: trackDoc(
    (ctx) => (ctx ? guessTrackRole(ctx.name, ctx.instrument) : 'auto'),
    'legacy',
    SHARED_UNDO,
  ),
} satisfies TrackFields);

/**
 * The Oracle synth patch of each oracle-synth track. It lives in the synth
 * store and its per-track cache (synthTrackState), not on the Track, so the
 * Track spec can't see it: this entry covers it, with the one list of patch
 * keys (SYNTH_STATE_KEYS). The draft and the cloud payload carry it as
 * settings.oracleSynth; collab and undo come with milestone 1.13b. Every
 * other synth store key is in ORACLE_NON_PATCH_FIELDS.
 */
export const ORACLE_PATCH_FIELD: {
  readonly scope: 'doc';
  readonly group: FieldGroup;
  readonly keys: readonly string[];
  readonly local: true;
  readonly cloud: 'legacy';
  readonly collab: false;
  readonly undo: false;
  readonly perUser: false;
  readonly resetOnNew: true;
} = Object.freeze({
  scope: 'doc',
  group: 'tracks',
  keys: SYNTH_STATE_KEYS,
  local: true,
  cloud: 'legacy',
  collab: false,
  undo: false,
  perUser: false,
  resetOnNew: true,
});

/** A synth store key outside the patch, which no project saves. */
interface SynthStoreFieldSpec {
  scope: Extract<FieldScope, 'pref' | 'session'>;
}

type SynthNonPatchKey = Exclude<
  DataKeys<SynthStore>,
  (typeof SYNTH_STATE_KEYS)[number]
>;
type SynthNonPatchFields = {
  readonly [K in SynthNonPatchKey]: Readonly<SynthStoreFieldSpec>;
};

const outsidePatch = (
  scope: SynthStoreFieldSpec['scope'],
): Readonly<SynthStoreFieldSpec> => Object.freeze({ scope });

/**
 * Every other data key of the synth store, kept out of the patch (why, for
 * each: ORACLE_NON_PATCH_REASONS in fieldReasons.ts). With
 * ORACLE_PATCH_FIELD.keys this covers the whole store, and the type checks
 * it: a new synth key goes in one list or the other, or nothing compiles, so
 * a new sound parameter can't silently miss the saved patch.
 */
export const ORACLE_NON_PATCH_FIELDS: SynthNonPatchFields = Object.freeze({
  userPresets: outsidePatch('pref'),
  isDirty: outsidePatch('session'),
  packPresets: outsidePatch('session'),
  packDisplayName: outsidePatch('session'),
  pitchBend: outsidePatch('session'),
  modWheel: outsidePatch('session'),
  activeNotes: outsidePatch('session'),
  activeLFOBar: outsidePatch('session'),
  activeLFOIndex: outsidePatch('session'),
  selectedSection: outsidePatch('session'),
} satisfies SynthNonPatchFields);

// ── Nested fields ──────────────────────────────────────────────────────────
//
// Defaults here are what an entry without the field holds: what an older
// save without it decodes to. Each nested field shares and undoes with the
// entry that holds it.

const nestedIn =
  (group: FieldGroup) =>
  <T>(value: Default<T>, cloud: CloudFlag) =>
    doc<T>(group, value, cloud, SHARED_UNDO);

const trackPart = nestedIn('tracks');
const regionPart = nestedIn('harmony');
const markerPart = nestedIn('markers');
const busPart = nestedIn('mixer');

type MidiClipFields = { [K in keyof MidiClip]-?: FieldSpec<MidiClip[K]> };

export const MIDI_CLIP_FIELDS: MidiClipFields = Object.freeze({
  id: trackPart(() => `clip-${crypto.randomUUID().slice(0, 8)}`, 'legacy'),
  name: trackPart(undefined, 'legacy'),
  startTick: trackPart(0, 'legacy'),
  durationTicks: trackPart(undefined, 'document'),
  events: trackPart(() => [], 'legacy'),
  ccEvents: trackPart(undefined, 'document'),
} satisfies MidiClipFields);

type NoteEventFields = {
  [K in keyof MidiNoteEvent]-?: FieldSpec<MidiNoteEvent[K]>;
};

export const NOTE_EVENT_FIELDS: NoteEventFields = Object.freeze({
  id: trackPart(undefined, 'document'),
  note: trackPart(60, 'legacy'),
  velocity: trackPart(100, 'legacy'),
  startTick: trackPart(0, 'legacy'),
  durationTicks: trackPart(480, 'legacy'),
  channel: trackPart(0, 'legacy'),
} satisfies NoteEventFields);

type CcEventFields = { [K in keyof MidiCCEvent]-?: FieldSpec<MidiCCEvent[K]> };

export const CC_EVENT_FIELDS: CcEventFields = Object.freeze({
  tick: trackPart(0, 'document'),
  controller: trackPart(64, 'document'),
  value: trackPart(0, 'document'),
  channel: trackPart(0, 'document'),
} satisfies CcEventFields);

type AudioClipFields = { [K in keyof AudioClip]-?: FieldSpec<AudioClip[K]> };

export const AUDIO_CLIP_FIELDS: AudioClipFields = Object.freeze({
  id: trackPart(() => crypto.randomUUID(), false),
  startTick: trackPart(0, 'legacy'),
  duration: trackPart(0, 'legacy'),
  fadeInTicks: trackPart(0, 'legacy'),
  fadeOutTicks: trackPart(0, 'legacy'),
  assetId: trackPart<string | null | undefined>(null, 'legacy'),
  offsetSeconds: trackPart(0, 'legacy'),
  gain: trackPart(1, 'legacy'),
} satisfies AudioClipFields);

type ChordRegionSpecs = {
  [K in keyof ChordRegion]-?: FieldSpec<ChordRegion[K]>;
};

export const CHORD_REGION_FIELDS: ChordRegionSpecs = Object.freeze({
  id: regionPart(() => crypto.randomUUID(), 'document'),
  startTick: regionPart(0, 'document'),
  endTick: regionPart(0, 'document'),
  rawStartTick: regionPart(undefined, 'document'),
  name: regionPart('', 'document'),
  noteName: regionPart('', 'document'),
  color: regionPart<[number, number, number]>(
    () => [128, 128, 128],
    'document',
  ),
  degreeKey: regionPart(undefined, 'document'),
  midis: regionPart(undefined, 'document'),
  confidence: regionPart(undefined, 'document'),
  identity: regionPart(undefined, 'document'),
} satisfies ChordRegionSpecs);

type MarkerSpecs = { [K in keyof Marker]-?: FieldSpec<Marker[K]> };

export const MARKER_FIELDS: MarkerSpecs = Object.freeze({
  id: markerPart(() => `marker-${crypto.randomUUID().slice(0, 8)}`, 'document'),
  tick: markerPart(0, 'document'),
  name: markerPart('', 'document'),
  color: markerPart('#e8e8f0', 'document'),
} satisfies MarkerSpecs);

type ReturnBusSpecs = { [K in keyof ReturnBus]-?: FieldSpec<ReturnBus[K]> };

export const RETURN_BUS_FIELDS: ReturnBusSpecs = Object.freeze({
  id: busPart('A', 'legacy'),
  label: busPart('', 'legacy'),
  volume: busPart(0.8, 'legacy'),
  fxChain: busPart<EffectSlotType[]>(() => [], 'legacy'),
  effects: busPart(() => structuredClone(DEFAULT_EFFECTS), 'legacy'),
} satisfies ReturnBusSpecs);

// ── Key lists ──────────────────────────────────────────────────────────────

const storeKeysWhere = (test: (spec: FieldSpec) => boolean) =>
  Object.freeze(
    (Object.keys(STORE_FIELDS) as StoreDataKey[]).filter((key) =>
      test(STORE_FIELDS[key]),
    ),
  );

/**
 * The project document's keys, projectId included. A change to any of them
 * starts an autosave (decision D8): a new cloud link has to reach the draft
 * too, or a restored session would save as a second project.
 */
export const DOC_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.scope === 'doc',
);
/**
 * The project's content: every doc key but projectId, the link to its cloud
 * copy, which a save, a Save As or an upload's first take sets without
 * changing the project. The save status reads this list for its trigger, its
 * fingerprint and whether a session holds work. Named outright rather than
 * read off a flag: a later doc field kept only on this device is content all
 * the same.
 */
export const DOC_CONTENT_KEYS: readonly StoreDataKey[] = Object.freeze(
  DOC_KEYS.filter((key) => key !== 'projectId'),
);
/**
 * How the project was last seen on this device. The draft holds them, but a
 * change to one never starts a write: it goes with the next write or the
 * page-hide flush (decision D8), since the playhead and the scroll move many
 * times a second.
 */
export const VIEW_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.scope === 'view',
);
export const PREF_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.scope === 'pref',
);
/**
 * The prefs the per-user prefs entry holds: all but the two device-level
 * ones (group 'devices'), which keep their own storage keys.
 */
export const USER_PREF_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.scope === 'pref' && s.group !== 'devices',
);
export const SESSION_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.scope === 'session',
);
/** Keys on their way out of the store: none since milestone 1.3. */
export const DROP_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.scope === 'drop',
);
/** What initialProjectState() resets: doc, view and per-project session keys. */
export const RESET_ON_NEW_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.resetOnNew,
);
/**
 * What the draft holds: the doc and view keys. Not a list to start writes on:
 * see DOC_KEYS and VIEW_KEYS.
 */
export const LOCAL_KEYS: readonly StoreDataKey[] = storeKeysWhere(
  (s) => s.local,
);

const trackFieldsWhere = (test: (spec: TrackFieldSpec<unknown>) => boolean) =>
  Object.freeze(
    (Object.keys(TRACK_FIELDS) as (keyof Track)[]).filter((key) =>
      test(TRACK_FIELDS[key]),
    ),
  );

/** The track fields that are document content. */
export const TRACK_DOC_FIELDS: readonly (keyof Track)[] = trackFieldsWhere(
  (s) => s.scope === 'doc',
);
/**
 * The track fields each person keeps for themself, in the draft on this
 * device (arm, monitor, inputs). The one session field on a track, the
 * Guitar/Bass-to-MIDI binding, is in neither list: no save keeps it.
 */
export const TRACK_PER_USER_FIELDS: readonly (keyof Track)[] = trackFieldsWhere(
  (s) => s.perUser,
);

// ── Defaults ───────────────────────────────────────────────────────────────

function resolveDefault<T>(value: Default<T>): T {
  if (typeof value === 'function') return (value as () => T)();
  // Object defaults are factories, but a plain one is still never handed out
  // twice.
  return value !== null && typeof value === 'object'
    ? structuredClone(value)
    : value;
}

/** A store key's default: a fresh copy on every call. */
export function fieldDefault<K extends StoreDataKey>(key: K): AllSlices[K] {
  return resolveDefault(STORE_FIELDS[key].default);
}

/**
 * A track field's default for a new track of this instrument and name, as a
 * fresh copy on every call. Without a context: what a track of no particular
 * instrument starts with, which is also what a decoder fills in for a field
 * an older save lacks (see TrackFieldSpec).
 */
export function trackFieldDefault<K extends keyof Track>(
  key: K,
  ctx?: TrackDefaultContext,
): Track[K] {
  // The cast: TypeScript widens an indexed `-?` mapped type to the union of
  // every field's spec.
  const value = TRACK_FIELDS[key].default as TrackDefault<Track[K]>;
  if (typeof value === 'function') {
    return (value as (ctx?: TrackDefaultContext) => Track[K])(ctx);
  }
  return resolveDefault(value as Track[K]);
}
