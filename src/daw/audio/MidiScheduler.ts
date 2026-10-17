import * as Tone from 'tone';
import type { MidiSequence } from '@prism/engine';
import type { TrackEngine } from './TrackEngine';

/** One clip's notes on the transport, and the notes it has sounding. */
interface ScheduledPart {
  part: Tone.Part;
  clipId: string | undefined;
  trackEngine: TrackEngine;
  /** How many of each note this part has started and not yet ended. */
  sounding: Map<number, number>;
  /** The clip's sustain pedal is down (its last CC 64 was 64 or more). */
  pedal: { down: boolean };
}

/** The sustain pedal's controller. */
const SUSTAIN_CC = 64;

export class MidiScheduler {
  private parts: ScheduledPart[] = [];
  /**
   * Clips muted from the clip menu (milestone 2.12). Their parts stay on the
   * transport but start no notes, so a mute or an unmute during playback is
   * heard at once, as a track's mute is.
   */
  private mutedClips: ReadonlySet<string> = new Set();

  /**
   * Schedule a MidiSequence to play through a TrackEngine.
   * Uses Tone.Part to batch all noteOn/noteOff events into a single
   * schedulable unit instead of individual Transport.schedule() calls.
   * `clipId` names the clip it plays, so muting the clip silences it.
   */
  scheduleSequence(
    sequence: MidiSequence,
    trackEngine: TrackEngine,
    offsetTicks: number = 0,
    clipId?: string,
  ): void {
    type ScheduledEvent = {
      note: number;
      velocity: number;
      type: 'on' | 'off' | 'cc';
      controller?: number;
      value?: number;
    };

    const allEvents: Array<[string, ScheduledEvent]> = [];

    for (const event of sequence.events) {
      const startTicks = event.startTick + offsetTicks;
      const endTicks = startTicks + event.durationTicks;

      allEvents.push([
        `${startTicks}i`,
        { note: event.note, velocity: event.velocity, type: 'on' },
      ]);
      allEvents.push([
        `${endTicks}i`,
        { note: event.note, velocity: 0, type: 'off' },
      ]);
    }

    // Schedule CC events (e.g. sustain pedal)
    if (sequence.ccEvents) {
      for (const cc of sequence.ccEvents) {
        allEvents.push([
          `${cc.tick + offsetTicks}i`,
          {
            note: 0,
            velocity: 0,
            type: 'cc',
            controller: cc.controller,
            value: cc.value,
          },
        ]);
      }
    }

    const sounding = new Map<number, number>();
    const pedal = { down: false };
    const muted = () => clipId !== undefined && this.mutedClips.has(clipId);
    const part = new Tone.Part((time, ev) => {
      if (ev.type === 'on') {
        if (muted()) return;
        sounding.set(ev.note, (sounding.get(ev.note) ?? 0) + 1);
        trackEngine.noteOn(ev.note, ev.velocity, time);
      } else if (ev.type === 'off') {
        // Only a note this clip started ends here: a muted clip's ends
        // would cut the same note another clip on the track is playing.
        const count = sounding.get(ev.note) ?? 0;
        if (count === 0) return;
        if (count === 1) sounding.delete(ev.note);
        else sounding.set(ev.note, count - 1);
        trackEngine.noteOff(ev.note, time);
      } else if (ev.type === 'cc') {
        // A muted clip's controllers are silent too: its pedal would hold
        // another clip's notes on the track, as the bounce never does.
        if (muted()) return;
        if (ev.controller === SUSTAIN_CC) pedal.down = ev.value! >= 64;
        trackEngine.cc(ev.controller!, ev.value!, time);
      }
    }, allEvents);

    part.start(0);
    this.parts.push({ part, clipId, trackEngine, sounding, pedal });
  }

  /**
   * The clips that are muted now. A clip that has just been muted lets go of
   * the notes it has sounding, and of its sustain pedal; one just unmuted
   * plays from its next note. The release is timed where the transport is
   * scheduling (Tone.now(), a look-ahead past the audio clock), so it comes
   * after any attack the clip has already booked rather than before it.
   */
  setMutedClips(clipIds: ReadonlySet<string>): void {
    const before = this.mutedClips;
    this.mutedClips = clipIds;
    for (const entry of this.parts) {
      const { clipId, sounding, trackEngine, pedal } = entry;
      if (clipId === undefined || before.has(clipId) || !clipIds.has(clipId)) {
        continue;
      }
      const at = Tone.now();
      for (const note of sounding.keys()) trackEngine.noteOff(note, at);
      sounding.clear();
      if (pedal.down) {
        trackEngine.cc(SUSTAIN_CC, 0, at);
        pedal.down = false;
      }
    }
  }

  cancelAll(): void {
    for (const { part } of this.parts) {
      part.stop(0);
      part.dispose();
    }
    this.parts = [];
  }
}
