// ── The scheduler from before milestone 1.11 ─────────────────────────────
// Kept, unchanged in what it does, behind localStorage
// `ma:daw:legacyScheduler` = '1' until the new PlaybackScheduler
// (engine/playbackScheduler.ts) has had a production soak. It schedules the
// whole song once per Play from the store's snapshot, starts a clip the
// playhead is inside at "now", and redoes the audio clips on each loop lap
// at "now"; seeks and edits while playing aren't rescheduled.

import { useStore } from '@/daw/store';
import { getPlaybackLoop } from '@/daw/store/transportSlice';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { mutedClipIds } from '@/daw/audio/trackAudibility';
import {
  scheduleMasterAutomation,
  trackEngineRegistry,
} from '@/daw/engine/trackAudio';
import { pedalInputOf, type PlaybackSchedulers } from './playbackScheduler';

/** Schedule every MIDI clip, audio clip and lane from the playhead. */
export function legacyScheduleAll({
  midi: scheduler,
  audio: audioClipScheduler,
  automation: automationScheduler,
}: PlaybackSchedulers): void {
  const audioMap = trackEngineRegistry;
  // Read tracks from store snapshot (not from React closure) to avoid
  // re-scheduling on every track property change (volume, pan, etc.)
  const storeState = useStore.getState();
  const currentTracks = storeState.tracks;
  const currentTick = storeState.position;
  const bpm = storeState.bpm;
  // Muted clips are scheduled too, and start nothing while muted.
  const muted = mutedClipIds(currentTracks);
  scheduler.setMutedClips(muted);
  audioClipScheduler.setMutedClips(muted);

  for (const track of currentTracks) {
    const state = audioMap.get(track.id);
    if (!state) continue;

    for (const clip of track.midiClips) {
      scheduler.scheduleSequence(
        {
          ticksPerQuarterNote: 480,
          trackName: track.name,
          events: clip.events,
          ccEvents: clip.ccEvents,
        },
        state.trackEngine,
        clip.startTick,
        clip.id,
      );
    }

    const pedalInput = pedalInputOf(state.instrument);
    for (const clip of track.audioClips) {
      const audioBuffer = getAudioBuffer(clip.id);
      if (!audioBuffer) continue;
      audioClipScheduler.scheduleClip({
        buffer: audioBuffer,
        clip,
        trackEngine: state.trackEngine,
        fromTick: currentTick,
        bpm,
        pedalInput,
        clipId: clip.id,
      });
    }

    automationScheduler.scheduleTrack(
      track.id,
      state.trackEngine,
      track.automation,
      currentTick,
      bpm,
    );
  }

  scheduleMasterAutomation(automationScheduler, currentTick, bpm);
}

/** The loop lap: silence held notes, redo the audio clips in the loop. */
export function legacyHandleLoop({
  audio: audioClipScheduler,
  automation: automationScheduler,
}: PlaybackSchedulers): void {
  const audioMap = trackEngineRegistry;
  for (const [, state] of audioMap) {
    state.trackEngine.allNotesOff();
  }

  audioClipScheduler.cancelAll();
  const storeSnap = useStore.getState();
  const currentTracks = storeSnap.tracks;
  const { start: loopStart, end: loopEnd } = getPlaybackLoop(storeSnap);
  const bpm = storeSnap.bpm;
  for (const track of currentTracks) {
    const state = audioMap.get(track.id);
    if (!state) continue;
    const pedalInput = pedalInputOf(state.instrument);
    for (const clip of track.audioClips) {
      const audioBuffer = getAudioBuffer(clip.id);
      if (!audioBuffer) continue;
      const clipEnd = clip.startTick + clip.duration;
      if (clipEnd > loopStart && clip.startTick < loopEnd) {
        audioClipScheduler.scheduleClip({
          buffer: audioBuffer,
          clip,
          trackEngine: state.trackEngine,
          fromTick: loopStart,
          bpm,
          pedalInput,
          clipId: clip.id,
        });
      }
    }
    automationScheduler.scheduleTrack(
      track.id,
      state.trackEngine,
      track.automation,
      loopStart,
      bpm,
    );
  }
  scheduleMasterAutomation(automationScheduler, loopStart, bpm);
}
