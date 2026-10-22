import type { MidiCCEvent, MidiNoteEvent } from '@/daw/prism-engine/types';
import type { SongSection } from '@/daw/model/sections';
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
  readonly Section: Reasons<SongSection>;
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
  'The lesson running on this project: never in the body, but its draft’s meta keeps it (DraftContext, milestone 1.15), and reopening that draft resumes it.';
const STEP = 'Whether the running lesson has seen its current step done.';
const DEVICES = 'What this computer has connected: no part of a project.';
const LAYOUT =
  'The editor’s layout, the student’s own on every project (milestone 2.4): kept per user by prefsStore, never in a project, so a new project or a restored draft leaves it as it is.';
const COLLAB =
  'The collaboration session belongs to the room, not the project: a load leaves it alone, and leaving the room is a separate step.';
const NOTE_KEYED =
  'Keyed by note: composite note keys in memory and in collab, note ids in the draft (notationCodec).';
const BUILDER =
  'The Prism builder’s progression in progress: saved and shared, with its own Undo chord.';
const COMPUTER_SETTING =
  'A setting of this computer rather than of a student, so it keeps its own storage key';

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
  leadSheetMelodyTrackIds:
    'The tracks the Lead Sheet writes as its melody, a staff each; empty is Auto. Shared and outside undo like its other display settings, as the single id it replaces was. Drafts and cloud documents before schema 8 held that one id (leadSheetMelodyTrackId), which loads as a list of it.',
  scoreArticulations: NOTE_KEYED,
  scoreSlurs: NOTE_KEYED,
  scoreSpellings: NOTE_KEYED,
  scoreSlashNotes: NOTE_KEYED,

  // ── song sections ──
  sections:
    'The song’s form (milestone 2.13): the sections lane and the Lead Sheet read this one list, which replaces the Lead Sheet’s own bar marks (leadSheetSections). Shared and undone as the arrangement is. A draft also writes the marks it implies in their old place (notation.leadSheetSections), so a build from before 2.13 still shows them after a rollback; one without sections reads them back from there.',

  // ── mixer ──
  masterAutomation:
    'The legacy cloud payload carries it on the first track’s settings.',
  returns:
    'The two return buses. Today’s cloud payload sends them at its top level, but nobody has confirmed that music-atlas-api stores that field (its StudioProjectInput type has no `returns`). The 1.5 document carries them either way.',
  masteringBypass:
    'A/B listening on this device; an export always runs the stored chain.',
  masterMuted:
    'The Master strip’s mute (2026-10-22): listening on this device for now, as a track’s mute is this student’s own; a project opens heard, and an export is never silent.',

  // ── view ──
  clipColorMode:
    'A project field. A draft from before 1.3 opens as prism when it has chord regions, as the editor showed it.',
  currentView:
    'Restored for every view but practice, which the body alone can’t rebuild: the draft’s context brings the practice screen back with its session (milestone 1.15).',
  libraryOpen:
    'The Inspector as it is now, in the view showing. The draft keeps it, but the shell sets it from the student’s choice for that view (inspectorOpenByView) when a project opens or the view changes (milestone 2.4); a lesson step sets it for the moment only.',
  inspectorOpenByView: LAYOUT,
  inspectorWidth: LAYOUT,
  inspectorPanel: LAYOUT,
  libraryFavourites:
    'The items the student marked ♡ in the Library: their own on every project, kept per user by prefsStore (milestone 2.14).',
  dockHeights: LAYOUT,
  readoutMode: LAYOUT,
  hoverHints:
    'Whether the bottom rail says what the control under the pointer does: the student’s own choice on every project, kept per user by prefsStore (milestone 2.11).',
  activeTool: 'The editing tool: every project opens with the cursor.',
  scoreNoteInput:
    'The Score’s note input mode, like the editing tool: every project opens selecting, not writing.',
  scoreHiddenTrackIds:
    'Which tracks the Score leaves off its staves: a way of looking at the song, so every project opens with every staff.',
  selectedClipId: SELECTION,
  selectedClipTrackId: SELECTION,
  parkedClipSelection:
    'The Create selection, put away while another view shows.',

  // ── lesson and practice context ──
  practiceSession:
    'The practice screen this project was opened for: never in the body or the cloud copy (another person opening the project would land on it), but its draft’s meta keeps it (DraftContext, milestone 1.15).',
  practiceKeyboard:
    'What the practice keyboard shows, kept beside its practice session in the draft’s meta (milestone 1.15).',
  activeTutorialId: LESSON,
  tutorialStepIndex: LESSON,
  tutorialStepStatus: STEP,
  tutorialStepCelebrate: STEP,
  tutorialStepPrepared:
    'Whether the running step’s preconditions are in place; a resumed lesson finds them in its draft’s view.',

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
  chordAnalysisOffered:
    'Offered (the chord lane’s banner) when a project opens with notes but no chord symbols.',
  chordAnalysisDismissed:
    'The student’s Not now to that offer, on this project and this device (milestone 2.7, schema 5): the banner stays away when the draft reopens. Not in the cloud copy, so another device offers it once more.',
  chordAnalysisPromptOpen: 'The analysis dialog, opened from the banner.',

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
  clipboardClips: 'Copied clips: they paste into the next project too.',
  clipboardAudioClip:
    'A copied audio clip: it pastes into the next project too.',
  settingsOpen:
    'Whether the Settings dialog is open. It sets up this computer’s audio inputs and outputs, not a project, so a load leaves it as it is.',
  recordingLimitModalOpen: 'A notice about a take in the previous project.',
  lastAudioExportAt:
    'When this project was last exported. A lesson detects an export by it, so a new project starts without one.',
  leadSheetSelectedChordIdx: SELECTION,
  selectedChordIds: SELECTION,
  selectedNotes: SELECTION,
  effectPickerOpen:
    'The Add effect picker showing: a moment in this session, never saved.',
  dockEffect: SELECTION,
  dockMaster:
    'Master shown in the dock’s slot: a moment of this session; a project opens with its tracks (milestone 2.9).',
  dockNoteSelection: SELECTION,
  mixRack:
    'The rack the Mix view’s RackDock shows (milestone 2.10): every project opens with it shut.',
  muteAllSet:
    'The tracks Mute All muted, for its second press (milestone 2.10); the mutes themselves are the tracks’ own fields.',
  dockMaximized:
    'The dock grown over the canvas for a moment; a project opens with the canvas showing (milestone 2.9).',

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
  notationStaff:
    'The staff the Score and Lead Sheet write the part on, set by hand (treble, alto, bass, bass8vb: the bass clef with an 8, grand); unset is Auto, which follows the instrument (Score/partStaff.ts), and a new instrument sets it back to unset. A setting of the music like the instrument, so it is shared, undone and saved with it, in the settings blob the cloud payload already carries. Drafts and cloud saves from before schema 8 hold none: every part reads Auto.',
} satisfies Reasons<Track>);

