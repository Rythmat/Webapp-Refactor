import type { MidiCCEvent, MidiNoteEvent } from '@/daw/prism-engine/types';
import type { Marker } from '@/daw/store/markersSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import type { ORACLE_NON_PATCH_FIELDS, StoreDataKey } from './fields';

// ── Why the registry classifies a field as it does ─────────────────────────
//
// The registry's prose, kept apart from it (./fields.ts). The registry loads
// with the store on every page of the app, and nothing at runtime reads why
// a key is classified as it is, so the explanations live here, where only
// the tests and the reload harness load them. Every session key has one
// (why it is never saved), every track field this person keeps for
// themself or no save keeps, and every synth store key outside the patch;
// so does any other choice a reader might not expect. The coverage test
// (persistence/__tests__/fieldCoverage.test.ts) holds the lists to that, and
// the types keep every entry to a field the registry classifies.

type Reasons<T> = { readonly [K in keyof T]?: string };
type StoreReasons = { readonly [K in StoreDataKey]?: string };
type NestedReasons = {
  readonly MidiClip: Reasons<MidiClip>;
  readonly MidiNoteEvent: Reasons<MidiNoteEvent>;
  readonly MidiCCEvent: Reasons<MidiCCEvent>;
  readonly AudioClip: Reasons<AudioClip>;
  readonly ChordRegion: Reasons<ChordRegion>;
  readonly Marker: Reasons<Marker>;
  readonly ReturnBus: Reasons<ReturnBus>;
};
type OracleNonPatchReasons = {
  readonly [K in keyof typeof ORACLE_NON_PATCH_FIELDS]: string;
};

const PLAYBACK = 'Playback state.';
const MIDI_TAKE = 'The MIDI take being recorded.';
const AUDIO_TAKE = 'The audio take being recorded.';
const SELECTION =
  'A selection made in the previous project means nothing here.';
const ANALYSIS =
  'Analysis of the open project; the next one is analysed afresh.';
const SUGGESTION =
  'The Prism suggestion dialog, opened on the previous project.';
const LESSON =
  'The lesson running on this project. Milestone 1.15 saves it with the draft.';
const STEP = 'Whether the running lesson has seen its current step done.';
const DEVICES = 'What this computer has connected: no part of a project.';
const PANELS =
  'Panel layout, which the Stage B shell keeps per user (milestones 2.4, 2.8).';
const COLLAB =
  'The collaboration session belongs to the room, not the project: a load leaves it alone, and leaving the room is a separate step.';
const NOTE_KEYED =
  'Keyed by note: composite note keys in memory and in collab, note ids in the draft (notationCodec).';
const BUILDER =
  'The Prism builder’s progression in progress: saved and shared, with its own Undo chord.';
const COMPUTER_SETTING =
  'A setting of this computer rather than of a student, so it keeps its own storage key';
const PIANO_ROLL_CLIP = 'The clip open in the piano roll editor.';

