import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { guessTrackRole } from '@/daw/utils/trackRole';
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
  // Full Oracle Synth patch for oracle-synth tracks. The synth params live in a
  // shared store + per-track cache (see synthTrackState.ts), not on the Track,
  // so this is pulled from there at save time and seeded back on load.
  oracleSynth?: SynthTrackState;
}

/** Build the persisted settings blob from a track (undefined fields are dropped on JSON encode). */
function trackSettings(t: Track): SerializedTrackSettings {
  return {
    gmProgram: t.gmProgram,
    effects: t.effects,
    vocalChain: t.vocalChain,
    guitarChain: t.guitarChain,
    drumPads: t.drumPads,
    oracleSynth:
      t.instrument === 'oracle-synth' ? getTrackSynthState(t.id) : undefined,
  };
}

/** Spread the saved settings back onto a deserialized track (effects re-defaulted when absent). */
function applyTrackSettings(
  settings: SerializedTrackSettings | undefined,
): Pick<
  Track,
  'gmProgram' | 'effects' | 'vocalChain' | 'guitarChain' | 'drumPads'
> {
  return {
    gmProgram: settings?.gmProgram,
    effects: settings?.effects ?? structuredClone(DEFAULT_EFFECTS),
    vocalChain: settings?.vocalChain,
    guitarChain: settings?.guitarChain,
    drumPads: settings?.drumPads,
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
    };
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
      },
    },
  };
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
      settings: trackSettings(t),
      midiClips: t.midiClips.map((c) => ({
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: encodeMidiEvents(c.events),
      })),
      audioClips,
    };
  });

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
    tracks,
  };
}

export function deserializeCloudProject(project: CloudProjectDetail): void {
  const tracks = project.tracks.map((t) => {
    const id = crypto.randomUUID();
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
      trackRole: guessTrackRole(t.name, t.instrument),
    };
  }) as unknown as ReturnType<typeof useStore.getState>['tracks'];

  // Ensure at least one MIDI track has monitoring ON for MIDI input to work
  const firstMidi = tracks.find((t) => t.type === 'midi');
  if (firstMidi) {
    firstMidi.monitoring = true;
    firstMidi.recordArmed = true;
  }

  useStore.setState({
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
  });
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
    pitchData: {},

    // Prism
    chordRegions: [],
    rootNote: null,
    mode: 'ionian',
    rhythmName: 'Quarters',
    genre: 'Pop',
    swing: 0,
  });
}

// ── Deserialize ──────────────────────────────────────────────────────────

export function deserializeSession(session: SessionData): void {
  if (session.version !== 1 && session.version !== SESSION_SCHEMA_VERSION) {
    console.warn('Unknown session version:', session.version);
    return;
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

    return {
      ...t,
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

  useStore.setState({
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

    // Prism (partial — only restore serialized fields)
    rootNote: d.prism.rootNote,
    rhythmName: d.prism.rhythmName,
    genre: d.prism.genre,
    swing: d.prism.swing,
  });
}
