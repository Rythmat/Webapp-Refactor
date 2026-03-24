import * as Tone from 'tone';
import type { MidiSequence } from '@prism/engine';
import type { TrackEngine } from './TrackEngine';

export class MidiScheduler {
  private parts: Tone.Part[] = [];

  /**
   * Schedule a MidiSequence to play through a TrackEngine.
   * Uses Tone.Part to batch all noteOn/noteOff events into a single
   * schedulable unit instead of individual Transport.schedule() calls.
   */
  scheduleSequence(
    sequence: MidiSequence,
    trackEngine: TrackEngine,
    offsetTicks: number = 0,
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

    const part = new Tone.Part((time, ev) => {
      if (ev.type === 'on') {
        trackEngine.noteOn(ev.note, ev.velocity, time);
      } else if (ev.type === 'off') {
        trackEngine.noteOff(ev.note, time);
      } else if (ev.type === 'cc') {
        trackEngine.cc(ev.controller!, ev.value!, time);
      }
    }, allEvents);

    part.start(0);
    this.parts.push(part);
  }

  cancelAll(): void {
    for (const part of this.parts) {
      part.stop(0);
      part.dispose();
    }
    this.parts = [];
  }
}