/** Why each store key is classified as it is (STORE_FIELDS). */
export const STORE_FIELD_REASONS: StoreReasons = Object.freeze({
  // ── meta ──
  projectId:
    'The cloud project this one saves to: a link, not content. The draft keeps it so a restored session saves back to the same project, and it never makes the project unsaved.',

  // ── transport ──
  loopStart:
    'The loop region belongs to the project; each collaborator loops on their own.',
  loopEnd:
    'Four bars of 4/4. The loop region belongs to the project; each collaborator loops on their own.',
  loopEnabled:
    'Whether the loop is on, for this project on this device; the region itself is doc.',
  isPlaying: PLAYBACK,
  isRecording: PLAYBACK,
  isCountingIn: PLAYBACK,
  countInIsRecording: PLAYBACK,
  countInStartedAt: PLAYBACK,
  lastSeekPosition:
    'Where Stop returns the playhead: the previous project’s spot means nothing in the next one. A restored draft starts it at its own playhead (SessionSerializer).',
  editorLoop:
    'The piano roll editor’s own loop, set only while that editor is open.',

  // ── live input and takes in progress ──
  liveRecordingNotes: MIDI_TAKE,
  liveRecordingTrackId: MIDI_TAKE,
  liveRecordingStartTick: MIDI_TAKE,
  liveAudioPeaks: AUDIO_TAKE,
  liveAudioTrackId: AUDIO_TAKE,
  liveAudioStartTick: AUDIO_TAKE,
  hwActiveNotes: 'Keys held down on a MIDI controller right now.',
  audioActiveNotes: 'Notes the live audio input hears right now.',

  // ── tracks ──
  nextColorIndex:
    'The palette colour the next new track takes; a load derives it from the track count.',

  // ── harmony ──
  rootLocked:
    'The key lock guards this student’s own key changes: saved with the project, never shared.',
  rootTrackColor:
    'The key colour: derived from rootNote and mode, and recomputed on load.',

  // ── prism ──
  chordSeq: BUILDER,
  stringSeq: BUILDER,
  chordRecordMode:
    'Whether new chords overwrite the chord lane, merge into it, or leave it locked. It guards the lane everyone in a room shares, so it is shared too, and like the other Prism settings it is outside undo.',
  availableFirstChords: 'The chords a progression can open with: a constant.',
  availableNextChords: 'Derived from the builder’s progression and filter.',

  // ── notation ──
  scoreArticulations: NOTE_KEYED,
  scoreSlurs: NOTE_KEYED,
  scoreSpellings: NOTE_KEYED,
  scoreSlashNotes: NOTE_KEYED,

  // ── mixer ──
  masterAutomation:
    'The legacy cloud payload carries it on the first track’s settings.',
  returns:
    'The two return buses. Today’s cloud payload sends them at its top level, but nobody has confirmed that music-atlas-api stores that field (its StudioProjectInput type has no `returns`). The 1.5 document carries them either way.',
  masteringBypass:
    'A/B listening on this device; an export always runs the stored chain.',

  // ── view ──
  clipColorMode:
    'A project field. A draft from before 1.3 opens as prism when it has chord regions, as the editor showed it.',
  currentView:
    'Restored for every view but practice, which needs the lesson context milestone 1.15 saves.',
  activeTool: 'The editing tool: every project opens with the cursor.',
  selectedClipId: SELECTION,
  selectedClipTrackId: SELECTION,
  parkedClipSelection:
    'The Create selection, put away while another view shows.',

  // ── lesson and practice context ──
  practiceSession:
    'The practice screen this project was opened for. Milestone 1.15 saves it with the draft.',
  activeTutorialId: LESSON,
  tutorialStepIndex: LESSON,
  tutorialStepStatus: STEP,
  tutorialStepCelebrate: STEP,

  // ── analysis (the music-intelligence bus) ──
  detectedKeyRootPc: ANALYSIS,
  detectedMode: ANALYSIS,
  keyConfidence: ANALYSIS,
  keySource: ANALYSIS,
  activeNotesBitmask: ANALYSIS,
  globalTuningCents:
    'How the live instrument is tuned against A440: the instrument’s, not the project’s.',
  liveChordStream:
    'Chords heard on the live input; the next project starts listening afresh.',
  liveAnalysis: ANALYSIS,

  // ── unison ──
  unisonDoc: ANALYSIS,
  unisonLoading: ANALYSIS,
  unisonError: ANALYSIS,
  selectionAnalysis: ANALYSIS,
  chordAnalysis: ANALYSIS,
  chordAnalysisPromptOpen:
    'Offered when a project opens with notes but no chord symbols.',

  // ── suggest ──
  prismSuggestOpen: SUGGESTION,
  prismSuggestInsertTick: SUGGESTION,
  prismSuggestTrackId: SUGGESTION,
  prismSuggestMeasures: SUGGESTION,
  prismSuggestSets: SUGGESTION,
  prismSuggestActiveIdx: SUGGESTION,
  prismSuggestPreviewPlaying: SUGGESTION,
  prismSuggestStyle: SUGGESTION,

  // ── devices ──
  inputs: DEVICES,
  outputs: DEVICES,
  midiStatus: DEVICES,
  inputDeviceId: `${COMPUTER_SETTING} (prism-daw-input-device) instead of the per-user prefs.`,
  inputChannelCountOverride: `${COMPUTER_SETTING} (prism-daw-input-ch-override) instead of the per-user prefs.`,
  outputDeviceId: DEVICES,
  inputDeviceChannelCount: DEVICES,
  outputDeviceChannelCount: DEVICES,
  inputDetectedChannelCount: DEVICES,
  enabledMonoInputs: DEVICES,
  enabledStereoInputs: DEVICES,
  enabledMonoOutputs: DEVICES,
  enabledStereoOutputs: DEVICES,

  // ── ui ──
  editingClipId: PIANO_ROLL_CLIP,
  editingClipTrackId: PIANO_ROLL_CLIP,
  clipboardClips: 'Copied clips: they paste into the next project too.',
  clipboardAudioClip:
    'A copied audio clip: it pastes into the next project too.',
  userListOpen: PANELS,
  chatPanelOpen: PANELS,
  settingsOpen:
    'Whether the Settings dialog is open. It sets up this computer’s audio inputs and outputs, not a project, so a load leaves it as it is.',
  recordingLimitModalOpen: 'A notice about a take in the previous project.',
  lastAudioExportAt:
    'When this project was last exported. A lesson detects an export by it, so a new project starts without one.',
  leadSheetSelectedChordIdx: SELECTION,
  selectedChordIds: SELECTION,
  selectedNotes: SELECTION,

  // ── collab ──
  isCollabActive: COLLAB,
  roomId: COLLAB,
  roomCode: COLLAB,
  connectionStatus: COLLAB,
  remoteUsers: COLLAB,
  localRole: COLLAB,
  collabRole: COLLAB,
  leavePromptPending: COLLAB,
  roomError: COLLAB,
  kickedNotice: COLLAB,
  awaitingSessionCreation: COLLAB,
  sessionSaved: COLLAB,
  sessionStartedEmpty: COLLAB,
  sessionDraftProjectId: COLLAB,
  inviteRequested: COLLAB,
  chatMessages: COLLAB,
  unreadChatCount: COLLAB,
} satisfies StoreReasons);

