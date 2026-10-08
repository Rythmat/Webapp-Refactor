import {
  DEFAULT_EFFECTS,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';
import { ensureSamplerSampleId } from '@/daw/instruments/samplerChops';
import { useStore, type AllSlices } from '@/daw/store';
import type { AudioInputChannel, Track } from '@/daw/store/tracksSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import { defaultReturns, type ReturnBus } from '@/daw/store/returnsSlice';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { guessTrackRole, type DawTrackRole } from '@/daw/utils/trackRole';
import type { AutomationLanes } from '@/daw/audio/automation';
import {
  getTrackSynthState,
  setTrackSynthState,
  type SynthTrackState,
} from '@/daw/oracle-synth/synthTrackState';

// Instrument + effect configuration persisted alongside a track so the
// instrument voice (gmProgram), effect rack (effects), pedal chains, and drum
// pad mix survive leaving and returning to a project. Stored as one opaque blob
// (`settings_json` column on the DB) — additive, so older saves load fine.
export interface SerializedTrackSettings {
  gmProgram?: number;
  effects?: Track['effects'];
  vocalChain?: Track['vocalChain'];
  guitarChain?: Track['guitarChain'];
  drumPads?: Track['drumPads'];
  automation?: Track['automation'];
  drumKit?: Track['drumKit'];
  bassVoice?: Track['bassVoice'];
  samplerSample?: Track['samplerSample'];
  organState?: Track['organState'];
  presetName?: Track['presetName'];
  sends?: Track['sends'];
  // The track's own id at save time, so cross-track references inside effects
  // (the ducker's keyTrackId) can be remapped when deserialize remints ids
  // (cloud load). Local load keeps ids, so this is a no-op there.
  sourceTrackId?: string;
  // Full Oracle Synth patch for oracle-synth tracks. The synth params live in a
  // shared store + per-track cache (see synthTrackState.ts), not on the Track,
  // so this is pulled from there at save time and seeded back on load.
  oracleSynth?: SynthTrackState;
  // Cloud saves only: the Master bus automation lanes. The API stores this
  // settings blob opaquely but has no project-level field for them, so they
  // ride on the first track's settings (see masterAutomationFromCloud).
  masterAutomation?: AutomationLanes;
  // Cloud saves only: the role the student picked for chord analysis. The API
  // has no column for it either; a save without it re-guesses from the name.
  trackRole?: DawTrackRole;
}

/** Build the persisted settings blob from a track (undefined fields are dropped on JSON encode). */
function trackSettings(t: Track): SerializedTrackSettings {
  return {
    gmProgram: t.gmProgram,
    effects: t.effects,
    vocalChain: t.vocalChain,
    guitarChain: t.guitarChain,
    drumPads: t.drumPads,
    automation: t.automation,
    drumKit: t.drumKit,
    bassVoice: t.bassVoice,
    samplerSample: t.samplerSample,
    organState: t.organState,
    presetName: t.presetName,
    sends: t.sends,
    sourceTrackId: t.id,
    oracleSynth:
      t.instrument === 'oracle-synth' ? getTrackSynthState(t.id) : undefined,
  };
}

/** Spread the saved settings back onto a deserialized track (effects re-defaulted when absent). */
function applyTrackSettings(
  settings: SerializedTrackSettings | undefined,
): Pick<
  Track,
  | 'gmProgram'
  | 'effects'
  | 'vocalChain'
  | 'guitarChain'
  | 'drumPads'
  | 'drumKit'
  | 'bassVoice'
  | 'samplerSample'
  | 'organState'
  | 'presetName'
  | 'sends'
  | 'automation'
> {
  return {
    gmProgram: settings?.gmProgram,
    // Merge over defaults so effect slots added after a save was written
    // (e.g. multiband) are backfilled instead of arriving `undefined` and
    // crashing EffectChain.update / lesson checks on the first access.
    effects: settings?.effects
      ? { ...structuredClone(DEFAULT_EFFECTS), ...settings.effects }
      : structuredClone(DEFAULT_EFFECTS),
    vocalChain: settings?.vocalChain,
    guitarChain: settings?.guitarChain,
    drumPads: settings?.drumPads,
    automation: settings?.automation,
    drumKit: settings?.drumKit,
    bassVoice: settings?.bassVoice,
    // ensure: saves written before sampleId existed get a deterministic one.
    samplerSample: settings?.samplerSample
      ? ensureSamplerSampleId(settings.samplerSample)
      : undefined,
    organState: settings?.organState,
    presetName: settings?.presetName,
    sends: settings?.sends,
  };
}

// ── MIDI Event Codec (columnar + delta-encoded ticks) ────────────────────
//
// Stored shape (per clip) is five parallel arrays. startTickDeltas[0] is the
// absolute start of the first event; subsequent entries are deltas from the
// previous event's startTick. Events are sorted by (startTick, note) on encode
// so deltas are always non-negative and gzip / TOAST compresses runs well.

export interface MidiClipEvents {
  notes: number[];
  velocities: number[];
  startTickDeltas: number[];
  durations: number[];
  channels: number[];
}

export interface MidiClipColumnar {
  id: string;
  name?: string;
  startTick: number;
  events: MidiClipEvents;
}

export function encodeMidiEvents(events: MidiNoteEvent[]): MidiClipEvents {
  const sorted = [...events].sort(
    (a, b) => a.startTick - b.startTick || a.note - b.note,
  );
  const len = sorted.length;
  const notes = new Array<number>(len);
  const velocities = new Array<number>(len);
  const startTickDeltas = new Array<number>(len);
  const durations = new Array<number>(len);
  const channels = new Array<number>(len);

  let prevTick = 0;
  for (let i = 0; i < len; i++) {
    const e = sorted[i];
    notes[i] = e.note;
    velocities[i] = e.velocity;
    startTickDeltas[i] = e.startTick - prevTick;
    durations[i] = e.durationTicks;
    channels[i] = e.channel;
    prevTick = e.startTick;
  }

  return { notes, velocities, startTickDeltas, durations, channels };
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

// ── Session Data Schema ──────────────────────────────────────────────────

export const SESSION_SCHEMA_VERSION = 2;

export interface SessionData {
  // Always written as SESSION_SCHEMA_VERSION; may be lower on legacy reads
  version: number;
  timestamp: number;
  data: {
    // Cloud project id, when this autosave came from a project loaded from
    // (or saved to) the cloud. Restored on boot so subsequent saves PUT to the
    // same row instead of creating a duplicate.
    projectId?: string | null;
    projectName?: string;
    composerName?: string;
    transport: {
      bpm: number;
      position: number;
      metronomeEnabled: boolean;
      loopEnabled: boolean;
      loopStart: number;
      loopEnd: number;
    };
    tracks: Array<{
      id: string;
      name: string;
      type: 'midi' | 'audio';
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
      // This device's input channel for a live guitar, bass or vocal track.
      // Local only: channel numbers belong to one person's audio interface, so
      // the cloud never carries them. Optional — older saves load with none.
      audioInputChannel?: AudioInputChannel | null;
      // The role the student picked for chord analysis. Optional — older saves
      // load as 'auto' (resolved from the name and instrument).
      trackRole?: DawTrackRole;
      midiClips: MidiClipColumnar[];
      audioClips: Array<{
        id: string;
        startTick: number;
        duration: number;
        fadeInTicks: number;
        fadeOutTicks: number;
        // Carried through autosave so a refresh after Save doesn't re-upload
        // already-uploaded clips as fresh AudioAssets.
        assetId?: string | null;
        offsetSeconds?: number;
        gain?: number;
      }>;
      activeEffects?: string[];
      settings?: SerializedTrackSettings;
    }>;
    prism: {
      rootNote: number | null;
      rhythmName: string;
      genre: string;
      swing: number;
      // Optional — older saves predate it and load as Ionian.
      mode?: string;
    };
    // The project's chord symbols (the chord lane). Optional — older saves
    // predate it and load with none.
    chordRegions?: ChordRegion[];
    // Global aux return buses (Phase 4). Optional — older saves predate it and
    // fall back to defaultReturns() on load.
    returns?: ReturnBus[];
    // Master bus automation lanes. Optional — older saves load with none.
    masterAutomation?: AutomationLanes;
  };
}

// Legacy v1 shape — events stored as an array of objects per clip
interface LegacyMidiClip {
  id: string;
  name?: string;
  startTick: number;
  events: Array<{
    note: number;
    velocity: number;
    startTick: number;
    durationTicks: number;
    channel: number;
  }>;
}

function isLegacyMidiClip(clip: unknown): clip is LegacyMidiClip {
  return (
    typeof clip === 'object' &&
    clip !== null &&
    Array.isArray((clip as { events?: unknown }).events)
  );
}

// ── Serialize ────────────────────────────────────────────────────────────

export function serializeSession(): SessionData {
  const state = useStore.getState();

  return {
    version: SESSION_SCHEMA_VERSION,
    timestamp: Date.now(),
    data: {
      projectId: state.projectId,
      projectName: state.projectName,
      composerName: state.composerName,
      transport: {
        bpm: state.bpm,
        position: state.position,
        metronomeEnabled: state.metronomeEnabled,
        loopEnabled: state.loopEnabled,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
      },
      tracks: state.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        instrument: t.instrument,
        color: t.color,
        mute: t.mute,
        solo: t.solo,
        volume: t.volume,
        pan: t.pan,
        recordArmed: t.recordArmed,
        monitoring: t.monitoring,
        midiInputId: t.midiInputId,
        audioInputId: t.audioInputId,
        audioInputChannel: t.audioInputChannel,
        trackRole: t.trackRole,
        midiClips: t.midiClips.map((c) => ({
          id: c.id,
          name: c.name,
          startTick: c.startTick,
          events: encodeMidiEvents(c.events),
        })),
        audioClips: t.audioClips.map((c) => ({
          id: c.id,
          startTick: c.startTick,
          duration: c.duration,
          fadeInTicks: c.fadeInTicks ?? 0,
          fadeOutTicks: c.fadeOutTicks ?? 0,
          assetId: c.assetId ?? null,
          offsetSeconds: c.offsetSeconds,
          gain: c.gain,
        })),
        activeEffects: t.activeEffects,
        settings: trackSettings(t),
      })),
      prism: {
        rootNote: state.rootNote,
        rhythmName: state.rhythmName,
        genre: state.genre,
        swing: state.swing,
        mode: state.mode,
      },
      chordRegions: state.chordRegions,
      returns: state.returns,
      masterAutomation: state.masterAutomation,
    },
  };
}

