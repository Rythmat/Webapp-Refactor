import type { StateCreator } from 'zustand';
import type { MidiNoteEvent } from '@prism/engine';
import type { AllSlices } from './index';

// ── Transport Slice ─────────────────────────────────────────────────────
// Controls playback state, tempo, position, metronome, and loop region.
// Ticks: 480 ticks per quarter note (standard MIDI resolution).

export interface TransportSlice {
  isPlaying: boolean;
  isRecording: boolean;
  isCountingIn: boolean;
  countInBars: number; // 0 = off, 1 = 1 bar, 2 = 2 bars
  bpm: number;
  timeSignatureNumerator: number; // beats per bar (default: 4)
  timeSignatureDenominator: number; // beat unit (default: 4 = quarter note)
  position: number; // current tick position (480 ticks/quarter)
  lastSeekPosition: number; // last manually-placed playhead position
  metronomeEnabled: boolean;
  loopEnabled: boolean;
  loopStart: number; // tick
  loopEnd: number; // tick (default: 4 bars = 7680)
  liveRecordingNotes: MidiNoteEvent[];
  liveRecordingTrackId: string | null;
  liveRecordingStartTick: number;
  liveAudioPeaks: number[];
  liveAudioTrackId: string | null;
  liveAudioStartTick: number;

  play: () => void;
  pause: () => void;
  stop: () => void;
  record: () => void;
  setCountInBars: (bars: number) => void;
  _startRecordingAfterCountIn: () => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (numerator: number, denominator: number) => void;
  setPosition: (tick: number) => void;
  setLastSeekPosition: (tick: number) => void;
  toggleMetronome: () => void;
  toggleLoop: () => void;
  setLoopRange: (start: number, end: number) => void;
  setLiveRecording: (
    trackId: string,
    notes: MidiNoteEvent[],
    startTick: number,
  ) => void;
  clearLiveRecording: () => void;
  setLiveAudioRecording: (
    trackId: string,
    peaks: number[],
    startTick: number,
  ) => void;
  clearLiveAudioRecording: () => void;
}

export const createTransportSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  TransportSlice
> = (set) => ({
  // ── State ──
  isPlaying: false,
  isRecording: false,
  isCountingIn: false,
  countInBars: 0,
  bpm: 120,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  position: 0,
  lastSeekPosition: 0,
  metronomeEnabled: false,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 7680, // 4 bars × 4 beats × 480 ticks
  liveRecordingNotes: [],
  liveRecordingTrackId: null,
  liveRecordingStartTick: 0,
  liveAudioPeaks: [],
  liveAudioTrackId: null,
  liveAudioStartTick: 0,

  // ── Actions ──
  play: () => set({ isPlaying: true }),

  pause: () =>
    set({
      isPlaying: false,
      isRecording: false,
      isCountingIn: false,
      liveRecordingNotes: [],
      liveRecordingTrackId: null,
      liveRecordingStartTick: 0,
      liveAudioPeaks: [],
      liveAudioTrackId: null,
      liveAudioStartTick: 0,
    }),

  stop: () =>
    set((state) => ({
      isPlaying: false,
      isRecording: false,
      isCountingIn: false,
      position: state.lastSeekPosition,
      liveRecordingNotes: [],
      liveRecordingTrackId: null,
      liveRecordingStartTick: 0,
      liveAudioPeaks: [],
      liveAudioTrackId: null,
      liveAudioStartTick: 0,
    })),

  record: () =>
    set((state) => {
      if (state.countInBars > 0) {
        return { isCountingIn: true };
      }
      return { isRecording: true, isPlaying: true };
    }),

  setCountInBars: (bars) =>
    set({ countInBars: Math.max(0, Math.min(2, bars)) }),

  _startRecordingAfterCountIn: () =>
    set({ isCountingIn: false, isRecording: true, isPlaying: true }),

  setBpm: (bpm) => set({ bpm: Math.max(40, Math.min(300, bpm)) }),

  setTimeSignature: (numerator, denominator) => {
    const validDenominators = [2, 4, 8, 16];
    const num = Math.max(1, Math.min(32, Math.round(numerator)));
    const den = validDenominators.includes(denominator) ? denominator : 4;
    set({ timeSignatureNumerator: num, timeSignatureDenominator: den });
  },

  setPosition: (tick) => set({ position: Math.max(0, tick) }),

  setLastSeekPosition: (tick) => set({ lastSeekPosition: Math.max(0, tick) }),

  toggleMetronome: () =>
    set((state) => ({ metronomeEnabled: !state.metronomeEnabled })),

  toggleLoop: () =>
    set((state) => {
      if (state.loopEnabled) return { loopEnabled: false };
      // When enabling, auto-set range from selected clip
      const { selectedClipId, selectedClipTrackId, tracks } =
        state as unknown as AllSlices;
      if (selectedClipId && selectedClipTrackId) {
        const track = tracks.find((t) => t.id === selectedClipTrackId);
        if (track) {
          const audioClip = track.audioClips.find(
            (c) => c.id === selectedClipId,
          );
          if (audioClip) {
            return {
              loopEnabled: true,
              loopStart: audioClip.startTick,
              loopEnd: audioClip.startTick + audioClip.duration,
            };
          }
          const midiClip = track.midiClips.find((c) => c.id === selectedClipId);
          if (midiClip) {
            const maxTick = midiClip.events.reduce(
              (max, ev) => Math.max(max, ev.startTick + ev.durationTicks),
              0,
            );
            return {
              loopEnabled: true,
              loopStart: midiClip.startTick,
              loopEnd: midiClip.startTick + maxTick,
            };
          }
        }
      }
      return { loopEnabled: true };
    }),

  setLoopRange: (start, end) =>
    set({ loopStart: Math.max(0, start), loopEnd: Math.max(0, end) }),

  setLiveRecording: (trackId, notes, startTick) =>
    set({
      liveRecordingTrackId: trackId,
      liveRecordingNotes: notes,
      liveRecordingStartTick: startTick,
    }),

  clearLiveRecording: () =>
    set({
      liveRecordingNotes: [],
      liveRecordingTrackId: null,
      liveRecordingStartTick: 0,
    }),

  setLiveAudioRecording: (trackId, peaks, startTick) =>
    set({
      liveAudioTrackId: trackId,
      liveAudioPeaks: peaks,
      liveAudioStartTick: startTick,
    }),

  clearLiveAudioRecording: () =>
    set({ liveAudioPeaks: [], liveAudioTrackId: null, liveAudioStartTick: 0 }),
});
