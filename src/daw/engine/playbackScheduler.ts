// ── PlaybackScheduler (milestone 1.11) ───────────────────────────────────
// One owner for what the song plays while the transport runs: the MIDI parts,
// the audio clips and the automation lanes. Every start, seam and jump is
// placed at the audio-clock time the transport reaches it, never at "now":
//
//   - Play: the transport starts at an explicit time (useTransport, or the
//     count-in's last beat), and a clip the playhead is inside starts then,
//     with its offset, on the beat with the MIDI and the click.
//   - Loop laps: the loop event's own time. Held notes end there, a clip that
//     crosses the seam fades out there and starts again from the loop start.
//   - Seek while playing: the time the transport jumps. Old audio fades out,
//     held notes end, clips under the new position start there, and the
//     automation is re-anchored.
//   - Edits while playing: a clip's part is rebuilt when its object changes,
//     so a changed note is heard on its next pass, and a deleted clip or
//     track stops.
//
// The legacy scheduler (engine/legacyPlayback.ts) stays behind the
// localStorage flag `ma:daw:legacyScheduler` = '1' until a production soak.

import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { getPlaybackLoop } from '@/daw/store/transportSlice';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import type { AudioClipScheduler } from '@/daw/audio/AudioClipScheduler';
import type { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import type { MidiScheduler } from '@/daw/audio/MidiScheduler';
import type { TrackEngine } from '@/daw/audio/TrackEngine';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import {
  scheduleMasterAutomation,
  trackEngineRegistry,
  type TrackAudioState,
} from './trackAudio';

// ── The legacy flag ────────────────────────────────────────────────────────

/** The localStorage key that brings back the scheduler from before 1.11. */
export const LEGACY_SCHEDULER_KEY = 'ma:daw:legacyScheduler';

/** Whether this page uses the legacy scheduler (read on each Play, so a
 *  change counts from the next one; storage that throws means no). */
export function isLegacyScheduler(): boolean {
  try {
    return globalThis.localStorage?.getItem(LEGACY_SCHEDULER_KEY) === '1';
  } catch {
    return false;
  }
}

// ── When the transport starts ─────────────────────────────────────────────

let plannedStart: number | null = null;
let startedAt: number | null = null;

/** The count-in books the transport's start on its last beat's end, so the
 *  downbeat lands exactly one beat after the last click. */
export function planTransportStart(time: number | null): void {
  plannedStart = time;
}

/** The planned start, once (a start that has passed is no use). */
export function takePlannedTransportStart(now: number): number | null {
  const at = plannedStart;
  plannedStart = null;
  return at !== null && at >= now ? at : null;
}

/** Called by useTransport when it starts the transport at `time`. */
export function noteTransportStarted(time: number | null): void {
  startedAt = time;
}

/** When the transport last started (null when it isn't running). */
export function transportStartedAt(): number | null {
  return startedAt;
}

// ── The editor's scheduler, for seeks ─────────────────────────────────────

let activePlayback: PlaybackScheduler | null = null;

/** usePlaybackEngine registers its scheduler while the editor is open
 *  (`owner` unregisters only if it is still the one registered). */
export function setActivePlayback(
  next: PlaybackScheduler | null,
  owner?: PlaybackScheduler,
): void {
  if (next === null && owner && activePlayback !== owner) return;
  activePlayback = next;
}

/** The transport jumped to `tick` at `time` while playing: reschedule. */
export function seekPlayback(tick: number, time: number): void {
  activePlayback?.seek(tick, time);
}

// ── Where audio clips play into ───────────────────────────────────────────

/**
 * Where a track's audio clips play into: the pedal chain's native input on a
 * Guitar, Bass or Vocal track, so amp and pedal changes are heard in real
 * time during playback; else the track's own input (undefined).
 */
export function pedalInputOf(
  instrument: TrackAudioState['instrument'],
): AudioNode | undefined {
  if (instrument instanceof GuitarFxAdapter) {
    return instrument.getNativePedalInputNode() ?? undefined;
  }
  if (instrument instanceof VocalFxAdapter) {
    return instrument.getNativePedalInputNode() ?? undefined;
  }
  return undefined;
}

/** A track's engine as it is when an event fires (the reconciler can rebuild
 *  it mid-song, on an instrument change). */
const engineOf = (trackId: string) => (): TrackEngine | undefined =>
  trackEngineRegistry.get(trackId)?.trackEngine;

/** The tick the transport is at `time`. */
function ticksAt(time: number): number {
  return Tone.getTransport().getTicksAtTime(time);
}

export interface PlaybackSchedulers {
  midi: MidiScheduler;
  audio: AudioClipScheduler;
  automation: AutomationScheduler;
}

export class PlaybackScheduler {
  private running = false;
  private tracks: readonly Track[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly s: PlaybackSchedulers) {}

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Schedule the song from `fromTick`, the transport starting at `t0`.
   * Everything that plays later is booked on the transport; a clip the
   * playhead is inside starts at `t0`.
   */
  start(fromTick: number, t0: number): void {
    this.cancel();
    const state = useStore.getState();
    this.running = true;
    this.tracks = state.tracks;
    for (const track of state.tracks) {
      const audio = trackEngineRegistry.get(track.id);
      if (!audio) continue;
      for (const clip of track.midiClips) this.scheduleMidiClip(track, clip);
      this.scheduleTrackAudio(track, audio, fromTick, t0);
      this.s.automation.scheduleTrack(
        track.id,
        audio.trackEngine,
        track.automation,
        fromTick,
        state.bpm,
        t0,
      );
    }
    scheduleMasterAutomation(this.s.automation, fromTick, state.bpm, t0);
    this.unsubscribe = useStore.subscribe((next, prev) => {
      if (next.tracks !== prev.tracks) this.syncEdits(next.tracks);
    });
  }

  /** Stop scheduling: held notes end and sounding clips fade out at `time`
   *  (when the transport pauses), and nothing booked is left. */
  stop(time?: number): void {
    const at = time ?? Tone.now();
    for (const [, state] of trackEngineRegistry) {
      state.trackEngine.panic(at);
    }
    this.s.midi.releaseAll(at);
    this.cancel(at);
  }

  /** The transport went round the loop at `time`. */
  onLoop(time: number): void {
    if (!this.running) return;
    const state = useStore.getState();
    const { start: loopStart, end: loopEnd } = getPlaybackLoop(state);
    for (const [, audio] of trackEngineRegistry) {
      audio.trackEngine.allNotesOff(time);
    }
    this.s.midi.releaseAll(time);
    // Only the clips that cross the seam or start inside the loop need new
    // starts: the rest of the transport's bookings stay.
    for (const track of state.tracks) {
      const audio = trackEngineRegistry.get(track.id);
      if (!audio) continue;
      for (const clip of track.audioClips) {
        // A clip outside the loop keeps its booking, for when the loop is
        // turned off.
        const end = clip.startTick + clip.duration;
        if (end <= loopStart || clip.startTick >= loopEnd) continue;
        this.s.audio.cancelClip(clip.id, time);
        this.scheduleAudioClip(audio, clip, loopStart, time);
      }
      // One-shot transport events don't re-fire after the loop reset:
      // re-arm this track's lanes, anchored at the loop start.
      this.s.automation.scheduleTrack(
        track.id,
        audio.trackEngine,
        track.automation,
        loopStart,
        state.bpm,
        time,
      );
    }
    scheduleMasterAutomation(this.s.automation, loopStart, state.bpm, time);
  }

  /**
   * The transport jumped to `tick` at `time` (a seek while playing). What is
   * sounding ends there; clips under the new position start there.
   */
  seek(tick: number, time: number): void {
    if (!this.running) return;
    const state = useStore.getState();
    for (const [, audio] of trackEngineRegistry) {
      audio.trackEngine.allNotesOff(time);
    }
    this.s.midi.releaseAll(time);
    this.s.audio.cancelAll(time);
    for (const track of state.tracks) {
      const audio = trackEngineRegistry.get(track.id);
      if (!audio) continue;
      this.scheduleTrackAudio(track, audio, tick, time);
      this.s.automation.scheduleTrack(
        track.id,
        audio.trackEngine,
        track.automation,
        tick,
        state.bpm,
        time,
      );
    }
    scheduleMasterAutomation(this.s.automation, tick, state.bpm, time);
  }

  /** Clear every booking. With `time`, sounding clips fade out from then. */
  cancel(time?: number): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.running = false;
    this.tracks = [];
    this.s.midi.cancelAll();
    this.s.audio.cancelAll(time);
    this.s.automation.cancelAll();
  }

  // ── Edits during playback ────────────────────────────────────────────

  /**
   * The store's tracks changed while playing. A MIDI clip whose object is
   * new is rebuilt (heard on its next pass); one gone ends its notes. An
   * audio clip that changed starts again under the playhead or at its new
   * start; one gone fades out. Volume, effects and automation are the
   * reconciler's (engine/trackReconciler.ts).
   */
  private syncEdits(tracks: readonly Track[]): void {
    const before = new Map(this.tracks.map((t) => [t.id, t]));
    this.tracks = tracks;
    const time = Tone.now();
    const tick = ticksAt(time);
    const midiSeen = new Set<string>();
    const audioSeen = new Set<string>();
    for (const track of tracks) {
      const prev = before.get(track.id);
      for (const clip of track.midiClips) midiSeen.add(clip.id);
      for (const clip of track.audioClips) audioSeen.add(clip.id);
      if (prev === track) continue;
      const prevMidi = new Set((prev?.midiClips ?? []).map((c) => c.id));
      for (const clip of track.midiClips) {
        const was = this.s.midi.sourceOf(clip.id);
        // A clip moved here from another track plays through this one's
        // instrument now, even when nothing else about it changed.
        const moved = !prevMidi.has(clip.id);
        if (was === clip && !moved) continue;
        // A mute or a rename isn't an edit of what plays: the parts gate
        // muted clips as their events come (milestone 2.12).
        if (!moved && sameSound(was, clip)) {
          this.s.midi.setSource(clip.id, clip);
          continue;
        }
        this.s.midi.replaceClip(
          clip.id,
          sequenceOf(track, clip),
          engineOf(track.id),
          clip.startTick,
          clip,
          tick,
          time,
        );
      }
      if (prev?.audioClips === track.audioClips) continue;
      const audio = trackEngineRegistry.get(track.id);
      const prevClips = new Map((prev?.audioClips ?? []).map((c) => [c.id, c]));
      for (const clip of track.audioClips) {
        if (sameSound(prevClips.get(clip.id), clip)) continue;
        this.s.audio.cancelClip(clip.id, time);
        if (audio) this.scheduleAudioClip(audio, clip, tick, time);
      }
    }
    for (const clipId of this.s.midi.scheduledClipIds()) {
      if (!midiSeen.has(clipId)) this.s.midi.removeClip(clipId, time);
    }
    for (const track of before.values()) {
      for (const clip of track.audioClips) {
        if (!audioSeen.has(clip.id)) this.s.audio.cancelClip(clip.id, time);
      }
    }
  }

  // ── Scheduling one clip ──────────────────────────────────────────────

  private scheduleMidiClip(track: Track, clip: Track['midiClips'][number]) {
    this.s.midi.scheduleSequence(
      sequenceOf(track, clip),
      engineOf(track.id),
      clip.startTick,
      clip.id,
      clip,
    );
  }

  private scheduleTrackAudio(
    track: Track,
    audio: TrackAudioState,
    fromTick: number,
    at: number,
  ): void {
    for (const clip of track.audioClips) {
      this.scheduleAudioClip(audio, clip, fromTick, at);
    }
  }

  /** Every clip start goes through here: Play, a lap, a seek, an edit. */
  private scheduleAudioClip(
    audio: TrackAudioState,
    clip: Track['audioClips'][number],
    fromTick: number,
    at: number,
  ): void {
    const buffer = getAudioBuffer(clip.id);
    if (!buffer) return;
    this.s.audio.scheduleClip({
      buffer,
      clip,
      trackEngine: audio.trackEngine,
      fromTick,
      bpm: useStore.getState().bpm,
      pedalInput: pedalInputOf(audio.instrument),
      clipId: clip.id,
      at,
    });
  }
}

/** Fields of a clip that change nothing about what is scheduled. */
const NOT_SCHEDULED = new Set(['muted', 'name']);

/** Whether two versions of a clip schedule the same sound. */
function sameSound(a: unknown, b: object): boolean {
  if (a === b) return true;
  if (!a || typeof a !== 'object') return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const key of keys) {
    if (NOT_SCHEDULED.has(key)) continue;
    if (x[key] !== y[key]) return false;
  }
  return true;
}

/** A MIDI clip as the scheduler plays it. */
function sequenceOf(track: Track, clip: Track['midiClips'][number]) {
  return {
    ticksPerQuarterNote: 480,
    trackName: track.name,
    events: clip.events,
    ccEvents: clip.ccEvents,
  };
}