/**
 * Rewrite each track's ducker `keyTrackId` to point at the correct track after
 * deserialize. `oldToNew` maps a saved track's `sourceTrackId` to its live id.
 * A key that maps nowhere (deleted track, or a cloud load where the source is
 * absent) is nulled so the ducker fails silent and the UI shows "None".
 * Mutates the freshly-built track objects in place (pre-setState).
 */
function remapDuckerKeys(
  tracks: Array<{ effects?: TrackEffectState }>,
  oldToNew: Map<string, string>,
): void {
  for (const track of tracks) {
    const ducker = track.effects?.ducker;
    if (ducker?.keyTrackId) {
      // Replace the ducker object rather than mutate in place: the shallow
      // effects merge in applyTrackSettings aliases this from the input blob,
      // so mutating it would corrupt the caller's project argument.
      track.effects!.ducker = {
        ...ducker,
        keyTrackId: oldToNew.get(ducker.keyTrackId) ?? null,
      };
    }
  }
}

/** Restore returns from a save, backfilling effect slots and falling back to
 *  the defaults when a save predates the feature. */
export function restoreReturns(saved: ReturnBus[] | undefined): ReturnBus[] {
  if (!saved || saved.length === 0) return defaultReturns();
  return saved.map((r) => ({
    ...r,
    effects: { ...structuredClone(DEFAULT_EFFECTS), ...r.effects },
  }));
}

