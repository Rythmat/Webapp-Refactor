import type { StateCreator } from 'zustand';
import type { MidiNoteEvent } from '@prism/engine';
import type { AllSlices } from './index';
import { midiClipLength } from '@/daw/time/timeModel';
import {
  DEFAULT_CLICK_DB,
  MAX_CLICK_DB,
  MIN_CLICK_DB,
  type ClickSound,
} from '@/daw/audio/clickSounds';

// ── Transport Slice ─────────────────────────────────────────────────────
// Controls playback state, tempo, position, metronome, and loop region.
// Ticks: 480 ticks per quarter note (standard MIDI resolution).

export interface LoopState {
  enabled: boolean;
  start: number; // tick
  end: number; // tick
}

/** The loop playback follows: the piano roll editor's own loop while that
 *  editor is open, otherwise the project loop. */
export function getPlaybackLoop(
  s: Pick<
    TransportSlice,
    'editorLoop' | 'loopEnabled' | 'loopStart' | 'loopEnd'
  >,
): LoopState {
  return (
    s.editorLoop ?? {
      enabled: s.loopEnabled,
      start: s.loopStart,
      end: s.loopEnd,
    }
  );
}

export interface TransportSlice {
  isPlaying: boolean;
  isRecording: boolean;
  isCountingIn: boolean;
  // Whether the in-progress count-in should begin RECORDING (vs. just playing)
  // when it completes. Set when the count-in starts; read by _startAfterCountIn.
  countInIsRecording: boolean;
  countInBars: number; // 0 = off, 1 = 1 bar, 2 = 2 bars
  // Audio-clock time the count-in clicks were scheduled from, so the on-screen
  // count-off can follow the same clock the clicks do. Null when not counting.
  countInStartedAt: number | null;
  bpm: number;
  timeSignatureNumerator: number; // beats per bar (default: 4)
  timeSignatureDenominator: number; // beat unit (default: 4 = quarter note)
  // The parked playhead (480 ticks/quarter): written on pause, stop and seek
  // only. While playing, the playhead lives in engine/playheadClock.ts.
  position: number;
  lastSeekPosition: number; // last manually-placed playhead position
  metronomeEnabled: boolean;
  /** The click's sound and its level in dB: per-user prefs (2.8). */
  metronomeSound: ClickSound;
  metronomeVolume: number;
  loopEnabled: boolean;
  loopStart: number; // tick
  loopEnd: number; // tick (default: 4 bars = 7680)
  // The piano roll editor's own loop — a tool inside that editor, kept apart
  // from the project loop above (never saved, never shown in the timeline).
  // Non-null only while the editor is open; playback loops on it then.
  editorLoop: LoopState | null;
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
  _setCountInStartedAt: (audioTime: number | null) => void;
  _startAfterCountIn: () => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (numerator: number, denominator: number) => void;
  setPosition: (tick: number) => void;
  setLastSeekPosition: (tick: number) => void;
  toggleMetronome: () => void;
  setMetronomeSound: (sound: ClickSound) => void;
  setMetronomeVolume: (db: number) => void;
  toggleLoop: () => void;
  setLoopEnabled: (enabled: boolean) => void;
  setLoopRange: (start: number, end: number) => void;
  setEditorLoop: (loop: LoopState | null) => void;
  updateEditorLoop: (patch: Partial<LoopState>) => void;
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

/**
 * Reads the running playhead, or null when the transport isn't running.
 * engine/playheadClock.ts registers it, so pause parks the playhead where
 * the student heard it without this slice importing the clock.
 */
let readLivePlayhead: () => number | null = () => null;

export function setLivePlayheadReader(read: () => number | null): void {
  readLivePlayhead = read;
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
  countInIsRecording: false,
  countInBars: 0,
  countInStartedAt: null,
  bpm: 120,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  position: 0,
  lastSeekPosition: 0,
  metronomeEnabled: false,
  metronomeSound: 'click',
  metronomeVolume: DEFAULT_CLICK_DB,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 7680, // 4 bars × 4 beats × 480 ticks
  editorLoop: null,
  liveRecordingNotes: [],
  liveRecordingTrackId: null,
  liveRecordingStartTick: 0,
  liveAudioPeaks: [],
  liveAudioTrackId: null,
  liveAudioStartTick: 0,

  // ── Actions ──
  // Starting playback (or recording) with a count-in armed first runs the
  // metronome for `countInBars` bars (handled by the count-in effect in
  // usePlaybackEngine) while the transport stays paused, then begins moving the
  // playhead. The count-in is a no-op once already playing or counting in.
  play: () =>
    set((state) => {
      if (state.isPlaying || state.isCountingIn) return {};
      if (state.countInBars > 0) {
        return { isCountingIn: true, countInIsRecording: false };
      }
      return { isPlaying: true };
    }),

  pause: () =>
    set(() => {
      const live = readLivePlayhead();
      return {
        ...(live !== null ? { position: Math.max(0, Math.round(live)) } : {}),
        isPlaying: false,
        isRecording: false,
        isCountingIn: false,
        countInIsRecording: false,
        countInStartedAt: null,
        liveRecordingNotes: [],
        liveRecordingTrackId: null,
        liveRecordingStartTick: 0,
        liveAudioPeaks: [],
        liveAudioTrackId: null,
        liveAudioStartTick: 0,
      };
    }),

  stop: () =>
    set((state) => ({
      isPlaying: false,
      isRecording: false,
      isCountingIn: false,
      countInIsRecording: false,
      countInStartedAt: null,
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
      if (state.isCountingIn) return {};
      if (state.countInBars > 0) {
        return { isCountingIn: true, countInIsRecording: true };
      }
      return { isRecording: true, isPlaying: true };
    }),

  setCountInBars: (bars) =>
    set({ countInBars: Math.max(0, Math.min(2, bars)) }),

  _setCountInStartedAt: (audioTime) => set({ countInStartedAt: audioTime }),

  _startAfterCountIn: () =>
    set((state) => ({
      isCountingIn: false,
      isPlaying: true,
      isRecording: state.countInIsRecording,
      countInIsRecording: false,
      countInStartedAt: null,
    })),

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

  setMetronomeSound: (sound) => set({ metronomeSound: sound }),

  setMetronomeVolume: (db) =>
    set({
      metronomeVolume: Math.min(MAX_CLICK_DB, Math.max(MIN_CLICK_DB, db)),
    }),

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
            // The clip's box, its set length included, as the timeline
            // draws it.
            // An empty clip has no length: keep the current range.
            const length = midiClipLength(midiClip);
            if (length <= 0) return { loopEnabled: true };
            return {
              loopEnabled: true,
              loopStart: midiClip.startTick,
              loopEnd: midiClip.startTick + length,
            };
          }
        }
      }
      return { loopEnabled: true };
    }),

  // Plain on/off that keeps the current range — toggleLoop instead refits the
  // range to the selected clip when turning the loop on.
  setLoopEnabled: (enabled) => set({ loopEnabled: enabled }),

  setEditorLoop: (loop) => set({ editorLoop: loop }),

  // No-op unless the editor loop exists (i.e. the piano roll editor is open).
  // A range that ends where it starts, or before, is refused: the loop keeps
  // its range (engine-hooks-18).
  updateEditorLoop: (patch) =>
    set((state) => {
      if (!state.editorLoop) return {};
      const next = { ...state.editorLoop, ...patch };
      return next.end > next.start ? { editorLoop: next } : {};
    }),

  setLoopRange: (start, end) =>
    set(() => {
      const loopStart = Math.max(0, start);
      const loopEnd = Math.max(0, end);
      return loopEnd > loopStart ? { loopStart, loopEnd } : {};
    }),

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
