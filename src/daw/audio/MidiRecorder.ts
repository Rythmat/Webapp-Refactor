import * as Tone from 'tone';
import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';

interface RecordedNote {
  note: number;
  velocity: number;
  startTick: number;
  endTick?: number;
}

interface RecordedCC {
  tick: number;
  controller: number;
  value: number;
}

export interface RecordingResult {
  notes: MidiNoteEvent[];
  ccEvents: MidiCCEvent[];
}

export class MidiRecorder {
  private recording = false;
  private activeNotes: Map<number, RecordedNote> = new Map();
  private completedNotes: RecordedNote[] = [];
  private ccEvents: RecordedCC[] = [];

  startRecording(): void {
    this.recording = true;
    this.activeNotes.clear();
    this.completedNotes = [];
    this.ccEvents = [];
  }

  captureNoteOn(note: number, velocity: number, eventTimestamp?: number): void {
    if (!this.recording) return;
    const tick = this.compensatedTick(eventTimestamp);
    this.activeNotes.set(note, { note, velocity, startTick: tick });
  }

  captureNoteOff(note: number, eventTimestamp?: number): void {
    if (!this.recording) return;
    const active = this.activeNotes.get(note);
    if (active) {
      active.endTick = this.compensatedTick(eventTimestamp);
      this.completedNotes.push(active);
      this.activeNotes.delete(note);
    }
  }

  captureCC(controller: number, value: number, eventTimestamp?: number): void {
    if (!this.recording) return;
    this.ccEvents.push({
      tick: this.compensatedTick(eventTimestamp),
      controller,
      value,
    });
  }

  /** Compute tick position compensated for Tone.js lookAhead and JS event loop delay. */
  private compensatedTick(eventTimestamp?: number): number {
    const transport = Tone.getTransport();
    let tick = transport.ticks;

    // Compensate for Tone.js lookAhead (transport.ticks is ahead of audible position)
    const ticksPerMs = (transport.bpm.value * transport.PPQ) / 60000;
    const lookAheadMs = Tone.getContext().lookAhead * 1000;
    tick -= lookAheadMs * ticksPerMs;

    // Compensate for JS event loop delay
    if (eventTimestamp != null) {
      const delayMs = performance.now() - eventTimestamp;
      if (delayMs > 0) {
        tick -= delayMs * ticksPerMs;
      }
    }

    return Math.max(0, Math.round(tick));
  }

  stopRecording(): RecordingResult {
    this.recording = false;
    const endTick = Math.round(Tone.getTransport().ticks);

    // Close any still-active notes
    for (const [, active] of this.activeNotes) {
      active.endTick = endTick;
      this.completedNotes.push(active);
    }
    this.activeNotes.clear();

    return {
      notes: this.completedNotes.map((n) => ({
        note: n.note,
        velocity: n.velocity,
        startTick: n.startTick,
        durationTicks: (n.endTick ?? endTick) - n.startTick,
        channel: 1,
      })),
      ccEvents: this.ccEvents.map((e) => ({ ...e, channel: 1 })),
    };
  }

  /** Return a snapshot of all recorded notes (completed + still-held) for live display. */
  getSnapshot(currentTick: number): MidiNoteEvent[] {
    const notes: MidiNoteEvent[] = this.completedNotes.map((n) => ({
      note: n.note,
      velocity: n.velocity,
      startTick: n.startTick,
      durationTicks: (n.endTick ?? currentTick) - n.startTick,
      channel: 1,
    }));
    for (const [, active] of this.activeNotes) {
      notes.push({
        note: active.note,
        velocity: active.velocity,
        startTick: active.startTick,
        durationTicks: Math.max(1, currentTick - active.startTick),
        channel: 1,
      });
    }
    return notes;
  }

  isRecording(): boolean {
    return this.recording;
  }
}