const OWN_INPUT =
  'This person’s input on this device: each collaborator arms, monitors and routes their own.';

/** Why each Track field is classified as it is (TRACK_FIELDS). */
export const TRACK_FIELD_REASONS: Reasons<Track> = Object.freeze({
  id: 'Stable across cloud loads: the cloud payload carries it as settings.sourceTrackId (decision D4).',
  type: 'A live input instrument makes an audio track. An imported audio file has no instrument, so its caller passes the type.',
  color:
    'A new track takes the next palette colour, or the key colour while a key is set.',
  mute: 'Saved with the project and to the cloud; each collaborator mutes on their own.',
  solo: 'Saved with the project and to the cloud; each collaborator solos on their own.',
  recordArmed: OWN_INPUT,
  monitoring: OWN_INPUT,
  midiInputId: OWN_INPUT,
  audioInputId: OWN_INPUT,
  audioInputChannel:
    'A channel of this person’s audio interface; a live track starts on the first one.',
  audioMidiSource:
    'The Guitar/Bass-to-MIDI binding is session-only, as decided when it was built: this person’s live input playing the track, which no save keeps. In a room each collaborator keeps their own across remote edits (yjsToZustand).',
  effects: 'A drum machine starts with its compressor on.',
  trackRole:
    'Guessed from the name and instrument; the student can pick another.',
} satisfies Reasons<Track>);

const FROM_CLIP_START = 'From the start of the clip.';

/** Why nested fields are classified as they are, by the type holding them. */
export const NESTED_FIELD_REASONS: NestedReasons = Object.freeze({
  MidiClip: {
    durationTicks:
      'Set when a clip is trimmed or drawn past its notes; without it a clip ends with its last note.',
  },
  MidiNoteEvent: {
    id: 'Minted when a note is made. An older note without one gets a derived id (noteIds.ts) when it loads, or when a save settles the ids (ensureProjectNoteIds, deterministic); never minted on save. Collab carries it in the Y key _cid.',
    startTick: FROM_CLIP_START,
  },
  MidiCCEvent: {
    tick: FROM_CLIP_START,
  },
  AudioClip: {
    id: 'It keys the clip’s decoded audio, so a cloud open mints new ones until milestone 1.10 keys audio by asset; the cloud carries it from then. A new id loses nothing but a second download. Within a session it is the clip’s link to its audio, so it counts as content like any other id (the save status fingerprints it): only a load changes it, and the load marks its baseline after that.',
    duration: 'In ticks.',
    assetId:
      'Null until the audio is uploaded; a cloud save leaves such clips out.',
  },
  ChordRegion: {
    degreeKey:
      'A label relative to the key, rewritten on a key change: never the chord’s identity.',
    identity:
      'Root, quality and bass (decision D3): filled from milestone 1.16a, kept verbatim, dropped by any write that changes the name, and trusted only while its label equals the name (identityIsCurrent).',
  },
  Marker: {},
  ReturnBus: {
    id: 'Two fixed buses: A (Reverb) and B (Delay).',
  },
} satisfies NestedReasons);

const PERFORMANCE =
  'What is being played this moment: the pitch and mod wheels and the held notes.';
const PACK = 'The preset pack the browser lists: a catalogue, not a patch.';
const SYNTH_PANEL = 'Which section and LFO the synth panel shows.';

/**
 * Why each synth store key outside the Oracle patch stays out of it
 * (ORACLE_NON_PATCH_FIELDS): every one has a reason.
 */
export const ORACLE_NON_PATCH_REASONS: OracleNonPatchReasons = Object.freeze({
  userPresets:
    'The presets this student saved, under their own storage key (oracle-synth-presets; milestone 1.4 namespaces it by user). They follow the student, not a project.',
  isDirty:
    'Whether the patch changed since its preset was loaded or saved (the * after the preset’s name): the preset browser’s marker, not the project’s.',
  packPresets: PACK,
  packDisplayName: PACK,
  pitchBend: PERFORMANCE,
  modWheel: PERFORMANCE,
  activeNotes: PERFORMANCE,
  activeLFOBar: SYNTH_PANEL,
  activeLFOIndex: SYNTH_PANEL,
  selectedSection: SYNTH_PANEL,
} satisfies OracleNonPatchReasons);
