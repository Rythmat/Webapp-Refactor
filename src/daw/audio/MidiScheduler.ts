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
    const allEvents: Array<[string, { note: number; velocity: number; type: 'on' | 'off' }]> = [];

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

    const part = new Tone.Part((time, ev) => {
      if (ev.type === 'on') {
        trackEngine.noteOn(ev.note, ev.velocity, time);
      } else {
        trackEngine.noteOff(ev.note, time);
      }
    }, allEvents);

    part.start(0);
    this.parts.push(part);
  }

  cancelAll(): void {
    for (const part of this.parts) {
      part.stop();
      part.dispose();
    }
    this.parts = [];
  }
}
