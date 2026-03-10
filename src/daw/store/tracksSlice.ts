import type { StateCreator } from 'zustand';
import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';
import type { AllSlices } from './index';
import {
  DEFAULT_EFFECTS,
  type EffectSlotType,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import type { PitchSegment } from '@/daw/audio/pitch-analysis/PitchAnalyzer';

/** Drum-machine tracks get a compressor enabled by default. */
function drumMachineDefaults() {
  const effects = structuredClone(DEFAULT_EFFECTS);
  effects.compressor = { ...effects.compressor, enabled: true };
  return { effects, activeEffects: ['compressor'] as EffectSlotType[] };
}

// ── Types ───────────────────────────────────────────────────────────────

export type TrackType = 'midi' | 'audio';

export type InstrumentType =
  | 'oracle-synth'
  | 'piano-sampler'
  | 'electric-piano'
  | 'cello'
  | 'organ'
  | 'tonewheel-organ'
  | 'soundfont'
  | 'drum-machine'
  | 'guitar-fx'
  | 'bass-fx'
  | 'vocal-fx'
  | 'none';

export type AudioInputChannel =
  | { mode: 'mono'; channel: number }
  | { mode: 'stereo'; left: number; right: number };

export interface MidiClip {
  id: string;
  name?: string;
  startTick: number;
  durationTicks?: number;
  events: MidiNoteEvent[];
  ccEvents?: MidiCCEvent[];
}

/** Audio clip metadata (no AudioBuffer — not serializable). */
export interface AudioClip {
  id: string;
  startTick: number;
  duration: number; // ticks (PPQ=480)
  fadeInTicks: number; // 0 = no fade
  fadeOutTicks: number; // 0 = no fade
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  instrument: InstrumentType;
  gmProgram?: number; // GM program number for SoundFont tracks (0-127)
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number; // 0 – 1
  pan: number; // -1 (L) .. 1 (R)
  recordArmed: boolean;
  monitoring: boolean;
  midiInputId: string | null;
  audioInputId: string | null;
  audioInputChannel: AudioInputChannel | null;
  effects: TrackEffectState;
  activeEffects: EffectSlotType[];
  midiClips: MidiClip[];
  audioClips: AudioClip[];
  /** Persisted vocal pedal chain config (survives VocalView unmount). */
  vocalChain?: {
    type: string;
    enabled: boolean;
    params: Record<string, number>;
  }[];
  /** Persisted guitar/bass pedal chain config (survives GuitarBassView unmount). */
  guitarChain?: {
    type: string;
    enabled: boolean;
    params: Record<string, number>;
    namModelId?: string | null;
  }[];
  /** Per-pad volume/pan for drum-machine tracks, keyed by MIDI note. */
  drumPads?: Record<number, { volume: number; pan: number }>;
}

// ── Pitch editing ────────────────────────────────────────────────────────

export interface PitchEdit {
  segmentId: string;
  targetMidiNote: number;
}

export interface AudioClipPitchData {
  segments: PitchSegment[];
  edits: PitchEdit[];
  analyzed: boolean;
}

// ── Slice ───────────────────────────────────────────────────────────────

export interface TracksSlice {
  tracks: Track[];
  nextColorIndex: number;
  pitchData: Record<string, AudioClipPitchData>;

  setPitchSegments: (clipId: string, segments: PitchSegment[]) => void;
  addPitchEdit: (
    clipId: string,
    segmentId: string,
    targetMidiNote: number,
  ) => void;
  removePitchEdit: (clipId: string, segmentId: string) => void;
  clearPitchEdits: (clipId: string) => void;

  addTrack: (
    type: TrackType,
    instrument: InstrumentType,
    name: string,
    color?: string,
  ) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  toggleRecordArm: (id: string) => void;
  toggleMonitoring: (id: string) => void;
  addMidiClip: (trackId: string, clip: MidiClip) => void;
  removeMidiClip: (trackId: string, clipId: string) => void;
  updateMidiClip: (
    trackId: string,
    clipId: string,
    updates: Partial<MidiClip>,
  ) => void;
  updateMidiClipEvents: (
    trackId: string,
    clipId: string,
    events: MidiNoteEvent[],
  ) => void;
  updateTrackEffects: (
    trackId: string,
    effects: Partial<TrackEffectState>,
  ) => void;
  addAudioClip: (trackId: string, clip: AudioClip) => void;
  removeAudioClip: (trackId: string, clipId: string) => void;
  updateAudioClip: (
    trackId: string,
    clipId: string,
    updates: Partial<AudioClip>,
  ) => void;
  clearMidiClips: (trackId: string) => void;
  reorderTrack: (id: string, newIndex: number) => void;
  addActiveEffect: (trackId: string, effectType: EffectSlotType) => void;
  removeActiveEffect: (trackId: string, effectType: EffectSlotType) => void;
  setVocalChain: (
    trackId: string,
    chain: { type: string; enabled: boolean; params: Record<string, number> }[],
  ) => void;
  setGuitarChain: (
    trackId: string,
    chain: {
      type: string;
      enabled: boolean;
      params: Record<string, number>;
      namModelId?: string | null;
    }[],
  ) => void;
  updateDrumPad: (
    trackId: string,
    note: number,
    params: { volume?: number; pan?: number },
  ) => void;
  loadProjectTemplate: (templateId: string) => void;
}

// ── Demo data ───────────────────────────────────────────────────────────
// Pre-populated tracks so the UI renders with waveforms matching the reference.

function seededNotes(
  seed: number,
  count: number,
  startTick: number,
  spanTicks: number,
  noteRange: [number, number],
): MidiNoteEvent[] {
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const notes: MidiNoteEvent[] = [];
  const [lo, hi] = noteRange;
  for (let i = 0; i < count; i++) {
    const t = startTick + Math.floor(next() * spanTicks);
    const dur = Math.floor(next() * 400) + 60;
    const note = Math.floor(next() * (hi - lo)) + lo;
    const vel = Math.floor(next() * 60) + 60;
    notes.push({
      startTick: t,
      durationTicks: dur,
      note,
      velocity: vel,
      channel: 0,
    });
  }
  return notes.sort((a, b) => a.startTick - b.startTick);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createDemoTracks(): Track[] {
  return [
    {
      id: 'demo-chords',
      name: 'Ethereal Chords',
      type: 'midi',
      instrument: 'oracle-synth',
      color: '#8b5cf6',
      mute: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      recordArmed: true,
      monitoring: true,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      effects: structuredClone(DEFAULT_EFFECTS),
      activeEffects: [],
      midiClips: [
        {
          id: 'clip-chords-1',
          name: 'Ethereal Pad — Chords',
          startTick: 0,
          events: seededNotes(42, 80, 0, 7680, [55, 80]),
        },
      ],
      audioClips: [],
    },
    {
      id: 'demo-melody',
      name: 'Lead Melody',
      type: 'midi',
      instrument: 'oracle-synth',
      color: '#a855f7',
      mute: false,
      solo: false,
      volume: 0.75,
      pan: 0.1,
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      effects: structuredClone(DEFAULT_EFFECTS),
      activeEffects: [],
      midiClips: [
        {
          id: 'clip-melody-1',
          name: 'Lead Line — Melody',
          startTick: 0,
          events: seededNotes(99, 60, 0, 7680, [60, 90]),
        },
      ],
      audioClips: [],
    },
    {
      id: 'demo-bass',
      name: 'Deep Bass',
      type: 'midi',
      instrument: 'oracle-synth',
      color: '#f59e0b',
      mute: false,
      solo: false,
      volume: 0.85,
      pan: 0,
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      effects: structuredClone(DEFAULT_EFFECTS),
      activeEffects: [],
      midiClips: [
        {
          id: 'clip-bass-1',
          name: 'Sub Pattern — Bass',
          startTick: 0,
          events: seededNotes(17, 40, 0, 3840, [30, 50]),
        },
        {
          id: 'clip-bass-2',
          name: 'Sub Pattern II — Bass',
          startTick: 3840,
          events: seededNotes(23, 50, 3840, 3840, [30, 55]),
        },
      ],
      audioClips: [],
    },
    {
      id: 'demo-drums',
      name: 'Percussion',
      type: 'midi',
      instrument: 'drum-machine',
      color: '#f97316',
      mute: false,
      solo: false,
      volume: 0.7,
      pan: 0,
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      ...drumMachineDefaults(),
      midiClips: [
        {
          id: 'clip-drums-1',
          name: 'Beat Sequence — Drums',
          startTick: 0,
          events: seededNotes(55, 90, 0, 7680, [36, 52]),
        },
      ],
      audioClips: [],
    },
  ];
}

export const createTracksSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  TracksSlice
> = (set, get) => ({
  // ── State ── (blank project by default)
  tracks: [],
  nextColorIndex: 0,
  pitchData: {},

  // ── Pitch editing actions ──
  setPitchSegments: (clipId, segments) =>
    set((state) => ({
      pitchData: {
        ...state.pitchData,
        [clipId]: {
          segments,
          edits: state.pitchData[clipId]?.edits ?? [],
          analyzed: true,
        },
      },
    })),

  addPitchEdit: (clipId, segmentId, targetMidiNote) =>
    set((state) => {
      const data = state.pitchData[clipId];
      if (!data) return state;
      const edits = data.edits.filter((e) => e.segmentId !== segmentId);
      edits.push({ segmentId, targetMidiNote });
      return {
        pitchData: { ...state.pitchData, [clipId]: { ...data, edits } },
      };
    }),

  removePitchEdit: (clipId, segmentId) =>
    set((state) => {
      const data = state.pitchData[clipId];
      if (!data) return state;
      return {
        pitchData: {
          ...state.pitchData,
          [clipId]: {
            ...data,
            edits: data.edits.filter((e) => e.segmentId !== segmentId),
          },
        },
      };
    }),

  clearPitchEdits: (clipId) =>
    set((state) => {
      const data = state.pitchData[clipId];
      if (!data) return state;
      return {
        pitchData: { ...state.pitchData, [clipId]: { ...data, edits: [] } },
      };
    }),

  // ── Actions ──
  addTrack: (type, instrument, name) => {
    const id = crypto.randomUUID();
    let assignedColor = '';
    set((state) => {
      assignedColor =
        TRACK_PALETTES[state.nextColorIndex % TRACK_PALETTES.length];
      return { nextColorIndex: state.nextColorIndex + 1 };
    });
    const rootColor = get().rootTrackColor;
    if (rootColor) {
      assignedColor = rootColor;
    }
    const track: Track = {
      id,
      name,
      type,
      instrument,
      color: assignedColor,
      mute: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel:
        instrument === 'guitar-fx' ||
        instrument === 'bass-fx' ||
        instrument === 'vocal-fx'
          ? { mode: 'mono', channel: 0 }
          : null,
      ...(instrument === 'drum-machine'
        ? drumMachineDefaults()
        : {
            effects: structuredClone(DEFAULT_EFFECTS),
            activeEffects: [] as EffectSlotType[],
          }),
      midiClips: [],
      audioClips: [],
    };
    set((state) => ({
      tracks: [...state.tracks, track],
      selectedTrackId: id,
    }));
    return id;
  },

  removeTrack: (id) =>
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),

  updateTrack: (id, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  toggleMute: (id) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, mute: !t.mute } : t,
      ),
    })),

  toggleSolo: (id) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, solo: !t.solo } : t,
      ),
    })),

  toggleRecordArm: (id) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, recordArmed: !t.recordArmed } : t,
      ),
    })),

  toggleMonitoring: (id) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, monitoring: !t.monitoring } : t,
      ),
    })),

  addMidiClip: (trackId, clip) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, midiClips: [...t.midiClips, clip] } : t,
      ),
    })),

  removeMidiClip: (trackId, clipId) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? { ...t, midiClips: t.midiClips.filter((c) => c.id !== clipId) }
          : t,
      ),
    })),

  updateMidiClip: (trackId, clipId, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              midiClips: t.midiClips.map((c) =>
                c.id === clipId ? { ...c, ...updates } : c,
              ),
            }
          : t,
      ),
    })),

  updateMidiClipEvents: (trackId, clipId, events) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              midiClips: t.midiClips.map((c) =>
                c.id === clipId ? { ...c, events } : c,
              ),
            }
          : t,
      ),
    })),

  updateTrackEffects: (trackId, effects) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, effects: { ...t.effects, ...effects } } : t,
      ),
    })),

  addAudioClip: (trackId, clip) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, audioClips: [...t.audioClips, clip] } : t,
      ),
    })),

  removeAudioClip: (trackId, clipId) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? { ...t, audioClips: t.audioClips.filter((c) => c.id !== clipId) }
          : t,
      ),
    })),

  updateAudioClip: (trackId, clipId, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              audioClips: t.audioClips.map((c) =>
                c.id === clipId ? { ...c, ...updates } : c,
              ),
            }
          : t,
      ),
    })),

  clearMidiClips: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, midiClips: [] } : t,
      ),
    })),

  reorderTrack: (id, newIndex) =>
    set((state) => {
      const idx = state.tracks.findIndex((t) => t.id === id);
      if (idx === -1 || idx === newIndex) return state;
      const updated = [...state.tracks];
      const [removed] = updated.splice(idx, 1);
      updated.splice(newIndex, 0, removed);
      return { tracks: updated };
    }),

  addActiveEffect: (trackId, effectType) =>
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id !== trackId || t.activeEffects.includes(effectType)) return t;
        return {
          ...t,
          activeEffects: [...t.activeEffects, effectType],
          effects: {
            ...t.effects,
            [effectType]: { ...t.effects[effectType], enabled: true },
          },
        };
      }),
    })),

  removeActiveEffect: (trackId, effectType) =>
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          activeEffects: t.activeEffects.filter((e) => e !== effectType),
          effects: {
            ...t.effects,
            [effectType]: { ...t.effects[effectType], enabled: false },
          },
        };
      }),
    })),

  setVocalChain: (trackId, chain) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, vocalChain: chain } : t,
      ),
    })),

  setGuitarChain: (trackId, chain) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, guitarChain: chain } : t,
      ),
    })),

  updateDrumPad: (trackId, note, params) =>
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const prev = t.drumPads?.[note] ?? { volume: 0.8, pan: 0 };
        return {
          ...t,
          drumPads: {
            ...t.drumPads,
            [note]: { ...prev, ...params },
          },
        };
      }),
    })),

  loadProjectTemplate: (templateId) => {
    const template = getProjectTemplate(templateId);
    if (!template) return;

    // Clear existing tracks
    set({ tracks: [], nextColorIndex: 0, pitchData: {} });

    // Set BPM and genre via other slices
    get().setBpm(template.bpm);
    get().selectGenre(template.genre);

    // Create each template track
    for (const def of template.tracks) {
      const id = crypto.randomUUID();
      const track: Track = {
        id,
        name: def.name,
        type: def.type,
        instrument: def.instrument,
        color: def.color,
        mute: false,
        solo: false,
        volume: 0.8,
        pan: 0,
        recordArmed: false,
        monitoring: false,
        midiInputId: null,
        audioInputId: null,
        audioInputChannel:
          def.instrument === 'guitar-fx' ||
          def.instrument === 'bass-fx' ||
          def.instrument === 'vocal-fx'
            ? { mode: 'mono', channel: 0 }
            : null,
        ...(def.instrument === 'drum-machine'
          ? drumMachineDefaults()
          : {
              effects: structuredClone(DEFAULT_EFFECTS),
              activeEffects: [] as EffectSlotType[],
            }),
        midiClips: [],
        audioClips: [],
      };
      set((state) => ({
        tracks: [...state.tracks, track],
        nextColorIndex: state.nextColorIndex + 1,
      }));
    }

    // Arm the first MIDI track for monitoring
    const firstMidi = get().tracks.find((t) => t.type === 'midi');
    if (firstMidi) {
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === firstMidi.id
            ? { ...t, monitoring: true, recordArmed: true }
            : t,
        ),
        selectedTrackId: firstMidi.id,
      }));
    }
  },
});
