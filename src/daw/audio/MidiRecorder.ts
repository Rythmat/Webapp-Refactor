import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';
import { ticksHeardAt } from './heardTime';

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

export interface MidiRecordingOptions {
  /** When the transport starts, in context time (null when it isn't
   *  running): a note heard before it lands on the start's tick. */
  transportStart?: () => number | null;
}

export class MidiRecorder {
  private recording = false;
  private transportStart: () => number | null = () => null;
  private activeNotes: Map<number, RecordedNote> = new Map();
  private completedNotes: RecordedNote[] = [];
  private ccEvents: RecordedCC[] = [];

  startRecording(options: MidiRecordingOptions = {}): void {
    this.recording = true;
    this.transportStart = options.transportStart ?? (() => null);
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

  /**
   * The tick the student was hearing when the event happened (milestone 1.11
   * d): its timeStamp on the speakers' clock (heardTime), so a note lands on
   * the beat it was played against. The same model as the punch-in tick
   * (useMidiRecording), so the two agree.
   */
  private compensatedTick(eventTimestamp?: number): number {
    return Math.round(ticksHeardAt(eventTimestamp, this.transportStart()));
  }

  stopRecording(): RecordingResult {
    this.recording = false;
    // Notes still held end where the student heard the Stop, on the same
    // clock as their starts.
    const endTick = Math.round(ticksHeardAt(undefined, this.transportStart()));

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
        // A note let go within a tick of its start (or one whose end reads
        // earlier, across a seek) still lasts a tick.
        durationTicks: Math.max(1, (n.endTick ?? endTick) - n.startTick),
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
      durationTicks: Math.max(1, (n.endTick ?? currentTick) - n.startTick),
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