// ── Cloud serialize / deserialize ────────────────────────────────────────
//
// MIDI clips travel inline (columnar in midiClipsJson). Audio clips reference
// AudioAsset rows; only clips with a persisted assetId round-trip. Clips with
// assetId=null (just-recorded / just-imported, bytes not yet uploaded) are
// dropped with a console warning — the upload-and-finalize flow needs to run
// first.

export interface CloudAudioClip {
  id?: string;
  assetId: string;
  startTick: number;
  duration: number;
  offsetSeconds: number;
  gain: number;
  fadeInTicks: number;
  fadeOutTicks: number;
}

export interface CloudProjectInput {
  name: string;
  composerName?: string | null;
  bpm: number;
  prism: {
    rootNote: number | null;
    rhythmName: string;
    genre: string;
    swing: number;
  };
  returns?: ReturnBus[];
  tracks: Array<{
    name: string;
    type: 'midi' | 'audio';
    instrument: string;
    color: string;
    mute: boolean;
    solo: boolean;
    volume: number;
    pan: number;
    activeEffects: string[];
    settings?: SerializedTrackSettings;
    midiClips: MidiClipColumnar[];
    audioClips: CloudAudioClip[];
  }>;
}

export interface CloudProjectDetail extends CloudProjectInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  tracks: Array<
    CloudProjectInput['tracks'][number] & { id: string; ordinal: number }
  >;
}