const FROM_CLIP_START = 'From the start of the clip.';

/** Why nested fields are classified as they are, by the type holding them. */
export const NESTED_FIELD_REASONS: NestedReasons = Object.freeze({
  MidiClip: {
    durationTicks:
      'Set when a clip is trimmed or drawn past its notes; without it a clip ends with its last note.',
    muted:
      'Mute clip in the clip menu (milestone 2.12): the scheduler and the export skip it. Shared in collab, as the arrangement is; only a track’s M is each person’s own. Absent (never false) while it plays.',
  },
  MidiNoteEvent: {
    id: 'Minted when a note is made. An older note without one gets a derived id (noteIds.ts) when it loads, or when a save settles the ids (ensureProjectNoteIds, deterministic); never minted on save. Collab carries it in the Y key _cid.',
    startTick: FROM_CLIP_START,
  },
  MidiCCEvent: {
    tick: FROM_CLIP_START,
  },
  AudioClip: {
    id: 'Its link to its audio (audio/assets/assetStore.ts). The cloud rows get the API’s own ids, so it rides on its track’s settings (audioClipIds, milestone 1.10) and an open reuses it. Within a session it counts as content like any other id (the save status fingerprints it): only a load changes it, and the load marks its baseline after that.',
    duration: 'In ticks.',
    assetId:
      'Null until the audio is uploaded; a cloud save leaves such clips out.',
    name: 'Rename in the clip menu (milestone 2.12). The cloud rows have no name for an audio clip, so it rides in the document, by the clip’s id.',
    muted:
      'Mute clip in the clip menu (milestone 2.12), as on a MIDI clip; in the document by the clip’s id, as its name is.',
  },
  ChordRegion: {
    degreeKey:
      'A label relative to the key, rewritten on a key change: never the chord’s identity.',
    identity:
      'Root, quality and bass (decision D3): filled from milestone 1.16a, kept verbatim, dropped by any write that changes the name, and trusted only while its label equals the name (identityIsCurrent).',
    sourceClipId:
      'The clip a Prism take wrote the region from (milestone 1.10): moving that clip moves the region. Collab should share it (1.14); until then a peer’s copy has none, and moving the clip there leaves the lane alone.',
  },
  Marker: {},
  Section: {
    id: 'Minted when a section is added. One read back from an older draft’s Lead Sheet marks gets one from its bar (section-bar-<n>), the same every time.',
    type: 'One of UNISON’s SectionType names (plus tag, hook, breakdown, build-up and drop); a name of the student’s own is custom.',
    label:
      'What the lane and the Lead Sheet show: the type’s name, a song chart’s own (“Verse 2”) or the student’s.',
    endTick:
      'Exclusive: the next section may start there. Sections never overlap.',
  },
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
