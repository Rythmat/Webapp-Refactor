import { useState, useCallback, useRef } from 'react';
import { useAudioRecording, type AudioDeviceInfo, type AudioPermissionState } from './use-audio-recording';
import { useMidiInput, type MidiDeviceInfo } from './use-midi-input';
import { createMetronome, type MetronomeInstance } from '@/studio-daw/audio/metronome';
import { renderMidiToAudioBuffer, type MidiClipData } from '@/studio-daw/audio/midi-engine';
import type { MidiNote } from '@/studio-daw/audio/midi-engine';
import type { Track, TrackType, TransportState } from './use-audio-engine';

export type RecordingMode = 'audio' | 'midi';
export type RecordingState = 'idle' | 'counting-in' | 'recording';

export interface RecordingSettings {
  mode: RecordingMode;
  targetTrackId: string | null;
  countInBars: number;
  metronomeEnabled: boolean;
  metronomeVolume: number;
  overdub: boolean;
  midiProgram: number; // GM instrument for MIDI recording
  loopWhileRecording: boolean; // loop existing tracks during recording
}

const DEFAULT_SETTINGS: RecordingSettings = {
  mode: 'audio',
  targetTrackId: null,
  countInBars: 1,
  metronomeEnabled: true,
  metronomeVolume: 0.6,
  overdub: true,
  midiProgram: 0, // Acoustic Grand Piano
  loopWhileRecording: false,
};

interface UseRecordingOptions {
  getAudioContext: () => AudioContext;
  transportState: TransportState;
  currentTime: number;
  tracks: Track[];
  bpm: number;
  play: () => void;
  stop: () => void;
  loopEnabled: boolean;
  setLoopEnabled: (enabled: boolean) => void;
  addEmptyTrack: (type: TrackType, midiProgram?: number) => { trackId: string; clipId?: string };
  removeTrack: (id: string) => void;
  addRecordedTrack: (
    name: string, buffer: AudioBuffer, trackType?: TrackType,
    midiData?: MidiClipData, startTime?: number,
  ) => { trackId: string; clipId: string };
  addRecordedClipToTrack: (
    trackId: string, buffer: AudioBuffer, startTime: number,
    name: string, midiData?: MidiClipData,
  ) => string;
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
}

export interface UseRecordingReturn {
  recordingState: RecordingState;
  recordingMode: RecordingMode;
  recordingDuration: number;
  settings: RecordingSettings;
  updateSettings: (updates: Partial<RecordingSettings>) => void;

  // Audio (delegated)
  audioDevices: AudioDeviceInfo[];
  selectedAudioDeviceId: string | null;
  setSelectedAudioDeviceId: (id: string) => void;
  audioPermissionState: AudioPermissionState;
  requestAudioPermission: () => Promise<boolean>;
  inputLevel: number;

  // MIDI (delegated)
  midiDevices: MidiDeviceInfo[];
  selectedMidiDeviceId: string | null;
  setSelectedMidiDeviceId: (id: string | null) => void;
  isMidiSupported: boolean;
  capturedNotes: MidiNote[];

  // Recording timeline context (for UI overlays)
  armedTrackId: string | null;
  recordingStartTime: number;

  // Unified controls
  armRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;

  // Device dialog
  isDeviceDialogOpen: boolean;
  setDeviceDialogOpen: (open: boolean) => void;

  // Error
  error: string | null;
}