export function serializeSessionForCloud(
  nameOverride?: string,
): CloudProjectInput {
  const state = useStore.getState();
  let droppedAudioClipCount = 0;

  const tracks = state.tracks.map((t) => {
    const audioClips: CloudAudioClip[] = [];
    for (const c of t.audioClips) {
      if (!c.assetId) {
        droppedAudioClipCount++;
        continue;
      }
      audioClips.push({
        assetId: c.assetId,
        startTick: c.startTick,
        duration: c.duration,
        offsetSeconds: c.offsetSeconds ?? 0,
        gain: c.gain ?? 1,
        fadeInTicks: c.fadeInTicks ?? 0,
        fadeOutTicks: c.fadeOutTicks ?? 0,
      });
    }

    return {
      name: t.name,
      type: t.type,
      instrument: t.instrument,
      color: t.color,
      mute: t.mute,
      solo: t.solo,
      volume: t.volume,
      pan: t.pan,
      activeEffects: t.activeEffects ?? [],
      settings: { ...trackSettings(t), trackRole: t.trackRole },
      midiClips: t.midiClips.map((c) => ({
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: encodeMidiEvents(c.events),
      })),
      audioClips,
    };
  });

  // Master automation rides on the first track's settings (see
  // SerializedTrackSettings.masterAutomation). A project with no tracks has
  // nothing to automate, so nothing is lost there.
  if (tracks.length > 0 && Object.keys(state.masterAutomation).length > 0) {
    tracks[0].settings = {
      ...tracks[0].settings,
      masterAutomation: state.masterAutomation,
    };
  }

  if (droppedAudioClipCount > 0) {
    console.warn(
      `[studio-projects] Cloud save dropped ${droppedAudioClipCount} audio clip(s) without an uploaded asset. Upload via uploadAndFinalizeAsset before saving to persist them.`,
    );
  }

  return {
    // A non-host saving their own copy can override the name without touching
    // the (host-owned) shared project title.
    name: nameOverride ?? state.projectName,
    composerName: state.composerName || null,
    bpm: state.bpm,
    prism: {
      rootNote: state.rootNote,
      rhythmName: state.rhythmName,
      genre: state.genre,
      swing: state.swing,
    },
    returns: state.returns,
    tracks,
  };
}

/**
 * State that belongs to one project's harmony: its chord lane, Prism
 * progression, analyses, selections and lead sheet layout. Every load starts
 * from this, so none of it carries over from the previous project.
 */
