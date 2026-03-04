/**
 * Web MIDI API handler.
 * Listens for MIDI input messages and translates them to
 * noteOn/noteOff calls + CC messages.
 */
export class MidiHandler {
  private midiAccess: MIDIAccess | null = null;
  private onNoteOn: (note: number, velocity: number) => void;
  private onNoteOff: (note: number) => void;
  private onCC: (cc: number, value: number) => void;
  private boundHandleMessage: (e: MIDIMessageEvent) => void;

  constructor(
    onNoteOn: (note: number, velocity: number) => void,
    onNoteOff: (note: number) => void,
    onCC: (cc: number, value: number) => void
  ) {
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.onCC = onCC;
    this.boundHandleMessage = this.handleMessage.bind(this);
  }

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.connectInputs();

      // Listen for new devices being connected
      this.midiAccess.onstatechange = () => {
        this.connectInputs();
      };

      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null;
      }
      this.midiAccess.onstatechange = null;
      this.midiAccess = null;
    }
  }

  private connectInputs(): void {
    if (!this.midiAccess) return;

    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = this.boundHandleMessage;
    }
  }

  private handleMessage(e: MIDIMessageEvent): void {
    const data = e.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 0;

    switch (status) {
      case 0x90: // Note On
        if (velocity > 0) {
          this.onNoteOn(note, velocity / 127);
        } else {
          // Velocity 0 = note off
          this.onNoteOff(note);
        }
        break;

      case 0x80: // Note Off
        this.onNoteOff(note);
        break;

      case 0xb0: // Control Change
        this.onCC(note, velocity / 127);
        break;
    }
  }

  getInputNames(): string[] {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.inputs.values()).map(
      (input) => input.name ?? 'Unknown'
    );
  }
}
