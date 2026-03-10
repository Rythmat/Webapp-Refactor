import { useStore } from '@/daw/store';

// ── Session Data Schema ──────────────────────────────────────────────────

export interface SessionData {
  version: 1;
  timestamp: number;
  data: {
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
      midiClips: Array<{
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
      }>;
      audioClips: Array<{
        id: string;
        startTick: number;
        duration: number;
      }>;
      activeEffects?: string[];
    }>;
    prism: {
      rootNote: number | null;
      rhythmName: string;
      genre: string;
      swing: number;
    };
  };
}

// ── Serialize ────────────────────────────────────────────────────────────

export function serializeSession(): SessionData {
  const state = useStore.getState();

  return {
    version: 1,
    timestamp: Date.now(),
    data: {
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
          events: c.events.map((e) => ({
            note: e.note,
            velocity: e.velocity,
            startTick: e.startTick,
            durationTicks: e.durationTicks,
            channel: e.channel,
          })),
        })),
        audioClips: t.audioClips.map((c) => ({
          id: c.id,
          startTick: c.startTick,
          duration: c.duration,
          fadeInTicks: c.fadeInTicks ?? 0,
          fadeOutTicks: c.fadeOutTicks ?? 0,
        })),
        activeEffects: t.activeEffects,
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

// ── Deserialize ──────────────────────────────────────────────────────────

export function deserializeSession(session: SessionData): void {
  if (session.version !== 1) {
    console.warn('Unknown session version:', session.version);
    return;
  }

  const d = session.data;

  // Ensure at least one MIDI track has monitoring ON for MIDI input to work
  const tracks = d.tracks.map((t) => ({
    ...t,
    activeEffects: (t as any).activeEffects ?? [],
    audioClips: ((t as any).audioClips ?? []).map((c: any) => ({
      ...c,
      fadeInTicks: c.fadeInTicks ?? 0,
      fadeOutTicks: c.fadeOutTicks ?? 0,
    })),
  })) as ReturnType<typeof useStore.getState>['tracks'];
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