function freshProjectHarmony() {
  return {
    chordRegions: [],
    chordSeq: [],
    stringSeq: [],
    availableNextChords: [],
    measuresPerLine: 4,
    measureRowSizes: null,
    measureRestMap: null,
    measureFermatas: null,
    melodyOverrides: [],
    mode: 'ionian',
    unisonDoc: null,
    unisonError: null,
    selectionAnalysis: null,
    chordAnalysis: null,
    chordAnalysisPromptOpen: false,
    selectedChordIds: [],
    selectedNotes: [],
    selectedClipId: null,
    selectedClipTrackId: null,
    parkedClipSelection: null,
    editingClipId: null,
    editingClipTrackId: null,
    leadSheetSelectedChordIdx: null,
    leadSheetSections: [],
    scoreChordTracks: [],
    scoreChordHidden: [],
    scoreArticulations: [],
    scoreSlurs: [],
    scoreSlashNotes: [],
    leadSheetRepeats: [],
  } satisfies Partial<ReturnType<typeof useStore.getState>>;
}

/**
 * The rest of what belongs to one project that no load restores: the lesson
 * or practice screen it was opened for, the key lock and its colour, the
 * detected key (what clearDetectedKey resets), markers, the metre, mastering,
 * the Score and lead-sheet marks freshProjectHarmony leaves out, the Prism
 * suggestion dialog and the pitch analysis of its takes.
 */
const PROJECT_CONTEXT_KEYS = [
  'practiceSession',
  'activeTutorialId',
  'tutorialStepIndex',
  'tutorialStepStatus',
  'tutorialStepCelebrate',
  'rootLocked',
  'rootTrackColor',
  'detectedKeyRootPc',
  'detectedMode',
  'keyConfidence',
  'keySource',
  'activeNotesBitmask',
  'markers',
  'timeSignatureNumerator',
  'timeSignatureDenominator',
  'masteringStyle',
  'masteringEq',
  'masteringPresence',
  'masteringDeEsser',
  'masteringLoudness',
  'masteringStereoField',
  'masteringDynamics',
  'masteringAmount',
  'masteringBypass',
  'masteringFxChain',
  'masteringEffects',
  'masterVolume',
  'scoreSpellings',
  'scoreSystemBreaks',
  'scorePageBreaks',
  'scoreSystemRuns',
  'scoreTextMarks',
  'leadSheetChordFormat',
  'leadSheetShowRepeats',
  'leadSheetShowMelody',
  'leadSheetMelodyTrackId',
  'prismSuggestOpen',
  'prismSuggestInsertTick',
  'prismSuggestTrackId',
  'prismSuggestMeasures',
  'prismSuggestSets',
  'prismSuggestActiveIdx',
  'prismSuggestPreviewPlaying',
  'prismSuggestStyle',
  'pitchData',
] as const satisfies readonly (keyof AllSlices)[];

type ProjectContext = Pick<
  AllSlices,
  | (typeof PROJECT_CONTEXT_KEYS)[number]
  | 'returns'
  | 'currentView'
  | 'libraryOpen'
>;

/**
 * PROJECT_CONTEXT_KEYS as a fresh page has them, read from the slices' own
 * initial state so the defaults live in one place, plus the default return
 * buses and the arrange view. Every load and reset starts from this, so none
 * of it carries over into the next project: a lesson running on in an
 * unrelated project, a practice screen over it, a key lock that blocks the
 * next song's key. A lesson or practice boot starts its own after the load.
 */
function freshProjectContext(): Partial<ProjectContext> {
  const initial = useStore.getInitialState();
  const fresh: Partial<ProjectContext> = { returns: defaultReturns() };
  for (const key of PROJECT_CONTEXT_KEYS) {
    (fresh as Record<string, unknown>)[key] = structuredClone(initial[key]);
  }
  // As setCurrentView('arrange') does: leaving another view opens the library.
  if (useStore.getState().currentView !== 'arrange') {
    fresh.currentView = 'arrange';
    fresh.libraryOpen = true;
  }
  return fresh;
}