export function useRecording(options: UseRecordingOptions): UseRecordingReturn {
  const [settings, setSettings] = useState<RecordingSettings>(DEFAULT_SETTINGS);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isDeviceDialogOpen, setDeviceDialogOpen] = useState(false);

  const metronomeRef = useRef<MetronomeInstance | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const armedTrackIdRef = useRef<string | null>(null);
  const [armedTrackId, setArmedTrackId] = useState<string | null>(null);
  const loopWasEnabledRef = useRef<boolean>(false); // track if we enabled loop for recording

  // Compose sub-hooks
  const audioRec = useAudioRecording({
    audioContext: (() => {
      try { return options.getAudioContext(); } catch { return null; }
    })(),
  });

  const midiInput = useMidiInput({ bpm: options.bpm });

  const updateSettings = useCallback((updates: Partial<RecordingSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const armRecording = useCallback(async () => {
    if (recordingState !== 'idle') return;

    const ctx = options.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    // Check we have a device for the selected mode
    if (settings.mode === 'audio') {
      if (audioRec.permissionState !== 'granted') {
        const ok = await audioRec.requestPermission();
        if (!ok) return;
      }
    } else {
      if (!midiInput.isMidiSupported) return;
      if (!midiInput.selectedMidiDeviceId) return;
    }

    // Create an empty track so the user can see it on the timeline
    if (!settings.targetTrackId) {
      const trackType: TrackType = settings.mode === 'midi' ? 'midi' : 'audio';
      const { trackId } = options.addEmptyTrack(trackType, settings.mode === 'midi' ? settings.midiProgram : undefined);
      armedTrackIdRef.current = trackId;
      setArmedTrackId(trackId);

      // Rename the track to indicate recording
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const label = settings.mode === 'midi' ? `MIDI Recording ${timestamp}` : `Recording ${timestamp}`;
      options.setTracks(prev => prev.map(t =>
        t.id === trackId ? { ...t, name: label } : t
      ));
    } else {
      armedTrackIdRef.current = settings.targetTrackId;
      setArmedTrackId(settings.targetTrackId);
    }

    setRecordingState('counting-in');
    recordStartTimeRef.current = options.currentTime;
    setRecordingStartTime(options.currentTime);

    // Enable loop during recording if requested
    loopWasEnabledRef.current = options.loopEnabled;
    if (settings.loopWhileRecording && !options.loopEnabled) {
      options.setLoopEnabled(true);
    }

    // Start playback for overdub
    if (settings.overdub && options.tracks.length > 0) {
      options.play();
    }

    // Count-in
    if (settings.countInBars > 0) {
      const countIn = createMetronome(ctx, {
        bpm: options.bpm,
        beatsPerBar: 4,
        countInBars: settings.countInBars,
        accentFirstBeat: true,
        volume: settings.metronomeVolume,
      });
      await countIn.startCountIn();
    }

    // Start continuous metronome if enabled
    if (settings.metronomeEnabled) {
      metronomeRef.current = createMetronome(ctx, {
        bpm: options.bpm,
        beatsPerBar: 4,
        countInBars: 0,
        accentFirstBeat: true,
        volume: settings.metronomeVolume,
      });
      metronomeRef.current.startContinuous();
    }

    // Start actual recording
    setRecordingState('recording');

    if (settings.mode === 'audio') {
      await audioRec.startRecording();
    } else {
      midiInput.startMidiRecording();
    }
  }, [
    recordingState, settings, options, audioRec, midiInput,
  ]);

  const stopRecording = useCallback(async () => {
    if (recordingState === 'idle') return;

    // Stop metronome
    metronomeRef.current?.stop();
    metronomeRef.current = null;

    const recordStartPos = recordStartTimeRef.current;
    const targetTrackId = armedTrackIdRef.current;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (settings.mode === 'audio') {
      const buffer = await audioRec.stopRecording();
      if (buffer && buffer.duration >= 0.1 && targetTrackId) {
        options.addRecordedClipToTrack(
          targetTrackId,
          buffer,
          settings.overdub ? recordStartPos : 0,
          `Recording ${timestamp}`,
        );
      } else if (!buffer || buffer.duration < 0.1) {
        // Recording was too short — remove the empty track we created
        if (targetTrackId && !settings.targetTrackId) {
          options.removeTrack(targetTrackId);
        }
      }
    } else {
      const midiData = midiInput.stopMidiRecording();
      if (midiData && midiData.notes.length > 0 && targetTrackId) {
        // Set the instrument program
        midiData.program = settings.midiProgram;

        // Render MIDI to audio buffer
        const buffer = await renderMidiToAudioBuffer(midiData);

        options.addRecordedClipToTrack(
          targetTrackId,
          buffer,
          settings.overdub ? recordStartPos : 0,
          `MIDI Recording ${timestamp}`,
          midiData,
        );
      } else if (!midiData || midiData.notes.length === 0) {
        // No notes recorded — remove the empty track we created
        if (targetTrackId && !settings.targetTrackId) {
          options.removeTrack(targetTrackId);
        }
      }
    }

    // Restore loop state if we enabled it for recording
    if (settings.loopWhileRecording && !loopWasEnabledRef.current) {
      options.setLoopEnabled(false);
    }

    armedTrackIdRef.current = null;
    setArmedTrackId(null);
    setRecordingState('idle');
  }, [recordingState, settings, audioRec, midiInput, options]);

  const cancelRecording = useCallback(() => {
    metronomeRef.current?.stop();
    metronomeRef.current = null;

    if (settings.mode === 'audio') {
      audioRec.cancelRecording();
    } else {
      midiInput.cancelMidiRecording();
    }

    // Remove the empty track we created for this recording
    const targetTrackId = armedTrackIdRef.current;
    if (targetTrackId && !settings.targetTrackId) {
      options.removeTrack(targetTrackId);
    }

    // Restore loop state if we enabled it for recording
    if (settings.loopWhileRecording && !loopWasEnabledRef.current) {
      options.setLoopEnabled(false);
    }

    armedTrackIdRef.current = null;
    setArmedTrackId(null);
    setRecordingState('idle');
  }, [settings, audioRec, midiInput, options]);

  // Combine errors
  const error = audioRec.error || midiInput.midiError || null;

  return {
    recordingState,
    recordingMode: settings.mode,
    recordingDuration: audioRec.recordingDuration,
    settings,
    updateSettings,

    audioDevices: audioRec.devices,
    selectedAudioDeviceId: audioRec.selectedDeviceId,
    setSelectedAudioDeviceId: audioRec.setSelectedDeviceId,
    audioPermissionState: audioRec.permissionState,
    requestAudioPermission: audioRec.requestPermission,
    inputLevel: audioRec.inputLevel,

    midiDevices: midiInput.midiDevices,
    selectedMidiDeviceId: midiInput.selectedMidiDeviceId,
    setSelectedMidiDeviceId: midiInput.setSelectedMidiDeviceId,
    isMidiSupported: midiInput.isMidiSupported,

    armedTrackId,
    recordingStartTime,

    armRecording,
    stopRecording,
    cancelRecording,

    isDeviceDialogOpen,
    setDeviceDialogOpen,

    error,
  };
}
