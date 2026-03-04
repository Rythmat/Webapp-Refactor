import * as Tone from 'tone';
import type { MidiNoteEvent } from '@prism/engine';

interface RecordedNote {
  note: number;
  velocity: number;
  startTick: number;
  endTick?: number;
}

export class MidiRecorder {
  private recording = false;
  private activeNotes: Map<number, RecordedNote> = new Map();
  private completedNotes: RecordedNote[] = [];

  startRecording(): void {
    this.recording = true;
    this.activeNotes.clear();
    this.completedNotes = [];
  }

  captureNoteOn(note: number, velocity: number): void {
    if (!this.recording) return;
    const tick = Math.round(Tone.getTransport().ticks);
    this.activeNotes.set(note, { note, velocity, startTick: tick });
  }

  captureNoteOff(note: number): void {
    if (!this.recording) return;
    const active = this.activeNotes.get(note);
    if (active) {
      active.endTick = Math.round(Tone.getTransport().ticks);
      this.completedNotes.push(active);
      this.activeNotes.delete(note);
    }
  }

  stopRecording(): MidiNoteEvent[] {
    this.recording = false;
    const endTick = Math.round(Tone.getTransport().ticks);

    // Close any still-active notes
    for (const [, active] of this.activeNotes) {
      active.endTick = endTick;
      this.completedNotes.push(active);
    }
    this.activeNotes.clear();

    return this.completedNotes.map((n) => ({
      note: n.note,
      velocity: n.velocity,
      startTick: n.startTick,
      durationTicks: (n.endTick ?? endTick) - n.startTick,
      channel: 1,
    }));
  }

  isRecording(): boolean {
    return this.recording;
  }
}