/**
 * The chord lane with an id of its own on every region. Chord ids used to
 * come from a counter that restarted on each page load, so a save can hold
 * two regions with one id, and an edit by id then lands on the wrong chord.
 * The first region keeps the id and later ones get a fresh one. Returns the
 * same array when nothing repeats.
 */
export function dedupeChordRegionIds(regions: ChordRegion[]): ChordRegion[] {
  const seen = new Set<string>();
  let repaired: ChordRegion[] | null = null;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    if (region.id && !seen.has(region.id)) {
      seen.add(region.id);
      continue;
    }
    repaired ??= [...regions];
    const id = crypto.randomUUID();
    seen.add(id);
    repaired[i] = { ...region, id };
  }
  return repaired ?? regions;
}

// ── The live session ─────────────────────────────────────────────────────
//
// The store is a module singleton that outlives the editor route: leaving for
// the dashboard and coming back finds the session still in memory. This marks
// when the page last loaded, reset or seeded it, so the editor's boot knows
// the store holds the live session (restoring the autosave over it would put
// an older copy over newer work) and the autosave knows there is a session
// worth writing. It lives here, not in localSession.ts, because every load
// below sets it and localSession.ts already imports this module.

let loadedAt: number | null = null;
// The session as it stood once a template, demo, song, practice track or
// cloud project finished opening (see markSessionPristine).
let pristine: string | null = null;

/** When this page last loaded, reset or seeded the session; null until then. */
export function sessionLoadedAt(): number | null {
  return loadedAt;
}

/** Mark the store as holding the live session (every load and reset does). */
export function markSessionLoaded(): void {
  loadedAt = Date.now();
  pristine = null;
}

/**
 * The store no longer holds a session worth writing: File ▸ New Project
 * drops the autosave and reloads, and nothing may write the old project
 * back in between. The next load or reset marks it again.
 */
export function forgetLiveSession(): void {
  loadedAt = null;
  pristine = null;
}

/** A session's content, without the playhead, for comparing two of them. */
export function sessionFingerprint(session: SessionData): string {
  return JSON.stringify({
    ...session.data,
    transport: { ...session.data.transport, position: 0 },
  });
}

/**
 * Note the session as just opened: a template, demo, song, practice track or
 * cloud project nobody has changed yet. Such a session can be opened again
 * from where it came, so a link that replaces it has no work to keep.
 *
 * A cloud save passes the session it serialized, taken before the request:
 * an edit made while the save was in flight is not in the cloud, so it must
 * still count as work.
 */
export function markSessionPristine(
  session: SessionData = serializeSession(),
): void {
  pristine = sessionFingerprint(session);
}

/** Whether `session` is the live one as it was opened (markSessionPristine). */
export function isPristineSession(
  session: SessionData = serializeSession(),
): boolean {
  return pristine !== null && sessionFingerprint(session) === pristine;
}

