import * as Tone from 'tone';
import type { MidiSequence } from '@prism/engine';
import type { TrackEngine } from './TrackEngine';

/** The engine a part plays through: fixed, or looked up when each event
 *  fires (live playback, where a track's engine can be rebuilt mid-song). */
export type EngineRef = TrackEngine | (() => TrackEngine | undefined);

/** One clip's notes on the transport, and the notes it has sounding. */
interface ScheduledPart {
  part: Tone.Part;
  clipId: string | undefined;
  engine: () => TrackEngine | undefined;
  /** What the part was built from (the store's clip), so an edit during
   *  playback can be seen by identity (milestone 1.11). */
  source: unknown;
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
    trackEngine: EngineRef,
    offsetTicks: number = 0,
    clipId?: string,
    source?: unknown,
  ): void {
    const entry = this.buildPart(
      sequence,
      trackEngine,
      offsetTicks,
      clipId,
      source,
    );
    this.parts.push(entry);
  }

  private buildPart(
    sequence: MidiSequence,
    trackEngine: EngineRef,
    offsetTicks: number,
    clipId: string | undefined,
    source: unknown,
    sounding: Map<number, number> = new Map(),
  ): ScheduledPart {
    const engine =
      typeof trackEngine === 'function' ? trackEngine : () => trackEngine;
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

    const pedal = { down: false };
    const muted = () => clipId !== undefined && this.mutedClips.has(clipId);
    const part = new Tone.Part((time, ev) => {
      if (ev.type === 'on') {
        if (muted()) return;
        sounding.set(ev.note, (sounding.get(ev.note) ?? 0) + 1);
        engine()?.noteOn(ev.note, ev.velocity, time);
      } else if (ev.type === 'off') {
        // Only a note this clip started ends here: a muted clip's ends
        // would cut the same note another clip on the track is playing.
        const count = sounding.get(ev.note) ?? 0;
        if (count === 0) return;
        if (count === 1) sounding.delete(ev.note);
        else sounding.set(ev.note, count - 1);
        engine()?.noteOff(ev.note, time);
      } else if (ev.type === 'cc') {
        // A muted clip's controllers are silent too: its pedal would hold
        // another clip's notes on the track, as the bounce never does.
        if (muted()) return;
        if (ev.controller === SUSTAIN_CC) pedal.down = ev.value! >= 64;
        engine()?.cc(ev.controller!, ev.value!, time);
      }
    }, allEvents);

    part.start(0);
    return { part, clipId, engine, source, sounding, pedal };
  }

  /** The store clip a clip's part was built from, if it is scheduled. */
  sourceOf(clipId: string): unknown {
    return this.parts.find((p) => p.clipId === clipId)?.source;
  }

  /** Record a clip's new object when nothing it schedules changed. */
  setSource(clipId: string, source: unknown): void {
    const entry = this.parts.find((p) => p.clipId === clipId);
    if (entry) entry.source = source;
  }

  /** The clip ids with a part on the transport. */
  scheduledClipIds(): string[] {
    const ids: string[] = [];
    for (const { clipId } of this.parts)
      if (clipId !== undefined) ids.push(clipId);
    return ids;
  }

  /**
   * Replace a clip's part while the song plays (milestone 1.11), so an edit
   * is heard on the clip's next pass. A note the old part has sounding that
   * the new clip still holds at `tick` keeps sounding and ends where the new
   * clip ends it; any other ends at `time`.
   */
  replaceClip(
    clipId: string,
    sequence: MidiSequence,
    trackEngine: EngineRef,
    offsetTicks: number,
    source: unknown,
    tick: number,
    time: number,
  ): void {
    const at = this.parts.findIndex((p) => p.clipId === clipId);
    const old = at >= 0 ? this.parts[at] : undefined;
    const carried = new Map<number, number>();
    if (old) {
      old.part.stop(0);
      old.part.dispose();
      const held = new Set<number>();
      for (const ev of sequence.events) {
        const start = ev.startTick + offsetTicks;
        if (start <= tick && start + ev.durationTicks > tick) held.add(ev.note);
      }
      for (const [note, count] of old.sounding) {
        if (held.has(note)) carried.set(note, count);
        else old.engine()?.noteOff(note, time);
      }
      if (old.pedal.down) old.engine()?.cc(SUSTAIN_CC, 0, time);
    }
    const next = this.buildPart(
      sequence,
      trackEngine,
      offsetTicks,
      clipId,
      source,
      carried,
    );
    if (old) this.parts[at] = next;
    else this.parts.push(next);
  }

  /** Take a clip's part off the transport, ending what it has sounding at
   *  `time` (a clip deleted, or its track gone, during playback). */
  removeClip(clipId: string, time: number): void {
    const at = this.parts.findIndex((p) => p.clipId === clipId);
    if (at < 0) return;
    const [old] = this.parts.splice(at, 1);
    old.part.stop(0);
    old.part.dispose();
    const engine = old.engine();
    for (const note of old.sounding.keys()) engine?.noteOff(note, time);
    if (old.pedal.down) engine?.cc(SUSTAIN_CC, 0, time);
  }

  /**
   * Forget what every part has sounding, after the caller has let go of all
   * notes at `time` (a loop seam, a seek): the notes a part started before
   * it never get their ends, and its pedal goes up at `time`.
   */
  releaseAll(time: number): void {
    for (const entry of this.parts) {
      entry.sounding.clear();
      if (entry.pedal.down) {
        entry.engine()?.cc(SUSTAIN_CC, 0, time);
        entry.pedal.down = false;
      }
    }
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
      const { clipId, sounding, pedal } = entry;
      const trackEngine = entry.engine();
      if (clipId === undefined || before.has(clipId) || !clipIds.has(clipId)) {
        continue;
      }
      const at = Tone.now();
      for (const note of sounding.keys()) trackEngine?.noteOff(note, at);
      sounding.clear();
      if (pedal.down) {
        trackEngine?.cc(SUSTAIN_CC, 0, at);
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