export function deserializeCloudProject(project: CloudProjectDetail): void {
  // Cloud load remints track ids, so build a saved-id → new-id map to remap
  // cross-track references (ducker keyTrackId) below.
  const cloudMap = new Map<string, string>();
  const tracks = project.tracks.map((t) => {
    const id = crypto.randomUUID();
    if (t.settings?.sourceTrackId) cloudMap.set(t.settings.sourceTrackId, id);
    // Seed the per-track synth patch so the panel restores it on open and the
    // engine is configured at instrument init (keyed by the freshly minted id).
    if (t.instrument === 'oracle-synth' && t.settings?.oracleSynth) {
      setTrackSynthState(id, t.settings.oracleSynth);
    }
    return {
      id,
      name: t.name,
      type: t.type,
      instrument: t.instrument,
      color: t.color,
      mute: t.mute,
      solo: t.solo,
      volume: t.volume,
      pan: t.pan,
      // Local-only state — re-defaulted on load
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      // Instrument voice + effect config (effects re-default when a save predates
      // this field).
      ...applyTrackSettings(t.settings),
      activeEffects: t.activeEffects,
      midiClips: t.midiClips.map((c) => ({
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: decodeMidiEvents(c.events),
      })),
      audioClips: t.audioClips.map((c) => ({
        // Track-local clip id. The AudioBufferStore is keyed on this; bytes
        // for this clip will be fetched + decoded asynchronously by the
        // caller (loadCloudProjectAudio).
        id: crypto.randomUUID(),
        assetId: c.assetId,
        startTick: c.startTick,
        duration: c.duration,
        offsetSeconds: c.offsetSeconds,
        gain: c.gain,
        fadeInTicks: c.fadeInTicks,
        fadeOutTicks: c.fadeOutTicks,
      })),
      // Saves from before the role was carried guess it from the name.
      trackRole: t.settings?.trackRole ?? guessTrackRole(t.name, t.instrument),
    };
  }) as unknown as ReturnType<typeof useStore.getState>['tracks'];

  // Ensure at least one MIDI track has monitoring ON for MIDI input to work
  const firstMidi = tracks.find((t) => t.type === 'midi');
  if (firstMidi) {
    firstMidi.monitoring = true;
    firstMidi.recordArmed = true;
  }

  // Remap ducker key references onto the freshly minted track ids.
  remapDuckerKeys(tracks, cloudMap);

  useStore.setState({
    // Chord symbols aren't part of a cloud project yet, so it opens with none
    // (and has no chord ids to repair).
    ...freshProjectHarmony(),
    ...freshProjectContext(),
    projectId: project.id,
    projectName: project.name,
    composerName: project.composerName ?? '',
    bpm: project.bpm,
    isPlaying: false,
    isRecording: false,
    tracks,
    rootNote: project.prism.rootNote,
    rhythmName: project.prism.rhythmName,
    genre: project.prism.genre,
    swing: project.prism.swing,
    returns: restoreReturns(project.returns),
    masterAutomation: masterAutomationFromCloud(project),
  });
  resetUndoHistory();
  markSessionLoaded();
  // The cloud holds this project as it opened, so until it changes there is
  // no work in it for a link to keep.
  markSessionPristine();
}

/** The Master automation a cloud save carried on a track's settings (the
 *  first track at save time; searched for, so track order can't lose it). */
function masterAutomationFromCloud(
  project: CloudProjectDetail,
): AutomationLanes {
  return (
    project.tracks.find((t) => t.settings?.masterAutomation)?.settings
      ?.masterAutomation ?? {}
  );
}

/**
 * Reset the store to a pristine, empty project — the same clean slate a fresh
 * page load yields, but without reloading. Used when the user explicitly starts
 * a new project (e.g. the home page "Create New Project" tile) so any project
 * left in the (module-singleton) store from a previous studio session doesn't
 * bleed through. Mirrors the slice initial-state defaults.
 */
export function resetSessionToEmpty(): void {
  useStore.setState({
    // Lesson and practice context, key lock, markers, metre, mastering,
    // returns and marks. A lesson or Practice Track boot starts its own
    // after this reset.
    ...freshProjectContext(),

    // Project identity
    projectId: null,
    projectName: 'Untitled Project',
    composerName: '',

    // Transport
    bpm: 120,
    position: 0,
    isPlaying: false,
    isRecording: false,

    // Tracks
    tracks: [],
    nextColorIndex: 0,
    masterAutomation: {},

    // Prism
    ...freshProjectHarmony(),
    rootNote: null,
    rhythmName: 'Quarters',
    genre: 'Pop',
    swing: 0,
  });
  resetUndoHistory();
  markSessionLoaded();
}

// ── Deserialize ──────────────────────────────────────────────────────────

/** Whether this build can load `session` (a newer format can't be read). */
export function isLoadableSession(session: SessionData): boolean {
  return session.version === 1 || session.version === SESSION_SCHEMA_VERSION;
}

/** Load a local session (the autosave, or kept work); false if unreadable. */
export function deserializeSession(session: SessionData): boolean {
  if (!isLoadableSession(session)) {
    console.warn('Unknown session version:', session.version);
    return false;
  }

  const d = session.data;

  const tracks = d.tracks.map((t) => {
    // Cast through unknown so v1 (array-of-objects) and v2 (columnar) clip
    // shapes can be discriminated at runtime by isLegacyMidiClip.
    const rawClips = (t.midiClips ?? []) as unknown[];
    const midiClips = rawClips.map((raw) => {
      if (isLegacyMidiClip(raw)) {
        return {
          id: raw.id,
          name: raw.name,
          startTick: raw.startTick,
          events: raw.events.map((e) => ({
            note: e.note,
            velocity: e.velocity,
            startTick: e.startTick,
            durationTicks: e.durationTicks,
            channel: e.channel,
          })),
        };
      }
      const c = raw as MidiClipColumnar;
      return {
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: decodeMidiEvents(c.events),
      };
    });

    // Seed the per-track synth patch so the panel restores it on open and the
    // engine is configured at instrument init.
    if (t.instrument === 'oracle-synth' && t.settings?.oracleSynth) {
      setTrackSynthState(t.id, t.settings.oracleSynth);
    }

    // Drop the raw settings blob so it doesn't leak onto the store Track (it's
    // re-derived from applyTrackSettings; a stray `settings` would bloat the
    // store and carry internal fields like sourceTrackId).
    const trackFields = { ...t };
    delete (trackFields as { settings?: unknown }).settings;
    return {
      ...trackFields,
      // Saves from before these were carried.
      audioInputChannel: t.audioInputChannel ?? null,
      trackRole: t.trackRole ?? 'auto',
      // Restore the instrument voice + effect config (effects re-default when a
      // save predates this field).
      ...applyTrackSettings(t.settings),
      activeEffects: t.activeEffects ?? [],
      midiClips,
      audioClips: (t.audioClips ?? []).map((c) => ({
        ...c,
        fadeInTicks: c.fadeInTicks ?? 0,
        fadeOutTicks: c.fadeOutTicks ?? 0,
      })),
    };
  }) as ReturnType<typeof useStore.getState>['tracks'];

  // Ensure at least one MIDI track has monitoring ON for MIDI input to work
  const hasMonitored = tracks.some((t) => t.monitoring && t.type === 'midi');
  if (!hasMonitored) {
    const firstMidi = tracks.find((t) => t.type === 'midi');
    if (firstMidi) {
      firstMidi.monitoring = true;
      firstMidi.recordArmed = true;
    }
  }

  // Remap ducker key references. Local load keeps ids, so this is an identity
  // map (only nulls a key pointing at a track that no longer exists).
  const localMap = new Map<string, string>();
  d.tracks.forEach((t, i) => {
    localMap.set(t.settings?.sourceTrackId ?? t.id, tracks[i].id);
  });
  remapDuckerKeys(tracks, localMap);

  useStore.setState({
    // What the save doesn't carry starts fresh rather than carrying over
    // from the session this one replaces.
    ...freshProjectHarmony(),
    ...freshProjectContext(),

    // Project
    projectId: d.projectId ?? null,
    projectName: d.projectName ?? 'Untitled Project',
    composerName: d.composerName ?? '',

    // Transport
    bpm: d.transport.bpm,
    position: d.transport.position,
    metronomeEnabled: d.transport.metronomeEnabled,
    loopEnabled: d.transport.loopEnabled,
    loopStart: d.transport.loopStart,
    loopEnd: d.transport.loopEnd,
    isPlaying: false,
    isRecording: false,

    // Tracks
    tracks,

    // Prism (partial — only restore serialized fields) and chord symbols
    rootNote: d.prism.rootNote,
    mode: d.prism.mode ?? 'ionian',
    rhythmName: d.prism.rhythmName,
    genre: d.prism.genre,
    swing: d.prism.swing,
    chordRegions: dedupeChordRegionIds(d.chordRegions ?? []),

    // Aux return buses
    returns: restoreReturns(d.returns),
    masterAutomation: d.masterAutomation ?? {},
  });
  resetUndoHistory();
  markSessionLoaded();
  return true;
}
